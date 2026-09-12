import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirmAlert';
import Select from 'react-select';
import React, { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { Container, Row, Col, Form, Button, Table, Modal, Card, Alert, Spinner } from "react-bootstrap";
import { FaPlus, FaSave, FaTrash, FaPrint, FaFileExcel, FaFileUpload, FaFileDownload, FaInfoCircle, FaEdit, FaCalendarAlt, FaCopy, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import logo from '../assets/logo.png';

const API = "";
const SEMESTERS = ["الفصل الدراسي الأول", "الفصل الدراسي الثاني", "الفصل الصيفي"];
const YEARS = ["2024/2025", "2025/2026", "2026/2027", "2027/2028"];

const customSelectStyles = {
  control: (base) => ({ ...base, textAlign: 'right', direction: 'rtl' }),
  menu: (base) => ({ ...base, textAlign: 'right', direction: 'rtl' }),
  menuList: (base) => ({ ...base, textAlign: 'right', direction: 'rtl' }),
  option: (base) => ({ ...base, textAlign: 'right', direction: 'rtl' }),
  singleValue: (base) => ({ ...base, textAlign: 'right', direction: 'rtl' }),
  placeholder: (base) => ({ ...base, textAlign: 'right', direction: 'rtl' }),
  input: (base) => ({ ...base, textAlign: 'right', direction: 'rtl' })
};



/* ── Job Title Helpers ── */
const getJobTitleFull = (jobTitle) => {
  if (!jobTitle) return "--";
  const t = String(jobTitle).trim();
  if (t === "د" || t === "د." || t === "مدرس") return "مدرس";
  if (t === "أ.د" || t === "أ.د." || t === "أستاذ") return "أستاذ";
  if (t === "أ.م.د" || t === "أ.م.د." || t === "أ.م" || t === "أستاذ مساعد") return "أستاذ مساعد";
  if (t === "م.م" || t === "مدرس مساعد") return "مدرس مساعد";
  if (t === "معيد" || t === "معيدة" || t === "م.ع" || t === "أ" || t === "ط" || t === "ص") return "معيد";
  return t;
};

const getJobTitleAbbr = (jobTitle) => {
  if (!jobTitle) return "";
  const t = String(jobTitle).trim();
  if (t === "د" || t === "د." || t === "مدرس") return "د";
  if (t === "أ.د" || t === "أ.د." || t === "أستاذ") return "أ.د";
  if (t === "أ.م.د" || t === "أ.م.د." || t === "أ.م" || t === "أستاذ مساعد") return "أ.م.د";
  if (t === "م.م" || t === "مدرس مساعد") return "م.م";
  if (t === "معيد") return "م";
  return t;
};

const formatWeekCountText = (count) => {
  if (count === null || count === undefined || count === "") return "";
  const num = Number(count);
  if (isNaN(num)) return count;
  if (num === 1) return "أسبوع واحد";
  if (num === 2) return "أسبوعان";
  if (num >= 3 && num <= 10) return `${num} أسابيع`;
  return `${num} أسبوع`;
};

const getProfAttendanceWeeksForSemester = (profObj, targetYear, targetSemester, ayList = [], isMed = false) => {
  if (!profObj) return "--";

  const yName = targetYear || (ayList.length > 0 ? ayList[0].name : "2026/2027");
  const ayObj = ayList.find(y => y.name === yName) || {};

  let parsedAyWeeks = {};
  if (profObj.academic_year_weeks) {
    if (typeof profObj.academic_year_weeks === "string") {
      try { parsedAyWeeks = JSON.parse(profObj.academic_year_weeks); } catch (e) {}
    } else if (typeof profObj.academic_year_weeks === "object") {
      parsedAyWeeks = profObj.academic_year_weeks;
    }
  }

  const currentYearData = parsedAyWeeks[yName] || {};
  const isTargetYearMatch = (profObj.academic_year === yName);

  const semStr = String(targetSemester || "").trim();
  let weeksNum = null;

  const defaultS1 = isMed ? (ayObj.med_semester1_weeks ?? ayObj.semester1_weeks ?? 15) : (ayObj.semester1_weeks ?? 15);
  const defaultS2 = isMed ? (ayObj.med_semester2_weeks ?? ayObj.semester2_weeks ?? 14) : (ayObj.semester2_weeks ?? 14);
  const defaultS3 = isMed ? (ayObj.med_summer_weeks ?? ayObj.summer_weeks ?? 7) : (ayObj.summer_weeks ?? 7);

  if (semStr.includes("ثاني") || semStr.includes("ثانى") || semStr === "2") {
    weeksNum = currentYearData.semester2_weeks ?? (isTargetYearMatch ? profObj.semester2_weeks : null) ?? defaultS2;
  } else if (semStr.includes("صيف") || semStr.includes("صيفي") || semStr === "3") {
    weeksNum = currentYearData.summer_weeks ?? (isTargetYearMatch ? profObj.summer_weeks : null) ?? defaultS3;
  } else {
    // Default to Semester 1
    weeksNum = currentYearData.semester1_weeks ?? (isTargetYearMatch ? profObj.semester1_weeks : null) ?? defaultS1;
  }

  return formatWeekCountText(weeksNum) || `${weeksNum} أسابيع`;
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
    jt === "معيدة" ||
    jt === "م.ع" ||
    jt === "م.م" ||
    jt === "م.م." ||
    jt === "أ" ||
    jt === "ط" ||
    jt === "ص" ||
    jt === "مدرس مساعد" ||
    (mnuJt.includes("معيد") && !mnuJt.includes("أستاذ")) ||
    (mnuJt.includes("مدرس مساعد") && !mnuJt.includes("أستاذ مساعد"))
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

const isTeachingAssistantOrAssistantLecturer = (jobTitle) => {
  if (!jobTitle) return false;
  const full = getJobTitleFull(jobTitle);
  const t = String(jobTitle).trim();
  return (
    full === "معيد" ||
    full === "مدرس مساعد" ||
    full === "أخصائي" ||
    t === "معيد" ||
    t === "معيدة" ||
    t === "مدرس مساعد" ||
    t === "م.م" ||
    t === "م.م." ||
    t === "م.ع" ||
    t === "أ" ||
    t === "ط" ||
    t === "ص"
  );
};

const formatLevelToWord = (lvl) => {
  if (!lvl) return "--";
  const str = String(lvl).trim();
  const map = {
    "1": "الأول",
    "2": "الثاني",
    "3": "الثالث",
    "4": "الرابع",
    "5": "الخامس",
    "الأول": "الأول",
    "الثاني": "الثاني",
    "الثالث": "الثالث",
    "الرابع": "الرابع",
    "الخامس": "الخامس",
    "First": "الأول",
    "Second": "الثاني",
    "Third": "الثالث",
    "Fourth": "الرابع",
    "Fifth": "الخامس"
  };
  return map[str] || str;
};

const getFormattedProfName = (profObj) => {
  if (!profObj || (!profObj.name_ar && !profObj.name)) return "--";
  let rawName = profObj.name_ar || profObj.name || "";

  // Strip preexisting title prefix if present in rawName
  rawName = rawName.replace(/^(أ\.د|أ\.م\.د|أ\.م|د|م\.م|م)\s*[\/\.]?\s*/, "").trim();

  const abbr = getJobTitleAbbr(profObj.job_title);
  return abbr ? `${abbr} / ${rawName}` : rawName;
};

const StudyPlanPage = () => {
  const { user } = useContext(AuthContext);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [professors, setProfessors] = useState([]);

  const [planRows, setPlanRows] = useState([]);
  const [existingPlanIds, setExistingPlanIds] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("الفصل الدراسي الأول");
  const [selectedYear, setSelectedYear] = useState("2026/2027");
  const [academicYears, setAcademicYears] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [workloadLimits, setWorkloadLimits] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCourseId, setEditingCourseId] = useState(null);

  // Copy Plan State
  const [showCopyPlanModal, setShowCopyPlanModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sourceAcademicYear, setSourceAcademicYear] = useState("");
  const [sourceSemester, setSourceSemester] = useState("");
  const [copyingPlan, setCopyingPlan] = useState(false);

  // Excel Template & Import State
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importPreviewData, setImportPreviewData] = useState([]);
  const [importMode, setImportMode] = useState("append"); // 'append' | 'replace'
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const fileInputRef = useRef(null);

  const isSuperAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isManager = user?.role === "manager" || (user?.job_title && (user.job_title.trim() === "مدير" || (user.job_title.includes("مدير") && !user.job_title.includes("برنامج") && !user.job_title.includes("شؤون")) || user.job_title.includes("عميد")));
  const isProgramDirector = user?.role === "faculty_professor" || (user?.job_title && user.job_title.includes("مدير برنامج"));
  const userFacultyId = user?.faculty_id || user?.faculty?.id;
  const isMatchingFaculty = !userFacultyId || !selectedFaculty || String(userFacultyId) === String(selectedFaculty) || user?.all_faculties_access || (user?.assigned_faculties && user.assigned_faculties.some(f => String(f.id) === String(selectedFaculty)));

  // من يملك الصلاحية للضغط على زر إنهاء الخطة وإلغاء إنهاء الخطة:
  // 1. المدير العام (Super Admin)
  // 2. المدير (Manager)
  // 3. مدير البرنامج الخاص بهذه الكلية (Program Director for this faculty)
  const canFinish = Boolean(
    isSuperAdmin ||
    isManager ||
    (isProgramDirector && isMatchingFaculty) ||
    (user?.perm_finish_plan && isMatchingFaculty)
  );
  const canReview1 = Boolean(isSuperAdmin || user?.perm_review_1);
  const canReview2 = Boolean(isSuperAdmin || user?.perm_review_2);
  const canApprove = Boolean(isSuperAdmin || user?.perm_approve_plan);

  // الخطة تقفل وتختفي أزرار التعديل والإضافة والحفظ وعمود الإجراءات للمستخدم الذي قام بالضغط على مرحلته فقط
  const isPlanLocked = Boolean(
    currentPlan?.is_approved ||
    (canApprove ? currentPlan?.is_approved :
      canReview2 ? currentPlan?.is_reviewed_2 :
        canReview1 ? currentPlan?.is_reviewed_1 :
          canFinish ? currentPlan?.is_finished :
            currentPlan?.is_finished)
  );


  // States for the Modal Form
  useEffect(() => {
    if (selectedYear) localStorage.setItem('studyplan_year', selectedYear);
    if (selectedSemester) localStorage.setItem('studyplan_semester', selectedSemester);
  }, [selectedYear, selectedSemester]);

  const [formData, setFormData] = useState({
    base_course_id: "",
    student_count: 0, groups_theory: 0, groups_practical: 0, groups_activity: 0, groups_training: 0, groups_field: 0,
    notes: ""
  });

  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [activeModuleIdForProf, setActiveModuleIdForProf] = useState("");
  const [multiPrograms, setMultiPrograms] = useState([]);
  const [multiProfessors, setMultiProfessors] = useState([
    { id: Date.now(), module_id: "", professor_id: "", hours_actual_theory: 0, hours_actual_practical: 0, hours_actual_training: 0, hours_actual_field: 0, notes: "" }
  ]);

  const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
  const isHealthTech = Boolean(activeFac && (activeFac.name.includes("تكنولوجيا العلوم الصحية") || activeFac.name.includes("العلوم الصحية")));
  const isMedicine = Boolean(activeFac && (activeFac.name.includes("الطب والجراحة") || activeFac.name.includes("طب بشري") || activeFac.name.includes("كلية الطب")) && !activeFac.name.includes("البيطري") && !activeFac.name.includes("الأسنان") && !activeFac.name.includes("الاسنان") && !activeFac.name.includes("تكنولوجيا"));
  const hasMultiplePrograms = Boolean(programs && programs.length > 1);

  const isInitialMount = useRef(true);

  const fetchFacultyDataAndPlan = async (facultyId, semester, year, showLoading = true) => {
    if (!facultyId) {
      setCourses([]);
      setPrograms([]);
      setPlanRows([]);
      setExistingPlanIds([]);
      setWorkloadLimits(null);
      if (showLoading) setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const [coursesRes, programsRes, plansRes, sigsRes, limitsRes] = await Promise.all([
        axios.get(`${API}/api/courses`),
        axios.get(`${API}/api/programs`),
        axios.get(`${API}/api/study-plans?faculty_id=${facultyId}&semester=${encodeURIComponent(semester)}&academic_year=${encodeURIComponent(year)}`),
        axios.get(`${API}/api/signatures?faculty_id=${facultyId}&report_type=${encodeURIComponent("الخطة الدراسية")}`),
        axios.get(`${API}/api/workload/limits?faculty_id=${facultyId}&academic_year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}`).catch(err => {
          console.warn("Could not fetch workload limits:", err);
          return { data: null };
        })
      ]);

      setWorkloadLimits(limitsRes?.data || null);

      let fetchedSigs = sigsRes.data || [];
      if (fetchedSigs.length === 0) {
        try {
          const allSigsRes = await axios.get(`${API}/api/signatures?faculty_id=${facultyId}`);
          fetchedSigs = allSigsRes.data || [];
        } catch (e) {
          console.error("Error fetching fallback signatures", e);
        }
      }
      setSignatures(fetchedSigs);

      const facultyCourses = (coursesRes.data || []).filter(c => String(c.faculty_id) === String(facultyId));
      const facultyPrograms = (programsRes.data || []).filter(p => String(p.faculty_id) === String(facultyId));

      setCourses(facultyCourses);
      setPrograms(facultyPrograms);

      const plans = plansRes.data || [];
      setExistingPlanIds(plans.map(p => p.id));
      if (plans.length > 0) {
        setCurrentPlan(plans[0]);
      } else {
        setCurrentPlan(null);
      }

      let allRows = [];
      plans.forEach(plan => {
        if (plan.items) {
          plan.items.forEach(item => {
            let progIds = [];
            let sharedCoursesData = [];
            let sharedCourseIds = [];
            if (item.entry_group_id) {
              const rawEntry = String(item.entry_group_id).trim();
              if (rawEntry.startsWith("{")) {
                try {
                  const parsed = JSON.parse(rawEntry);
                  progIds = parsed.prog_ids || [];
                  sharedCoursesData = parsed.shared_courses || [];
                  sharedCourseIds = sharedCoursesData.map(x => x.id || x.course_id).filter(Boolean);
                } catch (e) {
                  progIds = (item.program_id ? [item.program_id] : []);
                }
              } else if (rawEntry.includes(",")) {
                progIds = rawEntry.split(",").map(id => parseInt(id.trim())).filter(Boolean);
              } else if (rawEntry) {
                progIds = [parseInt(rawEntry)].filter(Boolean);
              }
            }
            if (progIds.length === 0 && item.program_id) {
              progIds = [item.program_id];
            }

            allRows.push({
              _key: Date.now() + Math.random(),
              base_course_id: item.base_course_id || item.course_id,
              course_id: item.course_id,
              module_id: item.module_id,
              program_id: item.program_id,
              program_ids: progIds,
              shared_courses_data: sharedCoursesData,
              shared_course_ids: sharedCourseIds,
              entry_group_id: item.entry_group_id || "",
              professor_id: item.professor_id,
              professor_name: item.professor ? (item.professor.name_ar || item.professor.name) : "",
              prof_job_title: item.professor?.job_title || "",
              prof_workplace: item.professor?.original_workplace || "",
              nameAr: item.course?.name_ar || "",
              nameEn: item.course?.name_en || "",
              code: item.course?.code || "",
              level: item.course?.level || "",
              student_count: item.student_count,
              groups_theory: item.groups_theory,
              groups_practical: item.groups_practical,
              groups_training: item.groups_exercise || 0,
              groups_field: item.groups_activity || 0,
              groups_activity: item.groups_activity || 0,
              hours_actual_theory: item.hours_actual_theory,
              hours_actual_practical: item.hours_actual_practical,
              hours_actual_training: item.hours_actual_exercise || 0,
              hours_actual_field: item.hours_actual_activity || 0,
              notes: item.notes || "",
              prof_notes: item.notes || "",
              course_notes: item.course_notes || "",
              req_theory: item.required_hours_theory,
              req_practical: item.required_hours_practical,
              req_training: item.required_hours_exercise || 0,
              req_field: item.required_hours_activity || 0
            });
          });
        }
      });

      // Filter and deduplicate allRows to eliminate duplicate/ghost placeholder rows from DB
      const courseMap = {};
      allRows.forEach(r => {
        const cKey = `${r.base_course_id || r.course_id}`;
        if (!courseMap[cKey]) courseMap[cKey] = [];
        courseMap[cKey].push(r);
      });

      const cleanedRows = [];
      Object.values(courseMap).forEach(courseItems => {
        const assigned = courseItems.filter(x => x.professor_id || Number(x.hours_actual_theory) > 0 || Number(x.hours_actual_practical) > 0 || Number(x.hours_actual_training) > 0 || Number(x.hours_actual_field) > 0);
        const toUse = assigned.length > 0 ? assigned : (courseItems.length > 0 ? [courseItems[0]] : []);
        const seen = new Set();
        toUse.forEach(item => {
          const key = `${item.module_id || ""}_${item.professor_id || "unassigned"}`;
          if (!seen.has(key)) {
            seen.add(key);
            cleanedRows.push(item);
          }
        });
      });

      setPlanRows(cleanedRows);
    } catch (err) {
      console.error("Error loading plans:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      try {
        const [facRes, profRes, yearRes] = await Promise.all([
          axios.get(`${API}/api/faculties`),
          axios.get(`${API}/api/professors`),
          axios.get(`${API}/api/academic-years`).catch(() => ({ data: [] }))
        ]);

        if (!isMounted) return;

        const facList = facRes.data || [];
        setFaculties(facList);
        setProfessors(profRes.data || []);

        let initialYear = "2026/2027";
        if (Array.isArray(yearRes.data)) {
          const yearList = yearRes.data.map(y => (typeof y === "string" ? y : (y.name || y.year || ""))).filter(Boolean);
          if (yearList.length > 0) {
            setAcademicYears(yearList);
            initialYear = yearList.includes(selectedYear) ? selectedYear : yearList[0];
            setSelectedYear(initialYear);
          }
        }

        if (facList.length > 0) {
          const userFacId = user?.faculty_id || user?.faculty?.id;
          const targetFac = (userFacId && facList.some(f => String(f.id) === String(userFacId)))
            ? userFacId
            : facList[0].id;
          setSelectedFaculty(targetFac);

          await fetchFacultyDataAndPlan(targetFac, selectedSemester, initialYear, true);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error initializing StudyPlanPage:", err);
        if (isMounted) setLoading(false);
      } finally {
        if (isMounted) isInitialMount.current = false;
      }
    };

    init();
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (selectedFaculty && selectedSemester && selectedYear) {
      fetchFacultyDataAndPlan(selectedFaculty, selectedSemester, selectedYear, true);
    }
  }, [selectedFaculty, selectedSemester, selectedYear]);

  useEffect(() => {
    if (!formData.base_course_id) return;
    const selectedC = courses.find(c => String(c.id) === String(formData.base_course_id));
    if (!selectedC) return;

    const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
    const isMedicineFac = Boolean(activeFac && (activeFac.name.includes("الطب والجراحة") || activeFac.name.includes("طب بشري") || activeFac.name.includes("كلية الطب")) && !activeFac.name.includes("البيطري") && !activeFac.name.includes("الأسنان") && !activeFac.name.includes("الاسنان") && !activeFac.name.includes("تكنولوجيا"));

    const th = Number(selectedC.theory_hours) || 0;
    const pr = Number(selectedC.practical_hours) || 0;
    const tr = Number(selectedC.exercise_hours) || 0;
    const fld = Number(selectedC.activity_hours) || 0;
    const act = isMedicineFac ? (selectedC.modules?.reduce((s, m) => s + (Number(m.activity_hours) || 0), 0) || Number(selectedC.activity_hours) || 0) : 0;

    setFormData(prev => {
      let changed = false;
      const next = { ...prev };
      if (th === 0 && prev.groups_theory !== 0) { next.groups_theory = 0; changed = true; }
      if (pr === 0 && prev.groups_practical !== 0) { next.groups_practical = 0; changed = true; }
      if (tr === 0 && prev.groups_training !== 0) { next.groups_training = 0; changed = true; }
      if (fld === 0 && prev.groups_field !== 0) { next.groups_field = 0; changed = true; }
      if (act === 0 && prev.groups_activity !== 0) { next.groups_activity = 0; changed = true; }
      return changed ? next : prev;
    });

    setMultiProfessors(prev => {
      let changed = false;
      const next = prev.map(p => {
        const activeMod = selectedC.modules?.find(m => String(m.id) === String(p.module_id));
        const pTh = activeMod ? (Number(activeMod.theory_hours) || 0) : th;
        const pPr = activeMod ? (Number(activeMod.practical_hours) || 0) : pr;

        const newP = { ...p };
        if (pTh === 0 && p.hours_actual_theory !== 0) { newP.hours_actual_theory = 0; changed = true; }
        if (pPr === 0 && p.hours_actual_practical !== 0) { newP.hours_actual_practical = 0; changed = true; }
        if (tr === 0 && p.hours_actual_training !== 0) { newP.hours_actual_training = 0; changed = true; }
        if (fld === 0 && p.hours_actual_field !== 0) { newP.hours_actual_field = 0; changed = true; }
        return newP;
      });
      return changed ? next : prev;
    });
  }, [formData.base_course_id, multiProfessors.map(p => p.module_id).join(','), courses, faculties, selectedFaculty]);

  const getAvailableProfessors = (currentProfId = null) => {
    const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
    let facultyProfs = professors.filter(p => {
      if (!p.faculties || p.faculties.length === 0) return true;
      return p.faculties.some(f =>
        String(f.id) === String(selectedFaculty) ||
        String(f) === String(selectedFaculty) ||
        (typeof f === "object" && activeFac && String(f.name).trim() === String(activeFac.name).trim())
      ) || String(p.faculty_id) === String(selectedFaculty);
    });
    if (facultyProfs.length === 0) facultyProfs = professors;

    return facultyProfs.filter(p => {
      if (currentProfId && String(p.id) === String(currentProfId)) return true;

      const profRows = multiProfessors.filter(r => String(r.professor_id) === String(p.id));
      const totalTh = profRows.reduce((sum, r) => sum + (Number(r.hours_actual_theory) || 0), 0);
      const totalPr = profRows.reduce((sum, r) => sum + (Number(r.hours_actual_practical) || 0), 0);
      const totalTr = profRows.reduce((sum, r) => sum + (Number(r.hours_actual_training) || 0), 0);
      const totalFld = profRows.reduce((sum, r) => sum + (Number(r.hours_actual_field) || 0), 0);

      // إذا استوفى 8 ساعات إجمالية (عملي + نظري + توتوريال + حقل) أو 6 ساعات نظري في هذا المقرر
      const totalAll = totalTh + totalPr + totalTr + totalFld;
      if (totalAll >= 8 || totalTh >= 6) {
        return false;
      }
      return true;
    });
  };


  const getEquivalentCourses = (courseId) => {
    const selected = courses.find(c => String(c.id) === String(courseId));
    if (!selected) return [];
    const facultyCourses = courses.filter(c => !selectedFaculty || String(c.faculty_id) === String(selectedFaculty));
    return facultyCourses.filter(c =>
      String(c.id) !== String(selected.id) &&
      (!selected.requirement || !c.requirement || String(c.requirement).trim() === String(selected.requirement).trim()) &&
      (!selected.level || !c.level || String(c.level).trim() === String(selected.level).trim()) &&
      (!selected.course_type || !c.course_type || String(c.course_type).trim() === String(selected.course_type).trim()) &&
      (
        (c.name_ar && selected.name_ar && c.name_ar.trim().toLowerCase() === selected.name_ar.trim().toLowerCase()) ||
        (c.name_en && selected.name_en && c.name_en.trim().toLowerCase() === selected.name_en.trim().toLowerCase()) ||
        (c.code && selected.code && c.code.trim().toLowerCase() === selected.code.trim().toLowerCase())
      )
    );
  };

  const normalizeSem = (sem) => {
    if (!sem) return "";
    const s = String(sem).trim();
    if (s.includes("اول") || s.includes("أول") || s === "1") return "1";
    if (s.includes("ثان") || s.includes("ثانى") || s === "2") return "2";
    if (s.includes("صيف") || s === "3") return "3";
    return s;
  };

  const normalizeLvl = (lvl) => {
    if (lvl === null || lvl === undefined || lvl === "") return "";
    const s = String(lvl).trim();
    if (s.includes("اول") || s.includes("أول") || s === "1") return "1";
    if (s.includes("ثان") || s.includes("ثانى") || s === "2") return "2";
    if (s.includes("ثالث") || s === "3") return "3";
    if (s.includes("رابع") || s === "4") return "4";
    if (s.includes("خامس") || s === "5") return "5";
    return s;
  };

  const normalizeReq = (req) => {
    if (!req) return "";
    const s = String(req).trim().toLowerCase();
    if (s.includes("كلية") || s.includes("كليه") || s.includes("faculty") || s.includes("college")) return "faculty";
    if (s.includes("جامعة") || s.includes("جامعه") || s.includes("university") || s.includes("univ")) return "university";
    if (s.includes("تخصص") || s.includes("special") || s.includes("major") || s.includes("department") || s.includes("قسم")) return "specialty";
    return s;
  };

  const getMatchingSharedCourses = (baseCourseId, targetProgramIds, isBaseRow = false) => {
    const selected = courses.find(c => String(c.id) === String(baseCourseId));
    const facultyCourses = courses.filter(c => !selectedFaculty || String(c.faculty_id) === String(selectedFaculty));
    if (!selected) return facultyCourses;

    const baseReq = normalizeReq(selected.requirement);
    const baseLvl = normalizeLvl(selected.level);
    const baseSem = normalizeSem(selected.semester || selectedSemester);

    return facultyCourses.filter(c => {
      if (String(c.id) === String(selected.id)) {
        return isBaseRow;
      }

      // 1. مطابقة البرنامج (Program)
      let matchProg = true;
      if (targetProgramIds) {
        const pIds = Array.isArray(targetProgramIds) ? targetProgramIds : [targetProgramIds];
        const validPIds = pIds.filter(Boolean).map(String);
        if (validPIds.length > 0) {
          matchProg = validPIds.includes(String(c.program_id));
        }
      }

      // 2. مطابقة المتطلب (Requirement: كلية / جامعة / تخصص)
      const cReq = normalizeReq(c.requirement);
      const matchReq = !baseReq || !cReq || baseReq === cReq;

      // 3. مطابقة المستوى (Level: 1, 2, 3, 4)
      const cLvl = normalizeLvl(c.level);
      const matchLevel = !baseLvl || !cLvl || baseLvl === cLvl;

      // 4. مطابقة الفصل الدراسي (Semester: الأول / الثاني)
      const cSem = normalizeSem(c.semester);
      const matchSem = !baseSem || !cSem || baseSem === cSem;

      return matchProg && matchReq && matchLevel && matchSem;
    });
  };

  const getUniqueCourses = () => {
    const seen = new Set();
    const unique = [];
    const facultyCourses = courses.filter(c => !selectedFaculty || String(c.faculty_id) === String(selectedFaculty));

    // جمع كل المعرفات والأسماء والأكواد للمقررات الموجودة بالفعل في جدول الخطة الدراسية
    const addedCourseIds = new Set();
    const addedKeys = new Set();

    planRows.forEach(r => {
      if (r.course_id) addedCourseIds.add(String(r.course_id));
      if (r.base_course_id) addedCourseIds.add(String(r.base_course_id));

      const c = courses.find(x => String(x.id) === String(r.course_id) || String(x.id) === String(r.base_course_id));
      const arName = (c?.name_ar || r.nameAr || "").trim().toLowerCase();
      const enName = (c?.name_en || r.nameEn || "").trim().toLowerCase();
      const code = (c?.code || r.code || "").trim().toLowerCase();

      if (arName && code) addedKeys.add(`${arName}__${code}`);
      if (enName && code) addedKeys.add(`${enName}__${code}`);
      if (code) addedKeys.add(`code__${code}`);
      if (arName) addedKeys.add(`name__${arName}`);
    });

    // إضافة كافة المقررات المتكافئة للمقررات المضافة
    Array.from(addedCourseIds).forEach(id => {
      const eq = getEquivalentCourses(id);
      eq.forEach(ec => addedCourseIds.add(String(ec.id)));
    });

    // إذا كنا في وضع التعديل، نسمح بالمقرر الجاري تعديله حالياً
    const currentEditingIds = new Set();
    if (formData.base_course_id) {
      currentEditingIds.add(String(formData.base_course_id));
      const currentEq = getEquivalentCourses(formData.base_course_id);
      currentEq.forEach(ec => currentEditingIds.add(String(ec.id)));
    }

    for (let c of facultyCourses) {
      const cIdStr = String(c.id);
      const name = (c.name_ar || c.name_en || "").trim();
      const code = (c.code || "").trim();
      const arLower = (c.name_ar || "").trim().toLowerCase();
      const enLower = (c.name_en || "").trim().toLowerCase();
      const codeLower = code.toLowerCase();

      // التحقق مما إذا كان المقرر مضافاً بالفعل للجدول ولم يكن هو المقرر الجاري تعديله
      const isAlreadyAdded = (
        (addedCourseIds.has(cIdStr) ||
          (arLower && codeLower && addedKeys.has(`${arLower}__${codeLower}`)) ||
          (enLower && codeLower && addedKeys.has(`${enLower}__${codeLower}`)) ||
          (arLower && addedKeys.has(`name__${arLower}`)) ||
          (codeLower && addedKeys.has(`code__${codeLower}`))
        ) && !currentEditingIds.has(cIdStr)
      );

      if (isAlreadyAdded) {
        continue;
      }

      const key = `${name}__${code}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }
    return unique;
  };

  const handleBaseCourseChange = (e) => {
    const val = e.target.value;
    const selectedC = courses.find(c => String(c.id) === String(val));
    setFormData(prev => ({ ...prev, base_course_id: val }));

    if (selectedC) {
      setMultiPrograms([{
        id: Date.now(),
        is_base: true,
        program_id: selectedC.program_id || "",
        program_ids: selectedC.program_id ? [selectedC.program_id] : [],
        course_id: selectedC.id,
        course_ids: [selectedC.id]
      }]);
    } else {
      setMultiPrograms([]);
    }
  };

  const resetModal = () => {
    setFormData({
      base_course_id: "",
      student_count: 0, groups_theory: 0, groups_practical: 0, groups_activity: 0, groups_training: 0, groups_field: 0,
      notes: ""
    });
    setMultiPrograms([]);
    setMultiProfessors([{ id: Date.now(), professor_id: "", hours_actual_theory: 0, hours_actual_practical: 0, hours_actual_training: 0, hours_actual_field: 0, notes: "" }]);
    setEditingCourseId(null);
  };

  const openModal = () => {
    resetModal();
    setShowModal(true);
  };

  const handleFacultyChange = (e) => {
    const facId = e.target.value;
    setSelectedFaculty(facId);
  };

  const handleEditCourseBlock = (courseId) => {
    const courseRows = planRows.filter(r => String(r.base_course_id || r.course_id) === String(courseId));
    if (courseRows.length === 0) return;

    const first = courseRows[0];
    const courseObj = courses.find(c => String(c.id) === String(first.base_course_id || first.course_id));
    const baseId = courseObj ? courseObj.id : (first.base_course_id || first.course_id);

    setFormData({
      base_course_id: baseId,
      student_count: first.student_count || 0,
      groups_theory: first.groups_theory || 0,
      groups_practical: first.groups_practical || 0,
      groups_activity: first.groups_activity || 0,
      groups_training: first.groups_training || 0,
      groups_field: first.groups_field || 0,
      notes: first.course_notes || first.notes || ""
    });

    const collectedProgIds = Array.from(new Set(courseRows.flatMap(r => Array.isArray(r.program_ids) ? r.program_ids : [r.program_id]).filter(Boolean)));
    let effectiveProgIds = collectedProgIds;
    if (effectiveProgIds.length === 0 && courseObj) {
      const eqCourses = getEquivalentCourses(courseObj.id);
      effectiveProgIds = Array.from(new Set([
        courseObj.program_id,
        ...eqCourses.map(c => c.program_id)
      ].filter(Boolean)));
    }
    const profsList = [];
    courseRows.forEach(r => {
      if (r.professor_id) {
        profsList.push({
          id: Date.now() + Math.random(),
          module_id: r.module_id || "",
          department_name: r.department_name || "",
          professor_id: r.professor_id,
          hours_actual_theory: r.hours_actual_theory || 0,
          hours_actual_practical: r.hours_actual_practical || 0,
          hours_actual_training: r.hours_actual_training || 0,
          hours_actual_field: r.hours_actual_field || 0,
          notes: r.prof_notes || r.notes || ""
        });
      }
    });

    const restoredSharedData = first.shared_courses_data || [];
    const restoredSharedIds = first.shared_course_ids || [];
    const editMultiProgs = [{
      id: Date.now(),
      is_base: true,
      course_id: baseId,
      course_ids: [baseId],
      program_id: effectiveProgIds[0] || (courseObj?.program_id || ""),
      program_ids: effectiveProgIds.length > 0 ? effectiveProgIds : (courseObj?.program_id ? [courseObj.program_id] : []),
      groups_theory: first.groups_theory || 0,
      groups_practical: first.groups_practical || 0,
      groups_training: first.groups_training || 0,
      groups_field: first.groups_field || 0
    }];

    if (restoredSharedData.length > 0) {
      restoredSharedData.forEach((sc, scIdx) => {
        editMultiProgs.push({
          id: Date.now() + scIdx + 1,
          is_base: false,
          course_id: sc.id || sc.course_id,
          course_ids: [sc.id || sc.course_id],
          program_id: sc.program_id || (Array.isArray(sc.program_ids) ? sc.program_ids[0] : ""),
          program_ids: Array.isArray(sc.program_ids) ? sc.program_ids : (sc.program_id ? [sc.program_id] : []),
          groups_theory: sc.groups_theory !== undefined ? sc.groups_theory : (first.groups_theory || 0),
          groups_practical: sc.groups_practical !== undefined ? sc.groups_practical : (first.groups_practical || 0),
          groups_training: sc.groups_training !== undefined ? sc.groups_training : (first.groups_training || 0),
          groups_field: sc.groups_field !== undefined ? sc.groups_field : (first.groups_field || 0)
        });
      });
    } else if (restoredSharedIds.length > 0) {
      restoredSharedIds.forEach((scId, scIdx) => {
        const scObj = courses.find(x => String(x.id) === String(scId));
        if (scObj) {
          editMultiProgs.push({
            id: Date.now() + scIdx + 1,
            is_base: false,
            course_id: scObj.id,
            course_ids: [scObj.id],
            program_id: scObj.program_id || "",
            program_ids: scObj.program_id ? [scObj.program_id] : [],
            groups_theory: first.groups_theory || 0,
            groups_practical: first.groups_practical || 0,
            groups_training: first.groups_training || 0,
            groups_field: first.groups_field || 0
          });
        }
      });
    }

    setMultiPrograms(editMultiProgs);
    setMultiProfessors(profsList.length > 0 ? profsList : [{ id: Date.now(), module_id: first.module_id || "", professor_id: first.professor_id || "", hours_actual_theory: first.hours_actual_theory || 0, hours_actual_practical: first.hours_actual_practical || 0, hours_actual_training: first.hours_actual_training || 0, hours_actual_field: first.hours_actual_field || 0, notes: first.prof_notes || first.notes || "" }]);
    setEditingCourseId(courseId);
    setShowModal(true);
  };

  const handleDeleteCourse = async (courseId) => {
    const isConfirmed = await confirmAction("هل أنت متأكد من حذف هذا المقرر؟");
    if (isConfirmed) {
      setPlanRows(prev => prev.filter(x => String(x.base_course_id || x.course_id) !== String(courseId)));
      toast.success("تم حذف المقرر بنجاح!");
    }
  };

  const handleClearEntirePlan = async () => {
    const isConfirmed = await confirmAction("هل أنت متأكد من مسح الخطة بالكامل؟");
    if (isConfirmed) {
      setPlanRows([]);
      toast.success("تم مسح الخطة الدراسية بالكامل!");
    }
  };

  const [isCopyGlowActive, setIsCopyGlowActive] = useState(false);

  const handleOpenCopyModal = () => {
    if (!selectedFaculty) {
      toast.error("الرجاء اختيار الكلية أولاً");
      return;
    }
    setIsCopyGlowActive(true);
    const otherYears = (academicYears.length > 0 ? academicYears : YEARS).filter(y => y !== selectedYear);
    setSourceAcademicYear(otherYears.length > 0 ? otherYears[0] : selectedYear);
    setSourceSemester(selectedSemester);
    setTimeout(() => {
      setShowCopyPlanModal(true);
      setIsCopyGlowActive(false);
    }, 350);
  };

  const handleExecuteCopyPlan = async () => {
    if (!selectedFaculty || !sourceAcademicYear || !sourceSemester) {
      toast.error("يرجى اختيار العام الجامعي والفصل الدراسي للنسخ منه.");
      return;
    }

    if (sourceAcademicYear === selectedYear && sourceSemester === selectedSemester) {
      toast.error("لا يمكن النسخ من نفس العام الدراسي والفصل الحالي.");
      return;
    }

    setCopyingPlan(true);
    try {
      const res = await axios.get(`${API}/api/study-plans?faculty_id=${selectedFaculty}&semester=${encodeURIComponent(sourceSemester)}&academic_year=${encodeURIComponent(sourceAcademicYear)}`);
      const plans = res.data;
      if (!plans || plans.length === 0 || !plans[0].items || plans[0].items.length === 0) {
        toast.error(`لا توجد خطة دراسية مسجلة لعام (${sourceAcademicYear}) - (${sourceSemester}).`);
        setCopyingPlan(false);
        return;
      }

      let allRows = [];
      plans.forEach(plan => {
        if (plan.items) {
          plan.items.forEach(item => {
            allRows.push({
              _key: Date.now() + Math.random(),
              base_course_id: item.base_course_id || item.course_id,
              course_id: item.course_id,
              module_id: item.module_id,
              program_id: item.program_id,
              professor_id: item.professor_id,
              professor_name: item.professor ? (item.professor.name_ar || item.professor.name) : "",
              prof_job_title: item.professor?.job_title || "",
              prof_workplace: item.professor?.original_workplace || "",
              nameAr: item.course?.name_ar || "",
              nameEn: item.course?.name_en || "",
              code: item.course?.code || "",
              level: item.course?.level || "",
              student_count: item.student_count,
              groups_theory: item.groups_theory,
              groups_practical: item.groups_practical,
              groups_training: item.groups_exercise || 0,
              groups_field: item.groups_activity || 0,
              groups_activity: item.groups_activity || 0,
              hours_actual_theory: item.hours_actual_theory,
              hours_actual_practical: item.hours_actual_practical,
              hours_actual_training: item.hours_actual_exercise || 0,
              hours_actual_field: item.hours_actual_activity || 0,
              notes: item.notes,
              req_theory: item.required_hours_theory,
              req_practical: item.required_hours_practical,
              req_training: item.required_hours_exercise || 0,
              req_field: item.required_hours_activity || 0
            });
          });
        }
      });

      // Filter and deduplicate allRows
      const courseMap = {};
      allRows.forEach(r => {
        const cKey = `${r.base_course_id || r.course_id}`;
        if (!courseMap[cKey]) courseMap[cKey] = [];
        courseMap[cKey].push(r);
      });

      const cleanedRows = [];
      Object.values(courseMap).forEach(courseItems => {
        const assigned = courseItems.filter(x => x.professor_id || Number(x.hours_actual_theory) > 0 || Number(x.hours_actual_practical) > 0 || Number(x.hours_actual_training) > 0 || Number(x.hours_actual_field) > 0);
        const toUse = assigned.length > 0 ? assigned : (courseItems.length > 0 ? [courseItems[0]] : []);
        const seen = new Set();
        toUse.forEach(item => {
          const key = `${item.module_id || ''}_${item.professor_id || 'unassigned'}`;
          if (!seen.has(key)) {
            seen.add(key);
            cleanedRows.push(item);
          }
        });
      });

      setPlanRows(cleanedRows);
      setShowCopyPlanModal(false);
      toast.success(`تم نسخ الخطة الدراسية من عام (${sourceAcademicYear}) بنجاح! يمكنك الآن مراجعتها وتعديلها والضغط على حفظ.`);
    } catch (err) {
      console.error("Error copying plan:", err);
      toast.error("حدث خطأ أثناء محاولة نسخ الخطة الدراسية.");
    } finally {
      setCopyingPlan(false);
    }
  };

  const validateAndAddRow = () => {
    if (!formData.base_course_id) {
      const msg = "الرجاء اختيار المقرر أولاً.";
      setErrorMsg(msg);
      toast.error(msg);
      return false;
    }

    const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
    const isHealthTechFaculty = Boolean(activeFac && (activeFac.name.includes("تكنولوجيا العلوم الصحية") || activeFac.name.includes("العلوم الصحية")));
    const isMedicineFaculty = Boolean(activeFac && (activeFac.name.includes("الطب والجراحة") || activeFac.name.includes("طب بشري") || activeFac.name.includes("كلية الطب")) && !activeFac.name.includes("البيطري") && !activeFac.name.includes("الأسنان") && !activeFac.name.includes("الاسنان") && !activeFac.name.includes("تكنولوجيا"));
    const baseCourse = courses.find(c => String(c.id) === String(formData.base_course_id));

    // التحقق الديناميكي من ساعات عضو هيئة التدريس استناداً إلى قواعد الكلية والحد الأقصى لليوم وأيام الانتداب
    const limitFacultyDay = (workloadLimits && Number(workloadLimits.max_faculty_hours_per_day) > 0) ? Number(workloadLimits.max_faculty_hours_per_day) : 6;
    const limitAssistantDay = (workloadLimits && Number(workloadLimits.max_assistant_hours_per_day) > 0) ? Number(workloadLimits.max_assistant_hours_per_day) : 8;
    const limitTheoryDay = (workloadLimits && Number(workloadLimits.max_theory_hours_per_day) > 0) ? Number(workloadLimits.max_theory_hours_per_day) : limitFacultyDay;
    const limitPracticalDay = (workloadLimits && Number(workloadLimits.max_practical_hours_per_day) > 0) ? Number(workloadLimits.max_practical_hours_per_day) : limitAssistantDay;

    const profsHoursMap = {};
    multiProfessors.forEach(p => {
      if (p.professor_id) {
        if (!profsHoursMap[p.professor_id]) profsHoursMap[p.professor_id] = { th: 0, pr: 0, tr: 0, fld: 0 };
        profsHoursMap[p.professor_id].th += (Number(p.hours_actual_theory) || 0);
        profsHoursMap[p.professor_id].pr += (Number(p.hours_actual_practical) || 0);
        profsHoursMap[p.professor_id].tr += (Number(p.hours_actual_training) || 0);
        profsHoursMap[p.professor_id].fld += (Number(p.hours_actual_field) || 0);
      }
    });

    const targetCourseId = editingCourseId || formData.base_course_id;

    for (const [profId, h] of Object.entries(profsHoursMap)) {
      const profObj = professors.find(p => String(p.id) === String(profId));
      const profName = profObj ? (profObj.name_ar || profObj.name) : "عضو هيئة التدريس";
      const isTA = isTeachingAssistant(profObj);
      const workDays = getProfessorWorkDays(profObj);

      // ساعات الأستاذ المسجلة في مقررات أخرى بالخطة (باستثناء المقرر الحالي قيد التعديل/الإضافة)
      const otherCoursesH = planRows
        .filter(r => String(r.base_course_id || r.course_id) !== String(targetCourseId) && String(r.professor_id) === String(profId))
        .reduce((acc, r) => ({
          th: acc.th + (Number(r.hours_actual_theory) || 0),
          pr: acc.pr + (Number(r.hours_actual_practical) || 0),
          tr: acc.tr + (Number(r.hours_actual_training) || 0),
          fld: acc.fld + (Number(r.hours_actual_field) || 0),
          tot: acc.tot + (Number(r.hours_actual_theory) || 0) + (Number(r.hours_actual_practical) || 0) + (Number(r.hours_actual_training) || 0) + (Number(r.hours_actual_field) || 0)
        }), { th: 0, pr: 0, tr: 0, fld: 0, tot: 0 });

      const totalTheory = otherCoursesH.th + h.th;
      const totalPractical = otherCoursesH.pr + h.pr;
      const totalTraining = otherCoursesH.tr + h.tr;
      const totalField = otherCoursesH.fld + h.fld;
      const totalNonTheory = totalPractical + totalTraining + totalField;

      // أ) التحقق الخاص بالهيئة المعاونة (معيد / مدرس مساعد)
      if (isTA) {
        if (h.th > 0 || totalTheory > 0) {
          const msg = `⚠️ تنبيه: المعيد والمدرس المساعد (${profName}) لا يمكنهم تدريس ساعات نظري (مسموح فقط بالساعات العملية والتوتوريال والحقل).`;
          setErrorMsg(msg);
          toast.error(msg);
          return false;
        }

        const maxPracticalAllowed = limitAssistantDay * workDays;
        if (totalNonTheory > maxPracticalAllowed) {
          const msg = `⚠️ تنبيه: مجموع ساعات العملي والتوتوريال والحقل للأستاذ (${profName}) سيصل إلى (${fmt(totalNonTheory)} ساعة)، والحد الأقصى المسموح به هو (${maxPracticalAllowed} ساعة = ${workDays} أيام انتداب × ${limitAssistantDay} ساعات)${otherCoursesH.tot > 0 ? ` [مسجل له ${fmt(otherCoursesH.tot)} س بمقررات أخرى]` : ""}.`;
          setErrorMsg(msg);
          toast.error(msg);
          return false;
        }
      } else {
        // ب) التحقق الخاص بأعضاء هيئة التدريس (أستاذ / أستاذ مساعد / مدرس)
        // المعادلة: مجموع الساعات النظري + (مجموع الساعات العملي والتوتوريال والحقل / 2) <= الحد الأقصى اليومي * عدد أيام الانتداب
        const calculatedLoad = totalTheory + (totalNonTheory / 2);
        const maxFacultyAllowed = limitFacultyDay * workDays;

        if (calculatedLoad > maxFacultyAllowed) {
          const msg = `⚠️ تنبيه: العبء التدريسي المحتسب للأستاذ (${profName}) [نظري (${fmt(totalTheory)}) + نصف العملي (${fmt(totalNonTheory / 2)})] سيصل إلى (${fmt(calculatedLoad)} ساعة)، والحد الأقصى المسموح به هو (${maxFacultyAllowed} ساعة = ${workDays} أيام انتداب × ${limitFacultyDay} ساعات)${otherCoursesH.tot > 0 ? ` [مسجل له ${fmt(otherCoursesH.tot)} س بمقررات أخرى]` : ""}.`;
          setErrorMsg(msg);
          toast.error(msg);
          return false;
        }

        if (totalTheory > limitTheoryDay) {
          const msg = `⚠️ تنبيه: إجمالي ساعات النظري للأستاذ (${profName}) سيصل إلى (${fmt(totalTheory)} ساعة)، وتتجاوز الحد الأقصى لساعات النظري باليوم (${limitTheoryDay} ساعات).`;
          setErrorMsg(msg);
          toast.error(msg);
          return false;
        }
      }
    }

    const hasAssignedProfs = multiProfessors.some(p => p.professor_id);

    if (hasAssignedProfs) {
      if (isMedicineFaculty && baseCourse?.modules && baseCourse.modules.length > 0) {
        // التحقق لكل قسم علمي في كلية الطب والجراحة
        for (let mod of baseCourse.modules) {
          const modProfs = multiProfessors.filter(p => String(p.module_id) === String(mod.id) && p.professor_id);
          if (modProfs.length > 0) {
            const modReqTh = (Number(mod.theory_hours) || 0) * (Number(formData.groups_theory) || 0);
            const modReqPr = (Number(mod.practical_hours) || 0) * (Number(formData.groups_practical) || 0);
            const modActTh = modProfs.reduce((s, p) => s + (Number(p.hours_actual_theory) || 0), 0);
            const modActPr = modProfs.reduce((s, p) => s + (Number(p.hours_actual_practical) || 0), 0);

            if (Math.abs(modActTh - modReqTh) > 0.01) {
              const msg = `مجموع الساعات المنفذة نظري لقسم (${mod.department_name}) هو (${modActTh} ساعة) ويجب أن يساوي المطلوبة (${modReqTh} ساعة).`;
              setErrorMsg(msg);
              toast.error(msg);
              return false;
            }
            if (Math.abs(modActPr - modReqPr) > 0.01) {
              const msg = `مجموع الساعات المنفذة عملي لقسم (${mod.department_name}) هو (${modActPr} ساعة) ويجب أن يساوي المطلوبة (${modReqPr} ساعة).`;
              setErrorMsg(msg);
              toast.error(msg);
              return false;
            }
          }
        }
      } else {
        // الكليات العادية: احتساب إجمالي الساعات المطلوبة للمقرر الأساسي والمقررات المشتركة
        let reqTheory = (Number(baseCourse?.theory_hours) || 0) * (Number(formData.groups_theory) || 0);
        let reqPractical = (Number(baseCourse?.practical_hours) || 0) * (Number(formData.groups_practical) || 0);
        let reqTraining = (Number(baseCourse?.exercise_hours) || 0) * (Number(formData.groups_training) || 0);
        let reqField = (Number(baseCourse?.activity_hours) || 0) * (Number(formData.groups_field) || 0);

        const seenDistinctIds = new Set();
        if (baseCourse?.id) seenDistinctIds.add(String(baseCourse.id));

        if (Array.isArray(multiPrograms)) {
          multiPrograms.forEach(p => {
            const cIds = Array.isArray(p.course_ids) ? p.course_ids : (p.course_id ? [p.course_id] : []);
            cIds.forEach(cid => {
              if (cid && !seenDistinctIds.has(String(cid))) {
                seenDistinctIds.add(String(cid));
                const scObj = courses.find(x => String(x.id) === String(cid));
                if (scObj) {
                  const scGrTh = p.groups_theory !== undefined && p.groups_theory !== null ? Number(p.groups_theory) : (Number(formData.groups_theory) || 0);
                  const scGrPr = p.groups_practical !== undefined && p.groups_practical !== null ? Number(p.groups_practical) : (Number(formData.groups_practical) || 0);
                  const scGrTr = p.groups_training !== undefined && p.groups_training !== null ? Number(p.groups_training) : (Number(formData.groups_training) || 0);
                  const scGrFld = p.groups_field !== undefined && p.groups_field !== null ? Number(p.groups_field) : (Number(formData.groups_field) || 0);

                  reqTheory += (Number(scObj.theory_hours) || 0) * scGrTh;
                  reqPractical += (Number(scObj.practical_hours) || 0) * scGrPr;
                  reqTraining += (Number(scObj.exercise_hours) || 0) * scGrTr;
                  reqField += (Number(scObj.activity_hours) || 0) * scGrFld;
                }
              }
            });
          });
        }

        const totalActualTheory = multiProfessors.reduce((sum, p) => sum + (Number(p.hours_actual_theory) || 0), 0);
        const totalActualPractical = multiProfessors.reduce((sum, p) => sum + (Number(p.hours_actual_practical) || 0), 0);
        const totalActualTraining = multiProfessors.reduce((sum, p) => sum + (Number(p.hours_actual_training) || 0), 0);
        const totalActualField = multiProfessors.reduce((sum, p) => sum + (Number(p.hours_actual_field) || 0), 0);

        if (Math.abs(totalActualTheory - reqTheory) > 0.01 || Math.abs(totalActualPractical - reqPractical) > 0.01 || Math.abs(totalActualTraining - reqTraining) > 0.01 || Math.abs(totalActualField - reqField) > 0.01) {
          const msg = `مجموع الساعات المنفذة لا يطابق الساعات المطلوبةباللائحة والمجموعات!`;
          setErrorMsg(msg);
          toast.error(msg);
          return false;
        }
      }
    }

    const baseCourseObj = courses.find(c => String(c.id) === String(formData.base_course_id));
    const baseProgId = baseCourseObj?.program_id;

    const additionalProgIds = [];
    const sharedCourseIds = [];
    const sharedCoursesData = [];

    multiPrograms.forEach((p, pIdx) => {
      if (p.program_id) additionalProgIds.push(p.program_id);
      if (Array.isArray(p.program_ids)) additionalProgIds.push(...p.program_ids);

      const cIds = Array.isArray(p.course_ids) ? p.course_ids : (p.course_id ? [p.course_id] : []);
      cIds.forEach(cid => {
        const cObj = courses.find(x => String(x.id) === String(cid));
        if (cObj?.program_id) additionalProgIds.push(cObj.program_id);
        if (cid && String(cid) !== String(formData.base_course_id)) {
          sharedCourseIds.push(cid);
          if (cObj) {
            sharedCoursesData.push({
              id: cObj.id,
              course_id: cObj.id,
              name_ar: cObj.name_ar,
              name_en: cObj.name_en,
              code: cObj.code,
              theory_hours: cObj.theory_hours ?? 0,
              practical_hours: cObj.practical_hours ?? 0,
              exercise_hours: cObj.exercise_hours ?? 0,
              activity_hours: cObj.activity_hours ?? 0,
              credit_hours: cObj.credit_hours ?? 0,
              program_id: cObj.program_id || p.program_id,
              program_ids: p.program_ids || (p.program_id ? [p.program_id] : []),
              groups_theory: p.groups_theory !== undefined && p.groups_theory !== null ? Number(p.groups_theory) : Number(formData.groups_theory || 0),
              groups_practical: p.groups_practical !== undefined && p.groups_practical !== null ? Number(p.groups_practical) : Number(formData.groups_practical || 0),
              groups_training: p.groups_training !== undefined && p.groups_training !== null ? Number(p.groups_training) : Number(formData.groups_training || 0),
              groups_field: p.groups_field !== undefined && p.groups_field !== null ? Number(p.groups_field) : Number(formData.groups_field || 0)
            });
          }
        }
      });
    });

    const allCombinedProgIds = Array.from(new Set([
      baseProgId,
      ...additionalProgIds
    ].filter(Boolean)));
    const primaryProgramId = baseProgId || allCombinedProgIds[0] || "";

    const newRows = [];
    const profsToIterate = hasAssignedProfs ? multiProfessors.filter(p => p.professor_id) : [{ professor_id: null, hours_actual_theory: 0, hours_actual_practical: 0, hours_actual_training: 0, hours_actual_field: 0, notes: "" }];

    profsToIterate.forEach(prof => {
      const profObj = professors.find(p => String(p.id) === String(prof.professor_id));
      const modObj = baseCourse?.modules?.find(m => String(m.id) === String(prof.module_id));

      const cReqTheory = modObj ? (Number(modObj.theory_hours) || 0) * (Number(formData.groups_theory) || 0) : (Number(baseCourse?.theory_hours) || 0) * (Number(formData.groups_theory) || 0);
      const cReqPractical = modObj ? (Number(modObj.practical_hours) || 0) * (Number(formData.groups_practical) || 0) : (Number(baseCourse?.practical_hours) || 0) * (Number(formData.groups_practical) || 0);
      const cReqTraining = (Number(baseCourse?.exercise_hours) || 0) * (Number(formData.groups_training) || 0);
      const cReqField = (Number(baseCourse?.activity_hours) || 0) * (Number(formData.groups_field) || 0);

      newRows.push({
        base_course_id: formData.base_course_id,
        course_id: formData.base_course_id,
        module_id: prof.module_id || null,
        program_id: primaryProgramId,
        program_ids: allCombinedProgIds.length > 0 ? allCombinedProgIds : (baseProgId ? [baseProgId] : []),
        shared_course_ids: Array.from(new Set(sharedCourseIds)),
        shared_courses_data: sharedCoursesData,
        professor_id: prof.professor_id || null,
        professor_name: profObj ? (profObj.name_ar || profObj.name) : "",
        prof_job_title: profObj?.job_title || "",
        prof_workplace: profObj?.original_workplace || "",
        department_name: modObj?.department_name || baseCourse?.department_name || "",
        nameAr: baseCourse?.name_ar || "",
        nameEn: baseCourse?.name_en || "",
        code: baseCourse?.code || "",
        level: baseCourse?.level || "",
        student_count: Number(formData.student_count) || 0,
        groups_theory: Number(formData.groups_theory) || 0,
        groups_practical: Number(formData.groups_practical) || 0,
        groups_training: Number(formData.groups_training) || 0,
        groups_field: Number(formData.groups_field) || 0,
        groups_activity: Number(formData.groups_activity) || 0,
        hours_actual_theory: Number(prof.hours_actual_theory) || 0,
        hours_actual_practical: Number(prof.hours_actual_practical) || 0,
        hours_actual_training: Number(prof.hours_actual_training) || 0,
        hours_actual_field: Number(prof.hours_actual_field) || 0,
        notes: prof.notes || "",
        prof_notes: prof.notes || "",
        course_notes: formData.notes || "",
        _key: Date.now() + Math.random(),
        req_theory: cReqTheory,
        req_practical: cReqPractical,
        req_training: cReqTraining,
        req_field: cReqField,
      });
    });

    if (newRows.length === 0) {
      setErrorMsg("حدث خطأ أثناء إعداد بيانات المقرر.");
      return false;
    }

    let updatedRows = [];
    if (editingCourseId) {
      updatedRows = [...planRows.filter(r => String(r.base_course_id || r.course_id) !== String(editingCourseId)), ...newRows];
      setPlanRows(updatedRows);
      toast.success("تم تعديل المقرر بالجدول بنجاح!");
    } else {
      updatedRows = [...planRows, ...newRows];
      setPlanRows(updatedRows);
      toast.success("تمت إضافة المقرر إلى الخطة بنجاح!");
    }

    setEditingCourseId(null);
    setErrorMsg("");
    setShowModal(false);

    if (existingPlanIds && existingPlanIds.length > 0) {
      saveToDatabase(updatedRows);
    }

    return true;
  };

  const handleSaveAndAddAnother = () => {
    const success = validateAndAddRow();
    if (success) {
      resetModal();
      setShowModal(true);
    }
  };

  const [activeWorkflowAction, setActiveWorkflowAction] = useState("");

  const handleWorkflowAction = async (action, actionName) => {
    if (!selectedFaculty) return;
    setActiveWorkflowAction(action);
    setTimeout(() => {
      setActiveWorkflowAction("");
    }, 600);
    try {
      const payload = {
        faculty_id: Number(selectedFaculty),
        semester: selectedSemester,
        academic_year: selectedYear,
        action: action
      };
      await axios.post(`${API}/api/study-plans/status`, payload);
      toast.success(`تم تنفيذ إجراء (${actionName}) بنجاح!`);
      fetchFacultyDataAndPlan(selectedFaculty, selectedSemester, selectedYear, false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء تنفيذ الإجراء.");
    }
  };

  const saveToDatabase = async (rowsToSave = null) => {
    if (!selectedFaculty) return;
    const targetRows = (Array.isArray(rowsToSave) && rowsToSave.length > 0) ? rowsToSave : planRows;
    if (!targetRows || targetRows.length === 0) {
      toast.warning("الجدول فارغ.");
      return;
    }

    setSaving(true);
    try {
      for (let pid of existingPlanIds) {
        await axios.delete(`${API}/api/study-plans/${pid}`);
      }

      const payload = {
        faculty_id: selectedFaculty,
        semester: selectedSemester,
        academic_year: selectedYear,
        total_theory_hours: targetRows.reduce((sum, r) => sum + (Number(r.req_theory) || 0), 0),
        total_practical_hours: targetRows.reduce((sum, r) => sum + (Number(r.req_practical) || 0), 0),
        items: targetRows.map(r => {
          const progIds = Array.isArray(r.program_ids) && r.program_ids.length > 0
            ? r.program_ids
            : (r.program_id ? [r.program_id] : []);
          const entryJson = JSON.stringify({
            prog_ids: progIds,
            shared_courses: r.shared_courses_data || (r.shared_course_ids ? r.shared_course_ids.map(cid => ({ id: cid, course_id: cid })) : [])
          });
          return {
            base_course_id: r.base_course_id || r.course_id,
            course_id: r.course_id || r.base_course_id,
            module_id: r.module_id || null,
            program_id: progIds[0] || r.program_id,
            entry_group_id: entryJson,
            professor_id: r.professor_id || null,
            student_count: Number(r.student_count) || 0,
            groups_theory: Number(r.groups_theory) || 0,
            groups_practical: Number(r.groups_practical) || 0,
            groups_exercise: Number(r.groups_training) || 0,
            groups_activity: Number(r.groups_field || r.groups_activity) || 0,
            hours_actual_theory: Number(r.hours_actual_theory) || 0,
            hours_actual_practical: Number(r.hours_actual_practical) || 0,
            hours_actual_exercise: Number(r.hours_actual_training) || 0,
            hours_actual_activity: Number(r.hours_actual_field) || 0,
            notes: r.prof_notes || r.notes || "",
            course_notes: r.course_notes || "",
          };
        })
      };

      await axios.post(`${API}/api/study-plans`, payload);
      toast.success("تم حفظ الخطة الدراسية بنجاح في قاعدة البيانات!");
      fetchFacultyDataAndPlan(selectedFaculty, selectedSemester, selectedYear, false);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء الحفظ في قاعدة البيانات");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n) => (n && !isNaN(n) ? parseFloat(parseFloat(n).toFixed(2)).toString() : "0");

  const formatCourseNameInline = (nameAr, nameEn) => {
    const validAr = nameAr && nameAr !== "-" && nameAr !== "--";
    const validEn = nameEn && nameEn !== "-" && nameEn !== "--";
    if (validAr && validEn && nameAr.trim().toLowerCase() !== nameEn.trim().toLowerCase()) {
      return `${nameAr.trim()} (${nameEn.trim()})`;
    }
    return validAr ? nameAr.trim() : (validEn ? nameEn.trim() : "--");
  };


  // Helper to build rows for Table 1 with exact rowSpan merging for courses and medicine modules
    const buildRenderRows = () => {
    const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
    const isMedicineFaculty = Boolean(activeFac && (activeFac.name.includes("الطب والجراحة") || activeFac.name.includes("طب بشري") || activeFac.name.includes("كلية الطب")) && !activeFac.name.includes("البيطري") && !activeFac.name.includes("الأسنان") && !activeFac.name.includes("الاسنان") && !activeFac.name.includes("تكنولوجيا"));

    const rows = [];
    const courseGroups = {};

    planRows.forEach(r => {
      const groupKey = `${r.base_course_id || r.course_id}`;
      if (!courseGroups[groupKey]) {
        courseGroups[groupKey] = [];
      }
      courseGroups[groupKey].push(r);
    });

    let serial = 1;
    Object.values(courseGroups).forEach(rawGroupItems => {
      const firstRaw = rawGroupItems[0] || {};
      const cObj = courses.find(x => String(x.id) === String(firstRaw.base_course_id || firstRaw.course_id)) || {};

      // Filter out empty placeholder rows if there are assigned professors
      const assignedItems = rawGroupItems.filter(item => item.professor_id || Number(item.hours_actual_theory) > 0 || Number(item.hours_actual_practical) > 0 || Number(item.hours_actual_training) > 0 || Number(item.hours_actual_field) > 0);
      
      // Deduplicate professor assignments under the course block to eliminate duplicate/empty ghost rows
      const profSeen = new Set();
      const distinctAssignedItems = [];
      assignedItems.forEach(item => {
        const profKey = `${item.professor_id || 'unassigned'}_${item.module_id || ''}_${item.department_name || ''}`;
        if (!profSeen.has(profKey)) {
          profSeen.add(profKey);
          distinctAssignedItems.push(item);
        }
      });
      const itemsToProcess = distinctAssignedItems.length > 0 ? distinctAssignedItems : (rawGroupItems.length > 0 ? [rawGroupItems[0]] : []);

      const groupItems = itemsToProcess.map(item => {
        const activeMod = cObj.modules?.find(m => String(m.id) === String(item.module_id))
          || cObj.modules?.find(m => m.department_name && item.department_name && m.department_name.trim() === item.department_name.trim());
        const deptName = item.department_name || activeMod?.department_name || (cObj.modules && cObj.modules.length > 0 ? cObj.modules[0]?.department_name : "") || "";

        const modTh = activeMod ? Number(activeMod.theory_hours) || 0 : (Number(cObj.theory_hours) || 0);
        const modPr = activeMod ? Number(activeMod.practical_hours) || 0 : (Number(cObj.practical_hours) || 0);
        const modAct = activeMod ? (Number(activeMod.activity_hours || activeMod.exercise_hours) || 0) : (Number(cObj.activity_hours) || 0);

        const modReqTh = modTh * (Number(item.groups_theory) || 0);
        const modReqPr = modPr * (Number(item.groups_practical) || 0);
        const modReqAct = modAct * (Number(item.groups_activity) || 0);

        return {
          ...item,
          module_id: activeMod?.id || item.module_id || "",
          department_name: deptName,
          mod_theory_hours: modTh,
          mod_practical_hours: modPr,
          mod_activity_hours: modAct,
          mod_req_theory: modReqTh,
          mod_req_practical: modReqPr,
          mod_req_activity: modReqAct
        };
      });

      // Group by module for medicine
      const moduleGroups = {};
      groupItems.forEach(item => {
        const modKey = (item.department_name && item.department_name.trim()) || (item.module_id ? String(item.module_id) : 'default');
        if (!moduleGroups[modKey]) {
          moduleGroups[modKey] = [];
        }
        moduleGroups[modKey].push(item);
      });

      const hasMultipleModules = Boolean(cObj.modules && cObj.modules.length > 1);
      const isMedCourseWithModules = Boolean(isMedicineFaculty && hasMultipleModules);

      let courseSpan = 0;
      if (isMedCourseWithModules) {
        let modRowsCount = 0;
        Object.values(moduleGroups).forEach(modItems => {
          modRowsCount += (modItems.length + 1); // professor rows + 1 summary row per module
        });
        courseSpan = modRowsCount + 1; // + 1 for top course total row
      } else {
        courseSpan = groupItems.length;
      }

      // Top course total row for multi-module courses
      if (isMedCourseWithModules) {
        const firstItem = groupItems[0] || {};
        const totBylawTh = cObj.modules.reduce((s, m) => s + (Number(m.theory_hours) || 0), 0) || Number(cObj.theory_hours) || 0;
        const totBylawPr = cObj.modules.reduce((s, m) => s + (Number(m.practical_hours) || 0), 0) || Number(cObj.practical_hours) || 0;
        const totBylawAct = cObj.modules.reduce((s, m) => s + (Number(m.activity_hours || m.exercise_hours) || 0), 0) || Number(cObj.activity_hours) || 0;

        const grpTh = Number(firstItem.groups_theory) || 0;
        const grpPr = Number(firstItem.groups_practical) || 0;
        const grpAct = Number(firstItem.groups_activity) || 0;

        const totReqTh = totBylawTh * grpTh;
        const totReqPr = totBylawPr * grpPr;
        const totReqAct = totBylawAct * grpAct;

        const totActualTh = groupItems.reduce((s, x) => s + (Number(x.hours_actual_theory) || 0), 0);
        const totActualPr = groupItems.reduce((s, x) => s + (Number(x.hours_actual_practical) || 0), 0);

        rows.push({
          ...firstItem,
          serial: serial,
          isCourseTotalRow: true,
          isFirstInCourse: true,
          courseSpan: courseSpan,
          isFirstInModule: false,
          moduleSpan: 1,
          isModuleSummary: false,
          notes: firstItem.course_notes || firstItem.notes || "",
          course_notes: firstItem.course_notes || firstItem.notes || "",
          totBylawTh,
          totBylawPr,
          totBylawAct,
          totReqTh,
          totReqPr,
          totReqAct,
          totActualTh,
          totActualPr,
          hasMultipleModules: true,
        });
      }

      const collectedCourseProgIds = Array.from(new Set(
        rawGroupItems.flatMap(r => Array.isArray(r.program_ids) ? r.program_ids : [r.program_id]).filter(Boolean)
      ));
      const collectedSharedCourseIds = Array.from(new Set(
        rawGroupItems.flatMap(r => Array.isArray(r.shared_course_ids) ? r.shared_course_ids : []).filter(Boolean)
      ));
      const collectedSharedCoursesData = rawGroupItems.find(r => Array.isArray(r.shared_courses_data) && r.shared_courses_data.length > 0)?.shared_courses_data || [];

      let isFirstInCourse = !isMedCourseWithModules;
      Object.values(moduleGroups).forEach(modItems => {
        const moduleSpan = isMedCourseWithModules ? (modItems.length + 1) : modItems.length;
        modItems.forEach((item, modIdx) => {
          rows.push({
            ...item,
            program_ids: (item.program_ids && item.program_ids.length > 0) ? item.program_ids : collectedCourseProgIds,
            shared_course_ids: (item.shared_course_ids && item.shared_course_ids.length > 0) ? item.shared_course_ids : collectedSharedCourseIds,
            shared_courses_data: (item.shared_courses_data && item.shared_courses_data.length > 0) ? item.shared_courses_data : collectedSharedCoursesData,
            serial: serial,
            isCourseTotalRow: false,
            isFirstInCourse: isFirstInCourse && modIdx === 0,
            courseSpan: courseSpan,
            isFirstInModule: modIdx === 0,
            moduleSpan: moduleSpan,
            isModuleSummary: false,
            notes: (isMedCourseWithModules ? firstRaw.course_notes : item.course_notes) || firstRaw.course_notes || item.notes || "",
            course_notes: (isMedCourseWithModules ? firstRaw.course_notes : item.course_notes) || firstRaw.course_notes || item.notes || "",
            prof_notes: item.prof_notes || item.notes || "",
            hasMultipleModules: isMedCourseWithModules,
          });
        });
        isFirstInCourse = false;

        if (isMedCourseWithModules) {
          const firstModItem = modItems[0] || {};
          const deptActualTh = modItems.reduce((s, x) => s + (Number(x.hours_actual_theory) || 0), 0);
          const deptActualPr = modItems.reduce((s, x) => s + (Number(x.hours_actual_practical) || 0), 0);

          rows.push({
            ...firstModItem,
            serial: serial,
            isCourseTotalRow: false,
            isFirstInCourse: false,
            courseSpan: courseSpan,
            isFirstInModule: false,
            moduleSpan: moduleSpan,
            isModuleSummary: true,
            deptActualTh,
            deptActualPr,
            professor_id: null,
            professor_name: "",
            hours_actual_theory: deptActualTh,
            hours_actual_practical: deptActualPr,
            hasMultipleModules: true,
          });
        }
      });

      serial++;
    });

    return rows;
  };

  const renderRows = buildRenderRows();

  const getProgramDisplayList = (programId, courseId, row) => {
    const names = [];

    // 1. From program_ids array
    if (row?.program_ids && Array.isArray(row.program_ids) && row.program_ids.length > 0) {
      row.program_ids.forEach(id => {
        const p = programs.find(x => String(x.id) === String(id));
        if (p && p.name && !names.includes(p.name)) {
          names.push(p.name);
        }
      });
    }

    // 2. From shared_courses_data
    if (row?.shared_courses_data && Array.isArray(row.shared_courses_data)) {
      row.shared_courses_data.forEach(sc => {
        const scPids = Array.isArray(sc.program_ids) ? sc.program_ids : (sc.program_id ? [sc.program_id] : []);
        scPids.forEach(id => {
          const p = programs.find(x => String(x.id) === String(id));
          if (p && p.name && !names.includes(p.name)) {
            names.push(p.name);
          }
        });
      });
    }

    // 3. From entry_group_id
    if (row?.entry_group_id) {
      const rawEntry = String(row.entry_group_id).trim();
      if (rawEntry.startsWith("{")) {
        try {
          const parsed = JSON.parse(rawEntry);
          (parsed.prog_ids || []).forEach(id => {
            const p = programs.find(x => String(x.id) === String(id));
            if (p && p.name && !names.includes(p.name)) {
              names.push(p.name);
            }
          });
        } catch (e) { }
      } else if (rawEntry.includes(",")) {
        rawEntry.split(",").forEach(id => {
          const p = programs.find(x => String(x.id) === String(id.trim()));
          if (p && p.name && !names.includes(p.name)) {
            names.push(p.name);
          }
        });
      }
    }

    // 4. From equivalent courses in the faculty database
    const targetCourseId = row?.base_course_id || courseId || row?.course_id;
    if (targetCourseId) {
      const baseC = courses.find(x => String(x.id) === String(targetCourseId));
      if (baseC) {
        if (baseC.program_id) {
          const p = programs.find(x => String(x.id) === String(baseC.program_id));
          if (p && p.name && !names.includes(p.name)) {
            names.push(p.name);
          }
        }
        const eqCourses = getEquivalentCourses(baseC.id);
        eqCourses.forEach(c => {
          if (c.program_id) {
            const p = programs.find(x => String(x.id) === String(c.program_id));
            if (p && p.name && !names.includes(p.name)) {
              names.push(p.name);
            }
          }
        });
      }
    }

    // 5. From row.program_name if string contains multiple
    if (row?.program_name) {
      const parts = row.program_name.includes(" - ")
        ? row.program_name.split(" - ")
        : (row.program_name.includes("\n") ? row.program_name.split("\n") : [row.program_name]);
      parts.map(s => s.trim()).filter(Boolean).forEach(pn => {
        if (!names.includes(pn)) names.push(pn);
      });
    }

    // 6. Direct program_id
    if (programId) {
      const p = programs.find(x => String(x.id) === String(programId));
      if (p && p.name && !names.includes(p.name)) {
        names.push(p.name);
      }
    }

    if (names.length > 0) return names;
    if (programs && programs.length === 1 && programs[0]?.name) {
      return [programs[0].name];
    }
    return ["المستوى العام"];
  };

  const getProgramDisplayName = (programId, courseId, row) => {
    const list = getProgramDisplayList(programId, courseId, row);
    return list.join("\n");
  };

  const getCourseBlockInfo = (row) => {
    const targetCourseId = row.base_course_id || row.course_id;
    const cObj = courses.find(c => String(c.id) === String(targetCourseId)) || courses.find(c => String(c.id) === String(row.course_id)) || {};

    const primaryAr = (cObj.name_ar || row.nameAr || "").trim();
    const primaryEn = (cObj.name_en || row.nameEn || "").trim();
    const primaryCode = (cObj.code || row.code || "").trim();

    const primaryBylawTh = cObj.theory_hours ?? row.theory_hours ?? 0;
    const primaryBylawPr = cObj.practical_hours ?? row.practical_hours ?? 0;
    const primaryBylawTr = cObj.exercise_hours ?? row.exercise_hours ?? 0;
    const primaryBylawFld = cObj.activity_hours ?? row.activity_hours ?? 0;

    const primaryGrpTh = Number(row.groups_theory) || 0;
    const primaryGrpPr = Number(row.groups_practical) || 0;
    const primaryGrpTr = Number(row.groups_training) || 0;
    const primaryGrpFld = Number(row.groups_field) || 0;

    const primaryReqTh = (Number(primaryBylawTh) || 0) * primaryGrpTh;
    const primaryReqPr = (Number(primaryBylawPr) || 0) * primaryGrpPr;
    const primaryReqTr = (Number(primaryBylawTr) || 0) * primaryGrpTr;
    const primaryReqFld = (Number(primaryBylawFld) || 0) * primaryGrpFld;

    const secondaryList = [];
    const primaryKey = `${primaryAr.toLowerCase()}__${primaryCode.toLowerCase()}`;

    const primaryProgIds = new Set();
    if (cObj.program_id) primaryProgIds.add(String(cObj.program_id));
    if (row.program_id) primaryProgIds.add(String(row.program_id));

    // 1. From shared_courses_data
    if (Array.isArray(row.shared_courses_data) && row.shared_courses_data.length > 0) {
      row.shared_courses_data.forEach(sc => {
        const scAr = (sc.name_ar || "").trim();
        const scEn = (sc.name_en || "").trim();
        const scCode = (sc.code || "").trim();
        const scKey = `${scAr.toLowerCase()}__${scCode.toLowerCase()}`;

        const scPids = Array.isArray(sc.program_ids) ? sc.program_ids : (sc.program_id ? [sc.program_id] : []);

        const isNameDiff = Boolean(scAr && primaryAr && scAr.toLowerCase() !== primaryAr.toLowerCase());
        const isCodeDiff = Boolean(scCode && primaryCode && scCode.toLowerCase() !== primaryCode.toLowerCase());
        const isHoursDiff = Boolean(Number(sc.theory_hours ?? 0) !== Number(primaryBylawTh) || Number(sc.practical_hours ?? 0) !== Number(primaryBylawPr));

        if (isNameDiff || isCodeDiff || isHoursDiff) {
          const existingSec = secondaryList.find(x => x.key === scKey);
          if (existingSec) {
            scPids.forEach(pid => existingSec.programIds.add(String(pid)));
          } else {
            const secPidsSet = new Set(scPids.map(String));
            secondaryList.push({
              key: scKey,
              id: sc.id || sc.course_id,
              nameAr: scAr,
              nameEn: scEn,
              code: scCode,
              bylawTheory: sc.theory_hours ?? 0,
              bylawPractical: sc.practical_hours ?? 0,
              bylawTraining: sc.exercise_hours ?? 0,
              bylawField: sc.activity_hours ?? 0,
              groupsTheory: sc.groups_theory !== undefined && sc.groups_theory !== null ? Number(sc.groups_theory) : primaryGrpTh,
              groupsPractical: sc.groups_practical !== undefined && sc.groups_practical !== null ? Number(sc.groups_practical) : primaryGrpPr,
              groupsTraining: sc.groups_training !== undefined && sc.groups_training !== null ? Number(sc.groups_training) : primaryGrpTr,
              groupsField: sc.groups_field !== undefined && sc.groups_field !== null ? Number(sc.groups_field) : primaryGrpFld,
              reqTheory: (Number(sc.theory_hours ?? 0) || 0) * (sc.groups_theory !== undefined ? Number(sc.groups_theory) : primaryGrpTh),
              reqPractical: (Number(sc.practical_hours ?? 0) || 0) * (sc.groups_practical !== undefined ? Number(sc.groups_practical) : primaryGrpPr),
              reqTraining: (Number(sc.exercise_hours ?? 0) || 0) * (sc.groups_training !== undefined ? Number(sc.groups_training) : primaryGrpTr),
              reqField: (Number(sc.activity_hours ?? 0) || 0) * (sc.groups_field !== undefined ? Number(sc.groups_field) : primaryGrpFld),
              programIds: secPidsSet
            });
          }
        } else {
          scPids.forEach(pid => primaryProgIds.add(String(pid)));
        }
      });
    }

    // 2. Add remaining program_ids from row
    const allRowPids = Array.isArray(row.program_ids) ? row.program_ids : (row.program_id ? [row.program_id] : []);
    allRowPids.forEach(pid => {
      const assignedToSec = secondaryList.some(s => s.programIds.has(String(pid)));
      if (!assignedToSec) {
        primaryProgIds.add(String(pid));
      }
    });

    // 3. Build program lines:
    // Programs for the same course are joined with " - "
    // Different courses get separate lines (separated by horizontal divider line)
    const programLines = [];

    const primaryProgNames = Array.from(primaryProgIds)
      .map(id => programs.find(p => String(p.id) === String(id))?.name)
      .filter(Boolean);

    if (primaryProgNames.length > 0) {
      programLines.push(primaryProgNames.join(" - "));
    }

    secondaryList.forEach(sec => {
      const secProgNames = Array.from(sec.programIds)
        .map(id => programs.find(p => String(p.id) === String(id))?.name)
        .filter(Boolean);
      if (secProgNames.length > 0) {
        programLines.push(secProgNames.join(" - "));
      }
    });

    if (programLines.length === 0) {
      const fallbackList = getProgramDisplayList(row.program_id, row.course_id, row);
      if (secondaryList.length > 0 && fallbackList.length > 1) {
        programLines.push(fallbackList[0]);
        programLines.push(fallbackList.slice(1).join(" - "));
      } else {
        programLines.push(fallbackList.join(" - "));
      }
    }

    return {
      primary: {
        nameAr: primaryAr,
        nameEn: primaryEn,
        code: primaryCode,
        bylawTheory: primaryBylawTh,
        bylawPractical: primaryBylawPr,
        bylawTraining: primaryBylawTr,
        bylawField: primaryBylawFld,
        groupsTheory: primaryGrpTh,
        groupsPractical: primaryGrpPr,
        groupsTraining: primaryGrpTr,
        groupsField: primaryGrpFld,
        reqTheory: primaryReqTh,
        reqPractical: primaryReqPr,
        reqTraining: primaryReqTr,
        reqField: primaryReqFld,
      },
      secondaryList,
      programsList: programLines
    };
  };

  const splitProfNameTwoLinesCore = (name) => {
    if (!name || name === "--" || name === "غير مسند") return { line1: name || "--", line2: "" };
    let clean = name.trim().replace(/\s*\/\s*/g, "/");

    // Keep full name on single line unless it is extremely long (> 36 chars and > 4 words)
    if (clean.length <= 36 || clean.split(/\s+/).length <= 3) {
      return { line1: clean, line2: "" };
    }

    // Check for title prefix
    const titleRegex = /^(أ\.د\/|أ\.د\.|أ\.د|د\/|د\.|د|أ\/|أ\.|أ|م\.م\/|م\.م\.|م\.م|م\/|م\.|م)\s+/;
    let title = "";
    const titleMatch = clean.match(titleRegex);
    if (titleMatch) {
      title = titleMatch[1];
      clean = clean.slice(titleMatch[0].length).trim();
    }

    // Split tokens and merge compound Arabic names
    const tokens = clean.split(/\s+/);
    const compoundPrefixes = ["عبد", "ابو", "أبو", "ام", "أم", "ابن", "ابنة", "آل", "سيف", "نور", "جمال", "شمس", "علاء", "بهاء", "ضياء", "حسام", "عماد", "صلاح", "تقي", "شرف", "زين", "نجم", "تاج", "شهاب", "فخر"];
    const mergedNames = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (i < tokens.length - 1 && compoundPrefixes.includes(t)) {
        mergedNames.push(`${t} ${tokens[i + 1]}`);
        i++;
      } else if (i < tokens.length - 1 && (tokens[i + 1] === "الدين" || tokens[i + 1] === "الله" || tokens[i + 1] === "الحق" || tokens[i + 1] === "الإسلام")) {
        mergedNames.push(`${t} ${tokens[i + 1]}`);
        i++;
      } else {
        mergedNames.push(t);
      }
    }

    // If 3 or fewer names, keep on 1 line
    if (mergedNames.length <= 3) {
      const full = title ? `${title} ${mergedNames.join(" ")}` : mergedNames.join(" ");
      return { line1: full, line2: "" };
    }

    let line1Count = Math.min(3, mergedNames.length - 1);
    const l1Names = mergedNames.slice(0, line1Count).join(" ");
    const line1 = title ? `${title} ${l1Names}` : l1Names;
    const line2 = mergedNames.slice(line1Count).join(" ");

    return { line1, line2 };
  };

  const formatProfNameToTwoLines = (name) => {
    const { line1, line2 } = splitProfNameTwoLinesCore(name);
    return line2 ? `${line1}<br/>${line2}` : line1;
  };

  const formatProfNameToTwoLinesReact = (name) => {
    const { line1, line2 } = splitProfNameTwoLinesCore(name);
    if (!line2) return line1;
    return (
      <div>
        <div style={{ lineHeight: "1.2" }}>{line1}</div>
        <div style={{ lineHeight: "1.2" }}>{line2}</div>
      </div>
    );
  };

  // Helper to build rows for "جدول الخطة مجمع بالأساتذة"
  const buildProfAggregatedRows = () => {
    const rows = [];
    const profMap = {};

    planRows.forEach(r => {
      if (!r.professor_id) return;
      const profId = String(r.professor_id);
      if (!profMap[profId]) {
        profMap[profId] = [];
      }
      profMap[profId].push(r);
    });

    let serial = 1;
    Object.entries(profMap).forEach(([profId, rawItems]) => {
      const profObj = professors.find(p => String(p.id) === String(profId)) || {};

      // Deduplicate courses under this professor to prevent empty ghost rows
      const items = [];
      const seen = new Set();
      rawItems.forEach(item => {
        const cId = item.base_course_id || item.course_id;
        const cKey = `${cId}_${item.module_id || ''}`;
        if (!seen.has(cKey)) {
          seen.add(cKey);
          items.push(item);
        }
      });

      const totalTheory = items.reduce((s, x) => s + (Number(x.hours_actual_theory) || 0), 0);
      const totalPractical = items.reduce((s, x) => s + (Number(x.hours_actual_practical) || 0), 0);
      const totalTraining = items.reduce((s, x) => s + (Number(x.hours_actual_training) || 0), 0);
      const totalField = items.reduce((s, x) => s + (Number(x.hours_actual_field) || 0), 0);

      const profTotalSpan = items.length;

      let isFirstInProf = true;
      items.forEach(item => {
        const block = getCourseBlockInfo(item);
        const c = courses.find(x => String(x.id) === String(item.base_course_id || item.course_id)) || {};
        const progLine = (block.programsList && block.programsList.length > 0) ? block.programsList.join(" - ") : (getProgramDisplayList(item.program_id, item.course_id, item).join(" - ") || "المستوى العام");
        const courseDisplayName = formatCourseNameInline(block.primary.nameAr, block.primary.nameEn);

        rows.push({
          serial: serial,
          profId: profId,
          profName: profId === "unassigned" ? "غير مسند" : (profObj.id ? getFormattedProfName(profObj) : (items[0]?.professor_name || "غير مسند")),
          jobTitle: getJobTitleFull(profObj.job_title || items[0]?.prof_job_title),
          workplace: (profObj.original_workplace || items[0]?.prof_workplace || "--").replace(/\r?\n/g, " - "),
          course_id: item.base_course_id || item.course_id,
          base_course_id: item.base_course_id,
          nameAr: block.primary.nameAr,
          nameEn: block.primary.nameEn,
          courseName: courseDisplayName,
          level: formatLevelToWord((c.level !== undefined && c.level !== null && c.level !== "") ? c.level : item.level),
          program_id: item.program_id,
          program_ids: item.program_ids,
          program_name: item.program_name,
          progLine: progLine,
          shared_courses_data: item.shared_courses_data,
          entry_group_id: item.entry_group_id,
          code: block.primary.code || "--",
          hoursTheory: item.hours_actual_theory || 0,
          hoursPractical: item.hours_actual_practical || 0,
          hoursTraining: item.hours_actual_training || 0,
          hoursField: item.hours_actual_field || 0,
          totalTheory: totalTheory,
          totalPractical: totalPractical,
          totalTraining: totalTraining,
          totalField: totalField,
          notes: item.prof_notes || item.notes || "--",
          isFirstOfProf: isFirstInProf,
          profSpan: profTotalSpan,
          isFirstOfBlock: true,
          blockSpan: 1
        });

        isFirstInProf = false;
      });

      serial++;
    });

    return rows;
  };

  const renderSignaturesExcel = (signaturesList, totalCols, customWidths = null) => {
    if (!signaturesList || signaturesList.length === 0) return "";

    const sorted = [...signaturesList].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const n = sorted.length;

    // Helper to calculate optimal spans across columns to equalize physical signature widths
    const getOptimalSpans = (widths, k) => {
      const total = widths.length;
      if (k <= 0) return [];
      if (k >= total) return new Array(total).fill(1);
      const target = widths.reduce((a, b) => a + b, 0) / k;
      const memo = {};

      const solve = (i, count) => {
        if (count === 1) {
          let w = 0;
          for (let x = 0; x < i; x++) w += widths[x];
          return { err: Math.pow(w - target, 2), splits: [i] };
        }
        const key = `${i}_${count}`;
        if (memo[key]) return memo[key];

        let bestErr = Infinity;
        let bestSplits = null;

        for (let j = count - 1; j < i; j++) {
          let lastW = 0;
          for (let x = j; x < i; x++) lastW += widths[x];
          const curErr = Math.pow(lastW - target, 2);
          const prev = solve(j, count - 1);
          const totalErr = prev.err + curErr;
          if (totalErr < bestErr) {
            bestErr = totalErr;
            bestSplits = [...prev.splits, i - j];
          }
        }
        memo[key] = { err: bestErr, splits: bestSplits };
        return memo[key];
      };

      return solve(total, k).splits;
    };

    const effectiveWidths = (Array.isArray(customWidths) && customWidths.length === totalCols)
      ? customWidths
      : new Array(totalCols).fill(100);

    const spans = getOptimalSpans(effectiveWidths, n);

    // Format signature title with balanced line breaks for Excel display
    const formatSigTitleExcel = (title) => {
      if (!title) return "";
      const t = title.trim();
      if (t.includes("نائب رئيس الجامعة") && (t.includes("للشئون") || t.includes("لشئون") || t.includes("لشؤون") || t.includes("للشؤون"))) {
        return t.replace(/(لل?ش[ؤئ]ون)/, '<br style="mso-data-placement:same-cell;"/>$1');
      }
      if (t.includes("عميد قطاع") && (t.includes("والعلوم") || t.includes("والتطبيقية"))) {
        return t.replace(/(والعلوم)/, '<br style="mso-data-placement:same-cell;"/>$1');
      }
      if ((t.includes("مدير إدارة") || t.includes("مدير ادارة")) && (t.includes("شؤون") || t.includes("شئون"))) {
        return t.replace(/(ش[ؤئ]ون)/, '<br style="mso-data-placement:same-cell;"/>$1');
      }
      if (t.includes("منسق البرامج") && t.includes("الهندسية")) {
        return t.replace(/(الهندسية)/, '<br style="mso-data-placement:same-cell;"/>$1');
      }
      if (t.length > 22 && t.includes(" ")) {
        const words = t.split(" ");
        const mid = Math.ceil(words.length / 2);
        return words.slice(0, mid).join(" ") + '<br style="mso-data-placement:same-cell;"/>' + words.slice(mid).join(" ");
      }
      return t;
    };

    let titlesRow = `<tr height="48" style="height: 36pt; mso-height-source: userset;">`;
    let spaceRow = `<tr height="38" style="height: 28.5pt; mso-height-source: userset;">`;
    let namesRow = `<tr height="30" style="height: 22.5pt; mso-height-source: userset;">`;

    sorted.forEach((sig, idx) => {
      const span = spans[idx] || 1;
      const spanAttr = span > 1 ? ` colspan="${span}"` : "";

      titlesRow += `<td${spanAttr} class="no-border signature-cell" align="center" style="border: none !important; mso-border-alt: none !important; text-align: center; font-weight: bold; font-size: 11pt !important; color: #000000; vertical-align: middle; white-space: normal !important; line-height: 1.35; padding: 6px 4px;"><font color="#000000" size="3" style="font-size: 11pt;"><b>${formatSigTitleExcel(sig.signature_title)}</b></font></td>`;
      spaceRow += `<td${spanAttr} class="no-border" align="center" style="border: none !important; mso-border-alt: none !important; text-align: center; vertical-align: middle; height: 38px;"></td>`;
      namesRow += `<td${spanAttr} class="no-border signature-cell" align="center" style="border: none !important; mso-border-alt: none !important; text-align: center; font-weight: bold; font-size: 11pt !important; color: #1b5e20; vertical-align: middle; white-space: nowrap !important; padding: 4px 4px;"><font color="#1b5e20" size="3" style="font-size: 11pt;"><b>${sig.official_name || ""}</b></font></td>`;
    });

    titlesRow += `</tr>`;
    spaceRow += `</tr>`;
    namesRow += `</tr>`;

    return `
<tr height="25" style="height: 18.75pt;"><td colspan="${totalCols}" class="no-border" style="border: none !important; mso-border-alt: none !important;"></td></tr>
${titlesRow}
${spaceRow}
${namesRow}
`;
  };

  const generateSignaturesHtml = (signaturesList) => {
    if (!signaturesList || signaturesList.length === 0) return "";
    const sorted = [...signaturesList].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    return `
<div style="display: flex; justify-content: center; align-items: flex-start; width: 100%; margin: 18px auto 0 auto; padding: 0 10px; box-sizing: border-box; page-break-inside: avoid; border: none !important; gap: 45px;">
  ${sorted.map(sig => `
    <div style="flex: 0 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; border: none !important;">
      <div style="font-weight: bold; font-size: 10.5pt; color: #000000; white-space: nowrap;">
        ${sig.signature_title || ""}
      </div>
      <div style="height: 34px;"></div>
      <div style="font-weight: bold; font-size: 10.5pt; color: #1b5e20; white-space: nowrap;">
        ${sig.official_name || ""}
      </div>
    </div>
  `).join("")}
</div>
`;
  };

  const renderSignaturesPrint = (signaturesList) => generateSignaturesHtml(signaturesList);

  const renderMedicineTableRows = () => {
    if (renderRows.length === 0) {
      return (
        <tr>
          <td colSpan={18} className="text-center p-4 text-muted">
            لا توجد مقررات مضافة في هذه الخطة
          </td>
        </tr>
      );
    }

    return renderRows.map((r, idx) => {
      const isGreenRow = (r.serial ? r.serial % 2 === 0 : idx % 2 === 1);
      const cObj = courses.find(x => String(x.id) === String(r.base_course_id || r.course_id)) || {};
      const arName = (cObj.name_ar || r.nameAr || "").trim();
      const enName = (cObj.name_en || r.nameEn || "").trim();
      const validAr = arName && arName !== "-" && arName !== "--";
      const validEn = enName && enName !== "-" && enName !== "--";
      const courseDisplayName = validAr && validEn && arName.toLowerCase() !== enName.toLowerCase()
        ? `${arName} (${enName})`
        : (validAr ? arName : (validEn ? enName : (arName || enName || "--")));

      if (r.isCourseTotalRow) {
        return (
          <tr key={idx} className="align-middle fw-bold" style={{ backgroundColor: "#fef3c7", borderBottom: "2px solid #fcd34d" }}>
            {/* 1. Course Name */}
            <td className="fw-bold text-center px-2" style={{ backgroundColor: "#fef3c7", color: "#92400e", fontSize: "14px" }}>
              {courseDisplayName}
            </td>
            {/* 2. Bylaw total hours for course */}
            <td className="fw-bold text-center" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>{fmt(r.totBylawTh)}</td>
            <td className="fw-bold text-center" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>{fmt(r.totBylawPr)}</td>
            {/* 3. Student count (spans entire course) */}
            <td rowSpan={r.courseSpan} className="fw-bold text-success text-center align-middle" style={{ backgroundColor: "#f0fdf4" }}>
              {r.student_count || "--"}
            </td>
            {/* 4. Groups (spans entire course) */}
            <td rowSpan={r.courseSpan} className="text-center align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.groups_theory || "--"}
            </td>
            <td rowSpan={r.courseSpan} className="text-center align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.groups_practical || "--"}
            </td>
            {/* 5. Required total hours for course */}
            <td className="fw-bold text-center" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>{fmt(r.totReqTh)}</td>
            <td className="fw-bold text-center" style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>{fmt(r.totReqPr)}</td>
            {/* 6. Spanning Department, Prof Name, Job, Workplace */}
            <td colSpan={4} className="fw-bold text-center py-2" style={{ color: "#92400e", fontSize: "13.5px", backgroundColor: "#fef3c7" }}>
              مجموع الساعات التدريسية لجميع الأقسام العلمية للمقرر ({courseDisplayName})
            </td>
            {/* 7. Actual total hours implemented for the entire course */}
            <td className="fw-bold text-center py-1" style={{ fontSize: "14px", color: "#b45309", backgroundColor: "#fef3c7" }}>
              {fmt(r.totActualTh)}
            </td>
            <td className="fw-bold text-center py-1" style={{ fontSize: "14px", color: "#b45309", backgroundColor: "#fef3c7" }}>
              {fmt(r.totActualPr)}
            </td>
            {/* 8. Notes & Actions (spans entire course) */}
            <td rowSpan={r.courseSpan} className="align-middle text-center px-1" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff", minWidth: "45px" }}>
              {(r.course_notes || r.notes) ? (
                <div style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  display: "inline-block",
                  whiteSpace: "normal",
                  fontSize: "13px",
                  fontWeight: "500",
                  lineHeight: "1.4",
                  margin: "0 auto"
                }}>
                  {r.course_notes || r.notes}
                </div>
              ) : "--"}
            </td>
            {!isPlanLocked && (
              <td rowSpan={r.courseSpan} className="align-middle text-center" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
                <div className="d-flex justify-content-center align-items-center gap-2">
                  <Button variant="link" className="text-success p-0" title="تعديل المقرر" onClick={() => handleEditCourseBlock(r.base_course_id || r.course_id)}>
                    <FaEdit size={17} />
                  </Button>
                  <Button variant="link" className="text-danger p-0" title="حذف المقرر" onClick={() => handleDeleteCourse(r.base_course_id || r.course_id)}>
                    <FaTrash size={17} />
                  </Button>
                </div>
              </td>
            )}
          </tr>
        );
      }

      if (r.isModuleSummary) {
        return (
          <tr key={idx} className="align-middle" style={{ backgroundColor: "#fef3c7", borderBottom: "2px solid #fcd34d" }}>
            <td colSpan={3} className="fw-bold text-center py-1" style={{ color: "#92400e", fontSize: "13px", backgroundColor: "#fef3c7" }}>
              {r.department_name && r.department_name !== "--" && r.department_name !== "-"
                ? `مجموع الساعات المنفذة للقسم العلمي (${r.department_name})`
                : "مجموع الساعات المنفذة للقسم العلمي"}
            </td>
            <td className="fw-bold text-center py-1" style={{ fontSize: "13.5px", color: "#b45309", backgroundColor: "#fef3c7" }}>
              {fmt(r.deptActualTh)}
            </td>
            <td className="fw-bold text-center py-1" style={{ fontSize: "13.5px", color: "#b45309", backgroundColor: "#fef3c7" }}>
              {fmt(r.deptActualPr)}
            </td>
          </tr>
        );
      }

      return (
        <tr key={idx} className={`align-middle ${isGreenRow ? "row-green" : "row-white"}`}>
          {r.hasMultipleModules ? (
            r.isFirstInModule && (
              <td rowSpan={r.moduleSpan} className="fw-bold text-center px-2 align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
                {r.department_name}
              </td>
            )
          ) : (
            r.isFirstInCourse && (
              <td rowSpan={r.courseSpan} className="fw-bold text-center px-2 align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
                {courseDisplayName}
              </td>
            )
          )}
          {r.isFirstInModule && (
            <td rowSpan={r.moduleSpan} className="fw-bold align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.mod_theory_hours !== undefined ? fmt(r.mod_theory_hours) : (cObj.theory_hours ? fmt(cObj.theory_hours) : "--")}
            </td>
          )}
          {r.isFirstInModule && (
            <td rowSpan={r.moduleSpan} className="fw-bold align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.mod_practical_hours !== undefined ? fmt(r.mod_practical_hours) : (cObj.practical_hours ? fmt(cObj.practical_hours) : "--")}
            </td>
          )}
          {!r.hasMultipleModules && r.isFirstInCourse && (
            <td rowSpan={r.courseSpan} className="fw-bold text-success align-middle" style={{ backgroundColor: "#f0fdf4" }}>
              {r.student_count || "--"}
            </td>
          )}
          {!r.hasMultipleModules && r.isFirstInCourse && (
            <td rowSpan={r.courseSpan} className="text-center align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.groups_theory || "--"}
            </td>
          )}
          {!r.hasMultipleModules && r.isFirstInCourse && (
            <td rowSpan={r.courseSpan} className="text-center align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.groups_practical || "--"}
            </td>
          )}
          {r.isFirstInModule && (
            <td rowSpan={r.moduleSpan} className="fw-bold align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.mod_req_theory !== undefined ? fmt(r.mod_req_theory) : (r.req_theory ? fmt(r.req_theory) : "--")}
            </td>
          )}
          {r.isFirstInModule && (
            <td rowSpan={r.moduleSpan} className="fw-bold align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.mod_req_practical !== undefined ? fmt(r.mod_req_practical) : (r.req_practical ? fmt(r.req_practical) : "--")}
            </td>
          )}
          {r.isFirstInModule && (
            <td rowSpan={r.moduleSpan} className="fw-bold text-success align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.department_name || "--"}
            </td>
          )}
          <td className="text-end px-2 fw-bold align-middle">
            {(() => {
              const profObj = professors.find(p => String(p.id) === String(r.professor_id));
              const fullProfName = profObj ? getFormattedProfName(profObj) : (r.professor_name || "غير مسند");
              return formatProfNameToTwoLinesReact(fullProfName);
            })()}
          </td>
          <td className="align-middle">
            {(() => {
              const profObj = professors.find(p => String(p.id) === String(r.professor_id));
              return profObj ? getJobTitleFull(profObj.job_title) : (getJobTitleFull(r.prof_job_title) || "--");
            })()}
          </td>
          <td className="align-middle">{r.prof_workplace || "--"}</td>
          <td className="fw-bold text-success align-middle">{fmt(r.hours_actual_theory)}</td>
          <td className="fw-bold text-success align-middle">{fmt(r.hours_actual_practical)}</td>
          {!r.hasMultipleModules && r.isFirstInCourse && (
            <td rowSpan={r.courseSpan} className="align-middle" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              {r.course_notes || r.notes || "--"}
            </td>
          )}
          {!isPlanLocked && !r.hasMultipleModules && r.isFirstInCourse && (
            <td rowSpan={r.courseSpan} className="align-middle text-center" style={{ backgroundColor: isGreenRow ? "#f0fdf4" : "#fff" }}>
              <div className="d-flex justify-content-center align-items-center gap-2">
                <Button variant="link" className="text-success p-0" title="تعديل المقرر" onClick={() => handleEditCourseBlock(r.base_course_id || r.course_id)}>
                  <FaEdit size={17} />
                </Button>
                <Button variant="link" className="text-danger p-0" title="حذف المقرر" onClick={() => handleDeleteCourse(r.base_course_id || r.course_id)}>
                  <FaTrash size={17} />
                </Button>
              </div>
            </td>
          )}
        </tr>
      );
    });
  };

    const renderSubHeaderTh = (text, isHealthTechParam, isForPrintParam) => {
    const isVertical = isHealthTechParam && isForPrintParam;
    if (isVertical) {
      return `<th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 8pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><div style="display: inline-block; transform: rotate(-45deg); transform-origin: center; white-space: nowrap; margin: auto; padding: 2px 0; line-height: 1;"><font color="#ffffff">${text}</font></div></th>`;
    }
    return `<th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">${text}</font></th>`;
  };

  const generateModel1Html = (isForPrint = false) => {
    const facName = activeFac?.name || "الكلية";
    const isSingleProgram = programs.length <= 1;

    const activeCourseIds = new Set(planRows.map(r => String(r.course_id)));
    const activeCoursesList = courses.filter(c => activeCourseIds.has(String(c.id)));

    const activeProgNamesSet = new Set();
    planRows.forEach(r => {
      const list = getProgramDisplayList(r.program_id, r.course_id, r);
      if (Array.isArray(list)) {
        list.forEach(pName => {
          if (pName && pName !== "-" && pName !== "--" && pName !== "المستوى العام") {
            activeProgNamesSet.add(pName);
          }
        });
      }
      if (r.program_name && r.program_name !== "-" && r.program_name !== "--" && r.program_name !== "المستوى العام") {
        activeProgNamesSet.add(r.program_name);
      }
    });

    const activeProgNamesList = Array.from(activeProgNamesSet);
    const progNames = activeProgNamesList.length > 0
      ? activeProgNamesList.join(" - ")
      : (programs.length === 1 ? programs[0].name : "المستوى العام");

    const activeLevelNames = Array.from(new Set(
      activeCoursesList.map(c => formatLevelToWord(c.level)).concat(planRows.map(r => formatLevelToWord(r.level)))
    )).filter(l => l && l !== "--");

    const levelNames = activeLevelNames.length > 0 ? activeLevelNames.join(" - ") : "العام";

    let dataRowsHtml = "";

    if (isMedicine) {
      const uniqueCourseIds = Array.from(new Set(planRows.map(r => r.course_id)));
      uniqueCourseIds.forEach((cId, cIdx) => {
        const cObj = courses.find(x => String(x.id) === String(cId)) || {};
        const courseRows = planRows.filter(r => String(r.course_id) === String(cId));
        const firstRow = courseRows[0] || {};
        const isGreen = (cIdx % 2 === 1);
        const rowBg = isGreen ? "#f0fdf4" : "#ffffff";

        const groupsTh = Number(firstRow.groups_theory) || 0;
        const groupsPr = Number(firstRow.groups_practical) || 0;
        const groupsAct = Number(firstRow.groups_activity) || 0;
        const studentCount = Number(firstRow.student_count) || 0;

        const hasRealModules = Boolean(cObj.modules && cObj.modules.length > 0 && cObj.modules.some(m => {
          const dept = (m.department_name || "").trim();
          return dept && dept !== "-" && dept !== "--" && dept !== "القسم العام";
        }));

        const courseNameDisplay = cObj.name_ar || cObj.name_en || firstRow.nameAr || "--";

        if (hasRealModules) {
          const modules = cObj.modules;
          const totThBylaw = modules.reduce((s, m) => s + (Number(m.theory_hours) || 0), 0);
          const totPrBylaw = modules.reduce((s, m) => s + (Number(m.practical_hours) || 0), 0);
          const totActBylaw = modules.reduce((s, m) => s + (Number(m.activity_hours) || 0), 0);
          const totThReq = totThBylaw * groupsTh;
          const totPrReq = totPrBylaw * groupsPr;

          const courseActualTh = courseRows.reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0);
          const courseActualPr = courseRows.reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0);

          const modBlocks = modules.map(mod => {
            const modProfs = courseRows.filter(r => (String(r.module_id) === String(mod.id) || (!r.module_id && r.department_name === mod.department_name)) && r.professor_id);
            const profList = modProfs.length > 0 ? modProfs : [{ professor_id: null, hours_actual_theory: 0, hours_actual_practical: 0 }];
            const modTotTh = modProfs.reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0);
            const modTotPr = modProfs.reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0);

            return { mod, profList, modTotTh, modTotPr, totalRows: profList.length + 1 };
          });
          const courseTotalModuleRows = modBlocks.reduce((s, b) => s + b.totalRows, 0);

          // 1. Course Banner Row
          dataRowsHtml += `<tr style="mso-height-source: auto; font-weight: bold; background-color: ${rowBg};">`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${courseNameDisplay}</td>`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${totThBylaw ? fmt(totThBylaw) : "--"}</td>`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${totPrBylaw ? fmt(totPrBylaw) : "--"}</td>`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777;">--</td>`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777;">--</td>`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777;">--</td>`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${totThReq ? fmt(totThReq) : "--"}</td>`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${totPrReq ? fmt(totPrReq) : "--"}</td>`;
          dataRowsHtml += `<td colspan="4" bgcolor="#e8f5e9" style="background-color: #e8f5e9; color: #1b5e20; text-align: center; font-weight: bold; border: 1px solid #777;">مجموع الساعات التدريسية لجميع الأقسام العلمية للمقرر (${courseNameDisplay})</td>`;
          dataRowsHtml += `<td bgcolor="#e8f5e9" style="background-color: #e8f5e9; color: #1b5e20; text-align: center; font-weight: bold; border: 1px solid #777;">${courseActualTh ? fmt(courseActualTh) : "--"}</td>`;
          dataRowsHtml += `<td bgcolor="#e8f5e9" style="background-color: #e8f5e9; color: #1b5e20; text-align: center; font-weight: bold; border: 1px solid #777;">${courseActualPr ? fmt(courseActualPr) : "--"}</td>`;
          dataRowsHtml += `<td rowspan="${courseTotalModuleRows + 1}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; padding: 4px 2px;"><div style="writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; white-space: normal; margin: auto;">${firstRow.course_notes || firstRow.notes || "--"}</div></td>`;
          dataRowsHtml += `</tr>\n`;

          // 2. Department Blocks
          modBlocks.forEach((block, bIdx) => {
            const modThBylaw = Number(block.mod.theory_hours) || 0;
            const modPrBylaw = Number(block.mod.practical_hours) || 0;
            const modThReq = modThBylaw * groupsTh;
            const modPrReq = modPrBylaw * groupsPr;

            block.profList.forEach((pRow, pIdx) => {
              const profObj = professors.find(p => String(p.id) === String(pRow.professor_id));
              const profName = profObj ? getFormattedProfName(profObj) : (pRow.professor_name || "--");
              const profJob = profObj ? getJobTitleFull(profObj.job_title) : (pRow.prof_job_title || "--");
              const profWorkplace = profObj?.original_workplace || pRow.prof_workplace || "--";
              const actTh = pRow.hours_actual_theory ? fmt(pRow.hours_actual_theory) : "--";
              const actPr = pRow.hours_actual_practical ? fmt(pRow.hours_actual_practical) : "--";

              dataRowsHtml += `<tr style="mso-height-source: auto;">`;
              if (pIdx === 0) {
                dataRowsHtml += `<td rowspan="${block.totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777; color: #1b5e20;">${block.mod.department_name}</td>`;
                dataRowsHtml += `<td rowspan="${block.totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${modThBylaw ? fmt(modThBylaw) : "--"}</td>`;
                dataRowsHtml += `<td rowspan="${block.totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${modPrBylaw ? fmt(modPrBylaw) : "--"}</td>`;
              }
              if (bIdx === 0 && pIdx === 0) {
                dataRowsHtml += `<td rowspan="${courseTotalModuleRows}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; font-weight: bold; border: 1px solid #777;">${studentCount || "--"}</td>`;
                dataRowsHtml += `<td rowspan="${courseTotalModuleRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777;">${groupsTh || "--"}</td>`;
                dataRowsHtml += `<td rowspan="${courseTotalModuleRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777;">${groupsPr || "--"}</td>`;
              }
              if (pIdx === 0) {
                dataRowsHtml += `<td rowspan="${block.totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${modThReq ? fmt(modThReq) : "--"}</td>`;
                dataRowsHtml += `<td rowspan="${block.totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${modPrReq ? fmt(modPrReq) : "--"}</td>`;
                dataRowsHtml += `<td rowspan="${block.totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777; color: #1b5e20;">${block.mod.department_name}</td>`;
              }
              dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: right; font-weight: normal; padding: 4px 6px; ${isForPrint ? "width: 120px; min-width: 115px; max-width: 125px;" : ""} border: 1px solid #777; line-height: 1.25; vertical-align: middle;">${profName}</td>`;
              dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777; ${isForPrint ? "width: 55px; min-width: 50px;" : ""} white-space: nowrap; padding: 2px 4px;">${profJob}</td>`;
              dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777; ${isForPrint ? "width: 120px; min-width: 115px; max-width: 125px;" : ""}">${profWorkplace}</td>`;
              dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${actTh}</td>`;
              dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${actPr}</td>`;
              dataRowsHtml += `</tr>\n`;
            });

            dataRowsHtml += `<tr style="mso-height-source: auto; font-weight: bold;">`;
            dataRowsHtml += `<td colspan="3" bgcolor="#eaf7ec" style="background-color: #eaf7ec; color: #15803d; text-align: center; font-weight: bold; border: 1px solid #777;">${block.mod.department_name} -- المجموع</td>`;
            dataRowsHtml += `<td bgcolor="#eaf7ec" style="background-color: #eaf7ec; color: #15803d; text-align: center; font-weight: bold; border: 1px solid #777;">${block.modTotTh ? fmt(block.modTotTh) : "--"}</td>`;
            dataRowsHtml += `<td bgcolor="#eaf7ec" style="background-color: #eaf7ec; color: #15803d; text-align: center; font-weight: bold; border: 1px solid #777;">${block.modTotPr ? fmt(block.modTotPr) : "--"}</td>`;
            dataRowsHtml += `</tr>\n`;
          });
        } else {
          // Non-modular course in Medicine: Just a single direct course entry!
          const profList = courseRows.filter(r => r.professor_id);
          const effectiveProfList = profList.length > 0 ? profList : [firstRow];
          const totalRows = effectiveProfList.length;

          const singleDeptName = (cObj.modules && cObj.modules[0]?.department_name) || firstRow.department_name || "--";
          const bylawTh = cObj.theory_hours ?? (cObj.modules && cObj.modules[0]?.theory_hours) ?? firstRow.theory_hours ?? 0;
          const bylawPr = cObj.practical_hours ?? (cObj.modules && cObj.modules[0]?.practical_hours) ?? firstRow.practical_hours ?? 0;
          const reqTh = (Number(bylawTh) || 0) * groupsTh;
          const reqPr = (Number(bylawPr) || 0) * groupsPr;

          effectiveProfList.forEach((pRow, pIdx) => {
            const profObj = professors.find(p => String(p.id) === String(pRow.professor_id));
            const profName = profObj ? getFormattedProfName(profObj) : (pRow.professor_name || "--");
            const profJob = profObj ? getJobTitleFull(profObj.job_title) : (pRow.prof_job_title || "--");
            const profWorkplace = profObj?.original_workplace || pRow.prof_workplace || "--";
            const actTh = pRow.hours_actual_theory ? fmt(pRow.hours_actual_theory) : "--";
            const actPr = pRow.hours_actual_practical ? fmt(pRow.hours_actual_practical) : "--";

            dataRowsHtml += `<tr style="mso-height-source: auto;">`;
            if (pIdx === 0) {
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${courseNameDisplay}</td>`;
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${bylawTh ? fmt(bylawTh) : "--"}</td>`;
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${bylawPr ? fmt(bylawPr) : "--"}</td>`;
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; font-weight: bold; border: 1px solid #777;">${studentCount || "--"}</td>`;
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777;">${groupsTh || "--"}</td>`;
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777;">${groupsPr || "--"}</td>`;
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${reqTh ? fmt(reqTh) : "--"}</td>`;
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${reqPr ? fmt(reqPr) : "--"}</td>`;
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777; color: #1b5e20;">${singleDeptName}</td>`;
            }
            dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: right; font-weight: bold; padding: 4px 6px; ${isForPrint ? "width: 120px; min-width: 115px; max-width: 125px;" : ""} border: 1px solid #777; line-height: 1.25; vertical-align: middle;">${profName}</td>`;
            dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777; ${isForPrint ? "width: 55px; min-width: 50px;" : ""} white-space: nowrap; padding: 2px 4px;">${profJob}</td>`;
            dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777; ${isForPrint ? "width: 120px; min-width: 115px; max-width: 125px;" : ""}">${profWorkplace}</td>`;
            dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${actTh}</td>`;
            dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777;">${actPr}</td>`;
            if (pIdx === 0) {
              dataRowsHtml += `<td rowspan="${totalRows}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777;">${firstRow.course_notes || firstRow.notes || "--"}</td>`;
            }
            dataRowsHtml += `</tr>\n`;
          });
        }
      });
    } else {
      const currentRenderRows = buildRenderRows();

      currentRenderRows.forEach((r) => {
        const isGreen = (r.serial ? r.serial % 2 === 0 : false);
        const rowBg = isGreen ? "#f0fdf4" : "#ffffff";

        const block = getCourseBlockInfo(r);
        const prim = block.primary;
        const hasSec = block.secondaryList.length > 0;

        const formatSplitTableHtml = (items, customStyle = "") => {
          if (!items || items.length === 0) return "--";
          if (!isForPrint) {
            return items.join('<br style="mso-data-placement:same-cell;"/>');
          }
          if (items.length === 1) {
            return `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 48px; width: 100%; padding: 4px 2px; box-sizing: border-box; ${customStyle}">${items[0]}</div>`;
          }
          const pct = `${100 / items.length}%`;
          return `<table style="width: 100%; height: 100%; min-height: 52px; border-collapse: collapse; margin: 0; padding: 0; border: none !important; table-layout: fixed;">
            <tbody>
              ${items.map((it, idx) => `
                <tr style="height: ${pct}; border: none !important;">
                  <td style="height: ${pct}; vertical-align: middle; text-align: center; padding: 4px 2px; border: none !important; ${idx > 0 ? 'border-top: 1px solid #777 !important;' : ''} ${customStyle}">
                    ${it}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>`;
        };

        const formatCourseNamePrint = (nameAr, nameEn, defaultVal = "--") => {
          const ar = (nameAr || "").trim();
          const en = (nameEn || "").trim();
          if (ar && en && ar.toLowerCase() !== en.toLowerCase()) {
            return `<div>${ar}</div><div style="font-size: 8.5pt; color: #222; font-weight: normal; margin-top: 2px;">${en}</div>`;
          }
          return ar || en || defaultVal;
        };

        const formatCourseNameInline = (nameAr, nameEn, defaultVal = "--") => {
          const ar = (nameAr || "").trim();
          const en = (nameEn || "").trim();
          if (ar && en && ar.toLowerCase() !== en.toLowerCase()) {
            return `${ar} - ${en}`;
          }
          return ar || en || defaultVal;
        };

        const nameItems = isForPrint ? [
          `<div style="font-weight: bold; color: #111; font-size: 9.5pt; text-align: center; line-height: 1.25;">${formatCourseNamePrint(prim.nameAr, prim.nameEn)}</div>`,
          ...block.secondaryList.map(sc => `<div style="font-weight: bold; color: #111; font-size: 9.5pt; text-align: center; line-height: 1.25;">${formatCourseNamePrint(sc.nameAr, sc.nameEn, sc.code)}</div>`)
        ] : [
          formatCourseNameInline(prim.nameAr, prim.nameEn),
          ...block.secondaryList.map(sc => formatCourseNameInline(sc.nameAr, sc.nameEn, sc.code))
        ];

        const codeItems = isForPrint ? [
          `<span style="white-space: nowrap; font-size: 8.5pt;">${prim.code || "--"}</span>`,
          ...block.secondaryList.map(sc => `<span style="white-space: nowrap; font-size: 8.5pt;">${sc.code || "--"}</span>`)
        ] : [
          prim.code || "--",
          ...block.secondaryList.map(sc => sc.code || "--")
        ];

        const progItems = (block.programsList && block.programsList.length > 0) ? block.programsList : ["المستوى العام"];

        const bylawThItems = isForPrint ? [
          `<span>${prim.bylawTheory ? fmt(prim.bylawTheory) : "--"}</span>`,
          ...block.secondaryList.map(sc => `<span>${sc.bylawTheory ? fmt(sc.bylawTheory) : "--"}</span>`)
        ] : [
          prim.bylawTheory ? fmt(prim.bylawTheory) : "--",
          ...block.secondaryList.map(sc => sc.bylawTheory ? fmt(sc.bylawTheory) : "--")
        ];

        const bylawPrItems = isForPrint ? [
          `<span>${prim.bylawPractical ? fmt(prim.bylawPractical) : "--"}</span>`,
          ...block.secondaryList.map(sc => `<span>${sc.bylawPractical ? fmt(sc.bylawPractical) : "--"}</span>`)
        ] : [
          prim.bylawPractical ? fmt(prim.bylawPractical) : "--",
          ...block.secondaryList.map(sc => sc.bylawPractical ? fmt(sc.bylawPractical) : "--")
        ];

        const studentCount = r.student_count || 0;

        const groupsThItems = isForPrint ? [
          `<span>${prim.groupsTheory ? prim.groupsTheory : "--"}</span>`,
          ...block.secondaryList.map(sc => `<span>${sc.groupsTheory ? sc.groupsTheory : "--"}</span>`)
        ] : [
          prim.groupsTheory ? prim.groupsTheory : "--",
          ...block.secondaryList.map(sc => sc.groupsTheory ? sc.groupsTheory : "--")
        ];

        const groupsPrItems = isForPrint ? [
          `<span>${prim.groupsPractical ? prim.groupsPractical : "--"}</span>`,
          ...block.secondaryList.map(sc => `<span>${sc.groupsPractical ? sc.groupsPractical : "--"}</span>`)
        ] : [
          prim.groupsPractical ? prim.groupsPractical : "--",
          ...block.secondaryList.map(sc => sc.groupsPractical ? sc.groupsPractical : "--")
        ];

        const reqThItems = isForPrint ? [
          `<span>${prim.reqTheory > 0 ? fmt(prim.reqTheory) : "--"}</span>`,
          ...block.secondaryList.map(sc => `<span>${sc.reqTheory > 0 ? fmt(sc.reqTheory) : "--"}</span>`)
        ] : [
          prim.reqTheory > 0 ? fmt(prim.reqTheory) : "--",
          ...block.secondaryList.map(sc => sc.reqTheory > 0 ? fmt(sc.reqTheory) : "--")
        ];

        const reqPrItems = isForPrint ? [
          `<span>${prim.reqPractical > 0 ? fmt(prim.reqPractical) : "--"}</span>`,
          ...block.secondaryList.map(sc => `<span>${sc.reqPractical > 0 ? fmt(sc.reqPractical) : "--"}</span>`)
        ] : [
          prim.reqPractical > 0 ? fmt(prim.reqPractical) : "--",
          ...block.secondaryList.map(sc => sc.reqPractical > 0 ? fmt(sc.reqPractical) : "--")
        ];

        const bylawTr = prim.bylawTraining ? fmt(prim.bylawTraining) : "--";
        const bylawFld = prim.bylawField ? fmt(prim.bylawField) : "--";
        const groupsTr = prim.groupsTraining || 0;
        const groupsFld = prim.groupsField || 0;
        const reqTr = prim.reqTraining > 0 ? fmt(prim.reqTraining) : "--";
        const reqFld = prim.reqField > 0 ? fmt(prim.reqField) : "--";
        const notes = r.course_notes || r.notes || "";

        const prof = professors.find(p => String(p.id) === String(r.professor_id)) || {};
        const profName = prof.id ? getFormattedProfName(prof) : (r.professor_name || "--");
        const profJob = prof.job_title ? getJobTitleFull(prof.job_title) : (getJobTitleFull(r.prof_job_title) || "--");
        const profWorkplace = (prof.original_workplace || r.prof_workplace || "--").replace(/\r?\n/g, " - ");
        const actTh = r.hours_actual_theory ? fmt(r.hours_actual_theory) : "--";
        const actPr = r.hours_actual_practical ? fmt(r.hours_actual_practical) : "--";
        const actTr = r.hours_actual_training ? fmt(r.hours_actual_training) : "--";
        const actFld = r.hours_actual_field ? fmt(r.hours_actual_field) : "--";

        dataRowsHtml += `<tr style="mso-height-source: auto;">`;

        if (r.isFirstInCourse) {
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; ${isForPrint ? (isHealthTech ? "width: 170px;" : "width: 205px;") + " padding: 0; line-height: 1.3; height: 1px;" : "padding: 4px 6px;"} font-size: ${isForPrint ? '8.5pt' : '11pt'}; font-weight: bold;">${formatSplitTableHtml(nameItems)}</td>`;
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "padding: 0; width: 52px; font-size: 8.5pt; height: 1px;" : "padding: 4px 6px; font-size: 11pt;"}">${formatSplitTableHtml(codeItems)}</td>`;
          if (!isHealthTech && !isSingleProgram) {
            dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: normal; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "width: 135px; font-size: 8.5pt; line-height: 1.3; padding: 0; height: 1px;" : "padding: 4px 6px; font-size: 11pt;"}">${formatSplitTableHtml(progItems)}</td>`;
          }
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; vertical-align: middle; border: 1px solid #777; padding: 0; ${isForPrint ? "width: 17px; font-size: 8.5pt;" : "min-width: 50px; font-size: 11pt;"} height: 1px;">${formatSplitTableHtml(bylawThItems)}</td>`;
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; vertical-align: middle; border: 1px solid #777; padding: 0; ${isForPrint ? "width: 17px; font-size: 8.5pt;" : "min-width: 50px; font-size: 11pt;"} height: 1px;">${formatSplitTableHtml(bylawPrItems)}</td>`;
          if (isHealthTech) {
            dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "padding: 1px; width: 17px; font-size: 8.5pt;" : "padding: 6px 12px; min-width: 50px; font-size: 11pt;"}">${bylawTr}</td>`;
            dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "padding: 1px; width: 17px; font-size: 8.5pt;" : "padding: 6px 12px; min-width: 50px; font-size: 11pt;"}">${bylawFld}</td>`;
          }
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; font-weight: bold; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "padding: 1px; width: 25px; font-size: 8.5pt;" : "padding: 6px 12px; min-width: 55px; font-size: 11pt;"}">${studentCount}</td>`;
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; vertical-align: middle; border: 1px solid #777; padding: 0; ${isForPrint ? "width: 17px; font-size: 8.5pt;" : "min-width: 50px; font-size: 11pt;"} height: 1px;">${formatSplitTableHtml(groupsThItems)}</td>`;
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; vertical-align: middle; border: 1px solid #777; padding: 0; ${isForPrint ? "width: 17px; font-size: 8.5pt;" : "min-width: 50px; font-size: 11pt;"} height: 1px;">${formatSplitTableHtml(groupsPrItems)}</td>`;
          if (isHealthTech) {
            dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "padding: 1px; width: 17px; font-size: 8.5pt;" : "font-size: 11pt; min-width: 50px;"}">${groupsTr}</td>`;
            dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "padding: 1px; width: 17px; font-size: 8.5pt;" : "font-size: 11pt; min-width: 50px;"}">${groupsFld}</td>`;
          }
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; vertical-align: middle; border: 1px solid #777; padding: 0; ${isForPrint ? "width: 17px; font-size: 8.5pt; font-weight: bold;" : "min-width: 50px; font-size: 11pt; font-weight: bold;"} height: 1px;">${formatSplitTableHtml(reqThItems, `font-weight: bold; font-size: ${isForPrint ? '8.5pt' : '11pt'};`)}</td>`;
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; vertical-align: middle; border: 1px solid #777; padding: 0; ${isForPrint ? "width: 17px; font-size: 8.5pt; font-weight: bold;" : "min-width: 50px; font-size: 11pt; font-weight: bold;"} height: 1px;">${formatSplitTableHtml(reqPrItems, `font-weight: bold; font-size: ${isForPrint ? '8.5pt' : '11pt'};`)}</td>`;
          if (isHealthTech) {
            dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "padding: 1px; width: 17px; font-size: 8.5pt;" : "font-size: 11pt;"}">${reqTr}</td>`;
            dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "padding: 1px; width: 17px; font-size: 8.5pt;" : "font-size: 11pt;"}">${reqFld}</td>`;
          }
        }

        dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: right; font-weight: normal; padding: 4px 6px; ${isForPrint ? (isHealthTech ? "width: 145px;" : "width: 175px;") : ""} border: 1px solid #777; line-height: 1.25; vertical-align: middle; font-size: ${isForPrint ? '9pt' : '11pt'};">${profName}</td>`;
        dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777; ${isForPrint ? "width: 52px; white-space: nowrap; padding: 2px 3px;" : "padding: 4px 8px;"} font-size: ${isForPrint ? '8.5pt' : '11pt'};">${profJob}</td>`;
        dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777; ${isForPrint ? (isHealthTech ? "width: 85px; font-size: 8pt; padding: 2px 3px; line-height: 1.2;" : "width: 140px; font-size: 8.5pt;") : "min-width: 150px; font-size: 11pt;"}">${profWorkplace}</td>`;
        dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777; padding: 1px; ${isForPrint ? 'width: 17px; font-size: 8.5pt;' : 'font-size: 11pt;'}">${actTh}</td>`;
        dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777; padding: 1px; ${isForPrint ? 'width: 17px; font-size: 8.5pt;' : 'font-size: 11pt;'}">${actPr}</td>`;
        if (isHealthTech) {
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777; padding: 1px; ${isForPrint ? 'width: 17px; font-size: 8.5pt;' : 'font-size: 11pt;'}">${actTr}</td>`;
          dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: bold; border: 1px solid #777; padding: 1px; ${isForPrint ? 'width: 17px; font-size: 8.5pt;' : 'font-size: 11pt;'}">${actFld}</td>`;
        }
        if (r.isFirstInCourse) {
          dataRowsHtml += `<td rowspan="${r.courseSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; ${isForPrint ? "width: 65px; font-size: 8.5pt;" : "font-size: 11pt;"} padding: 4px 6px;">${notes || "--"}</td>`;
        }
        dataRowsHtml += `</tr>\n`;
      });
    }
    const totCourses = new Set(planRows.map(r => r.course_id)).size;
    const totStudents = isMedicine
      ? planRows.reduce((s, r) => s + (Number(r.student_count) || 0), 0)
      : buildRenderRows().filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.student_count) || 0), 0);
    const totGroupsTh = isMedicine
      ? planRows.reduce((s, r) => s + (Number(r.groups_theory) || 0), 0)
      : buildRenderRows().filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_theory) || 0), 0);
    const totGroupsPr = isMedicine
      ? planRows.reduce((s, r) => s + (Number(r.groups_practical) || 0), 0)
      : buildRenderRows().filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_practical) || 0), 0);
    const totGroupsTr = isHealthTech
      ? buildRenderRows().filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_training) || 0), 0)
      : 0;
    const totGroupsFld = isHealthTech
      ? buildRenderRows().filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_field || r.groups_activity) || 0), 0)
      : 0;
    const totHoursTh = isMedicine
      ? planRows.reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0)
      : buildRenderRows().reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0);
    const totHoursPr = isMedicine
      ? planRows.reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0)
      : buildRenderRows().reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0);
    const totHoursTr = isHealthTech
      ? buildRenderRows().reduce((s, r) => s + (Number(r.hours_actual_training) || 0), 0)
      : 0;
    const totHoursFld = isHealthTech
      ? buildRenderRows().reduce((s, r) => s + (Number(r.hours_actual_field) || 0), 0)
      : 0;
    const totProfessors = new Set(planRows.map(r => r.professor_id).filter(Boolean)).size;

    const totalCols = isMedicine ? 15 : (isHealthTech ? 23 : (!isSingleProgram ? 16 : 15));
    const model1ColWidths = isMedicine 
      ? [200, 40, 40, 50, 40, 40, 40, 40, 130, 180, 60, 130, 40, 40, 80]
      : (isHealthTech 
          ? [160, 45, 22, 22, 22, 22, 35, 22, 22, 22, 22, 22, 22, 22, 22, 140, 50, 90, 22, 22, 22, 22, 60]
          : (isSingleProgram 
              ? [220, 55, 35, 35, 50, 35, 35, 35, 35, 180, 55, 130, 40, 40, 65]
              : [210, 55, 135, 40, 40, 55, 40, 40, 40, 40, 185, 60, 135, 43, 43, 80]));
    const signaturesHtml = renderSignaturesExcel(signatures, totalCols, model1ColWidths);
    const footerSummaryHtml = isForPrint ? "" : (
      isMedicine ? `
      <tr height="20" style="height: 15pt; font-weight: bold; mso-height-source: userset;">
        <td colspan="3" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">إجمالي المواد: ${totCourses}</td>
        <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totStudents)}</td>
        <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totGroupsTh)}</td>
        <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totGroupsPr)}</td>
        <td colspan="2" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">-</td>
        <td colspan="4" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">إجمالي أعضاء هيئة التدريس: ${totProfessors}</td>
        <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">${fmt(totHoursTh)}</td>
        <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">${fmt(totHoursPr)}</td>
        <td bgcolor="#f0fdf4" style="border: 1px solid #777; text-align: center;">الإجمالي العام</td>
      </tr>
      ` : (
        isHealthTech ? `
        <tr height="20" style="height: 15pt; font-weight: bold; mso-height-source: userset;">
          <td colspan="2" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">إجمالي المواد: ${totCourses}</td>
          <td colspan="4" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">-</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totStudents)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totGroupsTh)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totGroupsPr)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totGroupsTr)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totGroupsFld)}</td>
          <td colspan="4" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">-</td>
          <td colspan="3" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">إجمالي أعضاء هيئة التدريس: ${totProfessors}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">${fmt(totHoursTh)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">${fmt(totHoursPr)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">${fmt(totHoursTr)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">${fmt(totHoursFld)}</td>
          <td bgcolor="#f0fdf4" style="border: 1px solid #777; text-align: center;">الإجمالي العام</td>
        </tr>
        ` : `
        <tr height="20" style="height: 15pt; font-weight: bold; mso-height-source: userset;">
          <td colspan="${!isSingleProgram ? 3 : 2}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">إجمالي المواد: ${totCourses}</td>
          <td colspan="2" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">-</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totStudents)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totGroupsTh)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">${fmt(totGroupsPr)}</td>
          <td colspan="2" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777;">-</td>
          <td colspan="3" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">إجمالي أعضاء هيئة التدريس: ${totProfessors}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">${fmt(totHoursTh)}</td>
          <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777;">${fmt(totHoursPr)}</td>
          <td bgcolor="#f0fdf4" style="border: 1px solid #777; text-align: center;">الإجمالي العام</td>
        </tr>
        `
      )
    );

    const tableHeadersHtml = isMedicine ? `
<tr class="header-row-main" height="34" style="height: 26pt; mso-height-source: userset;">
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">المقرر / الحزمة</font></th>
  <th colspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">اللائحة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">عدد الطلاب</font></th>
  <th colspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">عدد المجموعات</font></th>
  <th colspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">الساعات المطلوبة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">القسم العلمي</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">اسم عضو هيئة التدريس</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">الدرجة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">جهة القدوم</font></th>
  <th colspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">الساعات المنفذة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">ملاحظات</font></th>
</tr>
<tr class="header-row-sub" height="26" style="height: 20pt; mso-height-source: userset;">
  <th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">نظري</font></th>
  <th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">عملي</font></th>
  <th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">نظري</font></th>
  <th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">عملي</font></th>
  <th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">نظري</font></th>
  <th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">عملي</font></th>
  <th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">نظري</font></th>
  <th bgcolor="#4caf50" style="background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 10pt; padding: 2px 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">عملي</font></th>
</tr>
` : `
<tr class="header-row-main" height="34" style="height: 26pt; mso-height-source: userset;">
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">اسم المادة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">الكود</font></th>
  ${(!isHealthTech && !isSingleProgram) ? `<th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">البرنامج</font></th>` : ""}
  <th colspan="${isHealthTech ? 4 : 2}" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">اللائحة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">عدد الطلاب</font></th>
  <th colspan="${isHealthTech ? 4 : 2}" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">عدد المجموعات</font></th>
  <th colspan="${isHealthTech ? 4 : 2}" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">الساعات المطلوبة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">اسم عضو هيئة التدريس</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">الدرجة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">جهة القدوم</font></th>
  <th colspan="${isHealthTech ? 4 : 2}" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 2px 1px;"><font color="#ffffff">الساعات المنفذة</font></th>
  <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">ملاحظات</font></th>
