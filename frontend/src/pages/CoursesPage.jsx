import { FaBook } from "react-icons/fa";

import React, { useEffect, useState, useContext } from 'react';

import axios from 'axios';

import { Table, Button, Modal, Form, Pagination, Spinner, Col, Row } from 'react-bootstrap';

import Select from 'react-select';

import toast from 'react-hot-toast';

import logo from '../assets/logo.png';

import { confirmAction } from '../utils/confirmAlert';

import { AuthContext } from '../context/AuthContext';



const formatFailRate = (rate) => {

  if (!rate) return "-";

  if (typeof rate !== 'string') return rate;

  if (rate.includes(":")) {

    const parts = rate.split(":");

    return parts[0] + " : \u200e" + parts[1];

  }

  return rate;

};



const CoursesPage = () => {

  const { user } = useContext(AuthContext);



  const isMedicineRelated = (

    ((user?.role === 'faculty_admin' || user?.role === 'faculty_professor') && user?.faculty?.name === 'كلية الطب والجراحة') ||

    (user?.role === 'reviewer' && user?.assigned_faculties?.some(f => f.name === 'كلية الطب والجراحة'))

  );



  const showMedicineTemplate = isMedicineRelated || user?.role === 'admin' || user?.role === 'student_affairs';

  const showOtherFacultiesTemplate = !isMedicineRelated;



  const [courses, setCourses] = useState([]);

  const [faculties, setFaculties] = useState([]);

  const [programs, setPrograms] = useState([]);

  const [failRates, setFailRates] = useState([]);

  const [courseSignatures, setCourseSignatures] = useState([]);

  const [academicYears, setAcademicYears] = useState([]);

  const [pageLoading, setPageLoading] = useState(true);



  // البحث والفلترة

  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;



  // المودال الخاص بالإضافة والتعديل والعرض

  const [showModal, setShowModal] = useState(false);

  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'

  const [selectedCourse, setSelectedCourse] = useState(null);



  // بيانات الفورم للمقرر

  const [formData, setFormData] = useState({

    code: "",

    name_ar: "",

    name_en: "",

    level: "",

    semester: "الفصل الدراسي الأول",

    year: "",

    theory_hours: 0.0,

    practical_hours: 0.0,

    exercise_hours: 0.0,

    activity_hours: 0.0,

    total_grade: 0.0,

    theory_grade: 0.0,

    practical_grade: 0.0,

    year_work_grade: 0.0,

    exam_time_hours: "",

    duration: "",

    faculty_id: "",

    program_id: "",

    // الحقول الإضافية

    course_type: "",

    other_programs: "",

    requirement: "",

    prerequisite: "",

    concurrent_courses: "",

    added_to_gpa: "",

    pass_fail: "",

    credit_hours: 0.0,

    summer_registration: "",

    study_hours: "",

    midterm_grade: "",

    written_grade: "",

    oral_grade: "",

    clinical_grade: "",

    final_eval_grade: "",

    midterm_2_grade: "",

    attendance_activity_grade: "",

    success_rate: "",

    fail_rate: "",

    elective_group_code: "",

    elective_courses_count: "",

    description: ""

  });



  const [errors, setErrors] = useState({});



  // Medicine Faculty States

  const [durationMode, setDurationMode] = useState('رقم');

  const [durationWeeks, setDurationWeeks] = useState('');

  const [medDepartments, setMedDepartments] = useState([]);

  const [customMedDept, setCustomMedDept] = useState('');



  const medDepartmentOptions = [

    { value: 'Community Medicine', label: 'Community Medicine' },

    { value: 'General Surgery', label: 'General Surgery' },

    { value: 'Germen language', label: 'Germen language' },

    { value: 'Emergency unit Neuropsychiatry', label: 'Emergency unit Neuropsychiatry' },

    { value: 'Pathology', label: 'Pathology' },

    { value: 'Biochemistry', label: 'Biochemistry' },

    { value: 'Physiology', label: 'Physiology' },

    { value: 'Histology', label: 'Histology' },

    { value: 'Anatomy', label: 'Anatomy' },

    { value: 'Family Medicine', label: 'Family Medicine' },

    { value: 'English Language', label: 'English Language' },

    { value: 'Forensic Medicine and Clinical Toxicology', label: 'Forensic Medicine and Clinical Toxicology' },

    { value: 'Otorhinolaryngology', label: 'Otorhinolaryngology' },

    { value: 'Ophthalmology', label: 'Ophthalmology' },

    { value: 'other', label: 'other' }

  ];



  // مودال الاستيراد

  const [showImportModal, setShowImportModal] = useState(false);

  const [excelFile, setExcelFile] = useState(null);

  const [importing, setImporting] = useState(false);

  const [importResult, setImportResult] = useState(null);



  // مودال الطباعة والتصدير

  const [showPrintModal, setShowPrintModal] = useState(false);

  const [printSearchTerm, setPrintSearchTerm] = useState("");

  const [selectedRows, setSelectedRows] = useState([]);

  const [printLevel, setPrintLevel] = useState("");

  const [printSemester, setPrintSemester] = useState("");

  const [printCourseType, setPrintCourseType] = useState("");

  const [printSummerReg, setPrintSummerReg] = useState("");

  const [printAddedToGpa, setPrintAddedToGpa] = useState("");

  const [printPassFail, setPrintPassFail] = useState("");



  const normalizeArabic = (text) => {

    if (!text) return "";

    return String(text)

      .toLowerCase()

      .replace(/[أإآ]/g, "ا")

      .replace(/ة/g, "ه")

      .replace(/ى/g, "ي")

      .replace(/[\s-_]/g, "")

      .trim();

  };



  // دالة تجميع المقررات المتطابقة في الكود والاسم ودمج حقولها

  const getGroupedCourses = (list) => {

    const grouped = {};

    list.forEach(c => {

      const key = `${(c.name_ar || "").trim().toLowerCase()}_${(c.code || "").trim().toLowerCase()}`;

      if (!grouped[key]) {

        grouped[key] = {

          ...c,

          allIds: [c.id],

          programsList: c.program?.name ? [c.program.name] : [],

          facultiesList: c.faculty?.name ? [c.faculty.name] : [],

        };

      } else {

        grouped[key].allIds.push(c.id);

        if (c.program?.name && !grouped[key].programsList.includes(c.program.name)) {

          grouped[key].programsList.push(c.program.name);

        }

        if (c.faculty?.name && !grouped[key].facultiesList.includes(c.faculty.name)) {

          grouped[key].facultiesList.push(c.faculty.name);

        }



        // دمج جميع الحقول غير الصفرية وغير الشرطات لضمان عدم ضياع أي بيانات

        const fieldsToMerge = [

          'theory_hours', 'practical_hours', 'exercise_hours', 'activity_hours', 'exam_time_hours', 'study_hours',

          'total_grade', 'theory_grade', 'practical_grade', 'year_work_grade',

          'midterm_grade', 'written_grade', 'oral_grade', 'clinical_grade', 'final_eval_grade', 'midterm_2_grade', 'attendance_activity_grade',

          'success_rate', 'fail_rate', 'elective_group_code', 'elective_courses_count', 'credit_hours',

          'course_type', 'other_programs', 'requirement', 'prerequisite', 'concurrent_courses', 'added_to_gpa', 'pass_fail', 'summer_registration', 'description'

        ];



        fieldsToMerge.forEach(field => {

          const valA = grouped[key][field];

          const valB = c[field];



          const isEmpty = (v) => v === undefined || v === null || String(v).trim() === "" || String(v).trim() === "-";



          if (isEmpty(valA) && !isEmpty(valB)) {

            grouped[key][field] = valB;

          } else if (!isEmpty(valA) && !isEmpty(valB)) {

            const numA = parseFloat(valA);

            const numB = parseFloat(valB);

            if (!isNaN(numA) && !isNaN(numB)) {

              if (numA === 0 && numB !== 0) {

                grouped[key][field] = valB;

              } else if (numA !== 0 && numB === 0) {

                // احتفظ بـ valA

              } else {

                grouped[key][field] = Math.max(numA, numB);

              }

            } else {

              if (valA === "-" && valB !== "-") {

                grouped[key][field] = valB;

              }

            }

          }

        });

      }

    });

    return Object.values(grouped);

  };



  useEffect(() => {

    fetchData();

  }, []);



  // Auto-calculate total grade in real-time based on components

  useEffect(() => {

    if (modalMode !== 'view' && showModal) {

      const yearWork = parseFloat(formData.year_work_grade) || 0;

      const theory = parseFloat(formData.theory_grade) || 0;

      const practical = parseFloat(formData.practical_grade) || 0;

      const midterm = parseFloat(formData.midterm_grade) || 0;

      const midterm2 = parseFloat(formData.midterm_2_grade) || 0;

      const oral = parseFloat(formData.oral_grade) || 0;

      const written = parseFloat(formData.written_grade) || 0;

      const clinical = parseFloat(formData.clinical_grade) || 0;

      const finalEval = parseFloat(formData.final_eval_grade) || 0;

      const attendance = parseFloat(formData.attendance_activity_grade) || 0;



      const calculatedTotal = yearWork + theory + practical + midterm + midterm2 + oral + written + clinical + finalEval + attendance;

      if (calculatedTotal !== parseFloat(formData.total_grade)) {

        setFormData(prev => ({

          ...prev,

          total_grade: calculatedTotal

        }));

      }

    }

  }, [

    formData.year_work_grade,

    formData.theory_grade,

    formData.practical_grade,

    formData.midterm_grade,

    formData.midterm_2_grade,

    formData.oral_grade,

    formData.written_grade,

    formData.clinical_grade,

    formData.final_eval_grade,

    formData.attendance_activity_grade,

    modalMode,

    showModal

  ]);



  // تسجيل الإشعارات باستخدام الفصل الدراسي والعام الجامعي المختارين في الخطة الدراسية

  const logAction = async (actionText, facultyIds = null) => {

    try {

      const resolvedYear = localStorage.getItem('studyplan_year') || null;

      const resolvedSemester = localStorage.getItem('studyplan_semester') || null;

      await axios.post('/api/notifications/log', {

        action_text: actionText,

        faculty_ids: facultyIds,

        academic_year: resolvedYear,

        semester: resolvedSemester

      }, {

        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }

      });

    } catch (error) {

      console.error("Error logging action", error);

    }

  };



  const fetchData = async () => {



    try {

      const [resCourses, resFacs, resProgs, resFailRates, resSigs, resYears] = await Promise.all([

        axios.get('/api/courses'),

        axios.get('/api/faculties'),

        axios.get('/api/programs'),

        axios.get('/api/courses/fail_rates'),

        axios.get('/api/signatures?report_type=المقرارات الدراسية'),

        axios.get('/api/academic-years')

      ]);

      setCourses(resCourses.data);

      setFaculties(resFacs.data);

      setPrograms(resProgs.data);

      setFailRates(resFailRates.data);

      setCourseSignatures(resSigs.data);

      setAcademicYears(resYears.data);

    } catch (error) {

      console.error("خطأ أثناء تحميل البيانات:", error);

    } finally {

      setPageLoading(false);

    }

  };



  // تصفية مستويات البرامج بناءً على المسمى المعتمد

  const getLevelsForProgram = (programId) => {

    if (!programId) return [1, 2, 3, 4, 5];

    const program = programs.find(p => String(p.id) === String(programId));

    if (!program) return [1, 2, 3, 4, 5];



    const name = program.name || "";

    const norm = name.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, '').trim();



    if (norm.includes("المستويالعام")) {

      return [0, 1];

    }

    if (norm.includes("الامنالسيبراني") || norm.includes("الحوسبهالسحابيه") || norm.includes("الحوسبهعاليهالكفاءه")) {

      return [2, 3, 4];

    }

    if (norm.includes("تخطيطوتشييد") || norm.includes("هندسهالحاسوب") || norm.includes("هندسهالمواد")) {

      return [0, 1, 2, 3, 4];

    }

    if (norm.includes("انترنيتالاشياء") || norm.includes("ذكاءالاله") || norm.includes("علومالبيانات") || norm.includes("اللغهالانجليزيه") || norm.includes("علومالتمريض") || norm.includes("تمريض")) {

      return [1, 2, 3, 4];

    }

    if (norm.includes("فارمدي") || norm.includes("بيطري") || norm.includes("بيطرى") || norm.includes("الفم") || norm.includes("الاسنان") || norm.includes("علاجطبيعي") || norm.includes("الطبوالجراحه") || norm.includes("طبوالجراحه")) {

      return [1, 2, 3, 4, 5];

    }

    if (norm.includes("عام") && norm.includes("تكنولوجيا")) {

      return [1, 2];

    }

    if (norm.includes("تكنولوجيا")) {

      return [1, 2, 3, 4];

    }



    return [1, 2, 3, 4, 5];

  };



  const getLevelLabel = (level) => {

    if (String(level) === "0") return "المستوى العام";

    if (String(level) === "1") return "المستوى الأول";

    if (String(level) === "2") return "المستوى الثاني";

    if (String(level) === "3") return "المستوى الثالث";

    if (String(level) === "4") return "المستوى الرابع";

    if (String(level) === "5") return "المستوى الخامس";

    return `المستوى ${level}`;

  };



  // فتح مودال الإضافة أو التعديل أو العرض

  const openModal = (course = null, mode = 'add') => {

    setModalMode(mode);

    setSelectedCourse(course);

    setErrors({});



    // Reset Medicine specific state

    setDurationMode('رقم');

    setDurationWeeks('');

    setMedDepartments([]);

    setCustomMedDept('');



    if (course) {

      setFormData({

        code: course.code || "",

        name_ar: course.name_ar || "",

        name_en: course.name_en || "",

        level: course.level !== undefined ? course.level : "",

        semester: course.semester || "الفصل الدراسي الأول",

        year: course.year || (academicYears.length > 0 ? academicYears[0].name : ""),

        theory_hours: course.theory_hours || 0.0,

        practical_hours: course.practical_hours || 0.0,

        exercise_hours: course.exercise_hours || 0.0,

        activity_hours: course.activity_hours || 0.0,

        total_grade: course.total_grade || 0.0,

        theory_grade: course.theory_grade || 0.0,

        practical_grade: course.practical_grade || 0.0,

        year_work_grade: course.year_work_grade || 0.0,

        exam_time_hours: course.exam_time_hours || "",

        duration: course.duration || "",

        faculty_id: course.faculty_id || "",

        program_id: course.program_id || "",

        // الحقول الإضافية للتعديل

        course_type: course.course_type || "",

        other_programs: course.other_programs || "",

        requirement: course.requirement || "",

        prerequisite: course.prerequisite || "",

        concurrent_courses: course.concurrent_courses || "",

        added_to_gpa: course.added_to_gpa || "",

        pass_fail: course.pass_fail || "",

        credit_hours: course.credit_hours || 0.0,

        summer_registration: course.summer_registration || "",

        study_hours: course.study_hours ? cleanGradeVal(course.study_hours) : "",

        midterm_grade: course.midterm_grade ? cleanGradeVal(course.midterm_grade) : "",

        written_grade: course.written_grade ? cleanGradeVal(course.written_grade) : "",

        oral_grade: course.oral_grade ? cleanGradeVal(course.oral_grade) : "",

        clinical_grade: course.clinical_grade ? cleanGradeVal(course.clinical_grade) : "",

        final_eval_grade: course.final_eval_grade ? cleanGradeVal(course.final_eval_grade) : "",

        midterm_2_grade: course.midterm_2_grade ? cleanGradeVal(course.midterm_2_grade) : "",

        attendance_activity_grade: course.attendance_activity_grade ? cleanGradeVal(course.attendance_activity_grade) : "",

        success_rate: course.success_rate ? cleanIntStr(course.success_rate) : "",

        fail_rate: course.fail_rate || "",

        elective_group_code: course.elective_group_code || "",

        elective_courses_count: course.elective_courses_count ? cleanIntStr(course.elective_courses_count) : "",

        description: course.description || ""

      });



      if (course.duration === "مقرر طولي") {

        setDurationMode('مقرر طولي');

        setDurationWeeks('');

      } else if (course.duration) {

        setDurationMode('رقم');

        setDurationWeeks(course.duration);

      }



      if (course.modules && course.modules.length > 0) {

        setMedDepartments(course.modules.map(m => ({

          department_name: m.department_name,

          theory_credit: m.theory_credit || 0.0,

          practical_credit: m.practical_credit || 0.0,

          activity_credit: m.activity_credit || 0.0,

          year_work_grade: m.year_work_grade || 0.0,

          practical_grade: m.practical_grade || 0.0,

          theory_grade: m.theory_grade || 0.0

        })));

      }



    } else {

      setFormData({

        code: "",

        name_ar: "",

        name_en: "",

        level: "",

        semester: "الفصل الدراسي الأول",

        year: academicYears.length > 0 ? academicYears[0].name : "",

        theory_hours: 0.0,

        practical_hours: 0.0,

        exercise_hours: 0.0,

        activity_hours: 0.0,

        total_grade: 0.0,

        theory_grade: 0.0,

        practical_grade: 0.0,

        year_work_grade: 0.0,

        exam_time_hours: "",

        duration: "",

        faculty_id: "",

        program_id: "",

        // الحقول الإضافية فارغة

        course_type: "",

        other_programs: "",

        requirement: "",

        prerequisite: "",

        concurrent_courses: "",

        added_to_gpa: "",

        pass_fail: "",

        credit_hours: 0.0,

        summer_registration: "",

        study_hours: "",

        midterm_grade: "",

        written_grade: "",

        oral_grade: "",

        clinical_grade: "",

        final_eval_grade: "",

        midterm_2_grade: "",

        attendance_activity_grade: "",

        success_rate: "",

        fail_rate: "",

        elective_group_code: "",

        elective_courses_count: "",

        description: ""

      });

    }

    setShowModal(true);

  };



  // حفظ بيانات المقرر

  const handleSave = async () => {

    const errs = {};

    const codeRegex = /^[a-zA-Z0-9 .\-/]+$/;

    if (!formData.code || !formData.code.trim()) {

      errs.code = "كود المقرر مطلوب";

    } else if (!codeRegex.test(formData.code)) {

      errs.code = "كود المقرر يجب أن يتكون من حروف وأرقام إنجليزية ومسافات وعلامات خاصة مثل ( - ، . ، / ) فقط";

    }



    // التحقق من إدخال أحد الاسمين على الأقل والتحقق من التعبيرات النمطية لهما

    const hasNameAr = formData.name_ar && formData.name_ar.trim();

    const hasNameEn = formData.name_en && formData.name_en.trim();

    if (!hasNameAr && !hasNameEn) {

      errs.name_ar = "يجب إدخال اسم المقرر بالعربي أو بالإنجليزي على الأقل";

      errs.name_en = "يجب إدخال اسم المقرر بالعربي أو بالإنجليزي على الأقل";

    } else {

      if (hasNameAr) {

        // منع الأرقام العربية الشرقية (٠-٩) والسماح بالأرقام الإنجليزية (0-9) والحروف العربية والإنجليزية

        const hasArabicNumbers = /[\u0660-\u0669\u06F0-\u06F9]/.test(formData.name_ar);

        if (hasArabicNumbers) {

          errs.name_ar = "اسم المقرر بالعربي يجب أن يحتوي على أرقام إنجليزية (0-9) فقط ولا يسمح بالأرقام العربية (٠-٩)";

        }

      }

      if (hasNameEn) {

        // السماح بالحروف الإنجليزية والأرقام الإنجليزية وعلامات الترقيم والمسافات فقط (يمنع أي نص عربي أو أرقام عربية)

        const englishRegex = /^[A-Za-z0-9\s.,_\-\(\)\[\]\/\\:;!?#@&'"\*\+=<>%]*$/;

        if (!englishRegex.test(formData.name_en)) {

          errs.name_en = "اسم المقرر بالإنجليزي يجب أن يحتوي على حروف وأرقام إنجليزية وعلامات ترقيم فقط";

        }

      }

    }



    if (!formData.faculty_id) errs.faculty_id = "الكلية مطلوبة";

    

    const selectedFacultyName = faculties.find(f => String(f.id) === String(formData.faculty_id))?.name;

    const isMedicine = selectedFacultyName === "كلية الطب والجراحة";



    if (!formData.program_id && !isMedicine) {
      const facPrograms = programs.filter(p => String(p.faculty_id) === String(formData.faculty_id));
      if (facPrograms.length > 0 && parseInt(formData.level) !== 0) {
        errs.program_id = "البرنامج مطلوب";
      }
    }

    if (formData.level === "" || formData.level === undefined || formData.level === null) errs.level = "المستوى مطلوب";

    if (!formData.semester || !formData.semester.trim()) errs.semester = "الفصل الدراسي مطلوب";

    if (!isMedicine) {
      if (formData.credit_hours === undefined || formData.credit_hours === null || String(formData.credit_hours).trim() === "") {
        errs.credit_hours = "الساعات المعتمدة مطلوبة";
      } else {
        const creditHoursVal = parseFloat(formData.credit_hours);
        if (isNaN(creditHoursVal) || creditHoursVal < 0 || creditHoursVal > 10) {
          errs.credit_hours = "الساعات المعتمدة يجب أن تكون بين 0 و 10";
        }
      }
    }

    // التحقق من أن نسبة النجاح عدد صحيح بين 50 و 65
    if (formData.success_rate !== undefined && formData.success_rate !== null && String(formData.success_rate).trim() !== "") {
      const val = parseFloat(formData.success_rate);
      if (isNaN(val) || !Number.isInteger(val) || val < 50 || val > 65) {
        errs.success_rate = "نسبة النجاح يجب أن تكون عدداً صحيحاً بين 50 و 65";
      }
    }

    // التحقق من صحة حقول الأرقام الاختيارية
    const optionalNumericFields = [
      { key: 'study_hours', name: 'الساعات الدراسية' },
      { key: 'midterm_grade', name: 'درجة منتصف الفصل' },
      { key: 'midterm_2_grade', name: 'درجة منتصف الفصل ٢' },
      { key: 'oral_grade', name: 'درجة الشفوي' },
      { key: 'written_grade', name: 'درجة التحريري خلال الفصل' },
      { key: 'clinical_grade', name: 'درجة الكلينك' },
      { key: 'final_eval_grade', name: 'درجة التقييم النهائي' },
      { key: 'attendance_activity_grade', name: 'درجة الحضور والأنشطة والسمات' }
    ];

    optionalNumericFields.forEach(f => {
      const val = formData[f.key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          errs[f.key] = `${f.name} يجب أن تكون رقماً أكبر من أو يساوي 0`;
        }
      }
    });

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErr = Object.values(errs)[0];
      toast.error(`يرجى مراجعة البيانات: ${firstErr}`);
      return;
    }



    try {

      let payload = {};

      if (isMedicine) {

        const totalCred = medDepartments.reduce((sum, d) => sum + (parseFloat(d.theory_credit) || 0) + (parseFloat(d.practical_credit) || 0) + (parseFloat(d.activity_credit) || 0), 0);

        const totalTheoryHours = medDepartments.reduce((sum, d) => sum + ((parseFloat(d.theory_credit) || 0) * 15), 0);

        const totalPracticalHours = medDepartments.reduce((sum, d) => sum + ((parseFloat(d.practical_credit) || 0) * 30), 0);

        const totalActivityHours = medDepartments.reduce((sum, d) => sum + ((parseFloat(d.activity_credit) || 0) * 60), 0);

        payload = {

          code: formData.code,

          name_ar: formData.name_ar,

          name_en: formData.name_en,

          faculty_id: parseInt(formData.faculty_id),

          program_id: parseInt(formData.program_id) || 0,

          level: parseInt(formData.level) || 0,

          semester: formData.semester,

          year: formData.year,

          course_type: formData.course_type,

          duration: durationMode === 'رقم' ? durationWeeks : durationMode,

          exam_time_hours: String(formData.exam_time_hours || ""),

          credit_hours: Number(totalCred.toFixed(2)),

          theory_hours: Number(totalTheoryHours.toFixed(2)),

          practical_hours: Number(totalPracticalHours.toFixed(2)),

          activity_hours: Number(totalActivityHours.toFixed(2)),

          is_bundle: true,

          modules: medDepartments.map(m => ({

            department_name: m.department_name,

            theory_credit: parseFloat(m.theory_credit) || 0,

            practical_credit: parseFloat(m.practical_credit) || 0,

            activity_credit: parseFloat(m.activity_credit) || 0,

            theory_hours: Number(((parseFloat(m.theory_credit) || 0) * 15).toFixed(2)),

            practical_hours: Number(((parseFloat(m.practical_credit) || 0) * 30).toFixed(2)),

            activity_hours: Number(((parseFloat(m.activity_credit) || 0) * 60).toFixed(2)),

            theory_grade: parseFloat(m.theory_grade) || 0,

            practical_grade: parseFloat(m.practical_grade) || 0,

            year_work_grade: parseFloat(m.year_work_grade) || 0,

            credit_hours: Number(((parseFloat(m.theory_credit) || 0) + (parseFloat(m.practical_credit) || 0) + (parseFloat(m.activity_credit) || 0)).toFixed(2)),

            total_grade: Number(((parseFloat(m.theory_grade) || 0) + (parseFloat(m.practical_grade) || 0) + (parseFloat(m.year_work_grade) || 0)).toFixed(2))

          }))

        };

      } else {

        payload = {

          ...formData,

          theory_hours: parseFloat(formData.theory_hours) || 0.0,

          practical_hours: parseFloat(formData.practical_hours) || 0.0,

          exercise_hours: parseFloat(formData.exercise_hours) || 0.0,

          activity_hours: parseFloat(formData.activity_hours) || 0.0,

          total_grade: parseFloat(formData.total_grade) || 0.0,

          theory_grade: parseFloat(formData.theory_grade) || 0.0,

          practical_grade: parseFloat(formData.practical_grade) || 0.0,

          year_work_grade: parseFloat(formData.year_work_grade) || 0.0,

          exam_time_hours: String(formData.exam_time_hours || ""),

          credit_hours: parseFloat(formData.credit_hours) || 0.0,

          faculty_id: parseInt(formData.faculty_id),

          program_id: parseInt(formData.program_id),

          level: parseInt(formData.level),

          is_bundle: false

        };

      }



      if (modalMode === 'add') {

        const res = await axios.post('/api/courses', payload);

        toast.success("تمت إضافة المقرر بنجاح");

        const fid = payload.faculty_id ? [payload.faculty_id] : null;

        logAction(`قام بإضافة مقرر جديد: ${payload.name_ar || payload.name_en || payload.code}`, fid);

      } else {

        await axios.put(`/api/courses/${selectedCourse.id}`, payload);

        toast.success("تم تحديث بيانات المقرر بنجاح");

        const fid = payload.faculty_id ? [payload.faculty_id] : null;

        logAction(`قام بتعديل بيانات مقرر: ${payload.name_ar || payload.name_en || payload.code}`, fid);

      }

      setShowModal(false);

      fetchData();

    } catch (err) {

      toast.error("حدث خطأ أثناء الحفظ: " + (err.response?.data?.detail || "خطأ غير معروف"));

    }

  };



  // حذف مقرر

  const handleDelete = async (courseIdOrIds) => {

    if (await confirmAction("هل أنت متأكد من حذف هذا المقرر الدراسي نهائياً؟")) {

      try {

        const ids = Array.isArray(courseIdOrIds) ? courseIdOrIds : [courseIdOrIds];

        // احفظ بيانات المقرر قبل الحذف لتسجيل اسمه في الإشعار

        const deletedCourse = courses.find(c => ids.includes(c.id));

        for (const id of ids) {

          await axios.delete(`/api/courses/${id}`);

        }

        fetchData();

        toast.success("تم حذف المقرر بنجاح");

        const fid = deletedCourse?.faculty_id ? [deletedCourse.faculty_id] : null;

        logAction(`قام بحذف مقرر: ${deletedCourse?.name_ar || deletedCourse?.name_en || deletedCourse?.code || 'غير محدد'}`, fid);

      } catch (err) {

        toast.error("حدث خطأ أثناء الحذف، يرجى المحاولة مرة أخرى");

      }

    }

  };



  // استيراد من إكسيل

  const handleDownloadTemplate = () => {

    const link = document.createElement("a");

    link.href = "/api/courses/template";

    link.setAttribute("download", "نموذج_استيراد_المقررات_الاسترشادية.xlsx");

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };



  const handleDownloadMedicineTemplate = () => {

    const link = document.createElement("a");

    link.href = "/api/courses/template/medicine";

    link.setAttribute("download", "نموذج_استيراد_المقررات_الدراسية_طب.xlsx");

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };



  const handleImportExcel = async () => {

    if (!excelFile) return;

    setImporting(true);

    setImportResult(null);



    const fData = new FormData();

    fData.append("file", excelFile);



    try {

      const res = await axios.post("/api/courses/import-all", fData, {

        headers: { "Content-Type": "multipart/form-data" }

      });

      setImportResult({

        success: true,

        message: res.data.message,

        imported: res.data.imported,

        updated: res.data.updated,

        total: res.data.total,

        imported_details: res.data.imported_details,

        updated_details: res.data.updated_details

      });

      fetchData();

    } catch (err) {

      setImportResult({

        success: false,

        message: err.response?.data?.detail || "فشل استيراد الملف، تأكد من الصيغة والبيانات"

      });

    } finally {

      setImporting(false);

    }

  };



  const matchesSemester = (courseSem, targetSem) => {

    if (!targetSem) return true;

    if (!courseSem) return false;



    const cSem = String(courseSem).trim().toLowerCase();

    const tSem = String(targetSem).trim().toLowerCase();



    if (cSem === tSem) return true;



    if (tSem.includes("أول") || tSem.includes("اول") || tSem === "1") {

      return cSem.includes("أول") || cSem.includes("اول") || cSem === "1";

    }

    if (tSem.includes("ثان") || tSem === "2") {

      return cSem.includes("ثان") || cSem === "2";

    }

    if (tSem.includes("صيف") || tSem === "3") {

      return cSem.includes("صيف") || cSem === "3";

    }



    return cSem.includes(tSem) || tSem.includes(cSem);

  };



  const matchesCourseType = (course, targetType) => {

    if (!targetType) return true;

    if (targetType === "مقرر طولي") {

      return course.duration === "مقرر طولي";

    }

    if (targetType === "حزمة دراسية") {

      if (!course.is_bundle) return false;

      if (course.duration === "مقرر طولي") return false;

      let isDashDept = false;

      if (course.modules && course.modules.length > 0) {

        isDashDept = course.modules.every(m => !m.department_name || String(m.department_name).trim() === "-");

      } else {

        isDashDept = !course.department_name || String(course.department_name).trim() === "-";

      }

      return !isDashDept;

    }

    const courseType = course.course_type;

    if (!courseType) return false;

    const cType = String(courseType).trim().toLowerCase();

    const tType = String(targetType).trim().toLowerCase();

    return cType === tType || cType.includes(tType) || tType.includes(cType);

  };



  const matchesSummerReg = (summerReg, targetReg) => {

    if (!targetReg) return true;

    const sReg = String(summerReg || "").trim().toLowerCase();

    const tReg = String(targetReg).trim().toLowerCase();

    if (tReg === "نعم" || tReg.includes("نعم") || tReg === "true" || tReg === "1") {

      return sReg === "نعم" || sReg.includes("نعم") || sReg === "true" || sReg === "1";

    }

    if (tReg === "لا" || tReg.includes("لا") || tReg === "false" || tReg === "0") {

      return !sReg || sReg === "لا" || sReg.includes("لا") || sReg === "false" || sReg === "0";

    }

    return sReg === tReg;

  };



  const matchesAddedToGpa = (courseGpa, targetGpa) => {

    if (!targetGpa) return true;

    if (!courseGpa) return false;

    const cGpa = String(courseGpa).trim();

    const tGpa = String(targetGpa).trim();

    return cGpa === tGpa;

  };



  const matchesPassFail = (coursePassFail, targetPassFail) => {

    if (!targetPassFail) return true;

    const cPF = String(coursePassFail || "").trim();

    const tPF = String(targetPassFail).trim();

    if (tPF === "- (فارغ)") return cPF === "" || cPF === "-" || cPF === "---";

    return cPF.toLowerCase() === tPF.toLowerCase();

  };



  const renderCourseSignaturesHTML = (facultyId, isGeneral = false) => {

    let facultySigs = [];

    if (isGeneral) {

      const vpSig = courseSignatures.find(sig => sig.signature_title.includes("نائب رئيس الجامع"));

      if (vpSig) facultySigs = [vpSig];

    } else {

      facultySigs = courseSignatures.filter(sig => String(sig.faculty_id) === String(facultyId));

    }

    if (!facultySigs || facultySigs.length === 0) return "";

    return `

      <div style="display: flex; justify-content: space-around; margin-top: 40px; margin-bottom: 30px; page-break-inside: avoid; flex-wrap: wrap; row-gap: 40px;">

        ${facultySigs.map(sig => `

          <div style="text-align: center; min-width: 100px; margin: 0 5px;">

            <div style="font-size: 14px; font-weight: bold; color: #1b5e20; margin-bottom: 20px;">${sig.signature_title}</div>

            <div style="font-size: 14px; font-weight: bold;">${sig.official_name}</div>

          </div>

        `).join("")}

      </div>

    `;

  };



  const renderCourseSignaturesExcelHTML = (facultyId, totalCols, isGeneral = false) => {

    let facultySigs = [];

    if (isGeneral) {

      const vpSig = courseSignatures.find(sig => sig.signature_title.includes("نائب رئيس الجامع"));

      if (vpSig) facultySigs = [vpSig];

    } else {

      facultySigs = courseSignatures.filter(sig => String(sig.faculty_id) === String(facultyId));

    }

    if (!facultySigs || facultySigs.length === 0) return "";



    let html = `<tr style="height: 30px;"><td colspan="${totalCols}" style="border: none;">&nbsp;</td></tr><tr style="height: 100px;">`;

    let remainingCols = totalCols;



    facultySigs.forEach((sig, index) => {

      const colSpan = (index === facultySigs.length - 1) ? remainingCols : Math.max(1, Math.floor(totalCols / facultySigs.length));

      remainingCols -= colSpan;

      html += `

        <td colspan="${colSpan}" style="text-align: center; border: none; font-size: 14pt; font-weight: bold; color: #1b5e20; vertical-align: middle; height: 100px;">

          ${sig.signature_title}<br style="mso-data-placement:same-cell;" />

          <br style="mso-data-placement:same-cell;" />

          ${sig.official_name}

        </td>

      `;

    });

    html += `</tr>`;

    return html;

  };



  // طباعة وتصدير

  const filteredPrint = getGroupedCourses(courses).filter(c => {

    if (printLevel && String(c.level) !== String(printLevel)) return false;

    if (!matchesSemester(c.semester, printSemester)) return false;

    if (!matchesCourseType(c, printCourseType)) return false;

    if (!matchesSummerReg(c.summer_registration, printSummerReg)) return false;

    if (!matchesAddedToGpa(c.added_to_gpa, printAddedToGpa)) return false;

    if (!matchesPassFail(c.pass_fail, printPassFail)) return false;



    const term = normalizeArabic(printSearchTerm);

    if (!term) return true;

    const nameArMatches = normalizeArabic(c.name_ar).includes(term);

    const nameEnMatches = normalizeArabic(c.name_en).includes(term);

    const codeMatches = normalizeArabic(c.code).includes(term);

    const facultyMatches = c.facultiesList.some(f => normalizeArabic(f).includes(term));

    const programMatches = c.programsList.some(p => normalizeArabic(p).includes(term));

    return nameArMatches || nameEnMatches || codeMatches || facultyMatches || programMatches;

  });



  const handlePrintSelected = () => {

    const selected = getGroupedCourses(courses).filter(c => selectedRows.includes(c.id));

    if (selected.length === 0) {

      toast.error("يرجى تحديد مقرر واحد على الأقل للطباعة");

      return;

    }

    const uniqueFacs = Array.from(new Set(selected.flatMap(c => c.facultiesList || [])));

    const uniqueProgs = Array.from(new Set(selected.flatMap(c => c.programsList || [])));

    const uniqueNames = Array.from(new Set(selected.map(c => c.name_ar).filter(Boolean)));



    let printFacultyId = selected[0]?.faculty_id;

    const uniqueFacultyIds = Array.from(new Set(selected.map(c => c.faculty_id).filter(Boolean)));



    let matchedFacultyId = null;

    const term = printSearchTerm ? normalizeArabic(printSearchTerm) : "";

    if (term) {

      const searchedFaculty = faculties.find(f => normalizeArabic(f.name).includes(term));

      if (searchedFaculty) {

        matchedFacultyId = searchedFaculty.id;

      }

    }



    let isGeneral = false;

    if (uniqueFacs.length > 1 && !matchedFacultyId) {

      isGeneral = true;

    }



    if (matchedFacultyId && uniqueFacultyIds.includes(matchedFacultyId)) {

      printFacultyId = matchedFacultyId;

    } else {

      for (let fid of uniqueFacultyIds) {

        if (courseSignatures.some(sig => String(sig.faculty_id) === String(fid))) {

          printFacultyId = fid;

          break;

        }

      }

    }



    let titleParts = [];



    if (uniqueNames.length === 1) {

      titleParts.push(`مقرر ${uniqueNames[0]}`);

      if (uniqueProgs.length === 1) titleParts.push(uniqueProgs[0]);

      if (uniqueFacs.length === 1) titleParts.push(uniqueFacs[0]);

    } else if (uniqueProgs.length === 1) {

      titleParts.push(uniqueProgs[0]);

      if (uniqueFacs.length === 1) titleParts.push(uniqueFacs[0]);

    } else if (uniqueFacs.length === 1) {

      titleParts.push(uniqueFacs[0]);

    } else if (printSearchTerm) {

      titleParts.push(printSearchTerm);

    }

    const levelLabels = { "0": "المستوى العام", "1": "المستوى الأول", "2": "المستوى الثاني", "3": "المستوى الثالث", "4": "المستوى الرابع", "5": "المستوى الخامس" };

    titleParts.push(printLevel ? (levelLabels[printLevel] || `المستوى ${printLevel}`) : "جميع المستويات");

    titleParts.push(printSemester ? printSemester : "جميع الفصول الدراسية");

    if (printCourseType) titleParts.push(`نوع المقرر: ${printCourseType}`);

    if (printSummerReg) titleParts.push(`تسجيل صيفي: ${printSummerReg}`);

    if (printAddedToGpa) titleParts.push(`المعدل التراكمي: ${printAddedToGpa}`);

    if (printPassFail) titleParts.push(`نجاح/رسوب: ${printPassFail}`);





    let documentTitle = "بيان المقررات الدراسية";

    if (titleParts.length > 0) {

      documentTitle += ` - ${titleParts.join(" - ")}`;

    }



    const isAllMedicine = selected.every(c => c.facultiesList && c.facultiesList.some(f => f.includes('الطب والجراحة')));



    let headersHtml = "";

    let rowsHtml = "";



    if (isAllMedicine) {

      headersHtml = `

        <tr>

          <th rowspan="2" style="text-align: center; vertical-align: middle;">كود المقرر</th>

          <th rowspan="2" style="text-align: center; vertical-align: middle;">اسم المقرر</th>



          <th rowspan="2" style="text-align: center; vertical-align: middle;">المستوى</th>

          <th rowspan="2" style="text-align: center; vertical-align: middle;">الترم</th>

          <th rowspan="2" style="text-align: center; vertical-align: middle;">القسم العلمي</th>

          <th colspan="3" style="text-align: center;">الساعات المعتمدة</th>

          <th colspan="3" style="text-align: center;">الساعات التدريسية</th>

          <th colspan="3" style="text-align: center;">توزيع الدرجات</th>

          <th rowspan="2" style="text-align: center; vertical-align: middle;">إجمالي الدرجة</th>

        </tr>

        <tr>

          <th style="text-align: center; background-color: #1b5e20 !important;">نظري</th><th style="text-align: center; background-color: #1b5e20 !important;">عملي</th><th style="text-align: center; background-color: #1b5e20 !important;">أنشطة</th>

          <th style="text-align: center; background-color: #1b5e20 !important;">نظري</th><th style="text-align: center; background-color: #1b5e20 !important;">عملي</th><th style="text-align: center; background-color: #1b5e20 !important;">أنشطة</th>

          <th style="text-align: center; background-color: #1b5e20 !important;">نظري</th><th style="text-align: center; background-color: #1b5e20 !important;">عملي</th><th style="text-align: center; background-color: #1b5e20 !important;">أعمال سنة</th>

        </tr>

      `;



      rowsHtml = selected.map(c => {

        const modules = c.modules && c.modules.length > 0 ? c.modules : [{

          department_name: c.department_name || "-",

          theory_credit: 0,

          practical_credit: 0,

          activity_credit: 0,

          theory_grade: 0,

          practical_grade: 0,

          year_work_grade: 0

        }];

        const rowSpan = modules.length;



        const codeTd = `<td rowspan="${rowSpan}" class="code-col">${c.code || "-"}</td>`;

        let combinedName = c.name_ar || "";

        if (c.name_en) combinedName += (combinedName ? "<br/>" : "") + `<span style="direction: ltr; display: inline-block;">${c.name_en}</span>`;

        const nameTd = `<td rowspan="${rowSpan}" class="name-col" style="white-space: pre-line;">${combinedName || "-"}</td>`;

        const facultyTd = `<td rowspan="${rowSpan}">${(c.facultiesList?.join(" - ") || "-")}</td>`;

        const progTd = `<td rowspan="${rowSpan}">${(c.programsList?.join(" - ") || "-")}</td>`;

        const levelTd = `<td rowspan="${rowSpan}">${c.level ? `المستوى ${c.level}` : "-"}</td>`;

        const semTd = `<td rowspan="${rowSpan}">${c.semester || "-"}</td>`;



        let moduleRows = "";

        modules.forEach((dept, idx) => {

          const tc = parseFloat(dept.theory_credit) || 0;

          const pc = parseFloat(dept.practical_credit) || 0;

          const ac = parseFloat(dept.activity_credit) || 0;

          const tg = parseFloat(dept.theory_grade) || 0;

          const pg = parseFloat(dept.practical_grade) || 0;

          const yg = parseFloat(dept.year_work_grade) || 0;

          const totalG = Number((tg + pg + yg).toFixed(2));



          const deptCells = `

            <td style="font-weight: bold; text-align: right; font-size: 12.5px;">${dept.department_name}</td>

            <td style="text-align: center;">${tc}</td><td style="text-align: center;">${pc}</td><td style="text-align: center;">${ac}</td>

            <td style="text-align: center; background-color: #f8fafc;">${Number((tc * 15).toFixed(2))}</td><td style="text-align: center; background-color: #f8fafc;">${Number((pc * 30).toFixed(2))}</td><td style="text-align: center; background-color: #f8fafc;">${Number((ac * 60).toFixed(2))}</td>

            <td style="text-align: center;">${tg}</td><td style="text-align: center;">${pg}</td><td style="text-align: center;">${yg}</td>

            <td style="text-align: center; font-weight: bold; background-color: #f8fafc; color: #198754;">${totalG}</td>

          `;



          if (idx === 0) {

            moduleRows += `<tr>${codeTd}${nameTd}${levelTd}${semTd}${deptCells}</tr>`;

          } else {

            moduleRows += `<tr>${deptCells}</tr>`;

          }

        });

        return moduleRows;

      }).join("");



    } else {

      const allCols = [

      { id: 'code', title: 'كود المقرر', val: c => c.code },

      { id: 'name_ar', title: 'اسم المقرر بالعربية', val: c => c.name_ar },

      { id: 'name_en', title: 'اسم المقرر بالإنجليزية', val: c => c.name_en },

      { id: 'faculty', title: 'اسم الكلية', val: c => c.facultiesList?.join(" - ") },

      { id: 'program', title: 'اسم البرنامج', val: c => c.programsList?.join(" - ") },

      { id: 'level', title: 'المستوى', val: c => c.level ? `المستوى ${c.level}` : "" },

      { id: 'semester', title: 'الترم', val: c => c.semester },



      { id: 'course_type', title: 'نوع المقرر', val: c => c.course_type },

      { id: 'scientific_departments', title: 'الأقسام العلمية', val: c => (c.modules && c.modules.length > 0) ? c.modules.map(m => m.department_name).join("\n") : (c.department_name || "-") },

      { id: 'department_credit_hours', title: 'الساعات المعتمدة للأقسام العلمية', val: c => (c.modules && c.modules.length > 0) ? c.modules.map(m => `${m.department_name}: ${m.credit_hours}`).join("\n") : "-" },

      { id: 'credit_hours', title: 'الساعات المعتمدة', val: c => c.credit_hours },



      { id: 'summer_registration', title: 'تسجيل المقرر في الصيفي', val: c => (c.summer_registration && String(c.summer_registration).trim() === 'نعم') ? 'نعم' : 'لا' },

      { id: 'requirement', title: 'متطلب', val: c => c.requirement },

      { id: 'prerequisite', title: 'المتطلب السابق', val: c => c.prerequisite },

      { id: 'concurrent_courses', title: 'المقررات المتزامنة', val: c => c.concurrent_courses },

      { id: 'added_to_gpa', title: 'يضاف للمعدل التراكمي', val: c => c.added_to_gpa },

      { id: 'pass_fail', title: 'مادة نجاح أو رسوب', val: c => c.pass_fail },

      { id: 'other_programs', title: 'البرامج الاخرى المسجل بها', val: c => c.other_programs },

      { id: 'theory_hours', title: 'الساعات - محاضرات', val: c => c.theory_hours },

      { id: 'exercise_hours', title: 'الساعات - تدريب', val: c => c.exercise_hours },

      { id: 'practical_hours', title: 'الساعات - عملي', val: c => c.practical_hours },

      { id: 'activity_hours', title: 'الساعات - ساعات التدريب الميداني', val: c => c.activity_hours },

      { id: 'exam_time_hours', title: 'الساعات - ساعات الامتحان', val: c => c.exam_time_hours },

      { id: 'study_hours', title: 'الساعات - الساعات الدراسية', val: c => c.study_hours },

      { id: 'total_hours', title: 'الساعات - المجموع', val: c => (parseFloat(c.theory_hours) || 0) + (parseFloat(c.exercise_hours) || 0) + (parseFloat(c.practical_hours) || 0) + (parseFloat(c.activity_hours) || 0) + (parseFloat(c.exam_time_hours) || 0) },

      { id: 'year_work_grade', title: 'الدرجات - أعمال الفصل', val: c => c.year_work_grade },

      { id: 'theory_grade', title: 'الدرجات - نهاية الفصل', val: c => c.theory_grade },

      { id: 'practical_grade', title: 'الدرجات - عملي', val: c => c.practical_grade },

      { id: 'midterm_grade', title: 'الدرجات - منتصف الفصل', val: c => c.midterm_grade },

      { id: 'midterm_2_grade', title: 'الدرجات - منتصف الفصل ٢', val: c => c.midterm_2_grade },

      { id: 'oral_grade', title: 'الدرجات - شفوي', val: c => c.oral_grade },

      { id: 'written_grade', title: 'الدرجات - تحريري خلال الفصل', val: c => c.written_grade },

      { id: 'clinical_grade', title: 'الدرجات - كلينك', val: c => c.clinical_grade },

      { id: 'final_eval_grade', title: 'الدرجات - تقييم نهائي', val: c => c.final_eval_grade },

      { id: 'attendance_activity_grade', title: 'الدرجات - Attendance, Activity & Attitude', val: c => c.attendance_activity_grade },

      { id: 'total_grade', title: 'الدرجات - المجموع', val: c => c.total_grade },

      { id: 'success_rate', title: 'نسبة النجاح', val: c => cleanIntStr(c.success_rate) },

      { id: 'fail_rate', title: 'نسبة الرسوب النظري', val: c => formatFailRate(c.fail_rate) },

      { id: 'elective_group_code', title: 'كود المجموعة الاختيارية', val: c => c.elective_group_code },

      { id: 'elective_courses_count', title: 'عدد المقررات او الوحدات الاختيارية', val: c => cleanIntStr(c.elective_courses_count) },

      { id: 'description', title: 'وصف المقرر', val: c => c.description }

    ];



    const activeCols = allCols.filter(col => {

      if (col.id === 'pass_fail' && printPassFail) return true;

      if (col.id === 'added_to_gpa' && printAddedToGpa) return true;

      return selected.some(c => {

        const val = col.val(c);

        return val !== undefined && val !== null && val !== "" && val !== 0 && val !== "0" && val !== "-";

      });

    });



    const rotateColIds = [

      'department_credit_hours', 'credit_hours', 'theory_hours', 'exercise_hours', 'practical_hours',

      'activity_hours', 'exam_time_hours', 'study_hours', 'total_hours',

      'year_work_grade', 'theory_grade', 'practical_grade', 'midterm_grade',

      'midterm_2_grade', 'oral_grade', 'written_grade', 'clinical_grade',

      'final_eval_grade', 'attendance_activity_grade', 'total_grade',

      'success_rate', 'elective_courses_count'

    ];



    const headersHtmlInner = activeCols.map(col => {

      const isRotated = rotateColIds.includes(col.id);

      if (isRotated) {

        return `<th class="rotate-col"><div class="rotate-inner">${col.title}</div></th>`;

      }

      return `<th>${col.title}</th>`;

    }).join("");

    headersHtml = `<tr>${headersHtmlInner}</tr>`;



    const rowsHtmlInner = selected.map((c, index) => {

      const cellsHtml = activeCols.map(col => {

        const val = col.val(c) ?? "-";

        const formattedVal = typeof val === 'string' ? val.replace(/\n/g, '<br/>') : val;

        if (col.id === 'description') {

          return `<td class="desc-col" dir="auto" style="text-align: start;">${formattedVal}</td>`;

        }

        if (col.id === 'name_ar' || col.id === 'name_en' || col.id === 'scientific_departments' || col.id === 'department_credit_hours') {

          return `<td class="name-col" style="white-space: pre-line;">${formattedVal}</td>`;

        }

        if (col.id === 'code') {

          return `<td class="code-col">${formattedVal}</td>`;

        }

        return `<td>${formattedVal}</td>`;

      }).join("");

      return `<tr>${cellsHtml}</tr>`;

    }).join("");

    rowsHtml = rowsHtmlInner;

  }





    const printWindow = window.open("", "_blank");

    printWindow.document.write(`

      <html>

        <head>

          <title>${documentTitle}</title>

          <style>

            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

            * {

              font-variant-numeric: lining-nums !important;

              -moz-font-feature-settings: "lnum" !important;

              -webkit-font-feature-settings: "lnum" !important;

              font-feature-settings: "lnum" !important;

              box-sizing: border-box;

            }

            @page {

              size: A4 landscape;

              margin: 4mm;

            }

            body {

              font-family: 'Cairo', sans-serif;

              direction: rtl;

              text-align: right;

              padding: 5px;

              color: #1e293b;

              background: #fff;

              zoom: 76%;

            }

            .header-container {

              display: flex;

              align-items: center;

              justify-content: flex-start;

              margin-bottom: 10px;

              direction: rtl;

              border-bottom: 2px solid #1b5e20;

              padding-bottom: 6px;

            }

            .header-logo {

              width: 60px;

              height: 60px;

              margin-left: 20px;

              object-fit: contain;

            }

            .header-title {

              margin: 0;

              font-size: 15px;

              font-weight: bold;

              color: #1b5e20;

            }

            .header-subtitle {

              margin: 2px 0 0 0;

              font-size: 12px;

              font-weight: 600;

              color: #475569;

            }

            table {

              width: 100%;

              border-collapse: collapse;

              margin-top: 5px;

              table-layout: auto;

            }

            thead {

              display: table-header-group;

            }

            tr {

              page-break-inside: avoid;

            }

            th, td {

              border: 1px solid #64748b !important;

              padding: 3px 2px;

              text-align: center;

              font-size: 12.5px;

              vertical-align: middle;

              word-wrap: break-word;

            }

            th {

              background-color: #2e7d32 !important;

              color: #ffffff !important;

              font-weight: bold;

              font-size: 13px;

              border: 1px solid #dee2e6 !important;

              -webkit-print-color-adjust: exact;

              print-color-adjust: exact;

            }

            th.rotate-col {

              height: 105px !important;

              vertical-align: middle !important;

              text-align: center !important;

              padding: 4px 1px !important;

            }

            .rotate-inner {

              writing-mode: vertical-rl !important;

              -webkit-writing-mode: vertical-rl !important;

              transform: rotate(180deg) !important;

              -webkit-transform: rotate(180deg) !important;

              white-space: nowrap !important;

              display: inline-block !important;

              font-size: 12.5px !important;

              font-weight: bold !important;

              line-height: 1 !important;

            }

            .desc-col {

              text-align: right;

              font-size: 9.5px;

              line-height: 1.2;

              white-space: normal;

              word-break: break-word;

            }

            .name-col {

              text-align: right;

              font-size: 13px;

              font-weight: 600;

              white-space: normal;

            }

            .code-col {

              font-size: 12.5px;

              font-weight: bold;

              white-space: nowrap;

              direction: ltr;

            }

          </style>

        </head>

        <body>

          <div class="header-container">

            <img 

              src="${window.location.origin}${logo}" 

              alt="جامعة المنوفية الأهلية" 

              class="header-logo" 

            />

            <div>

              <h2 class="header-title">${documentTitle}</h2>

              <h3 class="header-subtitle">جامعة المنوفية الأهلية - شؤون التعليم والطلاب</h3>

            </div>

          </div>

          <table>

            <thead>

              ${headersHtml}

            </thead>

            <tbody>

              ${rowsHtml}

            </tbody>

          </table>

          ${renderCourseSignaturesHTML(printFacultyId, isGeneral)}

          <script>

            window.onload = function() {

              const img = document.querySelector('img');

              if (img) {

                if (img.complete) {

                  window.print();

                  window.close();

                } else {

                  img.onload = function() {

                    window.print();

                    window.close();

                  };

                  img.onerror = function() {

                    window.print();

                    window.close();

                  };

                }

              } else {

                window.print();

                window.close();

              }

            };

          </script>

        </body>

      </html>

    `);

    printWindow.document.close();

  };



  const handleDownloadPDFSelected = () => {

    toast("للحصول على أفضل جودة لملف الـ PDF (نصوص واضحة قابلة للنسخ، ودعم كامل للغة العربية، وتقسيم صحيح للصفحات دون قطع الجداول)، سيتم فتح نافذة الطباعة المخصصة. يرجى اختيار 'Save as PDF' (حفظ بتنسيق PDF) من القائمة.", { duration: 6000, icon: '🖨️' });

    handlePrintSelected();

  };



  const getCourseDetailsHTML = (isMed, facultyName, programName) => {

    if (isMed) {

      return `

        <div class="section-header">البيانات الأساسية للمقرر</div>

        <table class="data-table">

          <tr>

            <th>كود المقرر</th><td>${formData.code || "-"}</td>

            <th>اسم المقرر بالعربية</th><td>${formData.name_ar || "-"}</td>

          </tr>

          <tr>

            <th>اسم المقرر بالإنجليزية</th><td>${formData.name_en || "-"}</td>

            <th>الكلية</th><td>${facultyName}</td>

          </tr>

          <tr>

            <th>البرنامج</th><td>${programName}</td>

            <th>المستوى</th><td>${formData.level ? 'المستوى ' + formData.level : "-"}</td>

          </tr>

          <tr>

            <th>الفصل الدراسي</th><td>${formData.semester || "-"}</td>

            <th>العام الدراسي</th><td>${formData.year || "-"}</td>

          </tr>

          <tr>

            <th>مدة المقرر (عدد الأسابيع)</th><td>${formData.duration || "-"}</td>

            <th>زمن الامتحان النهائي</th><td>${formData.exam_time_hours || "-"}</td>

          </tr>

          <tr>

            <th>إجمالي الساعات المعتمدة</th>

            <td colspan="3">${Number(medDepartments.reduce((sum, d) => sum + (parseFloat(d.theory_credit) || 0) + (parseFloat(d.practical_credit) || 0) + (parseFloat(d.activity_credit) || 0), 0).toFixed(2))}</td>

          </tr>

        </table>

        

        <div class="section-header">الأقسام العلمية (توزيع الساعات والدرجات)</div>

        <table class="data-table" style="text-align: center;">

          <thead>

            <tr>

              <th rowspan="2" style="text-align: center; vertical-align: middle;">القسم العلمي</th>

              <th colspan="3" style="text-align: center;">الساعات المعتمدة</th>

              <th colspan="3" style="text-align: center;">الساعات التدريسية</th>

              <th colspan="3" style="text-align: center;">توزيع الدرجات</th>

              <th rowspan="2" style="text-align: center; vertical-align: middle;">إجمالي الدرجة</th>

            </tr>

            <tr>

              <th style="text-align: center;">نظري</th><th style="text-align: center;">عملي</th><th style="text-align: center;">أنشطة</th>

              <th style="text-align: center;">نظري</th><th style="text-align: center;">عملي</th><th style="text-align: center;">أنشطة</th>

              <th style="text-align: center;">نظري</th><th style="text-align: center;">عملي</th><th style="text-align: center;">أعمال سنة</th>

            </tr>

          </thead>

          <tbody>

            ${medDepartments.map(dept => {

              const tc = parseFloat(dept.theory_credit) || 0;

              const pc = parseFloat(dept.practical_credit) || 0;

              const ac = parseFloat(dept.activity_credit) || 0;

              const tg = parseFloat(dept.theory_grade) || 0;

              const pg = parseFloat(dept.practical_grade) || 0;

              const yg = parseFloat(dept.year_work_grade) || 0;

              const totalG = Number((tg + pg + yg).toFixed(2));

              return '<tr>' +

                '<td style="font-weight: bold; text-align: right;">' + dept.department_name + '</td>' +

                '<td style="text-align: center;">' + tc + '</td><td style="text-align: center;">' + pc + '</td><td style="text-align: center;">' + ac + '</td>' +

                '<td style="text-align: center; background-color: #f8fafc;">' + Number((tc * 15).toFixed(2)) + '</td><td style="text-align: center; background-color: #f8fafc;">' + Number((pc * 30).toFixed(2)) + '</td><td style="text-align: center; background-color: #f8fafc;">' + Number((ac * 60).toFixed(2)) + '</td>' +

                '<td style="text-align: center;">' + tg + '</td><td style="text-align: center;">' + pg + '</td><td style="text-align: center;">' + yg + '</td>' +

                '<td style="text-align: center; font-weight: bold; background-color: #f8fafc; color: #198754;">' + totalG + '</td>' +

              '</tr>';

            }).join('')}

          </tbody>

        </table>

        </table>

        



        <div class="section-header">وصف المقرر الدراسي</div>

        <div class="description-box" dir="auto" style="text-align: start;">${formData.description || "لا يوجد وصف للمقرر الدراسي"}</div>

      `;

    }



    return `

      <div class="section-header">البيانات الأساسية للمقرر</div>

      <table class="data-table">

        <tr>

          <th>كود المقرر</th><td>${formData.code || "-"}</td>

          <th>اسم المقرر بالعربية</th><td>${formData.name_ar || "-"}</td>

        </tr>

        <tr>

          <th>اسم المقرر بالإنجليزية</th><td>${formData.name_en || "-"}</td>

          <th>الكلية</th><td>${facultyName}</td>

        </tr>

        <tr>

          <th>البرنامج</th><td>${programName}</td>

          <th>المستوى</th><td>${formData.level ? 'المستوى ' + formData.level : "-"}</td>

        </tr>

        <tr>

          <th>الفصل الدراسي</th><td>${formData.semester || "-"}</td>

          <th>العام الدراسي</th><td>${formData.year || "-"}</td>

        </tr>

        <tr>

          <th>نوع المقرر</th><td>${formData.course_type || "-"}</td>

          <th>متطلب</th><td>${formData.requirement || "-"}</td>

        </tr>

        <tr>

          <th>المتطلب السابق</th><td>${formData.prerequisite || "-"}</td>

          <th>المقررات المتزامنة</th><td>${formData.concurrent_courses || "-"}</td>

        </tr>

        <tr>

          <th>يضاف للمعدل التراكمي</th><td>${formData.added_to_gpa || "-"}</td>

          <th>مادة نجاح أو رسوب</th><td>${formData.pass_fail || "-"}</td>

        </tr>

        <tr>

          <th>الساعات المعتمدة</th><td>${formData.credit_hours || "-"}</td>

          <th>تسجيل صيفي</th><td>${formData.summer_registration || "-"}</td>

        </tr>

      </table>

      

      <div class="section-header">توزيع الساعات الدراسية</div>

      <table class="data-table">

        <tr>

          <th>محاضرات</th><td>${formData.theory_hours || "0"}</td>

          <th>تدريب - تمارين</th><td>${formData.exercise_hours || "0"}</td>

        </tr>

        <tr>

          <th>عملي</th><td>${formData.practical_hours || "0"}</td>

          <th>تدريب ميداني</th><td>${formData.activity_hours || "0"}</td>

        </tr>

        <tr>

          <th>ساعات الامتحان</th><td>${formData.exam_time_hours || "0"}</td>

          <th>الساعات الدراسية</th><td>${formData.study_hours || "-"}</td>

        </tr>

        <tr>

          <th>الساعات - المجموع</th><td colspan="3">${(parseFloat(formData.theory_hours) || 0) + (parseFloat(formData.exercise_hours) || 0) + (parseFloat(formData.practical_hours) || 0) + (parseFloat(formData.activity_hours) || 0) + (parseFloat(formData.exam_time_hours) || 0)}</td>

        </tr>

      </table>

      

      <div class="section-header">توزيع الدرجات ونسب النجاح</div>

      <table class="data-table">

        <tr>

          <th>أعمال الفصل</th><td>${formData.year_work_grade || "0"}</td>

          <th>نهاية الفصل</th><td>${formData.theory_grade || "0"}</td>

        </tr>

        <tr>

          <th>عملي</th><td>${formData.practical_grade || "0"}</td>

          <th>منتصف الفصل</th><td>${formData.midterm_grade || "-"}</td>

        </tr>

        <tr>

          <th>منتصف الفصل ٢</th><td>${formData.midterm_2_grade || "-"}</td>

          <th>شفوي</th><td>${formData.oral_grade || "-"}</td>

        </tr>

        <tr>

          <th>تحريري خلال الفصل</th><td>${formData.written_grade || "-"}</td>

          <th>كلينك (سريري)</th><td>${formData.clinical_grade || "-"}</td>

        </tr>

        <tr>

          <th>تقييم نهائي</th><td>${formData.final_eval_grade || "-"}</td>

          <th>Attendance, Activity & Attitude</th><td>${formData.attendance_activity_grade || "-"}</td>

        </tr>

        <tr>

          <th>المجموع الكلي</th><td>${formData.total_grade || "0"}</td>

          <th>نسبة النجاح</th><td>${formData.success_rate || "-"}</td>

        </tr>

        <tr>

          <th>نسبة الرسوب النظري</th><td colspan="3">${formatFailRate(formData.fail_rate)}</td>

        </tr>

      </table>

      

      <div class="section-header">البرامج الأخرى المسجل بها</div>

      <table class="data-table" style="margin-bottom: 10px;">

        <tr>

          <td colspan="4" style="width: 100%; font-weight: normal; color: #0f172a;">

            ${formData.other_programs || "لا يوجد"}

          </td>

        </tr>

      </table>

      

      <div class="section-header">وصف المقرر الدراسي</div>

      <div class="description-box" dir="auto" style="text-align: start;">${formData.description || "لا يوجد وصف للمقرر الدراسي"}</div>

    `;

  };



  const handlePrintSingleCourse = () => {

    const printWindow = window.open("", "_blank");

    const facultyName = faculties.find(f => String(f.id) === String(formData.faculty_id))?.name || "-";

    const programName = programs.find(p => String(p.id) === String(formData.program_id))?.name || "-";



    printWindow.document.write(`

      <html>

        <head>

          <title>بيان مقرر دراسي - ${formData.name_ar}</title>

          <style>

            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');

            * {

              font-variant-numeric: lining-nums !important;

              -moz-font-feature-settings: "lnum" !important;

              -webkit-font-feature-settings: "lnum" !important;

              font-feature-settings: "lnum" !important;

              box-sizing: border-box;

            }

            @page {

              size: portrait;

              margin: 10mm 15mm;

            }

            body {

              font-family: 'Cairo', sans-serif;

              direction: rtl;

              text-align: right;

              padding: 0;

              color: #1e293b;

              background-color: #fff;

              margin: 0;

            }

            .print-container {

              width: 100%;

            }

            .header-table {

              width: 100%;

              margin-bottom: 15px;

              border-collapse: collapse;

            }

            .header-table td {

              border: none !important;

              padding: 0 !important;

              vertical-align: middle;

            }

            .logo-img {

              width: 80px;

              height: 80px;

              object-fit: contain;

            }

            .title-unit {

              text-align: right;

            }

            .title-unit h1 {

              font-size: 18px;

              color: #2e7d32;

              margin: 0 0 4px 0;

              font-weight: 700;

            }

            .title-unit h2 {

              font-size: 13px;

              color: #333;

              margin: 0;

              font-weight: 600;

            }

            .divider {

              height: 2px;

              background-color: #2e7d32;

              margin-bottom: 15px;

              border-radius: 2px;

            }

            .section-header {

              background-color: #e8f5e9;

              color: #2e7d32;

              font-size: 12px;

              font-weight: bold;

              padding: 6px 12px;

              margin-top: 15px;

              margin-bottom: 6px;

              border-right: 4px solid #2e7d32;

              border-radius: 2px;

              -webkit-print-color-adjust: exact;

              print-color-adjust: exact;

            }

            .data-table {

              width: 100%;

              border-collapse: collapse;

              margin-bottom: 5px;

              font-size: 11px;

            }

            .data-table th, .data-table td {

              border: 1px solid #cbd5e1;

              padding: 5px 8px;

              vertical-align: middle;

            }

            .data-table th {

              background-color: #f8fafc;

              color: #334155;

              font-weight: bold;

              text-align: right;

              width: 22%;

              -webkit-print-color-adjust: exact;

              print-color-adjust: exact;

            }

            .data-table td {

              color: #0f172a;

              width: 28%;

            }

            .description-box {

              border: 1px solid #cbd5e1;

              padding: 8px 10px;

              border-radius: 4px;

              font-size: 11px;

              background-color: #f8fafc;

              min-height: 40px;

              white-space: pre-wrap;

              color: #0f172a;

            }

          </style>

        </head>

        <body>

          <div class="print-container">

            <table class="header-table">

              <tr>

                <td style="text-align: right;">

                  <div class="title-unit">

                    <h1>بيان مقرر دراسي</h1>

                    <h2>جامعة المنوفية الأهلية</h2>

                  </div>

                </td>

                <td style="text-align: left; width: 100px;">

                  <img src="${window.location.origin}${logo}" alt="لوجو الجامعة" class="logo-img" style="margin-left: 35px;" />

                </td>

              </tr>

            </table>

            

            <div class="divider"></div>

            

            ${getCourseDetailsHTML(facultyName === "كلية الطب والجراحة", facultyName, programName)}

          </div>

          

          ${renderCourseSignaturesHTML(formData.faculty_id)}

          

          <script>

            window.onload = function() {

              window.print();

              window.close();

            };

          </script>

        </body>

      </html>

    `);

    printWindow.document.close();

  };



  const handleDownloadPDF = () => {

    const facultyName = faculties.find(f => String(f.id) === String(formData.faculty_id))?.name || "-";

    const programName = programs.find(p => String(p.id) === String(formData.program_id))?.name || "-";



    const container = document.createElement("div");

    container.style.direction = "rtl";

    container.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, sans-serif";

    container.style.padding = "20px";

    container.style.color = "#1e293b";

    container.style.backgroundColor = "#fff";

    container.style.width = "750px"; // standard A4 portrait printable area width in pixels at scale



    container.innerHTML = `

      <style>

        .print-container {

          width: 100%;

        }

        .header-table {

          width: 100%;

          margin-bottom: 15px;

          border-collapse: collapse;

        }

        .header-table td {

          border: none !important;

          padding: 0 !important;

          vertical-align: middle;

        }

        .logo-img {

          width: 80px;

          height: 80px;

          object-fit: contain;

        }

        .title-unit {

          text-align: right;

        }

        .title-unit h1 {

          font-size: 18px;

          color: #2e7d32;

          margin: 0 0 4px 0;

          font-weight: 700;

        }

        .title-unit h2 {

          font-size: 13px;

          color: #333;

          margin: 0;

          font-weight: 600;

        }

        .divider {

          height: 2px;

          background-color: #2e7d32;

          margin-bottom: 15px;

          border-radius: 2px;

        }

        .section-header {

          background-color: #e8f5e9;

          color: #2e7d32;

          font-size: 12px;

          font-weight: bold;

          padding: 6px 12px;

          margin-top: 15px;

          margin-bottom: 6px;

          border-right: 4px solid #2e7d32;

          border-radius: 2px;

        }

        .data-table {

          width: 100%;

          border-collapse: collapse;

          margin-bottom: 5px;

          font-size: 11px;

        }

        .data-table th, .data-table td {

          border: 1px solid #cbd5e1;

          padding: 5px 8px;

          vertical-align: middle;

        }

        .data-table th {

          background-color: #f8fafc;

          color: #334155;

          font-weight: bold;

          text-align: right;

          width: 22%;

        }

        .data-table td {

          color: #0f172a;

          width: 28%;

        }

        .description-box {

          border: 1px solid #cbd5e1;

          padding: 8px 10px;

          border-radius: 4px;

          font-size: 11px;

          background-color: #f8fafc;

          min-height: 40px;

          white-space: pre-wrap;

          color: #0f172a;

        }

      </style>

      <div class="print-container">

        <table class="header-table">

          <tr>

            <td style="text-align: right;">

              <div class="title-unit">

                <h1>بيان مقرر دراسي</h1>

                <h2>جامعة المنوفية الأهلية</h2>

              </div>

            </td>

            <td style="text-align: left; width: 100px;">

              <img src="${window.location.origin}${logo}" alt="لوجو الجامعة" class="logo-img" style="margin-left: 35px;" />

            </td>

          </tr>

        </table>

        

        <div class="divider"></div>

        

        ${getCourseDetailsHTML(facultyName === "كلية الطب والجراحة", facultyName, programName)}

      </div>

    `;



    document.body.appendChild(container);



    const runHtml2Pdf = () => {

      setTimeout(() => {

        const opt = {

          margin: 12,

          filename: `بيان_المقرر_الدراسي_${formData.code}_${formData.name_ar.replace(/\\s+/g, "_")}.pdf`,

          image: { type: 'jpeg', quality: 0.98 },

          html2canvas: { scale: 2.5, useCORS: true, logging: false },

          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }

        };

        window.html2pdf().from(container).set(opt).save().then(() => {

          if (container.parentNode) document.body.removeChild(container);

        }).catch((err) => {

          console.error("PDF export error:", err);

          if (container.parentNode) document.body.removeChild(container);

        });

      }, 300);

    };



    if (window.html2pdf) {

      runHtml2Pdf();

    } else {

      const script = document.createElement("script");

      script.src = "/html2pdf.bundle.min.js";

      script.onload = runHtml2Pdf;

      script.onerror = () => {

        if (container.parentNode) document.body.removeChild(container);

        toast.error("حدث خطأ أثناء تحميل مكتبة PDF");

      };

      document.body.appendChild(script);

    }

  };



  const handleExportExcel = () => {

    const selected = getGroupedCourses(courses).filter(c => selectedRows.includes(c.id));

    if (selected.length === 0) {

      toast.error("يرجى تحديد مقرر واحد على الأقل للتصدير");

      return;

    }

    let printFacultyId = selected[0]?.faculty_id;

    const uniqueFacultyIds = Array.from(new Set(selected.map(c => c.faculty_id).filter(Boolean)));



    let matchedFacultyId = null;

    const term = printSearchTerm ? normalizeArabic(printSearchTerm) : "";

    if (term) {

      const searchedFaculty = faculties.find(f => normalizeArabic(f.name).includes(term));

      if (searchedFaculty) {

        matchedFacultyId = searchedFaculty.id;

      }

    }



    let isGeneral = false;

    const uniqueFacs = Array.from(new Set(selected.flatMap(c => c.facultiesList || [])));

    if (uniqueFacs.length > 1 && !matchedFacultyId) {

      isGeneral = true;

    }



    if (matchedFacultyId && uniqueFacultyIds.includes(matchedFacultyId)) {

      printFacultyId = matchedFacultyId;

    } else {

      for (let fid of uniqueFacultyIds) {

        if (courseSignatures.some(sig => String(sig.faculty_id) === String(fid))) {

          printFacultyId = fid;

          break;

        }

      }

    }



    const isAllMedicine = selected.every(c => c.facultiesList && c.facultiesList.some(f => f.includes('الطب والجراحة')));

    

    const allCols = [

      { id: 'faculty', title: 'اسم الكلية', val: c => c.facultiesList?.join(" - ") },

      { id: 'program', title: 'اسم البرنامج', val: c => c.programsList?.join(" - ") },

      { id: 'code', title: 'كود المقرر', val: c => c.code },

      { id: 'name_ar', title: 'اسم المقرر بالعربية', val: c => c.name_ar },

      { id: 'name_en', title: 'اسم المقرر بالإنجليزية', val: c => c.name_en },

      { id: 'course_type', title: 'نوع المقرر', val: c => c.course_type },

      { id: 'level', title: 'المستوى', val: c => c.level },

      { id: 'semester', title: 'الفصل الدراسي', val: c => c.semester },

      { id: 'other_programs', title: 'البرامج الاخرى المسجل بها', val: c => c.other_programs },

      { id: 'requirement', title: 'متطلب', val: c => c.requirement },

      { id: 'prerequisite', title: 'المتطلب السابق', val: c => c.prerequisite },

      { id: 'concurrent_courses', title: 'المقررات المتزامنة', val: c => c.concurrent_courses },

      { id: 'added_to_gpa', title: 'يضاف للمعدل التراكمي', val: c => c.added_to_gpa },

      { id: 'pass_fail', title: 'مادة نجاح أو رسوب', val: c => c.pass_fail },

      { id: 'credit_hours', title: 'الساعات المعتمدة', val: c => c.credit_hours },

      { id: 'theory_hours', title: 'الساعات - محاضرات', val: c => c.theory_hours },

      { id: 'exercise_hours', title: 'الساعات - تدريب', val: c => c.exercise_hours },

      { id: 'practical_hours', title: 'الساعات - عملي', val: c => c.practical_hours },

      { id: 'activity_hours', title: 'الساعات - ساعات التدريب الميداني', val: c => c.activity_hours },

      { id: 'exam_time_hours', title: 'الساعات - ساعات الامتحان', val: c => c.exam_time_hours },

      { id: 'study_hours', title: 'الساعات - الساعات الدراسية', val: c => c.study_hours },

      { id: 'total_hours', title: 'الساعات - المجموع', val: c => (parseFloat(c.theory_hours) || 0) + (parseFloat(c.exercise_hours) || 0) + (parseFloat(c.practical_hours) || 0) + (parseFloat(c.activity_hours) || 0) + (parseFloat(c.exam_time_hours) || 0) },

      { id: 'year_work_grade', title: 'الدرجات - أعمال الفصل', val: c => c.year_work_grade },

      { id: 'theory_grade', title: 'الدرجات - نهاية الفصل', val: c => c.theory_grade },

      { id: 'midterm_grade', title: 'الدرجات - منتصف الفصل', val: c => c.midterm_grade },

      { id: 'written_grade', title: 'الدرجات - تحريري خلال الفصل', val: c => c.written_grade },

      { id: 'oral_grade', title: 'الدرجات - شفوي', val: c => c.oral_grade },

      { id: 'practical_grade', title: 'الدرجات - عملي', val: c => c.practical_grade },

      { id: 'clinical_grade', title: 'الدرجات - كلينك', val: c => c.clinical_grade },

      { id: 'final_eval_grade', title: 'الدرجات - تقييم نهائي', val: c => c.final_eval_grade },

      { id: 'midterm_2_grade', title: 'الدرجات - منتصف الفصل ٢', val: c => c.midterm_2_grade },

      { id: 'attendance_activity_grade', title: 'الدرجات - Attendance, Activity & Attitude', val: c => c.attendance_activity_grade },

      { id: 'total_grade', title: 'الدرجات - المجموع', val: c => c.total_grade },

      { id: 'success_rate', title: 'نسبة النجاح', val: c => cleanIntStr(c.success_rate) },

      { id: 'fail_rate', title: 'نسبة الرسوب النظري', val: c => formatFailRate(c.fail_rate) },

      { id: 'elective_group_code', title: 'كود المجموعة الاختيارية', val: c => c.elective_group_code },

      { id: 'elective_courses_count', title: 'عدد المقررات او الوحدات الاختيارية', val: c => cleanIntStr(c.elective_courses_count) },

      { id: 'summer_registration', title: 'تسجيل المقرر في الصيفي', val: c => (c.summer_registration && String(c.summer_registration).trim() === 'نعم') ? 'نعم' : 'لا' },

      { id: 'description', title: 'وصف المقرر', val: c => c.description }

    ];



    const activeCols = allCols.filter(col => {

      if (col.id === 'pass_fail' && printPassFail) return true;

      if (col.id === 'added_to_gpa' && printAddedToGpa) return true;

      return selected.some(c => {

        const val = col.val(c);

        return val !== undefined && val !== null && val !== "" && val !== 0 && val !== "0" && val !== "-";

      });

    });



    // Calculate column widths based on maximum text length

    let colGroupHtml = "";

    if (isAllMedicine) {

      colGroupHtml = `

        <col width="120" style="width: 120px;" />

        <col width="280" style="width: 280px;" />

        <col width="120" style="width: 120px;" />

        <col width="140" style="width: 140px;" />

        <col width="280" style="width: 280px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

        <col width="70" style="width: 70px;" />

      `;

    } else {

      colGroupHtml = activeCols.map(col => {

        let maxCharLen = col.title?.length || 10;

        selected.forEach(c => {

          let val = "";

          if (col.id === 'other_programs') {

            val = Array.isArray(c.other_programs) ? c.other_programs.map(op => op.name || op).join(" - ") : String(c.other_programs || "");

          } else if (col.id === 'prerequisite') {

            val = Array.isArray(c.prerequisites) ? c.prerequisites.map(p => p.name_ar || p).join(" - ") : String(c.prerequisites || "");

          } else if (col.id === 'concurrent_courses') {

            val = Array.isArray(c.concurrent_courses) ? c.concurrent_courses.map(cc => cc.name_ar || cc).join(" - ") : String(c.concurrent_courses || "");

          } else {

            const rawVal = col.val(c);

            val = rawVal !== undefined && rawVal !== null ? String(rawVal) : "";

          }

          if (val.length > maxCharLen) {

            maxCharLen = val.length;

          }

        });

        const widthPx = Math.min(Math.max(maxCharLen * 9.5 + 30, 85), 350);

        return `<col width="${widthPx}" style="width: ${widthPx}px;" />`;

      }).join("\n");

    }



    let headersHtml = "";

    let rowsHtml = "";



    if (isAllMedicine) {
      headersHtml = `
        <tr>
          <th rowspan="2" class="text-center" style="vertical-align: middle; border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">كود المقرر</th>
          <th rowspan="2" class="text-center" style="vertical-align: middle; border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">اسم المقرر / الحزمة</th>
          <th rowspan="2" class="text-center" style="vertical-align: middle; border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">المستوى</th>
          <th rowspan="2" class="text-center" style="vertical-align: middle; border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">الفصل الدراسي</th>
          <th rowspan="2" class="text-center" style="vertical-align: middle; border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">القسم العلمي</th>
          <th colspan="3" class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">الساعات المعتمدة</th>
          <th colspan="3" class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">الساعات التدريسية</th>
          <th colspan="3" class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">توزيع الدرجات</th>
          <th rowspan="2" class="text-center" style="vertical-align: middle; border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">إجمالي الدرجة</th>
        </tr>
        <tr>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">نظري</th>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">عملي</th>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">أنشطة</th>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">نظري</th>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">عملي</th>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">أنشطة</th>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">نظري</th>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">عملي</th>
          <th class="text-center" style="border: 1pt solid #ffffff; background-color: #2e7d32; color: #ffffff;">أعمال سنة</th>
        </tr>
      `;



      rowsHtml = selected.map((c, idx) => {

        const rowClass = idx % 2 === 0 ? "even-row" : "odd-row";

        const modules = c.modules && c.modules.length > 0 ? c.modules : [{

          department_name: c.department_name || "-",

          theory_credit: 0,

          practical_credit: 0,

          activity_credit: 0,

          theory_grade: 0,

          practical_grade: 0,

          year_work_grade: 0

        }];

        const rowSpan = modules.length;



        const codeTd = `<td rowspan="${rowSpan}" class="text-center" style="white-space: nowrap; direction: ltr;">${c.code || "-"}</td>`;

        let combinedNameEx = c.name_ar || "";

        if (c.name_en) combinedNameEx += (combinedNameEx ? "\n" : "") + c.name_en;

        const nameTd = `<td rowspan="${rowSpan}" class="text-right" style="white-space: pre-line;">${combinedNameEx || "-"}</td>`;

        const facultyTd = `<td rowspan="${rowSpan}" class="text-center">${(c.facultiesList?.join(" - ") || "-")}</td>`;

        const progTd = `<td rowspan="${rowSpan}" class="text-center">${(c.programsList?.join(" - ") || "-")}</td>`;

        const levelTd = `<td rowspan="${rowSpan}" class="text-center">${c.level ? `المستوى ${c.level}` : "-"}</td>`;

        const semTd = `<td rowspan="${rowSpan}" class="text-center">${c.semester || "-"}</td>`;



        let moduleRows = "";

        modules.forEach((dept, deptIdx) => {

          const tc = parseFloat(dept.theory_credit) || 0;

          const pc = parseFloat(dept.practical_credit) || 0;

          const ac = parseFloat(dept.activity_credit) || 0;

          const tg = parseFloat(dept.theory_grade) || 0;

          const pg = parseFloat(dept.practical_grade) || 0;

          const yg = parseFloat(dept.year_work_grade) || 0;

          const totalG = Number((tg + pg + yg).toFixed(2));



          const deptCells = `

            <td class="text-right" style="font-weight: bold; font-size: 10pt;">${dept.department_name}</td>

            <td class="text-center">${tc}</td><td class="text-center">${pc}</td><td class="text-center">${ac}</td>

            <td class="text-center" style="background-color: #f8fafc;">${Number((tc * 15).toFixed(2))}</td><td class="text-center" style="background-color: #f8fafc;">${Number((pc * 30).toFixed(2))}</td><td class="text-center" style="background-color: #f8fafc;">${Number((ac * 60).toFixed(2))}</td>

            <td class="text-center">${tg}</td><td class="text-center">${pg}</td><td class="text-center">${yg}</td>

            <td class="text-center" style="font-weight: bold; background-color: #f8fafc; color: #198754;">${totalG}</td>

          `;



          if (deptIdx === 0) {

            moduleRows += `<tr class="${rowClass}" style="height: 75px;">${codeTd}${nameTd}${levelTd}${semTd}${deptCells}</tr>`;

          } else {

            moduleRows += `<tr class="${rowClass}" style="height: 75px;">${deptCells}</tr>`;

          }

        });

        return moduleRows;

      }).join("");



    } else {

      const headersHtmlInner = activeCols.map(col => {

        const isTextCol = ['faculty', 'program', 'name_ar', 'name_en', 'other_programs', 'prerequisite', 'concurrent_courses', 'description'].includes(col.id);

        const cellClass = isTextCol ? "text-right" : "text-center";

        return `<th class="${cellClass}" style="border: 1pt solid #2e7d32; background-color: #e8f5e9; color: #2e7d32;">${col.title}</th>`;

      }).join("");

      headersHtml = `<tr>${headersHtmlInner}</tr>`;



      selected.forEach((c, idx) => {
        const rowClass = idx % 2 === 0 ? "even-row" : "odd-row";
        const cellsHtml = activeCols.map(col => {
          const val = col.val(c) ?? "-";
          const isTextCol = ['faculty', 'program', 'name_ar', 'name_en', 'other_programs', 'prerequisite', 'concurrent_courses', 'description'].includes(col.id);
          const cellClass = isTextCol ? "text-right" : "text-center";
          if (col.id === 'description') {
            return `<td class="${cellClass}" dir="auto" style="text-align: start; min-width: 300px; white-space: normal;">${val}</td>`;
          }
          return `<td class="${cellClass}">${val}</td>`;
        }).join("");
        rowsHtml += `<tr class="${rowClass}" style="height: 75px;">${cellsHtml}</tr>`;
      });
    }

    const uniqueProgs = Array.from(new Set(selected.flatMap(c => c.programsList || [])));
    const uniqueNames = Array.from(new Set(selected.map(c => c.name_ar).filter(Boolean)));

    let titleParts = [];

    if (uniqueNames.length === 1) {
      titleParts.push(`مقرر ${uniqueNames[0]}`);
      if (uniqueProgs.length === 1) titleParts.push(uniqueProgs[0]);
      if (uniqueFacs.length === 1) titleParts.push(uniqueFacs[0]);
    } else if (uniqueProgs.length === 1) {
      titleParts.push(uniqueProgs[0]);
      if (uniqueFacs.length === 1) titleParts.push(uniqueFacs[0]);
    } else if (uniqueFacs.length === 1) {
      titleParts.push(uniqueFacs[0]);
    } else if (printSearchTerm) {
      titleParts.push(printSearchTerm);
    }
    const levelLabels = { "0": "المستوى العام", "1": "المستوى الأول", "2": "المستوى الثاني", "3": "المستوى الثالث", "4": "المستوى الرابع", "5": "المستوى الخامس" };
    titleParts.push(printLevel ? (levelLabels[printLevel] || `المستوى ${printLevel}`) : "جميع المستويات");
    titleParts.push(printSemester ? printSemester : "جميع الفصول الدراسية");
    if (printCourseType) titleParts.push(`نوع المقرر: ${printCourseType}`);
    if (printSummerReg) titleParts.push(`تسجيل صيفي: ${printSummerReg}`);
    if (printAddedToGpa) titleParts.push(`المعدل التراكمي: ${printAddedToGpa}`);
    if (printPassFail) titleParts.push(`نجاح/رسوب: ${printPassFail}`);

    let documentTitle = "بيان المقررات الدراسية";
    if (titleParts.length > 0) {
      documentTitle += ` - ${titleParts.join(" - ")}`;
    }

    let excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>بيان المقررات الدراسية</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                  <x:FreezePanes/>
                  <x:FrozenNoSplit/>
                  <x:SplitHorizontal>${isAllMedicine ? 4 : 3}</x:SplitHorizontal>
                  <x:TopRowBottomPane>${isAllMedicine ? 4 : 3}</x:TopRowBottomPane>
                  <x:ActivePane>2</x:ActivePane>
                  <x:DisplayRightToLeft/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          * {
            font-variant-numeric: lining-nums !important;
            -moz-font-feature-settings: "lnum" !important;
            -webkit-font-feature-settings: "lnum" !important;
            font-feature-settings: "lnum" !important;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
          }
          
          /* Header styles (White Clean Layout) */
          .header-logo-cell {
            background-color: #ffffff;
            vertical-align: middle;
            text-align: center;
            border: none;
          }
          .header-text-cell {
            background-color: #ffffff;
            color: #2e7d32;
            text-align: right;
            vertical-align: middle;
            border: none;
          }
          .title-text {
            font-size: 16pt;
            font-weight: bold;
            color: #2e7d32;
          }
          .subtitle-text {
            font-size: 12pt;
            font-weight: normal;
            color: #555555;
          }

          /* Main Table styles */
          table {
            border-collapse: collapse;
          }
          th {
            border: 1pt solid #2e7d32;
            background-color: #e8f5e9;
            color: #2e7d32;
            font-weight: bold;
            font-size: 11pt;
            height: 35px;
            padding: 5px 10px;
          }
          td {
            border: 1pt solid #cbd5e1;
            font-size: 11pt;
            height: 75px;
            padding: 8px 10px;
            color: #333333;
            vertical-align: middle;
            white-space: normal;
            word-wrap: break-word;
            mso-data-placement: same-cell;
          }
          
          /* Alignment utility classes */
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          
          /* Zebra striping for data rows */
          .even-row {
            background-color: #f9f9f9;
          }
          .odd-row {
            background-color: #ffffff;
          }
        </style>
      </head>
      <body style="direction: rtl;">
        <table>
          <colgroup>
            ${colGroupHtml}
          </colgroup>
          <thead>
            <tr style="height: 50px;">
              <th rowspan="2" style="background-color: #2e7d32; text-align: center; vertical-align: middle; border: none;">
                <img src="${window.location.origin}${logo}" width="65" height="65" style="vertical-align: middle;" />
              </th>
              <th colspan="${isAllMedicine ? 14 : activeCols.length - 1}" style="background-color: #2e7d32; color: #ffffff; text-align: right; padding-right: 15px; font-size: 22px; font-weight: bold; border: none; vertical-align: middle; height: 30px;">
                ${documentTitle}
              </th>
            </tr>
            <tr style="height: 30px;">
              <th colspan="${isAllMedicine ? 14 : activeCols.length - 1}" style="background-color: #2e7d32; color: #e8f5e9; text-align: right; padding-right: 15px; font-size: 16px; font-weight: normal; border: none; vertical-align: middle; padding-bottom: 5px;">
                جامعة المنوفية الأهلية
              </th>
            </tr>
            ${headersHtml}
          </thead>
          <tbody>
            ${rowsHtml}
            ${renderCourseSignaturesExcelHTML(printFacultyId, isAllMedicine ? 15 : activeCols.length, isGeneral)}
          </tbody>
        </table>
      </body>
      </html>
    `;



    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;



    let downloadFileName = "مقررات دراسية";

    if (uniqueFacs.length === 1) {

      downloadFileName += ` _ ${uniqueFacs[0]}`;

    } else if (uniqueFacs.length > 1) {

      downloadFileName += ` _ عدة كليات`;

    }

    link.download = `${downloadFileName}.xls`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };

  const groupedAllCourses = getGroupedCourses(courses);



  // فلترة المقررات للجدول الرئيسي

  const filteredCourses = groupedAllCourses.filter(c => {

    const term = normalizeArabic(searchTerm);

    if (!term) return true;

    const nameArMatches = normalizeArabic(c.name_ar).includes(term);

    const nameEnMatches = normalizeArabic(c.name_en).includes(term);

    const codeMatches = normalizeArabic(c.code).includes(term);

    const facultyMatches = c.facultiesList.some(f => normalizeArabic(f).includes(term));

    const programMatches = c.programsList.some(p => normalizeArabic(p).includes(term));

    return nameArMatches || nameEnMatches || codeMatches || facultyMatches || programMatches;

  });



  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

  const indexOfLastItem = currentPage * itemsPerPage;

  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const currentCourses = filteredCourses.slice(indexOfFirstItem, indexOfLastItem);



  const getPaginationItems = () => {

    let pages = [];

    const maxPageNumbers = 4;

    let startPage = Math.max(1, currentPage - 1);

    let endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);



    if (endPage - startPage + 1 < maxPageNumbers) {

      startPage = Math.max(1, endPage - maxPageNumbers + 1);

    }



    for (let i = startPage; i <= endPage; i++) {

      pages.push(i);

    }

    return pages;

  };



  // Helper functions for dynamic multi-selects

  const getAvailableCoursesForSelection = () => {

    if (!formData.program_id) return [];

    const selectedProg = programs.find(p => String(p.id) === String(formData.program_id));

    const healthFaculty = faculties.find(f => f.name === "كلية تكنولوجيا العلوم الصحية التطبيقية");



    let allowedProgramIds = [parseInt(formData.program_id)];



    if (healthFaculty && selectedProg && String(selectedProg.faculty_id) === String(healthFaculty.id)) {

      const generalProg = programs.find(p => String(p.faculty_id) === String(healthFaculty.id) && p.name === "برنامج عام");

      if (generalProg) {

        allowedProgramIds.push(generalProg.id);

      }

    }



    return courses.filter(c => allowedProgramIds.includes(c.program_id));

  };



  const getAvailableOtherPrograms = () => {

    if (!formData.faculty_id || !formData.program_id) return [];

    return programs.filter(p =>

      String(p.faculty_id) === String(formData.faculty_id) &&

      String(p.id) !== String(formData.program_id)

    );

  };



  const cleanIntStr = (val) => {

    if (val === undefined || val === null) return "";

    const s = String(val).trim();

    if (s.endsWith(".0")) {

      return s.substring(0, s.length - 2);

    }

    return s;

  };



  const cleanGradeVal = (val) => {

    if (val === undefined || val === null) return "";

    const s = String(val).trim();

    if (s === "-" || s === "لا يوجد" || s === "") return "";

    return s;

  };



  if (pageLoading) {

    return (

      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '80vh' }}>

        <h4 className="mb-3 text-success" style={{ fontWeight: 'bold' }}>جاري تحميل البيانات...</h4>

        <Spinner animation="border" variant="success" />

      </div>

    );

  }



  return (

    <div style={{ padding: '20px', direction: 'rtl' }}>

      <div className="row mb-3 align-items-center">

        {/* عنوان الصفحة */}

        <div className="col-12 col-lg-9 mb-3 mb-lg-0">

          <h2 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }} className="d-flex align-items-center gap-3"><FaBook className="text-success" style={{ marginLeft: '15px' }} /> المقررات الدراسية</h2>

        </div>

        {/* أزرار الاستيراد والطباعة */}

        <div className="col-12 col-lg-3">

          <div className="d-flex flex-wrap gap-2">

            <Button variant="info" className="flex-fill text-nowrap" onClick={() => setShowImportModal(true)}>

              <i className="bi bi-file-earmark-excel"></i> استيراد

            </Button>

            <Button variant="info" className="flex-fill text-nowrap" onClick={() => {

              setSelectedRows([]);

              setShowPrintModal(true);

            }}>

              <i className="bi bi-box-arrow-up-right"></i> تصدير

            </Button>

          </div>

        </div>

      </div>



      <div className="row mb-3 align-items-center">

        {/* حقل البحث */}

        <div className="col-12 col-lg-9 mb-3 mb-lg-0">

          <input

            type="text"

            className="form-control"

            placeholder="بحث باسم المقرر، الكود، البرنامج، أو الكلية..."

            value={searchTerm}

            onChange={(e) => {

              setSearchTerm(e.target.value);

              setCurrentPage(1);

            }}

          />

          <div style={{ marginTop: '10px', fontSize: '15px', fontWeight: 'bold', color: '#2e7d32' }}>

            مجموع عدد المقررات على مستوى {searchTerm ? `(${searchTerm})` : 'جميع الكليات'}: {filteredCourses.length} مقرراً

          </div>

        </div>



        {/* زر إضافة مقرر جديد */}

        <div className="col-12 col-lg-3">

          <Button

            variant="primary"

            onClick={() => openModal(null, 'add')}

            className="w-100 text-nowrap"

          >

            + إضافة مقرر جديد

          </Button>

        </div>

      </div>



      <Table responsive striped bordered hover className="mt-3">

        <thead>

          <tr style={{ borderBottom: '2px solid #ddd', whiteSpace: 'nowrap' }}>

            <th style={{ textAlign: 'right', paddingRight: '20px', width: '35%' }}>الكود + اسم المقرر / الحزمة</th>

            <th style={{ width: '20%' }}>البرنامج</th>

            <th style={{ width: '20%' }}>الكلية</th>

            <th style={{ width: '15%' }}>نوع المقرر / الحزمة</th>

            <th style={{ width: '10%' }}>الإجراءات</th>

          </tr>

        </thead>

        <tbody>

          {currentCourses.map((c) => (

            <React.Fragment key={c.id}>

              <tr style={{ borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>

                <td style={{ textAlign: 'right', paddingRight: '20px' }}>

                  {c.duration === "مقرر طولي" ? (

                    <div style={{ marginBottom: '4px' }}>

                      <span className="badge bg-primary" style={{ fontSize: '10px' }}>مقرر طولي</span>

                    </div>

                  ) : c.is_bundle ? (

                    <div style={{ marginBottom: '4px' }}>

                      <span className="badge bg-success" style={{ fontSize: '10px' }}>حزمة دراسية</span>

                    </div>

                  ) : null}

                  <div>{c.name_ar}</div>

                  {c.name_en && c.name_en !== c.name_ar && <div style={{ color: '#6c757d' }}>{c.name_en}</div>}

                  <div style={{ color: '#2e7d32', marginTop: '2px', fontSize: '15px' }}>{c.code}</div>

                </td>

                <td>{c.programsList?.join(" - ") || "-"}</td>

                <td>{c.facultiesList?.join(" - ") || "-"}</td>

                <td>

                  {c.duration === "مقرر طولي" ? (

                    <span className="text-primary fw-bold">مقرر طولي</span>

                  ) : c.is_bundle ? (

                    <span className="text-success fw-bold">حزمة تتكون من ({c.modules?.length || 0}) أقسام علمية</span>

                  ) : (

                    c.course_type || "مقرر منفرد"

                  )}

                </td>

                <td>

                  <div className="d-flex justify-content-center align-items-center gap-3">

                    <Button variant="link" size="sm" className="p-0" title="عرض التفاصيل" onClick={() => openModal(c, 'view')}>

                      <i className="bi bi-eye-fill action-btn-view" style={{ fontSize: '18px' }}></i>

                    </Button>

                    <Button variant="link" size="sm" className="p-0" title="تعديل" onClick={() => openModal(c, 'edit')}>

                      <i className="bi bi-pencil-square action-btn-edit" style={{ fontSize: '18px' }}></i>

                    </Button>

                    <Button variant="link" size="sm" className="p-0" title="حذف" onClick={() => handleDelete(c.allIds)}>

                      <i className="bi bi-trash3-fill action-btn-delete" style={{ fontSize: '18px' }}></i>

                    </Button>

                  </div>

                </td>

              </tr>

              {c.is_bundle && c.modules && c.modules.length > 0 && (

                <tr className="bg-light">

                  <td colSpan={5} className="p-2" style={{ backgroundColor: '#f0fdf4' }}>

                    <div className="fw-bold text-success mb-1 small" style={{ marginRight: '15px' }}>

                      <i className="bi bi-diagram-3-fill me-1"></i> الأقسام العلمية للقسم/الحزمة:

                    </div>

                    <div className="table-responsive" style={{ marginRight: '15px', marginLeft: '15px' }}>

                      <table className="table table-bordered bg-white text-center align-middle m-0" style={{ fontSize: '13px' }}>

                        <thead className="table-success">

                          <tr>

                            <th>القسم العلمي</th>

                            <th>الساعات المعتمدة</th>

                            <th>نظري</th>

                            <th>عملي / كلينيكي</th>

                            <th>أعمال سنة</th>

                            <th>عملي (درجات)</th>

                            <th>نظري (درجات)</th>

                            <th>الدرجة الكلية للقسم</th>

                          </tr>

                        </thead>

                        <tbody>

                          {c.modules.map((m, idx) => (

                            <tr key={idx}>

                              <td className="fw-bold text-end">{m.department_name}</td>

                              <td>{m.credit_hours}</td>

                              <td>{m.theory_hours}</td>

                              <td>{m.practical_hours}</td>

                              <td>{m.year_work_grade}</td>

                              <td>{m.practical_grade}</td>

                              <td>{m.theory_grade}</td>

                              <td className="fw-bold text-success">{m.total_grade}</td>

                            </tr>

                          ))}

                        </tbody>



                      </table>

                    </div>

                  </td>

                </tr>

              )}

            </React.Fragment>

          ))}

          {currentCourses.length === 0 && (

            <tr>

              <td colSpan={5} style={{ color: 'red', textAlign: 'center' }}>لا توجد مقررات دراسية مطابقة لبحثك</td>

            </tr>

          )}

        </tbody>

      </Table>





      {/* Pagination */}

      {totalPages > 1 && (

        <div className="d-flex justify-content-end mt-3" style={{ direction: 'rtl' }}>

          <Pagination>

            <Pagination.First disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>»</Pagination.First>

            <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>›</Pagination.Prev>

            {getPaginationItems().map(page => (

              <Pagination.Item key={page} active={currentPage === page} onClick={() => setCurrentPage(page)}>

                {page}

              </Pagination.Item>

            ))}

            <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>‹</Pagination.Next>

            <Pagination.Last disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>«</Pagination.Last>

          </Pagination>

        </div>

      )}



      {/* مودال الإضافة والتعديل والعرض */}

      {showModal && (() => {

        const selectedFacultyName = faculties.find(f => String(f.id) === String(formData.faculty_id))?.name;

        const isMedicine = selectedFacultyName === "كلية الطب والجراحة";



        const selectedPrereqs = formData.prerequisite ? formData.prerequisite.split(" / ").map(s => s.trim()) : [];

        const selectedConcurrent = formData.concurrent_courses ? formData.concurrent_courses.split(" / ").map(s => s.trim()) : [];

        const selectedOtherProgs = formData.other_programs ? formData.other_programs.split(" / ").map(s => s.trim()) : [];

        return (

          <div style={modalOverlayStyle}>

            <div style={modalContentStyle}>

              <div className="d-flex justify-content-between align-items-center mb-3">

                <h4 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }}>

                  {modalMode === 'view' ? "تفاصيل المقرر" : modalMode === 'edit' ? "تعديل بيانات المقرر" : "إضافة مقرر جديد"}

                </h4>

                <button className="btn-close" onClick={() => setShowModal(false)}></button>

              </div>



              {/* القسم الأول: البيانات الأساسية */}

              <div className="card mb-3 p-3 border-0 bg-light shadow-sm" style={{ borderRadius: '10px' }}>

                <h6 className="fw-bold mb-3 border-bottom pb-2 text-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                  <i className="bi bi-card-text"></i> البيانات الأساسية للمقرر

                </h6>

                <div className="row">

                  <div className="col-md-3 mb-2">

                    <label className="small fw-bold">كود المقرر</label>

                    <input

                      placeholder="مثال: CSE-101"

                      className="form-control form-control-sm"

                      value={formData.code}

                      disabled={modalMode === 'view'}

                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}

                      style={{ borderColor: errors.code ? 'red' : '#ccc' }}

                    />

                    {errors.code && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.code}</span>}

                  </div>



                  <div className="col-md-4 mb-2">

                    <label className="small fw-bold">اسم المقرر بالعربي</label>

                    <input

                      placeholder="الاسم بالعربي"

                      className="form-control form-control-sm"

                      value={formData.name_ar}

                      disabled={modalMode === 'view'}

                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}

                      style={{ borderColor: errors.name_ar ? 'red' : '#ccc' }}

                    />

                    {errors.name_ar && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.name_ar}</span>}

                  </div>



                  <div className="col-md-5 mb-2">

                    <label className="small fw-bold">اسم المقرر بالإنجليزي</label>

                    <input

                      placeholder="الاسم بالإنجليزي"

                      className="form-control form-control-sm"

                      value={formData.name_en}

                      disabled={modalMode === 'view'}

                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}

                      style={{ borderColor: errors.name_en ? 'red' : '#ccc' }}

                    />

                    {errors.name_en && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.name_en}</span>}

                  </div>

                </div>



                <div className="row mt-2">

                  <div className="col-md-4 mb-2">

                    <label className="small fw-bold">الكلية</label>

                    <select

                      className="form-select form-select-sm"

                      value={formData.faculty_id}

                      onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value, program_id: "", level: "" })}

                      disabled={modalMode === 'view'}

                      style={{ borderColor: errors.faculty_id ? 'red' : '#ccc' }}

                    >

                      <option value="" disabled hidden>اختر الكلية...</option>

                      {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}

                    </select>

                    {errors.faculty_id && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.faculty_id}</span>}

                  </div>



                  <div className="col-md-4 mb-2">

                    <label className="small fw-bold">البرنامج</label>

                    <select

                      className="form-select form-select-sm"

                      value={formData.program_id}

                      onChange={(e) => setFormData({ ...formData, program_id: e.target.value, level: "" })}

                      disabled={modalMode === 'view' || !formData.faculty_id}

                      style={{ borderColor: errors.program_id ? 'red' : '#ccc' }}

                    >

                      <option value="" disabled hidden>اختر البرنامج...</option>

                      {programs.filter(p => String(p.faculty_id) === String(formData.faculty_id)).map(p => (

                        <option key={p.id} value={p.id}>{p.name}</option>

                      ))}

                    </select>

                    {errors.program_id && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.program_id}</span>}

                  </div>



                  <div className="col-md-2 mb-2">

                    <label className="small fw-bold">المستوى</label>

                    <select

                      className="form-select form-select-sm"

                      value={formData.level}

                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}

                      disabled={modalMode === 'view' || !formData.program_id}

                      style={{ borderColor: errors.level ? 'red' : '#ccc' }}

                    >

                      <option value="" disabled hidden>المستوى...</option>

                      {getLevelsForProgram(formData.program_id).map(l => (

                        <option key={l} value={l}>{getLevelLabel(l)}</option>

                      ))}

                    </select>

                    {errors.level && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.level}</span>}

                  </div>



                  <div className="col-md-2 mb-2">

                    <label className="small fw-bold">الترم</label>

                    <select

                      className="form-select form-select-sm"

                      value={formData.semester}

                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}

                      disabled={modalMode === 'view'}

                      style={{ borderColor: errors.semester ? 'red' : '#ccc' }}

                    >

                      <option value="" disabled hidden>اختر الترم...</option>

                      <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>

                      <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>

                      <option value="الفصل الدراسي الصيفي">الفصل الدراسي الصيفي</option>

                    </select>

                    {errors.semester && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.semester}</span>}

                  </div>

                </div>





              </div>



              {isMedicine && (

                <div className="card mb-3 p-3 border-0 bg-light shadow-sm" style={{ borderRadius: '10px' }}>

                  <h6 className="fw-bold mb-3 border-bottom pb-2 text-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                    <i className="bi bi-heart-pulse-fill"></i> خصائص مقرر الطب

                  </h6>

                  <div className="row mb-3">

                    <div className="col-md-4">

                      <label className="small fw-bold">عدد الأسابيع</label>

                      <div className="d-flex align-items-center gap-3">

                        <Form.Check

                          type="radio"

                          id="duration-number"

                          label="رقم"

                          name="durationMode"

                          checked={durationMode === 'رقم'}

                          onChange={() => setDurationMode('رقم')}

                          disabled={modalMode === 'view'}

                        />

                        <Form.Check

                          type="radio"

                          id="duration-long"

                          label="مقرر طولي"

                          name="durationMode"

                          checked={durationMode === 'مقرر طولي'}

                          onChange={() => {

                            setDurationMode('مقرر طولي');

                            setDurationWeeks('');

                          }}

                          disabled={modalMode === 'view'}

                        />

                      </div>

                    </div>

                    {durationMode === 'رقم' && (

                      <div className="col-md-4">

                        <label className="small fw-bold">الرقم</label>

                        <input

                          type="number"

                          className="form-control form-control-sm"

                          placeholder="عدد الأسابيع"

                          value={durationWeeks}

                          onChange={(e) => setDurationWeeks(e.target.value)}

                          disabled={modalMode === 'view'}

                        />

                      </div>

                    )}

                    <div className="col-md-4">

                      <label className="small fw-bold">زمن الامتحان النهائي</label>

                      <input

                        type="text"

                        className="form-control form-control-sm"

                        placeholder="مثال: 2.5 أو Practical"

                        value={formData.exam_time_hours || ""}

                        onChange={(e) => setFormData({ ...formData, exam_time_hours: e.target.value })}

                        disabled={modalMode === 'view'}

                      />

                    </div>

                  </div>



                  <div className="row mb-3">

                    <div className="col-md-12">

                      <label className="small fw-bold">الأقسام العلمية (Multiple Selection)</label>

                      <Select

                        isMulti

                        options={medDepartmentOptions}

                        value={medDepartments.map(d => ({ value: d.department_name, label: d.department_name }))}

                        onChange={(selected) => {

                          const newDepts = [];

                          selected.forEach(s => {

                            if (s.value === 'other') {

                              // Handled below

                            } else {

                              const existing = medDepartments.find(m => m.department_name === s.value);

                              if (existing) newDepts.push(existing);

                              else newDepts.push({

                                department_name: s.value,

                                theory_credit: 0, practical_credit: 0, activity_credit: 0,

                                theory_grade: 0, practical_grade: 0, year_work_grade: 0

                              });

                            }

                          });

                          // keep custom ones that are not 'other' but not in options

                          medDepartments.forEach(m => {

                            if (!medDepartmentOptions.find(o => o.value === m.department_name)) {

                              newDepts.push(m);

                            }

                          });

                          setMedDepartments(newDepts);

                        }}

                        isDisabled={modalMode === 'view'}

                        placeholder="اختر الأقسام العلمية..."

                        styles={{ menu: provided => ({ ...provided, zIndex: 9999 }) }}

                      />

                    </div>

                  </div>

                  {modalMode !== 'view' && (

                    <div className="row mb-3">

                      <div className="col-md-6 d-flex align-items-end gap-2">

                        <div className="flex-grow-1">

                          <label className="small fw-bold">إضافة قسم غير موجود (Other)</label>

                          <input

                            type="text"

                            className="form-control form-control-sm"

                            placeholder="اسم القسم الجديد"

                            value={customMedDept}

                            onChange={e => setCustomMedDept(e.target.value)}

                          />

                        </div>

                        <Button

                          variant="success"

                          size="sm"

                          disabled={!customMedDept}

                          onClick={() => {

                            if (customMedDept && !medDepartments.find(m => m.department_name === customMedDept)) {

                              setMedDepartments([...medDepartments, {

                                department_name: customMedDept,

                                theory_credit: 0, practical_credit: 0, activity_credit: 0,

                                theory_grade: 0, practical_grade: 0, year_work_grade: 0

                              }]);

                              setCustomMedDept('');

                            }

                          }}

                        >

                          إضافة

                        </Button>

                      </div>

                    </div>

                  )}



                  {medDepartments.length > 0 && (

                    <div className="table-responsive">

                      <table className="table table-bordered table-sm text-center align-middle" style={{ fontSize: '12px' }}>

                        <thead className="table-success">

                          <tr>

                            <th rowSpan="2">القسم العلمي</th>

                            <th colSpan="3">الساعات المعتمدة</th>

                            <th colSpan="3">الساعات التدريسية (تلقائي)</th>

                            <th colSpan="3">توزيع الدرجات</th>

                            <th rowSpan="2">إجمالي الدرجة</th>

                            {modalMode !== 'view' && <th rowSpan="2">حذف</th>}

                          </tr>

                          <tr>

                            <th>نظري</th><th>عملي</th><th>أنشطة</th>

                            <th>نظري</th><th>عملي</th><th>أنشطة</th>

                            <th>نظري</th><th>عملي</th><th>أعمال سنة</th>

                          </tr>

                        </thead>

                        <tbody>

                          {medDepartments.map((dept, idx) => {

                            const tc = parseFloat(dept.theory_credit) || 0;

                            const pc = parseFloat(dept.practical_credit) || 0;

                            const ac = parseFloat(dept.activity_credit) || 0;

                            const tg = parseFloat(dept.theory_grade) || 0;

                            const pg = parseFloat(dept.practical_grade) || 0;

                            const yg = parseFloat(dept.year_work_grade) || 0;

                            const totalG = Number((tg + pg + yg).toFixed(2));



                            const updateDept = (field, val) => {

                              const newDepts = [...medDepartments];

                              newDepts[idx][field] = val;

                              setMedDepartments(newDepts);

                            };



                            return (

                              <tr key={idx}>

                                <td className="fw-bold">{dept.department_name}</td>

                                <td>{modalMode === 'view' ? dept.theory_credit : <input type="number" step="0.5" className="form-control form-control-sm" value={dept.theory_credit} onChange={e => updateDept('theory_credit', e.target.value)} />}</td>

                                <td>{modalMode === 'view' ? dept.practical_credit : <input type="number" step="0.5" className="form-control form-control-sm" value={dept.practical_credit} onChange={e => updateDept('practical_credit', e.target.value)} />}</td>

                                <td>{modalMode === 'view' ? dept.activity_credit : <input type="number" step="0.5" className="form-control form-control-sm" value={dept.activity_credit} onChange={e => updateDept('activity_credit', e.target.value)} />}</td>



                                <td className="bg-light">{Number((tc * 15).toFixed(2))}</td>

                                <td className="bg-light">{Number((pc * 30).toFixed(2))}</td>

                                <td className="bg-light">{Number((ac * 60).toFixed(2))}</td>



                                <td>{modalMode === 'view' ? dept.theory_grade : <input type="number" step="1" className="form-control form-control-sm" value={dept.theory_grade} onChange={e => updateDept('theory_grade', e.target.value)} />}</td>

                                <td>{modalMode === 'view' ? dept.practical_grade : <input type="number" step="1" className="form-control form-control-sm" value={dept.practical_grade} onChange={e => updateDept('practical_grade', e.target.value)} />}</td>

                                <td>{modalMode === 'view' ? dept.year_work_grade : <input type="number" step="1" className="form-control form-control-sm" value={dept.year_work_grade} onChange={e => updateDept('year_work_grade', e.target.value)} />}</td>



                                <td className="bg-light fw-bold text-success">{totalG}</td>

                                {modalMode !== 'view' && (

                                  <td>

                                    <Button variant="danger" size="sm" className="p-0 px-1" onClick={() => {

                                      setMedDepartments(medDepartments.filter((_, i) => i !== idx));

                                    }}><i className="bi bi-trash"></i></Button>

                                  </td>

                                )}

                              </tr>

                            );

                          })}

                        </tbody>

                        <tfoot>

                          <tr>

                            <td colSpan="4" className="text-start fw-bold">إجمالي الساعات المعتمدة للمقرر:</td>

                            <td colSpan="3" className="fw-bold text-success" style={{ fontSize: '14px' }}>

                              {Number(medDepartments.reduce((sum, d) => sum + (parseFloat(d.theory_credit) || 0) + (parseFloat(d.practical_credit) || 0) + (parseFloat(d.activity_credit) || 0), 0).toFixed(2))}

                            </td>

                            <td colSpan="5"></td>

                          </tr>

                        </tfoot>

                      </table>

                    </div>

                  )}

                </div>

              )}

              {!isMedicine && (

                <>

                  {/* القسم الثاني: خصائص المقرر والتسجيل */}

                  <div className="card mb-3 p-3 border-0 bg-light shadow-sm" style={{ borderRadius: '10px' }}>

                    <h6 className="fw-bold mb-3 border-bottom pb-2 text-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                      <i className="bi bi-gear-fill"></i> خصائص المقرر وشروط التسجيل

                    </h6>

                    <div className="row">

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">نوع المقرر</label>

                        <select

                          className="form-select form-select-sm"

                          value={formData.course_type}

                          onChange={(e) => setFormData({ ...formData, course_type: e.target.value })}

                          disabled={modalMode === 'view'}

                          style={{ borderColor: '#ccc' }}

                        >

                          <option value="">اختر نوع المقرر (اختياري)...</option>

                          <option value="اجبارى">اجبارى</option>

                          <option value="اختيارى">اختيارى</option>

                          <option value="اختياري حر">اختياري حر</option>

                          <option value="تدريب">تدريب</option>

                          <option value="مشروع">مشروع</option>

                        </select>

                        

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">الساعات المعتمدة</label>

                        <input

                          type="number"

                          min="0"

                          max="10"

                          step="0.5"

                          className="form-control form-control-sm"

                          value={formData.credit_hours}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, credit_hours: e.target.value })}

                          style={{ borderColor: errors.credit_hours ? 'red' : '#ccc' }}

                        />

                        {errors.credit_hours && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.credit_hours}</span>}

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">تسجيل المقرر في الصيفي</label>

                        <select

                          className="form-select form-select-sm"

                          value={formData.summer_registration}

                          onChange={(e) => setFormData({ ...formData, summer_registration: e.target.value })}

                          disabled={modalMode === 'view'}

                          style={{ borderColor: '#ccc' }}

                        >

                          <option value="">اختر تسجيل صيفي (اختياري)...</option>

                          <option value="نعم">نعم</option>

                          <option value="لا">لا</option>

                        </select>

                        

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">متطلب</label>

                        <select

                          className="form-select form-select-sm"

                          value={formData.requirement}

                          onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}

                          disabled={modalMode === 'view'}

                          style={{ borderColor: '#ccc' }}

                        >

                          <option value="">اختر متطلب (اختياري)...</option>

                          <option value="تخصص">تخصص</option>

                          <option value="جامعة">جامعة</option>

                          <option value="علوم أساسية">علوم أساسية</option>

                          <option value="كلية">كلية</option>

                          <option value="متطلب التدريب والتعلم الذاتي">متطلب التدريب والتعلم الذاتي</option>

                        </select>

                        

                      </div>

                    </div>

                    <div className="row mt-2">

                      {/* الصف الأول: المتطلب السابق وبجانبه المقررات المتزامنة بنسبة 6 إلى 6 لإعطاء أقصى مساحة أفقية */}

                      <div className="col-md-6 mb-2">

                        <label className="small fw-bold">المتطلب السابق</label>

                        {modalMode === 'view' ? (

                          <input className="form-control form-control-sm" value={formData.prerequisite || "-"} disabled readOnly />

                        ) : (

                          <div>

                            <div className="border rounded p-2 bg-white" style={{ height: '110px', overflowY: 'auto' }}>

                              {getAvailableCoursesForSelection().map(c => {

                                const isChecked = selectedPrereqs.includes(c.name_ar);

                                return (

                                  <div key={c.id} className="d-flex align-items-center justify-content-start gap-2 mb-1" style={{ direction: 'rtl', textAlign: 'right' }}>

                                    <input

                                      type="checkbox"

                                      className="form-check-input m-0"

                                      id={`prereq-${c.id}`}

                                      checked={isChecked}

                                      onChange={(e) => {

                                        let newPrereqs = [...selectedPrereqs];

                                        if (e.target.checked) {

                                          newPrereqs.push(c.name_ar);

                                        } else {

                                          newPrereqs = newPrereqs.filter(name => name !== c.name_ar);

                                        }

                                        setFormData({ ...formData, prerequisite: newPrereqs.join(" / ") });

                                      }}

                                    />

                                    <label className="form-check-label small m-0" htmlFor={`prereq-${c.id}`} style={{ whiteSpace: 'nowrap' }}>

                                      {c.name_ar} ({c.code})

                                    </label>

                                  </div>

                                );

                              })}

                            </div>

                          </div>

                        )}

                      </div>



                      <div className="col-md-6 mb-2">

                        <label className="small fw-bold">المقررات المتزامنة</label>

                        {modalMode === 'view' ? (

                          <input className="form-control form-control-sm" value={formData.concurrent_courses || "-"} disabled readOnly />

                        ) : (

                          <div>

                            <div className="border rounded p-2 bg-white" style={{ height: '110px', overflowY: 'auto' }}>

                              {getAvailableCoursesForSelection().map(c => {

                                const isChecked = selectedConcurrent.includes(c.name_ar);

                                return (

                                  <div key={c.id} className="d-flex align-items-center justify-content-start gap-2 mb-1" style={{ direction: 'rtl', textAlign: 'right' }}>

                                    <input

                                      type="checkbox"

                                      className="form-check-input m-0"

                                      id={`concurrent-${c.id}`}

                                      checked={isChecked}

                                      onChange={(e) => {

                                        let newConcs = [...selectedConcurrent];

                                        if (e.target.checked) {

                                          newConcs.push(c.name_ar);

                                        } else {

                                          newConcs = newConcs.filter(name => name !== c.name_ar);

                                        }

                                        setFormData({ ...formData, concurrent_courses: newConcs.join(" / ") });

                                      }}

                                    />

                                    <label className="form-check-label small m-0" htmlFor={`concurrent-${c.id}`} style={{ whiteSpace: 'nowrap' }}>

                                      {c.name_ar} ({c.code})

                                    </label>

                                  </div>

                                );

                              })}

                            </div>

                          </div>

                        )}

                      </div>

                    </div>



                    <div className="row mt-2">

                      {/* الصف الثاني: البرامج الأخرى المسجل بها وبجانبها يضاف للمعدل ونجاح/رسوب بنسبة 6 إلى 6 لمحاذاة خطوط الأعمدة */}

                      <div className="col-md-6 mb-2">

                        <label className="small fw-bold">البرامج الاخرى المسجل بها</label>

                        {modalMode === 'view' ? (

                          <input className="form-control form-control-sm" value={formData.other_programs || "-"} disabled readOnly />

                        ) : (

                          <div>

                            <div className="border rounded p-2 bg-white" style={{ height: '110px', overflowY: 'auto' }}>

                              {getAvailableOtherPrograms().map(p => {

                                const isChecked = selectedOtherProgs.includes(p.name);

                                return (

                                  <div key={p.id} className="d-flex align-items-center justify-content-start gap-2 mb-1" style={{ direction: 'rtl', textAlign: 'right' }}>

                                    <input

                                      type="checkbox"

                                      className="form-check-input m-0"

                                      id={`otherprog-${p.id}`}

                                      checked={isChecked}

                                      onChange={(e) => {

                                        let newProgs = [...selectedOtherProgs];

                                        if (e.target.checked) {

                                          newProgs.push(p.name);

                                        } else {

                                          newProgs = newProgs.filter(name => name !== p.name);

                                        }

                                        setFormData({ ...formData, other_programs: newProgs.join(" / ") });

                                      }}

                                    />

                                    <label className="form-check-label small m-0" htmlFor={`otherprog-${p.id}`}>

                                      {p.name}

                                    </label>

                                  </div>

                                );

                              })}

                            </div>

                          </div>

                        )}

                      </div>



                      <div className="col-md-6 mb-2">

                        <div className="mb-3">

                          <label className="small fw-bold">يضاف للمعدل</label>

                          <select

                            className="form-select form-select-sm"

                            value={formData.added_to_gpa}

                            onChange={(e) => setFormData({ ...formData, added_to_gpa: e.target.value })}

                            disabled={modalMode === 'view'}

                            style={{ borderColor: '#ccc' }}

                          >

                            <option value="">اختر يضاف للمعدل (اختياري)...</option>

                            <option value="يضاف للمعدل التراكمي">يضاف للمعدل التراكمي</option>

                            <option value="لا يضاف للمعدل التراكمي">لا يضاف للمعدل التراكمي</option>

                            <option value="يضاف للساعات فقط">يضاف للساعات فقط</option>

                          </select>

                          

                        </div>

                        <div>

                          <label className="small fw-bold">نجاح أو رسوب</label>

                          <select

                            className="form-select form-select-sm"

                            value={formData.pass_fail}

                            onChange={(e) => setFormData({ ...formData, pass_fail: e.target.value })}

                            disabled={modalMode === 'view'}

                          >

                            <option value="نعم">نعم</option>

                            <option value="لا">لا</option>

                          </select>

                        </div>

                      </div>

                    </div>

                  </div>



                  {/* القسم الثالث: توزيع الساعات */}

                  <div className="card mb-3 p-3 border-0 bg-light shadow-sm" style={{ borderRadius: '10px' }}>

                    <h6 className="fw-bold mb-3 border-bottom pb-2 text-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                      <i className="bi bi-clock-fill"></i> توزيع الساعات الدراسية

                    </h6>

                    <div className="row">

                      <div className="col-md-2 mb-2">

                        <label className="small fw-bold">محاضرات ( نظري )</label>

                        <input type="number" step="0.5" className="form-control form-control-sm" value={formData.theory_hours} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, theory_hours: e.target.value })} />

                      </div>

                      <div className="col-md-2 mb-2">

                        <label className="small fw-bold">عملي</label>

                        <input type="number" step="0.5" className="form-control form-control-sm" value={formData.practical_hours} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, practical_hours: e.target.value })} />

                      </div>

                      <div className="col-md-2 mb-2">

                        <label className="small fw-bold">تدريب - تمارين</label>

                        <input type="number" step="0.5" className="form-control form-control-sm" value={formData.exercise_hours} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, exercise_hours: e.target.value })} />

                      </div>

                      <div className="col-md-2 mb-2">

                        <label className="small fw-bold">تدريب ميداني</label>

                        <input type="number" step="0.5" className="form-control form-control-sm" value={formData.activity_hours} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, activity_hours: e.target.value })} />

                      </div>

                      <div className="col-md-2 mb-2">

                        <label className="small fw-bold">ساعات الامتحان</label>

                        <input type="number" step="0.5" className="form-control form-control-sm" value={formData.exam_time_hours} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, exam_time_hours: e.target.value })} />

                      </div>

                      <div className="col-md-2 mb-2">

                        <label className="small fw-bold">الساعات الدراسية</label>

                        <input

                          type="number"

                          step="any"

                          min="0"

                          placeholder="ساعات دراسية"

                          className="form-control form-control-sm"

                          value={formData.study_hours}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, study_hours: e.target.value })}

                          style={{ borderColor: errors.study_hours ? 'red' : '#ccc' }}

                        />

                        {errors.study_hours && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.study_hours}</span>}

                      </div>

                    </div>

                  </div>



                  {/* القسم الرابع: توزيع الدرجات ونسب النجاح */}

                  <div className="card mb-3 p-3 border-0 bg-light shadow-sm" style={{ borderRadius: '10px' }}>

                    <h6 className="fw-bold mb-3 border-bottom pb-2 text-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                      <i className="bi bi-award-fill"></i> توزيع الدرجات ونسب النجاح والمقررات الاختيارية

                    </h6>

                    <div className="row">

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">أعمال الفصل / السنة</label>

                        <input type="number" step="0.5" className="form-control form-control-sm" value={formData.year_work_grade} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, year_work_grade: e.target.value })} />

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">نهاية الفصل / تحريري</label>

                        <input type="number" step="0.5" className="form-control form-control-sm" value={formData.theory_grade} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, theory_grade: e.target.value })} />

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">عملي</label>

                        <input type="number" step="0.5" className="form-control form-control-sm" value={formData.practical_grade} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, practical_grade: e.target.value })} />

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">منتصف الفصل</label>

                        <input

                          type="number"

                          step="any"

                          min="0"

                          placeholder="درجة منتصف الفصل"

                          className="form-control form-control-sm"

                          value={formData.midterm_grade}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, midterm_grade: e.target.value })}

                          style={{ borderColor: errors.midterm_grade ? 'red' : '#ccc' }}

                        />

                        {errors.midterm_grade && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.midterm_grade}</span>}

                      </div>

                    </div>



                    <div className="row mt-2">

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">منتصف الفصل ٢</label>

                        <input

                          type="number"

                          step="any"

                          min="0"

                          placeholder="درجة منتصف الفصل ٢"

                          className="form-control form-control-sm"

                          value={formData.midterm_2_grade}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, midterm_2_grade: e.target.value })}

                          style={{ borderColor: errors.midterm_2_grade ? 'red' : '#ccc' }}

                        />

                        {errors.midterm_2_grade && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.midterm_2_grade}</span>}

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">شفوي</label>

                        <input

                          type="number"

                          step="any"

                          min="0"

                          placeholder="درجة الشفوي"

                          className="form-control form-control-sm"

                          value={formData.oral_grade}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, oral_grade: e.target.value })}

                          style={{ borderColor: errors.oral_grade ? 'red' : '#ccc' }}

                        />

                        {errors.oral_grade && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.oral_grade}</span>}

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">تحريري خلال الفصل</label>

                        <input

                          type="number"

                          step="any"

                          min="0"

                          placeholder="درجة التحريري خلال الفصل"

                          className="form-control form-control-sm"

                          value={formData.written_grade}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, written_grade: e.target.value })}

                          style={{ borderColor: errors.written_grade ? 'red' : '#ccc' }}

                        />

                        {errors.written_grade && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.written_grade}</span>}

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">كلينك (سريري)</label>

                        <input

                          type="number"

                          step="any"

                          min="0"

                          placeholder="درجة الكلينك"

                          className="form-control form-control-sm"

                          value={formData.clinical_grade}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, clinical_grade: e.target.value })}

                          style={{ borderColor: errors.clinical_grade ? 'red' : '#ccc' }}

                        />

                        {errors.clinical_grade && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.clinical_grade}</span>}

                      </div>

                    </div>



                    <div className="row mt-2">

                      <div className="col-md-4 mb-2">

                        <label className="small fw-bold">تقييم نهائي</label>

                        <input

                          type="number"

                          step="any"

                          min="0"

                          placeholder="درجة التقييم النهائي"

                          className="form-control form-control-sm"

                          value={formData.final_eval_grade}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, final_eval_grade: e.target.value })}

                          style={{ borderColor: errors.final_eval_grade ? 'red' : '#ccc' }}

                        />

                        {errors.final_eval_grade && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.final_eval_grade}</span>}

                      </div>

                      <div className="col-md-4 mb-2">

                        <label className="small fw-bold">Attendance, Activity & Attitude</label>

                        <input

                          type="number"

                          step="any"

                          min="0"

                          placeholder="درجة الحضور والأنشطة والسمات"

                          className="form-control form-control-sm"

                          value={formData.attendance_activity_grade}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, attendance_activity_grade: e.target.value })}

                          style={{ borderColor: errors.attendance_activity_grade ? 'red' : '#ccc' }}

                        />

                        {errors.attendance_activity_grade && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.attendance_activity_grade}</span>}

                      </div>

                      <div className="col-md-4 mb-2">

                        <label className="small fw-bold">الدرجة الكلية / المجموع</label>

                        <input type="number" step="0.5" className="form-control form-control-sm bg-secondary text-white fw-bold" value={formData.total_grade} disabled={true} readOnly={true} />

                      </div>

                    </div>



                    <div className="row mt-2">

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">نسبة النجاح</label>

                        <input

                          type="number"

                          min="50"

                          max="65"

                          step="1"

                          placeholder="نسبة النجاح"

                          className="form-control form-control-sm"

                          value={formData.success_rate}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, success_rate: e.target.value })}

                          style={{ borderColor: errors.success_rate ? 'red' : '#ccc' }}

                        />

                        {errors.success_rate && <span className="text-danger small d-block" style={{ fontSize: '11px' }}>{errors.success_rate}</span>}

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">نسبة الرسوب النظري</label>

                        <select

                          className="form-select form-select-sm"

                          value={formData.fail_rate}

                          onChange={(e) => setFormData({ ...formData, fail_rate: e.target.value })}

                          disabled={modalMode === 'view'}

                        >

                          {(!formData.fail_rate || formData.fail_rate === "-" || !failRates.includes(formData.fail_rate)) && (

                            <option value={formData.fail_rate || ""}>{formData.fail_rate || "-"}</option>

                          )}

                          {failRates.map(rate => (

                            <option key={rate} value={rate}>{formatFailRate(rate)}</option>

                          ))}

                        </select>

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">كود المجموعة الاختيارية</label>

                        <input placeholder="كود المجموعة الاختيارية" className="form-control form-control-sm" value={formData.elective_group_code} disabled={modalMode === 'view'} onChange={(e) => setFormData({ ...formData, elective_group_code: e.target.value })} />

                      </div>

                      <div className="col-md-3 mb-2">

                        <label className="small fw-bold">عدد المقررات الاختيارية</label>

                        <input

                          type="number"

                          placeholder="عدد المقررات الاختيارية"

                          className="form-control form-control-sm"

                          value={formData.elective_courses_count}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, elective_courses_count: e.target.value })}

                        />

                      </div>

                    </div>

                  </div>



                  {/* القسم الخامس: وصف المقرر */}

                  <div className="card mb-3 p-3 border-0 bg-light shadow-sm" style={{ borderRadius: '10px' }}>

                    <h6 className="fw-bold mb-3 border-bottom pb-2 text-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                      <i className="bi bi-file-earmark-text-fill"></i> وصف المقرر الدراسي

                    </h6>

                    <div className="row">

                      <div className="col-12">

                        <textarea

                          placeholder="اكتب وصفاً أو نبذة مختصرة عن المقرر الدراسي..."

                          className="form-control"

                          rows="3"

                          dir="auto"

                          style={{ textAlign: 'start' }}

                          value={formData.description}

                          disabled={modalMode === 'view'}

                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}

                        />

                      </div>

                    </div>

                  </div>



                </>

              )}

              <div className="mt-4 d-flex justify-content-end gap-2">

                {modalMode !== 'view' ? (

                  <>

                    <Button variant="success" onClick={handleSave}>حفظ البيانات</Button>

                    <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>

                  </>

                ) : (

                  <>



                    <Button variant="success" onClick={handlePrintSingleCourse}>

                      <i className="bi bi-printer"></i> طباعة

                    </Button>

                    <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>

                  </>

                )}

              </div>

            </div>

          </div>

        );

      })()}



      {/* مودال الاستيراد */}
      <Modal
        show={showImportModal}
        style={{ '--bs-modal-width': '620px' }}
        onHide={() => {
          setShowImportModal(false);
          setExcelFile(null);
          setImportResult(null);
        }}
      >

        <Modal.Header closeButton>

          <Modal.Title className="fw-bold" style={{ fontSize: '22px' }}>استيراد المقررات الدراسية من إكسيل</Modal.Title>

        </Modal.Header>

        <Modal.Body style={{ direction: 'rtl', textAlign: 'right' }}>

          <div className="alert alert-info py-3">
            <div className="fw-bold mb-2" style={{ fontSize: '17px', color: '#0c5460' }}>
              <i className="bi bi-info-circle-fill ms-1"></i> خطوات وشروط استيراد المقررات:
            </div>
            <ol className="mb-2 pe-3" style={{ fontSize: '15px', lineHeight: '1.8' }}>
              <li>قم بتحميل النموذج الفارغ بالضغط على الزر أدناه.</li>
              <li>قم بتعبئة بيانات المقررات الدراسية في النموذج مع مراعاة الحقول المطلوبة.</li>
              <li>ارفع الملف النهائي بعد التعبئة لبدء الاستيراد المباشر.</li>
            </ol>
            <div style={{ backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #b8daff', fontSize: '13.5px', marginTop: '8px' }}>
              <div className="fw-bold text-danger mb-1" style={{ fontSize: '14px' }}>
                <i className="bi bi-exclamation-triangle-fill ms-1"></i> الحقول الإجبارية (Required) في الشيت:
              </div>
              <div className="mb-1" style={{ color: '#2b2b2b' }}>
                • <strong>الحقول الإجبارية:</strong> (كود المقرر – الكلية – البرنامج – المستوى – الترم).
              </div>
              <div style={{ color: '#2b2b2b' }}>
                • <strong>اسم المقرر:</strong> يجب كتابة أحد الاسمين على الأقل (الاسم بالعربي أو الاسم بالإنجليزي أو كلاهما).
              </div>
            </div>
          </div>



          <div className="d-flex gap-2 mb-4">

            {showOtherFacultiesTemplate && (

              <Button

                variant="outline-success"

                onClick={handleDownloadTemplate}

                className="w-100 fw-bold"

                style={{ fontSize: '16px' }}

              >

                <i className="bi bi-download me-1"></i> نموذج باقي الكليات

              </Button>

            )}

            {showMedicineTemplate && (

              <Button

                variant="outline-primary"

                onClick={handleDownloadMedicineTemplate}

                className="w-100 fw-bold"

                style={{ fontSize: '16px' }}

              >

                <i className="bi bi-download me-1"></i> نموذج كلية الطب

              </Button>

            )}

          </div>



          <Form.Group className="mb-3">

            <Form.Label className="fw-bold" style={{ fontSize: '18px' }}>ارفع ملف نموذج المقررات النهائي المعبأ:</Form.Label>

            <Form.Control

              type="file"

              accept=".xlsx, .xls"

              onChange={(e) => setExcelFile(e.target.files[0])}

            />

          </Form.Group>



          {importResult && (

            <div className={`alert ${importResult.success ? 'alert-success' : 'alert-danger'} mt-3 py-3`}>

              <div className="fw-bold mb-2" style={{ fontSize: '19px' }}>{importResult.message}</div>

              {importResult.success && (

                <ul className="mb-0 mt-2 pe-3" style={{ fontSize: '17px', lineHeight: '1.8' }}>

                  <li>تم إضافة مقررات جديدة: <strong>{importResult.imported}</strong>

                    {importResult.imported_details && importResult.imported_details.length > 0 && (

                      <ul style={{ fontSize: '18px', fontWeight: '600', color: '#155724', maxHeight: '150px', overflowY: 'auto', marginTop: '5px' }}>

                        {importResult.imported_details.map((c, idx) => (

                          <li key={idx}>{c.name} ({c.code})</li>

                        ))}

                      </ul>

                    )}

                  </li>

                  <li>تم تحديث مقررات موجودة: <strong>{importResult.updated}</strong>

                    {importResult.updated_details && importResult.updated_details.length > 0 && (

                      <ul style={{ fontSize: '18px', fontWeight: '600', color: '#155724', maxHeight: '150px', overflowY: 'auto', marginTop: '5px' }}>

                        {importResult.updated_details.map((c, idx) => (

                          <li key={idx}>{c.name} ({c.code})</li>

                        ))}

                      </ul>

                    )}

                  </li>

                  <li>إجمالي المقررات المعالجة: <strong>{importResult.total}</strong></li>

                </ul>

              )}

            </div>

          )}

        </Modal.Body>

        <Modal.Footer>

          <Button

            variant="success"

            onClick={handleImportExcel}

            disabled={importing || !excelFile}

          >

            {importing ? "جاري الاستيراد..." : "بدء الاستيراد"}

          </Button>

          <Button variant="secondary" onClick={() => {

            setShowImportModal(false);

            setExcelFile(null);

            setImportResult(null);

          }}>إلغاء</Button>

        </Modal.Footer>

      </Modal>



      {/* مودال الطباعة والتصدير */}

      <Modal show={showPrintModal} onHide={() => setShowPrintModal(false)} size="xl">

        <Modal.Header closeButton>

          <Modal.Title>تصدير المقررات الدراسية</Modal.Title>

        </Modal.Header>

        <Modal.Body>

          <div className="mb-3">

            <div className="row g-2 mb-2">

              <div className="col-md-4">

                <input

                  className="form-control"

                  placeholder="بحث باسم المقرر، الكود، البرنامج أو الكلية..."

                  value={printSearchTerm}

                  onChange={(e) => setPrintSearchTerm(e.target.value)}

                />

              </div>

              <div className="col-md-4">

                <Form.Select value={printCourseType} onChange={(e) => setPrintCourseType(e.target.value)}>

                  <option value="">جميع أنواع المقررات</option>

                  {Array.from(new Set([

                    "اجبارى", "اختيارى", "اختياري حر", "تدريب", "مشروع", "حزمة دراسية", "مقرر طولي",

                    ...courses.map(c => c.course_type ? c.course_type.trim() : "").filter(Boolean)

                  ])).map(t => (

                    <option key={t} value={t}>{t}</option>

                  ))}

                </Form.Select>

              </div>

              <div className="col-md-4">

                <Form.Select value={printPassFail} onChange={(e) => setPrintPassFail(e.target.value)}>

                  <option value="">نجاح أو رسوب (الكل)</option>

                  <option value="نعم">نعم</option>

                  <option value="- (فارغ)">- (فارغ)</option>

                </Form.Select>

              </div>

            </div>

            <div className="row g-2 mb-3">

              <div className="col-md-3">

                <Form.Select value={printAddedToGpa} onChange={(e) => setPrintAddedToGpa(e.target.value)}>

                  <option value="">يضاف للمعدل التراكمي (الكل)</option>

                  {Array.from(new Set([

                    "يضاف للمعدل التراكمي", "لا يضاف للمعدل التراكمي", "يضاف للساعات فقط",

                    ...courses.map(c => c.added_to_gpa ? c.added_to_gpa.trim() : "").filter(Boolean)

                  ])).map(g => (

                    <option key={g} value={g}>{g}</option>

                  ))}

                </Form.Select>

              </div>

              <div className="col-md-3">

                <Form.Select value={printSummerReg} onChange={(e) => setPrintSummerReg(e.target.value)}>

                  <option value="">تسجيل المقرر في الصيفي (الكل)</option>

                  <option value="نعم">نعم</option>

                  <option value="لا">لا</option>

                </Form.Select>

              </div>

              <div className="col-md-3">

                <Form.Select value={printLevel} onChange={(e) => setPrintLevel(e.target.value)}>

                  <option value="">جميع المستويات</option>

                  <option value="0">المستوى العام</option>

                  <option value="1">المستوى الأول</option>

                  <option value="2">المستوى الثاني</option>

                  <option value="3">المستوى الثالث</option>

                  <option value="4">المستوى الرابع</option>

                  <option value="5">المستوى الخامس</option>

                </Form.Select>

              </div>

              <div className="col-md-3">

                <Form.Select value={printSemester} onChange={(e) => setPrintSemester(e.target.value)}>

                  <option value="">جميع الفصول الدراسية</option>

                  <option value="الفصل الدراسي الأول">الفصل الأول</option>

                  <option value="الفصل الدراسي الثاني">الفصل الثاني</option>

                  <option value="الفصل الدراسي الصيفي">الفصل الصيفي</option>

                </Form.Select>

              </div>

            </div>

            <div className="d-flex flex-wrap gap-2">

              <Button

                variant="outline-primary"

                size="sm"

                onClick={() => setSelectedRows(filteredPrint.map(c => c.id))}

              >

                تحديد الكل

              </Button>

              <Button

                variant="outline-secondary"

                size="sm"

                onClick={() => setSelectedRows([])}

              >

                إلغاء تحديد الكل

              </Button>

              {(printSearchTerm !== "" || printCourseType !== "" || printPassFail !== "" || printAddedToGpa !== "" || printSummerReg !== "" || printLevel !== "" || printSemester !== "") && (

                <Button

                  variant="outline-secondary"

                  size="sm"

                  onClick={() => {

                    setPrintSearchTerm("");

                    setPrintCourseType("");

                    setPrintPassFail("");

                    setPrintAddedToGpa("");

                    setPrintSummerReg("");

                    setPrintLevel("");

                    setPrintSemester("");

                  }}

                  style={{ whiteSpace: 'nowrap', marginRight: 'auto' , height : '35px' }}

                >

                  إزالة الفلاتر

                </Button>

              )}

            </div>

          </div>



          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>

            <Table bordered hover striped responsive>

              <thead>

                <tr>

                  <th style={{ width: '5%' }}>

                    <input

                      type="checkbox"

                      checked={

                        filteredPrint.length > 0 &&

                        filteredPrint.every(c => selectedRows.includes(c.id))

                      }

                      onChange={(e) => {

                        const filteredIds = filteredPrint.map(c => c.id);

                        if (e.target.checked) {

                          setSelectedRows(Array.from(new Set([...selectedRows, ...filteredIds])));

                        } else {

                          setSelectedRows(selectedRows.filter(id => !filteredIds.includes(id)));

                        }

                      }}

                    />

                  </th>

                  <th style={{ width: '40%' }}>اسم المقرر / الحزمة + الكود</th>

                  <th style={{ width: '30%' }}>البرنامج</th>

                  <th style={{ width: '25%' }}>الكلية</th>

                </tr>

              </thead>

              <tbody>

                {filteredPrint.map(c => (

                  <tr key={c.id}>

                    <td>

                      <input

                        type="checkbox"

                        checked={selectedRows.includes(c.id)}

                        onChange={() => {

                          if (selectedRows.includes(c.id)) {

                            setSelectedRows(selectedRows.filter(id => id !== c.id));

                          } else {

                            setSelectedRows([...selectedRows, c.id]);

                          }

                        }}

                      />

                    </td>

                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>

                      {c.duration === "مقرر طولي" ? (

                        <div style={{ marginBottom: '4px' }}>

                          <span className="badge bg-primary" style={{ fontSize: '10px' }}>مقرر طولي</span>

                        </div>

                      ) : c.is_bundle ? (

                        <div style={{ marginBottom: '4px' }}>

                          <span className="badge bg-success" style={{ fontSize: '10px' }}>حزمة دراسية</span>

                        </div>

                      ) : null}

                      <div>{c.name_ar}</div>

                      {c.name_en && c.name_en !== c.name_ar && <div style={{ color: '#6c757d' }}>{c.name_en}</div>}

                      <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>{c.code}</div>

                    </td>

                    <td>{c.programsList?.join(" - ") || "-"}</td>

                    <td>{c.facultiesList?.join(" - ") || "-"}</td>

                  </tr>

                ))}

              </tbody>

            </Table>

          </div>

        </Modal.Body>

        <Modal.Footer>
          <Button variant="warning" onClick={handleExportExcel}>
            <i className="bi bi-file-earmark-excel"></i> Excel
          </Button>
          <Button variant="secondary" onClick={() => setShowPrintModal(false)}>إلغاء</Button>
        </Modal.Footer>

      </Modal>

    </div>

  );

};



const inputStyle = { padding: '8px', width: '100%', marginBottom: '5px', borderRadius: '5px', border: '1px solid #ccc' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 };

const modalContentStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '10px', width: '1200px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' };



export default CoursesPage;

