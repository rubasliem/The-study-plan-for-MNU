import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import { Card, Button, Form, Spinner, Row, Col, Table, Badge, Alert } from 'react-bootstrap';
import { FaBalanceScale, FaSave, FaTrash, FaCheckCircle, FaInfoCircle, FaSearch, FaUserTie, FaBookOpen, FaCalendarWeek, FaPlus, FaBook, FaPrint, FaFileExcel, FaDownload, FaTimes } from 'react-icons/fa';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import logo from '../assets/logo.png';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirmAlert';

const API = "";

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '10px',
    borderColor: state.isFocused ? '#2e7d32' : '#dee2e6',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(46, 125, 50, 0.2)' : null,
    '&:hover': { borderColor: '#2e7d32' },
    minHeight: '44px',
    direction: 'rtl',
    textAlign: 'right',
    fontSize: '0.95rem'
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    direction: 'rtl',
    textAlign: 'right',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#2e7d32' : state.isFocused ? '#e8f5e9' : 'transparent',
    color: state.isSelected ? '#fff' : '#212529',
    cursor: 'pointer',
    direction: 'rtl',
    textAlign: 'right',
    padding: '10px 14px'
  }),
  singleValue: (base) => ({
    ...base,
    color: '#212529',
    fontWeight: '600'
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#e8f5e9',
    borderRadius: '6px',
    border: '1px solid #c8e6c9'
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#1b5e20',
    fontWeight: '600',
    fontSize: '0.85rem'
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#2e7d32',
    ':hover': {
      backgroundColor: '#c8e6c9',
      color: '#c62828'
    }
  })
};

const HOUR_TYPE_OPTIONS = [
  { value: "نظري", label: "نظري" },
  { value: "عملي", label: "عملي" },
  { value: "توتوريال", label: "توتوريال" },
  { value: "حقل", label: "حقل" }
];

const formatLevelToWord = (lvl) => {
  if (lvl === null || lvl === undefined || lvl === "" || lvl === "-") return "-";
  const str = String(lvl).trim();
  const map = {
    "0": "التمهيدي",
    "1": "الأول",
    "2": "الثاني",
    "3": "الثالث",
    "4": "الرابع",
    "5": "الخامس"
  };
  return map[str] || str;
};

const getJobTitleFull = (jobTitle) => {
  if (!jobTitle) return "-";
  const t = String(jobTitle).trim();
  if (t === "د" || t === "د." || t === "مدرس") return "مدرس";
  if (t === "أ.د" || t === "أ.د." || t === "أستاذ") return "أستاذ";
  if (t === "أ.م.د" || t === "أ.م.د." || t === "أ.م" || t === "أستاذ مساعد") return "أستاذ مساعد";
  if (t === "م.م" || t === "مدرس مساعد") return "مدرس مساعد";
  if (t === "معيد" || t === "م.ع" || t === "أ" || t === "ط" || t === "ص") return "معيد";
  return t;
};

const isTeachingAssistant = (prof) => {
  if (!prof) return false;
  const jt = String(prof.job_title || "").trim();
  const mnuJt = String(prof.mnu_job_title || "").trim();
  const full = getJobTitleFull(jt);
  return (
    full === "معيد" ||
    full === "مدرس مساعد" ||
    jt === "معيد" ||
    jt === "م.ع" ||
    jt === "م.م" ||
    jt === "مدرس مساعد" ||
    mnuJt.includes("معيد") ||
    mnuJt.includes("مدرس مساعد")
  );
};

const getProfessorWorkDays = (prof) => {
  if (!prof) return 1;
  const ct = String(prof.contract_type || "").trim();
  const wd = String(prof.work_days || "").trim();

  if (ct === "كلي" || wd.includes("5")) return 5;
  if (wd.includes("3") || wd.includes("ثلاث")) return 3;
  if (wd.includes("يومان") || wd.includes("2") || wd.includes("يومين")) return 2;
  if (wd.includes("يوم واحد") || wd.includes("1") || wd === "يوم") return 1;
  if (ct === "جزئي") return 2;
  return 1;
};