</tr>
<tr class="header-row-sub" height="${isHealthTech && isForPrint ? '48' : '26'}" style="height: ${isHealthTech && isForPrint ? '48px' : '20pt'}; mso-height-source: userset;">
  ${renderSubHeaderTh("نظري", isHealthTech, isForPrint)}
  ${renderSubHeaderTh("عملي", isHealthTech, isForPrint)}
  ${isHealthTech ? renderSubHeaderTh("توتوريال", isHealthTech, isForPrint) + renderSubHeaderTh("حقل", isHealthTech, isForPrint) : ""}
  ${renderSubHeaderTh("نظري", isHealthTech, isForPrint)}
  ${renderSubHeaderTh("عملي", isHealthTech, isForPrint)}
  ${isHealthTech ? renderSubHeaderTh("توتوريال", isHealthTech, isForPrint) + renderSubHeaderTh("حقل", isHealthTech, isForPrint) : ""}
  ${renderSubHeaderTh("نظري", isHealthTech, isForPrint)}
  ${renderSubHeaderTh("عملي", isHealthTech, isForPrint)}
  ${isHealthTech ? renderSubHeaderTh("توتوريال", isHealthTech, isForPrint) + renderSubHeaderTh("حقل", isHealthTech, isForPrint) : ""}
  ${renderSubHeaderTh("نظري", isHealthTech, isForPrint)}
  ${renderSubHeaderTh("عملي", isHealthTech, isForPrint)}
  ${isHealthTech ? renderSubHeaderTh("توتوريال", isHealthTech, isForPrint) + renderSubHeaderTh("حقل", isHealthTech, isForPrint) : ""}
