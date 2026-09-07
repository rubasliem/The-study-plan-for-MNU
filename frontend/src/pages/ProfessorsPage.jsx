import { FaUserTie } from "react-icons/fa";

import React, { useState, useEffect, useContext } from 'react';

import axios from 'axios';

import toast from 'react-hot-toast';

import { Table, Button, Modal, Form, Spinner, Row, Col, Alert, Pagination } from 'react-bootstrap';

import Select from 'react-select';

import logo from '../assets/logo.png';

import { confirmAction } from '../utils/confirmAlert';

import { AuthContext } from '../context/AuthContext';

// دالة تحويل الاختصار والرمز الوظيفي

const getFullJobTitle = (abbrev) => {

  if (!abbrev) return "-";

  const t = String(abbrev).trim();

  const titles = {

    "أ.د": "أستاذ",

    "أستاذ دكتور": "أستاذ",

    "أ.م": "أستاذ",

    "أ.م.د": "أستاذ مساعد",

    "د": "مدرس",

    "م.م": "مدرس مساعد",

    "أ": "معيد",

    "ط": "معيد",

    "ص": "معيد",

    "معيد": "معيد",

    "أخصائي": "أخصائي",

    "م.ع": "معيد",

    "م": "مدرس"

  };

  return titles[t] || t;

};



const getProfAbbreviation = (prof, facultyContext = null) => {

  if (!prof) return "";

  const rawTitle = typeof prof === 'string' ? prof : (prof.job_title || "");

  const t = String(rawTitle).trim();



  if (t === "أستاذ" || t === "أ.م" || t.includes("أستاذ دكتور") || t === "أ.د") return "أ.م";

  if (t === "أستاذ مساعد" || t === "أ.م.د") return "أ.م.د";

  if (t === "مدرس" || t === "د" || t === "د.") return "د";

  if (t === "مدرس مساعد" || t === "م.م" || t === "م.م.") return "م.م";

  if (t === "أخصائي" || t === "اخصائي") return "أخصائي";



  if (t === "معيد" || t === "م.ع" || t === "معيدة" || t === "أ" || t === "ط" || t === "ص" || t === "م" || t === "مع.") {

    let facList = [];

    if (prof && typeof prof === 'object') {

      if (prof.faculties && Array.isArray(prof.faculties)) {

        facList = prof.faculties.map(f => typeof f === 'string' ? f : f.name_ar || f.name || '');

      } else if (prof.faculty_name) {

        facList = [prof.faculty_name];

      }

    }

    if (facultyContext) {

      facList.push(facultyContext);

    }



    const facStr = facList.join(' ');

    if (facStr.includes("الصيدلة") || facStr.includes("صيدلة")) {

      return "ص";

    }

    if ((facStr.includes("الطب والجراحة") || facStr.includes("كلية الطب")) && !facStr.includes("الأسنان") && !facStr.includes("البيطري") && !facStr.includes("تكنولوجيا")) {

      return "ط";

    }

    return "أ";

  }



  return t;

};



const formatHours = (hours) => {

  if (hours == null) return 0;

  return Number(parseFloat(hours).toFixed(2));

};



const formatLvl = (l) => {

  if (l === 0 || l === "0" || String(l).includes("عام")) return "المستوى العام";

  if (l === 1 || l === "1" || String(l).includes("أول") || String(l).includes("اول") || String(l).toLowerCase() === "first") return "المستوى الأول";

  if (l === 2 || l === "2" || String(l).includes("ثاني") || String(l).includes("ثانى") || String(l).toLowerCase() === "second") return "المستوى الثاني";

  if (l === 3 || l === "3" || String(l).includes("ثالث") || String(l).toLowerCase() === "third") return "المستوى الثالث";

  if (l === 4 || l === "4" || String(l).includes("رابع") || String(l).toLowerCase() === "fourth") return "المستوى الرابع";

  if (l === 5 || l === "5" || String(l).includes("خامس") || String(l).toLowerCase() === "fifth") return "المستوى الخامس";

  if (l === 6 || l === "6" || String(l).includes("سادس")) return "المستوى السادس";

  if (!l && l !== 0) return "–";

  return `المستوى ${l}`;

};



const getFilteredFids = (selectedProfs, searchTerm) => {

  let fidsSet = new Set();

  const matchingFacultiesExist = searchTerm 

    ? selectedProfs.some(p => p.faculties && p.faculties.some(f => f.name && f.name.toLowerCase().includes(searchTerm.trim().toLowerCase())))

    : false;



  selectedProfs.forEach(p => {

    if (p.faculties) {

      p.faculties.forEach(f => {

        if (matchingFacultiesExist && searchTerm) {

          if (f.name && f.name.toLowerCase().includes(searchTerm.trim().toLowerCase())) {

            fidsSet.add(f.id);

          }

        } else {

          fidsSet.add(f.id);

        }

      });

    }

  });

  return Array.from(fidsSet);

};