const WorkloadPage = ({ isReadOnly = false }) => {
  const { user } = useContext(AuthContext);

  // Filter States
  const [faculties, setFaculties] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("الفصل الدراسي الأول");

  // Faculty Limits State (Daily hours breakdown)
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsSaving, setLimitsSaving] = useState(false);
  const [limits, setLimits] = useState({
    min_theory_hours_per_day: '',
    max_theory_hours_per_day: '',
    min_practical_hours_per_day: '',
    max_practical_hours_per_day: '',
    min_tutorial_hours_per_day: '',
    max_tutorial_hours_per_day: '',
    min_field_hours_per_day: '',
    max_field_hours_per_day: '',
    max_theory_hours_per_course: '',
    max_practical_hours_per_course: '',
    max_tutorial_hours_per_course: '',
    max_field_hours_per_course: ''
  });

  // Professors List & Selected Professor State
  const [professors, setProfessors] = useState([]);
  const [selectedProfessorId, setSelectedProfessorId] = useState(null);
  const [profCoursesLoading, setProfCoursesLoading] = useState(false);
  const [profData, setProfData] = useState(null);

  // Course Weeks Configuration State
  const [courseWeeksLoading, setCourseWeeksLoading] = useState(false);
  const [courseWeeksSaving, setCourseWeeksSaving] = useState(false);
  const [availablePlanCourses, setAvailablePlanCourses] = useState([]);
  const [customizedCourses, setCustomizedCourses] = useState([]);
  const [selectedPlanCourse, setSelectedPlanCourse] = useState(null);
  const [customWeeksCount, setCustomWeeksCount] = useState('');


  // Deduction Form State
  const [deductedHours, setDeductedHours] = useState('');
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedHourTypes, setSelectedHourTypes] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [deductionReason, setDeductionReason] = useState('');
  const [deductionSaving, setDeductionSaving] = useState(false);

  // Overall Faculty Deductions List (Table for all professors in this faculty)
  const [facultyDeductions, setFacultyDeductions] = useState([]);
  const [facultyDeductionsLoading, setFacultyDeductionsLoading] = useState(false);

  // All faculties access check
  const isAllFacultiesUser = user?.role === 'admin' || user?.role === 'student_affairs' || user?.all_faculties_access;

  // 1. Fetch initial faculties and academic years
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [facRes, yearsRes] = await Promise.all([
          axios.get(`${API}/api/faculties`),
          axios.get(`${API}/api/academic-years`)
        ]);

        const facList = facRes.data || [];
        setFaculties(facList);

        const yList = yearsRes.data || [];
        setAcademicYears(yList);

        if (yList.length > 0) {
          setSelectedAcademicYear(yList[0].name);
        }

        // Set initial faculty
        if (facList.length > 0) {
          if (!isAllFacultiesUser && user?.faculty_id) {
            setSelectedFaculty(String(user.faculty_id));
          } else if (!isAllFacultiesUser && user?.faculties && user.faculties.length > 0) {
            setSelectedFaculty(String(user.faculties[0]));
          } else {
            setSelectedFaculty(String(facList[0].id));
          }
        }
      } catch (err) {
        console.error("Error fetching initial workload data", err);
        toast.error("خطأ في تحميل بيانات الكليات والأعوام الدراسية");
      }
    };
    fetchInitData();
  }, [user]);

  // Filtered faculties allowed for this user
  const accessibleFaculties = useMemo(() => {
    if (isAllFacultiesUser) return faculties;
    if (user?.assigned_faculties && user.assigned_faculties.length > 0) {
      const allowedIds = user.assigned_faculties.map(f => String(f.id));
      return faculties.filter(f => allowedIds.includes(String(f.id)));
    }
    if (user?.faculty_id) {
      return faculties.filter(f => String(f.id) === String(user.faculty_id));
    }
    return faculties;
  }, [faculties, user, isAllFacultiesUser]);

  // Selected faculty object and check if it's Health Sciences Technology
  const selectedFacultyObj = useMemo(() => {
    return accessibleFaculties.find(f => String(f.id) === String(selectedFaculty));
  }, [accessibleFaculties, selectedFaculty]);

  // Formatted faculty name with preposition (e.g. "لكلية الهندسة" بدلاً من "لكلية كلية الهندسة")
  const facultyPrepositionLabel = useMemo(() => {
    const fname = selectedFacultyObj?.name?.trim();
    if (!fname) return 'للكلية المختارة';
    if (fname.startsWith('كلية')) {
      return `ل${fname}`;
    }
    return `لكلية ${fname}`;
  }, [selectedFacultyObj]);

  const isHealthTechFaculty = useMemo(() => {
    if (!selectedFacultyObj) return false;
    const name = selectedFacultyObj.name || "";
    return name.includes("العلوم الصحية") || name.includes("تكنولوجيا العلوم");
  }, [selectedFacultyObj]);

  // Calculate maximum semester weeks configured for this faculty/semester
  const currentFacultyWeeks = useMemo(() => {
    if (!selectedFacultyObj) return 15;
    const fName = selectedFacultyObj.name || "";
    const isMed = fName.includes("الطب والجراحة") || fName.includes("الطب");
    const targetYear = academicYears.find(y => y.name === selectedAcademicYear);

    if (selectedSemester.includes("الصيفي") || selectedSemester.includes("صيف")) {
      return isMed ? (targetYear?.med_summer_weeks ?? 7) : (targetYear?.summer_weeks ?? 7);
    }
    if (selectedSemester.includes("الثاني")) {
      return isMed ? (targetYear?.med_semester2_weeks ?? 14) : (targetYear?.semester2_weeks ?? 14);
    }
    return isMed ? (targetYear?.med_semester1_weeks ?? 15) : (targetYear?.semester1_weeks ?? 15);
  }, [selectedFacultyObj, selectedAcademicYear, selectedSemester, academicYears]);

  // Plan Course Options for the Course Weeks Configuration dropdown
  const planCourseOptions = useMemo(() => {
    return availablePlanCourses.map(c => {
      const customBadge = c.is_custom ? `[مخصص: ${c.weeks_count} أسابيع]` : `[افتراضي: ${c.weeks_count} أسبوع]`;
      const codeSuffix = c.course_code ? `(${c.course_code})` : '';
      const progSuffix = c.program_name ? `- ${c.program_name}` : '';
      return {
        value: c.course_key,
        label: `${c.course_name} ${codeSuffix} ${progSuffix} ${customBadge}`,
        course: c
      };
    });
  }, [availablePlanCourses]);

  // Dynamic list of weeks for the deduction dropdown (الأسبوع 1، الأسبوع 2...)
  // Automatically limited to the selected course's weeks if chosen!
  const weekOptions = useMemo(() => {
    const totalWeeks = selectedCourse?.weeks_count || profData?.weeks_count || currentFacultyWeeks || 15;
    const opts = [];
    for (let i = 1; i <= totalWeeks; i++) {
      opts.push({
        value: i,
        label: `الأسبوع ${i}`
      });
    }
    return opts;
  }, [selectedCourse, profData?.weeks_count, currentFacultyWeeks]);

  // Course Options for the selected professor in this semester
  const courseOptions = useMemo(() => {
    if (!profData?.courses || profData.courses.length === 0) return [];
    return profData.courses.map(c => {
      const lvl = formatLevelToWord(c.level);
      const lvlSuffix = lvl && lvl !== "-" ? ` - المستوى ${lvl}` : "";
      const weeksInfo = c.is_custom_weeks ? `[${c.weeks_count} أسابيع]` : `[${c.weeks_count || currentFacultyWeeks} أسبوع]`;
      return {
        value: c.item_id,
        label: `${c.course_name} ${c.course_code ? `(${c.course_code})` : ''}${lvlSuffix} ${weeksInfo}`,
        course_name: c.course_name,
        course_id: c.course_id || null,
        weeks_count: c.weeks_count || currentFacultyWeeks,
        is_custom_weeks: c.is_custom_weeks,
        hours_theory: c.hours_theory || 0,
        hours_practical: c.hours_practical || 0,
        hours_exercise: c.hours_exercise || 0,
        hours_activity: c.hours_activity || 0
      };
    });
  }, [profData?.courses, currentFacultyWeeks]);

  // Teaching hour types dynamically determined from assigned hours in the study plan for this course
  const availableHourTypeOptions = useMemo(() => {
    if (!selectedCourse) {
      if (profData?.courses && profData.courses.length > 0) {
        const types = new Set();
        profData.courses.forEach(c => {
          if (c.hours_theory > 0) types.add("نظري");
          if (c.hours_practical > 0) types.add("عملي");
          if (c.hours_exercise > 0) types.add("توتوريال");
          if (c.hours_activity > 0) types.add("حقل");
        });
        if (types.size > 0) {
          return HOUR_TYPE_OPTIONS.filter(opt => types.has(opt.value));
        }
      }
      return HOUR_TYPE_OPTIONS;
    }

    const course = profData?.courses?.find(c => c.item_id === selectedCourse.value);
    if (!course) return HOUR_TYPE_OPTIONS;

    const opts = [];
    if (course.hours_theory > 0) {
      opts.push({ value: "نظري", label: `نظري (${course.hours_theory} س)` });
    }
    if (course.hours_practical > 0) {
      opts.push({ value: "عملي", label: `عملي (${course.hours_practical} س)` });
    }
    if (course.hours_exercise > 0) {
      opts.push({ value: "توتوريال", label: `توتوريال (${course.hours_exercise} س)` });
    }
    if (course.hours_activity > 0) {
      opts.push({ value: "حقل", label: `حقل (${course.hours_activity} س)` });
    }

    return opts.length > 0 ? opts : HOUR_TYPE_OPTIONS;
  }, [selectedCourse, profData?.courses]);

  // Clean up selectedHourTypes if course selection changes and previously selected types are not valid for this course
  useEffect(() => {
    if (selectedHourTypes.length > 0 && availableHourTypeOptions.length > 0) {
      const validValues = new Set(availableHourTypeOptions.map(o => o.value));
      const filtered = selectedHourTypes.filter(ht => validValues.has(ht.value));
      if (filtered.length !== selectedHourTypes.length) {
        setSelectedHourTypes(filtered);
      }
    }
  }, [availableHourTypeOptions]);

  // 2. Fetch limits when faculty, year, or semester changes
  useEffect(() => {
    if (!selectedFaculty || !selectedAcademicYear || !selectedSemester) return;

    const fetchLimits = async () => {
      setLimitsLoading(true);
      try {
        const res = await axios.get(`${API}/api/workload/limits`, {
          params: {
            faculty_id: selectedFaculty,
            academic_year: selectedAcademicYear,
            semester: selectedSemester
          }
        });
        const d = res.data || {};
        setLimits({
          min_theory_hours_per_day: d.min_theory_hours_per_day != null && d.min_theory_hours_per_day > 0 ? String(d.min_theory_hours_per_day) : '',
          max_theory_hours_per_day: d.max_theory_hours_per_day != null && d.max_theory_hours_per_day > 0 ? String(d.max_theory_hours_per_day) : '',
          min_practical_hours_per_day: d.min_practical_hours_per_day != null && d.min_practical_hours_per_day > 0 ? String(d.min_practical_hours_per_day) : '',
          max_practical_hours_per_day: d.max_practical_hours_per_day != null && d.max_practical_hours_per_day > 0 ? String(d.max_practical_hours_per_day) : '',
          min_tutorial_hours_per_day: d.min_tutorial_hours_per_day != null && d.min_tutorial_hours_per_day > 0 ? String(d.min_tutorial_hours_per_day) : '',
          max_tutorial_hours_per_day: d.max_tutorial_hours_per_day != null && d.max_tutorial_hours_per_day > 0 ? String(d.max_tutorial_hours_per_day) : '',
          min_field_hours_per_day: d.min_field_hours_per_day != null && d.min_field_hours_per_day > 0 ? String(d.min_field_hours_per_day) : '',
          max_field_hours_per_day: d.max_field_hours_per_day != null && d.max_field_hours_per_day > 0 ? String(d.max_field_hours_per_day) : '',
          max_theory_hours_per_course: d.max_theory_hours_per_course != null && d.max_theory_hours_per_course > 0 ? String(d.max_theory_hours_per_course) : '',
          max_practical_hours_per_course: d.max_practical_hours_per_course != null && d.max_practical_hours_per_course > 0 ? String(d.max_practical_hours_per_course) : '',
          max_tutorial_hours_per_course: d.max_tutorial_hours_per_course != null && d.max_tutorial_hours_per_course > 0 ? String(d.max_tutorial_hours_per_course) : '',
          max_field_hours_per_course: d.max_field_hours_per_course != null && d.max_field_hours_per_course > 0 ? String(d.max_field_hours_per_course) : ''
        });
      } catch (err) {
        console.error("Error fetching faculty workload limits", err);
      } finally {
        setLimitsLoading(false);
      }
    };

    fetchLimits();
  }, [selectedFaculty, selectedAcademicYear, selectedSemester]);

  // 2.1 Fetch Course Weeks for the selected faculty, academic year & semester
  const fetchCourseWeeks = async () => {
    if (!selectedFaculty || !selectedAcademicYear || !selectedSemester) {
      setAvailablePlanCourses([]);
      setCustomizedCourses([]);
      setSelectedPlanCourse(null);
      setCustomWeeksCount('');
      return;
    }
    setCourseWeeksLoading(true);
    try {
      const res = await axios.get(`${API}/api/workload/course-weeks`, {
        params: {
          faculty_id: selectedFaculty,
          academic_year: selectedAcademicYear,
          semester: selectedSemester
        }
      });
      setAvailablePlanCourses(res.data.courses || []);
      setCustomizedCourses(res.data.customized_courses || []);
    } catch (err) {
      console.error("Error fetching course weeks", err);
      setAvailablePlanCourses([]);
      setCustomizedCourses([]);
    } finally {
      setCourseWeeksLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseWeeks();
    setSelectedPlanCourse(null);
    setCustomWeeksCount('');
  }, [selectedFaculty, selectedAcademicYear, selectedSemester]);

  const handleSelectPlanCourse = (opt) => {
    if (!opt) {
      setSelectedPlanCourse(null);
      setCustomWeeksCount('');
      return;
    }
    setSelectedPlanCourse(opt.course);
    setCustomWeeksCount(String(opt.course.weeks_count || currentFacultyWeeks));
  };

  const handleSaveCourseWeeks = async (e) => {
    e?.preventDefault();
    if (isReadOnly) {
      toast.error("غير مصرح لك بتعديل أسابيع المقررات");
      return;
    }
    if (!selectedPlanCourse) {
      toast.error("يرجى اختيار المقرر أولاً");
      return;
    }
    const weeksNum = parseInt(customWeeksCount);
    if (isNaN(weeksNum) || weeksNum <= 0 || weeksNum > 30) {
      toast.error("يرجى إدخال عدد أسابيع صحيح (بين 1 و 30)");
      return;
    }

    setCourseWeeksSaving(true);
    try {
      await axios.post(`${API}/api/workload/course-weeks`, {
        faculty_id: parseInt(selectedFaculty),
        academic_year: selectedAcademicYear,
        semester: selectedSemester,
        course_key: selectedPlanCourse.course_key,
        course_id: selectedPlanCourse.course_id || null,
        module_id: selectedPlanCourse.module_id || null,
        course_name: selectedPlanCourse.course_name,
        course_code: selectedPlanCourse.course_code || null,
        weeks_count: weeksNum
      });
      toast.success(`تم حفظ وتحديد عدد أسابيع مقرر (${selectedPlanCourse.course_name}) بـ ${weeksNum} أسبوع بنجاح`);
      fetchCourseWeeks();
      if (selectedProfessorId) {
        fetchProfessorCourses(selectedProfessorId);
      }
    } catch (err) {
      console.error("Error saving course weeks", err);
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء حفظ أسابيع المقرر");
    } finally {
      setCourseWeeksSaving(false);
    }
  };

  const handleDeleteCourseWeeks = async (customId, courseName) => {
    if (isReadOnly) {
      toast.error("غير مصرح لك بتعديل أسابيع المقررات");
      return;
    }
    const confirmed = await confirmAction(`هل تريد استعادة عدد الأسابيع الافتراضي (${currentFacultyWeeks} أسبوع) لمقرر (${courseName})؟`);
    if (!confirmed) return;

    try {
      await axios.delete(`${API}/api/workload/course-weeks/${customId}`);
      toast.success(`تم استعادة عدد الأسابيع الافتراضي لمقرر (${courseName}) بنجاح`);
      fetchCourseWeeks();
      if (selectedProfessorId) {
        fetchProfessorCourses(selectedProfessorId);
      }
    } catch (err) {
      console.error("Error deleting course weeks", err);
      toast.error("حدث خطأ أثناء استعادة عدد الأسابيع الافتراضي");
    }
  };

  // 3. Fetch all deductions for the selected faculty & semester
  const fetchFacultyDeductions = async () => {
    if (!selectedFaculty || !selectedAcademicYear || !selectedSemester) return;
    setFacultyDeductionsLoading(true);
    try {
      const res = await axios.get(`${API}/api/workload/deductions`, {
        params: {
          faculty_id: selectedFaculty,
          academic_year: selectedAcademicYear,
          semester: selectedSemester
        }
      });
      setFacultyDeductions(res.data || []);
    } catch (err) {
      console.error("Error fetching faculty deductions", err);
      setFacultyDeductions([]);
    } finally {
      setFacultyDeductionsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyDeductions();
  }, [selectedFaculty, selectedAcademicYear, selectedSemester]);

  // 4. Fetch professors who have assigned courses in the study plan for the selected faculty, academic year & semester
  useEffect(() => {
    if (!selectedFaculty || !selectedAcademicYear || !selectedSemester) {
      setProfessors([]);
      setSelectedProfessorId(null);
      return;
    }

    const fetchProfessors = async () => {
      try {
        const res = await axios.get(`${API}/api/professors/by-faculty/${selectedFaculty}`, {
          params: {
            academic_year: selectedAcademicYear,
            semester: selectedSemester,
            assigned_only: true
          }
        });
        setProfessors(res.data || []);
      } catch (err) {
        console.error("Error fetching assigned professors for faculty", err);
        setProfessors([]);
      }
    };

    fetchProfessors();
    setSelectedProfessorId(null);
    setProfData(null);
    setDeductedHours('');
    setDeductionReason('');
    setSelectedWeeks([]);
    setSelectedHourTypes([]);
    setSelectedCourse(null);
  }, [selectedFaculty, selectedAcademicYear, selectedSemester]);

  // 5. Fetch professor courses & workload details when professor is selected
  const fetchProfessorCourses = async (profId) => {
    if (!profId || !selectedAcademicYear || !selectedSemester) return;
    setProfCoursesLoading(true);
    try {
      const res = await axios.get(`${API}/api/workload/professor-courses`, {
        params: {
          professor_id: profId,
          academic_year: selectedAcademicYear,
          semester: selectedSemester,
          faculty_id: selectedFaculty || undefined
        }
      });
      const data = res.data;
      setProfData(data);
    } catch (err) {
      console.error("Error fetching professor courses", err);
      toast.error("خطأ في جلب مقررات وساعات عضو هيئة التدريس");
      setProfData(null);
    } finally {
      setProfCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProfessorId) {
      fetchProfessorCourses(selectedProfessorId);
    } else {
      setProfData(null);
      setDeductedHours('');
      setDeductionReason('');
      setSelectedWeeks([]);
      setSelectedHourTypes([]);
      setSelectedCourse(null);
    }
  }, [selectedProfessorId, selectedAcademicYear, selectedSemester]);

  // Handle Save Limits
  const handleSaveLimits = async (e) => {
    e.preventDefault();
    if (isReadOnly) {
      toast.error("غير مصرح لك بتعديل حدود ساعات الكلية");
      return;
    }

    setLimitsSaving(true);
    try {
      await axios.post(`${API}/api/workload/limits`, {
        faculty_id: parseInt(selectedFaculty),
        academic_year: selectedAcademicYear,
        semester: selectedSemester,
        min_theory_hours_per_day: parseFloat(limits.min_theory_hours_per_day) || 0.0,
        max_theory_hours_per_day: parseFloat(limits.max_theory_hours_per_day) || 0.0,
        min_practical_hours_per_day: parseFloat(limits.min_practical_hours_per_day) || 0.0,
        max_practical_hours_per_day: parseFloat(limits.max_practical_hours_per_day) || 0.0,
        min_tutorial_hours_per_day: isHealthTechFaculty ? (parseFloat(limits.min_tutorial_hours_per_day) || 0.0) : 0.0,
        max_tutorial_hours_per_day: isHealthTechFaculty ? (parseFloat(limits.max_tutorial_hours_per_day) || 0.0) : 0.0,
        min_field_hours_per_day: isHealthTechFaculty ? (parseFloat(limits.min_field_hours_per_day) || 0.0) : 0.0,
        max_field_hours_per_day: isHealthTechFaculty ? (parseFloat(limits.max_field_hours_per_day) || 0.0) : 0.0,
        max_theory_hours_per_course: parseFloat(limits.max_theory_hours_per_course) || 0.0,
        max_practical_hours_per_course: parseFloat(limits.max_practical_hours_per_course) || 0.0,
        max_tutorial_hours_per_course: isHealthTechFaculty ? (parseFloat(limits.max_tutorial_hours_per_course) || 0.0) : 0.0,
        max_field_hours_per_course: isHealthTechFaculty ? (parseFloat(limits.max_field_hours_per_course) || 0.0) : 0.0
      });
      toast.success("تم حفظ وتحديث حدود ساعات الكلية بنجاح");
    } catch (err) {
      console.error("Error saving limits", err);
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء حفظ الحدود");
    } finally {
      setLimitsSaving(false);
    }
  };

  // Handle Save Deduction for multiple selected weeks, course & hour types
  const handleSaveDeduction = async () => {
    if (isReadOnly) {
      toast.error("غير مصرح لك بتعديل أو حفظ انتقاص الساعات");
      return;
    }

    const dedVal = parseFloat(deductedHours);
    if (isNaN(dedVal) || dedVal <= 0) {
      toast.error("يرجى إدخال عدد ساعات صحيح أكبر من الصفر للانتقاص");
      return;
    }

    if (!selectedWeeks || selectedWeeks.length === 0) {
      toast.error("يرجى اختيار أسبوع واحد على الأقل من الأسابيع المستقطع منها");
      return;
    }

    if (!selectedHourTypes || selectedHourTypes.length === 0) {
      toast.error("يرجى اختيار نوع واحد على الأقل من الساعات التدريسية (نظري، عملي...)");
      return;
    }

    const weekNumbers = selectedWeeks.map(w => w.value);
    const weekNames = selectedWeeks.map(w => w.label);
    const hourTypeNames = selectedHourTypes.map(h => h.value);
    const hourTypeStr = hourTypeNames.join("، ");

    setDeductionSaving(true);
    try {
      await axios.post(`${API}/api/workload/deductions`, {
        professor_id: selectedProfessorId,
        faculty_id: parseInt(selectedFaculty) || null,
        academic_year: selectedAcademicYear,
        semester: selectedSemester,
        deducted_hours: dedVal,
        week_numbers: weekNumbers,
        week_names: weekNames,
        hour_type: hourTypeStr,
        hour_types: hourTypeNames,
        course_id: selectedCourse?.course_id || null,
        course_name: selectedCourse?.course_name || null,
        reason: deductionReason.trim()
      });
      toast.success(`تم حفظ وانتقاص ${dedVal} ساعة (${hourTypeStr}) لعدد ${weekNumbers.length} أسبوع بنجاح`);
      setDeductedHours('');
      setDeductionReason('');
      setSelectedWeeks([]);
      setSelectedHourTypes([]);
      setSelectedCourse(null);
      fetchProfessorCourses(selectedProfessorId);
      fetchFacultyDeductions();
    } catch (err) {
      console.error("Error saving deduction", err);
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء حفظ الانتقاص");
    } finally {
      setDeductionSaving(false);
    }
  };

  // Handle Delete a specific Deduction row
  const handleDeleteDeduction = async (dedId, weekName, hours) => {
    if (isReadOnly) {
      toast.error("غير مصرح لك بإلغاء تخفيض الساعات");
      return;
    }

    const confirmed = await confirmAction(`هل أنت متأكد من إلغاء انتقاص ${hours} ساعة المسجل في ${weekName}؟`);
    if (!confirmed) return;

    setDeductionSaving(true);
    try {
      await axios.delete(`${API}/api/workload/deductions/${dedId}`);
      toast.success("تم إلغاء انتقاص الساعات بنجاح");
      if (selectedProfessorId) {
        fetchProfessorCourses(selectedProfessorId);
      }
      fetchFacultyDeductions();
    } catch (err) {
      console.error("Error deleting deduction", err);
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء إلغاء الانتقاص");
    } finally {
      setDeductionSaving(false);
    }
  };

  // Handle Print Grand Table of Deductions
  const handlePrintDeductions = () => {
    if (!facultyDeductions || facultyDeductions.length === 0) {
      toast.error("لا توجد بيانات للطباعة");
      return;
    }

    const printWindow = window.open("", "_blank");
    const facultyName = selectedFacultyObj?.name || "كلية غير محددة";
    const totalDeducted = facultyDeductions.reduce((sum, d) => sum + (d.deducted_hours || 0), 0);
    const currentDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>بيان استقطاع وتخفيض الساعات التدريسية - ${facultyName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            thead, .data-table thead { 
              display: table-header-group !important; 
            }
            .data-table tfoot, tfoot { 
              display: table-footer-group !important; 
            }
            thead tr, .header-row-main {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            tr { 
              page-break-inside: avoid !important; 
              break-inside: avoid !important; 
            }
            @page { size: A4 landscape; margin: 6mm 6mm; }
            body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; margin: 0; padding: 0; color: #000; background: #fff; zoom: 85%; }
            .page-border-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              width: 100%;
              height: 100%;
              border: 2.5px solid #1b5e20;
              outline: 1px solid #1b5e20;
              outline-offset: -5px;
              box-sizing: border-box;
              pointer-events: none;
              z-index: 9999;
            }
            .print-container {
              padding: 0 14px 10px 14px;
              box-sizing: border-box;
              width: 100%;
            }
            .data-table { 
              border-collapse: collapse; 
              direction: rtl; 
              width: 100%; 
              margin: 0 auto; 
              table-layout: fixed; 
              page-break-inside: auto;
            }
            .data-table th, .data-table td {
              border: 1px solid #777;
              padding: 6px 6px;
              font-size: 9.5pt;
              text-align: center;
              vertical-align: middle;
              word-wrap: break-word;
              overflow-wrap: break-word;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .header-row-main th {
              background-color: #388e3c !important;
              color: #ffffff !important;
              font-weight: bold;
              font-size: 10pt;
              border: 1px solid #1b5e20 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            td.prof-name {
              text-align: right;
              font-weight: 700;
              color: #111;
            }
            td.course-name {
              text-align: right;
              font-weight: 600;
              color: #0d47a1;
            }
            td.hours-cell {
              font-weight: 800;
              color: #c62828;
            }
            tfoot tr td {
              background-color: #e8f5e9 !important;
              color: #1b5e20 !important;
              font-weight: bold;
              font-size: 10.5pt;
              border-top: 2.5px solid #2e7d32 !important;
              padding: 8px 6px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-btn-bar {
              margin: 10px 14px 10px 14px;
              text-align: left;
            }
            .print-action-btn {
              background: #2e7d32;
              color: white;
              border: none;
              padding: 8px 20px;
              border-radius: 6px;
              font-family: inherit;
              font-size: 14px;
              cursor: pointer;
              font-weight: bold;
            }
            @media print {
              .no-print {
                display: none !important;
              }
              thead, .data-table thead {
                display: table-header-group !important;
              }
              tfoot, .data-table tfoot {
                display: table-footer-group !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-border-overlay"></div>
          <div class="no-print print-btn-bar">
            <button class="print-action-btn" onclick="window.print()">طباعة الآن</button>
          </div>
          <div class="print-container">
            <table class="data-table">
              <colgroup>
                <col style="width: 4%;">
                <col style="width: 20%;">
                <col style="width: 19%;">
                <col style="width: 11%;">
                <col style="width: 10%;">
                <col style="width: 10%;">
                <col style="width: 15%;">
                <col style="width: 11%;">
              </colgroup>
              <thead>
                <tr style="border: none !important;">
                  <th colspan="8" style="border: none !important; background: transparent !important; color: inherit; padding: 10px 0 8px 0; font-weight: normal;">
                    <table style="width: 100%; border-collapse: collapse; border: none !important; margin: 0; padding: 0;">
                      <tr style="border: none !important; background: transparent !important;">
                        <td style="width: 22%; text-align: right; vertical-align: top; border: none !important; background: transparent !important; padding: 0; line-height: 1.35; white-space: nowrap;">
                          <div style="font-size: 13.5pt; font-weight: bold; color: #1b5e20;">جامعة المنوفية الأهلية</div>
                          <div style="font-size: 11pt; font-weight: bold; color: #222; margin-top: 2px;">شئون التعليم والطلاب</div>
                        </td>
                        <td style="width: 56%; text-align: center; vertical-align: top; border: none !important; background: transparent !important; padding: 0; line-height: 1.35;">
                          <div style="font-size: 16pt; font-weight: bold; color: #1b5e20; white-space: nowrap;">بيان استقطاع وتخفيض الساعات التدريسية</div>
                          <div style="font-size: 11.5pt; font-weight: bold; color: #222; margin-top: 3px; white-space: nowrap;">
                            <span>${facultyName}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span>العام الجامعي ${selectedAcademicYear}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span>${selectedSemester}</span>
                          </div>
                          <div style="text-align: center; font-weight: bold; font-size: 10.5pt; color: #1b5e20; margin-top: 6px; margin-bottom: 2px; white-space: nowrap;">
                            بيان استقطاع وتخفيض ساعات أعضاء هيئة التدريس طبقاً للقرارات واللوائح المعتمدة &nbsp;•&nbsp; تاريخ التقرير: ${currentDate}
                          </div>
                        </td>
                        <td style="width: 22%; text-align: left; vertical-align: top; border: none !important; background: transparent !important; padding: 0;">
                          <img src="${window.location.origin}${logo}" width="80" height="80" style="object-fit: contain; display: inline-block;" />
                        </td>
                      </tr>
                    </table>
                  </th>
                </tr>
                <tr class="header-row-main">
                  <th>#</th>
                  <th>اسم الأستاذ</th>
                  <th>اسم المقرر</th>
                  <th>الأسبوع المستقطع منه</th>
                  <th>نوع الساعات</th>
                  <th>الساعات المنتقصة</th>
                  <th>سبب الانتقاص</th>
                  <th>سُجل بواسطة</th>
                </tr>
              </thead>
              <tbody>
                ${facultyDeductions.map((d, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td class="prof-name">${d.professor_name || 'غير محدد'}</td>
                    <td class="course-name">${d.course_name || 'عام / بدون تحديد'}</td>
                    <td><strong>${d.week_name || '-'}</strong></td>
                    <td>${d.hour_type || '-'}</td>
                    <td class="hours-cell">- ${d.deducted_hours} س</td>
                    <td style="text-align: right;">${d.reason || 'بدون سبب'}</td>
                    <td style="font-size: 8pt; color: #555;">${d.created_by || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" style="text-align: center;">إجمالي الساعات المنتقصة بالكلية لهذا الفصل الدراسي</td>
                  <td class="hours-cell">- ${totalDeducted} ساعة</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle Export Grand Table to Excel
  const handleExportExcelDeductions = async () => {
    if (!facultyDeductions || facultyDeductions.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('انتقاص الساعات', { views: [{ rightToLeft: true }] });
      const facultyName = selectedFacultyObj?.name || "كلية غير محددة";
      const totalDeducted = facultyDeductions.reduce((sum, d) => sum + (d.deducted_hours || 0), 0);

      // Add Logo if available
      try {
        const response = await fetch(logo);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const logoImageId = workbook.addImage({
          buffer: arrayBuffer,
          extension: 'png',
        });
        worksheet.addImage(logoImageId, {
          tl: { col: 0.1, row: 0.2 },
          ext: { width: 75, height: 75 }
        });
      } catch (e) {
        console.warn('Could not load logo for Excel export', e);
      }

      // Title Banner
      worksheet.mergeCells('B2:G3');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = `بيان استقطاع وتخفيض ساعات أعضاء هيئة التدريس - ${facultyName}`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1B5E20' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Subtitle
      worksheet.mergeCells('B4:G4');
      const subCell = worksheet.getCell('B4');
      subCell.value = `العام الجامعي: ${selectedAcademicYear}   |   الفصل الدراسي: ${selectedSemester}   |   تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`;
      subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF555555' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Columns Setup
      worksheet.columns = [
        { key: 'index', width: 8 },
        { key: 'prof_name', width: 30 },
        { key: 'course_name', width: 26 },
        { key: 'week_name', width: 18 },
        { key: 'hour_type', width: 16 },
        { key: 'deducted_hours', width: 18 },
        { key: 'reason', width: 38 },
        { key: 'created_by', width: 20 }
      ];

      // Header Row (Row 6)
      const headerRowIndex = 6;
      const headerRow = worksheet.getRow(headerRowIndex);
      headerRow.values = ['#', 'اسم الأستاذ', 'اسم المقرر', 'الأسبوع المستقطع منه', 'نوع الساعات', 'الساعات المنتقصة', 'سبب الانتقاص', 'سُجل بواسطة'];
      headerRow.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2E7D32' }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF1B5E20' } },
          left: { style: 'thin', color: { argb: 'FF1B5E20' } },
          bottom: { style: 'medium', color: { argb: 'FF1B5E20' } },
          right: { style: 'thin', color: { argb: 'FF1B5E20' } }
        };
      });

      // Data Rows
      facultyDeductions.forEach((d, idx) => {
        const row = worksheet.addRow({
          index: idx + 1,
          prof_name: d.professor_name || 'غير محدد',
          course_name: d.course_name || 'عام / بدون تحديد',
          week_name: d.week_name || '-',
          hour_type: d.hour_type || '-',
          deducted_hours: `- ${d.deducted_hours} ساعة`,
          reason: d.reason || 'بدون سبب',
          created_by: d.created_by || '-'
        });

        row.height = 22;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 || colNumber === 3 || colNumber === 7 ? 'right' : 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
          };
          if (colNumber === 6) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFC62828' } };
          }
        });
      });

      // Total Row
      const totalRow = worksheet.addRow({
        index: '',
        prof_name: 'إجمالي الساعات المنتقصة بالكلية',
        course_name: '',
        week_name: '',
        hour_type: '',
        deducted_hours: `- ${totalDeducted} ساعة`,
        reason: '',
        created_by: ''
      });
      totalRow.height = 26;
      worksheet.mergeCells(`B${totalRow.number}:E${totalRow.number}`);
      
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF111111' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEBEE' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FFC62828' } },
          bottom: { style: 'medium', color: { argb: 'FFC62828' } },
          left: { style: 'thin', color: { argb: 'FFC62828' } },
          right: { style: 'thin', color: { argb: 'FFC62828' } }
        };
        if (colNumber === 6) {
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFC62828' } };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const safeFacName = facultyName.replace(/[\/\\:*?"<>|]/g, '_');
      saveAs(new Blob([buffer]), `انتقاص_ساعات_${safeFacName}_${selectedAcademicYear}_${selectedSemester}.xlsx`);
      toast.success("تم تنزيل ملف الإكسيل بنجاح");
    } catch (err) {
      console.error("Export Excel error", err);
      toast.error("حدث خطأ أثناء تصدير ملف الإكسيل");
    }
  };

  // Dynamic preview calculations for the new deduction being entered
  const parsedNewDeduction = parseFloat(deductedHours) || 0.0;
  const numWeeksSelected = selectedWeeks.length || 0;
  const totalNewDeductionForOperation = parsedNewDeduction * (numWeeksSelected > 0 ? numWeeksSelected : 1);
  const currentTotalSemesterHours = profData?.total_semester_hours || 0.0;
  const existingTotalDeducted = profData?.total_deducted_hours || 0.0;
  const previewNetSemester = Math.max(0.0, Math.round((currentTotalSemesterHours - existingTotalDeducted - (numWeeksSelected > 0 ? totalNewDeductionForOperation : parsedNewDeduction)) * 100) / 100);

  return (
    <div className="workload-page-container pb-5" style={{ direction: 'rtl', textAlign: 'right' }}>
      {/* عنوان الصفحة */}
      <div className="row mb-4 pt-4 align-items-center">
        <div className="col-md-8">
          <h2 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }} className="d-flex align-items-center gap-2">
            <FaBalanceScale className="text-success" style={{ marginLeft: '14px', fontSize: '2.2rem' }} /> تحديد الأعباء التدريسية
          </h2>
          <p className="text-muted mt-3 mb-0">
            إدارة الحدود اليومية لساعات التدريس واستعراض أعباء الأساتذة وإجراء تخفيض الساعات حسب المقرر والأسابيع
          </p>
        </div>
        {isReadOnly && (
          <div className="col-md-4 text-start d-flex justify-content-end">
            <Badge bg="warning" text="dark" className="px-3 py-2 fs-6 shadow-sm d-flex align-items-center gap-2">
              <FaInfoCircle /> وضع العرض فقط (غير مصرح بالتعديل)
            </Badge>
          </div>
        )}
      </div>

      {/* View Only Alert */}
      {isReadOnly && (
        <Alert variant="warning" className="border-0 shadow-sm mb-4 d-flex align-items-center gap-2" style={{ borderRadius: '12px' }}>
          <FaInfoCircle className="fs-5" />
          <div>
            <strong>تنبيه:</strong> لديك صلاحية <strong>رؤية صفحة أعباء الأساتذة</strong> فقط دون إمكانية التعديل أو الحفظ. لتفعيل صلاحية التعديل يرجى الرجوع لمدير النظام لتفعيلها من لوحة التحكم.
          </div>
        </Alert>
      )}

      {/* Main Filter Section */}
      <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-4">
          <Row className="g-3">
            <Col lg={4} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold text-success mb-2">الكلية</Form.Label>
                <Select
                  styles={customSelectStyles}
                  placeholder="اختر الكلية..."
                  options={accessibleFaculties.map(f => ({ value: String(f.id), label: f.name }))}
                  value={accessibleFaculties.find(f => String(f.id) === String(selectedFaculty)) ? {
                    value: String(selectedFaculty),
                    label: accessibleFaculties.find(f => String(f.id) === String(selectedFaculty))?.name
                  } : null}
                  onChange={(opt) => setSelectedFaculty(opt ? opt.value : "")}
                  isSearchable
                  noOptionsMessage={() => "لا توجد كليات"}
                />
              </Form.Group>
            </Col>

            <Col lg={4} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold text-success mb-2">العام الجامعي</Form.Label>
                <Select
                  styles={customSelectStyles}
                  placeholder="اختر العام الجامعي..."
                  options={academicYears.map(y => ({ value: y.name, label: y.name }))}
                  value={selectedAcademicYear ? { value: selectedAcademicYear, label: selectedAcademicYear } : null}
                  onChange={(opt) => setSelectedAcademicYear(opt ? opt.value : "")}
                  isSearchable
                  noOptionsMessage={() => "لا توجد أعوام جامعية"}
                />
              </Form.Group>
            </Col>

            <Col lg={4} md={12}>
              <Form.Group>
                <Form.Label className="fw-bold text-success mb-2">الفصل الدراسي</Form.Label>
                <Select
                  styles={customSelectStyles}
                  placeholder="اختر الفصل الدراسي..."
                  options={[
                    { value: "الفصل الدراسي الأول", label: "الفصل الدراسي الأول" },
                    { value: "الفصل الدراسي الثاني", label: "الفصل الدراسي الثاني" },
                    { value: "الفصل الدراسي الصيفي", label: "الفصل الدراسي الصيفي" }
                  ]}
                  value={selectedSemester ? { value: selectedSemester, label: selectedSemester } : null}
                  onChange={(opt) => setSelectedSemester(opt ? opt.value : "الفصل الدراسي الأول")}
                  isSearchable={false}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="g-4 mb-4">
        {/* Section 1: Faculty Daily Limits (Breakdown: Theory, Practical, Tutorial, Field) */}
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100" style={{ borderRadius: '16px' }}>
            <Card.Header className="bg-white border-0 pt-4 px-4 pb-2">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2 text-success">
                  <FaBalanceScale className="fs-5" />
                  <h5 className="fw-bold mb-0">حدود ساعات العمل في اليوم</h5>
                </div>
                {isHealthTechFaculty && (
                  <Badge bg="info" className="px-2 py-1 small">
                    تكنولوجيا العلوم الصحية (نظري، عملي، توتوريال، حقل)
                  </Badge>
                )}
              </div>
              <small className="text-muted">
                الحد الأقصى لساعات العمل في اليوم وفقاً لنظام الانتداب وقواعد الكلية {facultyPrepositionLabel}
              </small>
            </Card.Header>
            <Card.Body className="p-4">
              {limitsLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="success" />
                  <p className="mt-2 text-muted">جاري تحميل الحدود...</p>
                </div>
              ) : (
                <Form onSubmit={handleSaveLimits}>
                  {/* 1. ساعات نظري */}
                  <div className="bg-light p-3 rounded-4 mb-3 border">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold text-dark fs-6">📖 ساعات نظري</span>
                      <Badge bg="secondary" className="px-2 py-1">نظري</Badge>
                    </div>
                    <Form.Group>
                      <Form.Label className="small text-muted fw-semibold">الحد الأقصى في اليوم (ساعة/يوم)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="6"
                        value={limits.max_theory_hours_per_day}
                        disabled={isReadOnly}
                        onChange={(e) => setLimits(prev => ({ ...prev, max_theory_hours_per_day: e.target.value }))}
                        className="rounded-3"
                      />
                    </Form.Group>
                  </div>

                  {/* 2. ساعات عملي */}
                  <div className="bg-light p-3 rounded-4 mb-3 border">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold text-dark fs-6">🧪 ساعات عملي</span>
                      <Badge bg="secondary" className="px-2 py-1">عملي</Badge>
                    </div>
                    <Form.Group>
                      <Form.Label className="small text-muted fw-semibold">الحد الأقصى في اليوم (ساعة/يوم)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="4"
                        value={limits.max_practical_hours_per_day}
                        disabled={isReadOnly}
                        onChange={(e) => setLimits(prev => ({ ...prev, max_practical_hours_per_day: e.target.value }))}
                        className="rounded-3"
                      />
                    </Form.Group>
                  </div>

                  {/* 3. ساعات توتوريال - لكلية تكنولوجيا العلوم الصحية فقط */}
                  {isHealthTechFaculty && (
                    <div className="p-3 rounded-4 mb-3 border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-bold text-success fs-6">👥 ساعات توتوريال</span>
                        <Badge bg="success" className="px-2 py-1">توتوريال</Badge>
                      </div>
                      <Form.Group>
                        <Form.Label className="small text-muted fw-semibold">الحد الأقصى في اليوم (ساعة/يوم)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="4"
                          value={limits.max_tutorial_hours_per_day}
                          disabled={isReadOnly}
                          onChange={(e) => setLimits(prev => ({ ...prev, max_tutorial_hours_per_day: e.target.value }))}
                          className="rounded-3"
                        />
                      </Form.Group>
                    </div>
                  )}

                  {/* 4. ساعات حقل / تدريب ميداني - لكلية تكنولوجيا العلوم الصحية فقط */}
                  {isHealthTechFaculty && (
                    <div className="p-3 rounded-4 mb-4 border" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-bold text-primary fs-6">🏥 ساعات حقل / تدريب ميداني</span>
                        <Badge bg="primary" className="px-2 py-1">حقل</Badge>
                      </div>
                      <Form.Group>
                        <Form.Label className="small text-muted fw-semibold">الحد الأقصى في اليوم (ساعة/يوم)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="4"
                          value={limits.max_field_hours_per_day}
                          disabled={isReadOnly}
                          onChange={(e) => setLimits(prev => ({ ...prev, max_field_hours_per_day: e.target.value }))}
                          className="rounded-3"
                        />
                      </Form.Group>
                    </div>
                  )}

                  {/* صندوق القواعد والضوابط المعتمدة */}
                  <div className="p-3 rounded-4 mb-3 border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <div className="fw-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.92rem' }}>
                      <FaBalanceScale className="text-success" /> ضوابط احتساب الحد الأقصى لساعات اليوم والانتداب:
                    </div>
                    <div className="d-flex flex-column gap-2" style={{ fontSize: '0.84rem', lineHeight: 1.6 }}>
                      <div className="p-2 rounded-3 bg-white border">
                        <div className="fw-bold text-primary mb-1">👨‍🏫 أعضاء هيئة التدريس (أستاذ / أ.مساعد / مدرس):</div>
                        <div>
                          <strong>المعادلة:</strong> [مجموع النظري + (مجموع العملي والتوتوريال والحقل ÷ 2)] ≤ <strong>6 ساعات × عدد أيام انتداب الأستاذ</strong>
                        </div>
                      </div>
                      <div className="p-2 rounded-3 bg-white border">
                        <div className="fw-bold text-success mb-1">🧑‍🔬 الهيئة المعاونة (معيد / مدرس مساعد):</div>
                        <div>
                          <strong>المعادلة:</strong> مجموع (العملي + التوتوريال + الحقل) ≤ <strong>8 ساعات × عدد أيام انتداب الأستاذ</strong> (لا يمكنهم إعطاء نظري).
                        </div>
                      </div>
                      <div className="p-2 rounded-3 bg-white border text-muted">
                        📅 <strong>أيام الانتداب:</strong> انتداب كلي = 5 أيام | انتداب جزئي = 1 أو 2 أو 3 أيام.
                      </div>
                    </div>
                  </div>

                  {!isReadOnly && (
                    <Button
                      type="submit"
                      variant="success"
                      className="w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm"
                      disabled={limitsSaving}
                    >
                      {limitsSaving ? <Spinner size="sm" /> : <FaSave />}
                      <span>حفظ وتثبيت حدود ساعات الكلية</span>
                    </Button>
                  )}
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Section 2: Course Weeks Customization (Breakdown of course duration vs semester) */}
        <Col lg={6}>
          <Card className="shadow-sm border-0 h-100 d-flex flex-column" style={{ borderRadius: '16px' }}>
            <Card.Header className="bg-white border-0 pt-4 px-4 pb-2">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2" style={{ color: '#1565c0' }}>
                  <FaCalendarWeek className="fs-5" />
                  <h5 className="fw-bold mb-0">عدد أسابيع المقررات الدراسية</h5>
                </div>
                <Badge bg="primary-subtle" text="primary" className="px-3 py-1 border border-primary-subtle fw-bold" style={{ fontSize: '0.85rem' }}>
                  افتراضي الترم: {currentFacultyWeeks} أسبوع
                </Badge>
              </div>
              <small className="text-muted">
                تخصيص عدد الأسابيع للمقررات التي لا تستمر لكامل الفصل الدراسي {facultyPrepositionLabel}
              </small>
            </Card.Header>
            <Card.Body className="p-4 d-flex flex-column">
              {courseWeeksLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <div className="text-muted mt-2 small">جاري تحميل مقررات الخطة الدراسية...</div>
                </div>
              ) : (
                <>
                  <Form onSubmit={handleSaveCourseWeeks} className="mb-4">
                    {/* 1. اختيار المقرر */}
                    <Form.Group className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <Form.Label className="small fw-bold text-dark mb-0">
                          اختر المقرر الدراسي (من الخطة المحملة)
                        </Form.Label>
                        <Badge bg="light" text="dark" className="border fw-semibold px-2 py-1">
                          {availablePlanCourses.length} مقرر بالخطة
                        </Badge>
                      </div>
                      <Select
                        styles={customSelectStyles}
                        placeholder={availablePlanCourses.length > 0 ? "ابحث واختر المقرر لتحديد عدد أسابيعه..." : "لا توجد مقررات محملة بالخطة لهذا الفصل..."}
                        options={planCourseOptions}
                        value={selectedPlanCourse ? planCourseOptions.find(o => o.value === selectedPlanCourse.course_key) || null : null}
                        onChange={handleSelectPlanCourse}
                        isSearchable
                        isClearable
                        isDisabled={availablePlanCourses.length === 0}
                        noOptionsMessage={() => "لا توجد مقررات"}
                      />
                    </Form.Group>

                    {/* 2. عدد الأسابيع + زر الحفظ */}
                    <Row className="g-3 align-items-end mb-3">
                      <Col sm={6}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-dark mb-1">
                            عدد أسابيع المقرر
                          </Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            max="30"
                            step="1"
                            placeholder={String(currentFacultyWeeks)}
                            value={customWeeksCount}
                            disabled={!selectedPlanCourse || isReadOnly}
                            onChange={(e) => setCustomWeeksCount(e.target.value)}
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                      <Col sm={6}>
                        {!isReadOnly && (
                          <Button
                            type="submit"
                            variant="primary"
                            className="w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm"
                            disabled={courseWeeksSaving || !selectedPlanCourse || !customWeeksCount || parseInt(customWeeksCount) <= 0}
                          >
                            {courseWeeksSaving ? <Spinner size="sm" /> : <FaSave />}
                            <span>حفظ أسابيع المقرر</span>
                          </Button>
                        )}
                      </Col>
                    </Row>

                    {/* تنبيه توضيحي */}
                    <div className="p-3 rounded-3 mb-0" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '0.85rem' }}>
                      <div className="d-flex align-items-start gap-2 text-primary">
                        <FaInfoCircle className="mt-1 flex-shrink-0" />
                        <div>
                          <strong>ملاحظة:</strong> المقررات التي لم يتم تحديد أسابيعها تحتسب تلقائياً بالعدد الافتراضي لأسابيع الترم (<strong>{currentFacultyWeeks} أسبوع</strong>).
                        </div>
                      </div>
                    </div>
                  </Form>

                  {/* قائمة المقررات المخصصة */}
                  <div className="mt-auto border-top pt-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="small fw-bold text-secondary">
                        المقررات المخصصة حالياً ({customizedCourses.length})
                      </span>
                      {customizedCourses.length > 0 && (
                        <span className="badge bg-light text-secondary border small">
                          أقل من أسابيع الترم
                        </span>
                      )}
                    </div>

                    {customizedCourses.length > 0 ? (
                      <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        <Table hover size="sm" className="align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>المقرر</th>
                              <th className="text-center">الأسابيع</th>
                              <th className="text-center">الفارق</th>
                              {!isReadOnly && <th className="text-center">إجراء</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {customizedCourses.map((c) => {
                              const diff = c.weeks_count - currentFacultyWeeks;
                              const diffText = diff === 0 ? "نفس الترم" : diff > 0 ? `+${diff} أسبوع` : `${diff} أسبوع`;
                              const diffBadgeBg = diff < 0 ? 'bg-danger-subtle text-danger' : 'bg-info-subtle text-primary';
                              return (
                                <tr key={c.course_key}>
                                  <td className="fw-semibold text-dark">
                                    {c.course_name}
                                    {c.course_code && <small className="text-muted ms-1">({c.course_code})</small>}
                                  </td>
                                  <td className="text-center">
                                    <Badge bg="primary" className="px-2 py-1">
                                      {c.weeks_count} أسابيع
                                    </Badge>
                                  </td>
                                  <td className="text-center">
                                    <span className={`badge ${diffBadgeBg} px-2 py-1`}>
                                      {diffText}
                                    </span>
                                  </td>
                                  {!isReadOnly && (
                                    <td className="text-center">
                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        className="py-0 px-2"
                                        style={{ fontSize: '0.75rem' }}
                                        title={`استعادة الافتراضي (${currentFacultyWeeks} أسبوع)`}
                                        onClick={() => handleDeleteCourseWeeks(c.custom_id, c.course_name)}
                                      >
                                        <FaTimes />
                                      </Button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-3 text-muted bg-light rounded-3 border small">
                        لا توجد مقررات مخصصة حالياً — جميع المقررات تعمل بعدد أسابيع الترم ({currentFacultyWeeks} أسبوع).
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* صف أعباء أعضاء هيئة التدريس وتخفيض الساعات (تحت حدود العمل وأسابيع المقررات) */}
      <Row className="g-4 mb-4">
        {/* Section 3: Professor Load & Deduction for Specific Weeks */}
        <Col lg={12}>
          <Card className="shadow-sm border-0" style={{ borderRadius: '16px' }}>
            <Card.Header className="bg-white border-0 pt-4 px-4 pb-2">
              <div className="d-flex align-items-center gap-2 text-success">
                <FaUserTie className="fs-5" />
                <h5 className="fw-bold mb-0">أعباء أعضاء هيئة التدريس وتخفيض الساعات</h5>
              </div>
              <small className="text-muted">
                ابحث عن عضو هيئة التدريس للاطلاع على مقرراته وإجراء تخفيض الساعات مع تحديد المقرر ونوع الساعات والأسابيع
              </small>
            </Card.Header>
            <Card.Body className="p-4">
              {/* Professor Selection */}
              <Form.Group className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <Form.Label className="fw-bold text-secondary mb-0">
                    اختر عضو هيئة التدريس (المسند لهم مقررات بالخطة الدراسية)
                  </Form.Label>
                  <Badge bg="light" text="success" className="border border-success-subtle fw-semibold px-2 py-1">
                    {professors.length} أستاذ مسند له مقررات
                  </Badge>
                </div>
                <Select
                  styles={customSelectStyles}
                  placeholder="ابحث بالاسم عن عضو هيئة تدريس مسند لهم جميع المقررات في هذا الفصل..."
                  options={professors.map(p => ({
                    value: p.id,
                    label: `${p.name_ar} ${p.job_title ? `(${p.job_title})` : ''}`
                  }))}
                  value={selectedProfessorId ? {
                    value: selectedProfessorId,
                    label: professors.find(p => p.id === selectedProfessorId)?.name_ar || ''
                  } : null}
                  onChange={(opt) => setSelectedProfessorId(opt ? opt.value : null)}
                  isSearchable
                  isClearable
                  noOptionsMessage={() => "لا يوجد أعضاء هيئة تدريس مسند لهم مقررات في الخطة الدراسية لهذا الفصل والعام"}
                />
              </Form.Group>

              {/* Professor Content */}
              {profCoursesLoading && (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="success" />
                  <p className="mt-2 text-muted">جاري تحميل أعباء ومقررات الأستاذ...</p>
                </div>
              )}

              {!profCoursesLoading && !selectedProfessorId && (
                <div className="text-center py-5 text-muted border rounded-4 bg-light">
                  <FaSearch className="fs-1 mb-2 opacity-50 text-success" />
                  <p className="mb-0 fw-bold">يرجى اختيار عضو هيئة تدريس لعرض مقرراته وساعاته المكلف بها</p>
                </div>
              )}

              {!profCoursesLoading && selectedProfessorId && profData && (
                <div>
                  {/* Summary Bar */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between p-3 mb-3 rounded-4 bg-light border gap-2">
                    <div>
                      <div className="fw-bold fs-6 text-dark">{profData.professor_name}</div>
                      <small className="text-muted">{selectedSemester} - {selectedAcademicYear} (عدد الأسابيع المحددة: {profData.weeks_count} أسبوع)</small>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Badge bg="success" className="px-3 py-2 fs-6">
                        {profData.total_weekly_hours} س / أسبوع
                      </Badge>
                      <Badge bg="primary" className="px-3 py-2 fs-6">
                        {profData.total_semester_hours} س في الترم
                      </Badge>
                      {profData.total_deducted_hours > 0 && (
                        <Badge bg="danger" className="px-3 py-2 fs-6">
                          تم خصم {profData.total_deducted_hours} س
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* بطاقة تحليل العبء التدريسي والحد الأقصى لليوم وفقاً لأيام الانتداب */}
                  {(() => {
                    const isTA = isTeachingAssistant(profData);
                    const workDays = getProfessorWorkDays(profData);
                    const jobTitleText = getJobTitleFull(profData.job_title || profData.mnu_job_title);
                    const contractTypeText = profData.contract_type || (workDays === 5 ? "كلي" : "جزئي");

                    const totalTheory = (profData.courses || []).reduce((s, c) => s + (Number(c.hours_theory) || 0), 0);
                    const totalPractical = (profData.courses || []).reduce((s, c) => s + (Number(c.hours_practical) || 0), 0);
                    const totalExercise = (profData.courses || []).reduce((s, c) => s + (Number(c.hours_exercise) || 0), 0);
                    const totalActivity = (profData.courses || []).reduce((s, c) => s + (Number(c.hours_activity) || 0), 0);
                    const totalNonTheory = totalPractical + totalExercise + totalActivity;

                    let maxAllowed = 0;
                    let calculatedLoad = 0;
                    let hasViolation = false;
                    let violationMsg = "";

                    if (isTA) {
                      maxAllowed = 8 * workDays;
                      calculatedLoad = totalNonTheory;
                      if (totalTheory > 0) {
                        hasViolation = true;
                        violationMsg = `تنبيه نظامي: المعيد والمدرس المساعد لا يمكنهم تدريس ساعات نظري (مسجل له ${totalTheory} س نظري).`;
                      } else if (calculatedLoad > maxAllowed) {
                        hasViolation = true;
                        violationMsg = `تجاوز الحد الأقصى: مجموع الساعات (العملي والتوتوريال والحقل) = ${calculatedLoad} ساعة ويتجاوز الحد الأقصى المسموح (${maxAllowed} ساعة = ${workDays} أيام انتداب × 8 ساعات).`;
                      }
                    } else {
                      maxAllowed = 6 * workDays;
                      calculatedLoad = Number((totalTheory + (totalNonTheory / 2)).toFixed(2));
                      if (calculatedLoad > maxAllowed) {
                        hasViolation = true;
                        violationMsg = `تجاوز الحد الأقصى: العبء التدريسي المحتسب [نظري (${totalTheory} س) + نصف العملي (${(totalNonTheory / 2).toFixed(1)} س) = ${calculatedLoad} س] يتجاوز الحد الأقصى المسموح (${maxAllowed} ساعة = ${workDays} أيام انتداب × 6 ساعات).`;
                      }
                    }

                    return (
                      <div className="p-3 mb-4 rounded-4 border bg-white shadow-sm">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-2 mb-3 border-bottom">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="fw-bold text-dark fs-6">📊 فحص ومطابقة العبء لليوم والانتداب:</span>
                            <Badge bg="light" text="dark" className="border px-2 py-1">
                              {jobTitleText}
                            </Badge>
                            <Badge bg="light" text="primary" className="border px-2 py-1">
                              انتداب {contractTypeText} ({workDays} {workDays === 1 ? "يوم" : workDays === 2 ? "يومان" : "أيام"})
                            </Badge>
                          </div>
                          <div>
                            {hasViolation ? (
                              <Badge bg="danger" className="px-3 py-2 fs-6 shadow-sm">
                                ⚠️ متجاوز للحد الأقصى
                              </Badge>
                            ) : (
                              <Badge bg="success" className="px-3 py-2 fs-6 shadow-sm">
                                ✓ مطابق لضوابط الساعات
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Row className="g-2 text-center" style={{ fontSize: '0.88rem' }}>
                          <Col xs={6} md={3}>
                            <div className="p-2 rounded-3 bg-light border h-100">
                              <small className="text-muted d-block mb-1">ساعات النظري</small>
                              <strong className={isTA && totalTheory > 0 ? "text-danger fs-6" : "text-dark fs-6"}>
                                {totalTheory} س
                              </strong>
                              {isTA && totalTheory > 0 && <small className="text-danger d-block mt-1">غير مسموح</small>}
                            </div>
                          </Col>
                          <Col xs={6} md={3}>
                            <div className="p-2 rounded-3 bg-light border h-100">
                              <small className="text-muted d-block mb-1">عملي وتوتوريال وحقل</small>
                              <strong className="text-dark fs-6">{totalNonTheory} س</strong>
                              <small className="text-muted d-block mt-1">إجمالي الساعات العملية</small>
                            </div>
                          </Col>
                          <Col xs={6} md={3}>
                            <div className="p-2 rounded-3 bg-light border h-100">
                              <small className="text-muted d-block mb-1">
                                {isTA ? "العبء المحتسب (عملي)" : "العبء المحتسب (نظري + عملي/2)"}
                              </small>
                              <strong className={hasViolation ? "text-danger fs-6" : "text-success fs-6"}>
                                {calculatedLoad} س
                              </strong>
                              <small className="text-muted d-block mt-1">العبء الفعلي المحتسب</small>
                            </div>
                          </Col>
                          <Col xs={6} md={3}>
                            <div className="p-2 rounded-3 bg-light border h-100">
                              <small className="text-muted d-block mb-1">الحد الأقصى المسموح</small>
                              <strong className="text-primary fs-6">{maxAllowed} س</strong>
                              <small className="text-muted d-block mt-1">{workDays} أيام × {isTA ? 8 : 6} ساعات</small>
                            </div>
                          </Col>
                        </Row>

                        {hasViolation && (
                          <div className="mt-3 p-2 rounded-3 bg-danger bg-opacity-10 text-danger fw-bold border border-danger small text-center">
                            ⚠️ {violationMsg}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Courses Table from Study Plan */}
                  <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                    <FaBookOpen className="text-success" /> المقررات المكلف بتدريسها (من الخطة الدراسية):
                  </h6>
                  {profData.courses && profData.courses.length > 0 ? (
                    <div className="table-responsive mb-4 rounded-3 border" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      <Table hover className="mb-0 text-center align-middle" style={{ fontSize: '0.88rem' }}>
                        <thead style={{ backgroundColor: '#2e7d32', color: 'white', position: 'sticky', top: 0 }}>
                          <tr>
                            <th>البرنامج</th>
                            <th>المقرر</th>
                            <th>الكود</th>
                            <th>المستوى</th>
                            <th>الساعات (أسبوعياً)</th>
                            <th>عدد الأسابيع</th>
                            <th>ساعات الترم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profData.courses.map((c, idx) => (
                            <tr key={idx}>
                              <td className="fw-semibold text-secondary">{c.program_name || '-'}</td>
                              <td className="fw-bold text-dark">{c.course_name}</td>
                              <td><span className="badge bg-light text-dark border">{c.course_code || '-'}</span></td>
                              <td>{formatLevelToWord(c.level)}</td>
                              <td className="fw-bold text-success">{c.weekly_hours} س</td>
                              <td>
                                {c.is_custom_weeks ? (
                                  <Badge bg="primary" className="px-2 py-1 shadow-sm" title="مخصص لهذا المقرر">
                                    {c.weeks_count} أسابيع (مخصص)
                                  </Badge>
                                ) : (
                                  <Badge bg="light" text="dark" className="border px-2 py-1">
                                    {c.weeks_count || currentFacultyWeeks} أسبوع (افتراضي)
                                  </Badge>
                                )}
                              </td>
                              <td className="fw-bold text-primary">{c.semester_hours} س</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <Alert variant="info" className="py-2 text-center small mb-4">
                      لم يتم تكليف عضو هيئة التدريس بمقررات في هذا الفصل حتى الآن.
                    </Alert>
                  )}

                  {/* Hours Deduction Form Box with Course, Multi-Select Weeks & Multi-Select Hour Types */}
                  <div className="p-3 rounded-4 border" style={{ backgroundColor: '#f9fbf9' }}>
                    <h6 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                      <FaPlus /> تسجيل انتقاص / تخفيض ساعات:
                    </h6>

                    <Row className="g-3 mb-3">
                      {/* السطر الأول: المقرر الدراسي المستقطع منه + نوع الساعات التدريسية */}
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-dark">المقرر الدراسي المستقطع منه</Form.Label>
                          <Select
                            styles={customSelectStyles}
                            placeholder="اختر المقرر المكلف به..."
                            options={courseOptions}
                            value={selectedCourse}
                            onChange={(opt) => setSelectedCourse(opt)}
                            isDisabled={isReadOnly || courseOptions.length === 0}
                            isClearable
                            noOptionsMessage={() => "لا توجد مقررات مكلف بها في هذا الفصل"}
                          />
                          <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                            المقرر الذي يتم تخفيض ساعاته
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-dark d-flex align-items-center justify-content-between">
                            <span>نوع الساعات التدريسية (المكلف بها في المقرر)</span>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>(متعدد)</small>
                          </Form.Label>
                          <Select
                            styles={customSelectStyles}
                            placeholder={selectedCourse ? "اختر نوع الساعات المكلف بها في هذا المقرر..." : "حدد المقرر أولاً لاختيار نوع الساعات..."}
                            options={availableHourTypeOptions}
                            value={selectedHourTypes}
                            onChange={(opts) => setSelectedHourTypes(opts || [])}
                            isDisabled={isReadOnly || availableHourTypeOptions.length === 0}
                            isMulti
                            isSearchable={false}
                            closeMenuOnSelect={false}
                            noOptionsMessage={() => "لا توجد ساعات مكلفة لهذا المقرر"}
                          />
                          <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {selectedCourse ? "الأنواع الفعلية المسندة للأستاذ في هذا المقرر" : "حدد المقرر أولاً لعرض أنواع ساعاته التدريسية"}
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      {/* السطر الثاني: الأسبوع المستقطع منه + عدد الساعات المستقطعة */}
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-dark d-flex align-items-center justify-content-between">
                            <span>الأسبوع المستقطع منه</span>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>(متعدد)</small>
                          </Form.Label>
                          <Select
                            styles={customSelectStyles}
                            placeholder="اختر أسبوعاً أو أكثر..."
                            options={weekOptions}
                            value={selectedWeeks}
                            onChange={(opts) => setSelectedWeeks(opts || [])}
                            isDisabled={isReadOnly}
                            isMulti
                            isSearchable
                            closeMenuOnSelect={false}
                            noOptionsMessage={() => "لا توجد أسابيع"}
                          />
                          <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                            اختر أسبوعاً أو عدة أسابيع للاستقطاع
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-dark">عدد الساعات المستقطعة</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.5"
                            min="0.5"
                            placeholder="مثلاً: 2"
                            value={deductedHours}
                            disabled={isReadOnly}
                            onChange={(e) => setDeductedHours(e.target.value)}
                            className="rounded-3"
                          />
                          <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {numWeeksSelected > 1 ? `الإجمالي: ${totalNewDeductionForOperation} س (${numWeeksSelected} أسابيع)` : 'عدد الساعات المستقطعة لكل أسبوع'}
                          </Form.Text>
                        </Form.Group>
                      </Col>

                      {/* السطر الثالث: سبب الانتقاص */}
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-dark">سبب الانتقاص</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="مثال: إجازة خاصة، تكليف إداري، مهمة علمية..."
                            value={deductionReason}
                            disabled={isReadOnly}
                            onChange={(e) => setDeductionReason(e.target.value)}
                            className="rounded-3"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* Result Calculation Preview Card */}
                    <div className="p-3 mb-3 rounded-3" style={{ backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9' }}>
                      <Row className="text-center g-2 align-items-center">
                        <Col sm={4}>
                          <div className="text-muted small">إجمالي ساعات الترم:</div>
                          <div className="fw-bold text-dark">{currentTotalSemesterHours} ساعة</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>({profData.total_weekly_hours} س / أسبوع × {profData.weeks_count} أسابيع)</div>
                        </Col>
                        <Col sm={4} className="border-start border-end border-success rounded-2" style={{ backgroundColor: 'var(--bs-danger-bg-subtle, #f8d7da)', padding: '8px 6px' }}>
                          <div className="text-danger small fw-semibold">إجمالي الخصم (الحالي + الجديد):</div>
                          <div className="fw-bold text-danger">-{existingTotalDeducted + (numWeeksSelected > 0 ? totalNewDeductionForOperation : parsedNewDeduction)} ساعة</div>
                          <div className="text-danger" style={{ fontSize: '0.75rem' }}>
                            {numWeeksSelected > 0 ? `(${parsedNewDeduction} س × ${numWeeksSelected} أسابيع)` : '(حدد الأسابيع)'}
                          </div>
                        </Col>
                        <Col sm={4}>
                          <div className="text-success small fw-bold">الصافي بعد الخصم:</div>
                          <div className="fw-bold text-success fs-5">{previewNetSemester} ساعة في الترم</div>
                          <div className="text-success fw-bold" style={{ fontSize: '0.8rem' }}>(في جامعة المنوفية الأهلية)</div>
                        </Col>
                      </Row>
                    </div>

                    {!isReadOnly && (
                      <div className="d-flex justify-content-end gap-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="px-3 py-2 fw-bold rounded-3 d-flex align-items-center gap-2 shadow-sm"
                          onClick={() => {
                            setDeductedHours('');
                            setDeductionReason('');
                            setSelectedWeeks([]);
                            setSelectedHourTypes([]);
                            setSelectedCourse(null);
                          }}
                          disabled={deductionSaving}
                          title="إلغاء وتفريغ الحقول"
                        >
                          <FaTimes />
                          <span>إلغاء</span>
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          className="px-4 py-2 fw-bold rounded-3 d-flex align-items-center gap-2 shadow-sm"
                          onClick={handleSaveDeduction}
                          disabled={deductionSaving || !deductedHours || parseFloat(deductedHours) <= 0 || selectedWeeks.length === 0 || selectedHourTypes.length === 0}
                        >
                          {deductionSaving ? <Spinner size="sm" /> : <FaCheckCircle />}
                          <span>حفظ وانتقاص الساعات للأسابيع المختارة</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Grand Table: All Professors with Deductions in this Faculty & Semester */}
      <Card className="shadow-sm border-0 mt-4" style={{ borderRadius: '16px' }}>
        <Card.Header className="bg-white border-0 pt-4 px-4 pb-2">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-2 text-danger">
              <FaUserTie className="fs-5" />
              <h5 className="fw-bold mb-0">جدول أعضاء هيئة التدريس الذين تم انتقاص ساعاتهم</h5>
            </div>
            <div className="d-flex flex-column align-items-end gap-2">
              <div
                className="px-3 py-1 rounded-pill shadow-sm fw-bold d-inline-flex align-items-center"
                style={{
                  fontSize: '0.92rem',
                  backgroundColor: 'var(--bs-danger-bg-subtle, #f8d7da)',
                  color: '#842029',
                  border: '1px solid #f5c2c7'
                }}
              >
                إجمالي الاستقطاعات المسجلة بالكلية: {facultyDeductions.length}
              </div>
              <div className="d-flex align-items-center gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="fw-bold d-flex align-items-center gap-2 shadow-sm px-3 py-1"
                  onClick={handlePrintDeductions}
                  disabled={facultyDeductions.length === 0}
                  title="طباعة كشف أعضاء هيئة التدريس الذين تم انتقاص ساعاتهم"
                >
                  <FaPrint />
                  <span>جدول الإستقطاعات</span>
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  className="text-white fw-bold d-flex align-items-center gap-2 shadow-sm px-3 py-1"
                  onClick={handleExportExcelDeductions}
                  disabled={facultyDeductions.length === 0}
                  title="تنزيل كشف أعضاء هيئة التدريس كملف إكسيل Excel"
                >
                  <FaFileExcel />
                  <span>Excel</span>
                </Button>
              </div>
            </div>
          </div>
          <small className="text-muted">
            استعراض شامل لجميع أعضاء هيئة التدريس الذين تم تخفيض ساعاتهم {facultyPrepositionLabel} ({selectedSemester} - للعام الجامعي {selectedAcademicYear})
          </small>
        </Card.Header>
        <Card.Body className="p-4">
          {facultyDeductionsLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="danger" />
              <p className="mt-2 text-muted">جاري تحميل جدول الأساتذة...</p>
            </div>
          ) : facultyDeductions.length > 0 ? (
            <div className="table-responsive rounded-3 border">
              <Table hover striped className="mb-0 text-center align-middle" style={{ fontSize: '0.92rem' }}>
                <thead style={{ backgroundColor: '#c62828', color: 'white' }}>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>اسم الأستاذ</th>
                    <th>اسم المقرر</th>
                    <th>الأسبوع المستقطع منه</th>
                    <th>نوع الساعات</th>
                    <th>الساعات المنتقصة</th>
                    <th>سبب الانتقاص</th>
                    <th>سُجل بواسطة</th>
                    {!isReadOnly && <th style={{ width: '80px' }}>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {facultyDeductions.map((d, idx) => (
                    <tr key={d.id || idx}>
                      <td className="fw-bold text-muted">{idx + 1}</td>
                      <td className="fw-bold text-dark fs-6">{d.professor_name || 'غير محدد'}</td>
                      <td className="fw-semibold text-primary">{d.course_name || 'عام / بدون تحديد'}</td>
                      <td className="fw-bold text-success">{d.week_name || '-'}</td>
                      <td>
                        {d.hour_type ? (
                          <Badge bg="secondary" className="px-2 py-1">{d.hour_type}</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="fw-bold text-danger fs-6">- {d.deducted_hours} ساعة</td>
                      <td className="text-secondary">{d.reason || 'بدون سبب'}</td>
                      <td className="text-muted small">{d.created_by || '-'}</td>
                      {!isReadOnly && (
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="py-1 px-2"
                            title="إلغاء هذا الانتقاص"
                            onClick={() => handleDeleteDeduction(d.id, d.week_name, d.deducted_hours)}
                            disabled={deductionSaving}
                          >
                            <FaTrash style={{ fontSize: '12px' }} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-danger text-dark">
                    <td colSpan={5}>إجمالي الساعات المنتقصة بالكلية لهذا الفصل</td>
                    <td className="text-danger fs-6">
                      - {facultyDeductions.reduce((sum, d) => sum + (d.deducted_hours || 0), 0)} ساعة
                    </td>
                    <td colSpan={!isReadOnly ? 3 : 2}></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted bg-light rounded-3 border">
              <FaCheckCircle className="fs-2 text-success mb-2 opacity-50" />
              <p className="mb-0 fw-bold">لا يوجد أي استقطاع أو تخفيض ساعات مسجل لأعضاء هيئة التدريس بهذه الكلية في هذا الفصل.</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default WorkloadPage;