</tr>
`;
    if (isForPrint) {
      return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>نموذج (1) تدريس - كلية ${facName} - ${selectedSemester} ${selectedYear}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
.data-table thead, thead { display: table-header-group !important; }
.data-table tfoot, tfoot { display: table-footer-group !important; }
tr { page-break-inside: avoid !important; }
@page { size: A4 landscape; margin: 6mm 6mm; }
body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; margin: 0; padding: 0; color: #000; background: #fff; zoom: 78%; }
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
.data-table { border-collapse: collapse; direction: rtl; width: 100%; margin: 0 auto; table-layout: fixed; }
.data-table th, .data-table td {
  border: 1px solid #777;
  padding: 3px 4px;
  font-size: 9pt;
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
  border: 1px solid #1b5e20 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
.header-row-sub th {
  background-color: #4caf50 !important;
  color: #ffffff !important;
  font-weight: bold;
  border: 1px solid #2e7d32 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
</style>
</head>
<body>
<div class="page-border-overlay"></div>
<div class="print-container">
<table class="data-table">
${isMedicine ? `
<colgroup>
  <col style="width: 16%;">
  <col style="width: 3.5%;"><col style="width: 3.5%;">
  <col style="width: 4.5%;">
  <col style="width: 3.5%;"><col style="width: 3.5%;">
  <col style="width: 3.5%;"><col style="width: 3.5%;">
  <col style="width: 12%;">
  <col style="width: 16%;">
  <col style="width: 5.5%;">
  <col style="width: 12%;">
  <col style="width: 3.8%;"><col style="width: 3.8%;">
  <col style="width: 6%;">