const ProfessorsPage = () => {

  const { user } = useContext(AuthContext);

  const [showPrintModal, setShowPrintModal] = useState(false);

  const [selectedRows, setSelectedRows] = useState([]); // لتخزين IDs الأعضاء المحددين للطباعة

  const [printSearchTerm, setPrintSearchTerm] = useState("");

  const [printIncompleteFilter, setPrintIncompleteFilter] = useState("");

  const [printFacultyFilter, setPrintFacultyFilter] = useState("الكل");

  const [printJobTitleFilter, setPrintJobTitleFilter] = useState("الكل");

  const [printContractFilter, setPrintContractFilter] = useState("الكل");

  const [searchTerm, setSearchTerm] = useState("");

  const [mainStatusFilter, setMainStatusFilter] = useState("الكل");

  const [pageLoading, setPageLoading] = useState(true);

  const customSelectStyles = {

    control: (base, state) => ({

      ...base,

      minHeight: '38px',

      borderRadius: '8px',

      borderColor: state.isFocused ? '#2e7d32' : '#ccc',

      boxShadow: state.isFocused ? '0 0 0 1px #2e7d32' : 'none',

      '&:hover': { borderColor: '#2e7d32' },

      fontSize: '0.9rem',

      direction: 'rtl',

      marginTop: '8px',

      marginBottom: '8px'

    }),

    menu: (base) => ({

      ...base,

      direction: 'rtl',

      zIndex: 99999,

      fontSize: '0.9rem'

    }),

    menuPortal: (base) => ({

      ...base,

      zIndex: 99999

    }),

    menuList: (base) => ({

      ...base,

      maxHeight: '320px'

    }),

    option: (base, state) => ({

      ...base,

      backgroundColor: state.isSelected ? '#2e7d32' : state.isFocused ? '#e8f5e9' : 'transparent',

      color: state.isSelected ? 'white' : '#333',

      cursor: 'pointer',

      textAlign: 'right'

    }),

    singleValue: (base) => ({

      ...base,

      textAlign: 'right',

      color: '#333'

    }),

    placeholder: (base) => ({

      ...base,

      textAlign: 'right',

      color: '#888'

    })

  };



  const inlineSelectStyles = {

    ...customSelectStyles,

    control: (base, state) => ({

      ...customSelectStyles.control(base, state),

      marginTop: 0,

      marginBottom: 0

    })

  };

  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;



  useEffect(() => {

    setCurrentPage(1);

  }, [searchTerm]);



  const [errors, setErrors] = useState({});

  const [professors, setProfessors] = useState([]);

  const [faculties, setFaculties] = useState([]);

  const [programs, setPrograms] = useState([]);

  const [courses, setCourses] = useState([]);

  const [profSignatures, setProfSignatures] = useState([]);

  const [showModal, setShowModal] = useState(false); // هذا هو تعريف الحالة المفقود

  const formatWeekCountText = (num) => {
    const n = Number(num);
    if (!n) return "";
    if (n === 1) return "أسبوع";
    if (n === 2) return "أسبوعان";
    if (n >= 3 && n <= 10) return `${n} أسابيع`;
    return `${n} أسبوع`;
  };

  const [modalMode, setModalMode] = useState('view'); // 'view', 'edit', 'add'

  const [selectedProfessorId, setSelectedProfessorId] = useState(null);

  const [formData, setFormData] = useState({

    name_ar: '', name_en: '', national_id: '', job_title: '', phone: '', original_workplace: '',

    contract_type: '', work_days: '', mnu_job_title: '',

    academic_year: '', semester1_weeks: '', semester2_weeks: '', summer_weeks: ''

  });



  const [selectedFaculties, setSelectedFaculties] = useState([]);

  const [professorAssignments, setProfessorAssignments] = useState([]);

  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

  const [exportAcademicYear, setExportAcademicYear] = useState('');

  const [academicYears, setAcademicYears] = useState([]);

  const [exportSemester, setExportSemester] = useState('الكل');

  const [exportLevel, setExportLevel] = useState('الكل');

  const [modalActiveYear, setModalActiveYear] = useState('');



  const [showImportModal, setShowImportModal] = useState(false);

  const [excelFile, setExcelFile] = useState(null);

  const [importing, setImporting] = useState(false);

  const [importResult, setImportResult] = useState(null);



  const getSemesterMultiplier = (semester, academicYearName = null, profOrProfId = null) => {

    if (!semester) return 14;

    const s = String(semester).trim();

    

    let targetYearObj = null;

    if (academicYearName && academicYearName !== "-" && academicYearName !== "الكل") {

      targetYearObj = academicYears.find(y => y.name === academicYearName);

    }

    if (!targetYearObj && exportAcademicYear && exportAcademicYear !== "الكل") {

      targetYearObj = academicYears.find(y => y.name === exportAcademicYear);

    }

    if (!targetYearObj && academicYears.length > 0) {

      targetYearObj = academicYears[0];

    }



    const yName = academicYearName || targetYearObj?.name;

    let targetProf = null;

    if (profOrProfId) {

      if (typeof profOrProfId === "object") targetProf = profOrProfId;

      else targetProf = professors.find(p => p.id === profOrProfId);

    }



    let customWeeksObj = null;

    if (targetProf) {

      let ayWeeks = targetProf.academic_year_weeks;

      if (typeof ayWeeks === "string") {

        try { ayWeeks = JSON.parse(ayWeeks); } catch (e) { ayWeeks = null; }

      }

      if (ayWeeks && yName && ayWeeks[yName]) {

        customWeeksObj = ayWeeks[yName];

      } else if (targetProf.academic_year === yName) {

        customWeeksObj = {

          semester1_weeks: targetProf.semester1_weeks,

          semester2_weeks: targetProf.semester2_weeks,

          summer_weeks: targetProf.summer_weeks

        };

      }

    }



    const sem1Weeks = (customWeeksObj?.semester1_weeks != null && customWeeksObj.semester1_weeks !== "")

      ? Number(customWeeksObj.semester1_weeks)

      : (targetYearObj?.semester1_weeks ?? 14);



    const sem2Weeks = (customWeeksObj?.semester2_weeks != null && customWeeksObj.semester2_weeks !== "")

      ? Number(customWeeksObj.semester2_weeks)

      : (targetYearObj?.semester2_weeks ?? 14);



    const summerWeeks = (customWeeksObj?.summer_weeks != null && customWeeksObj.summer_weeks !== "")

      ? Number(customWeeksObj.summer_weeks)

      : (targetYearObj?.summer_weeks ?? 7);



    if (s.includes("صيف") || s.includes("الصيفي") || s.toLowerCase().includes("summer") || s.includes("ثالث") || s.includes("3")) {

      return summerWeeks;

    }

    if (s.includes("ثاني") || s.includes("ثانى") || s.includes("2") || s.toLowerCase().includes("second")) {

      return sem2Weeks;

    }

    return sem1Weeks;

  };



  const getTermTotalHours = (hours, semester, academicYearName = null, profOrProfId = null) => {

    const h = Number(hours) || 0;

    return h * getSemesterMultiplier(semester, academicYearName, profOrProfId);

  };



  const handleDownloadTemplate = () => {

    const link = document.createElement("a");

    link.href = "/api/professors/template";

    link.setAttribute("download", "نموذج_استيراد_اعضاء_هيئة_التدريس.xlsx");

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };



  const handleImportExcel = async () => {

    if (!excelFile) {

      toast.error("يرجى اختيار ملف نموذج الإكسيل للاستيراد");

      return;

    }



    setImporting(true);

    setImportResult(null);



    const data = new FormData();

    data.append("file1", excelFile);



    try {

      const res = await axios.post("/api/professors/import", data, {

        headers: {

          "Content-Type": "multipart/form-data",

          "Authorization": `Bearer ${localStorage.getItem('token')}`

        }

      });



      if (res.data.success) {

        setImportResult({

          success: true,

          message: "تم معالجة الملف بنجاح!",

          imported: res.data.imported,

          updated: res.data.updated,

          total: res.data.total,

          errors: res.data.errors || [],

          updated_names: res.data.updated_names || [],

          imported_names: res.data.imported_names || []

        });

        fetchData();

      }

    } catch (err) {

      console.error(err);

      setImportResult({

        success: false,

        message: "فشل الاستيراد: " + (err.response?.data?.detail || "تأكد من صحة الملفات والأعمدة")

      });

    } finally {

      setImporting(false);

    }

  };



  const handleDelete = async (id) => {

    if (await confirmAction("هل أنت متأكد من حذف هذا العضو؟")) {

      try {

        await axios.delete(`/api/professors/${id}`);



        // إضافة رسالة التأكيد هنا

        toast.success("تم حذف بيانات العضو بنجاح");



        fetchData(); // تحديث الجدول

      } catch (err) {

        console.error(err);

        toast.error("حدث خطأ أثناء الحذف، يرجى المحاولة مرة أخرى");

      }

    }

  };



  const logAction = async (actionText, facultyIds = null, academicYear = null, semester = null) => {

    if (user) {

      try {

        // استخدام الفصل الدراسي والعام الجامعي من الخطة الدراسية (محفوظ في localStorage)

        const resolvedYear = academicYear || localStorage.getItem('studyplan_year') || null;

        const resolvedSemester = semester || localStorage.getItem('studyplan_semester') || null;

        await axios.post(`/api/notifications/log`, {

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

    }

  };







  const openModal = async (professor, mode) => {

    setErrors({});

    setModalMode(mode);



    setProfessorAssignments([]);

    if (mode === 'add' || !professor) {

      setSelectedProfessorId(null);

      const initialAyWeeks = {};
      academicYears.forEach(ay => {
        initialAyWeeks[ay.name] = {
          semester1_weeks: ay.semester1_weeks || 15,
          semester2_weeks: ay.semester2_weeks || 15,
          summer_weeks: ay.summer_weeks || 8
        };
      });

      const defaultAy = academicYears.length > 0 ? academicYears[0].name : "2026/2027";

      setFormData({

        name_ar: '', name_en: '', national_id: '', email: '', job_title: '', phone: '', original_workplace: '',

        contract_type: '', work_days: '', mnu_job_title: '',

        academic_year: defaultAy,

        semester1_weeks: initialAyWeeks[defaultAy]?.semester1_weeks ?? '',

        semester2_weeks: initialAyWeeks[defaultAy]?.semester2_weeks ?? '',

        summer_weeks: initialAyWeeks[defaultAy]?.summer_weeks ?? '',

        academic_year_weeks: initialAyWeeks

      });

      setSelectedFaculties([]);

      setSelectedAcademicYear(defaultAy);

      setModalActiveYear(defaultAy);

      setShowModal(true);

    } else {



      setSelectedProfessorId(professor.id);

      let parsedAyWeeks = {};
      if (professor.academic_year_weeks) {
        if (typeof professor.academic_year_weeks === "string") {
          try { parsedAyWeeks = JSON.parse(professor.academic_year_weeks); } catch (e) { parsedAyWeeks = {}; }
        } else if (typeof professor.academic_year_weeks === "object") {
          parsedAyWeeks = professor.academic_year_weeks;
        }
      }

      academicYears.forEach(ay => {
        if (!parsedAyWeeks[ay.name]) {
          if (professor.academic_year === ay.name && (professor.semester1_weeks || professor.semester2_weeks || professor.summer_weeks)) {
            parsedAyWeeks[ay.name] = {
              semester1_weeks: professor.semester1_weeks ?? ay.semester1_weeks ?? 15,
              semester2_weeks: professor.semester2_weeks ?? ay.semester2_weeks ?? 15,
              summer_weeks: professor.summer_weeks ?? ay.summer_weeks ?? 8
            };
          } else {
            parsedAyWeeks[ay.name] = {
              semester1_weeks: ay.semester1_weeks ?? 15,
              semester2_weeks: ay.semester2_weeks ?? 15,
              summer_weeks: ay.summer_weeks ?? 8
            };
          }
        }
      });

      const currentAy = professor.academic_year || (academicYears.length > 0 ? academicYears[0].name : "2026/2027");

      setFormData({

        name_ar: professor.name_ar,

        name_en: professor.name_en,

        national_id: professor.national_id,

        phone: professor.phone,

        email: professor.email || '',

        job_title: professor.job_title,

        original_workplace: professor.original_workplace,

        contract_type: professor.contract_type || '',

        work_days: professor.work_days || '',

        mnu_job_title: professor.mnu_job_title || '',

        academic_year: currentAy,

        semester1_weeks: parsedAyWeeks[currentAy]?.semester1_weeks ?? professor.semester1_weeks ?? '',

        semester2_weeks: parsedAyWeeks[currentAy]?.semester2_weeks ?? professor.semester2_weeks ?? '',

        summer_weeks: parsedAyWeeks[currentAy]?.summer_weeks ?? professor.summer_weeks ?? '',

        academic_year_weeks: parsedAyWeeks

      });

      setSelectedAcademicYear(currentAy);

      setModalActiveYear(currentAy);



      if (professor.faculties && professor.faculties.length > 0) {

        setSelectedFaculties(professor.faculties.map(f => ({ value: String(f.id), label: f.name })));

      } else {

        setSelectedFaculties([]);

      }

      

      setSelectedAcademicYear(professor.academic_year || (academicYears.length > 0 ? academicYears[0].name : ""));

      setShowModal(true);



      // Fetch assignments for this professor

      try {

        const res = await axios.get(`/api/professors/${professor.id}/assignments`);

        setProfessorAssignments(res.data);

      } catch (err) {

        console.error("خطأ في جلب تكليفات الدكتور:", err);

      }

    }

  };





  const fetchData = async () => {

    try {

      const [pRes, fRes, cRes, progRes, sRes, yearsRes] = await Promise.all([

        axios.get('/api/professors'),

        axios.get('/api/faculties'),

        axios.get('/api/courses'),

        axios.get('/api/programs'),

        axios.get('/api/signatures?report_type=أعضاء هيئة التدريس'),

        axios.get('/api/academic-years')

      ]);

      setProfessors(pRes.data);

      setFaculties(fRes.data);

      setCourses(cRes.data);

      setPrograms(progRes.data);

      setProfSignatures(sRes.data);

      

      const loadedYears = yearsRes.data;

      setAcademicYears(loadedYears);

      if (loadedYears.length > 0) {

        if (!exportAcademicYear) {

          setExportAcademicYear(loadedYears[0].name);

        }

      }

    } catch (err) {

      console.error("خطأ في جلب البيانات:", err);

    } finally {

      setPageLoading(false);

    }

  };



  const normalizeSignatureString = (str) => {

    if (!str) return "";

    return str.replace(/[أإآءؤئ]/g, 'ا')

              .replace(/ة/g, 'ه')

              .replace(/ي/g, 'ى')

              .replace(/[^ا-ي]/g, '') // Remove spaces and punctuation completely for exact matching

              .trim();

  };



  const getSignatureRank = (title) => {
    const t = (title || "").toLowerCase().trim();
    if (t.includes('رئيس الجامعة') && !t.includes('نائب')) return 100;
    if (t.includes('نائب رئيس الجامعة') || t.includes('نائب رئيس الجامعه') || t.includes('نائب')) return 90;
    if (t.includes('عميد')) return 50;
    if (t.includes('وكيل')) return 30;
    if (t.includes('مدير البرنامج') || t.includes('منسق') || t.includes('رئيس القسم') || t.includes('قسم')) return 10;
    return 20;
  };

  const renderProfSignaturesHTML = (fids) => {
    let facultySigs = [];
    if (Array.isArray(fids) && fids.length > 0) {
      facultySigs = profSignatures.filter(sig => !sig.faculty_id || fids.includes(parseInt(sig.faculty_id)));
    } else {
      facultySigs = [...profSignatures];
    }

    // ترتيب التوقيعات وفق التدرج الإداري و order_index (نائب رئيس الجامعة في النهاية)
    facultySigs.sort((a, b) => {
      const rankA = getSignatureRank(a.signature_title);
      const rankB = getSignatureRank(b.signature_title);
      if (rankA !== rankB) return rankA - rankB;
      const orderA = a.order_index ?? 0;
      const orderB = b.order_index ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.id ?? 0) - (b.id ?? 0);
    });

    // حذف التكرار مع الحفاظ على الترتيب الأصلي
    const uniqueSigs = [];
    const seen = new Set();
    facultySigs.forEach(sig => {
      const key = normalizeSignatureString(sig.signature_title) + "_" + normalizeSignatureString(sig.official_name);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSigs.push(sig);
      }
    });

    if (uniqueSigs.length === 0) return "";

    return `
      <div style="display: flex; justify-content: space-around; margin-top: 40px; margin-bottom: 20px; page-break-inside: avoid; flex-wrap: wrap;">
        ${uniqueSigs.map(sig => `
          <div style="text-align: center; min-width: 150px; margin: 10px;">
            <div style="font-size: 13px; font-weight: bold; color: #1b5e20; margin-bottom: 15px;">${sig.signature_title}</div>
            <div style="font-size: 13px; font-weight: bold; color: #333333;">${sig.official_name}</div>
          </div>
        `).join("")}
      </div>
    `;
  };

  const renderProfSignaturesExcelHTML = (fids, totalCols) => {
    let facultySigs = [];
    if (Array.isArray(fids) && fids.length > 0) {
      facultySigs = profSignatures.filter(sig => !sig.faculty_id || fids.includes(parseInt(sig.faculty_id)));
    } else {
      facultySigs = [...profSignatures];
    }

    // ترتيب التوقيعات وفق التدرج الإداري و order_index (نائب رئيس الجامعة في النهاية)
    facultySigs.sort((a, b) => {
      const rankA = getSignatureRank(a.signature_title);
      const rankB = getSignatureRank(b.signature_title);
      if (rankA !== rankB) return rankA - rankB;
      const orderA = a.order_index ?? 0;
      const orderB = b.order_index ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (a.id ?? 0) - (b.id ?? 0);
    });

    // حذف التكرار مع الحفاظ على الترتيب
    const uniqueSigs = [];
    const seen = new Set();
    facultySigs.forEach(sig => {
      const key = normalizeSignatureString(sig.signature_title) + "_" + normalizeSignatureString(sig.official_name);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSigs.push(sig);
      }
    });

    if (uniqueSigs.length === 0) return "";

    const sigCount = uniqueSigs.length;
    const spans = [];
    const baseSpan = Math.floor(totalCols / sigCount);
    let extra = totalCols % sigCount;
    for (let i = 0; i < sigCount; i++) {
      let s = baseSpan;
      if (extra > 0) {
        s += 1;
        extra -= 1;
      }
      spans.push(s);
    }

    let html = `
      <tr><td colspan="${totalCols}" style="border: none; height: 35px;"></td></tr>
      <tr>
        ${uniqueSigs.map((sig, idx) => `
          <td colspan="${spans[idx]}" style="border: none; text-align: center; vertical-align: middle; font-size: 13pt; font-weight: bold; color: #1b5e20;">
            ${sig.signature_title}
          </td>
        `).join("")}
      </tr>
      <tr>
        ${uniqueSigs.map((sig, idx) => `
          <td colspan="${spans[idx]}" style="border: none; text-align: center; vertical-align: middle; font-size: 13pt; font-weight: bold; color: #333333;">
            ${sig.official_name}
          </td>
        `).join("")}
      </tr>
    `;

    return html;
  };



  useEffect(() => { fetchData(); }, []);



  const handlePrintSelected = async () => {

    if (selectedRows.length === 0) {

      toast.error("يرجى اختيار عضو واحد على الأقل للطباعة");

      return;

    }

    const selectedProfs = professors.filter(p => selectedRows.includes(p.id));

    const currentSearchTerm = showPrintModal ? printSearchTerm : searchTerm;

    const fids = getFilteredFids(selectedProfs, currentSearchTerm);

    logAction(`قام بطباعة بيانات ${selectedRows.length} من أعضاء هيئة التدريس`, fids.length > 0 ? fids : null, exportAcademicYear);

    if (selectedProfs.length === 0) {

      toast.error("يرجى اختيار عضو واحد على الأقل للطباعة");

      return;

    }

    const printFacultyId = selectedProfs[0]?.faculties?.[0]?.id || (selectedFaculties && selectedFaculties[0] ? selectedFaculties[0].value : null);

    

    let assignmentsByProf = {};

    try {

      const res = await axios.post('/api/professors/export-assignments', {

        professor_ids: selectedProfs.map(p => p.id),

        academic_year: exportAcademicYear,

          semester: exportSemester !== 'الكل' ? exportSemester : undefined,

          level: exportLevel !== 'الكل' ? exportLevel : undefined

      });

      assignmentsByProf = res.data;

    } catch (err) {

      console.error(err);

      toast.error("حدث خطأ أثناء جلب التكليفات.");

      return;

    }



    const yearStr = (exportAcademicYear === "الكل" || !exportAcademicYear) ? "لجميع الأعوام الجامعية" : `للعام الجامعي ${exportAcademicYear}`;

    let semesterStr = "لجميع الفصول الدراسية";

    if (exportSemester === "أول") semesterStr = "للفصل الدراسي الأول";

    else if (exportSemester === "ثاني") semesterStr = "للفصل الدراسي الثاني";

    else if (exportSemester === "صيفي") semesterStr = "للفصل الدراسي الصيفي";



    let levelStr = exportLevel !== "الكل" ? `للمستوى ${exportLevel}` : "لجميع المستويات";



    // بناء جزء الدرجة العلمية في العنوان

    let jobTitlePart = "";

    if (printJobTitleFilter !== "الكل") {

      jobTitlePart = ` (${getFullJobTitle(printJobTitleFilter)})`;

    }



    // بناء جزء الكلية من فلتر الكلية أو البحث

    let facPart = "";

    if (printFacultyFilter !== "الكل") {

      const selFac = faculties.find(f => String(f.id) === String(printFacultyFilter));

      if (selFac) {

        const facName = selFac.name.startsWith("كلية") ? selFac.name : `كلية ${selFac.name}`;

        facPart = ` الخاص ب${facName}`;

      }

    } else {

      const activeSearchTerm = (printSearchTerm || "").trim() || (searchTerm || "").trim();

      if (activeSearchTerm) {

        const term = activeSearchTerm.toLowerCase();

        const matchedFac = faculties.find(f =>

          f.name.toLowerCase().includes(term) || term.includes(f.name.toLowerCase())

        );

        if (matchedFac) {

          const facName = matchedFac.name.startsWith("كلية") ? matchedFac.name : `كلية ${matchedFac.name}`;

          facPart = ` الخاص ب${facName}`;

        }

      }

    }



    // بناء جزء نوع التعاقد

    let contractPart = "";

    if (printContractFilter !== "الكل") {

      contractPart = ` - ${printContractFilter}`;

    }



    let documentTitle = `بيانات أعضاء هيئة التدريس${jobTitlePart}${facPart}${contractPart} ${levelStr} ${semesterStr} ${yearStr}`;



    const showJobTitleCol = (printJobTitleFilter === "الكل");



    let filterSubTitle = "";

    if (printIncompleteFilter) {

      let filterLabel = "";

      if (printIncompleteFilter === "phone") filterLabel = "رقم الهاتف";

      else if (printIncompleteFilter === "email") filterLabel = "البريد الإلكتروني";

      else if (printIncompleteFilter === "workplace") filterLabel = "جهة القدوم";

      else if (printIncompleteFilter === "job_title") filterLabel = "الدرجة العلمية";

      else if (printIncompleteFilter === "contract_type") filterLabel = "نوع التعاقد";

      else if (printIncompleteFilter === "faculty") filterLabel = "الكلية التابع لها";

      else if (printIncompleteFilter === "mnu_job_title") filterLabel = "طبيعة العمل داخل MNU";

      else if (printIncompleteFilter === "weeks") filterLabel = "أسابيع الحضور";

      filterSubTitle = `• بيانات غير مكتملة: ${filterLabel}`;

    }



    const printWindow = window.open("", "_blank");



    printWindow.document.write(`

      <html>

        <head>

          <title>${documentTitle}</title>

          <style>

            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

            @page { 

              size: landscape; 

              margin: 4mm; 

            }

            @media print {

              @page {

                size: landscape;

                margin: 4mm;

              }

              html, body {

                width: 100% !important;

                margin: 0 !important;

                padding: 0 !important;

                -webkit-print-color-adjust: exact !important;

                print-color-adjust: exact !important;

              }

              table {

                width: 100% !important;

                table-layout: fixed !important;

              }

            }

            body { 

              font-family: 'Cairo', sans-serif; 

              direction: rtl; 

              text-align: right; 

              padding: 2mm; 

              margin: 0;

              width: 100%;

              box-sizing: border-box;

            }

            h2 { text-align: center; margin-bottom: 15px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }

            th, td { border: 1px solid #777; padding: 2px 2px; text-align: center; font-size: 8pt; line-height: 1.15; word-wrap: break-word; overflow-wrap: break-word; }

            thead { display: table-header-group; }

            tr { page-break-inside: avoid; }

            th { background-color: #2e7d32 !important; color: white !important; font-weight: bold; font-size: 8.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

            td.prof-name { text-align: right; font-weight: bold; font-size: 8.5pt; }

            td.email-cell { word-break: break-all; font-size: 6.8pt; direction: ltr; text-align: left; }

            td.phone-cell { font-size: 7.5pt; direction: ltr; text-align: center; white-space: nowrap; }

            td.workplace-cell { font-size: 7.5pt; }

            td.course-cell { font-size: 8pt; text-align: right; font-weight: 500; }

          </style>

        </head>

        <body>

          <table>

            <thead>

              <tr style="border: none;">

                <th colspan="${showJobTitleCol ? 17 : 16}" style="border: none; background: white !important; color: black !important; padding-bottom: 15px;">

                  <div style="display: flex; align-items: center; justify-content: flex-start;">

                    <img 

                      src="${window.location.origin}${logo}" 

                      alt="جامعة المنوفية الأهلية" 

                      style="width: 75px; height: 75px; margin-left: 25px;" 

                    />

                    <div style="flex: 1; text-align: right;">

                      <h2 style="margin: 0; font-size: 16px; direction: rtl; color: black;">${documentTitle}</h2>

                      ${filterSubTitle ? `<h2 style="margin: 5px 0 0 0; font-size: 14px; direction: rtl; color: #d32f2f;">${filterSubTitle}</h2>` : ''}

                      <h3 style="margin: 4px 60px 0 0; font-size: 13px; font-weight: normal; color: #555;">جامعة المنوفية الأهلية</h3>

                    </div>

                  </div>

                </th>

              </tr>

              <tr>

                <th style="width: 2.2%;">م</th>

                <th style="width: ${showJobTitleCol ? '11.5%' : '14%'};">اسم عضو هيئة التدريس</th>

                ${showJobTitleCol ? '<th style="width: 5.5%;">الدرجة العلمية</th>' : ''}

                <th style="width: ${showJobTitleCol ? '5.8%' : '7.5%'};">طبيعة العمل بجامعة المنوفية الأهلية</th>

                <th style="width: ${showJobTitleCol ? '6.5%' : '7.5%'};">نوع التعاقد والأيام</th>

                <th style="width: ${showJobTitleCol ? '7.5%' : '8%'};">جهة القدوم</th>

                <th style="width: ${showJobTitleCol ? '6.5%' : '7%'};">رقم الهاتف</th>

                <th style="width: ${showJobTitleCol ? '7.5%' : '8%'};">الإيميل</th>

                <th style="width: ${showJobTitleCol ? '8%' : '8.5%'};">الكلية التابع لها</th>

                <th style="width: ${showJobTitleCol ? '8%' : '8.5%'};">اسم البرنامج</th>

                <th style="width: ${showJobTitleCol ? '10%' : '10.5%'};">المقررات المكلف بها</th>

                <th style="width: 3.8%;">ساعات التدريس<br/>كل اسبوع</th>

                <th style="width: 3.8%;">عدد أسابيع<br/>الفصل</th>

                <th style="width: 4.2%;">إجمالي الساعات<br/>في الترم للمقرر</th>

                <th style="width: 3.8%;">المستوى</th>

                <th style="width: 3.8%;">الفصل الدراسي</th>

                <th style="width: ${showJobTitleCol ? '4.5%' : '4.8%'};">العام الجامعي</th>

                <th style="width: ${showJobTitleCol ? '5%' : '5.5%'};">إجمالي ساعات تدريسه<br/>في العام الجامعي</th>

              </tr>

            </thead>

            <tbody>

              ${selectedProfs.map((p, index) => {

      const formatLvl = (l) => {

        if (l === 0 || l === "0" || String(l).includes("عام")) return "العام";

        if (l === 1 || l === "1" || String(l).includes("أول") || String(l).includes("اول")) return "المستوى الأول";

        if (l === 2 || l === "2" || String(l).includes("ثاني") || String(l).includes("ثانى")) return "المستوى الثاني";

        if (l === 3 || l === "3" || String(l).includes("ثالث")) return "المستوى الثالث";

        if (l === 4 || l === "4" || String(l).includes("رابع")) return "المستوى الرابع";

        if (l === 5 || l === "5" || String(l).includes("خامس")) return "المستوى الخامس";

        if (l === 6 || l === "6" || String(l).includes("سادس")) return "المستوى السادس";

        return `المستوى ${l}`;

      };



      const assignments = assignmentsByProf[p.id] || [];

      const yearBlocks = [];



      if (assignments.length > 0) {

        const yearMap = {};

        assignments.forEach(a => {

          const yName = a.academic_year || (exportAcademicYear !== "الكل" ? exportAcademicYear : "-");

          if (!yearMap[yName]) yearMap[yName] = { list: [], totalHours: 0 };

          yearMap[yName].list.push(a);

          yearMap[yName].totalHours += getTermTotalHours(a.hours, a.course_semester, yName, p);

        });



        Object.keys(yearMap).forEach(yName => {

          const yData = yearMap[yName];

          const facMap = {};

          yData.list.forEach(a => {

            const fName = a.faculty_name || "كلية غير محددة";

            if (!facMap[fName]) facMap[fName] = { progs: [], courses: [], levels: [], hours: [], weeks: [], termHours: [], semesters: [] };

            facMap[fName].courses.push(a.course_name);

            facMap[fName].hours.push(formatHours(a.hours));

            const wCount = getSemesterMultiplier(a.course_semester, yName, p);

            facMap[fName].weeks.push(formatWeekCountText(wCount) || `${wCount} أسبوع`);

            facMap[fName].termHours.push(formatHours(getTermTotalHours(a.hours, a.course_semester, yName, p)));

            if (a.program_name && !facMap[fName].progs.includes(a.program_name)) facMap[fName].progs.push(a.program_name);

            const lvlName = formatLvl(a.level);

            if (lvlName && !facMap[fName].levels.includes(lvlName)) facMap[fName].levels.push(lvlName);

            const semName = a.course_semester || "-";

            if (semName && !facMap[fName].semesters.includes(semName)) facMap[fName].semesters.push(semName);

          });



          const facBlocks = [];

          Object.keys(facMap).forEach(fName => {

            facBlocks.push({

              facName: fName,

              progs: facMap[fName].progs.length > 0 ? facMap[fName].progs.join("<br/>") : "-",

              courses: facMap[fName].courses.length > 0 ? facMap[fName].courses.join("<br/>") : "-",

              hours: facMap[fName].hours.length > 0 ? facMap[fName].hours.join("<br/>") : "-",

              weeks: facMap[fName].weeks.length > 0 ? facMap[fName].weeks.join("<br/>") : "-",

              termHours: facMap[fName].termHours.length > 0 ? facMap[fName].termHours.join("<br/>") : "-",

              levels: facMap[fName].levels.length > 0 ? facMap[fName].levels.join("<br/>") : "-",

              semesters: facMap[fName].semesters.length > 0 ? facMap[fName].semesters.join("<br/>") : "-"

            });

          });



          yearBlocks.push({

            yearName: yName,

            totalHours: formatHours(yData.totalHours),

            facBlocks: facBlocks

          });

        });

      } else {

        yearBlocks.push({

          yearName: exportAcademicYear !== "الكل" ? exportAcademicYear : "-",

          totalHours: 0,

          facBlocks: [{

            facName: (p.faculties && p.faculties.length > 0) ? p.faculties.map(f => f.name).join(" - ") : "-", 

            progs: "-",

            courses: "-",

            hours: "-",

            weeks: (() => {
            const yName = exportAcademicYear !== "الكل" ? exportAcademicYear : (p.academic_year || (academicYears.length > 0 ? academicYears[0].name : "2024/2025"));
            const sem1 = getSemesterMultiplier("أول", yName, p);
            const sem2 = getSemesterMultiplier("ثاني", yName, p);
            const summer = getSemesterMultiplier("صيفي", yName, p);
            if (exportSemester === "أول") return formatWeekCountText(sem1) || `${sem1} أسبوع`;
            if (exportSemester === "ثاني") return formatWeekCountText(sem2) || `${sem2} أسبوع`;
            if (exportSemester === "صيفي") return formatWeekCountText(summer) || `${summer} أسبوع`;
            return `ف1: ${formatWeekCountText(sem1)}<br/>ف2: ${formatWeekCountText(sem2)}<br/>صيفي: ${formatWeekCountText(summer)}`;
          })(),

            termHours: "-",

            levels: "-",

            semesters: "-"

          }]

        });

      }



      const totalBlocks = yearBlocks.reduce((sum, yb) => sum + yb.facBlocks.length, 0);

      let isFirstRowOfProf = true;



      return yearBlocks.map((yb) => {

        const ybRowCount = yb.facBlocks.length;

        return yb.facBlocks.map((block, bIdx) => {

          let profCells = "";

          if (isFirstRowOfProf) {

            profCells = `

              <td rowspan="${totalBlocks}" style="white-space: nowrap;">${index + 1}</td>

              <td rowspan="${totalBlocks}" class="prof-name">${getProfAbbreviation(p)} / ${p.name_ar}</td>

              ${showJobTitleCol ? `<td rowspan="${totalBlocks}">${getFullJobTitle(p.job_title)}</td>` : ''}

              <td rowspan="${totalBlocks}">${p.mnu_job_title || "-"}</td>

              <td rowspan="${totalBlocks}" style="white-space: nowrap;">${p.contract_type ? `تعاقد ${p.contract_type} ${p.work_days && p.contract_type !== 'بالساعة' ? `- ${p.work_days}` : ''}` : "غير محدد"}</td>

              <td rowspan="${totalBlocks}" class="workplace-cell">${p.original_workplace || "-"}</td>

              <td rowspan="${totalBlocks}" style="direction: ltr; text-align: center; white-space: nowrap;">${p.phone || "-"}</td>

              <td rowspan="${totalBlocks}" class="email-cell">${p.email || "-"}</td>

            `;

            isFirstRowOfProf = false;

          }



          let yearCells = "";

          if (bIdx === 0) {

            yearCells = `

              <td rowspan="${ybRowCount}" style="white-space: nowrap; text-align: center;">${yb.yearName}</td>

              <td rowspan="${ybRowCount}" style="font-weight: bold; color: #2e7d32; white-space: nowrap; text-align: center;">${yb.totalHours} ساعة</td>

            `;

          }



          return `

            <tr>

              ${profCells}

              <td>${block.facName}</td>

              <td>${block.progs}</td>

              <td class="course-cell">${block.courses}</td>

              <td>${block.hours}</td>

              <td style="color: #2e7d32; font-weight: 600;">${block.weeks}</td>

              <td style="font-weight: bold; color: #1e40af;">${block.termHours}</td>

              <td>${block.levels}</td>

              <td style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; vertical-align: middle;">${block.semesters || "-"}</td>

              ${yearCells}

            </tr>

          `;

        }).join("");

      }).join("");

    }).join("")}

            </tbody>

            <tfoot>

              <tr style="border: none;">

                <td colspan="${showJobTitleCol ? 17 : 16}" style="border: none; padding-top: 30px;">

                  ${renderProfSignaturesHTML(fids)}

                </td>

              </tr>

            </tfoot>

          </table>

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





  const handleDownloadPDFSelected = async () => {

    if (selectedRows.length === 0) {

      toast.error("يرجى اختيار عضو واحد على الأقل للطباعة");

      return;

    }

    const selectedProfs = professors.filter(p => selectedRows.includes(p.id));

    const currentSearchTerm = showPrintModal ? printSearchTerm : searchTerm;

    const fids = getFilteredFids(selectedProfs, currentSearchTerm);

    logAction(`قام بتنزيل بيانات ${selectedRows.length} من أعضاء هيئة التدريس`, fids.length > 0 ? fids : null, exportAcademicYear);

    if (selectedProfs.length === 0) {

      toast.error("يرجى اختيار عضو واحد على الأقل للطباعة");

      return;

    }



    let assignmentsByProf = {};

    try {

      const res = await axios.post('/api/professors/export-assignments', {

        professor_ids: selectedProfs.map(p => p.id),

        academic_year: exportAcademicYear,

          semester: exportSemester !== 'الكل' ? exportSemester : undefined,

          level: exportLevel !== 'الكل' ? exportLevel : undefined

      });

      assignmentsByProf = res.data;

    } catch (err) {

      console.error(err);

      toast.error("حدث خطأ أثناء جلب التكليفات.");

      return;

    }



    const yearStr = (exportAcademicYear === "الكل" || !exportAcademicYear) ? "لجميع الأعوام الجامعية" : `للعام الجامعي ${exportAcademicYear}`;

    let semesterStr = "لجميع الفصول الدراسية";

    if (exportSemester === "أول") semesterStr = "للفصل الدراسي الأول";

    else if (exportSemester === "ثاني") semesterStr = "للفصل الدراسي الثاني";

    else if (exportSemester === "صيفي") semesterStr = "للفصل الدراسي الصيفي";



    let levelStr = exportLevel !== "الكل" ? `للمستوى ${exportLevel}` : "لجميع المستويات";



    // بناء جزء الدرجة العلمية في العنوان

    let jobTitlePart = "";

    if (printJobTitleFilter !== "الكل") {

      jobTitlePart = ` (${getFullJobTitle(printJobTitleFilter)})`;

    }



    // بناء جزء الكلية من فلتر الكلية أو البحث

    let facPart = "";

    if (printFacultyFilter !== "الكل") {

      const selFac = faculties.find(f => String(f.id) === String(printFacultyFilter));

      if (selFac) {

        const facName = selFac.name.startsWith("كلية") ? selFac.name : `كلية ${selFac.name}`;

        facPart = ` الخاص ب${facName}`;

      }

    } else {

      const activeSearchTerm = (printSearchTerm || "").trim() || (searchTerm || "").trim();

      if (activeSearchTerm) {

        const term = activeSearchTerm.toLowerCase();

        const matchedFac = faculties.find(f =>

          f.name.toLowerCase().includes(term) || term.includes(f.name.toLowerCase())

        );

        if (matchedFac) {

          const facName = matchedFac.name.startsWith("كلية") ? matchedFac.name : `كلية ${matchedFac.name}`;

          facPart = ` الخاص ب${facName}`;

        }

      }

    }



    // بناء جزء نوع التعاقد

    let contractPart = "";

    if (printContractFilter !== "الكل") {

      contractPart = ` - ${printContractFilter}`;

    }



    let documentTitle = `بيانات أعضاء هيئة التدريس${jobTitlePart}${facPart}${contractPart} ${levelStr} ${semesterStr} ${yearStr}`;



    const showJobTitleCol = (printJobTitleFilter === "الكل");



    let filterSubTitle = "";

    if (printIncompleteFilter) {

      let filterLabel = "";

      if (printIncompleteFilter === "phone") filterLabel = "رقم الهاتف";

      else if (printIncompleteFilter === "email") filterLabel = "البريد الإلكتروني";

      else if (printIncompleteFilter === "workplace") filterLabel = "جهة القدوم";

      else if (printIncompleteFilter === "job_title") filterLabel = "الدرجة العلمية";

      else if (printIncompleteFilter === "contract_type") filterLabel = "نوع التعاقد";

      else if (printIncompleteFilter === "faculty") filterLabel = "الكلية التابع لها";

      else if (printIncompleteFilter === "mnu_job_title") filterLabel = "طبيعة العمل داخل MNU";

      else if (printIncompleteFilter === "weeks") filterLabel = "أسابيع الحضور";

      filterSubTitle = `• بيانات غير مكتملة: ${filterLabel}`;

    }



    const container = document.createElement("div");

    container.style.direction = "rtl";

    container.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, sans-serif";

    container.style.padding = "5px";

    container.style.color = "#333";



    const MAX_BLOCKS_PER_PAGE = 15;

    let currentBlocksCount = 0;

    let currentRowsHtml = "";

    const pagesHtml = [];



    const profsData = selectedProfs.map((p, index) => {

      const formatLvl = (l) => {

        if (l === 0 || l === "0" || String(l).includes("عام")) return "العام";

        if (l === 1 || l === "1" || String(l).includes("أول") || String(l).includes("اول")) return "المستوى الأول";

        if (l === 2 || l === "2" || String(l).includes("ثاني") || String(l).includes("ثانى")) return "المستوى الثاني";

        if (l === 3 || l === "3" || String(l).includes("ثالث")) return "المستوى الثالث";

        if (l === 4 || l === "4" || String(l).includes("رابع")) return "المستوى الرابع";

        if (l === 5 || l === "5" || String(l).includes("خامس")) return "المستوى الخامس";

        if (l === 6 || l === "6" || String(l).includes("سادس")) return "المستوى السادس";

        return `المستوى ${l}`;

      };



      const assignments = assignmentsByProf[p.id] || [];

      const yearBlocks = [];



      if (assignments.length > 0) {

        const yearMap = {};

        assignments.forEach(a => {

          const yName = a.academic_year || (exportAcademicYear !== "الكل" ? exportAcademicYear : "-");

          if (!yearMap[yName]) yearMap[yName] = { list: [], totalHours: 0 };

          yearMap[yName].list.push(a);

          yearMap[yName].totalHours += getTermTotalHours(a.hours, a.course_semester, yName);

        });



        Object.keys(yearMap).forEach(yName => {

          const yData = yearMap[yName];

          const facMap = {};

          yData.list.forEach(a => {

            const fName = a.faculty_name || "كلية غير محددة";

            if (!facMap[fName]) facMap[fName] = { progs: [], courses: [], levels: [], hours: [], termHours: [], semesters: [] };

            facMap[fName].courses.push(a.course_name);

            facMap[fName].hours.push(formatHours(a.hours));

            facMap[fName].termHours.push(formatHours(getTermTotalHours(a.hours, a.course_semester, yName)));

            if (a.program_name && !facMap[fName].progs.includes(a.program_name)) facMap[fName].progs.push(a.program_name);

            const lvlName = formatLvl(a.level);

            if (lvlName && !facMap[fName].levels.includes(lvlName)) facMap[fName].levels.push(lvlName);

            const semName = a.course_semester || "-";

            if (semName && !facMap[fName].semesters.includes(semName)) facMap[fName].semesters.push(semName);

          });



          const facBlocks = [];

          Object.keys(facMap).forEach(fName => {

            facBlocks.push({

              facName: fName,

              progs: facMap[fName].progs.length > 0 ? facMap[fName].progs.join("<br/>") : "-",

              courses: facMap[fName].courses.length > 0 ? facMap[fName].courses.join("<br/>") : "-",

              hours: facMap[fName].hours.length > 0 ? facMap[fName].hours.join("<br/>") : "-",

              termHours: facMap[fName].termHours.length > 0 ? facMap[fName].termHours.join("<br/>") : "-",

              levels: facMap[fName].levels.length > 0 ? facMap[fName].levels.join("<br/>") : "-",

              semesters: facMap[fName].semesters.length > 0 ? facMap[fName].semesters.join("<br/>") : "-"

            });

          });



          yearBlocks.push({

            yearName: yName,

            totalHours: formatHours(yData.totalHours),

            facBlocks: facBlocks

          });

        });

      } else {

        yearBlocks.push({

          yearName: exportAcademicYear !== "الكل" ? exportAcademicYear : "-",

          totalHours: 0,

          facBlocks: [{

            facName: "-", progs: "-", courses: "-", hours: "-", termHours: "-", levels: "-", semesters: "-"

          }]

        });

      }



      const totalBlocks = yearBlocks.reduce((sum, yb) => sum + yb.facBlocks.length, 0);

      let isFirstRowOfProf = true;



      const html = yearBlocks.map((yb) => {

        const ybRowCount = yb.facBlocks.length;

        return yb.facBlocks.map((block, bIdx) => {

          let profCells = "";

          if (isFirstRowOfProf) {

            profCells = `

              <td rowspan="${totalBlocks}" style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px;">${index + 1}</td>

              <td rowspan="${totalBlocks}" style="border: 1px solid #777; padding: 5px 2px; text-align: right; font-size: 11px; font-weight: bold;">${getProfAbbreviation(p)} / ${p.name_ar}</td>

              ${showJobTitleCol ? `<td rowspan="${totalBlocks}" style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px;">${getFullJobTitle(p.job_title)}</td>` : ''}

              <td rowspan="${totalBlocks}" style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px;">${p.mnu_job_title || "-"}</td>

              <td rowspan="${totalBlocks}" style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; white-space: nowrap;">${p.contract_type ? `تعاقد ${p.contract_type} ${p.work_days && p.contract_type !== 'بالساعة' ? `- ${p.work_days}` : ''}` : "غير محدد"}</td>

              <td rowspan="${totalBlocks}" style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px;">${p.original_workplace || "-"}</td>

              <td rowspan="${totalBlocks}" style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; direction: ltr;">${p.phone || "-"}</td>

              <td rowspan="${totalBlocks}" style="border: 1px solid #777; padding: 5px 2px; text-align: left; font-size: 11px; word-break: break-all; direction: ltr;">${p.email || "-"}</td>

            `;

            isFirstRowOfProf = false;

          }



          let yearCells = "";

          if (bIdx === 0) {

            yearCells = `

              <td rowspan="${ybRowCount}" style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; white-space: nowrap;">${yb.yearName}</td>

              <td rowspan="${ybRowCount}" style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; font-weight: bold; color: #2e7d32; white-space: nowrap;">${yb.totalHours} ساعة</td>

            `;

          }



          return `

            <tr>

              ${profCells}

              <td style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; vertical-align: middle;">${block.facName}</td>

              <td style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; vertical-align: middle;">${block.progs}</td>

              <td style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; vertical-align: middle;">${block.courses}</td>

              <td style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; vertical-align: middle;">${block.hours}</td>

              <td style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; vertical-align: middle; font-weight: bold; color: #1e40af;">${block.termHours}</td>

              <td style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; vertical-align: middle;">${block.levels}</td>

              <td style="border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; vertical-align: middle;">${block.semesters || "-"}</td>

              ${yearCells}

            </tr>

          `;

        }).join("");

      }).join("");



      return { html, blockCount: totalBlocks };

    });



    profsData.forEach(prof => {

      if (currentBlocksCount + prof.blockCount > MAX_BLOCKS_PER_PAGE && currentBlocksCount > 0) {

        pagesHtml.push(currentRowsHtml);

        currentRowsHtml = "";

        currentBlocksCount = 0;

      }

      currentRowsHtml += prof.html;

      currentBlocksCount += prof.blockCount;

    });

    if (currentRowsHtml) {

      pagesHtml.push(currentRowsHtml);

    }



    const tableHeaderHtml = `

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: auto;">

        <thead>

          <tr style="background-color: #2e7d32; color: white;">

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 25px;">م</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: right; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; min-width: 100px;">اسم عضو هيئة التدريس</th>

            ${showJobTitleCol ? `<th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 50px;">الدرجة العلمية</th>` : ''}

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32;">طبيعة العمل بجامعة المنوفية الأهلية</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32;">نوع التعاقد والأيام</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32;">جهة القدوم</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 75px;">رقم الهاتف</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32;">الإيميل</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32;">الكلية</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32;">اسم البرنامج</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32;">المقررات المكلف بها</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 50px;">ساعات التدريس<br/>كل اسبوع</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 55px;">إجمالي الساعات<br/>في الترم للمقرر</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 55px;">المستوى</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 45px;">الفصل الدراسي</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 55px; white-space: nowrap;">العام الجامعي</th>

            <th style="border: 1px solid #777; padding: 6px 2px; text-align: center; font-size: 11px; font-weight: bold; color: white; background-color: #2e7d32; width: 65px;">إجمالي ساعات تدريسه<br/>في العام الجامعي</th>

          </tr>

        </thead>

        <tbody>

    `;



    const tableFooterHtml = `

        </tbody>

      </table>

    `;



    const getHeaderHtml = () => `

      <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 15px;">

        <img 

          src="${window.location.origin}${logo}" 

          alt="جامعة المنوفية الأهلية" 

          style="width: 70px; height: 70px; margin-left: 25px;" 

        />

        <div>

          <h2 style="margin: 0; font-size: 16px; direction: rtl; text-align: right;">${documentTitle}</h2>

          ${filterSubTitle ? `<h2 style="margin: 5px 0 0 0; font-size: 14px; direction: rtl; text-align: right; color: #d32f2f;">${filterSubTitle}</h2>` : ''}

          <h3 style="margin: 4px 0 0 0; font-size: 13px; font-weight: normal; color: #555;">جامعة المنوفية الأهلية</h3>

        </div>

      </div>

    `;



    container.innerHTML = `

      <style>

        thead { display: table-header-group; }

        tr { page-break-inside: avoid; }

        th, td { border: 1px solid #777; padding: 5px 2px; text-align: center; font-size: 11px; line-height: 1.2; }

      </style>

      ${pagesHtml.map((pageHtml, idx) => `

        ${idx > 0 ? '<div class="html2pdf__page-break"></div>' : ''}

        <div style="padding-top: 15px;">

          ${getHeaderHtml()}

          ${tableHeaderHtml}

          ${pageHtml}

          ${tableFooterHtml}

          <div style="margin-top: 30px;">

            ${renderProfSignaturesHTML(fids)}

          </div>

        </div>

      `).join("")}

    `;



    document.body.appendChild(container);



    const runHtml2Pdf = () => {

      setTimeout(() => {

        const opt = {

          margin:       [10, 5, 5, 5],

          filename:     `${documentTitle}.pdf`,

          image:        { type: 'jpeg', quality: 0.98 },

          html2canvas:  { scale: 2, useCORS: true },

          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },

          pagebreak:    { mode: ['css', 'legacy'] }

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





  const handlePrintSingle = () => {
    const fids = selectedFaculties.map(f => parseInt(f.value));
    const printFacultyId = fids[0];
    const profFacultiesStr = selectedFaculties && selectedFaculties.length > 0 
      ? selectedFaculties.map(f => f.label).join(" - ") 
      : ((formData.faculties && formData.faculties.length > 0) ? formData.faculties.map(f => f.name).join(" - ") : "-");
    logAction(`قام بطباعة بيانات عضو هيئة التدريس: ${formData.name_ar}`, fids.length > 0 ? fids : null, selectedAcademicYear);
    const printWindow = window.open("", "_blank");

    const filteredAssignments = professorAssignments.filter(a => a.academic_year === selectedAcademicYear);

    const jobTitleFull = getFullJobTitle(formData.job_title);

    printWindow.document.write(`
      <html>
        <head>
          <title>بيانات عضو هيئة التدريس - ${formData.name_ar}</title>
          <style>
            @page {
              size: portrait;
              margin: 10mm 10mm 15mm 10mm;
            }
            body { 
              font-family: 'Cairo', sans-serif; 
              direction: rtl; 
              text-align: right; 
              padding: 10px 10px 35px 10px; 
              margin: 0;
              width: 100%;
              color: #333; 
              box-sizing: border-box;
            }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2e7d32; padding-bottom: 15px; margin-bottom: 20px; }
            .header img { width: 85px; height: 85px; object-fit: contain; }
            .header-text h2 { margin: 0; font-size: 22px; color: #2e7d32; }
            .header-text h3 { margin: 4px 0 0 0; font-size: 15px; font-weight: normal; color: #555; }
            
            .section-title { font-size: 17px; color: #2e7d32; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; font-weight: bold; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 30px; width: 100%; }
            .info-item { display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #f0f0f0; padding-bottom: 6px; font-size: 13px; }
            .info-label { font-weight: bold; color: #2e7d32; flex-shrink: 0; }
            .info-value { color: #333; font-weight: 600; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 35px; border: 1px solid #777; table-layout: auto; }
            th, td { border: 1px solid #777; padding: 8px 6px; text-align: center; font-size: 12px; line-height: 1.3; }
            th { 
              background-color: #2e7d32 !important; 
              color: white !important; 
              font-weight: bold; 
              font-size: 12px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <table style="width: 100%; border: none;">
            <thead style="display: table-header-group;">
              <tr style="border: none;">
                <th style="border: none; padding-bottom: 15px; background: white !important;">
                  <div class="header" style="border-bottom: none; margin-bottom: 0;">
                    <div class="header-text">
                      <h2>بيانات عضو هيئة التدريس</h2>
                      <h3>جامعة المنوفية الأهلية</h3>
                    </div>
                    <img src="${window.location.origin}${logo}" alt="لوجو الجامعة" style="margin-left: 35px;" />
                  </div>
                  <div style="border-bottom: 2px solid #2e7d32; width: 100%; margin-top: 5px;"></div>
                </th>
              </tr>
            </thead>
            <tbody style="border: none;">
              <tr style="border: none;">
                <td style="border: none; padding: 0;">
          
          <div class="section-title">البيانات الشخصية والمهنية</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">الاسم</span>
              <span class="info-value">${formData.name_ar}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الرقم القومي</span>
              <span class="info-value">${formData.national_id || "-"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الدرجة العلمية</span>
              <span class="info-value">${jobTitleFull || "-"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الكليات التابع لها</span>
              <span class="info-value">${profFacultiesStr}</span>
            </div>
            <div class="info-item">
              <span class="info-label">طبيعة العمل بجامعة المنوفية الأهلية</span>
              <span class="info-value">${formData.mnu_job_title || "-"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">نوع التعاقد والأيام</span>
              <span class="info-value">${formData.contract_type ? `تعاقد ${formData.contract_type} ${formData.work_days && formData.contract_type !== 'بالساعة' ? `- ${formData.work_days}` : ''}` : "غير محدد"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">جهة القدوم</span>
              <span class="info-value">${formData.original_workplace || "-"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">رقم الهاتف</span>
              <span class="info-value">${formData.phone || "-"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الإيميل</span>
              <span class="info-value">${formData.email || "-"}</span>
            </div>
          </div>
          
          <div class="section-title">أسابيع حضور عضو هيئة التدريس لكل عام جامعي</div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt; text-align: center; border: 1px solid #1b5e20;">
            <thead>
              <tr style="background-color: #2e7d32; color: #ffffff;">
                <th style="border: 1px solid #1b5e20; padding: 8px 8px; font-weight: bold; background-color: #2e7d32 !important; color: #ffffff !important;">العام الجامعي</th>
                <th style="border: 1px solid #1b5e20; padding: 8px 8px; font-weight: bold; background-color: #2e7d32 !important; color: #ffffff !important;">الفصل الدراسي الأول</th>
                <th style="border: 1px solid #1b5e20; padding: 8px 8px; font-weight: bold; background-color: #2e7d32 !important; color: #ffffff !important;">الفصل الدراسي الثاني</th>
                <th style="border: 1px solid #1b5e20; padding: 8px 8px; font-weight: bold; background-color: #2e7d32 !important; color: #ffffff !important;">الفصل الصيفي</th>
              </tr>
            </thead>
            <tbody>
              ${academicYears.map(ay => {
                const yData = formData.academic_year_weeks?.[ay.name] || {};
                const sem1 = yData.semester1_weeks ? formatWeekCountText(yData.semester1_weeks) : formatWeekCountText(ay.semester1_weeks || 15);
                const sem2 = yData.semester2_weeks ? formatWeekCountText(yData.semester2_weeks) : formatWeekCountText(ay.semester2_weeks || 15);
                const sum = yData.summer_weeks ? formatWeekCountText(yData.summer_weeks) : formatWeekCountText(ay.summer_weeks || 8);
                return `
                  <tr>
                    <td style="border: 1px solid #1b5e20; padding: 6px 8px; font-weight: bold; color: #222; font-size: 10pt; background-color: #ffffff;">${ay.name}</td>
                    <td style="border: 1px solid #1b5e20; padding: 6px 8px; font-weight: normal; color: #222; font-size: 10pt; background-color: #ffffff;">${sem1}</td>
                    <td style="border: 1px solid #1b5e20; padding: 6px 8px; font-weight: normal; color: #222; font-size: 10pt; background-color: #ffffff;">${sem2}</td>
                    <td style="border: 1px solid #1b5e20; padding: 6px 8px; font-weight: normal; color: #222; font-size: 10pt; background-color: #ffffff;">${sum}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          

          ${(() => {

            const assignmentsByYear = professorAssignments.reduce((acc, curr) => {

              if (!acc[curr.academic_year]) acc[curr.academic_year] = [];

              acc[curr.academic_year].push(curr);

              return acc;

            }, {});



            const sortedYears = Object.keys(assignmentsByYear).sort().reverse();

            

            if (sortedYears.length === 0) {

              return `<div class="section-title">تكليفات جامعة المنوفية الأهلية</div>

                      <table><tr><td colspan="5">لا توجد تكليفات لعضو هيئة التدريس</td></tr></table>`;

            }



            let html = "";

            sortedYears.forEach(year => {

              html += `<div class="section-title">تكليف جامعة المنوفية الأهلية للعام الجامعي (${year})</div>

              <table>

                <thead>

                  <tr>

                    <th>الكلية</th>

                    <th>البرنامج</th>

                    <th>المقرر</th>

                    <th>المستوى</th>

                    <th>الفصل الدراسي</th>

                    <th>ساعات التدريس كل اسبوع</th>

                    <th>إجمالي الساعات في الترم للمقرر</th>

                  </tr>

                </thead>

                <tbody>`;

              

              const yearAssignments = assignmentsByYear[year];

              const facultySpans = [];

              let i = 0;

              while (i < yearAssignments.length) {

                const currentFac = yearAssignments[i].faculty_name;

                let count = 1;

                while (i + count < yearAssignments.length && yearAssignments[i + count].faculty_name === currentFac) {

                  count++;

                }

                facultySpans.push({ index: i, count: count, name: currentFac });

                i += count;

              }



              yearAssignments.forEach((a, idx) => {

                const spanObj = facultySpans.find(s => s.index === idx);

                const facTd = spanObj ? `<td rowspan="${spanObj.count}" style="vertical-align: middle; font-weight: bold;">${spanObj.name}</td>` : '';

                const termHours = getTermTotalHours(a.hours, a.course_semester, a.academic_year || year);

                html += `

                  <tr>

                    ${facTd}

                    <td>${(a.program_name || "").replace(/ - /g, "<br/>")}</td>

                    <td>${a.course_name}</td>

                    <td>${a.level}</td>

                    <td>${a.course_semester}</td>

                    <td>${formatHours(a.hours)}</td>

                    <td style="font-weight: bold; color: #1e40af;">${formatHours(termHours)}</td>

                  </tr>

                `;

              });



              const totalWeeklyHours = formatHours(assignmentsByYear[year].reduce((sum, current) => sum + (current.hours || 0), 0));

              const totalTermHours = formatHours(assignmentsByYear[year].reduce((sum, current) => sum + getTermTotalHours(current.hours, current.course_semester, current.academic_year || year), 0));

              html += `

                  <tr style="background-color: #e9ecef; font-weight: bold;">

                    <td colspan="5" style="text-align: center; color: #2e7d32;">إجمالي ساعات التدريس لهذا العام الجامعي</td>

                    <td style="text-align: center; color: #2e7d32;">${totalWeeklyHours} ساعة</td>

                    <td style="text-align: center; color: #1e40af;">${totalTermHours} ساعة</td>

                  </tr>

                </tbody>

              </table>`;

            });

            

            const grandTotalTerm = formatHours(professorAssignments.reduce((sum, curr) => sum + getTermTotalHours(curr.hours, curr.course_semester, curr.academic_year), 0));

            html += `

              <div style="margin-top: 15px; padding: 12px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; overflow: hidden;">

                <span style="font-size: 15px; font-weight: bold; color: #155724; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">إجمالي ساعات تدريس عضو هيئة التدريس في جامعة المنوفية الأهلية عبر السنين</span>

                <span style="font-size: 15px; font-weight: bold; color: #155724; white-space: nowrap; flex-shrink: 0; margin-right: 10px;">${grandTotalTerm} ساعة</span>

              </div>

            `;

            

            return html;

          })()}

                </td>

              </tr>

            </tbody>

            <tfoot style="display: table-footer-group;">

              <tr style="border: none;">

                <td style="border: none; padding-top: 30px;">

                  ${renderProfSignaturesHTML(fids)}

                </td>

              </tr>

            </tfoot>

          </table>



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

            }

          </script>

        </body>

      </html>

    `);

    printWindow.document.close();

  };



  const handleDownloadPDFSingle = () => {

    const fids = selectedFaculties.map(f => parseInt(f.value));

    logAction(`قام بتنزيل بيانات عضو هيئة التدريس: ${formData.name_ar}`, fids.length > 0 ? fids : null, selectedAcademicYear);

    const filteredAssignments = professorAssignments.filter(a => a.academic_year === selectedAcademicYear);





    const jobTitleFull = getFullJobTitle(formData.job_title);
    const profFacultiesStr = selectedFaculties && selectedFaculties.length > 0 
      ? selectedFaculties.map(f => f.label).join(" - ") 
      : ((formData.faculties && formData.faculties.length > 0) ? formData.faculties.map(f => f.name).join(" - ") : "-");

    const year = selectedAcademicYear;

    const container = document.createElement("div");
    container.style.direction = "rtl";
    container.style.fontFamily = "'Cairo', 'Segoe UI', Tahoma, sans-serif";
    container.style.padding = "10px 10px 35px 10px";
    container.style.color = "#333";

    container.innerHTML = `
      <style>
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2e7d32; padding-bottom: 15px; margin-bottom: 20px; }
        .header img { width: 85px; height: 85px; object-fit: contain; }
        .header-text h2 { margin: 0; font-size: 22px; color: #2e7d32; }
        .header-text h3 { margin: 4px 0 0 0; font-size: 15px; font-weight: normal; color: #555; }
        
        .section-title { font-size: 17px; color: #2e7d32; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; font-weight: bold; }
        
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 30px; width: 100%; }
        .info-item { display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #f0f0f0; padding-bottom: 6px; font-size: 13px; }
        .info-label { font-weight: bold; color: #2e7d32; flex-shrink: 0; }
        .info-value { color: #333; font-weight: 600; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 35px; border: 1px solid #777; table-layout: auto; }
        th, td { border: 1px solid #777; padding: 8px 6px; text-align: center; font-size: 12px; line-height: 1.3; }
        th { 
          background-color: #2e7d32; 
          color: white; 
          font-weight: bold; 
          text-align: center;
        }
      </style>
      <div class="header">
        <div class="header-text">
          <h2>بيانات عضو هيئة التدريس</h2>
          <h3>جامعة المنوفية الأهلية</h3>
        </div>
        <img src="${window.location.origin}${logo}" alt="جامعة المنوفية الأهلية" style="margin-left: 35px;" />
      </div>

      <div class="section-title">البيانات الشخصية والمهنية</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">الاسم</span>
          <span class="info-value">${formData.name_ar}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الرقم القومي</span>
          <span class="info-value">${formData.national_id || "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الدرجة العلمية</span>
          <span class="info-value">${jobTitleFull || "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الكليات التابع لها</span>
          <span class="info-value">${profFacultiesStr}</span>
        </div>
        <div class="info-item">
          <span class="info-label">طبيعة العمل بجامعة المنوفية الأهلية</span>
          <span class="info-value">${formData.mnu_job_title || "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">نوع التعاقد والأيام</span>
          <span class="info-value">${formData.contract_type ? `تعاقد ${formData.contract_type} ${formData.work_days && formData.contract_type !== 'بالساعة' ? `- ${formData.work_days}` : ''}` : "غير محدد"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">جهة القدوم</span>
          <span class="info-value">${formData.original_workplace || "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">رقم الهاتف</span>
          <span class="info-value">${formData.phone || "-"}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الإيميل</span>
          <span class="info-value">${formData.email || "-"}</span>
        </div>
      </div>



      <div class="section-title">أسابيع حضور عضو هيئة التدريس لكل عام جامعي</div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt; text-align: center; border: 1px solid #1b5e20;">

        <thead>

          <tr style="background-color: #2e7d32; color: #ffffff;">

            <th style="border: 1px solid #1b5e20; padding: 8px 8px; font-weight: bold; background-color: #2e7d32 !important; color: #ffffff !important;">العام الجامعي</th>

            <th style="border: 1px solid #1b5e20; padding: 8px 8px; font-weight: bold; background-color: #2e7d32 !important; color: #ffffff !important;">الفصل الدراسي الأول</th>

            <th style="border: 1px solid #1b5e20; padding: 8px 8px; font-weight: bold; background-color: #2e7d32 !important; color: #ffffff !important;">الفصل الدراسي الثاني</th>

            <th style="border: 1px solid #1b5e20; padding: 8px 8px; font-weight: bold; background-color: #2e7d32 !important; color: #ffffff !important;">الفصل الصيفي</th>

          </tr>

        </thead>

        <tbody>

          ${academicYears.map(ay => {

            const yData = formData.academic_year_weeks?.[ay.name] || {};

            const sem1 = yData.semester1_weeks ? formatWeekCountText(yData.semester1_weeks) : formatWeekCountText(ay.semester1_weeks || 15);

            const sem2 = yData.semester2_weeks ? formatWeekCountText(yData.semester2_weeks) : formatWeekCountText(ay.semester2_weeks || 15);

            const sum = yData.summer_weeks ? formatWeekCountText(yData.summer_weeks) : formatWeekCountText(ay.summer_weeks || 8);

            return `

              <tr>

                <td style="border: 1px solid #1b5e20; padding: 6px 8px; font-weight: bold; color: #222; font-size: 10pt; background-color: #ffffff;">${ay.name}</td>

                <td style="border: 1px solid #1b5e20; padding: 6px 8px; font-weight: normal; color: #222; font-size: 10pt; background-color: #ffffff;">${sem1}</td>

                <td style="border: 1px solid #1b5e20; padding: 6px 8px; font-weight: normal; color: #222; font-size: 10pt; background-color: #ffffff;">${sem2}</td>

                <td style="border: 1px solid #1b5e20; padding: 6px 8px; font-weight: normal; color: #222; font-size: 10pt; background-color: #ffffff;">${sum}</td>

              </tr>

            `;

          }).join('')}

        </tbody>

      </table>



      ${(() => {

            const assignmentsByYear = professorAssignments.reduce((acc, curr) => {

              if (!acc[curr.academic_year]) acc[curr.academic_year] = [];

              acc[curr.academic_year].push(curr);

              return acc;

            }, {});



            const sortedYears = Object.keys(assignmentsByYear).sort().reverse();

            

            if (sortedYears.length === 0) {

              return `<div class="section-title">تكليفات جامعة المنوفية الأهلية</div>

                      <table><tr><td colspan="5">لا توجد تكليفات لعضو هيئة التدريس</td></tr></table>`;

            }



            let html = "";

            sortedYears.forEach(year => {

              html += `<div class="section-title">تكليف جامعة المنوفية الأهلية للعام الجامعي (${year})</div>

              <table>

                <thead>

                  <tr>

                    <th>الكلية</th>

                    <th>البرنامج</th>

                    <th>المقرر</th>

                    <th>المستوى</th>

                    <th>الفصل الدراسي</th>

                    <th>ساعات التدريس كل اسبوع</th>

                    <th>إجمالي الساعات في الترم للمقرر</th>

                  </tr>

                </thead>

                <tbody>`;

              

              const yearAssignments = assignmentsByYear[year];

              const facultySpans = [];

              let i = 0;

              while (i < yearAssignments.length) {

                const currentFac = yearAssignments[i].faculty_name;

                let count = 1;

                while (i + count < yearAssignments.length && yearAssignments[i + count].faculty_name === currentFac) {

                  count++;

                }

                facultySpans.push({ index: i, count: count, name: currentFac });

                i += count;

              }



              yearAssignments.forEach((a, idx) => {

                const spanObj = facultySpans.find(s => s.index === idx);

                const facTd = spanObj ? `<td rowspan="${spanObj.count}" style="vertical-align: middle; font-weight: bold;">${spanObj.name}</td>` : '';

                const termHours = getTermTotalHours(a.hours, a.course_semester, a.academic_year || year);

                html += `

                  <tr>

                    ${facTd}

                    <td>${(a.program_name || "").replace(/ - /g, "<br/>")}</td>

                    <td>${a.course_name}</td>

                    <td>${a.level}</td>

                    <td>${a.course_semester}</td>

                    <td>${formatHours(a.hours)}</td>

                    <td style="font-weight: bold; color: #1e40af;">${formatHours(termHours)}</td>

                  </tr>

                `;

              });



              const totalWeeklyHours = formatHours(assignmentsByYear[year].reduce((sum, current) => sum + (current.hours || 0), 0));

              const totalTermHours = formatHours(assignmentsByYear[year].reduce((sum, current) => sum + getTermTotalHours(current.hours, current.course_semester, current.academic_year || year), 0));

              html += `

                  <tr style="background-color: #e9ecef; font-weight: bold;">

                    <td colspan="5" style="text-align: center; color: #2e7d32;">إجمالي ساعات التدريس لهذا العام الجامعي</td>

                    <td style="text-align: center; color: #2e7d32;">${totalWeeklyHours} ساعة</td>

                    <td style="text-align: center; color: #1e40af;">${totalTermHours} ساعة</td>

                  </tr>

                </tbody>

              </table>`;

            });

            

            const grandTotalTerm = formatHours(professorAssignments.reduce((sum, curr) => sum + getTermTotalHours(curr.hours, curr.course_semester, curr.academic_year), 0));

            html += `

              <div style="margin-top: 15px; padding: 12px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; overflow: hidden;">

                <span style="font-size: 15px; font-weight: bold; color: #155724; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">إجمالي ساعات تدريس عضو هيئة التدريس في جامعة المنوفية الأهلية عبر السنين</span>

                <span style="font-size: 15px; font-weight: bold; color: #155724; white-space: nowrap; flex-shrink: 0; margin-right: 10px;">${grandTotalTerm} ساعة</span>

              </div>

            `;

            

            return html;

          })()}

    `;



    document.body.appendChild(container);



    const runHtml2Pdf = () => {

      setTimeout(() => {

        const opt = {

          margin:       15,

          filename:     `بيانات_عضو_هيئة_التدريس_${formData.name_ar.replace(/\\s+/g, "_")}.pdf`,

          image:        { type: 'jpeg', quality: 0.98 },

          html2canvas:  { scale: 2, useCORS: true },

          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }

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



  const handleExportExcel = async () => {
    const selectedProfs = professors.filter(p => selectedRows.includes(p.id));
    if (selectedProfs.length === 0) {
      toast.error("يرجى اختيار عضو واحد على الأقل للتصدير");
      return;
    }
    const currentSearchTerm = showPrintModal ? printSearchTerm : searchTerm;
    const fids = getFilteredFids(selectedProfs, currentSearchTerm);
    logAction(`قام بتصدير إكسيل لبيانات ${selectedRows.length} من أعضاء هيئة التدريس`, fids.length > 0 ? fids : null, exportAcademicYear);

    let assignmentsByProf = {};
    try {
      const res = await axios.post('/api/professors/export-assignments', {
        professor_ids: selectedProfs.map(p => p.id),
        academic_year: exportAcademicYear,
        semester: exportSemester !== 'الكل' ? exportSemester : undefined,
        level: exportLevel !== 'الكل' ? exportLevel : undefined
      });
      assignmentsByProf = res.data;
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء جلب التكليفات.");
      return;
    }

    const yearStr = (exportAcademicYear === "الكل" || !exportAcademicYear) ? "لجميع الأعوام الجامعية" : `للعام الجامعي ${exportAcademicYear}`;
    let semesterStr = "لجميع الفصول الدراسية";
    if (exportSemester === "أول") semesterStr = "للفصل الدراسي الأول";
    else if (exportSemester === "ثاني") semesterStr = "للفصل الدراسي الثاني";
    else if (exportSemester === "صيفي") semesterStr = "للفصل الدراسي الصيفي";

    let levelStr = exportLevel !== "الكل" ? `للمستوى ${exportLevel}` : "لجميع المستويات";

    let jobTitlePart = "";
    if (printJobTitleFilter !== "الكل") {
      jobTitlePart = ` (${getFullJobTitle(printJobTitleFilter)})`;
    }

    let facPart = "";
    if (printFacultyFilter !== "الكل") {
      const selFac = faculties.find(f => String(f.id) === String(printFacultyFilter));
      if (selFac) {
        const facName = selFac.name.startsWith("كلية") ? selFac.name : `كلية ${selFac.name}`;
        facPart = ` الخاص ب${facName}`;
      }
    } else {
      const activeSearchTerm = (printSearchTerm || "").trim() || (searchTerm || "").trim();
      if (activeSearchTerm) {
        const term = activeSearchTerm.toLowerCase();
        const matchedFac = faculties.find(f =>
          f.name.toLowerCase().includes(term) || term.includes(f.name.toLowerCase())
        );
        if (matchedFac) {
          const facName = matchedFac.name.startsWith("كلية") ? matchedFac.name : `كلية ${matchedFac.name}`;
          facPart = ` الخاص ب${facName}`;
        }
      }
    }

    let contractPart = "";
    if (printContractFilter !== "الكل") {
      contractPart = ` - ${printContractFilter}`;
    }

    let documentTitle = `بيانات أعضاء هيئة التدريس${jobTitlePart}${facPart}${contractPart} ${levelStr} ${semesterStr} ${yearStr}`;

    // الدرجة العلمية: يظهر فقط إذا لم يتم فلترة درجة معينة
    const showJobTitleCol = (printJobTitleFilter === "الكل");

    let filterSubTitle = "";
    if (printIncompleteFilter) {
      let filterLabel = "";
      if (printIncompleteFilter === "phone") filterLabel = "رقم الهاتف";
      else if (printIncompleteFilter === "email") filterLabel = "البريد الإلكتروني";
      else if (printIncompleteFilter === "workplace") filterLabel = "جهة القدوم";
      else if (printIncompleteFilter === "job_title") filterLabel = "الدرجة العلمية";
      else if (printIncompleteFilter === "contract_type") filterLabel = "نوع التعاقد";
      else if (printIncompleteFilter === "faculty") filterLabel = "الكلية التابع لها";
      else if (printIncompleteFilter === "mnu_job_title") filterLabel = "طبيعة العمل داخل MNU";
      else if (printIncompleteFilter === "weeks") filterLabel = "أسابيع الحضور";
      filterSubTitle = `• بيانات غير مكتملة: ${filterLabel}`;
    }

    const headers = [
      "م", "اسم عضو هيئة التدريس",
      ...(showJobTitleCol ? ["الدرجة العلمية"] : []),
      "طبيعة العمل بجامعة المنوفية الأهلية",
      "نوع التعاقد والأيام",
      "جهة القدوم",
      "رقم الهاتف", "البريد الإلكتروني",
      "الكلية التابع لها", "اسم البرنامج", "المقررات المكلف بها", "ساعات التدريس كل اسبوع", "إجمالي الساعات في الترم للمقرر", "المستوى", "الفصل الدراسي",
      "العام الجامعي", "عدد أسابيع حضور الأستاذ", "إجمالي ساعات تدريسه في العام الجامعي"
    ];

    const hasSpecificFilter = (exportSemester !== "الكل") || (exportLevel !== "الكل");
    const profsToExport = hasSpecificFilter 
      ? selectedProfs.filter(p => (assignmentsByProf[p.id] || []).length > 0)
      : selectedProfs;

    if (profsToExport.length === 0) {
      toast.warning("لا توجد تكليفات دراسية مطابقة للفلاتر المحددة للأعضاء المختارين");
      return;
    }

    let excelRowsHtml = "";
    profsToExport.forEach((p, index) => {
      const assignments = assignmentsByProf[p.id] || [];
      const yearGroups = [];

      if (assignments.length > 0) {
        const yearMap = {};
        assignments.forEach(a => {
          const yName = a.academic_year || (exportAcademicYear !== "الكل" ? exportAcademicYear : "-");
          if (!yearMap[yName]) yearMap[yName] = { list: [], totalHours: 0 };
          yearMap[yName].list.push(a);
          yearMap[yName].totalHours += getTermTotalHours(a.hours, a.course_semester, yName, p);
        });
        Object.keys(yearMap).forEach(yName => {
          yearGroups.push({
            yearName: yName,
            totalHours: formatHours(yearMap[yName].totalHours),
            list: yearMap[yName].list
          });
        });
      } else {
        yearGroups.push({
          yearName: exportAcademicYear !== "الكل" ? exportAcademicYear : "-",
          totalHours: 0,
          list: []
        });
      }

      const profTotalRowCount = yearGroups.reduce((sum, yg) => sum + (yg.list.length > 0 ? yg.list.length : 1), 0);
      let isFirstRowOfProf = true;
      yearGroups.forEach(yg => {
        const ygRowCount = yg.list.length > 0 ? yg.list.length : 1;
        const yName = yg.yearName !== "-" ? yg.yearName : (exportAcademicYear !== "الكل" ? exportAcademicYear : (p.academic_year || (academicYears.length > 0 ? academicYears[0].name : "2026/2027")));
        const sem1 = getSemesterMultiplier("أول", yName, p);
        const sem2 = getSemesterMultiplier("ثاني", yName, p);
        const summer = getSemesterMultiplier("صيفي", yName, p);
        const attendanceWeeksText = `أول: ${formatWeekCountText(sem1)} - ثاني: ${formatWeekCountText(sem2)} - صيفي: ${formatWeekCountText(summer)}`;

        for (let i = 0; i < ygRowCount; i++) {
          excelRowsHtml += "<tr>";
          if (isFirstRowOfProf) {
            excelRowsHtml += `<td rowspan="${profTotalRowCount}" style="text-align: center; vertical-align: middle;">${index + 1}</td>`;
            excelRowsHtml += `<td rowspan="${profTotalRowCount}" style="text-align: right; font-weight: bold; vertical-align: middle;">${getProfAbbreviation(p)} / ${p.name_ar}</td>`;
            if (showJobTitleCol) {
              excelRowsHtml += `<td rowspan="${profTotalRowCount}" style="text-align: center; vertical-align: middle;">${getFullJobTitle(p.job_title)}</td>`;
            }
            excelRowsHtml += `<td rowspan="${profTotalRowCount}" style="text-align: center; vertical-align: middle;">${p.mnu_job_title || "-"}</td>`;
            excelRowsHtml += `<td rowspan="${profTotalRowCount}" style="text-align: center; vertical-align: middle; white-space: nowrap;">${p.contract_type ? `تعاقد ${p.contract_type} ${p.work_days && p.contract_type !== 'بالساعة' ? `- ${p.work_days}` : ''}` : "غير محدد"}</td>`;
            excelRowsHtml += `<td rowspan="${profTotalRowCount}" style="text-align: center; vertical-align: middle;">${p.original_workplace || "-"}</td>`;
            excelRowsHtml += `<td rowspan="${profTotalRowCount}" style="text-align: center; direction: ltr; vertical-align: middle;">${p.phone || "-"}</td>`;
            excelRowsHtml += `<td rowspan="${profTotalRowCount}" style="text-align: left; vertical-align: middle;">${p.email || "-"}</td>`;
            isFirstRowOfProf = false;
          }

          if (yg.list.length > 0) {
            const a = yg.list[i];
            excelRowsHtml += `<td style="text-align: center; vertical-align: middle;">${a.faculty_name || ""}</td>`;
            excelRowsHtml += `<td style="text-align: center; vertical-align: middle;">${a.program_name || ""}</td>`;
            excelRowsHtml += `<td style="text-align: right; vertical-align: middle;">${a.course_name || ""}</td>`;
            excelRowsHtml += `<td style="text-align: center; vertical-align: middle;">${formatHours(a.hours)}</td>`;
            excelRowsHtml += `<td style="text-align: center; font-weight: bold; color: #1e40af; vertical-align: middle;">${formatHours(getTermTotalHours(a.hours, a.course_semester, yg.yearName, p))}</td>`;
            excelRowsHtml += `<td style="text-align: center; vertical-align: middle;">${formatLvl(a.level) || ""}</td>`;
            excelRowsHtml += `<td style="text-align: center; vertical-align: middle;">${a.course_semester || ""}</td>`;
          } else {
            const profFacs = (p.faculties && p.faculties.length > 0) ? p.faculties.map(f => f.name).join(" - ") : "-";
            excelRowsHtml += `<td style="text-align: center; vertical-align: middle;">${profFacs}</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>`;
          }

          if (i === 0) {
            excelRowsHtml += `<td rowspan="${ygRowCount}" style="text-align: center; vertical-align: middle;">${yg.yearName}</td>`;
            excelRowsHtml += `<td rowspan="${ygRowCount}" style="text-align: center; vertical-align: middle; white-space: nowrap; font-size: 16px;">${attendanceWeeksText}</td>`;
            excelRowsHtml += `<td rowspan="${ygRowCount}" style="text-align: center; font-weight: bold; color: #2e7d32; vertical-align: middle;">${yg.totalHours} ساعة</td>`;
          }
          excelRowsHtml += "</tr>\n";
        }
      });
    });

    let excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>بيانات_أعضاء_هيئة_التدريس</x:Name>
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
        <style>
          body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; text-align: right; }
          table { border-collapse: collapse; direction: rtl; }
          th, td { border: 1px solid #333333; padding: 8px 25px; text-align: center; vertical-align: middle; }
          tr { height: 35px; }
          th { background-color: #2e7d32; color: #ffffff; font-weight: bold; font-size: 18px; }
          td { font-size: 20px; mso-data-placement:same-cell; white-space: nowrap; color: #4a4a4a; }
          .header-row { font-size: 30px; font-weight: bold; color: #2e7d32; text-align: center; border: none; }
          .logo-cell { text-align: left; border: none; }
          .title-cell { text-align: right; border: none; vertical-align: middle; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td rowspan="5" colspan="2" style="border: none; text-align: center; vertical-align: middle;">
              <img src="${window.location.origin}${logo}" width="120" height="120" />
            </td>
            <td colspan="${headers.length - 2}" style="border: none;"></td>
          </tr>
          <tr>
            <td colspan="7" style="border: none; text-align: center; color: #2e7d32; font-weight: bold; font-size: 28px;">
              ${documentTitle}
            </td>
            <td colspan="${headers.length - 9}" style="border: none;"></td>
          </tr>
          <tr>
            <td colspan="7" style="border: none; text-align: center; color: #d32f2f; font-weight: bold; font-size: 16px;">
              ${filterSubTitle || ''}
            </td>
            <td colspan="${headers.length - 9}" style="border: none;"></td>
          </tr>
          <tr>
            <td colspan="7" style="border: none; text-align: center; color: #2e7d32; font-weight: bold; font-size: 22px;">
              جامعة المنوفية الأهلية
            </td>
            <td colspan="${headers.length - 9}" style="border: none;"></td>
          </tr>
          <tr style="height: 25px;">
            <td colspan="${headers.length - 4}" style="border: none;"></td>
            <td colspan="2" style="border: none; text-align: center; vertical-align: middle; color: #2e7d32; font-weight: bold; font-size: 10pt; white-space: nowrap;">
              إذا لم يتم تحديد عدد أسابيع حضور الأستاذ تحسب أوتوماتيكياً بناءً على عدد أسابيع فصول السنة المحددة
            </td>
          </tr>
          <tr>
            ${headers.map(h => `<th style="background-color: #2e7d32; color: #ffffff;">${h}</th>`).join("")}
          </tr>
          ${excelRowsHtml}
          ${renderProfSignaturesExcelHTML(fids, headers.length)}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${documentTitle}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {

    let newErrors = {};



    const nid = formData.national_id ? String(formData.national_id).trim() : "";
    if (!nid) {
      newErrors.national_id = "الرقم القومي مطلوب";
    } else if (modalMode === 'add' && (nid.length !== 14 || !['2', '3'].includes(nid[0]))) {
      newErrors.national_id = "يجب أن يكون 14 رقماً ويبدأ بـ 2 أو 3";
    } else {
      const isDuplicate = professors.some(p => p.national_id === nid && (modalMode === 'add' || String(p.id) !== String(selectedProfessorId)));
      if (isDuplicate) {
        newErrors.national_id = "عضو هيئة التدريس بهذا الرقم القومي مسجل بالفعل";
      }
    }

    if (!formData.name_ar || formData.name_ar.trim().length < 2) {
      newErrors.name_ar = "الاسم بالعربي مطلوب";
    }

    if (!formData.job_title) {
      newErrors.job_title = "يجب اختيار الدرجة العلمية";
    }

    if (formData.original_workplace && formData.original_workplace.trim().length > 0 && formData.original_workplace.trim().length < 2) {
      newErrors.original_workplace = "يجب أن تكون جهة العمل حرفين على الأقل";
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      const cleanPhone = formData.phone.trim().replace(/[\s\-]/g, '');
      if (cleanPhone.length < 8 || cleanPhone.length > 15) {
        newErrors.phone = "يرجى إدخال رقم هاتف صحيح";
      }
    }

    if (!selectedFaculties || selectedFaculties.length === 0) {
      newErrors.faculties = "يجب اختيار كلية واحدة على الأقل";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErr = Object.values(newErrors)[0];
      toast.error(`يرجى مراجعة البيانات: ${firstErr}`);
      return;
    }



    setErrors({});



    const payload = {

      name_ar: formData.name_ar,

      name_en: formData.name_en || "N/A",

      national_id: formData.national_id,

      phone: formData.phone || "",

      email: formData.email || "",

      job_title: formData.job_title,

      original_workplace: formData.original_workplace,

      contract_type: formData.contract_type || "",

      work_days: formData.work_days || "",

      mnu_job_title: formData.mnu_job_title || "",

      academic_year: formData.academic_year || selectedAcademicYear || (academicYears.length > 0 ? academicYears[0].name : "2026/2027"),

      semester1_weeks: formData.academic_year_weeks?.[formData.academic_year]?.semester1_weeks ?? (formData.semester1_weeks !== "" && formData.semester1_weeks !== null ? Number(formData.semester1_weeks) : null),

      semester2_weeks: formData.academic_year_weeks?.[formData.academic_year]?.semester2_weeks ?? (formData.semester2_weeks !== "" && formData.semester2_weeks !== null ? Number(formData.semester2_weeks) : null),

      summer_weeks: formData.academic_year_weeks?.[formData.academic_year]?.summer_weeks ?? (formData.summer_weeks !== "" && formData.summer_weeks !== null ? Number(formData.summer_weeks) : null),

      academic_year_weeks: formData.academic_year_weeks || {},

      faculty_ids: selectedFaculties.map(f => parseInt(f.value)).filter(id => !isNaN(id)),

      course_ids: [] // يتم تعيين المقررات أوتوماتيكياً من الخطط الدراسية

    };

    try {

      if (modalMode === 'edit') {

        await axios.put(`/api/professors/${selectedProfessorId}`, payload);

        toast.success("تم تعديل البيانات بنجاح");

      } else {

        await axios.post('/api/professors', payload);

        toast.success("تم الحفظ بنجاح");

      }

      setShowModal(false);

      fetchData();

    } catch (err) {

      let detailMsg = "خطأ غير معروف";

      if (err.response?.data?.detail) {

        if (typeof err.response.data.detail === "string") {

          detailMsg = err.response.data.detail;

        } else if (Array.isArray(err.response.data.detail)) {

          detailMsg = err.response.data.detail.map(e => e.msg || JSON.stringify(e)).join(" - ");

        } else {

          detailMsg = JSON.stringify(err.response.data.detail);

        }

      } else if (err.message) {

        detailMsg = err.message;

      }

      toast.error("فشل الحفظ: " + detailMsg);

    }

  };



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



  const getLevelLabel = (level, programId) => {

    return `المستوى ${level}`;

  };



  const matchProfessorQuery = (prof, queryTerm) => {

    if (!queryTerm) return true;

    const q = queryTerm.trim().toLowerCase();

    

    // 1. البحث باسم عضو هيئة التدريس، الرقم القومي، وظيفته، أو جهة القدوم

    const nameMatches = (prof.name_ar || "").toLowerCase().includes(q);

    const nationalIdMatches = (prof.national_id || "").toLowerCase().includes(q);

    const abvMatches = (getProfAbbreviation(prof) || "").toLowerCase().includes(q);

    const titleMatches = (getFullJobTitle(prof.job_title) || "").toLowerCase().includes(q);

    const rawJobMatches = (prof.job_title || "").toLowerCase().includes(q);

    const workplaceMatches = (prof.original_workplace || "").toLowerCase().includes(q);

    const academicYearMatches = (prof.academic_year || "").toLowerCase().includes(q);

    const contractTypeMatches = (prof.contract_type || "").toLowerCase().includes(q);

    const workDaysMatches = (prof.work_days || "").toLowerCase().includes(q);

    const mnuJobMatches = (prof.mnu_job_title || "").toLowerCase().includes(q);

    if (nameMatches || nationalIdMatches || abvMatches || titleMatches || rawJobMatches || workplaceMatches || academicYearMatches || contractTypeMatches || workDaysMatches || mnuJobMatches) return true;



    // 2. البحث باسم الكلية التابع لها أو البحث عن أعضاء بدون كلية

    if (!prof.faculties || prof.faculties.length === 0) {

      if (q.includes("لا توجد") || q.includes("بدون كلية") || q.includes("بدون كليات") || q === "بدون") return true;

    }

    const facultyMatches = (prof.faculties || []).some(f => 

      (f.name || "").toLowerCase().includes(q)

    );

    if (facultyMatches) return true;



    // 3. البحث بالمستوى أو الفصل الدراسي (الترم) أو اسم/كود المقرر المكلف به

    const courses = prof.courses || [];

    for (const c of courses) {

      if (!c) continue;

      

      // مطابقة اسم المقرر أو كوده

      if ((c.name_ar || "").toLowerCase().includes(q) || (c.code || "").toLowerCase().includes(q)) {

        return true;

      }



      // مطابقة الفصل الدراسي (الترم)

      const sem = (c.semester || "").toLowerCase();

      if (sem.includes(q)) return true;

      if (("الأول".includes(q) || "الاول".includes(q) || "ترم اول".includes(q) || "ترم 1".includes(q) || "فصل اول".includes(q)) && (sem.includes("أول") || sem.includes("اول") || sem.includes("1"))) return true;

      if (("الثاني".includes(q) || "الثانى".includes(q) || "ثاني".includes(q) || "ثانى".includes(q) || "ترم ثاني".includes(q) || "ترم 2".includes(q) || "فصل ثاني".includes(q)) && (sem.includes("ثان") || sem.includes("2"))) return true;

      if (("الصيفي".includes(q) || "صيفي".includes(q) || "صيف".includes(q) || "ترم صيفي".includes(q) || "ترم 3".includes(q) || "فصل صيفي".includes(q)) && (sem.includes("صيف") || sem.includes("3"))) return true;



      // مطابقة المستوى الدراسي

      const lvlStr = String(c.level || "").toLowerCase();

      const lvlLabel = `المستوى ${c.level}`.toLowerCase();

      if (lvlStr.includes(q) || lvlLabel.includes(q)) return true;

      if (("الأول".includes(q) || "الاول".includes(q) || "مستوى اول".includes(q) || "مستوى 1".includes(q)) && (lvlStr === "1" || lvlStr.includes("اول") || lvlStr.includes("أول"))) return true;

      if (("الثاني".includes(q) || "الثانى".includes(q) || "ثاني".includes(q) || "ثانى".includes(q) || "مستوى ثاني".includes(q) || "مستوى 2".includes(q)) && (lvlStr === "2" || lvlStr.includes("ثان"))) return true;

      if (("الثالث".includes(q) || "ثالث".includes(q) || "مستوى ثالث".includes(q) || "مستوى 3".includes(q)) && (lvlStr === "3" || lvlStr.includes("ثالث"))) return true;

      if (("الرابع".includes(q) || "رابع".includes(q) || "مستوى رابع".includes(q) || "مستوى 4".includes(q)) && (lvlStr === "4" || lvlStr.includes("رابع"))) return true;

      if (("الخامس".includes(q) || "خامس".includes(q) || "مستوى خامس".includes(q) || "مستوى 5".includes(q)) && (lvlStr === "5" || lvlStr.includes("خامس"))) return true;

    }



    return false;

  };



  const filteredPrint = professors.filter(p => {
    let match = matchProfessorQuery(p, printSearchTerm);

    if (match && printIncompleteFilter) {
      if (printIncompleteFilter === 'phone') match = !p.phone || p.phone.trim() === '';
      else if (printIncompleteFilter === 'email') match = !p.email || p.email.trim() === '' || p.email === 'N/A';
      else if (printIncompleteFilter === 'workplace') match = !p.original_workplace || p.original_workplace.trim() === '';
      else if (printIncompleteFilter === 'job_title') match = !p.job_title || p.job_title.trim() === '';
      else if (printIncompleteFilter === 'contract_type') match = !p.contract_type || p.contract_type.trim() === '';
      else if (printIncompleteFilter === 'faculty') match = !p.faculties || p.faculties.length === 0;
      else if (printIncompleteFilter === 'mnu_job_title') match = !p.mnu_job_title || p.mnu_job_title.trim() === '' || p.mnu_job_title === '—';
      else if (printIncompleteFilter === 'weeks') {
        let s1 = p.semester1_weeks;
        let s2 = p.semester2_weeks;
        let s3 = p.summer_weeks;
        if (p.academic_year_weeks) {
          try {
            const parsed = typeof p.academic_year_weeks === 'string' ? JSON.parse(p.academic_year_weeks) : p.academic_year_weeks;
            const targetYear = exportAcademicYear && exportAcademicYear !== 'الكل' ? exportAcademicYear : (p.academic_year || (academicYears.length > 0 ? academicYears[0].name : "2026/2027"));
            if (parsed && parsed[targetYear]) {
              if (parsed[targetYear].semester1_weeks !== undefined && parsed[targetYear].semester1_weeks !== null && parsed[targetYear].semester1_weeks !== "") s1 = parsed[targetYear].semester1_weeks;
              if (parsed[targetYear].semester2_weeks !== undefined && parsed[targetYear].semester2_weeks !== null && parsed[targetYear].semester2_weeks !== "") s2 = parsed[targetYear].semester2_weeks;
              if (parsed[targetYear].summer_weeks !== undefined && parsed[targetYear].summer_weeks !== null && parsed[targetYear].summer_weeks !== "") s3 = parsed[targetYear].summer_weeks;
            }
          } catch (e) {}
        }
        match = (!s1 || Number(s1) <= 0 || !s2 || Number(s2) <= 0 || !s3 || Number(s3) <= 0);
      }
    }

    if (match && printFacultyFilter !== 'الكل') {
      match = p.faculties && p.faculties.some(f => String(f.id) === String(printFacultyFilter));
    }

    if (match && printJobTitleFilter !== 'الكل') {
      match = p.job_title === printJobTitleFilter;
    }

    if (match && printContractFilter !== 'الكل') {
      if (printContractFilter === 'بدون تعاقد' || printContractFilter === 'بدون_تعاقد') {
        match = !p.contract_type || !p.contract_type.trim();
      } else if (printContractFilter === 'تعاقد كلي' || printContractFilter === 'كلي') {
        match = p.contract_type === 'كلي';
      } else if (printContractFilter === 'تعاقد جزئي' || printContractFilter === 'جزئي') {
        match = p.contract_type === 'جزئي';
      } else if (printContractFilter === 'تعاقد بالساعة' || printContractFilter === 'بالساعة') {
        match = p.contract_type === 'بالساعة';
      } else {
        match = p.contract_type === printContractFilter;
      }
    }

    // فلترة الفصل الدراسي والمستوى والعام الجامعي بناءً على المقررات المسندة للأستاذ
    if (match) {
      const hasSemesterFilter = exportSemester && exportSemester !== 'الكل';
      const hasLevelFilter = exportLevel && exportLevel !== 'الكل';
      const hasYearFilter = exportAcademicYear && exportAcademicYear !== 'الكل';

      if (hasSemesterFilter || hasLevelFilter || hasYearFilter) {
        const matchesConditions = (c) => {
          if (!c) return false;

          // 1. مطابقة العام الجامعي
          if (hasYearFilter) {
            const y = c.year || "";
            if (y && y !== exportAcademicYear && p.academic_year !== exportAcademicYear) {
              return false;
            }
          }

          // 2. مطابقة الفصل الدراسي
          if (hasSemesterFilter) {
            const sem = (c.semester || "").toLowerCase();
            if (exportSemester === 'أول' || exportSemester === 'اول') {
              if (!sem.includes('أول') && !sem.includes('اول') && !sem.includes('1')) return false;
            } else if (exportSemester === 'ثاني' || exportSemester === 'ثان') {
              if (!sem.includes('ثان') && !sem.includes('2')) return false;
            } else if (exportSemester === 'صيفي' || exportSemester === 'صيف') {
              if (!sem.includes('صيف') && !sem.includes('3')) return false;
            } else {
              if (!sem.includes(exportSemester.toLowerCase())) return false;
            }
          }

          // 3. مطابقة المستوى
          if (hasLevelFilter) {
            const lTerm = exportLevel;
            let targetLvl = -1;
            if (lTerm === 'عام') targetLvl = 0;
            else if (lTerm === 'الأول' || lTerm === '1') targetLvl = 1;
            else if (lTerm === 'الثاني' || lTerm === '2') targetLvl = 2;
            else if (lTerm === 'الثالث' || lTerm === '3') targetLvl = 3;
            else if (lTerm === 'الرابع' || lTerm === '4') targetLvl = 4;
            else if (lTerm === 'الخامس' || lTerm === '5') targetLvl = 5;

            if (targetLvl !== -1) {
              if (c.level !== targetLvl && String(c.level) !== String(targetLvl) && !String(c.level || "").includes(lTerm)) {
                return false;
              }
            } else {
              if (!String(c.level || "").toLowerCase().includes(lTerm.toLowerCase())) return false;
            }
          }

          return true;
        };

        const hasMatchingCourse = p.courses && p.courses.some(matchesConditions);
        if (!hasMatchingCourse) {
          match = false;
        }
      }
    }

    return match;
  });

  const filteredProfessors = professors.filter(p => {

    let match = matchProfessorQuery(p, searchTerm);

    if (!match) return false;



    if (mainStatusFilter === "غير_مكتملة") {

      const isMissingNid = !p.national_id || p.national_id.length < 14 || p.national_id.startsWith("99000");

      const isMissingPhone = !p.phone || p.phone.length < 11;

      const isMissingEmail = !p.email || !p.email.includes("@") || p.email === "N/A";

      const isMissingWorkplace = !p.original_workplace || !p.original_workplace.trim() || p.original_workplace === "N/A";

      const isMissingContract = !p.contract_type || !p.contract_type.trim();

      const isMissingFaculties = !p.faculties || p.faculties.length === 0;

      return isMissingNid || isMissingPhone || isMissingEmail || isMissingWorkplace || isMissingContract || isMissingFaculties;

    }

    if (mainStatusFilter === "مكتملة") {

      const isMissingNid = !p.national_id || p.national_id.length < 14 || p.national_id.startsWith("99000");

      const isMissingPhone = !p.phone || p.phone.length < 11;

      const isMissingEmail = !p.email || !p.email.includes("@") || p.email === "N/A";

      const isMissingWorkplace = !p.original_workplace || !p.original_workplace.trim() || p.original_workplace === "N/A";

      const isMissingContract = !p.contract_type || !p.contract_type.trim();

      const isMissingFaculties = !p.faculties || p.faculties.length === 0;

      return !(isMissingNid || isMissingPhone || isMissingEmail || isMissingWorkplace || isMissingContract || isMissingFaculties);

    }

    if (mainStatusFilter === "بدون_تعاقد") return !p.contract_type || !p.contract_type.trim();

    if (mainStatusFilter === "كلي") return p.contract_type === "كلي";

    if (mainStatusFilter === "جزئي") return p.contract_type === "جزئي";

    if (mainStatusFilter === "بالساعة") return p.contract_type === "بالساعة";



    return true;

  });



  const totalPages = Math.ceil(filteredProfessors.length / itemsPerPage);

  const indexOfLastItem = currentPage * itemsPerPage;

  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const currentProfessors = filteredProfessors.slice(indexOfFirstItem, indexOfLastItem);



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

          <h2 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }} className="d-flex align-items-center gap-3"><FaUserTie className="text-success" style={{ marginLeft: '15px' }} /> أعضاء هيئة التدريس</h2>

        </div>

        {/* أزرار الاستيراد والطباعة */}

        <div className="col-12 col-lg-3">

          <div className="d-flex flex-wrap gap-2">

            {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'faculty_professor' || (user?.role === 'faculty_admin' && user?.perm_view_prof_import_btn) || (user?.role === 'student_affairs' && user?.perm_view_prof_import_btn)) && (

              <Button variant="info" className="flex-fill text-nowrap" onClick={() => setShowImportModal(true)}>

                <i className="bi bi-file-earmark-excel"></i> استيراد

              </Button>

            )}

            {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'faculty_professor' || (user?.role === 'faculty_admin' && user?.perm_view_prof_print_btn) || (user?.role === 'student_affairs' && user?.perm_view_prof_print_btn)) && (

            <Button variant="info" className="flex-fill text-nowrap" onClick={() => setShowPrintModal(true)}>

              <i className="bi bi-box-arrow-up-right"></i> تصدير

            </Button>

            )}

          </div>

        </div>

      </div>



      <div className="row mb-3 align-items-center">

        {/* السيرش وحالة البيانات */}

        <div className="col-12 col-lg-9 mb-3 mb-lg-0">

          <div className="d-flex flex-wrap gap-2">

            <input

              type="text"

              className="form-control"

              placeholder="بحث باسم عضو هيئة التدريس، الرقم القومي، الوظيفة، الكلية ..."

              value={searchTerm}

              onChange={(e) => setSearchTerm(e.target.value)}

            />

            <select

              className="form-select border-success text-success fw-bold"

              style={{ width: '240px', shrink: 0 }}

              value={mainStatusFilter}

              onChange={(e) => setMainStatusFilter(e.target.value)}

            >

              <option value="الكل">عرض الكل ({professors.length})</option>

              <option value="غير_مكتملة">⚠️ بيانات غير مكتملة</option>

              <option value="مكتملة">✅ بيانات مكتملة</option>

              <option value="بدون_تعاقد">بدون نوع تعاقد</option>

              <option value="كلي">تعاقد كلي (5 أيام)</option>

              <option value="جزئي">تعاقد جزئي</option>

              <option value="بالساعة">تعاقد بالساعة</option>

            </select>

          </div>

        </div>



        {/* الزر على اليسار (يأخذ 3 أعمدة من أصل 12) */}

        <div className="col-12 col-lg-3">

          <Button

            variant="primary"

            onClick={() => openModal(null, 'add')}

            className="w-100 text-nowrap"

          >

            + إضافة عضو هيئة تدريس

          </Button>

        </div>

      </div>



      <Table responsive striped bordered hover className="mt-3">

        <thead>

          <tr style={{ borderBottom: '2px solid #ddd' }}>

            <th style={{ textAlign: 'right', paddingRight: '20px' }}>عضو هيئة التدريس</th>

            <th>الدرجة العلمية</th>

            <th>طبيعة العمل بجامعة المنوفية الأهلية</th>

            <th>نوع التعاقد والأيام</th>

            <th>الكليات التابع لها</th>

            <th>الإجراءات</th>

          </tr>

        </thead>

        <tbody>

          {currentProfessors.map((prof) => (

            <tr key={prof.id} style={{ borderBottom: '1px solid #eee' }}>

              <td style={{ textAlign: 'right', paddingRight: '20px' }}>{getProfAbbreviation(prof)} / {prof.name_ar}</td>

              <td>{getFullJobTitle(prof.job_title)}</td>

              <td>{prof.mnu_job_title || "—"}</td>

              <td>

                {prof.contract_type ? (

                  <span className={`badge ${prof.contract_type === 'كلي' ? 'bg-success' : (prof.contract_type === 'بالساعة' ? 'bg-info text-dark' : 'bg-warning text-dark')}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>

                    تعاقد {prof.contract_type} {prof.work_days && prof.contract_type !== 'بالساعة' ? `- ${prof.work_days}` : ''}

                  </span>

                ) : (

                  <span className="text-muted" style={{ fontSize: '0.9rem' }}>غير محدد</span>

                )}

              </td>

              <td>

                {prof.faculties && prof.faculties.length > 0 ? (

                  prof.faculties.map((f, i) => <div key={i}>{f.name}</div>)

                ) : (

                  <span style={{ color: 'red' }}>لا توجد كلية</span>

                )}

              </td>

              <td>

                <div className="d-flex justify-content-center align-items-center gap-3">

                  {/* زر الرؤية */}

                  {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'faculty_professor' || (user?.role === 'faculty_admin' && user?.perm_view_prof_view_btn) || (user?.role === 'student_affairs' && user?.perm_view_prof_view_btn)) && (

                    <Button

                      variant="link"

                      size="sm"

                      className="p-0"

                      title="عرض التفاصيل"

                      onClick={() => { openModal(prof, 'view'); }}

                    >

                      <i className="bi bi-eye-fill action-btn-view" style={{ fontSize: '18px' }}></i>

                    </Button>

                  )}



                  {/* زر التعديل */}

                  <Button

                    variant="link"

                    size="sm"

                    className="p-0"

                    title="تعديل البيانات"

                    onClick={() => { openModal(prof, 'edit') }}

                  >

                    <i className="bi bi-pencil-square action-btn-edit" style={{ fontSize: '18px' }}></i>

                  </Button>



                  {/* زر الحذف */}

                  {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'faculty_professor' || (user?.role === 'faculty_admin' && user?.perm_view_prof_delete_btn) || (user?.role === 'student_affairs' && user?.perm_view_prof_delete_btn)) && (

                    <Button

                      variant="link"

                      size="sm"

                      className="p-0"

                      title="حذف"

                      onClick={() => { handleDelete(prof.id) }}

                    >

                      <i className="bi bi-trash3-fill action-btn-delete" style={{ fontSize: '18px' }}></i>

                    </Button>

                  )}

                </div>

              </td>

            </tr>

          ))}

        </tbody>

      </Table>



      {totalPages > 1 && (

        <div className="d-flex justify-content-end mt-3" style={{ direction: 'rtl' }}>

          <Pagination>

            <Pagination.First

              disabled={currentPage === 1}

              onClick={() => setCurrentPage(1)}

            >

              »

            </Pagination.First>

            <Pagination.Prev

              disabled={currentPage === 1}

              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}

            >

              ›

            </Pagination.Prev>

            {getPaginationItems().map(page => (

              <Pagination.Item

                key={page}

                active={currentPage === page}

                onClick={() => setCurrentPage(page)}

              >

                {page}

              </Pagination.Item>

            ))}

            <Pagination.Next

              disabled={currentPage === totalPages}

              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}

            >

              ‹

            </Pagination.Next>

            <Pagination.Last

              disabled={currentPage === totalPages}

              onClick={() => setCurrentPage(totalPages)}

            >

              «

            </Pagination.Last>

          </Pagination>

        </div>

      )}





      {showModal && (

        <div style={modalOverlayStyle}>

          <div style={modalContentStyle}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>

              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>

                <i className="bi bi-person-fill"></i>

                {modalMode === 'view' ? 'عرض تفاصيل عضو هيئة التدريس' : modalMode === 'edit' ? 'تعديل بيانات عضو هيئة التدريس' : 'إضافة عضو هيئة تدريس'}

              </h3>

              <Button variant="link" className="no-print" onClick={() => setShowModal(false)} style={{ padding: 0, textDecoration: 'none', color: '#666' }}>

                <i className="bi bi-x-lg" style={{ fontSize: '20px' }}></i>

              </Button>

            </div>



            <div style={{ marginBottom: '15px' }}>

              <input

                placeholder="الاسم بالعربية (ثلاثي)"

                value={formData.name_ar || ""}

                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}

                disabled={modalMode === 'view'}

                style={{ ...inputStyle, borderColor: errors.name_ar ? 'red' : '#ccc' }}

              />

              {errors.name_ar && <span style={{ color: 'red', fontSize: '12px' }}>{errors.name_ar}</span>}

            </div>



            {modalMode !== 'edit' && (

              <div style={{ marginBottom: '15px' }}>

                <input

                  placeholder="الرقم القومي"

                  value={formData.national_id || ""}

                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}

                  disabled={modalMode === 'view'}

                  style={{ ...inputStyle, borderColor: errors.national_id ? 'red' : '#ccc' }}

                />

                {errors.national_id && <span style={{ color: 'red', fontSize: '12px' }}>{errors.national_id}</span>}

              </div>

            )}

            {/* حقل البريد الإلكتروني */}

            <div style={{ marginBottom: '15px' }}>

              <input

                placeholder="الإيميل"

                value={formData.email || ""}

                onChange={(e) => setFormData({ ...formData, email: e.target.value })}

                disabled={modalMode === 'view'}

                style={inputStyle}

              />

            </div>



            {/* حقل رقم التليفون */}

            <div style={{ marginBottom: '15px' }}>

              <input

                placeholder="رقم التليفون"

                maxLength={11}

                value={formData.phone || ""}

                disabled={modalMode === 'view'}

                onChange={(e) => {

                  const val = e.target.value;

                  // السماح فقط بالأرقام

                  if (/^\d*$/.test(val)) {

                    setFormData({ ...formData, phone: val });

                  }

                }}

                style={{

                  ...inputStyle,

                  borderColor: errors.phone ? 'red' : '#ccc',

                  borderWidth: errors.phone ? '2px' : '1px'

                }}

              />



              {/* رسالة الخطأ */}

              {errors.phone && (

                <span style={{ color: 'red', fontSize: '12px', display: 'block', marginTop: '5px' }}>

                  {errors.phone}

                </span>

              )}

            </div>



            <div style={{ marginBottom: '15px' }}>

              <select

                value={formData.job_title}

                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}

                disabled={modalMode === 'view'}

                style={{

                  ...inputStyle,

                  borderColor: errors.job_title ? 'red' : '#ccc',

                  borderWidth: errors.job_title ? '2px' : '1px'

                }}

              >

                <option value="" disabled hidden> الدرجة العلمية...</option>

                <option value="أ.م">أستاذ (أ.م)</option>

                <option value="أ.م.د">أستاذ مساعد (أ.م.د)</option>

                <option value="د">مدرس (د)</option>

                <option value="م.م">مدرس مساعد (م.م)</option>

                <option value="معيد">معيد</option>

                <option value="أخصائي">أخصائي</option>

              </select>

              {errors.job_title && <span style={{ color: 'red', fontSize: '12px' }}>{errors.job_title}</span>}

            </div>



            <div style={{ marginBottom: '15px' }}>

              <input

                placeholder="جهة القدوم / العمل الأصلي"

                value={formData.original_workplace || ""}

                onChange={(e) => setFormData({ ...formData, original_workplace: e.target.value })}

                disabled={modalMode === 'view'}

                style={{ ...inputStyle, borderColor: errors.original_workplace ? 'red' : '#ccc' }}

              />

              {errors.original_workplace && <span style={{ color: 'red', fontSize: '12px' }}>{errors.original_workplace}</span>}

            </div>



            {/* حقل طبيعة العمل / الوظيفة في جامعة المنوفية الأهلية */}

            <div style={{ marginBottom: '15px' }}>

              <input

                placeholder="طبيعة العمل / الوظيفة بجامعة المنوفية الأهلية (مثل: نائب رئيس الجامعة، مدير برنامج، منسق فرقة...)"

                value={formData.mnu_job_title || ""}

                onChange={(e) => setFormData({ ...formData, mnu_job_title: e.target.value })}

                disabled={modalMode === 'view'}

                style={inputStyle}

              />

            </div>



            {/* حقل نوع التعاقد */}

            <div style={{ marginBottom: '15px' }}>

              <select

                value={formData.contract_type || ""}

                onChange={(e) => {

                  const val = e.target.value;

                  let days = formData.work_days;

                  if (val === 'كلي') days = '5 أيام في الأسبوع';

                  else if (val === 'بالساعة') days = 'بالساعة';

                  else if (days === '5 أيام في الأسبوع' || days === 'بالساعة') days = 'يومان';

                  

                  setFormData({

                    ...formData,

                    contract_type: val,

                    work_days: days

                  });

                }}

                disabled={modalMode === 'view'}

                style={inputStyle}

              >

                <option value="" disabled hidden>اختر نوع التعاقد...</option>

                <option value="كلي">تعاقد كلي (5 أيام في الأسبوع)</option>

                <option value="جزئي">تعاقد جزئي</option>

                <option value="بالساعة">تعاقد بالساعة</option>

              </select>

            </div>



            {/* حقل عدد أيام العمل في الأسبوع */}

            <div style={{ marginBottom: '15px' }}>

              <select

                value={formData.work_days || ""}

                onChange={(e) => setFormData({ ...formData, work_days: e.target.value })}

                disabled={modalMode === 'view' || formData.contract_type === 'كلي' || formData.contract_type === 'بالساعة'}

                style={inputStyle}

              >

                <option value="" disabled hidden>اختر عدد أيام العمل...</option>

                <option value="5 أيام في الأسبوع">5 أيام في الأسبوع (للرئيسي / الكلي)</option>

                <option value="يوم واحد">يوم واحد (جزئي)</option>

                <option value="يومان">يومان (جزئي)</option>

                <option value="3 أيام">3 أيام (جزئي)</option>

                <option value="بالساعة">بالساعة</option>

              </select>

            </div>



            {/* حقل العام الجامعي وتوزيع أسابيع الحضور لكل عام جامعي */}

            <div style={{ marginBottom: '20px', padding: '16px 18px', border: '1.5px solid #c8e6c9', borderRadius: '10px', backgroundColor: '#f9fcf9' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>

                <label style={{ fontWeight: 'bold', color: '#1b5e20', fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>

                  <i className="bi bi-calendar3 ms-1" style={{ fontSize: '18px' }}></i> أسابيع حضور عضو هيئة التدريس لكل عام جامعي:

                </label>

                {modalMode !== 'view' && (

                  <span style={{ fontSize: '13px', color: '#2e7d32', backgroundColor: '#e8f5e9', padding: '4px 10px', borderRadius: '6px', fontWeight: '500' }}>

                    اختر العام الجامعي ثم حدد عدد الأسابيع لكل فصل

                  </span>

                )}

              </div>



              {modalMode !== 'view' ? (

                <>

                  {/* تبويبات اختيار العام الجامعي */}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>

                    {academicYears.map((ay) => {

                      const isSelected = (modalActiveYear || formData.academic_year || academicYears[0]?.name) === ay.name;

                      const hasCustom = formData.academic_year_weeks?.[ay.name];

                      return (

                        <button

                          key={ay.id || ay.name}

                          type="button"

                          onClick={() => setModalActiveYear(ay.name)}

                          style={{

                            padding: '7px 16px',

                            fontSize: '14.5px',

                            fontWeight: isSelected ? 'bold' : '600',

                            borderRadius: '8px',

                            border: isSelected ? '2px solid #2e7d32' : '1px solid #ced4da',

                            backgroundColor: isSelected ? '#2e7d32' : '#ffffff',

                            color: isSelected ? '#ffffff' : '#333333',

                            cursor: 'pointer',

                            display: 'flex',

                            alignItems: 'center',

                            gap: '6px',

                            boxShadow: isSelected ? '0 2px 5px rgba(46,125,50,0.25)' : 'none',

                            transition: 'all 0.2s ease'

                          }}

                        >

                          <span>{ay.name}</span>

                          {hasCustom && (

                            <span style={{

                              fontSize: '11.5px',

                              backgroundColor: isSelected ? '#ffffff' : '#2e7d32',

                              color: isSelected ? '#2e7d32' : '#ffffff',

                              borderRadius: '50%',

                              width: '18px',

                              height: '18px',

                              display: 'inline-flex',

                              alignItems: 'center',

                              justifyContent: 'center',

                              fontWeight: 'bold'

                            }}>

                              ✓

                            </span>

                          )}

                        </button>

                      );

                    })}

                  </div>



                  {/* خيارات الفصول الدراسية للعام المحدد حالياً */}

                  {(() => {

                    const activeYear = modalActiveYear || formData.academic_year || academicYears[0]?.name || "2026/2027";

                    const currentYearObj = academicYears.find(y => y.name === activeYear) || academicYears[0] || {};

                    const s1Max = currentYearObj.semester1_weeks || 15;

                    const s2Max = currentYearObj.semester2_weeks || 15;

                    const summerMax = currentYearObj.summer_weeks || 8;



                    const currentYearData = formData.academic_year_weeks?.[activeYear] || {};



                    const renderWeekOptions = (maxWeeks) => {

                      const opts = [];

                      for (let i = 1; i <= maxWeeks; i++) {

                        opts.push(

                          <option key={i} value={i}>

                            {formatWeekCountText(i)}

                          </option>

                        );

                      }

                      return opts;

                    };



                    const updateYearWeeks = (field, val) => {

                      const numVal = val ? Number(val) : "";

                      const updatedObj = {

                        ...(formData.academic_year_weeks || {}),

                        [activeYear]: {

                          ...(formData.academic_year_weeks?.[activeYear] || {}),

                          [field]: numVal

                        }

                      };

                      setFormData({

                        ...formData,

                        academic_year_weeks: updatedObj,

                        ...(activeYear === formData.academic_year ? { [field]: numVal } : {})

                      });

                    };



                    return (

                      <div style={{ backgroundColor: '#ffffff', padding: '15px 16px', borderRadius: '8px', border: '1px solid #dcdcdc' }}>

                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1b5e20', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>

                          <i className="bi bi-clock-history" style={{ fontSize: '16px' }}></i>

                          تحديد أسابيع الحضور للعام الجامعي: <span style={{ color: '#2e7d32' }}>{activeYear}</span>

                        </div>



                        <div className="row g-3">

                          {/* الفصل الدراسي الأول */}

                          <div className="col-12 col-md-4">

                            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '6px', display: 'block' }}>

                              الفصل الأول <span style={{ fontSize: '12px', fontWeight: '600', color: '#2b2b2b' }}>(الحد الأقصى: {formatWeekCountText(s1Max)})</span>:

                            </label>

                            <select

                              value={currentYearData.semester1_weeks || ""}

                              onChange={(e) => updateYearWeeks('semester1_weeks', e.target.value)}

                              style={{ ...inputStyle, padding: '9px 12px', fontSize: '14px', borderRadius: '6px' }}

                            >

                              <option value="">اختر عدد الأسابيع...</option>

                              {renderWeekOptions(s1Max)}

                            </select>

                          </div>



                          {/* الفصل الدراسي الثاني */}

                          <div className="col-12 col-md-4">

                            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '6px', display: 'block' }}>

                              الفصل الثاني <span style={{ fontSize: '12px', fontWeight: '600', color: '#2b2b2b' }}>(الحد الأقصى: {formatWeekCountText(s2Max)})</span>:

                            </label>

                            <select

                              value={currentYearData.semester2_weeks || ""}

                              onChange={(e) => updateYearWeeks('semester2_weeks', e.target.value)}

                              style={{ ...inputStyle, padding: '9px 12px', fontSize: '14px', borderRadius: '6px' }}

                            >

                              <option value="">اختر عدد الأسابيع...</option>

                              {renderWeekOptions(s2Max)}

                            </select>

                          </div>



                          {/* الفصل الدراسي الصيفي */}

                          <div className="col-12 col-md-4">

                            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#111', marginBottom: '6px', display: 'block' }}>

                              الفصل الصيفي <span style={{ fontSize: '12px', fontWeight: '600', color: '#2b2b2b' }}>(الحد الأقصى: {formatWeekCountText(summerMax)})</span>:

                            </label>

                            <select

                              value={currentYearData.summer_weeks || ""}

                              onChange={(e) => updateYearWeeks('summer_weeks', e.target.value)}

                              style={{ ...inputStyle, padding: '9px 12px', fontSize: '14px', borderRadius: '6px' }}

                            >

                              <option value="">اختر عدد الأسابيع...</option>

                              {renderWeekOptions(summerMax)}

                            </select>

                          </div>

                        </div>

                      </div>

                    );

                  })()}



                  {/* جدول ملخص في وضع الإضافة / التعديل */}

                  {academicYears.length > 0 && (

                    <div style={{ marginTop: '15px', overflowX: 'auto' }}>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'center', backgroundColor: '#fff', border: '1px solid #dee2e6' }}>

                        <thead>

                          <tr style={{ backgroundColor: '#f1f8e9', color: '#1b5e20', fontWeight: 'bold' }}>

                            <th style={{ padding: '8px 10px', border: '1px solid #dee2e6' }}>العام الجامعي</th>

                            <th style={{ padding: '8px 10px', border: '1px solid #dee2e6' }}>الفصل الدراسي الأول</th>

                            <th style={{ padding: '8px 10px', border: '1px solid #dee2e6' }}>الفصل الدراسي الثاني</th>

                            <th style={{ padding: '8px 10px', border: '1px solid #dee2e6' }}>الفصل الصيفي</th>

                            <th style={{ padding: '8px 10px', border: '1px solid #dee2e6', width: '75px' }}>الحالة</th>

                          </tr>

                        </thead>

                        <tbody>

                          {academicYears.map((ay) => {

                            const yData = formData.academic_year_weeks?.[ay.name] || {};

                            const isCurrentActive = (modalActiveYear || formData.academic_year || academicYears[0]?.name) === ay.name;

                            return (

                              <tr

                                key={ay.id || ay.name}

                                onClick={() => setModalActiveYear(ay.name)}

                                style={{

                                  backgroundColor: isCurrentActive ? '#e8f5e9' : 'transparent',

                                  cursor: 'pointer',

                                  fontWeight: isCurrentActive ? 'bold' : 'normal',

                                  transition: 'background-color 0.15s ease'

                                }}

                              >

                                <td style={{ padding: '7px 10px', border: '1px solid #dee2e6', fontWeight: '600' }}>{ay.name}</td>

                                <td style={{ padding: '7px 10px', border: '1px solid #dee2e6' }}>

                                  {yData.semester1_weeks ? (

                                    <span style={{ color: '#1b5e20', fontWeight: 'bold' }}>{formatWeekCountText(yData.semester1_weeks)}</span>

                                  ) : (

                                    <span style={{ color: '#777' }}>{formatWeekCountText(ay.semester1_weeks || 15)} (افتراضي)</span>

                                  )}

                                </td>

                                <td style={{ padding: '7px 10px', border: '1px solid #dee2e6' }}>

                                  {yData.semester2_weeks ? (

                                    <span style={{ color: '#1b5e20', fontWeight: 'bold' }}>{formatWeekCountText(yData.semester2_weeks)}</span>

                                  ) : (

                                    <span style={{ color: '#777' }}>{formatWeekCountText(ay.semester2_weeks || 15)} (افتراضي)</span>

                                  )}

                                </td>

                                <td style={{ padding: '7px 10px', border: '1px solid #dee2e6' }}>

                                  {yData.summer_weeks ? (

                                    <span style={{ color: '#1b5e20', fontWeight: 'bold' }}>{formatWeekCountText(yData.summer_weeks)}</span>

                                  ) : (

                                    <span style={{ color: '#777' }}>{formatWeekCountText(ay.summer_weeks || 8)} (افتراضي)</span>

                                  )}

                                </td>

                                <td style={{ padding: '7px 10px', border: '1px solid #dee2e6' }}>

                                  <span style={{

                                    fontSize: '12px',

                                    padding: '3px 8px',

                                    borderRadius: '5px',

                                    backgroundColor: isCurrentActive ? '#2e7d32' : '#e9ecef',

                                    color: isCurrentActive ? '#ffffff' : '#495057',

                                    fontWeight: 'bold'

                                  }}>

                                    {isCurrentActive ? "محدد" : "تعديل"}

                                  </span>

                                </td>

                              </tr>

                            );

                          })}

                        </tbody>

                      </table>

                    </div>

                  )}

                </>

              ) : (

                /* وضع الرؤية فقط (View Mode): جدول نظيف ومباشر لجميع الأعوام */

                academicYears.length > 0 && (

                  <div style={{ overflowX: 'auto' }}>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'center', backgroundColor: '#fff', border: '1.5px solid #c8e6c9', borderRadius: '6px' }}>

                      <thead>

                        <tr style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>

                          <th style={{ padding: '10px 12px', border: '1px solid #c8e6c9', fontSize: '14.5px' }}>العام الجامعي</th>

                          <th style={{ padding: '10px 12px', border: '1px solid #c8e6c9', fontSize: '14.5px' }}>الفصل الدراسي الأول</th>

                          <th style={{ padding: '10px 12px', border: '1px solid #c8e6c9', fontSize: '14.5px' }}>الفصل الدراسي الثاني</th>

                          <th style={{ padding: '10px 12px', border: '1px solid #c8e6c9', fontSize: '14.5px' }}>الفصل الصيفي</th>

                        </tr>

                      </thead>

                      <tbody>

                        {academicYears.map((ay) => {

                          const yData = formData.academic_year_weeks?.[ay.name] || {};

                          return (

                            <tr

                              key={ay.id || ay.name}

                              style={{

                                borderBottom: '1px solid #dee2e6'

                              }}

                            >

                              <td style={{ padding: '9px 12px', border: '1px solid #e0e0e0', fontWeight: 'bold', color: '#333' }}>{ay.name}</td>

                              <td style={{ padding: '9px 12px', border: '1px solid #e0e0e0' }}>

                                <span style={{ color: yData.semester1_weeks ? '#1b5e20' : '#444', fontWeight: 'bold' }}>

                                  {yData.semester1_weeks ? formatWeekCountText(yData.semester1_weeks) : formatWeekCountText(ay.semester1_weeks || 15)}

                                </span>

                              </td>

                              <td style={{ padding: '9px 12px', border: '1px solid #e0e0e0' }}>

                                <span style={{ color: yData.semester2_weeks ? '#1b5e20' : '#444', fontWeight: 'bold' }}>

                                  {yData.semester2_weeks ? formatWeekCountText(yData.semester2_weeks) : formatWeekCountText(ay.semester2_weeks || 15)}

                                </span>

                              </td>

                              <td style={{ padding: '9px 12px', border: '1px solid #e0e0e0' }}>

                                <span style={{ color: yData.summer_weeks ? '#1b5e20' : '#444', fontWeight: 'bold' }}>

                                  {yData.summer_weeks ? formatWeekCountText(yData.summer_weeks) : formatWeekCountText(ay.summer_weeks || 8)}

                                </span>

                              </td>

                            </tr>

                          );

                        })}

                      </tbody>

                    </table>

                  </div>

                )

              )}

            </div>



            {/* قسم الكليات والتكليفات من الخطة الدراسية */}

            <div style={{ marginTop: '15px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>

              <div style={{ marginBottom: '15px' }}>

                <label style={{ fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>الكليات التابع لها</label>

                <Select

                  isMulti

                  isDisabled={modalMode === 'view'}

                  placeholder="ابحث/اختر الكليات..."

                  styles={customSelectStyles}

                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}

                  noOptionsMessage={() => "لا توجد نتائج"}

                  options={faculties.map(f => ({ value: String(f.id), label: f.name }))}

                  value={selectedFaculties}

                  onChange={(selected) => setSelectedFaculties(selected || [])}

                  isSearchable={true}

                  isClearable={true}

                />

                {errors.faculties && <span style={{ color: 'red', fontSize: '12px', display: 'block', marginTop: '5px' }}>{errors.faculties}</span>}

              </div>



              {modalMode === 'view' && (

                <div style={{ marginTop: '20px' }}>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>

                    <h5 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }}>المقررات المكلف بها (من الخطة الدراسية)</h5>

                  </div>



                  {(() => {

                    const assignmentsByYear = professorAssignments.reduce((acc, curr) => {

                      if (!acc[curr.academic_year]) acc[curr.academic_year] = [];

                      acc[curr.academic_year].push(curr);

                      return acc;

                    }, {});



                    const sortedYears = Object.keys(assignmentsByYear).sort().reverse();

                    

                    if (sortedYears.length === 0) {

                      return <div className="text-center text-muted py-3">لا توجد تكليفات لعضو هيئة التدريس</div>;

                    }



                    const allYearsHtml = sortedYears.map(year => (

                      <div key={year} style={{ marginBottom: '25px' }}>

                        <h6 style={{ fontWeight: 'bold', backgroundColor: '#e9ecef', padding: '8px', borderRadius: '5px' }}>

                          للعام الجامعي: {year}

                        </h6>

                        <Table responsive bordered hover striped size="sm" style={{ textAlign: 'center' }}>

                          <thead>

                            <tr style={{ backgroundColor: '#2e7d32', color: 'white' }}>

                              <th>الكلية</th>

                              <th>البرنامج</th>

                              <th>اسم المقرر</th>

                              <th>المستوى</th>

                              <th>الفصل الدراسي</th>

                              <th>ساعات التدريس كل اسبوع</th>

                              <th>إجمالي الساعات في الترم للمقرر</th>

                            </tr>

                          </thead>

                          <tbody>

                            {(() => {

                              const yearAssignments = assignmentsByYear[year];

                              const facultySpans = [];

                              let i = 0;

                              while (i < yearAssignments.length) {

                                const currentFac = yearAssignments[i].faculty_name;

                                let count = 1;

                                while (i + count < yearAssignments.length && yearAssignments[i + count].faculty_name === currentFac) {

                                  count++;

                                }

                                facultySpans.push({ index: i, count: count, name: currentFac });

                                i += count;

                              }



                              return yearAssignments.map((assignment, idx) => {

                                const spanObj = facultySpans.find(s => s.index === idx);

                                const termHours = getTermTotalHours(assignment.hours, assignment.course_semester, assignment.academic_year || year);

                                return (

                                  <tr key={idx}>

                                    {spanObj && (

                                      <td

                                        rowSpan={spanObj.count}

                                        style={{ verticalAlign: 'middle', fontWeight: 'bold' }}

                                      >

                                        {spanObj.name}

                                      </td>

                                    )}

                                    <td>
                                      {assignment.program_name && assignment.program_name.includes(" - ") ? (
                                        assignment.program_name.split(" - ").map((p, pIdx) => (
                                          <div key={pIdx} style={{ lineHeight: "1.3" }}>
                                            {pIdx > 0 ? `- ${p.trim()}` : p.trim()}
                                          </div>
                                        ))
                                      ) : (
                                        assignment.program_name || "--"
                                      )}
                                    </td>

                                    <td>{assignment.course_name}</td>

                                    <td>{formatLvl(assignment.level)}</td>

                                    <td>{assignment.course_semester}</td>

                                    <td>{formatHours(assignment.hours)}</td>

                                    <td style={{ fontWeight: 'bold', color: '#1e40af' }}>{formatHours(termHours)}</td>

                                  </tr>

                                );

                              });

                            })()}

                          </tbody>

                          <tfoot>

                            <tr style={{ fontWeight: 'bold', backgroundColor: '#e9ecef' }}>

                              <td colSpan="5" style={{ textAlign: 'center', color: '#2e7d32' }}>إجمالي ساعات التدريس لهذا العام الجامعي</td>

                              <td style={{ textAlign: 'center', color: '#2e7d32' }}>

                                {formatHours(assignmentsByYear[year].reduce((sum, current) => sum + (current.hours || 0), 0))} ساعة

                              </td>

                              <td style={{ textAlign: 'center', color: '#1e40af' }}>

                                {formatHours(assignmentsByYear[year].reduce((sum, current) => sum + getTermTotalHours(current.hours, current.course_semester, current.academic_year || year), 0))} ساعة

                              </td>

                            </tr>

                          </tfoot>

                        </Table>

                      </div>

                    ));

                    

                    const grandTotalTerm = formatHours(professorAssignments.reduce((sum, curr) => sum + getTermTotalHours(curr.hours, curr.course_semester, curr.academic_year), 0));

                    return (

                      <>

                        {allYearsHtml}

                        {sortedYears.length > 0 && (

                          <div style={{ marginTop: '10px', padding: '12px 15px', backgroundColor: '#d4edda', borderRadius: '5px', border: '1px solid #c3e6cb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>

                            <h5 style={{ margin: 0, fontWeight: 'bold', color: '#155724', fontSize: '16px' }}>إجمالي ساعات تدريس عضو هيئة التدريس في جامعة المنوفية الأهلية عبر السنين</h5>
                            <h5 style={{ margin: 0, fontWeight: 'bold', color: '#155724', fontSize: '16px' }}>{grandTotalTerm} ساعة</h5>

                          </div>

                        )}

                      </>

                    );

                  })()}

                </div>

              )}

            </div>



            {/* 1. الكلية - تأكدي أن القيمة هي block.faculty_id */}

            {modalMode === 'view' ? (

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }} className="no-print">

                <Button variant="success" className="ms-2" onClick={handlePrintSingle}>

                  <i className="bi bi-printer"></i> طباعة

                </Button>

                <Button variant="primary" className="ms-2" onClick={handleDownloadPDFSingle}>

                  <i className="bi bi-file-pdf"></i> تنزيل PDF

                </Button>

                <Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button>

              </div>

            ) : (



              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>

                <button onClick={handleSave} className="btn-save-custom">حفظ البيانات</button>

                <button onClick={() => setShowModal(false)} className="btn-cancel-custom">إلغاء</button>

              </div>

            )}

          </div>

        </div>

      )}



      {/* مودال الطباعة والتصدير */}

      <Modal 

        show={showPrintModal} 

        onHide={() => setShowPrintModal(false)} 

        size="xl"

        dialogClassName="modal-80w"

      >

        <style>{`.modal-80w { max-width: 80vw !important; width: 80vw !important; }`}</style>

        <Modal.Header closeButton>

          <Modal.Title>تصدير بيانات اعضاء هيئة التدريس</Modal.Title>

        </Modal.Header>

        <Modal.Body>

          {/* سيرش داخل المودال */}

          <div className="mb-3">

            <div className="d-flex flex-column gap-3 mb-2">

              <div className="d-flex align-items-center flex-wrap gap-3">

                <input

                  className="form-control w-100"
                  placeholder="بحث باسم الأستاذ /وظيفته/ الكلية"
                  value={printSearchTerm}
                  onChange={(e) => setPrintSearchTerm(e.target.value)}
                />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto' }}>

                  <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>الدرجة العلمية:</label>

                  <select

                    className="form-select flex-fill"
                    value={printJobTitleFilter}
                    onChange={(e) => setPrintJobTitleFilter(e.target.value)}
                  >

                    <option value="الكل">الكل</option>

                    <option value="أ.م">أستاذ (أ.م)</option>

                    <option value="أ.م.د">أستاذ مساعد (أ.م.د)</option>

                    <option value="د">مدرس (د)</option>

                    <option value="م.م">مدرس مساعد (م.م)</option>

                    <option value="معيد">معيد</option>

                    <option value="أخصائي">أخصائي</option>

                  </select>

                </div>



                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto' }}>

                  <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>نوع التعاقد:</label>

                  <select

                    className="form-select"

                    value={printContractFilter}

                    onChange={(e) => setPrintContractFilter(e.target.value)}

                    style={{ flex: '1 1 auto' }}

                  >

                    <option value="الكل">الكل</option>

                    <option value="تعاقد كلي">تعاقد كلي</option>

                    <option value="تعاقد جزئي">تعاقد جزئي</option>

                    <option value="تعاقد بالساعة">تعاقد بالساعة</option>

                    <option value="بدون تعاقد">بدون تعاقد</option>

                  </select>

                </div>



                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '380px' }}>

                  <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>الكلية:</label>

                  <select

                    className="form-select"

                    value={printFacultyFilter}

                    onChange={(e) => setPrintFacultyFilter(e.target.value)}

                    style={{ minWidth: '300px' }}

                  >

                    <option value="الكل">الكل</option>

                    {faculties.map(f => (

                      <option key={f.id} value={f.id}>{f.name}</option>

                    ))}

                  </select>

                </div>

              </div>



              <div className="d-flex align-items-center flex-wrap gap-3">

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto' }}>

                  <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>العام الجامعي:</label>

                  <select

                    className="form-select"

                    value={exportAcademicYear}

                    onChange={(e) => setExportAcademicYear(e.target.value)}

                    style={{ width: '170px' }}

                  >

                    <option value="الكل">جميع الأعوام</option>

                    {academicYears.map(y => (

                      <option key={`exp-${y.id}`} value={y.name}>{y.name}</option>

                    ))}

                  </select>

                </div>



                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>

                  <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>المستوى:</label>

                  <select

                    className="form-select"

                    value={exportLevel}

                    onChange={(e) => setExportLevel(e.target.value)}

                    style={{ width: '145px' }}

                  >

                    <option value="الكل">الكل</option>

                    <option value="عام">عام</option>

                    <option value="الأول">الأول</option>

                    <option value="الثاني">الثاني</option>

                    <option value="الثالث">الثالث</option>

                    <option value="الرابع">الرابع</option>

                    <option value="الخامس">الخامس</option>

                  </select>

                </div>



                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>

                  <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>الفصل الدراسي:</label>

                  <select

                    className="form-select"

                    value={exportSemester}

                    onChange={(e) => setExportSemester(e.target.value)}

                    style={{ width: '145px' }}

                  >

                    <option value="الكل">الكل</option>

                    <option value="أول">أول</option>

                    <option value="ثاني">ثاني</option>

                    <option value="صيفي">صيفي</option>

                  </select>

                </div>



                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '320px' }}>

                  <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>بيانات غير مكتملة:</label>

                  <select

                    className="form-select"

                    value={printIncompleteFilter}

                    onChange={(e) => setPrintIncompleteFilter(e.target.value)}

                    style={{ minWidth: '220px' }}

                  >

                    <option value="">الكل</option>

                    <option value="phone">رقم الهاتف</option>

                    <option value="email">الاميل</option>

                    <option value="workplace">جهة العمل</option>

                    <option value="job_title">الدرجة العلمية</option>

                    <option value="contract_type">نوع التعاقد</option>

                    <option value="faculty">الكلية التابع لها</option>

                    <option value="mnu_job_title">طبيعة العمل داخل MNU</option>

                    <option value="weeks">أسابيع الحضور</option>

                  </select>

                </div>

                  

                  {(printSearchTerm !== "" || printFacultyFilter !== "الكل" || printJobTitleFilter !== "الكل" || printContractFilter !== "الكل" || printIncompleteFilter !== "" || exportAcademicYear !== "الكل" || exportSemester !== "الكل" || exportLevel !== "الكل") && (

                    <Button

                      variant="outline-secondary"

                      size="sm"

                      onClick={() => {

                        setPrintSearchTerm("");

                        setPrintFacultyFilter("الكل");

                        setPrintJobTitleFilter("الكل");

                        setPrintContractFilter("الكل");

                        setPrintIncompleteFilter("");

                        setExportAcademicYear("الكل");

                        setExportSemester("الكل");

                        setExportLevel("الكل");

                      }}

                      style={{ whiteSpace: 'nowrap', marginRight: '28px' , height: '35px'}}

                    >

                      إزالة الفلاتر

                    </Button>

                  )}

                </div>

              </div>

            </div>

            <div className="d-flex gap-2 mb-3 mt-3">

              <Button

                variant="outline-primary"

                size="sm"

                onClick={() => setSelectedRows(filteredPrint.map(p => p.id))}

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

            </div>



          {/* الجدول المخصص للطباعة */}

          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>

            <Table bordered hover striped responsive>

              <thead>

                <tr>

                  <th>

                    <input

                      type="checkbox"

                      checked={

                        filteredPrint.length > 0 &&

                        filteredPrint.every(p => selectedRows.includes(p.id))

                      }

                      onChange={(e) => {

                        const filteredIds = filteredPrint.map(p => p.id);

                        if (e.target.checked) {

                          setSelectedRows(Array.from(new Set([...selectedRows, ...filteredIds])));

                        } else {

                          setSelectedRows(selectedRows.filter(id => !filteredIds.includes(id)));

                        }

                      }}

                    />

                  </th>

                  <th>اسم عضو هيئة التدريس</th>

                  {printJobTitleFilter === "الكل" && <th>الدرجة العلمية</th>}

                  <th>نوع التعاقد والأيام</th>

                  <th>الكلية التابع لها</th>



                </tr>

              </thead>

              <tbody>

                {filteredPrint.map(p => {

                  const facs = p.faculties && p.faculties.length > 0 ?

                    p.faculties.map(f => f.name).join(" - ") :

                    <span style={{ color: 'red' }}>لا توجد كلية</span>;



                  const contractBadge = p.contract_type ? (

                    p.contract_type === 'كلي' ? (

                      <span className="badge bg-success" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>تعاقد كلي - 5 أيام</span>

                    ) : p.contract_type === 'جزئي' ? (

                      <span className="badge bg-warning text-dark" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>تعاقد جزئي - {p.work_days || 'يومان'}</span>

                    ) : p.contract_type === 'بالساعة' ? (

                      <span className="badge bg-info text-dark" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>تعاقد بالساعة</span>

                    ) : (

                      <span className="badge bg-secondary" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>{p.contract_type}</span>

                    )

                  ) : (

                    <span className="text-muted" style={{ fontSize: '0.9rem' }}>غير محدد</span>

                  );





                  return (

                    <tr key={p.id}>

                      <td>

                        <input

                          type="checkbox"

                          checked={selectedRows.includes(p.id)}

                          onChange={() => {

                            if (selectedRows.includes(p.id)) {

                              setSelectedRows(selectedRows.filter(id => id !== p.id));

                            } else {

                              setSelectedRows([...selectedRows, p.id]);

                            }

                          }}

                        />

                      </td>

                      <td>{getProfAbbreviation(p)} / {p.name_ar}</td>

                      {printJobTitleFilter === "الكل" && <td><small className="text-muted">{getFullJobTitle(p.job_title) || "—"}</small></td>}

                      <td>{contractBadge}</td>

                      <td>{facs}</td>



                    </tr>

                  );

                })}

              </tbody>

            </Table>

          </div>

        </Modal.Body>

        <Modal.Footer className="gap-2">

          <Button className="btn-excel-custom" onClick={handleExportExcel}>

            <i className="bi bi-file-earmark-excel"></i> Excel

          </Button>

          <Button className="btn-cancel-custom" onClick={() => setShowPrintModal(false)}>إلغاء</Button>

        </Modal.Footer>

      </Modal>



      {/* مودال استيراد البيانات من إكسيل */}

      <Modal size="lg" show={showImportModal} onHide={() => {

        setShowImportModal(false);

        setExcelFile(null);

        setImportResult(null);

      }}>

        

        <Modal.Header closeButton>

          <Modal.Title>استيراد أعضاء هيئة التدريس من إكسيل</Modal.Title>

        </Modal.Header>

        <Modal.Body style={{ direction: 'rtl', textAlign: 'right' }}>

          <div className="alert alert-info py-2" style={{ fontSize: '16px', lineHeight: '1.8' }}>

            <strong>خطوات وقواعد الاستيراد الموحد:</strong>

            <ol className="mb-0 mt-1 pe-3">

              <li>قم بتحميل نموذج الإكسيل الفارغ بالضغط على الزر أدناه.</li>

              <li>قم بتعبئة بيانات أعضاء هيئة التدريس في النموذج، مع مراعاة الآتي:

                <ul className="mb-1 mt-1 pe-3" style={{ listStyleType: 'disc' }}>

                  <li><strong>الاسم (<span className="text-danger">إجباري</span>):</strong> يجب أن يكون ثلاثياً على الأقل.</li>

                  <li><strong>الرقم القومي (<span className="text-danger">إجباري</span>):</strong> رقم قومي مطابق للبطاقة الشخصية.</li>

                  <li><strong>الدرجة العلمية (<span className="text-danger">إجباري</span>):</strong> يجب اختيارها من القوائم المنسدلة المتاحة.</li>

                  <li><strong>جهة القدوم (<span className="text-danger">إجباري</span>):</strong> يجب كتابة مكان جهة القدوم.</li>

                  <li><strong>رقم الهاتف (<span className="text-danger">إجباري</span>):</strong> رقم هاتف مصري صحيح .</li>

                  <li><strong>البريد الإلكتروني (<span className="text-success">إختياري</span>):</strong> يجب كتابة البريد الإلكتروني بشكل صحيح.</li>

                  <li><strong>الكلية التابع لها (<span className="text-danger">إجباري</span>):</strong> يجب اختيارها من القوائم المنسدلة المتاحة.</li>

                  <li><strong>نوع التعاقد (<span className="text-danger">إجباري</span>):</strong> يجب اختيار نوع التعاقد من القائمة المنسدلة المتاحة: (تعاقد كلي - تعاقد جزئي - تعاقد بالساعة - بدون تعاقد).</li>

                  <li><strong>طبيعة العمل بجامعة المنوفية الأهلية (<span className="text-success">إختياري</span>):</strong> كتابة المسمى أو طبيعة العمل المكلف بها في جامعة المنوفية الأهلية إن وجد.</li>

                  <li><strong>أسابيع الحضور للفصول الدراسية (<span className="text-success">إختياري</span>):</strong> يمكن اختيار عدد أسابيع حضور الأستاذ من القوائم المنسدلة (الفصل الأول حتى 15 أسبوع، الفصل الثاني حتى 15 أسبوع، الفصل الصيفي حتى 8 أسابيع).</li>

                </ul>

              </li>

              <li>ارفع الملف النهائي بعد التعبئة لبدء الاستيراد.</li>

            </ol>

          </div>



          <Button

            variant="outline-success"

            onClick={handleDownloadTemplate}

            className="mb-4 w-100 fw-bold"

          >

            <i className="bi bi-download me-1"></i> تحميل نموذج الإكسيل الفارغ

          </Button>



          <Form.Group className="mb-3">

            <Form.Label className="fw-bold">ارفع ملف نموذج الإكسيل النهائي المعبأ بالبيانات:</Form.Label>

            <Form.Control

              type="file"

              accept=".xlsx, .xls"

              onChange={(e) => setExcelFile(e.target.files[0])}

            />

          </Form.Group>



          {importResult && (

            <div className={`alert ${importResult.success ? 'alert-success' : 'alert-danger'} mt-3 py-2`}>

              <div style={{ whiteSpace: 'pre-wrap', fontSize: '17px', fontWeight: 'bold', paddingRight: '8px' }}>{importResult.message}</div>

              {importResult.success && (

                <ul className="mb-2 mt-2" style={{ fontSize: '16px', lineHeight: '1.8', paddingRight: '24px' }}>

                  <li>تم إضافة أعضاء جدد: {importResult.imported}

                    {importResult.imported_names && importResult.imported_names.length > 0 && (

                      <ul className="mb-0 text-muted" style={{ listStyleType: 'circle', paddingInlineStart: '20px' }}>

                        {importResult.imported_names.map((name, idx) => (

                          <li key={idx}>{name}</li>

                        ))}

                      </ul>

                    )}

                  </li>

                  <li>تم تحديث أعضاء موجودين: {importResult.updated}

                    {importResult.updated_names && importResult.updated_names.length > 0 && (

                      <ul className="mb-0 text-muted" style={{ listStyleType: 'circle', paddingInlineStart: '20px' }}>

                        {importResult.updated_names.map((name, idx) => (

                          <li key={idx}>{name}</li>

                        ))}

                      </ul>

                    )}

                  </li>

                  <li>إجمالي الأعضاء المعالجين بنجاح: {importResult.total}</li>

                </ul>

              )}

              {importResult.errors && importResult.errors.length > 0 && (

                <div className="mt-2 pt-2 border-top border-danger">

                  <strong className="text-danger" style={{ fontSize: '17px' }}>الأعضاء الذين لم يتم استيرادهم لوجود أخطاء:</strong>

                  <ul className="mb-0 mt-2 text-danger" style={{ fontSize: '16px', lineHeight: '1.8' }}>

                    {importResult.errors.map((err, idx) => (

                      <li key={idx}>{err}</li>

                    ))}

                  </ul>

                </div>

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

    </div>

  );

};



// التنسيقات ثابتة

const inputStyle = { padding: '8px', width: '100%', marginBottom: '5px' };

const addBtnStyle = { padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };

const submitBtnStyle = {};

const cancelStyle = {};

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' };

const modalContentStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '850px', maxWidth: '95%', minHeight: '620px', maxHeight: '92vh', overflowY: 'auto' };



export default ProfessorsPage;