</colgroup>
` : (isHealthTech ? `
<colgroup>
  <col style="width: 16%;">
  <col style="width: 4.5%;">
  <col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;">
  <col style="width: 3.5%;">
  <col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;">
  <col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;">
  <col style="width: 14%;">
  <col style="width: 5%;">
  <col style="width: 9%;">
  <col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;">
  <col style="width: 6%;">
</colgroup>
` : (isSingleProgram ? `
<colgroup>
  <col style="width: 22%;">
  <col style="width: 5.5%;">
  <col style="width: 3.5%;"><col style="width: 3.5%;">
  <col style="width: 5%;">
  <col style="width: 3.5%;"><col style="width: 3.5%;">
  <col style="width: 3.5%;"><col style="width: 3.5%;">
  <col style="width: 18%;">
  <col style="width: 5.5%;">
  <col style="width: 13%;">
  <col style="width: 4%;"><col style="width: 4%;">
  <col style="width: 6.5%;">
</colgroup>
` : `
<colgroup>
  <col style="width: 17%;">
  <col style="width: 4.5%;">
  <col style="width: 11%;">
  <col style="width: 3.2%;"><col style="width: 3.2%;">
  <col style="width: 4.5%;">
  <col style="width: 3.2%;"><col style="width: 3.2%;">
  <col style="width: 3.2%;"><col style="width: 3.2%;">
  <col style="width: 15%;">
  <col style="width: 5%;">
  <col style="width: 11%;">
  <col style="width: 3.5%;"><col style="width: 3.5%;">
  <col style="width: 6.5%;">
</colgroup>
`))}
<thead>
<tr style="border: none !important;">
<th colspan="${totalCols}" style="border: none !important; background: transparent !important; color: inherit; padding: 10px 0 4px 0; font-weight: normal;">
  <div style="position: relative; width: 100%; box-sizing: border-box;">
    <div style="position: absolute; left: 0; top: 0; z-index: 10;">
      <img src="${window.location.origin}${logo}" width="95" height="95" style="object-fit: contain; display: block; float: left;" />
    </div>

    <div style="position: absolute; right: 0; top: 0; text-align: right; line-height: 1.35; white-space: nowrap;">
      <div style="font-size: 13.5pt; font-weight: bold; color: #1b5e20;">جامعة المنوفية الأهلية</div>
      <div style="font-size: 11pt; font-weight: bold; color: #222; margin-top: 2px;">شئون التعليم والطلاب</div>
    </div>

    <div style="width: 100%; text-align: center; line-height: 1.35; padding: 0 140px; box-sizing: border-box;">
      <div style="font-size: 15.5pt; font-weight: bold; color: #1b5e20; white-space: nowrap;">${facName.startsWith("كلية") ? facName : `كلية ${facName}`}</div>
      <div style="font-size: 10.5pt; font-weight: bold; color: #222; margin-top: 2px; white-space: nowrap;">المستويات ( ${levelNames} )</div>
      <div style="font-size: ${progNames.length > 85 ? '9.5pt' : '10.5pt'}; font-weight: bold; color: #222; margin-top: 1px; white-space: nowrap;">${activeProgNamesList.length > 1 ? 'برامج' : 'برنامج'}: ${progNames}</div>
    </div>

    <div style="width: 100%; text-align: right; font-weight: bold; font-size: 11.5pt; color: #1b5e20; margin-top: 6px; margin-bottom: 2px; padding-right: 2px; padding-left: 115px; box-sizing: border-box; line-height: 1.35;">
      توزيع الدروس على السادة أعضاء هيئة التدريس والهيئة المعاونة القائمين بالتدريس في ${selectedSemester} للعام الجامعي ${selectedYear} م &nbsp;&nbsp;&nbsp; نموذج (1) تدريس ( نظام ساعات معتمدة )
    </div>
  </div>
</th>
</tr>
${tableHeadersHtml}
</thead>
<tbody>
${dataRowsHtml}
</tbody>
<tfoot>
  <tr style="border: none !important;">
    <td colspan="${totalCols}" style="border: none !important; background: transparent !important; padding: 12px 0 0 0;">
      ${renderSignaturesPrint(signatures)}
    </td>
  </tr>
</tfoot>
</table>
</div>
</body>
</html>
`;
    }

    const excelTemplate = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>نموذج_1_جدول_المقررات</x:Name>
<x:WorksheetOptions>
<x:DisplayRightToLeft/>
<x:Selected/>
<x:FreezePanes/>
<x:FrozenNoSplit/>
<x:SplitHorizontal>6</x:SplitHorizontal>
<x:TopRowBottomPane>6</x:TopRowBottomPane>
<x:ActivePane>2</x:ActivePane>
</x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml>
<![endif]-->
<style>body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; } table { border-collapse: collapse; direction: rtl; width: 100%; table-layout: auto !important; } tr { mso-height-source: auto !important; height: auto !important; } th { border: 1px solid #1b5e20; } td { padding: 6px 10px; font-size: 11pt; vertical-align: middle !important; white-space: nowrap !important; height: auto !important; mso-height-source: auto !important; } .header-title, .header-title font, .header-title b { font-size: 13pt !important; } .signature-cell, .signature-cell font, .signature-cell b { font-size: 11pt !important; white-space: normal !important; text-align: center !important; } td.no-border, .no-border, .no-border td { border: none !important; border-style: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; white-space: nowrap !important; height: auto !important; }</style>
</head>
<body>
<table style="width: 100%; border-collapse: collapse;">
<tr>
  <td colspan="2" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; color: #1b5e20; vertical-align: middle;"><font color="#1b5e20" size="4" style="font-size: 13pt;"><b>جامعة المنوفية الأهلية</b></font></td>
  <td colspan="${totalCols - 3}" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; color: #1b5e20; vertical-align: middle;"><font color="#1b5e20" size="4" style="font-size: 13pt;"><b>${facName.startsWith("كلية") ? facName : `كلية ${facName}`}</b></font></td>
  <td colspan="1" rowspan="2" class="no-border" align="center" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; vertical-align: middle; padding: 0;"><img src="${window.location.origin}${logo}" width="85" height="85" style="display: block; margin: 0 auto;" /></td>
</tr>
<tr>
  <td colspan="2" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; vertical-align: middle;"><font size="4" style="font-size: 13pt;"><b>شئون التعليم والطلاب</b></font></td>
  <td colspan="${totalCols - 3}" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; color: #222; vertical-align: middle;"><font size="4" style="font-size: 13pt;"><b>المستويات ( ${levelNames} )</b></font></td>
</tr>
<tr>
  <td colspan="${totalCols}" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-size: 13pt !important; font-weight: bold; color: #333; vertical-align: middle; padding: 2px 0;"><font size="4" style="font-size: 13pt;"><b>${activeProgNamesList.length > 1 ? 'برامج' : 'برنامج'}: ${progNames}</b></font></td>
</tr>
<tr>
  <td colspan="${totalCols}" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; color: #1b5e20; padding: 3px 0;"><font color="#1b5e20" size="4" style="font-size: 13pt;"><b>توزيع الدروس على السادة أعضاء هيئة التدريس والهيئة المعاونة القائمين بالتدريس في ${selectedSemester} للعام الجامعي ${selectedYear} م &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; نموذج (1) تدريس ( نظام ساعات معتمدة )</b></font></td>
</tr>
${tableHeadersHtml}
${dataRowsHtml}
${footerSummaryHtml}
${signaturesHtml}
</table>
</body>
</html>
`;

    return excelTemplate;
  };

  const handleExportExcelModel1 = () => {
    if (planRows.length === 0) {
      toast.error("لا توجد بيانات مقررات لتصديرها في الخطة.");
      return;
    }
    const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
    const facName = activeFac?.name || "الكلية";
    const excelContent = generateModel1Html(false);

    const blob = new Blob(["\ufeff" + excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `نموذج 1 كلية ${facName} ${selectedSemester} العام الجامعي ${selectedYear.replace('/', '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير شيت Excel نموذج 1 بنجاح!");
    logAction(`قام بتنزيل جدول المقررات (نموذج 1 - Excel) لكلية ${facName}`, activeFac?.id ? [activeFac.id] : null, selectedYear, selectedSemester);
  };

  const logAction = async (actionText, facultyIds = null, academicYear = null, semester = null) => {
    try {
      await axios.post(`${API}/api/notifications/log`, {
        action_text: actionText,
        faculty_ids: facultyIds,
        academic_year: academicYear,
        semester: semester
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error("Error logging action", error);
    }
  };

  const handlePrintModel1 = () => {
    if (planRows.length === 0) {
      toast.error("لا توجد بيانات مقررات لطباعتها في الخطة.");
      return;
    }
    const facName = activeFac?.name || "الكلية";
    logAction(`قام بطباعة الخطة الدراسية (نموذج 1) لكلية ${facName}`, activeFac?.id ? [activeFac.id] : null, selectedYear, selectedSemester);
    const printHtml = generateModel1Html(true);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة.");
      return;
    }
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const generateModel2Html = (isForPrint = false) => {
    const facName = activeFac?.name || "الكلية";
    const isSingleProgram = programs.length <= 1;
    const progNames = programs.length > 0 ? programs.map(p => p.name).join(" - ") : "المستوى العام";
    const levelNames = Array.from(new Set(courses.map(c => formatLevelToWord(c.level)))).filter(l => l && l !== "--").join(" - ") || "العام";

    const rows = buildProfAggregatedRows();
    let dataRowsHtml = "";

    rows.forEach((r) => {
      const isGreen = (r.serial ? r.serial % 2 === 0 : false);
      const rowBg = isGreen ? "#f0fdf4" : "#ffffff";

      dataRowsHtml += `<tr height="22" style="height: 16.5pt; mso-height-source: auto;">`;
      if (r.isFirstOfProf) {
        dataRowsHtml += `<td rowspan="${r.profSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: normal; vertical-align: middle; border: 1px solid #777; font-size: ${isForPrint ? '8.5pt' : '11pt'}; padding: 2px;">${r.serial}</td>`;
        dataRowsHtml += `<td rowspan="${r.profSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: right; font-weight: bold; padding: 4px 6px; vertical-align: middle; border: 1px solid #777; line-height: 1.25; font-size: ${isForPrint ? '9pt' : '11pt'};">${r.profName}</td>`;
        dataRowsHtml += `<td rowspan="${r.profSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; font-size: ${isForPrint ? '8.5pt' : '11pt'}; white-space: nowrap; padding: 2px 3px;">${r.jobTitle}</td>`;
        dataRowsHtml += `<td rowspan="${r.profSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; font-size: ${isForPrint ? '8.5pt' : '11pt'}; padding: 2px 3px; line-height: 1.2;">${r.workplace}</td>`;
      }
      const validAr = r.nameAr && r.nameAr !== "-" && r.nameAr !== "--";
      const validEn = r.nameEn && r.nameEn !== "-" && r.nameEn !== "--";
      const courseDisplayName = validAr && validEn && r.nameAr.toLowerCase() !== r.nameEn.toLowerCase()
        ? `${r.nameAr} (${r.nameEn})`
        : (validAr ? r.nameAr : (validEn ? r.nameEn : (r.courseName || r.nameAr || r.nameEn || "--")));

      dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: right; font-weight: normal; vertical-align: middle; border: 1px solid #777; padding: 4px 6px; line-height: 1.3; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${courseDisplayName}</td>`;

      if (r.isFirstOfBlock) {
        dataRowsHtml += `<td rowspan="${r.blockSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; padding: 2px; white-space: nowrap; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${r.level || "--"}</td>`;
      }

      if (!isSingleProgram) {
        dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: normal; border: 1px solid #777; padding: 3px 4px; line-height: 1.3; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${r.progLine || "المستوى العام"}</td>`;
      }
      dataRowsHtml += `<td bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; border: 1px solid #777; white-space: nowrap; padding: 2px 4px; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${r.code || "--"}</td>`;

      if (r.isFirstOfBlock) {
        dataRowsHtml += `<td rowspan="${r.blockSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: normal; border: 1px solid #777; padding: 1px; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${fmt(r.hoursTheory)}</td>`;
        dataRowsHtml += `<td rowspan="${r.blockSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: normal; border: 1px solid #777; padding: 1px; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${fmt(r.hoursPractical)}</td>`;
        if (isHealthTech) {
          dataRowsHtml += `<td rowspan="${r.blockSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: normal; border: 1px solid #777; padding: 2px; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${fmt(r.hoursTraining)}</td>`;
          dataRowsHtml += `<td rowspan="${r.blockSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; font-weight: normal; border: 1px solid #777; padding: 2px; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${fmt(r.hoursField)}</td>`;
        }
      }

      if (r.isFirstOfProf) {
        dataRowsHtml += `<td rowspan="${r.profSpan}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; font-weight: bold; color: #1e40af; vertical-align: middle; border: 1px solid #777; padding: 1px; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${fmt(r.totalTheory)}</td>`;
        dataRowsHtml += `<td rowspan="${r.profSpan}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; font-weight: bold; color: #1e40af; vertical-align: middle; border: 1px solid #777; padding: 1px; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${fmt(r.totalPractical)}</td>`;
        if (isHealthTech) {
          dataRowsHtml += `<td rowspan="${r.profSpan}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; font-weight: bold; color: #1e40af; vertical-align: middle; border: 1px solid #777; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${fmt(r.totalTraining)}</td>`;
          dataRowsHtml += `<td rowspan="${r.profSpan}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; font-weight: bold; color: #1e40af; vertical-align: middle; border: 1px solid #777; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${fmt(r.totalField)}</td>`;
        }
      }

      if (r.isFirstOfBlock) {
        dataRowsHtml += `<td rowspan="${r.blockSpan}" bgcolor="${rowBg}" style="background-color: ${rowBg}; text-align: center; vertical-align: middle; border: 1px solid #777; font-size: ${isForPrint ? '8.5pt' : '11pt'};">${r.notes}</td>`;
      }
      dataRowsHtml += `</tr>\n`;
    });

    const totalCols = (isHealthTech ? 17 : 13) - (isSingleProgram ? 1 : 0);
    const footerSummaryHtml = isForPrint ? "" : `
    <tr height="22" style="height: 16.5pt; font-weight: bold; mso-height-source: userset; font-size: 11pt;">
      <td colspan="4" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777; font-size: 11pt;">إجمالي أعضاء هيئة التدريس: ${new Set(planRows.map(r => r.professor_id).filter(Boolean)).size}</td>
      <td colspan="${isSingleProgram ? 3 : 4}" bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777; font-size: 11pt;">إجمالي المواد: ${new Set(planRows.map(r => r.course_id)).size}</td>
      <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777; font-size: 11pt;">${fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0))}</td>
      <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777; font-size: 11pt;">${fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0))}</td>
      ${isHealthTech ? `<td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777; font-size: 11pt;">${fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_training) || 0), 0))}</td><td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; border: 1px solid #777; font-size: 11pt;">${fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_field) || 0), 0))}</td>` : ""}
      <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777; font-size: 11pt;">${fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0))}</td>
      <td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777; font-size: 11pt;">${fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0))}</td>
      ${isHealthTech ? `<td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777; font-size: 11pt;">${fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_training) || 0), 0))}</td><td bgcolor="#f0fdf4" style="background-color: #f0fdf4; text-align: center; color: #1e40af; border: 1px solid #777; font-size: 11pt;">${fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_field) || 0), 0))}</td>` : ""}
      <td bgcolor="#f0fdf4" style="border: 1px solid #777; text-align: center; font-size: 11pt;">الإجمالي العام</td>
    </tr>
    `;

    const model2ColWidths = isHealthTech
      ? [35, 190, 60, 140, 200, 50, 140, 60, 40, 40, 40, 40, 40, 40, 40, 40, 80]
      : (isSingleProgram
          ? [35, 190, 60, 140, 200, 50, 60, 40, 40, 50, 50, 80]
          : [35, 190, 60, 140, 200, 50, 140, 60, 40, 40, 50, 50, 80]);
    const signaturesHtml = renderSignaturesExcel(signatures, totalCols, model2ColWidths);
    const tableHeadersHtml = `
    <tr class="header-row-main" height="34" style="height: 26pt; mso-height-source: userset;">
      <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; padding: 2px 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">م</font></th>
      <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">الاسم</font></th>
      <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">الدرجة</font></th>
      <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">جهة العمل</font></th>
      <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">المادة</font></th>
      <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">المستوى</font></th>
      ${!isSingleProgram ? `<th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 12pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">البرنامج / القسم</font></th>` : ""}
      <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">الكود</font></th>
      <th colspan="${isHealthTech ? 4 : 2}" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; padding: 2px 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">ساعات التدريس</font></th>
      <th colspan="${isHealthTech ? 4 : 2}" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11pt; padding: 2px 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">إجمالي الساعات</font></th>
      <th rowspan="2" bgcolor="#388e3c" style="background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; text-align: center; vertical-align: middle; border: 1px solid #1b5e20; font-size: 11.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact;"><font color="#ffffff">ملاحظات</font></th>
    </tr>
    <tr class="header-row-sub" height="${isHealthTech && isForPrint ? '48' : '26'}" style="height: ${isHealthTech && isForPrint ? '48px' : '20pt'}; mso-height-source: userset;">
      ${renderSubHeaderTh("نظري", isHealthTech, isForPrint)}
      ${renderSubHeaderTh("عملي", isHealthTech, isForPrint)}
      ${isHealthTech ? renderSubHeaderTh("توتوريال", isHealthTech, isForPrint) + renderSubHeaderTh("حقل", isHealthTech, isForPrint) : ""}
      ${renderSubHeaderTh("نظري", isHealthTech, isForPrint)}
      ${renderSubHeaderTh("عملي", isHealthTech, isForPrint)}
      ${isHealthTech ? renderSubHeaderTh("توتوريال", isHealthTech, isForPrint) + renderSubHeaderTh("حقل", isHealthTech, isForPrint) : ""}
    </tr>
    `;

    if (isForPrint) {
      return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>نموذج (2) تدريس - كلية ${facName} - ${selectedSemester} ${selectedYear}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    .main-table thead, thead { display: table-header-group !important; }
    .main-table tfoot, tfoot { display: table-footer-group !important; }
    tr { page-break-inside: avoid !important; }
    @page { size: A4 landscape; margin: 6mm 6mm; }
    body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; margin: 0; padding: 0; color: #000; background: #fff; zoom: 78%; }
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
    .main-table { width: 100%; border-collapse: collapse; margin-top: 2px; direction: rtl; table-layout: fixed; }
    .main-table th, .main-table td { border: 1px solid #777; padding: 3px 4px; font-size: 9pt; text-align: center; vertical-align: middle; word-wrap: break-word; overflow-wrap: break-word; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .header-row-main th { background-color: #388e3c !important; color: #ffffff !important; font-weight: bold; font-size: 10.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header-row-sub th { background-color: #4caf50 !important; color: #ffffff !important; font-weight: bold; font-size: 7.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  <div class="page-border-overlay"></div>
  <div class="print-container">
    <table class="main-table">
      ${isHealthTech ? `
      <colgroup>
        <col style="width: 2.5%;">
        <col style="width: ${isSingleProgram ? "18%" : "15%"};">
        <col style="width: 5%;">
        <col style="width: ${isSingleProgram ? "12%" : "9%"};">
        <col style="width: ${isSingleProgram ? "22%" : "16%"};">
        <col style="width: 5%;">
        ${!isSingleProgram ? `<col style="width: 12%;">` : ""}
        <col style="width: 5%;">
        <col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;">
        <col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;"><col style="width: 2.2%;">
        <col style="width: 6%;">
      </colgroup>
      ` : `
      <colgroup>
        <col style="width: 2.5%;">
        <col style="width: ${isSingleProgram ? "20%" : "16%"};">
        <col style="width: 5.5%;">
        <col style="width: ${isSingleProgram ? "14%" : "11%"};">
        <col style="width: ${isSingleProgram ? "24%" : "18%"};">
        <col style="width: 5.5%;">
        ${!isSingleProgram ? `<col style="width: 12%;">` : ""}
        <col style="width: 5%;">
        <col style="width: 3.5%;"><col style="width: 3.5%;">
        <col style="width: 3.5%;"><col style="width: 3.5%;">
        <col style="width: 6.5%;">
      </colgroup>
      `}
      <thead>
        <tr style="border: none !important;">
          <th colspan="${totalCols}" style="border: none !important; background: transparent !important; color: inherit; padding: 10px 0 4px 0; font-weight: normal;">
            <div style="position: relative; width: 100%; box-sizing: border-box;">
              <div style="position: absolute; left: 0; top: 0; z-index: 10;">
                <img src="${window.location.origin}${logo}" width="80" height="80" style="object-fit: contain; display: block; float: left;" />
              </div>

              <div style="position: absolute; right: 0; top: 0; text-align: right; line-height: 1.35; white-space: nowrap;">
                <div style="font-size: 13.5pt; font-weight: bold; color: #1b5e20;">جامعة المنوفية الأهلية</div>
                <div style="font-size: 11pt; font-weight: bold; color: #222; margin-top: 2px;">شئون التعليم والطلاب</div>
              </div>

              <div style="width: 100%; text-align: center; line-height: 1.35; padding: 0 140px; box-sizing: border-box;">
                <div style="font-size: 15.5pt; font-weight: bold; color: #1b5e20; white-space: nowrap;">${facName.startsWith("كلية") ? facName : `كلية ${facName}`}</div>
                <div style="font-size: 11.5pt; font-weight: bold; color: #222; margin-top: 2px; white-space: nowrap;">${(isSingleProgram && progNames) ? `برنامج: ${progNames}` : "&nbsp;"}</div>
              </div>

              <div style="width: 100%; text-align: right; font-weight: bold; font-size: 11.5pt; color: #1b5e20; margin-top: 6px; margin-bottom: 2px; padding-right: 2px; padding-left: 115px; box-sizing: border-box; line-height: 1.35;">
                بيان بالسادة أعضاء هيئة التدريس والهيئة المعاونة القائمين بالتدريس في ${selectedSemester} للعام الجامعي ${selectedYear} م &nbsp;&nbsp;&nbsp; نموذج (2) تدريس ( نظام ساعات معتمدة )
              </div>
            </div>
          </th>
        </tr>
        ${tableHeadersHtml}
      </thead>
      <tbody>${dataRowsHtml}</tbody>
      <tfoot>
        <tr style="border: none !important;">
          <td colspan="${totalCols}" style="border: none !important; background: transparent !important; padding: 12px 0 0 0;">
            ${renderSignaturesPrint(signatures)}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</body>
</html>
`;
    }

    const excelTemplate = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40" dir="rtl" lang="ar">
<head>
  <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
  <!--[if gte mso 9]>
  <xml>
  <x:ExcelWorkbook>
  <x:ExcelWorksheets>
  <x:ExcelWorksheet>
  <x:Name>نموذج_2_جدول_الأساتذة</x:Name>
  <x:WorksheetOptions>
  <x:DisplayRightToLeft/>
  <x:Selected/>
  <x:FreezePanes/>
  <x:FrozenNoSplit/>
  <x:SplitHorizontal>5</x:SplitHorizontal>
  <x:TopRowBottomPane>5</x:TopRowBottomPane>
  <x:ActivePane>2</x:ActivePane>
  </x:WorksheetOptions>
  </x:ExcelWorksheet>
  </x:ExcelWorksheets>
  </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>body { font-family: "Cairo", Arial, sans-serif; direction: rtl; text-align: right; } table { border-collapse: collapse; direction: rtl; width: 100%; table-layout: auto !important; } tr { mso-height-source: auto !important; height: auto !important; } th { border: 1px solid #1b5e20; } td { padding: 6px 10px; font-size: 11pt; vertical-align: middle !important; white-space: nowrap !important; height: auto !important; mso-height-source: auto !important; } .header-title, .header-title font, .header-title b { font-size: 13pt !important; } .signature-cell, .signature-cell font, .signature-cell b { font-size: 11pt !important; white-space: normal !important; text-align: center !important; } td.no-border, .no-border, .no-border td { border: none !important; border-style: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; white-space: nowrap !important; height: auto !important; }</style>
</head>
<body>
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td colspan="2" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; color: #1b5e20; vertical-align: middle;"><font color="#1b5e20" size="4" style="font-size: 13pt;"><b>جامعة المنوفية الأهلية</b></font></td>
      <td colspan="${totalCols - 3}" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; color: #1b5e20; vertical-align: middle;"><font color="#1b5e20" size="4" style="font-size: 13pt;"><b>${facName.startsWith("كلية") ? facName : `كلية ${facName}`}</b></font></td>
      <td colspan="1" rowspan="2" class="no-border" align="center" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; vertical-align: middle; padding: 0;"><img src="${window.location.origin}${logo}" width="65" height="65" style="display: block; margin: 0 auto;" /></td>
    </tr>
    <tr>
      <td colspan="2" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; vertical-align: middle;"><font size="4" style="font-size: 13pt;"><b>شئون التعليم والطلاب</b></font></td>
      <td colspan="${totalCols - 3}" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; color: #222; vertical-align: middle;"><font size="4" style="font-size: 13pt;"><b>${(isSingleProgram && progNames) ? `برنامج: ${progNames}` : ""}</b></font></td>
    </tr>
    <tr>
      <td colspan="${totalCols}" class="no-border header-title" style="border: none !important; mso-border-alt: none !important; border-top: none !important; border-bottom: none !important; border-left: none !important; border-right: none !important; text-align: center; font-weight: bold; font-size: 13pt !important; color: #1b5e20; padding: 3px 0;"><font color="#1b5e20" size="4" style="font-size: 13pt;"><b>بيان بالسادة أعضاء هيئة التدريس والهيئة المعاونة القائمين بالتدريس في ${selectedSemester} للعام الجامعي ${selectedYear} م &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; نموذج (2) تدريس ( نظام ساعات معتمدة )</b></font></td>
    </tr>
    ${tableHeadersHtml}
    ${dataRowsHtml}
    ${footerSummaryHtml}
    ${signaturesHtml}
  </table>
</body>
</html>
`;

    return excelTemplate;
  };
  const handleExportExcelModel2 = () => {
    if (planRows.length === 0) {
      toast.error("لا توجد بيانات مقررات أو أساتذة لتصديرها في الخطة.");
      return;
    }
    const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
    const facName = activeFac?.name || "الكلية";
    const excelContent = generateModel2Html(false);

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `نموذج 2 كلية ${facName} ${selectedSemester} العام الجامعي ${selectedYear.replace('/', '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير شيت Excel نموذج 2 بنجاح!");
    logAction(`قام بتنزيل جدول الأساتذة والمقررات (نموذج 2 - Excel) لكلية ${facName}`, activeFac?.id ? [activeFac.id] : null, selectedYear, selectedSemester);
  };

  const handlePrintModel2 = () => {
    if (planRows.length === 0) {
      toast.error("لا توجد بيانات مقررات أو أساتذة لطباعتها في الخطة.");
      return;
    }
    const facName = activeFac?.name || "الكلية";
    logAction(`قام بطباعة بيانات أعضاء هيئة التدريس بالخطة الدراسية (نموذج 2) لكلية ${facName}`, activeFac?.id ? [activeFac.id] : null, selectedYear, selectedSemester);
    const htmlContent = generateModel2Html(true);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("الرجاء السماح بالنوافذ المنبثقة لطباعة الخطة.");
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleOpenImportModal = () => {
    setImportFile(null);
    setImportErrors([]);
    setImportPreviewData([]);
    setImportMode("append");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowImportModal(true);
  };

  const handleDownloadImportTemplate = async () => {
    const targetFacId = selectedFaculty;
    const facObj = faculties.find(f => String(f.id) === String(targetFacId));
    const facName = facObj?.name || "الكلية";
    const isHealthTech = Boolean(facName.includes("تكنولوجيا العلوم الصحية") || facName.includes("العلوم الصحية"));

    setIsDownloadingTemplate(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "جامعة المنوفية الأهلية";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("نموذج الخطة الدراسية", {
        views: [{ rtl: true }]
      });

      // Define columns based on faculty
      const columns = [
        { header: "كود المقرر *", key: "course_code", width: 18 },
        { header: "اسم البرنامج 1 *", key: "program_1", width: 28 },
        { header: "اسم البرنامج 2 (اختياري)", key: "program_2", width: 28 },
        { header: "عدد الطلاب", key: "student_count", width: 14 },
        { header: "عدد المجموعات نظري", key: "groups_theory", width: 20 },
        { header: "عدد المجموعات عملي", key: "groups_practical", width: 20 },
      ];

      if (isHealthTech) {
        columns.push(
          { header: "عدد المجموعات توتوريال", key: "groups_training", width: 22 },
          { header: "عدد المجموعات حقل", key: "groups_field", width: 20 }
        );
      }

      columns.push(
        { header: "الرقم القومي للأستاذ *", key: "national_id", width: 25 },
        { header: "ساعات نظري للأستاذ *", key: "hours_theory", width: 22 },
        { header: "ساعات عملي للأستاذ", key: "hours_practical", width: 22 }
      );

      if (isHealthTech) {
        columns.push(
          { header: "ساعات توتوريال للأستاذ", key: "hours_training", width: 24 },
          { header: "ساعات حقل للأستاذ", key: "hours_field", width: 22 }
        );
      }

      worksheet.columns = columns;

      // Style Header Row (Row 1)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 32;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1B5E20" }
        };
        cell.font = {
          name: "Cairo",
          size: 11,
          bold: true,
          color: { argb: "FFFFFFFF" }
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFC8E6C9" } },
          left: { style: "thin", color: { argb: "FFC8E6C9" } },
          bottom: { style: "medium", color: { argb: "FFFFFFFF" } },
          right: { style: "thin", color: { argb: "FFC8E6C9" } }
        };
      });

      // Sample Row Data
      let sampleCourseCode = "BAS 003";
      let sampleProgName = "الأمن السيبراني";
      let sampleNatId = "29001011701234";

      if (String(targetFacId) === String(selectedFaculty)) {
        if (courses && courses.length > 0 && courses[0].code) sampleCourseCode = courses[0].code;
        if (programs && programs.length > 0 && programs[0].name) sampleProgName = programs[0].name;
      }
      if (professors && professors.length > 0 && professors[0].national_id) {
        sampleNatId = professors[0].national_id;
      }

      const sampleRowData = {
        course_code: sampleCourseCode,
        program_1: sampleProgName,
        program_2: "",
        student_count: 120,
        groups_theory: 1,
        groups_practical: 2,
        national_id: sampleNatId,
        hours_theory: 2,
        hours_practical: 4
      };

      if (isHealthTech) {
        sampleRowData.groups_training = 1;
        sampleRowData.groups_field = 1;
        sampleRowData.hours_training = 2;
        sampleRowData.hours_field = 2;
      }

      const row1 = worksheet.addRow(sampleRowData);
      row1.height = 25;
      row1.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { name: "Cairo", size: 10 };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanFac = facName.replace(/[/\\?%*:|"<>]/g, "-");
      a.download = `نموذج_استيراد_الخطة_الدراسية_${cleanFac}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`تم تحميل نموذج Excel المخصص لـ (${facName}) بنجاح`);
    } catch (err) {
      console.error("Error generating Excel template", err);
      toast.error("حدث خطأ أثناء إنشاء وتحميل النموذج");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleProcessImportFile = async (e) => {
    const file = e.target.files?.[0] || importFile;
    if (!file) {
      toast.error("يرجى اختيار ملف Excel أولاً.");
      return;
    }
    setImportFile(file);
    setImporting(true);
    setImportErrors([]);
    setImportPreviewData([]);

    try {
      const targetFacId = selectedFaculty;
      const facObj = faculties.find(f => String(f.id) === String(targetFacId));
      const facName = facObj?.name || "الكلية المختارة";
      const isHealthTech = Boolean(facName.includes("تكنولوجيا العلوم الصحية") || facName.includes("العلوم الصحية"));

      const targetCourses = courses;
      const targetPrograms = programs;

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setImportErrors(["ملف Excel لا يحتوي على أي صفحات عمل (Sheets)."]);
        setImporting(false);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        setImportErrors(["الملف فارغ ولا يحتوي على أي بيانات مقررات."]);
        setImporting(false);
        return;
      }

      const sampleKeys = Object.keys(rawRows[0] || {});
      const findKey = (patterns) => {
        return sampleKeys.find(k => {
          const norm = String(k || '').replace(/[*_()]/g, '').trim();
          return patterns.some(p => norm.includes(p));
        });
      };

      const codeKey = findKey(["كود المقرر", "كود الماده", "كود المادة", "الكود", "course_code"]);
      const prog1Key = findKey(["اسم البرنامج 1", "البرنامج 1", "اسم البرنامج", "البرنامج", "program_1"]);
      const prog2Key = findKey(["اسم البرنامج 2", "البرنامج 2", "برنامج 2", "program_2"]);
      const stdCountKey = findKey(["عدد الطلاب", "الطلاب", "student_count"]);
      const grThKey = findKey(["المجموعات نظري", "مجموعات نظري", "groups_theory"]);
      const grPrKey = findKey(["المجموعات عملي", "مجموعات عملي", "groups_practical"]);
      const grTrKey = findKey(["المجموعات توتوريال", "مجموعات توتوريال", "groups_training"]);
      const grFldKey = findKey(["المجموعات حقل", "مجموعات حقل", "groups_field"]);
      const natIdKey = findKey(["الرقم القومي للأستاذ", "الرقم القومي للاستاذ", "الرقم القومي", "الرقم القومى", "national_id"]);
      const thHoursKey = findKey(["ساعات نظري للأستاذ", "ساعات نظري للاستاذ", "ساعات نظري", "ساعات النظري", "نظري للأستاذ", "hours_theory"]);
      const prHoursKey = findKey(["ساعات عملي للأستاذ", "ساعات عملي للاستاذ", "ساعات عملي", "ساعات العملي", "عملي للأستاذ", "hours_practical"]);
      const trHoursKey = findKey(["ساعات توتوريال للأستاذ", "ساعات توتوريال للاستاذ", "ساعات توتوريال", "توتوريال للأستاذ", "hours_training"]);
      const fldHoursKey = findKey(["ساعات حقل للأستاذ", "ساعات حقل للاستاذ", "ساعات حقل", "حقل للأستاذ", "hours_field"]);

      if (!codeKey) {
        setImportErrors(["لم يتم العثور على عمود (كود المقرر) في الملف. يرجى استخدام النموذج المعتمد."]);
        setImporting(false);
        return;
      }
      if (!prog1Key) {
        setImportErrors(["لم يتم العثور على عمود (اسم البرنامج 1) في الملف. يرجى استخدام النموذج المعتمد."]);
        setImporting(false);
        return;
      }
      if (!natIdKey) {
        setImportErrors(["لم يتم العثور على عمود (الرقم القومي للأستاذ) في الملف. يرجى استخدام النموذج المعتمد."]);
        setImporting(false);
        return;
      }
      if (!thHoursKey) {
        setImportErrors(["لم يتم العثور على عمود (ساعات نظري للأستاذ) في الملف. يرجى استخدام النموذج المعتمد."]);
        setImporting(false);
        return;
      }

      const errors = [];
      const parsedRows = [];

      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2;

        const values = Object.values(row).map(v => String(v || '').trim()).filter(Boolean);
        if (values.length === 0) return;

        // 1. كود المقرر (تحقق المسافات الزائدة وصحة الكود)
        const rawCodeVal = row[codeKey] !== undefined ? String(row[codeKey]) : "";
        if (!rawCodeVal.trim()) {
          errors.push(`الصف ${rowNum}: كود المقرر حقل إلزامي مطلوب.`);
          return;
        }

        if (rawCodeVal !== rawCodeVal.trim()) {
          errors.push(`الصف ${rowNum}: كود المقرر "${rawCodeVal}" يحتوي على مسافة زائدة في البداية أو النهاية، يرجى إزالتها وتصحيح الكود.`);
        }

        const cleanCode = rawCodeVal.trim();
        const courseObj = targetCourses.find(c => c.code && c.code.trim().toUpperCase() === cleanCode.toUpperCase());
        if (!courseObj) {
          errors.push(`الصف ${rowNum}: كود المقرر "${cleanCode}" غير صحيح أو غير مسجل في مقررات ${facName}.`);
        }

        // 2. اسم البرنامج 1
        const rawProg1Val = row[prog1Key] !== undefined ? String(row[prog1Key]).trim() : "";
        if (!rawProg1Val) {
          errors.push(`الصف ${rowNum}: اسم البرنامج 1 حقل إلزامي مطلوب.`);
        }
        const prog1Obj = rawProg1Val ? targetPrograms.find(p => p.name && p.name.trim().toLowerCase() === rawProg1Val.toLowerCase()) : null;
        if (rawProg1Val && !prog1Obj) {
          errors.push(`الصف ${rowNum}: اسم البرنامج 1 "${rawProg1Val}" غير مسجل ضمن برامج ${facName}.`);
        }

        // 3. اسم البرنامج 2 (اختياري)
        const rawProg2Val = (prog2Key && row[prog2Key] !== undefined) ? String(row[prog2Key]).trim() : "";
        let prog2Obj = null;
        if (rawProg2Val) {
          prog2Obj = targetPrograms.find(p => p.name && p.name.trim().toLowerCase() === rawProg2Val.toLowerCase());
          if (!prog2Obj) {
            errors.push(`الصف ${rowNum}: اسم البرنامج 2 "${rawProg2Val}" غير مسجل ضمن برامج ${facName}.`);
          }
        }

        // 4. الرقم القومي للأستاذ
        const rawNatIdVal = row[natIdKey] !== undefined ? String(row[natIdKey]).trim().replace(/\.0$/, '') : "";
        if (!rawNatIdVal) {
          errors.push(`الصف ${rowNum}: الرقم القومي للأستاذ حقل إلزامي مطلوب.`);
        }
        const profObj = rawNatIdVal ? professors.find(p => p.national_id && String(p.national_id).trim().replace(/\.0$/, '') === rawNatIdVal) : null;
        if (rawNatIdVal && !profObj) {
          errors.push(`الصف ${rowNum}: لم يتم العثور على عضو هيئة تدريس بالرقم القومي (${rawNatIdVal}) في قاعدة البيانات.`);
        }

        // 5. الساعات التدريسية نظري للأستاذ
        const rawThHoursVal = row[thHoursKey];
        const thVal = (rawThHoursVal !== undefined && rawThHoursVal !== null && String(rawThHoursVal).trim() !== "") ? Number(rawThHoursVal) : NaN;
        if (isNaN(thVal) || thVal < 0) {
          errors.push(`الصف ${rowNum}: ساعات النظري للأستاذ حقل إلزامي، يجب إدخال قيمة رقمية صحيحة (0 أو أكثر).`);
        }

        if (courseObj && prog1Obj && profObj && !isNaN(thVal) && thVal >= 0 && rawCodeVal === rawCodeVal.trim()) {
          const prVal = (prHoursKey && row[prHoursKey] !== undefined && String(row[prHoursKey]).trim() !== "") ? (Number(row[prHoursKey]) || 0) : 0;
          const trVal = isHealthTech && trHoursKey && row[trHoursKey] !== undefined ? (Number(row[trHoursKey]) || 0) : 0;
          const fldVal = isHealthTech && fldHoursKey && row[fldHoursKey] !== undefined ? (Number(row[fldHoursKey]) || 0) : 0;

          const stdCount = (stdCountKey && row[stdCountKey] !== undefined) ? (parseInt(row[stdCountKey]) || 0) : 0;
          const grTh = (grThKey && row[grThKey] !== undefined) ? (parseInt(row[grThKey]) || 0) : 0;
          const grPr = (grPrKey && row[grPrKey] !== undefined) ? (parseInt(row[grPrKey]) || 0) : 0;
          const grTr = (isHealthTech && grTrKey && row[grTrKey] !== undefined) ? (parseInt(row[grTrKey]) || 0) : 0;
          const grFld = (isHealthTech && grFldKey && row[grFldKey] !== undefined) ? (parseInt(row[grFldKey]) || 0) : 0;

          const cReqTh = (Number(courseObj.theory_hours) || 0) * grTh;
          const cReqPr = (Number(courseObj.practical_hours) || 0) * grPr;
          const cReqTr = (Number(courseObj.exercise_hours) || 0) * grTr;
          const cReqFld = (Number(courseObj.activity_hours) || 0) * grFld;

          const programIds = [prog1Obj.id];
          if (prog2Obj) programIds.push(prog2Obj.id);

          parsedRows.push({
            base_course_id: courseObj.id,
            course_id: courseObj.id,
            code: courseObj.code,
            nameAr: courseObj.name_ar,
            nameEn: courseObj.name_en || "",
            level: courseObj.level || "",
            program_id: prog1Obj.id,
            program_ids: programIds,
            program_names: [prog1Obj.name, prog2Obj?.name].filter(Boolean).join("، "),
            student_count: stdCount,
            groups_theory: grTh,
            groups_practical: grPr,
            groups_training: grTr,
            groups_field: grFld,
            groups_activity: grFld,
            professor_id: profObj.id,
            professor_name: profObj.name_ar || profObj.name,
            prof_job_title: profObj.job_title || "",
            prof_workplace: profObj.original_workplace || "",
            hours_actual_theory: thVal,
            hours_actual_practical: prVal,
            hours_actual_training: trVal,
            hours_actual_field: fldVal,
            req_theory: cReqTh,
            req_practical: cReqPr,
            req_training: cReqTr,
            req_field: cReqFld,
            notes: "",
            prof_notes: "",
            course_notes: "",
            _key: Date.now() + Math.random()
          });
        }
      });

      if (errors.length > 0) {
        setImportErrors(errors);
        setImportPreviewData([]);
      } else if (parsedRows.length === 0) {
        setImportErrors(["لم يتم العثور على أي صفوف صالحة للاستيراد في الملف."]);
        setImportPreviewData([]);
      } else {
        setImportErrors([]);
        setImportPreviewData(parsedRows);
        toast.success(`تم فحص وتدقيق الملف بنجاح! تم استخراج ${parsedRows.length} سجل مطابق.`);
      }
    } catch (err) {
      console.error("Error processing import file", err);
      setImportErrors(["حدث خطأ غير متوقع أثناء قراءة ملف Excel: " + (err.message || String(err))]);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = () => {
    if (!importPreviewData || importPreviewData.length === 0) {
      toast.error("لا توجد بيانات جاهزة للاستيراد.");
      return;
    }

    if (importMode === "replace") {
      setPlanRows(importPreviewData);
    } else {
      setPlanRows(prev => [...prev, ...importPreviewData]);
    }

    setShowImportModal(false);
    toast.success(`تم استيراد ${importPreviewData.length} سجل بنجاح في جدول الخطة الدراسية! يرجى مراجعتها ثم الضغط على "حفظ الخطة".`);
  };

  const profAggRows = buildProfAggregatedRows();

  return (
    <Container fluid className="p-4" style={{ fontFamily: "Cairo, Arial, sans-serif", direction: "rtl", textAlign: "right", backgroundColor: "#f4f6f9", minHeight: "100vh" }}>
      {/* ── 1. Header ── */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <h2 style={{ margin: 0, fontWeight: "bold", color: "#2e7d32" }} className="d-flex align-items-center gap-2">
            <FaCalendarAlt className="text-success" style={{ marginLeft: "10px" }} /> الخطة الدراسية
          </h2>
        </div>
        <div className="d-flex gap-2 flex-wrap no-print">
          <Button variant="outline-success" className="fw-bold" onClick={handlePrintModel1}>
            <FaPrint className="ms-1" /> طباعة جدول المقررات
          </Button>
          <Button variant="warning" className="fw-bold text-white" style={{ backgroundColor: "#d97706", borderColor: "#d97706" }} onClick={handleExportExcelModel1}>
            <FaFileExcel className="ms-1" /> Excel نموذج 1
          </Button>
          <Button variant="outline-primary" className="fw-bold" onClick={handlePrintModel2}>
            <FaPrint className="ms-1" /> طباعة جدول الأساتذة
          </Button>
          <Button variant="warning" className="fw-bold text-white" style={{ backgroundColor: "#d97706", borderColor: "#d97706" }} onClick={handleExportExcelModel2}>
            <FaFileExcel className="ms-1" /> Excel نموذج 2
          </Button>
        </div>
      </div>

      {/* ── 2. Filter Card ── */}
      <Card className="mb-4 shadow-sm" style={{ border: "1px solid #c8e6c9", borderRadius: "10px" }}>
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold text-dark">الكلية</Form.Label>
                <Form.Select value={selectedFaculty} onChange={handleFacultyChange}>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold text-dark">العام الجامعي</Form.Label>
                <Form.Select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                  {(academicYears.length > 0 ? academicYears : YEARS).map(y => <option key={y} value={y}>{y}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold text-dark">الفصل الدراسي</Form.Label>
                <Form.Select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── 3. Add & Import Buttons (تختفي عند إنهاء الخطة) ── */}
      {!isPlanLocked && !loading && (
        <div className="d-flex justify-content-start gap-2 mb-3 no-print flex-wrap">
          <Button variant="warning" className="fw-bold text-white shadow-sm" onClick={openModal} style={{ backgroundColor: "#d97706", borderColor: "#d97706" }}>
            <FaPlus className="ms-2" /> إضافة مقرر للخطة
          </Button>
          <Button 
            variant="warning" 
            className={`fw-bold shadow-sm btn-copy-plan-glow ${isCopyGlowActive ? 'glow-active' : ''}`} 
            onClick={handleOpenCopyModal}
            style={{ color: '#78350f' }}
          >
            <FaCopy className="ms-2" style={{ color: '#78350f' }} /> نسخ خطة من عام سابق
          </Button>
          <Button 
            variant="success" 
            className="fw-bold text-white shadow-sm d-flex align-items-center gap-2" 
            onClick={handleOpenImportModal}
            style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
          >
            <FaFileExcel className="ms-1 fs-5" /> استيراد الخطة من Excel / تحميل نموذج
          </Button>
        </div>
      )}

      {loading ? (
        <Card className="shadow-sm p-5 text-center mb-4 border-0" style={{ borderRadius: "10px" }}>
          <Card.Body className="d-flex flex-column align-items-center justify-content-center py-5">
            <Spinner animation="border" variant="success" style={{ width: "3.5rem", height: "3.5rem" }} />
            <h5 className="mt-4 text-success fw-bold">جاري تحميل الخطة الدراسية...</h5>
          </Card.Body>
        </Card>
      ) : (
        <>
          {isMedicine ? (
            <Card className="shadow-sm mb-3" style={{ border: "1px solid #ddd", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <Table responsive bordered className="m-0 text-center align-middle study-plan-custom-table" style={{ fontSize: "13.5px", minWidth: "1500px", borderColor: "#bbb" }}>
                  <thead style={{ fontSize: "14.5px" }}>
                    <tr style={{ backgroundColor: "#1b5e20", color: "#fff", fontWeight: "bold" }}>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>المقرر / الحزمة</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={2}>الساعات باللائحة</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>عدد الطلاب</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={2}>عدد المجموعات</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={2}>الساعات المطلوبة</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>القسم العلمي</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>اسم عضو هيئة التدريس</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>الدرجة</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>جهة القدوم</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={2}>اجمالي الساعات المنفذة</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>ملاحظات</th>
                      {!isPlanLocked && <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>إجراءات</th>}
                    </tr>
                    <tr style={{ backgroundColor: "#2e7d32", color: "#fff", fontWeight: "bold" }}>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>عملي</th>

                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>عملي</th>

                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>عملي</th>

                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>تمارين / عملي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderMedicineTableRows()}
                  </tbody>
                  {planRows.length > 0 && (
                    <tfoot style={{ backgroundColor: "#f8f9fa", fontWeight: "bold", borderTop: "2px solid #1b5e20" }}>
                      <tr className="align-middle text-center">
                        <td className="text-end px-3">
                          إجمالي المواد: <span className="text-success">{new Set(planRows.map(r => r.course_id)).size}</span>
                        </td>
                        <td>{fmt(planRows.reduce((s, r) => s + (Number(r.theory_hours || 0)), 0))}</td>
                        <td>{fmt(planRows.reduce((s, r) => s + (Number(r.practical_hours || 0)), 0))}</td>
                        <td>{planRows.reduce((s, r) => s + (Number(r.student_count || 0)), 0) || "--"}</td>
                        <td>{planRows.reduce((s, r) => s + (Number(r.groups_theory || 0)), 0) || "--"}</td>
                        <td>{planRows.reduce((s, r) => s + (Number(r.groups_practical || 0)), 0) || "--"}</td>
                        <td>{fmt(planRows.reduce((s, r) => s + (Number(r.req_theory || 0)), 0))}</td>
                        <td>{fmt(planRows.reduce((s, r) => s + (Number(r.req_practical || 0)), 0))}</td>
                        <td colSpan={4} className="text-primary text-center">إجمالي أعضاء هيئة التدريس: {new Set(planRows.map(r => r.professor_id).filter(Boolean)).size}</td>
                        <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_theory || 0)), 0))}</td>
                        <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_practical || 0)), 0))}</td>
                        <td>--</td>
                        {!isPlanLocked && <td className="bg-light">الإجمالي العام</td>}
                      </tr>
                    </tfoot>
                  )}
                </Table>
              </div>
            </Card>
          ) : (
            <Card className="shadow-sm mb-3" style={{ border: "1px solid #ddd", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <Table responsive bordered className="m-0 text-center align-middle study-plan-custom-table" style={{ fontSize: "13.5px", minWidth: isHealthTech ? "1650px" : "1200px", borderColor: "#bbb" }}>
                  <thead style={{ fontSize: "14.5px" }}>
                    <tr style={{ backgroundColor: "#1b5e20", color: "#fff", fontWeight: "bold" }}>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff", minWidth: "190px", width: "210px" }} rowSpan={2}>{isMedicine ? "المقرر / الحزمة" : "اسم المادة"}</th>
                      {!isMedicine && <th style={{ backgroundColor: "#1b5e20", color: "#fff", minWidth: "95px", width: "105px", whiteSpace: "nowrap" }} rowSpan={2}>الكود</th>}
                      {!isMedicine && hasMultiplePrograms && !isHealthTech && <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>البرنامج</th>}
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={isMedicine ? 3 : (isHealthTech ? 4 : 2)}>الساعات باللائحة</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>عدد الطلاب</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={isMedicine ? 3 : (isHealthTech ? 4 : 2)}>عدد المجموعات</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={isMedicine ? 3 : (isHealthTech ? 4 : 2)}>الساعات المطلوبة</th>
                      {isMedicine && <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>القسم العلمي</th>}
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>اسم عضو هيئة التدريس</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>الدرجة</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff", minWidth: isHealthTech ? "180px" : "130px", width: isHealthTech ? "200px" : undefined }} rowSpan={2}>جهة القدوم</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={isHealthTech ? 4 : 2}>اجمالي الساعات المنفذة</th>
                      <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>ملاحظات</th>
                      {!isPlanLocked && <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>إجراءات</th>}
                    </tr>
                    <tr style={{ backgroundColor: "#2e7d32", color: "#fff", fontWeight: "bold" }}>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>عملي</th>
                      {isMedicine && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>أنشطة</th>}
                      {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>توتوريال</th>}
                      {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>حقل</th>}

                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>عملي</th>
                      {isMedicine && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>أنشطة</th>}
                      {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>توتوريال</th>}
                      {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>حقل</th>}

                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>عملي</th>
                      {isMedicine && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>أنشطة</th>}
                      {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>توتوريال</th>}
                      {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>حقل</th>}

                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                      <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>{isHealthTech ? "عملي" : "تمارين / عملي"}</th>
                      {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>توتوريال</th>}
                      {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>حقل</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {renderRows.length === 0 ? (
                      <tr>
                        <td colSpan={isMedicine ? (isPlanLocked ? 18 : 19) : (isHealthTech ? (isPlanLocked ? 23 : 24) : (hasMultiplePrograms ? (isPlanLocked ? 16 : 17) : (isPlanLocked ? 15 : 16)))} className="text-center p-4 text-muted">
                          <FaInfoCircle className="m-1" />
                          لا توجد مقررات مضافة في هذه الخطة
                        </td>
                      </tr>
                    ) : renderRows.map((r, idx) => {
                      const c = courses.find(x => String(x.id) === String(r.course_id)) || {};
                      const prof = professors.find(x => String(x.id) === String(r.professor_id)) || {};
                      const activeModule = c.modules?.find(m => String(m.id) === String(r.module_id)) || {};

                      const bylawTheory = isMedicine ? (activeModule.theory_hours ?? c.theory_hours ?? "--") : (c.theory_hours ? fmt(c.theory_hours) : "--");
                      const bylawPrac = isMedicine ? (activeModule.practical_hours ?? c.practical_hours ?? "--") : (c.practical_hours ? fmt(c.practical_hours) : "--");
                      const bylawAct = isMedicine ? (activeModule.activity_hours ?? "--") : "--";
                      const bylawTr = c.exercise_hours ? fmt(c.exercise_hours) : "--";
                      const bylawFld = c.activity_hours ? fmt(c.activity_hours) : "--";

                      const reqTh = isMedicine
                        ? ((Number(activeModule.theory_hours) || 0) * (Number(r.groups_theory) || 0))
                        : ((Number(r.req_theory) > 0) ? Number(r.req_theory) : ((Number(c.theory_hours) || Number(r.theory_hours) || 0) * (Number(r.groups_theory) || 0)));

                      const reqPr = isMedicine
                        ? ((Number(activeModule.practical_hours) || 0) * (Number(r.groups_practical) || 0))
                        : ((Number(r.req_practical) > 0) ? Number(r.req_practical) : ((Number(c.practical_hours) || Number(r.practical_hours) || 0) * (Number(r.groups_practical) || 0)));

                      const reqAct = isMedicine
                        ? ((Number(activeModule.activity_hours) || 0) * (Number(r.groups_activity) || 0))
                        : "--";

                      const reqTr = (Number(r.req_training) > 0)
                        ? Number(r.req_training)
                        : ((Number(c.exercise_hours) || Number(r.exercise_hours) || 0) * (Number(r.groups_training) || 0));

                      const reqFld = (Number(r.req_field) > 0)
                        ? Number(r.req_field)
                        : ((Number(c.activity_hours) || Number(r.activity_hours) || 0) * (Number(r.groups_field) || 0));

                      const isGreenRow = (r.serial ? r.serial % 2 === 0 : idx % 2 === 1);

                      return (
                        <tr key={r._key || idx} className={`align-middle text-center ${isGreenRow ? "row-green" : "row-white"}`} style={{ borderBottom: "1px solid #ccc" }}>
                          {r.isFirstInCourse && (() => {
                            const block = getCourseBlockInfo(r);
                            const prim = block.primary;
                            const hasSec = block.secondaryList.length > 0;
                            const progLines = (block.programsList && block.programsList.length > 0) ? block.programsList : getProgramDisplayList(r.program_id, r.course_id, r);

                            const cellHalfStyle = { flex: "1 1 50%", height: "50%", minHeight: "50%", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 6px", boxSizing: "border-box" };
                            const cellSecStyle = { flex: "1 1 50%", height: "50%", minHeight: "50%", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 6px", borderTop: "1px solid #ccc", boxSizing: "border-box" };

                            return (
                              <>
                                {/* 1. اسم المادة */}
                                <td rowSpan={r.courseSpan} className="text-center align-middle p-0" style={{ minWidth: "190px", width: "210px", height: "1px" }}>
                                  <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                                    <div style={cellHalfStyle}>
                                      <div className="fw-bold text-dark" style={{ fontSize: "14.5px" }}>{prim.nameAr || prim.nameEn || "--"}</div>
                                      {prim.nameEn && prim.nameAr && prim.nameAr.toLowerCase() !== prim.nameEn.toLowerCase() && (
                                        <div className="text-secondary small font-sans dir-ltr">{prim.nameEn}</div>
                                      )}
                                    </div>
                                    {hasSec && block.secondaryList.map((sc, scIdx) => (
                                      <div key={scIdx} style={cellSecStyle}>
                                        <div className="fw-bold text-dark" style={{ fontSize: "14px" }}>{sc.nameAr || sc.nameEn || sc.code}</div>
                                        {sc.nameEn && sc.nameAr && sc.nameAr.toLowerCase() !== sc.nameEn.toLowerCase() && (
                                          <div className="text-secondary small font-sans dir-ltr">{sc.nameEn}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </td>

                                {/* 2. الكود */}
                                {!isMedicine && (
                                  <td rowSpan={r.courseSpan} className="text-secondary fw-bold align-middle p-0" style={{ minWidth: "95px", width: "105px", whiteSpace: "nowrap", height: "1px" }}>
                                    <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column", whiteSpace: "nowrap" }}>
                                      <div style={{ ...cellHalfStyle, whiteSpace: "nowrap" }}>{prim.code || "--"}</div>
                                      {hasSec && block.secondaryList.map((sc, scIdx) => (
                                        <div key={scIdx} className="text-muted" style={{ ...cellSecStyle, whiteSpace: "nowrap" }}>{sc.code || "--"}</div>
                                      ))}
                                    </div>
                                  </td>
                                )}

                                {/* 3. البرنامج */}
                                {!isMedicine && hasMultiplePrograms && !isHealthTech && (
                                  <td rowSpan={r.courseSpan} className="text-center align-middle fw-bold p-0" style={{ minWidth: "150px", height: "1px" }}>
                                    <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                                      <div style={cellHalfStyle}>{progLines[0] || "المستوى العام"}</div>
                                      {hasSec && (progLines.slice(1).length > 0 ? progLines.slice(1) : [progLines[0]]).map((pLine, pIdx) => (
                                        <div key={pIdx} style={cellSecStyle}>{pLine}</div>
                                      ))}
                                    </div>
                                  </td>
                                )}

                                {/* 4. اللائحة */}
                                {isMedicine ? (
                                  r.isFirstInModule && (
                                    <>
                                      <td rowSpan={r.moduleSpan} className="align-middle fw-bold">{fmt(bylawTheory)}</td>
                                      <td rowSpan={r.moduleSpan} className="align-middle fw-bold">{fmt(bylawPrac)}</td>
                                      <td rowSpan={r.moduleSpan} className="align-middle fw-bold">{fmt(bylawAct)}</td>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <td rowSpan={r.courseSpan} className="align-middle p-0" style={{ height: "1px" }}>
                                      <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                                        <div style={cellHalfStyle}>{prim.bylawTheory ? fmt(prim.bylawTheory) : "--"}</div>
                                        {hasSec && block.secondaryList.map((sc, i) => (
                                          <div key={i} className="text-muted" style={cellSecStyle}>{sc.bylawTheory ? fmt(sc.bylawTheory) : "--"}</div>
                                        ))}
                                      </div>
                                    </td>
                                    <td rowSpan={r.courseSpan} className="align-middle p-0" style={{ height: "1px" }}>
                                      <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                                        <div style={cellHalfStyle}>{prim.bylawPractical ? fmt(prim.bylawPractical) : "--"}</div>
                                        {hasSec && block.secondaryList.map((sc, i) => (
                                          <div key={i} className="text-muted" style={cellSecStyle}>{sc.bylawPractical ? fmt(sc.bylawPractical) : "--"}</div>
                                        ))}
                                      </div>
                                    </td>
                                    {isHealthTech && <td rowSpan={r.courseSpan} className="align-middle">{bylawTr}</td>}
                                    {isHealthTech && <td rowSpan={r.courseSpan} className="align-middle">{bylawFld}</td>}
                                  </>
                                )}

                                {/* 5. عدد الطلاب */}
                                <td rowSpan={r.courseSpan} className="col-student-count fw-bold align-middle text-center" style={{ fontSize: "14px" }}>
                                  {r.student_count || 0}
                                </td>

                                {/* 6. المجموعات */}
                                <td rowSpan={r.courseSpan} className="align-middle p-0" style={{ height: "1px" }}>
                                  <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                                    <div style={cellHalfStyle}>{prim.groupsTheory ? prim.groupsTheory : "--"}</div>
                                    {hasSec && block.secondaryList.map((sc, i) => (
                                      <div key={i} className="text-muted" style={cellSecStyle}>{sc.groupsTheory ? sc.groupsTheory : "--"}</div>
                                    ))}
                                  </div>
                                </td>
                                <td rowSpan={r.courseSpan} className="align-middle p-0" style={{ height: "1px" }}>
                                  <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                                    <div style={cellHalfStyle}>{prim.groupsPractical ? prim.groupsPractical : "--"}</div>
                                    {hasSec && block.secondaryList.map((sc, i) => (
                                      <div key={i} className="text-muted" style={cellSecStyle}>{sc.groupsPractical ? sc.groupsPractical : "--"}</div>
                                    ))}
                                  </div>
                                </td>
                                {isMedicine && <td rowSpan={r.courseSpan} className="align-middle">{r.groups_activity ? r.groups_activity : "--"}</td>}
                                {isHealthTech && <td rowSpan={r.courseSpan} className="align-middle">{r.groups_training ? r.groups_training : "--"}</td>}
                                {isHealthTech && <td rowSpan={r.courseSpan} className="align-middle">{r.groups_field ? r.groups_field : "--"}</td>}

                                {/* 7. الساعات المطلوبة */}
                                {isMedicine ? (
                                  r.isFirstInModule && (
                                    <>
                                      <td rowSpan={r.moduleSpan} className="fw-bold text-dark align-middle">{reqTh > 0 ? fmt(reqTh) : "--"}</td>
                                      <td rowSpan={r.moduleSpan} className="fw-bold text-dark align-middle">{reqPr > 0 ? fmt(reqPr) : "--"}</td>
                                      <td rowSpan={r.moduleSpan} className="fw-bold text-dark align-middle">{reqAct > 0 ? fmt(reqAct) : "--"}</td>
                                    </>
                                  )
                                ) : (
                                  <>
                                    <td rowSpan={r.courseSpan} className="fw-bold text-dark align-middle p-0" style={{ height: "1px" }}>
                                      <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                                        <div style={cellHalfStyle}>{prim.reqTheory > 0 ? fmt(prim.reqTheory) : "--"}</div>
                                        {hasSec && block.secondaryList.map((sc, i) => (
                                          <div key={i} className="text-muted" style={cellSecStyle}>{sc.reqTheory > 0 ? fmt(sc.reqTheory) : "--"}</div>
                                        ))}
                                      </div>
                                    </td>
                                    <td rowSpan={r.courseSpan} className="fw-bold text-dark align-middle p-0" style={{ height: "1px" }}>
                                      <div style={{ height: "100%", minHeight: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
                                        <div style={cellHalfStyle}>{prim.reqPractical > 0 ? fmt(prim.reqPractical) : "--"}</div>
                                        {hasSec && block.secondaryList.map((sc, i) => (
                                          <div key={i} className="text-muted" style={cellSecStyle}>{sc.reqPractical > 0 ? fmt(sc.reqPractical) : "--"}</div>
                                        ))}
                                      </div>
                                    </td>
                                    {isHealthTech && <td rowSpan={r.courseSpan} className="fw-bold text-dark align-middle">{reqTr > 0 ? fmt(reqTr) : "--"}</td>}
                                    {isHealthTech && <td rowSpan={r.courseSpan} className="fw-bold text-dark align-middle">{reqFld > 0 ? fmt(reqFld) : "--"}</td>}
                                  </>
                                )}
                              </>
                            );
                          })()}
                          {isMedicine && r.isFirstInModule && (
                            <td rowSpan={r.moduleSpan} className="fw-bold text-dark align-middle px-2">
                              {r.department_name || activeModule.department_name || "--"}
                            </td>
                          )}
                          <td className="fw-bold text-end px-2" style={{ minWidth: "135px", maxWidth: "155px", lineHeight: "1.3" }}>{formatProfNameToTwoLinesReact(prof.id ? getFormattedProfName(prof) : (r.professor_name || "--"))}</td>
                          <td className="fw-bold">{prof.job_title ? getJobTitleFull(prof.job_title) : (getJobTitleFull(r.prof_job_title) || "--")}</td>
                          <td style={{ minWidth: isHealthTech ? "180px" : "130px", width: isHealthTech ? "200px" : undefined, padding: "4px 8px", lineHeight: "1.3" }}>{prof.original_workplace || r.prof_workplace || "--"}</td>
                          <td className="fw-bold text-dark">{r.hours_actual_theory ? fmt(r.hours_actual_theory) : "--"}</td>
                          <td className="fw-bold text-dark">{r.hours_actual_practical ? fmt(r.hours_actual_practical) : "--"}</td>
                          {isHealthTech && <td className="fw-bold text-dark">{r.hours_actual_training ? fmt(r.hours_actual_training) : "--"}</td>}
                          {isHealthTech && <td className="fw-bold text-dark">{r.hours_actual_field ? fmt(r.hours_actual_field) : "--"}</td>}
                          {r.isFirstInCourse && (
                            <td rowSpan={r.courseSpan} className="align-middle text-center px-2" style={{ minWidth: "80px", fontSize: "13px", fontWeight: "500" }}>
                              {r.course_notes || r.notes || "--"}
                            </td>
                          )}
                          {!isPlanLocked && r.isFirstInCourse && (
                            <td rowSpan={r.courseSpan} className="align-middle text-center">
                              <div className="d-flex justify-content-center align-items-center gap-2">
                                <Button variant="link" className="text-success p-0" title="تعديل المقرر" onClick={() => handleEditCourseBlock(r.course_id)}>
                                  <FaEdit size={17} />
                                </Button>
                                <Button variant="link" className="text-danger p-0" title="حذف المقرر" onClick={() => handleDeleteCourse(r.course_id)}>
                                  <FaTrash size={16} />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  {renderRows.length > 0 && (
                    <tfoot style={{ backgroundColor: "#f8f9fa", fontWeight: "bold", borderTop: "2px solid #1b5e20" }}>
                      <tr className="align-middle text-center">
                        <td colSpan={isMedicine ? 1 : ((hasMultiplePrograms && !isHealthTech) ? 3 : 2)} className="text-end px-3">
                          إجمالي المواد: <span className="text-success">{new Set(planRows.map(r => r.base_course_id || r.course_id)).size}</span>
                        </td>
                        <td colSpan={isMedicine ? 3 : (isHealthTech ? 4 : 2)}>--</td>
                        <td className="col-student-count align-middle fw-bold">
                          {renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.student_count) || 0), 0)}
                        </td>
                        <td>{renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_theory) || 0), 0)}</td>
                        <td>{renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_practical) || 0), 0)}</td>
                        {isMedicine && <td>{renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_activity) || 0), 0)}</td>}
                        {isHealthTech && <td>{renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_training) || 0), 0)}</td>}
                        {isHealthTech && <td>{renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.groups_field) || 0), 0)}</td>}

                        <td>{fmt(renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => {
                          const c = courses.find(x => String(x.id) === String(r.course_id)) || {};
                          return s + ((Number(r.req_theory) > 0) ? Number(r.req_theory) : ((Number(c.theory_hours) || Number(r.theory_hours) || 0) * (Number(r.groups_theory) || 0)));
                        }, 0))}</td>
                        <td>{fmt(renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => {
                          const c = courses.find(x => String(x.id) === String(r.course_id)) || {};
                          return s + ((Number(r.req_practical) > 0) ? Number(r.req_practical) : ((Number(c.practical_hours) || Number(r.practical_hours) || 0) * (Number(r.groups_practical) || 0)));
                        }, 0))}</td>
                        {isMedicine && <td>{fmt(renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => s + (Number(r.req_training) || 0), 0))}</td>}
                        {isHealthTech && <td>{fmt(renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => {
                          const c = courses.find(x => String(x.id) === String(r.course_id)) || {};
                          return s + ((Number(r.req_training) > 0) ? Number(r.req_training) : ((Number(c.exercise_hours) || Number(r.exercise_hours) || 0) * (Number(r.groups_training) || 0)));
                        }, 0))}</td>}
                        {isHealthTech && <td>{fmt(renderRows.filter(r => r.isFirstInCourse).reduce((s, r) => {
                          const c = courses.find(x => String(x.id) === String(r.course_id)) || {};
                          return s + ((Number(r.req_field) > 0) ? Number(r.req_field) : ((Number(c.activity_hours) || Number(r.activity_hours) || 0) * (Number(r.groups_field) || 0)));
                        }, 0))}</td>}

                        {isMedicine && <td>--</td>}
                        <td colSpan={3} className="text-primary text-center">
                          إجمالي أعضاء هيئة التدريس: <span className="text-primary">{new Set(planRows.map(r => r.professor_id).filter(Boolean)).size}</span>
                        </td>
                        <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0))}</td>
                        <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0))}</td>
                        {isHealthTech && <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_training) || 0), 0))}</td>}
                        {isHealthTech && <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_field) || 0), 0))}</td>}

                        <td colSpan={isPlanLocked ? 1 : 2} className="bg-light">الإجمالي العام</td>
                      </tr>
                    </tfoot>
                  )}
                </Table>
              </div>
            </Card>
          )}

          {/* ── 5. Workflow Action Buttons (مستقل ومباشرة تحت جدول المقررات الرئيسي) ── */}
          <Card className="shadow-sm mb-4 border-0" style={{ borderRadius: "10px", overflow: "hidden" }}>
            <div className="p-3 bg-light d-flex justify-content-between align-items-center flex-wrap gap-3 no-print">
              <div className="d-flex gap-2 align-items-center flex-wrap">
                {canFinish && (
                  <Button
                    variant={currentPlan?.is_finished ? "success" : "outline-success"}
                    className={`fw-bold px-3 py-2 btn-workflow-sweep ${activeWorkflowAction === (currentPlan?.is_finished ? "cancel_finish" : "finish") ? "sweep-active" : ""}`}
                    disabled={!currentPlan || (currentPlan?.is_finished && currentPlan?.is_approved)}
                    title={
                      !currentPlan
                        ? "يجب حفظ الخطة أولاً"
                        : (currentPlan?.is_finished && currentPlan?.is_approved
                            ? "لا يمكن إلغاء إنهاء الخطة بعد اعتمادها (يمكن تفعيله فقط عند إلغاء اعتماد الخطة من المسؤول)"
                            : (currentPlan?.is_finished && currentPlan?.is_reviewed_1
                                ? "لا يمكن إلغاء الإنهاء بعد بدء المراجعة الأولى"
                                : ""))
                    }
                    onClick={() => handleWorkflowAction(currentPlan?.is_finished ? "cancel_finish" : "finish", currentPlan?.is_finished ? "إلغاء إنهاء الخطة" : "إنهاء الخطة")}
                  >
                    {currentPlan?.is_finished ? "إلغاء إنهاء الخطة" : "إنهاء الخطة"}
                  </Button>
                )}

                {canReview1 && (
                  <Button
                    variant={currentPlan?.is_reviewed_1 ? "primary" : "outline-primary"}
                    className={`fw-bold px-3 py-2 btn-workflow-sweep ${activeWorkflowAction === (currentPlan?.is_reviewed_1 ? "cancel_review1" : "review1") ? "sweep-active" : ""}`}
                    disabled={!currentPlan || (!currentPlan?.is_finished && !currentPlan?.is_reviewed_1) || (currentPlan?.is_reviewed_1 && currentPlan?.is_reviewed_2)}
                    title={!currentPlan?.is_finished && !currentPlan?.is_reviewed_1 ? "يجب إنهاء الخطة أولاً لتفعيل المراجعة الأولى" : (currentPlan?.is_reviewed_1 && currentPlan?.is_reviewed_2 ? "لا يمكن إلغاء المراجعة الأولى بعد إتمام المراجعة الثانية" : "")}
                    onClick={() => handleWorkflowAction(currentPlan?.is_reviewed_1 ? "cancel_review1" : "review1", currentPlan?.is_reviewed_1 ? "إلغاء المراجعة الأولى" : "مراجعة أولى")}
                  >
                    {currentPlan?.is_reviewed_1 ? "إلغاء المراجعة الأولى" : "مراجعة أولى"}
                  </Button>
                )}

                {canReview2 && (
                  <Button
                    variant={currentPlan?.is_reviewed_2 ? "info" : "outline-info"}
                    className={`fw-bold px-3 py-2 btn-workflow-sweep ${currentPlan?.is_reviewed_2 ? "text-white" : ""} ${activeWorkflowAction === (currentPlan?.is_reviewed_2 ? "cancel_review2" : "review2") ? "sweep-active" : ""}`}
                    disabled={!currentPlan || (!currentPlan?.is_reviewed_1 && !currentPlan?.is_reviewed_2) || (currentPlan?.is_reviewed_2 && currentPlan?.is_approved)}
                    title={!currentPlan?.is_reviewed_1 && !currentPlan?.is_reviewed_2 ? "يجب إتمام المراجعة الأولى أولاً لتفعيل المراجعة الثانية" : (currentPlan?.is_reviewed_2 && currentPlan?.is_approved ? "لا يمكن إلغاء المراجعة الثانية بعد اعتماد الخطة" : "")}
                    onClick={() => handleWorkflowAction(currentPlan?.is_reviewed_2 ? "cancel_review2" : "review2", currentPlan?.is_reviewed_2 ? "إلغاء المراجعة الثانية" : "مراجعة ثانية")}
                  >
                    {currentPlan?.is_reviewed_2 ? "إلغاء المراجعة الثانية" : "مراجعة ثانية"}
                  </Button>
                )}

                {canApprove && (
                  <Button
                    variant={currentPlan?.is_approved ? "success" : "outline-success"}
                    className={`fw-bold px-3 py-2 btn-workflow-sweep ${activeWorkflowAction === (currentPlan?.is_approved ? "cancel_approve" : "approve") ? "sweep-active" : ""}`}
                    disabled={!currentPlan || (!isSuperAdmin && !currentPlan?.is_reviewed_2 && !currentPlan?.is_approved)}
                    title={!currentPlan ? "يجب حفظ الخطة أولاً" : (!isSuperAdmin && !currentPlan?.is_reviewed_2 && !currentPlan?.is_approved ? "يجب إتمام المراجعة الثانية أولاً لتفعيل اعتماد الخطة" : "")}
                    onClick={() => handleWorkflowAction(currentPlan?.is_approved ? "cancel_approve" : "approve", currentPlan?.is_approved ? "إلغاء اعتماد الخطة" : "إعتماد الخطة")}
                  >
                    {currentPlan?.is_approved ? "إلغاء إعتماد الخطة" : "إعتماد الخطة"}
                  </Button>
                )}
              </div>

              {/* جملة اعتماد الخطة على نفس مستوى وسطر الأزرار */}
              {currentPlan?.is_approved && (
                <div
                  className="d-flex align-items-center gap-2 px-3 py-2 rounded-2 fw-bold text-success shadow-sm"
                  style={{
                    backgroundColor: "#e8f5e9",
                    border: "1.5px solid #81c784",
                    fontSize: "17px"
                  }}
                >
                  <FaCheckCircle style={{ fontSize: "22px", minWidth: "22px", color: "#2e7d32" }} />
                  <span style={{ color: "#1b5e20", fontSize: "17px" }}>
                    تم اعتماد الخطة الدراسية ل{activeFac?.name?.startsWith("كلية") ? activeFac?.name : `كلية ${activeFac?.name || ""}`} {selectedSemester} للعام الجامعي {selectedYear}
                  </span>
                </div>
              )}

              {!isPlanLocked && (
                <div className="d-flex gap-2">
                  <Button variant="success" className="fw-bold px-4 py-2" style={{ backgroundColor: "#15803d", borderColor: "#15803d" }} onClick={saveToDatabase} disabled={saving}>
                    {saving ? "⏳ جاري الحفظ..." : <><FaSave className="ms-2" /> حفظ الخطة</>}
                  </Button>
                  {isSuperAdmin && (
                    <Button variant="danger" className="fw-bold px-4 py-2" onClick={handleClearEntirePlan} disabled={saving}>
                      <FaTrash className="ms-2" /> مسح الخطة بالكامل
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* ── 6. Table 2 (جدول الخطة مجمع بالأساتذة - يقع تحت أزرار الاعتماد) ── */}
          <Card className="shadow-sm mb-4 border-0" style={{ borderRadius: "10px", overflow: "hidden" }}>
            <div className="p-3 text-white fw-bold d-flex justify-content-between align-items-center" style={{ backgroundColor: "#1b5e20", fontSize: "16px" }}>
              <span>جدول الأساتذة</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <Table bordered responsive className="m-0 text-center align-middle study-plan-custom-table" style={{ fontSize: "13px", borderColor: "#ccc" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1b5e20", color: "#fff", fontWeight: "bold" }}>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff", width: "40px" }} rowSpan={2}>م</th>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>الاسم</th>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>الدرجة</th>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>جهة القدوم</th>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff", minWidth: "190px", width: "210px" }} rowSpan={2}>المادة</th>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>المستوى</th>
                    {hasMultiplePrograms && <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>البرنامج / القسم</th>}
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff", minWidth: "95px", width: "105px", whiteSpace: "nowrap" }} rowSpan={2}>الكود</th>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={isHealthTech ? 4 : 2}>ساعات التدريس</th>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} colSpan={isHealthTech ? 4 : 2}>اجمالي ساعات التدريس</th>
                    <th style={{ backgroundColor: "#1b5e20", color: "#fff" }} rowSpan={2}>ملاحظات</th>
                  </tr>
                  <tr style={{ backgroundColor: "#2e7d32", color: "#fff", fontWeight: "bold" }}>
                    <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                    <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>{isHealthTech ? "عملي" : "تمارين/عملي"}</th>
                    {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>توتوريال</th>}
                    {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>حقل</th>}

                    <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>نظري</th>
                    <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>{isHealthTech ? "عملي" : "تمارين/عملي"}</th>
                    {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>توتوريال</th>}
                    {isHealthTech && <th style={{ backgroundColor: "#2e7d32", color: "#fff" }}>حقل</th>}
                  </tr>
                </thead>
                <tbody>
                  {profAggRows.length === 0 ? (
                    <tr>
                      <td colSpan={isHealthTech ? (hasMultiplePrograms ? 17 : 16) : (hasMultiplePrograms ? 13 : 12)} className="text-center p-4 text-muted">
                        لا توجد أساتذة مضافة أو مسندة في هذه الخطة
                      </td>
                    </tr>
                  ) : profAggRows.map((r, idx) => {
                    const isGreenRow = (r.serial ? r.serial % 2 === 0 : idx % 2 === 1);
                    const validAr = r.nameAr && r.nameAr !== "-" && r.nameAr !== "--";
                    const validEn = r.nameEn && r.nameEn !== "-" && r.nameEn !== "--";
                    const showBothNames = validAr && validEn && r.nameAr.toLowerCase() !== r.nameEn.toLowerCase();

                    return (
                      <tr key={idx} className={`align-middle ${isGreenRow ? "row-green" : "row-white"}`} style={{ borderBottom: r.isFirstOfBlock && r.blockSpan > 1 ? "1px solid #ccc" : undefined }}>
                        {r.isFirstOfProf && <td rowSpan={r.profSpan} className="fw-bold">{r.serial}</td>}
                        {r.isFirstOfProf && <td rowSpan={r.profSpan} className="fw-bold text-end px-2">{r.profName}</td>}
                        {r.isFirstOfProf && <td rowSpan={r.profSpan}>{r.jobTitle}</td>}
                        {r.isFirstOfProf && <td rowSpan={r.profSpan}>{r.workplace}</td>}

                        {/* المادة */}
                        <td className="text-end px-2" style={{ minWidth: "190px", width: "210px" }}>
                          {showBothNames ? (
                            <div>
                              <div className="fw-bold text-dark">{r.nameAr}</div>
                              <div className="text-muted small dir-ltr font-sans">{r.nameEn}</div>
                            </div>
                          ) : (
                            <div className="fw-bold text-dark">{validAr ? r.nameAr : (validEn ? r.nameEn : "--")}</div>
                          )}
                        </td>

                        {/* المستوى - Merge & Center */}
                        {r.isFirstOfBlock && (
                          <td rowSpan={r.blockSpan} className="align-middle text-center" style={{ verticalAlign: "middle", textAlign: "center", minWidth: "75px", width: "85px", whiteSpace: "nowrap" }}>
                            {r.level || "--"}
                          </td>
                        )}

                        {/* البرنامج / القسم */}
                        {hasMultiplePrograms && (
                          <td className="text-center align-middle fw-bold px-2" style={{ minWidth: "150px" }}>
                            {r.progLine || "المستوى العام"}
                          </td>
                        )}

                        {/* الكود */}
                        <td className="text-center align-middle" style={{ whiteSpace: "nowrap", minWidth: "95px", width: "105px" }}>{r.code || "--"}</td>

                        {/* ساعات التدريس */}
                        {r.isFirstOfBlock && (
                          <>
                            <td rowSpan={r.blockSpan} className="fw-bold text-success">{fmt(r.hoursTheory)}</td>
                            <td rowSpan={r.blockSpan} className="fw-bold text-success">{fmt(r.hoursPractical)}</td>
                            {isHealthTech && <td rowSpan={r.blockSpan} className="fw-bold text-success">{fmt(r.hoursTraining)}</td>}
                            {isHealthTech && <td rowSpan={r.blockSpan} className="fw-bold text-success">{fmt(r.hoursField)}</td>}
                          </>
                        )}

                        {/* اجمالي ساعات التدريس */}
                        {r.isFirstOfProf && (
                          <>
                            <td rowSpan={r.profSpan} className="fw-bold text-primary">{fmt(r.totalTheory)}</td>
                            <td rowSpan={r.profSpan} className="fw-bold text-primary">{fmt(r.totalPractical)}</td>
                            {isHealthTech && <td rowSpan={r.profSpan} className="fw-bold text-primary">{fmt(r.totalTraining)}</td>}
                            {isHealthTech && <td rowSpan={r.profSpan} className="fw-bold text-primary">{fmt(r.totalField)}</td>}
                          </>
                        )}

                        {/* ملاحظات */}
                        {r.isFirstOfBlock && (
                          <td rowSpan={r.blockSpan}>{r.notes}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {profAggRows.length > 0 && (
                  <tfoot style={{ backgroundColor: "#f9f9f9", fontWeight: "bold", borderTop: "2px solid #1b5e20" }}>
                    <tr className="align-middle text-center">
                      <td colSpan={4} className="text-end px-3">
                        إجمالي أعضاء هيئة التدريس: <span className="text-primary">{new Set(profAggRows.map(x => x.profId)).size}</span>
                      </td>
                      <td colSpan={hasMultiplePrograms ? 4 : 3} className="text-end px-3">
                        إجمالي المواد: <span className="text-success">{new Set(planRows.map(r => r.course_id)).size}</span>
                      </td>
                      <td className="text-success">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0))}</td>
                      <td className="text-success">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0))}</td>
                      {isHealthTech && <td className="text-success">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_training) || 0), 0))}</td>}
                      {isHealthTech && <td className="text-success">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_field) || 0), 0))}</td>}

                      <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0))}</td>
                      <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0))}</td>
                      {isHealthTech && <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_training) || 0), 0))}</td>}
                      {isHealthTech && <td className="text-primary">{fmt(planRows.reduce((s, r) => s + (Number(r.hours_actual_field) || 0), 0))}</td>}

                      <td className="bg-light">الإجمالي العام</td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </div>
          </Card>
        </>
      )}

      {/* ── Modal إضافة وتعديل مقرر (كافة الأقسام ظاهرة بشكل دائم) ── */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" dir="rtl" backdrop="static">
        <Modal.Header closeButton style={{ backgroundColor: "#2e7d32" }}>
          <Modal.Title className="fw-bold text-white d-flex align-items-center gap-2">
            + إضافة مقرر للخطة الدراسية
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: "#f9fafb", padding: "20px" }}>
          {errorMsg && <Alert variant="danger" onClose={() => setErrorMsg("")} dismissible>{errorMsg}</Alert>}

          {/* ── 1. المقرر الدراسي الرئيسي ومعلومات المادة ── */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Header className="bg-success text-white fw-bold d-flex align-items-center gap-2" style={{ backgroundColor: "#1b5e20" }}>
              <span>🛈 المقرر الدراسي الرئيسي</span>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="fw-bold">اسم المقرر (الاسم الموحد لتجميع المتشابهات)</Form.Label>
                    <Select
                      styles={customSelectStyles}
                      placeholder="-- ابحث واختر اسم المقرر --"
                      isClearable
                      isSearchable
                      value={(() => {
                        const selectedC = courses.find(c => String(c.id) === String(formData.base_course_id));
                        if (!selectedC) return null;
                        const name = (selectedC.name_ar || selectedC.name_en || "").trim();
                        const code = (selectedC.code || "").trim();
                        return {
                          value: selectedC.id,
                          label: name && code ? `${name} (${code})` : (code ? `${code}` : name)
                        };
                      })()}
                      options={getUniqueCourses().map(c => {
                        const name = (c.name_ar || c.name_en || "").trim();
                        const code = (c.code || "").trim();
                        return {
                          value: c.id,
                          label: name && code ? `${name} (${code})` : (code ? `${code}` : name)
                        };
                      })}
                      onChange={opt => {
                        const val = opt ? opt.value : "";
                        const selectedC = courses.find(c => String(c.id) === String(val));
                        const pracBylaw = (Number(selectedC?.practical_hours) || 0) + (Number(selectedC?.exercise_hours) || 0);
                        setFormData(prev => ({
                          ...prev,
                          base_course_id: val,
                          groups_practical: pracBylaw === 0 ? 0 : prev.groups_practical
                        }));
                        if (selectedC?.modules && selectedC.modules.length > 0) {
                          setSelectedModuleId(String(selectedC.modules[0].id));
                        } else {
                          setSelectedModuleId("");
                        }
                        if (val) {
                          const initialProgId = selectedC?.program_id || (programs.length > 0 ? programs[0].id : "");
                          setMultiPrograms([{
                            id: Date.now(),
                            course_id: val,
                            program_id: initialProgId,
                            program_ids: initialProgId ? [initialProgId] : []
                          }]);
                        } else {
                          setMultiPrograms([{ id: Date.now(), course_id: "", program_id: "", program_ids: [] }]);
                        }
                      }}
                      noOptionsMessage={() => "لا توجد مقررات متطابقة"}
                    />
                  </Form.Group>
                </Col>
              </Row>
              {/* بطاقة معلومات وتفاصيل المقرر الدراسي */}
              {(() => {
                const baseCourse = courses.find(c => String(c.id) === String(formData.base_course_id)) || {};
                const baseProgram = programs.find(p => String(p.id) === String(baseCourse.program_id));
                const primaryProgName = baseProgram?.name || baseCourse.program?.name || (programs.length === 1 ? programs[0].name : "--");
                const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
                const isMedicineFac = Boolean(activeFac && (activeFac.name.includes("الطب والجراحة") || activeFac.name.includes("طب بشري") || activeFac.name.includes("كلية الطب")) && !activeFac.name.includes("البيطري") && !activeFac.name.includes("الأسنان") && !activeFac.name.includes("الاسنان") && !activeFac.name.includes("تكنولوجيا"));
                const isHealthTechFac = Boolean(activeFac && (activeFac.name.includes("تكنولوجيا العلوم الصحية") || activeFac.name.includes("العلوم الصحية") || activeFac.name.includes("الصحية والتطبيقية")));

                // جلب البرامج الأخرى المسجل بها هذا المقرر (بخلاف البرنامج الأساسي)
                const eqCourses = baseCourse.id ? getEquivalentCourses(baseCourse.id) : [];
                const otherProgNames = Array.from(new Set([
                  ...eqCourses.map(c => {
                    const prg = programs.find(p => String(p.id) === String(c.program_id));
                    return prg?.name || c.program?.name;
                  }),
                  ...(multiPrograms || []).flatMap(m => {
                    const ids = Array.isArray(m.program_ids) ? m.program_ids : [m.program_id];
                    return ids.map(id => programs.find(p => String(p.id) === String(id))?.name);
                  })
                ].filter(Boolean))).filter(pName => pName !== primaryProgName);

                const otherProgText = otherProgNames.length > 0 ? otherProgNames.join(" ، ") : "لا توجد برامج أخرى";

                if (!formData.base_course_id) return null;

                if (isMedicineFac) {
                  // عرض مخصص لكلية الطب والجراحة
                  const durationText = baseCourse.duration
                    ? (String(baseCourse.duration).includes("طولي") ? "مقرر طولي" : (isNaN(baseCourse.duration) ? baseCourse.duration : `${baseCourse.duration} أسابيع`))
                    : "مقرر طولي";
                  const levelText = formatLevelToWord(baseCourse.level) || baseCourse.level || "الأول";
                  const semText = baseCourse.semester || selectedSemester || "الفصل الدراسي الأول";
                  const modulesList = baseCourse.modules || [];

                  return (
                    <div className="p-3 rounded mt-2 shadow-sm" style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #86efac", fontSize: "13.5px" }}>
                      <div className="fw-bold mb-2 text-success d-flex align-items-center gap-2" style={{ fontSize: "14.5px" }}>
                        <span>🩺 بيانات وتفاصيل مقرر كلية الطب والجراحة:</span>
                      </div>
                      <Row className="g-3 mb-2 align-items-center">
                        <Col xs={12} md={4}>
                          <span className="text-muted">البرنامج: </span>
                          <strong className="text-dark">{primaryProgName}</strong>
                        </Col>
                        {hasMultiplePrograms && (
                          <Col xs={12} md={otherProgNames.length > 0 ? 8 : 4}>
                            <span className="text-muted">البرامج الأخرى المسجل بها: </span>
                            <strong className={otherProgNames.length > 0 ? "text-primary" : "text-muted"}>{otherProgText}</strong>
                          </Col>
                        )}
                        <Col xs={6} md={2} className="ps-md-2">
                          <span className="text-muted">المستوى: </span>
                          <strong className="text-dark">{levelText}</strong>
                        </Col>
                        <Col xs={6} md={3}>
                          <span className="text-muted">الترم: </span>
                          <strong className="text-dark">{semText}</strong>
                        </Col>
                        <Col xs={12} md={3}>
                          <span className="text-muted">عدد الأسابيع : </span>
                          <strong className="text-primary">{durationText}</strong>
                        </Col>
                      </Row>

                      {/* جدول الأقسام العلمية بساعاتها التدريسية */}
                      {modulesList.length > 0 ? (
                        <div className="mt-3">
                          <div className="fw-bold mb-2 text-dark d-flex align-items-center gap-1">
                            <span style={{ color: "#166534" }}>🏛️ الأقسام العلمية وتوزيع الساعات التدريسية:</span>
                          </div>
                          <div style={{ overflowX: "auto" }}>
                            <Table responsive bordered hover size="sm" className="m-0 text-center align-middle" style={{ backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", fontSize: "12.5px" }}>
                              <thead style={{ backgroundColor: "#dcfce7", color: "#14532d" }}>
                                <tr>
                                  <th>م</th>
                                  <th className="text-end px-3">القسم العلمي</th>
                                  <th>ساعات تدريسية نظري</th>
                                  <th>ساعات تدريسية عملي</th>
                                  <th>ساعات تدريسية أنشطة</th>
                                  <th>إجمالي الساعات التدريسية</th>
                                </tr>
                              </thead>
                              <tbody>
                                {modulesList.map((m, mIdx) => {
                                  const thHours = Number(m.theory_hours) || 0;
                                  const prHours = Number(m.practical_hours) || 0;
                                  const actHours = Number(m.activity_hours) || 0;
                                  const totalTeach = thHours + prHours + actHours;

                                  return (
                                    <tr key={mIdx}>
                                      <td className="text-muted">{mIdx + 1}</td>
                                      <td className="fw-bold text-end px-3 text-dark">{m.department_name || "--"}</td>
                                      <td className="text-success fw-bold">{fmt(thHours)}</td>
                                      <td className="text-success fw-bold">{fmt(prHours)}</td>
                                      <td className="text-success fw-bold">{fmt(actHours)}</td>
                                      <td className="text-primary fw-bold">{fmt(totalTeach)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot style={{ backgroundColor: "#f8fafc", fontWeight: "bold" }}>
                                <tr>
                                  <td colSpan={2} className="text-end px-3">إجمالي الساعات التدريسية للمقرر:</td>
                                  <td className="text-success">{fmt(modulesList.reduce((s, x) => s + (Number(x.theory_hours) || 0), 0))}</td>
                                  <td className="text-success">{fmt(modulesList.reduce((s, x) => s + (Number(x.practical_hours) || 0), 0))}</td>
                                  <td className="text-success">{fmt(modulesList.reduce((s, x) => s + (Number(x.activity_hours) || 0), 0))}</td>
                                  <td className="text-primary">{fmt(modulesList.reduce((s, x) => s + (Number(x.theory_hours) || 0) + (Number(x.practical_hours) || 0) + (Number(x.activity_hours) || 0), 0))}</td>
                                </tr>
                              </tfoot>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-muted small p-2 bg-white rounded border">
                          لا توجد أقسام فرعية مسجلة لهذا المقرر (الساعات التدريسية: نظري {baseCourse.theory_hours || 0} - عملي {baseCourse.practical_hours || 0} - أنشطة {baseCourse.activity_hours || 0}).
                        </div>
                      )}
                    </div>
                  );
                }

                // للكليات الأخرى:
                return (
                  <div className="p-3 rounded mt-2" style={{ backgroundColor: "#eaf7ec", border: "1.5px solid #86efac", fontSize: "13px" }}>
                    <Row className="g-2">
                      <Col xs={6} md={3}>
                        <span className="text-muted">نوع المقرر: </span>
                        <strong>{baseCourse.course_type || "اجباري"}</strong>
                      </Col>
                      <Col xs={6} md={3}>
                        <span className="text-muted">المستوى: </span>
                        <strong>{baseCourse.level || "الأول"}</strong>
                      </Col>
                      <Col xs={6} md={3}>
                        <span className="text-muted">المتطلب: </span>
                        <strong>{baseCourse.requirement || "كلية"}</strong>
                      </Col>
                      <Col xs={6} md={3}>
                        <span className="text-muted">الساعات المعتمدة: </span>
                        <strong className="text-success">{baseCourse.credit_hours || baseCourse.theory_hours || 0}</strong>
                      </Col>
                      <Col xs={6} md={3}>
                        <span className="text-muted">يضاف للمعدل: </span>
                        <strong>{baseCourse.added_to_gpa || "يضاف للمعدل التراكمي"}</strong>
                      </Col>
                      <Col xs={6} md={3}>
                        <span className="text-muted">ساعات نظري: </span>
                        <strong className="text-success">{baseCourse.theory_hours || 0}</strong>
                      </Col>
                      <Col xs={6} md={3}>
                        <span className="text-muted">ساعات عملي: </span>
                        <strong className="text-success">{baseCourse.practical_hours || 0}</strong>
                      </Col>
                      {isHealthTechFac && (
                        <>
                          <Col xs={6} md={3}>
                            <span className="text-muted">ساعات تدريب (توتوريال): </span>
                            <strong className="text-success">{baseCourse.exercise_hours || 0}</strong>
                          </Col>
                          <Col xs={6} md={3}>
                            <span className="text-muted">تدريب ميداني (حقل): </span>
                            <strong className="text-success">{baseCourse.activity_hours || 0}</strong>
                          </Col>
                        </>
                      )}
                      <Col xs={6} md={3}>
                        <span className="text-muted">نسبة النجاح: </span>
                        <strong>{baseCourse.success_rate || "50"}</strong>
                      </Col>
                      <Col xs={6} md={3}>
                        <span className="text-muted">تسجيل صيفي: </span>
                        <strong>{baseCourse.summer_registration || "نعم"}</strong>
                      </Col>
                      <Col xs={6} md={3}>
                        <span className="text-muted">البرنامج: </span>
                        <strong className="text-dark">{primaryProgName}</strong>
                      </Col>
                      {hasMultiplePrograms && (
                        <Col xs={12} md={otherProgNames.length > 0 ? 6 : 3}>
                          <span className="text-muted">البرامج الأخرى المسجل بها: </span>
                          <strong className={otherProgNames.length > 0 ? "text-primary" : "text-muted"}>{otherProgText}</strong>
                        </Col>
                      )}
                    </Row>
                  </div>
                );
              })()}
            </Card.Body>
          </Card>

          {/* ── 2. البرامج المشتركة والأكواد (تظهر فقط للكليات التي تملك أكثر من برنامج) ── */}
          {hasMultiplePrograms && (
            <Card className="mb-3 border-0 shadow-sm">
              <Card.Header className="bg-success text-white fw-bold d-flex justify-content-between align-items-center" style={{ backgroundColor: "#1b5e20" }}>
                <span>🛈 البرامج المشتركة والأكواد الإضافية</span>
                <Button variant="light" size="sm" className="fw-bold text-success" onClick={() => setMultiPrograms([...multiPrograms, { id: Date.now(), course_id: "", program_id: "", program_ids: [] }])}>
                  ➕ إضافة برنامج آخر
                </Button>
              </Card.Header>
              <Card.Body>
                {multiPrograms.length === 0 ? (
                  <div className="text-center py-2 text-muted small">
                    المقرر مسجل لبرنامجه الأساسي. اضغط على <strong>"➕ إضافة برنامج آخر"</strong> إذا كان هذا المقرر مشتركاً مع برامج أخرى بالكلية.
                  </div>
                ) : (
                  <Table responsive size="sm" bordered hover className="m-0 text-center align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "45%" }}>البرنامج المشترك</th>
                        <th style={{ width: "45%" }}>كود المقرر واسمه في البرنامج</th>
                        <th style={{ width: "10%" }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {multiPrograms.map((pRow, idx) => {
                        const isBaseRow = Boolean(idx === 0 || pRow.is_base);
                        const availableSharedCourses = getMatchingSharedCourses(formData.base_course_id, pRow.program_ids || pRow.program_id, isBaseRow);
                        const availablePrograms = isBaseRow ? programs : programs.filter(p => {
                          const baseC = courses.find(c => String(c.id) === String(formData.base_course_id));
                          return !baseC?.program_id || String(p.id) !== String(baseC.program_id);
                        });
                        return (
                          <tr key={pRow.id || idx}>
                            <td>
                              <Select
                                isMulti
                                styles={customSelectStyles}
                                placeholder="-- اختر برنامج أو أكثر --"
                                isClearable
                                isSearchable
                                value={programs.filter(p => {
                                  const ids = Array.isArray(pRow.program_ids) ? pRow.program_ids : (pRow.program_id ? [pRow.program_id] : []);
                                  return ids.some(id => String(id) === String(p.id));
                                }).map(p => ({
                                  value: p.id,
                                  label: p.name
                                }))}
                                options={availablePrograms.map(p => ({
                                  value: p.id,
                                  label: p.name
                                }))}
                                onChange={opts => {
                                  const selectedIds = opts ? opts.map(o => o.value) : [];
                                  const next = [...multiPrograms];
                                  next[idx].program_ids = selectedIds;
                                  next[idx].program_id = selectedIds.length > 0 ? selectedIds[0] : "";
                                  const newMatching = getMatchingSharedCourses(formData.base_course_id, selectedIds, isBaseRow);
                                  if (Array.isArray(next[idx].course_ids)) {
                                    next[idx].course_ids = next[idx].course_ids.filter(cid => newMatching.some(m => String(m.id) === String(cid)));
                                  }
                                  setMultiPrograms(next);
                                }}
                                noOptionsMessage={() => "لا توجد برامج أخرى"}
                              />
                            </td>
                            <td>
                              <Select
                                isMulti
                                styles={customSelectStyles}
                                placeholder="-- اختر كود المقرر أو أكثر --"
                                isClearable
                                isSearchable
                                value={availableSharedCourses.filter(c => {
                                  const cIds = Array.isArray(pRow.course_ids) ? pRow.course_ids : (pRow.course_id ? [pRow.course_id] : []);
                                  return cIds.some(cid => String(cid) === String(c.id));
                                }).map(c => {
                                  const progName = programs.find(p => String(p.id) === String(c.program_id))?.name;
                                  return {
                                    value: c.id,
                                    label: `${c.code} - ${c.name_ar || c.name_en} (${c.credit_hours || 0} ساعات) ${progName ? `[${progName}]` : ""}`
                                  };
                                })}
                                options={availableSharedCourses.map(c => {
                                  const progName = programs.find(p => String(p.id) === String(c.program_id))?.name;
                                  return {
                                    value: c.id,
                                    label: `${c.code} - ${c.name_ar || c.name_en} (${c.credit_hours || 0} ساعات) ${progName ? `[${progName}]` : ""}`
                                  };
                                })}
                                onChange={opts => {
                                  const selectedCourseIds = opts ? opts.map(o => o.value) : [];
                                  const next = [...multiPrograms];
                                  next[idx].course_ids = selectedCourseIds;
                                  next[idx].course_id = selectedCourseIds.length > 0 ? selectedCourseIds[0] : "";
                                  setMultiPrograms(next);
                                }}
                                noOptionsMessage={() => "لا توجد مقررات متوافقة"}
                              />
                            </td>
                            <td>
                              <Button variant="link" className="text-danger p-0" onClick={() => setMultiPrograms(multiPrograms.filter(m => m.id !== pRow.id))}>
                                <FaTrash />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          )}

          {/* ── 3. بيانات الطلاب والمجموعات الدراسية ── */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Header className="bg-success text-white fw-bold d-flex align-items-center gap-2" style={{ backgroundColor: "#1b5e20" }}>
              <span>👥 بيانات الطلاب والمجموعات الدراسية</span>
            </Card.Header>
            <Card.Body>
              {(() => {
                const selectedC = courses.find(c => String(c.id) === String(formData.base_course_id)) || {};
                const activeFac = faculties.find(f => String(f.id) === String(selectedFaculty));
                const isMedicineFac = Boolean(activeFac && (activeFac.name.includes("الطب والجراحة") || activeFac.name.includes("طب بشري") || activeFac.name.includes("كلية الطب")) && !activeFac.name.includes("البيطري") && !activeFac.name.includes("الأسنان") && !activeFac.name.includes("الاسنان") && !activeFac.name.includes("تكنولوجيا"));
                const isHealthTechFac = Boolean(activeFac && (activeFac.name.includes("تكنولوجيا العلوم الصحية") || activeFac.name.includes("العلوم الصحية") || activeFac.name.includes("الصحية والتطبيقية")));

                const thHours = Number(selectedC.theory_hours) || 0;
                const prHours = Number(selectedC.practical_hours) || 0;
                const trHours = Number(selectedC.exercise_hours) || 0;
                const fldHours = Number(selectedC.activity_hours) || 0;
                const actHours = isMedicineFac ? (selectedC.modules?.reduce((sum, m) => sum + (Number(m.activity_hours) || 0), 0) || Number(selectedC.activity_hours) || 0) : 0;

                const grTh = Number(formData.groups_theory) || 0;
                const grPr = Number(formData.groups_practical) || 0;
                const grTr = Number(formData.groups_training) || 0;
                const grFld = Number(formData.groups_field) || 0;

                const theoryResult = grTh * thHours;
                const practicalResult = grPr * prHours;
                const trainingResult = grTr * trHours;
                const fieldResult = grFld * fldHours;

                // Collect distinct courses from multiPrograms that have different IDs or credit hours from selectedC
                const secondaryDistinctCourses = [];
                const seenCIds = new Set();
                if (selectedC.id) seenCIds.add(String(selectedC.id));

                multiPrograms.forEach((pRow, pIdx) => {
                  const cIds = Array.isArray(pRow.course_ids) ? pRow.course_ids : (pRow.course_id ? [pRow.course_id] : []);
                  cIds.forEach(cid => {
                    if (cid && !seenCIds.has(String(cid))) {
                      seenCIds.add(String(cid));
                      const c = courses.find(x => String(x.id) === String(cid));
                      if (c) {
                        const secGrTh = pRow.groups_theory !== undefined && pRow.groups_theory !== null ? Number(pRow.groups_theory) : grTh;
                        const secGrPr = pRow.groups_practical !== undefined && pRow.groups_practical !== null ? Number(pRow.groups_practical) : grPr;
                        const secGrTr = pRow.groups_training !== undefined && pRow.groups_training !== null ? Number(pRow.groups_training) : grTr;
                        const secGrFld = pRow.groups_field !== undefined && pRow.groups_field !== null ? Number(pRow.groups_field) : grFld;

                        secondaryDistinctCourses.push({
                          ...c,
                          pRowIndex: pIdx,
                          groups_theory: secGrTh,
                          groups_practical: secGrPr,
                          groups_training: secGrTr,
                          groups_field: secGrFld,
                        });
                      }
                    }
                  });
                });

                const hasDistinctCourses = secondaryDistinctCourses.length > 0;

                return (
                  <>
                    {/* 1. عدد الطلاب المسجلين */}
                    <Row className="g-3 mb-3">
                      <Col md={4} xs={12}>
                        <Form.Group>
                          <Form.Label className="fw-bold small text-dark">عدد الطلاب المسجلين:</Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            disabled={!formData.base_course_id}
                            value={formData.student_count || 0}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setFormData(prev => ({ ...prev, student_count: val }));
                            }}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* 2. مجموعات المقرر الأساسي */}
                    <div className={`p-2 px-3 rounded mb-3 ${hasDistinctCourses ? "border" : ""}`} style={{ backgroundColor: hasDistinctCourses ? "#f8fafc" : "transparent" }}>
                      {hasDistinctCourses && (
                        <div className="fw-bold mb-2 text-primary d-flex align-items-center gap-1" style={{ fontSize: "13.5px" }}>
                          <span>📘 عدد مجموعات مقرر:</span>
                          <span className="text-dark">{selectedC.name_ar || selectedC.name_en} {selectedC.code ? `(${selectedC.code})` : ""}</span>
                          <span className="badge bg-primary bg-opacity-10 text-primary ms-1">({selectedC.credit_hours || 0} ساعات معتمدة)</span>
                        </div>
                      )}
                      <Row className="g-3">
                        <Col md xs={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold small">{hasDistinctCourses ? "عدد مجموعات النظري:" : "عدد مجموعات النظري:"}</Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              disabled={!formData.base_course_id || thHours === 0}
                              value={formData.groups_theory || 0}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setFormData(prev => ({ ...prev, groups_theory: val }));
                              }}
                            />
                          </Form.Group>
                        </Col>
                        <Col md xs={6}>
                          <Form.Group>
                            <Form.Label className="fw-bold small">{hasDistinctCourses ? "عدد مجموعات العملي / التمارين:" : "عدد مجموعات العملي / التمارين:"}</Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              disabled={!formData.base_course_id || prHours === 0}
                              value={formData.groups_practical || 0}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setFormData(prev => ({ ...prev, groups_practical: val }));
                              }}
                            />
                          </Form.Group>
                        </Col>
                        {isMedicineFac && (
                          <Col md xs={6}>
                            <Form.Group>
                              <Form.Label className="fw-bold small">عدد مجموعات الأنشطة:</Form.Label>
                              <Form.Control
                                type="number"
                                min="0"
                                disabled={!formData.base_course_id || actHours === 0}
                                value={formData.groups_activity || 0}
                                onChange={e => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setFormData(prev => ({ ...prev, groups_activity: val }));
                                }}
                              />
                            </Form.Group>
                          </Col>
                        )}
                        {isHealthTechFac && (
                          <>
                            <Col md xs={6}>
                              <Form.Group>
                                <Form.Label className="fw-bold small">عدد مجموعات التوتوريال:</Form.Label>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  disabled={!formData.base_course_id || trHours === 0}
                                  value={formData.groups_training || 0}
                                  onChange={e => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setFormData(prev => ({ ...prev, groups_training: val }));
                                  }}
                                />
                              </Form.Group>
                            </Col>
                            <Col md xs={6}>
                              <Form.Group>
                                <Form.Label className="fw-bold small">عدد مجموعات الحقل:</Form.Label>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  disabled={!formData.base_course_id || fldHours === 0}
                                  value={formData.groups_field || 0}
                                  onChange={e => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setFormData(prev => ({ ...prev, groups_field: val }));
                                  }}
                                />
                              </Form.Group>
                            </Col>
                          </>
                        )}
                      </Row>
                    </div>

                    {/* 3. مجموعات المقررات الأخرى المختلفة بالساعات المعتمدة */}
                    {secondaryDistinctCourses.map((secC, secIdx) => {
                      const secThHours = Number(secC.theory_hours) || 0;
                      const secPrHours = Number(secC.practical_hours) || 0;
                      const secTrHours = Number(secC.exercise_hours) || 0;
                      const secFldHours = Number(secC.activity_hours) || 0;

                      return (
                        <div key={secIdx} className="p-2 px-3 rounded mb-3 border" style={{ backgroundColor: "#fefce8", borderColor: "#fde047" }}>
                          <div className="fw-bold mb-2 text-warning text-dark d-flex align-items-center gap-1" style={{ fontSize: "13.5px" }}>
                            <span className="text-warning">📙</span>
                            <span className="fw-bold text-dark">عدد مجموعات مقرر:</span>
                            <span className="text-primary fw-bold">{secC.name_ar || secC.name_en} {secC.code ? `(${secC.code})` : ""}</span>
                            <span className="badge bg-warning text-dark ms-1">({secC.credit_hours || 0} ساعات معتمدة)</span>
                          </div>
                          <Row className="g-3">
                            <Col md xs={6}>
                              <Form.Group>
                                <Form.Label className="fw-bold small">عدد مجموعات النظري:</Form.Label>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  disabled={secThHours === 0}
                                  value={secC.groups_theory}
                                  onChange={e => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    const next = [...multiPrograms];
                                    if (next[secC.pRowIndex]) {
                                      next[secC.pRowIndex].groups_theory = val;
                                      setMultiPrograms(next);
                                    }
                                  }}
                                />
                              </Form.Group>
                            </Col>
                            <Col md xs={6}>
                              <Form.Group>
                                <Form.Label className="fw-bold small">عدد مجموعات العملي / التمارين:</Form.Label>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  disabled={secPrHours === 0}
                                  value={secC.groups_practical}
                                  onChange={e => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    const next = [...multiPrograms];
                                    if (next[secC.pRowIndex]) {
                                      next[secC.pRowIndex].groups_practical = val;
                                      setMultiPrograms(next);
                                    }
                                  }}
                                />
                              </Form.Group>
                            </Col>
                            {isHealthTechFac && (
                              <>
                                <Col md xs={6}>
                                  <Form.Group>
                                    <Form.Label className="fw-bold small">عدد مجموعات التوتوريال:</Form.Label>
                                    <Form.Control
                                      type="number"
                                      min="0"
                                      disabled={secTrHours === 0}
                                      value={secC.groups_training}
                                      onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        const next = [...multiPrograms];
                                        if (next[secC.pRowIndex]) {
                                          next[secC.pRowIndex].groups_training = val;
                                          setMultiPrograms(next);
                                        }
                                      }}
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md xs={6}>
                                  <Form.Group>
                                    <Form.Label className="fw-bold small">عدد مجموعات الحقل:</Form.Label>
                                    <Form.Control
                                      type="number"
                                      min="0"
                                      disabled={secFldHours === 0}
                                      value={secC.groups_field}
                                      onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        const next = [...multiPrograms];
                                        if (next[secC.pRowIndex]) {
                                          next[secC.pRowIndex].groups_field = val;
                                          setMultiPrograms(next);
                                        }
                                      }}
                                    />
                                  </Form.Group>
                                </Col>
                              </>
                            )}
                          </Row>
                        </div>
                      );
                    })}

                    {/* 4. ملخص حساب الساعات المطلوبة */}
                    {formData.base_course_id && (() => {
                      const totalCombinedReqTh = theoryResult + secondaryDistinctCourses.reduce((sum, sc) => sum + ((Number(sc.groups_theory) || 0) * (Number(sc.theory_hours) || 0)), 0);
                      const totalCombinedReqPr = practicalResult + secondaryDistinctCourses.reduce((sum, sc) => sum + ((Number(sc.groups_practical) || 0) * (Number(sc.practical_hours) || 0)), 0);
                      const totalCombinedReqTr = trainingResult + secondaryDistinctCourses.reduce((sum, sc) => sum + ((Number(sc.groups_training) || 0) * (Number(sc.exercise_hours) || 0)), 0);
                      const totalCombinedReqFld = fieldResult + secondaryDistinctCourses.reduce((sum, sc) => sum + ((Number(sc.groups_field) || 0) * (Number(sc.activity_hours) || 0)), 0);

                      return (
                        <div className="mt-3 p-2 px-3 rounded text-success fw-bold d-flex flex-column gap-1" style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac", fontSize: "13px" }}>
                          <div className="d-flex align-items-center gap-1" style={{ color: "#15803d" }}>
                            <span>💡 حساب الساعات المطلوبة:</span>
                          </div>
                          <div className="ms-3 d-flex flex-column gap-1" style={{ color: "#166534", fontSize: "12.5px" }}>
                            <div>
                              • <strong>{selectedC.name_ar || selectedC.name_en} ({selectedC.credit_hours || 0} ساعات):</strong> عدد الساعات المطلوبة نظري = {grTh} × {thHours} = <span className="text-primary">{fmt(theoryResult)} ساعة</span> _____ عملي = {grPr} × {prHours} = <span className="text-primary">{fmt(practicalResult)} ساعة</span>
                            </div>
                            {secondaryDistinctCourses.map((secC, sIdx) => {
                              const secThHours = Number(secC.theory_hours) || 0;
                              const secPrHours = Number(secC.practical_hours) || 0;
                              const secReqTh = (Number(secC.groups_theory) || 0) * secThHours;
                              const secReqPr = (Number(secC.groups_practical) || 0) * secPrHours;
                              return (
                                <div key={sIdx}>
                                  • <strong>{secC.name_ar || secC.name_en} ({secC.credit_hours || 0} ساعات):</strong> عدد الساعات المطلوبة نظري = {secC.groups_theory} × {secThHours} = <span className="text-primary">{fmt(secReqTh)} ساعة</span> _____ عملي = {secC.groups_practical} × {secPrHours} = <span className="text-primary">{fmt(secReqPr)} ساعة</span>
                                </div>
                              );
                            })}
                            {secondaryDistinctCourses.length > 0 && (
                              <div className="mt-2 pt-2 border-top fw-bold d-flex flex-wrap align-items-center gap-2" style={{ borderColor: "#86efac", color: "#14532d", fontSize: "13px" }}>
                                <span>⭐ <strong>إجمالي الساعات المطلوبة للمقررين:</strong></span>
                                <span>الساعات المطلوبة نظري = <span className="badge bg-success fs-6">{fmt(totalCombinedReqTh)} ساعة</span></span>
                                <span>|</span>
                                <span>الساعات المطلوبة عملي = <span className="badge bg-success fs-6">{fmt(totalCombinedReqPr)} ساعة</span></span>
                                {isHealthTechFac && (totalCombinedReqTr > 0 || totalCombinedReqFld > 0) && (
                                  <>
                                    {totalCombinedReqTr > 0 && <span>| توتوريال = <span className="badge bg-success fs-6">{fmt(totalCombinedReqTr)} ساعة</span></span>}
                                    {totalCombinedReqFld > 0 && <span>| حقل = <span className="badge bg-success fs-6">{fmt(totalCombinedReqFld)} ساعة</span></span>}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <Row className="mt-3">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label className="fw-bold small text-dark">📝 ملاحظة تخص المقرر :</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="أدخل أي ملاحظات تخص هذا المقرر ..."
                            value={formData.notes || ""}
                            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                );
              })()}
            </Card.Body>
          </Card>

          {/* ── 3. أعضاء هيئة التدريس والتحميل ── */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Header className="bg-success text-white fw-bold" style={{ backgroundColor: "#1b5e20" }}>
              <div className="d-flex justify-content-between align-items-center">
                <span>🛈 بيانات الأساتذة وتوزيع الساعات المنفذة (اختياري)</span>
                {!isMedicine && (
                  <Button variant="light" size="sm" className="fw-bold text-success" onClick={() => setMultiProfessors([...multiProfessors, { id: Date.now(), module_id: "", professor_id: "", hours_actual_theory: 0, hours_actual_practical: 0, hours_actual_training: 0, hours_actual_field: 0, notes: "" }])}>
                    ➕ إضافة أستاذ آخر
                  </Button>
                )}
              </div>
              {/* Module selector row -- Medicine only */}
              {isMedicine && (() => {
                const bc = courses.find(c => String(c.id) === String(formData.base_course_id));
                if (!bc?.modules?.length) return null;
                const selMod = bc.modules.find(m => String(m.id) === String(activeModuleIdForProf));
                const reqTh = selMod ? ((Number(selMod.theory_hours) || 0) * (Number(formData.groups_theory) || 0)) : 0;
                const reqPr = selMod ? ((Number(selMod.practical_hours) || 0) * (Number(formData.groups_practical) || 0)) : 0;
                return (
                  <div className="mt-2 p-2 rounded" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span className="fw-bold" style={{ fontSize: "13px" }}>🏛️ اختر القسم العلمي:</span>
                      <Form.Select
                        size="sm"
                        style={{ maxWidth: "220px", backgroundColor: "#fff", color: "#1b5e20", fontWeight: "bold" }}
                        value={activeModuleIdForProf}
                        onChange={e => setActiveModuleIdForProf(e.target.value)}
                      >
                        <option value="">-- اختر القسم --</option>
                        {bc.modules.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.department_name}{m.name_ar || m.name_en ? ` (${m.name_ar || m.name_en})` : ""}
                          </option>
                        ))}
                      </Form.Select>
                      {selMod && (() => {
                        const actualTh = multiProfessors
                          .filter(p => String(p.module_id) === String(activeModuleIdForProf))
                          .reduce((s, p) => s + (Number(p.hours_actual_theory) || 0), 0);
                        const actualPr = multiProfessors
                          .filter(p => String(p.module_id) === String(activeModuleIdForProf))
                          .reduce((s, p) => s + (Number(p.hours_actual_practical) || 0), 0);
                        const remTh = reqTh - actualTh;
                        const remPr = reqPr - actualPr;
                        return (
                          <>
                            <span className="badge" style={{ backgroundColor: "#1565c0", fontSize: "14px" }}>
                              الساعات النظرية : {fmt(Number(selMod.theory_hours) || 0)} &nbsp;&nbsp; الفعلي : {fmt(actualTh)} &nbsp;&nbsp; المتبقي : <span style={{ color: remTh < 0 ? "#ffcdd2" : remTh === 0 ? "#a5d6a7" : "#fff" }}>{fmt(remTh)}</span>
                            </span>
                            <span className="badge" style={{ backgroundColor: "#6a1b9a", fontSize: "14px" }}>
                              الساعات العملية : {fmt(Number(selMod.practical_hours) || 0)} &nbsp;&nbsp; الفعلي : {fmt(actualPr)} &nbsp;&nbsp; المتبقي : <span style={{ color: remPr < 0 ? "#ffcdd2" : remPr === 0 ? "#a5d6a7" : "#fff" }}>{fmt(remPr)}</span>
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    {selMod && (
                      <div className="d-flex justify-content-end mt-2">
                        <Button
                          variant="light"
                          size="sm"
                          className="fw-bold text-success"
                          disabled={!activeModuleIdForProf}
                          onClick={() => {
                            const mod = bc.modules.find(m => String(m.id) === String(activeModuleIdForProf));
                            setMultiProfessors([...multiProfessors, {
                              id: Date.now(),
                              module_id: activeModuleIdForProf,
                              department_name: mod?.department_name || "",
                              professor_id: "",
                              hours_actual_theory: 0,
                              hours_actual_practical: 0,
                              hours_actual_training: 0,
                              hours_actual_field: 0,
                              notes: ""
                            }]);
                          }}
                        >
                          ➕ إضافة عضو هيئة تدريس لقسم ({selMod?.department_name})
                        </Button>
                      </div>
                    )}

                  </div>
                );
              })()}
            </Card.Header>
            <Card.Body>
              {multiProfessors.map((pRow, idx) => {
                const availableProfs = getAvailableProfessors(pRow.professor_id);
                const selectedProfObj = professors.find(p => String(p.id) === String(pRow.professor_id));
                const currentBaseCourse = courses.find(c => String(c.id) === String(formData.base_course_id));
                const hasCourseModules = Boolean(currentBaseCourse?.modules && currentBaseCourse.modules.length > 0);
                const activeModObj = currentBaseCourse?.modules?.find(m => String(m.id) === String(pRow.module_id));
                const profTheoryHours = activeModObj ? (Number(activeModObj.theory_hours) || 0) : (Number(currentBaseCourse?.theory_hours) || 0);
                const profPracticalHours = activeModObj ? (Number(activeModObj.practical_hours) || 0) : (Number(currentBaseCourse?.practical_hours) || 0);
                const profTrainingHours = Number(currentBaseCourse?.exercise_hours) || 0;
                const profFieldHours = Number(currentBaseCourse?.activity_hours) || 0;

                const targetCourseId = editingCourseId || formData.base_course_id;

                const profOtherCoursesHours = pRow.professor_id
                  ? planRows
                      .filter(r => String(r.base_course_id || r.course_id) !== String(targetCourseId) && String(r.professor_id) === String(pRow.professor_id))
                      .reduce((acc, r) => ({
                        th: acc.th + (Number(r.hours_actual_theory) || 0),
                        pr: acc.pr + (Number(r.hours_actual_practical) || 0),
                        tr: acc.tr + (Number(r.hours_actual_training) || 0),
                        fld: acc.fld + (Number(r.hours_actual_field) || 0),
                        tot: acc.tot + (Number(r.hours_actual_theory) || 0) + (Number(r.hours_actual_practical) || 0) + (Number(r.hours_actual_training) || 0) + (Number(r.hours_actual_field) || 0)
                      }), { th: 0, pr: 0, tr: 0, fld: 0, tot: 0 })
                  : { th: 0, pr: 0, tr: 0, fld: 0, tot: 0 };

                const otherTheoryHours = pRow.professor_id
                  ? multiProfessors.filter(r => r.id !== pRow.id && String(r.professor_id) === String(pRow.professor_id)).reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0)
                  : 0;
                const otherPracticalHours = pRow.professor_id
                  ? multiProfessors.filter(r => r.id !== pRow.id && String(r.professor_id) === String(pRow.professor_id)).reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0)
                  : 0;
                const otherTrainingHours = pRow.professor_id
                  ? multiProfessors.filter(r => r.id !== pRow.id && String(r.professor_id) === String(pRow.professor_id)).reduce((s, r) => s + (Number(r.hours_actual_training) || 0), 0)
                  : 0;
                const otherFieldHours = pRow.professor_id
                  ? multiProfessors.filter(r => r.id !== pRow.id && String(r.professor_id) === String(pRow.professor_id)).reduce((s, r) => s + (Number(r.hours_actual_field) || 0), 0)
                  : 0;
                const otherTotalHours = otherTheoryHours + otherPracticalHours + otherTrainingHours + otherFieldHours;

                const limitFacultyDay = (workloadLimits && Number(workloadLimits.max_faculty_hours_per_day) > 0) ? Number(workloadLimits.max_faculty_hours_per_day) : 6;
                const limitAssistantDay = (workloadLimits && Number(workloadLimits.max_assistant_hours_per_day) > 0) ? Number(workloadLimits.max_assistant_hours_per_day) : 8;
                const limitTheoryDay = (workloadLimits && Number(workloadLimits.max_theory_hours_per_day) > 0) ? Number(workloadLimits.max_theory_hours_per_day) : limitFacultyDay;
                const limitPracticalDay = (workloadLimits && Number(workloadLimits.max_practical_hours_per_day) > 0) ? Number(workloadLimits.max_practical_hours_per_day) : limitAssistantDay;
                const limitTutorialDay = (workloadLimits && Number(workloadLimits.max_tutorial_hours_per_day) > 0) ? Number(workloadLimits.max_tutorial_hours_per_day) : limitAssistantDay;
                const limitFieldDay = (workloadLimits && Number(workloadLimits.max_field_hours_per_day) > 0) ? Number(workloadLimits.max_field_hours_per_day) : limitAssistantDay;

                const limitTheoryCourse = (workloadLimits && Number(workloadLimits.max_theory_hours_per_course) > 0) ? Number(workloadLimits.max_theory_hours_per_course) : null;
                const limitPracticalCourse = (workloadLimits && Number(workloadLimits.max_practical_hours_per_course) > 0) ? Number(workloadLimits.max_practical_hours_per_course) : null;
                const limitTutorialCourse = (workloadLimits && Number(workloadLimits.max_tutorial_hours_per_course) > 0) ? Number(workloadLimits.max_tutorial_hours_per_course) : null;
                const isTA = selectedProfObj ? isTeachingAssistant(selectedProfObj) : false;
                const profDays = selectedProfObj ? getProfessorWorkDays(selectedProfObj) : 1;
                const maxAllowedOverall = isTA ? (limitAssistantDay * profDays) : (limitFacultyDay * profDays);

                const totNonThSoFar = (profOtherCoursesHours.pr + otherPracticalHours) + (profOtherCoursesHours.tr + otherTrainingHours) + (profOtherCoursesHours.fld + otherFieldHours);
                const totThSoFar = profOtherCoursesHours.th + otherTheoryHours;
                const calcLoadSoFar = isTA ? totNonThSoFar : (totThSoFar + (totNonThSoFar / 2));

                const isOverallLimitReached = Boolean(pRow.professor_id && calcLoadSoFar >= maxAllowedOverall);
                const isTheoryLimitReached = Boolean(pRow.professor_id && (isTA || totThSoFar >= limitTheoryDay || isOverallLimitReached));
                const isPracticalLimitReached = Boolean(pRow.professor_id && isOverallLimitReached);
                const isTrainingLimitReached = Boolean(pRow.professor_id && isOverallLimitReached);
                const isFieldLimitReached = Boolean(pRow.professor_id && isOverallLimitReached);

                // For Medicine with modules: only show professors belonging to the currently selected department
                if (isMedicine && hasCourseModules) {
                  if (!pRow.module_id) return null;
                  if (activeModuleIdForProf && String(pRow.module_id) !== String(activeModuleIdForProf)) {
                    return null;
                  }
                }
                return (
                  <div key={pRow.id || idx} className="p-3 mb-3 border rounded bg-white shadow-sm position-relative">
                    <Row className="g-2 align-items-center">
                      <Col md={11}>
                        <Row className="g-2 align-items-end">
                          <Col md={4}>
                            {isMedicine && hasCourseModules && pRow.module_id && (
                              <div className="fw-bold small text-success mb-1">
                                🏛️ القسم: {currentBaseCourse?.modules?.find(m => String(m.id) === String(pRow.module_id))?.department_name || "--"}
                              </div>
                            )}
                            <Form.Label className="fw-bold small">عضو هيئة التدريس:</Form.Label>
                            <Select
                              styles={customSelectStyles}
                              placeholder="-- اختر أستاذ --"
                              isClearable
                              isSearchable
                              value={selectedProfObj ? {
                                value: selectedProfObj.id,
                                label: getFormattedProfName(selectedProfObj)
                              } : null}
                              options={availableProfs.map(p => ({
                                value: p.id,
                                label: getFormattedProfName(p)
                              }))}
                              onChange={opt => {
                                const val = opt ? opt.value : "";
                                const next = [...multiProfessors];
                                next[idx].professor_id = val;
                                if (val) {
                                  const profObj = professors.find(p => String(p.id) === String(val));
                                  const isProfTA = isTeachingAssistant(profObj);
                                  const pDays = getProfessorWorkDays(profObj);
                                  const maxAllwd = isProfTA ? (limitAssistantDay * pDays) : (limitFacultyDay * pDays);

                                  const targetCourseId = editingCourseId || formData.base_course_id;
                                  const profOtherH = planRows
                                    .filter(r => String(r.base_course_id || r.course_id) !== String(targetCourseId) && String(r.professor_id) === String(val))
                                    .reduce((acc, r) => ({
                                      th: acc.th + (Number(r.hours_actual_theory) || 0),
                                      pr: acc.pr + (Number(r.hours_actual_practical) || 0),
                                      tr: acc.tr + (Number(r.hours_actual_training) || 0),
                                      fld: acc.fld + (Number(r.hours_actual_field) || 0),
                                      tot: acc.tot + (Number(r.hours_actual_theory) || 0) + (Number(r.hours_actual_practical) || 0) + (Number(r.hours_actual_training) || 0) + (Number(r.hours_actual_field) || 0)
                                    }), { th: 0, pr: 0, tr: 0, fld: 0, tot: 0 });

                                  const oTh = multiProfessors.filter(r => r.id !== pRow.id && String(r.professor_id) === String(val)).reduce((s, r) => s + (Number(r.hours_actual_theory) || 0), 0);
                                  const oPr = multiProfessors.filter(r => r.id !== pRow.id && String(r.professor_id) === String(val)).reduce((s, r) => s + (Number(r.hours_actual_practical) || 0), 0);
                                  const oTr = multiProfessors.filter(r => r.id !== pRow.id && String(r.professor_id) === String(val)).reduce((s, r) => s + (Number(r.hours_actual_training) || 0), 0);
                                  const oFld = multiProfessors.filter(r => r.id !== pRow.id && String(r.professor_id) === String(val)).reduce((s, r) => s + (Number(r.hours_actual_field) || 0), 0);

                                  const totNonTh = (profOtherH.pr + oPr) + (profOtherH.tr + oTr) + (profOtherH.fld + oFld);
                                  const totTh = profOtherH.th + oTh;
                                  const calcLoad = isProfTA ? totNonTh : (totTh + (totNonTh / 2));

                                  if (isProfTA || totTh >= limitTheoryDay || calcLoad >= maxAllwd) {
                                    next[idx].hours_actual_theory = 0;
                                  }
                                  if (calcLoad >= maxAllwd) {
                                    next[idx].hours_actual_practical = 0;
                                    next[idx].hours_actual_training = 0;
                                    next[idx].hours_actual_field = 0;
                                  }
                                }
                                setMultiProfessors(next);
                              }}
                              noOptionsMessage={() => "لا يوجد أساتذة"}
                            />
                          </Col>
                          <Col md={2} xs={6}>
                            <Form.Label className="fw-bold small">
                              ساعات نظري:
                              {isTA && <span className="text-danger small ms-1">(عملي فقط)</span>}
                            </Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              disabled={!formData.base_course_id || profTheoryHours === 0 || isTA || isTheoryLimitReached}
                              value={isTA || isTheoryLimitReached ? 0 : pRow.hours_actual_theory}
                              title={isTA ? "المعيد والمدرس المساعد لا يمكنهم تدريس ساعات نظري" : ""}
                              onChange={e => {
                                const val = Number(e.target.value) || 0;
                                const next = [...multiProfessors];
                                next[idx].hours_actual_theory = isTA ? 0 : val;
                                setMultiProfessors(next);
                              }}
                            />
                          </Col>
                          <Col md={2} xs={6}>
                            <Form.Label className="fw-bold small">ساعات عملي:</Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              disabled={!formData.base_course_id || profPracticalHours === 0 || isPracticalLimitReached}
                              value={isPracticalLimitReached ? 0 : pRow.hours_actual_practical}
                              onChange={e => {
                                const val = Number(e.target.value) || 0;
                                const next = [...multiProfessors];
                                next[idx].hours_actual_practical = val;
                                setMultiProfessors(next);
                              }}
                            />
                          </Col>
                          {isHealthTech && (
                            <Col md={2} xs={6}>
                              <Form.Label className="fw-bold small">ساعات تدريب:</Form.Label>
                              <Form.Control
                                type="number"
                                min="0"
                                disabled={!formData.base_course_id || profTrainingHours === 0 || isTrainingLimitReached}
                                value={isTrainingLimitReached ? 0 : pRow.hours_actual_training}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  const next = [...multiProfessors];
                                  next[idx].hours_actual_training = val;
                                  setMultiProfessors(next);
                                }}
                              />
                            </Col>
                          )}
                          {isHealthTech && (
                            <Col md={2} xs={6}>
                              <Form.Label className="fw-bold small">ساعات حقل:</Form.Label>
                              <Form.Control
                                type="number"
                                min="0"
                                disabled={!formData.base_course_id || profFieldHours === 0 || isFieldLimitReached}
                                value={isFieldLimitReached ? 0 : pRow.hours_actual_field}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0;
                                  const next = [...multiProfessors];
                                  next[idx].hours_actual_field = val;
                                  setMultiProfessors(next);
                                }}
                              />
                            </Col>
                          )}
                          {!isHealthTech && (
                            <Col md={4} xs={12}>
                              <Form.Label className="fw-bold small">📝 ملحوظة تخص عضو هيئة التدريس:</Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="أدخل ملحوظة للأستاذ..."
                                value={pRow.notes || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  const next = [...multiProfessors];
                                  next[idx].notes = val;
                                  setMultiProfessors(next);
                                }}
                              />
                            </Col>
                          )}
                          {isHealthTech && (
                            <Col md={12} className="mt-2">
                              <Form.Label className="fw-bold small text-dark">📝 ملحوظة تخص عضو هيئة التدريس:</Form.Label>
                              <Form.Control
                                type="text"
                                placeholder="أدخل ملحوظة للأستاذ..."
                                value={pRow.notes || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  const next = [...multiProfessors];
                                  next[idx].notes = val;
                                  setMultiProfessors(next);
                                }}
                              />
                            </Col>
                          )}
                        </Row>
                      </Col>






































































































































































































































































































































































                      <Col md={1} className="text-center">
                        <Button
                          variant="outline-danger"
                          className="w-100 p-2"
                          onClick={() => setMultiProfessors(multiProfessors.filter(m => m.id !== pRow.id))}
                          disabled={multiProfessors.length === 1}
                          title="حذف الأستاذ"
                        >
                          <FaTrash />
                        </Button>
                      </Col>
                    </Row>

                    {/* تنبيه ديناميكي لساعات الأستاذ والحد الأقصى لليوم وفقاً لأيام الانتداب */}
                    {(() => {
                      if (!pRow.professor_id) return null;
                      const currentTh = Number(pRow.hours_actual_theory) || 0;
                      const currentPr = Number(pRow.hours_actual_practical) || 0;
                      const currentTr = Number(pRow.hours_actual_training) || 0;
                      const currentFld = Number(pRow.hours_actual_field) || 0;

                      const allProfOverallTheory = profOtherCoursesHours.th + otherTheoryHours + currentTh;
                      const allProfOverallPractical = profOtherCoursesHours.pr + otherPracticalHours + currentPr;
                      const allProfOverallTraining = profOtherCoursesHours.tr + otherTrainingHours + currentTr;
                      const allProfOverallField = profOtherCoursesHours.fld + otherFieldHours + currentFld;
                      const allProfOverallNonTheory = allProfOverallPractical + allProfOverallTraining + allProfOverallField;

                      if (isTA) {
                        const maxAllwd = limitAssistantDay * profDays;
                        if (allProfOverallTheory > 0) {
                          return (
                            <div className="mt-2 p-1 px-2 rounded bg-danger bg-opacity-10 text-danger fw-bold border border-danger small text-center">
                              ⚠️ تنبيه: المعيد والمدرس المساعد ({getFormattedProfName(selectedProfObj)}) لا يمكنهم تدريس ساعات نظري (مسموح بالساعات العملية والتوتوريال والحقل فقط).
                            </div>
                          );
                        }

                        if (allProfOverallNonTheory > maxAllwd) {
                          return (
                            <div className="mt-2 p-1 px-2 rounded bg-danger bg-opacity-10 text-danger fw-bold border border-danger small text-center">
                              ⚠️ تنبيه: مجموع ساعات العملي والتوتوريال والحقل ({fmt(allProfOverallNonTheory)} س) لهذا الأستاذ يتجاوز الحد الأقصى المسموح به ({maxAllwd} ساعات = {profDays} أيام انتداب × ${limitAssistantDay} ساعات)
                              {profOtherCoursesHours.tot > 0 ? ` [منها ${fmt(profOtherCoursesHours.tot)} س مسجلة بمقررات أخرى بالخطة]` : ""}.
                            </div>
                          );
                        }

                        return (
                          <div className="mt-2 p-1 px-2 rounded bg-success bg-opacity-10 text-success fw-bold border border-success small text-center">
                            ✓ الساعات العملية والتوتوريال والحقل المسندة: {fmt(allProfOverallNonTheory)} س من أصل {maxAllwd} س مسموحة ({profDays} {profDays === 1 ? "يوم" : profDays === 2 ? "يومان" : "أيام"} انتداب × {limitAssistantDay} ساعات عملي).
                          </div>
                        );
                      } else {
                        // أعضاء هيئة التدريس (أستاذ / أ.مساعد / مدرس)
                        const calculatedLoad = Number((allProfOverallTheory + (allProfOverallNonTheory / 2)).toFixed(2));
                        const maxFacultyAllwd = limitFacultyDay * profDays;

                        if (calculatedLoad > maxFacultyAllwd) {
                          return (
                            <div className="mt-2 p-1 px-2 rounded bg-danger bg-opacity-10 text-danger fw-bold border border-danger small text-center">
                              ⚠️ تنبيه: العبء التدريسي المحتسب للأستاذ [نظري ({fmt(allProfOverallTheory)}) + نصف العملي ({fmt(allProfOverallNonTheory / 2)}) = {fmt(calculatedLoad)} س] يتجاوز الحد الأقصى المسموح به ({maxFacultyAllwd} ساعة = {profDays} أيام انتداب × {limitFacultyDay} ساعات)
                              {profOtherCoursesHours.tot > 0 ? ` [منها ${fmt(profOtherCoursesHours.tot)} س بمقررات أخرى بالخطة]` : ""}.
                            </div>
                          );
                        }

                        if (allProfOverallTheory > limitTheoryDay) {
                          return (
                            <div className="mt-2 p-1 px-2 rounded bg-danger bg-opacity-10 text-danger fw-bold border border-danger small text-center">
                              ⚠️ تنبيه: ساعات النظري لهذا الأستاذ ({fmt(allProfOverallTheory)} س) تتجاوز الحد الأقصى اليومي المسموح به للكلية ({limitTheoryDay} ساعات)
                              {profOtherCoursesHours.th > 0 ? ` [منها ${fmt(profOtherCoursesHours.th)} س بمقررات أخرى]` : ""}.
                            </div>
                          );
                        }

                        return (
                          <div className="mt-2 p-1 px-2 rounded bg-success bg-opacity-10 text-success fw-bold border border-success small text-center">
                            ✓ العبء التدريسي المحتسب للأستاذ: [نظري ({fmt(allProfOverallTheory)}) + نصف العملي ({fmt(allProfOverallNonTheory / 2)}) = {fmt(calculatedLoad)} س] من أصل {maxFacultyAllwd} س حد أقصى ({profDays} {profDays === 1 ? "يوم" : profDays === 2 ? "يومان" : "أيام"} انتداب × {limitFacultyDay} ساعات).
                          </div>
                        );
                      }
                    })()}

                    {selectedProfObj && (
                      <div className="mt-3 p-2 px-3 rounded text-success fw-bold d-flex flex-column gap-1" style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac", fontSize: "15px" }}>
                        <div className="d-flex align-items-center gap-1" style={{ color: "#15803d" }}>
                          <span>📋 بيانات عضو هيئة التدريس:</span>
                        </div>
                        <div className="ms-3 d-flex flex-row flex-wrap gap-4" style={{ color: "#166534", fontSize: "14.5px" }}>
                          <div>• <strong>الدرجة العلمية :</strong> &nbsp;{getJobTitleFull(selectedProfObj.job_title) || "--"}</div>
                          <div>• <strong>جهة القدوم :</strong> &nbsp;{selectedProfObj.original_workplace || "--"}</div>
                          <div>• <strong>نوع الانتداب :</strong> &nbsp;{selectedProfObj.contract_type || "--"} ({profDays} {profDays === 1 ? "يوم عمل" : profDays === 2 ? "يومان عمل" : "أيام عمل"})</div>
                          <div>• <strong>الحد الأقصى اليومي :</strong> &nbsp;{isTA ? `${8 * profDays} س (عملي وتوتوريال)` : `${6 * profDays} س (نظري + نصف العملي)`}</div>
                          <div>• <strong>عدد أسابيع الحضور في {selectedSemester.startsWith("الفصل") ? selectedSemester : `الفصل الدراسي ${selectedSemester}`} :</strong> &nbsp;{getProfAttendanceWeeksForSemester(selectedProfObj, selectedYear, selectedSemester, academicYears, isMedicine)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* مؤشر مطابقة الساعات المنفذة مع الساعات المطلوبة */}
              {(() => {
                if (!multiProfessors.some(p => p.professor_id)) return null;
                const currentBaseCourse = courses.find(c => String(c.id) === String(formData.base_course_id));
                if (!currentBaseCourse) return null;

                let reqTheory = (Number(currentBaseCourse.theory_hours) || 0) * (Number(formData.groups_theory) || 0);
                let reqPractical = (Number(currentBaseCourse.practical_hours) || 0) * (Number(formData.groups_practical) || 0);
                let reqTraining = (Number(currentBaseCourse.exercise_hours) || 0) * (Number(formData.groups_training) || 0);
                let reqField = (Number(currentBaseCourse.activity_hours) || 0) * (Number(formData.groups_field) || 0);

                const seenDistinctIds = new Set();
                if (currentBaseCourse.id) seenDistinctIds.add(String(currentBaseCourse.id));

                if (Array.isArray(multiPrograms)) {
                  multiPrograms.forEach(p => {
                    const cIds = Array.isArray(p.course_ids) ? p.course_ids : (p.course_id ? [p.course_id] : []);
                    cIds.forEach(cid => {
                      if (cid && !seenDistinctIds.has(String(cid))) {
                        seenDistinctIds.add(String(cid));
                        const scObj = courses.find(x => String(x.id) === String(cid));
                        if (scObj) {
                          const scGrTh = p.groups_theory !== undefined && p.groups_theory !== null ? Number(p.groups_theory) : (Number(formData.groups_theory) || 0);
                          const scGrPr = p.groups_practical !== undefined && p.groups_practical !== null ? Number(p.groups_practical) : (Number(formData.groups_practical) || 0);
                          const scGrTr = p.groups_training !== undefined && p.groups_training !== null ? Number(p.groups_training) : (Number(formData.groups_training) || 0);
                          const scGrFld = p.groups_field !== undefined && p.groups_field !== null ? Number(p.groups_field) : (Number(formData.groups_field) || 0);

                          reqTheory += (Number(scObj.theory_hours) || 0) * scGrTh;
                          reqPractical += (Number(scObj.practical_hours) || 0) * scGrPr;
                          reqTraining += (Number(scObj.exercise_hours) || 0) * scGrTr;
                          reqField += (Number(scObj.activity_hours) || 0) * scGrFld;
                        }
                      }
                    });
                  });
                }

                const totalActualTheory = multiProfessors.reduce((sum, p) => sum + (Number(p.hours_actual_theory) || 0), 0);
                const totalActualPractical = multiProfessors.reduce((sum, p) => sum + (Number(p.hours_actual_practical) || 0), 0);
                const totalActualTraining = multiProfessors.reduce((sum, p) => sum + (Number(p.hours_actual_training) || 0), 0);
                const totalActualField = multiProfessors.reduce((sum, p) => sum + (Number(p.hours_actual_field) || 0), 0);

                const isTheoryMatch = Math.abs(totalActualTheory - reqTheory) < 0.01;
                const isPracticalMatch = Math.abs(totalActualPractical - reqPractical) < 0.01;
                const isTrainingMatch = Math.abs(totalActualTraining - reqTraining) < 0.01;
                const isFieldMatch = Math.abs(totalActualField - reqField) < 0.01;

                const isAllMatch = isMedicine
                  ? true
                  : (isTheoryMatch && isPracticalMatch && (isHealthTech ? (isTrainingMatch && isFieldMatch) : true));

                if (isMedicine) return null;

                return (
                  <div className={`p-2 rounded mt-2 fw-bold text-center border ${isAllMatch ? "bg-success bg-opacity-10 text-success border-success" : "bg-warning bg-opacity-10 text-danger border-warning"}`} style={{ fontSize: "13px" }}>
                    {isAllMatch ? (
                      <span>✓ مجموع الساعات المنفذة يطابق الساعات المطلوبة تماماً ({fmt(totalActualTheory)} نظري ، {fmt(totalActualPractical)} عملي {isHealthTech ? `، ${fmt(totalActualTraining)} تدريب ، ${fmt(totalActualField)} حقل` : ""}).</span>
                    ) : (
                      <div className="d-flex flex-column gap-1">
                        {!isTheoryMatch && (
                          <span>⚠️ مجموع الساعات المنفذة نظري ({fmt(totalActualTheory)} ساعة) لا يساوي المطلوبة ({fmt(reqTheory)} ساعة) __ المتبقي: {fmt(Math.abs(reqTheory - totalActualTheory))} ساعة.</span>
                        )}
                        {!isPracticalMatch && (
                          <span>⚠️ مجموع الساعات المنفذة عملي ({fmt(totalActualPractical)} ساعة) لا يساوي المطلوبة ({fmt(reqPractical)} ساعة) __ المتبقي: {fmt(Math.abs(reqPractical - totalActualPractical))} ساعة.</span>
                        )}
                        {isHealthTech && !isTrainingMatch && (
                          <span>⚠️ مجموع الساعات المنفذة تدريب/توتوريال ({fmt(totalActualTraining)} ساعة) لا يساوي المطلوبة ({fmt(reqTraining)} ساعة) __ المتبقي: {fmt(Math.abs(reqTraining - totalActualTraining))} ساعة.</span>
                        )}
                        {isHealthTech && !isFieldMatch && (
                          <span>⚠️ مجموع الساعات المنفذة تدريب ميداني/حقل ({fmt(totalActualField)} ساعة) لا يساوي المطلوبة ({fmt(reqField)} ساعة) __ المتبقي: {fmt(Math.abs(reqField - totalActualField))} ساعة.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card.Body>
          </Card>
        </Modal.Body>

        {/* ── Modal Footer ── */}
        <Modal.Footer className="d-flex justify-content-between align-items-center">
          <div className="d-flex gap-2">
            <Button
              variant="success"
              className="px-4 fw-bold"
              style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
              onClick={handleSaveAndAddAnother}
            >
              + حفظ وإضافة مقرر آخر
            </Button>
            <Button
              variant="success"
              className="px-4 fw-bold"
              style={{ backgroundColor: "#1b5e20", borderColor: "#1b5e20" }}
              onClick={() => validateAndAddRow()}
            >
              ✓ إضافة للجدول الرئيسي
            </Button>
          </div>
          <Button variant="secondary" className="px-4 fw-bold" onClick={() => setShowModal(false)}>
            إغلاق
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Copy Plan Modal ── */}
      <Modal show={showCopyPlanModal} onHide={() => setShowCopyPlanModal(false)} dialogClassName="copy-plan-modal" centered dir="rtl" backdrop="static">
        <Modal.Header closeButton style={{ backgroundColor: "#2e7d32" }}>
          <Modal.Title className="fw-bold text-white d-flex align-items-center gap-2">
            <FaCopy /> نسخ الخطة الدراسية من عام آخر
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Alert variant="info" className="d-flex align-items-center gap-2 mb-3">
            <FaInfoCircle size={22} className="flex-shrink-0" />
            <span>سيتم نسخ المقررات والمجموعات وأعضاء هيئة التدريس المسجلين من العام والفصل المحدد، وإدراجها في الخطة الحالية.</span>
          </Alert>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">اختر العام الجامعي المصدر (المراد النسخ منه):</Form.Label>
            <Form.Select value={sourceAcademicYear} onChange={e => setSourceAcademicYear(e.target.value)}>
              {(academicYears.length > 0 ? academicYears : YEARS).filter(y => y !== selectedYear).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">اختر الفصل الدراسي المصدر:</Form.Label>
            <Form.Select value={sourceSemester} onChange={e => setSourceSemester(e.target.value)}>
              {SEMESTERS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          <Button variant="success" className="fw-bold px-4" onClick={handleExecuteCopyPlan} disabled={copyingPlan} style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}>
            {copyingPlan ? <Spinner animation="border" size="sm" /> : "📋 بدء عملية النسخ"}
          </Button>
          <Button variant="secondary" className="fw-bold" onClick={() => setShowCopyPlanModal(false)}>
            إغلاق
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Import Study Plan Modal ── */}
      <Modal 
        show={showImportModal} 
        onHide={() => setShowImportModal(false)} 
        size="xl" 
        centered 
        dir="rtl" 
        backdrop="static"
      >
        <Modal.Header closeButton style={{ backgroundColor: "#15803d" }}>
          <Modal.Title className="fw-bold text-white d-flex align-items-center gap-2">
            <FaFileExcel className="fs-4" /> استيراد الخطة الدراسية من ملف Excel (نموذج معتمد)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: "#f8fafc" }}>
          {/* الخطوة 1: الكلية المحددة وتحميل النموذج */}
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "10px" }}>
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <h5 className="fw-bold text-dark d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-success rounded-pill px-3 py-2">1</span>
                    <span>الكلية المختارة وتحميل النموذج المعتمد</span>
                  </h5>
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <span className="text-muted fw-bold">الكلية المحددة بالصفحة:</span>
                    <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2 fs-6 fw-bold">
                      🏛️ {faculties.find(f => String(f.id) === String(selectedFaculty))?.name || "الكلية المحددة"}
                    </span>
                  </div>
                  <div className="mt-2 text-muted small">
                    {(() => {
                      const selFac = faculties.find(f => String(f.id) === String(selectedFaculty));
                      const isHealth = selFac?.name?.includes("تكنولوجيا العلوم الصحية") || selFac?.name?.includes("العلوم الصحية");
                      return isHealth ? (
                        <span className="text-primary fw-bold">
                          💡 ملاحظة خاصة: نموذج كلية تكنولوجيا العلوم الصحية يشمل تلقائياً أعمدة (مجموعات وساعات التوتوريال والحقل).
                        </span>
                      ) : (
                        <span>💡 النموذج يحتوي على الأعمدة المعتمدة للمقررات والمجموعات وأعضاء هيئة التدريس الخاصة بهذه الكلية.</span>
                      );
                    })()}
                  </div>
                </div>

                <Button 
                  variant="success" 
                  className="px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow-sm"
                  onClick={handleDownloadImportTemplate}
                  disabled={isDownloadingTemplate}
                  style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
                >
                  {isDownloadingTemplate ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <>
                      <FaFileDownload className="fs-5" />
                      <span>تحميل نموذج Excel المعتمد</span>
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* الخطوة 2: رفع ومعالجة الملف */}
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "10px" }}>
            <Card.Body className="p-3">
              <h5 className="fw-bold text-dark d-flex align-items-center gap-2 mb-3">
                <span className="badge bg-success rounded-pill px-3 py-2">2</span>
                <span>رفع ملف الخطة بعد تعبئته (Excel)</span>
              </h5>
              
              <div className="border border-2 border-dashed rounded-3 p-4 text-center bg-white" style={{ borderColor: "#cbd5e1" }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".xlsx, .xls" 
                  onChange={handleProcessImportFile} 
                  style={{ display: "none" }} 
                  id="excelImportFileInput"
                />
                <FaFileUpload className="text-success mb-2" size={40} />
                <h6 className="fw-bold mb-2">اضغط لاختيار ملف الخطة المكتمل (Excel .xlsx)</h6>
                <p className="text-muted small mb-3">
                  سيقوم النظام بفحص كود المقرر، البرامج، والرقم القومي للأساتذة ومطابقتها مع قاعدة البيانات بدقة.
                </p>
                <Button 
                  variant="success" 
                  className="fw-bold px-4 py-2" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
                >
                  {importing ? (
                    <>
                      <Spinner animation="border" size="sm" className="ms-2" /> جارٍ التحقق من الملف...
                    </>
                  ) : (
                    <>
                      <FaFileUpload className="ms-2" /> اختر الملف للفحص والاستيراد
                    </>
                  )}
                </Button>
                {importFile && (
                  <div className="mt-2 text-dark small fw-bold">
                    الملف المحدد: <span className="text-primary">{importFile.name}</span>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* الأخطاء والتنبيهات */}
          {importErrors.length > 0 && (
            <Alert variant="danger" className="border-0 shadow-sm mb-4" style={{ borderRadius: "10px" }}>
              <div className="d-flex align-items-center gap-2 mb-2 fw-bold fs-6">
                <FaExclamationTriangle size={20} className="text-danger flex-shrink-0" />
                <span>تعذر استيراد الخطة بسبب وجود ({importErrors.length}) ملاحظات / أخطاء يجب تصحيحها:</span>
              </div>
              <ul className="mb-0 pe-4 small" style={{ maxHeight: "200px", overflowY: "auto", lineHeight: "1.8" }}>
                {importErrors.map((err, i) => (
                  <li key={i} className="text-danger fw-bold">{err}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* المعاينة والتأكيد */}
          {importPreviewData.length > 0 && importErrors.length === 0 && (
            <Card className="border-0 shadow-sm" style={{ borderRadius: "10px" }}>
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <h5 className="fw-bold text-success d-flex align-items-center gap-2 mb-0">
                    <FaCheckCircle className="text-success" />
                    <span>جاهز للاستيراد ({importPreviewData.length} سجل صحيح ومطابق لقاعدة البيانات)</span>
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold small text-muted">طريقة الإدراج:</span>
                    <Form.Check
                      inline
                      type="radio"
                      id="importModeAppend"
                      name="importMode"
                      label="إضافة للجدول الحالي"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                      className="fw-bold small"
                    />
                    <Form.Check
                      inline
                      type="radio"
                      id="importModeReplace"
                      name="importMode"
                      label="استبدال الجدول الحالي"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="fw-bold small text-danger"
                    />
                  </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: "280px", overflowY: "auto" }}>
                  <Table bordered hover size="sm" className="align-middle text-center mb-0 small">
                    <thead className="table-success sticky-top">
                      <tr>
                        <th>#</th>
                        <th>كود المقرر</th>
                        <th>اسم المقرر</th>
                        <th>البرنامج</th>
                        <th>الطلاب</th>
                        <th>مجموعات (ن/ع)</th>
                        <th>عضو هيئة التدريس</th>
                        <th>الدرجة العلمية</th>
                        <th>جهة القدوم</th>
                        <th>ساعات (ن/ع)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="fw-bold text-primary">{row.code}</td>
                          <td>{row.nameAr}</td>
                          <td>{row.program_names || "--"}</td>
                          <td>{row.student_count}</td>
                          <td>{row.groups_theory} / {row.groups_practical}</td>
                          <td className="fw-bold text-success">{row.professor_name}</td>
                          <td>{getJobTitleFull(row.prof_job_title)}</td>
                          <td className="small text-muted">{row.prof_workplace || "--"}</td>
                          <td className="fw-bold">{row.hours_actual_theory} / {row.hours_actual_practical}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          )}
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between p-3 bg-light">
          <Button 
            variant="success" 
            className="fw-bold px-4 py-2" 
            onClick={handleConfirmImport} 
            disabled={importPreviewData.length === 0 || importErrors.length > 0 || importing}
            style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
          >
            {importing ? <Spinner animation="border" size="sm" /> : `✓ تأكيد استيراد (${importPreviewData.length}) سجل للخطة`}
          </Button>
          <Button variant="secondary" className="fw-bold px-4" onClick={() => setShowImportModal(false)}>
            إلغاء
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StudyPlanPage;