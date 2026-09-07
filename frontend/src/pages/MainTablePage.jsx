import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Table, Spinner, Card, Modal, Badge } from 'react-bootstrap';
import { FaTable, FaPrint } from 'react-icons/fa';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import logo from '../assets/logo.png';

const API = "";

const customSelectStyles = {
    control: (provided, state) => ({
        ...provided,
        borderRadius: '0.375rem',
        borderColor: state.isFocused ? '#2e7d32' : '#dee2e6',
        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(46, 125, 50, 0.25)' : null,
        '&:hover': {
            borderColor: '#2e7d32'
        },
        minHeight: '38px',
        fontSize: '0.95rem'
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#2e7d32' : state.isFocused ? '#e8f5e9' : null,
        color: state.isSelected ? 'white' : '#212529',
        cursor: 'pointer',
        fontSize: '0.95rem'
    }),
    menu: (provided) => ({
        ...provided,
        zIndex: 9999
    })
};

const getFullJobTitle = (title) => {
    if (!title) return "";
    const t = String(title).trim();
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

const getProfAbbreviation = (prof) => {
    if (!prof) return "";
    const rawTitle = typeof prof === 'string' ? prof : (prof.job_title || prof.title || "");
    const t = String(rawTitle).trim();

    if (t === "أستاذ" || t === "أ.م" || t.includes("أستاذ دكتور") || t === "أ.د") return "أ.م";
    if (t === "أستاذ مساعد" || t === "أ.م.د") return "أ.م.د";
    if (t === "مدرس" || t === "د" || t === "د.") return "د";
    if (t === "مدرس مساعد" || t === "م.م" || t === "م.م.") return "م.م";
    if (t === "أخصائي" || t === "اخصائي") return "أخصائي";

    if (t === "معيد" || t === "م.ع" || t === "معيدة" || t === "أ" || t === "ط" || t === "ص" || t === "م" || t === "مع.") {
        let facList = prof?.faculties || [];
        const facStr = Array.isArray(facList) ? facList.join(' ') : String(facList);
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

const formatWeekCountText = (count) => {
    const n = Number(count);
    if (!n || isNaN(n)) return "";
    if (n === 1) return "أسبوع واحد";
    if (n === 2) return "أسبوعان";
    if (n >= 3 && n <= 10) return `${n} أسابيع`;
    return `${n} أسبوع`;
};

const getProfWeeksBreakdown = (prof, targetYear, academicYears) => {
    if (!prof) return { sem1: "15 أسبوع", sem2: "14 أسبوع", summer: "7 أسابيع" };
    const yName = targetYear || prof.academic_year || (academicYears && academicYears.length > 0 ? academicYears[0].name : "2026/2027");
    const ayObj = (academicYears || []).find(y => y.name === yName) || {};

    let parsedAyWeeks = {};
    if (prof.academic_year_weeks) {
        if (typeof prof.academic_year_weeks === "string") {
            try { parsedAyWeeks = JSON.parse(prof.academic_year_weeks); } catch (e) { parsedAyWeeks = {}; }
        } else if (typeof prof.academic_year_weeks === "object") {
            parsedAyWeeks = prof.academic_year_weeks;
        }
    }

    const currentYearData = parsedAyWeeks[yName] || {};
    const isTargetYearMatch = (prof.academic_year === yName);

    const s1 = currentYearData.semester1_weeks ?? (isTargetYearMatch ? prof.semester1_weeks : null) ?? ayObj.semester1_weeks ?? 15;
    const s2 = currentYearData.semester2_weeks ?? (isTargetYearMatch ? prof.semester2_weeks : null) ?? ayObj.semester2_weeks ?? 14;
    const s3 = currentYearData.summer_weeks ?? (isTargetYearMatch ? prof.summer_weeks : null) ?? ayObj.summer_weeks ?? 7;

    return {
        s1Num: s1,
        s2Num: s2,
        s3Num: s3,
        sem1: formatWeekCountText(s1) || `${s1} أسبوع`,
        sem2: formatWeekCountText(s2) || `${s2} أسبوع`,
        summer: formatWeekCountText(s3) || `${s3} أسبوع`,
    };
};

const getProfNameWithAbv = (prof) => {
    if (!prof) return "–";
    const name = prof.professor_name || prof.name_ar || prof.name || "";
    if (!name) return "–";
    const abv = getProfAbbreviation(prof);
    return abv ? `${abv} / ${name}` : name;
};

const getProfFacultyName = (prof) => {
    if (!prof) return "";
    if (prof.faculty_name) return prof.faculty_name;
    if (prof.faculties && Array.isArray(prof.faculties) && prof.faculties.length > 0) {
        return prof.faculties.map(f => typeof f === 'string' ? f : (f.name_ar || f.name || '')).filter(Boolean).join('، ');
    }
    if (prof.original_workplace) return prof.original_workplace;
    return "";
};

const getCourseBaseName = (c) => {
    if (!c) return '';
    if (typeof c === 'object') return `${c.course_name || ''} ${c.course_code || ''}`.trim();
    return c.split(' (')[0].trim();
};

const renderCourseItemHTML = (c) => {
    if (!c) return "";
    if (typeof c === 'object') {
        const cName = (c.course_name || "").trim();
        const cCode = (c.course_code || "").trim();
        let title = cName;
        if (cCode && cName && !cName.includes(cCode)) {
            title = `${cName} (${cCode})`;
        } else if (!title && cCode) {
            title = cCode;
        }

        if (c.is_module && c.dept_details && c.dept_details.length > 0) {
            const deptsHTML = c.dept_details.map(dept => {
                let name = typeof dept === 'object' ? (dept.dept_name || '') : dept;
                let hrs = typeof dept === 'object' ? (dept.hours != null ? `${dept.hours}` : '') : '';
                if (typeof dept === 'string') {
                    const parts = dept.split(':');
                    if (parts.length === 2) {
                        name = parts[0].trim();
                        hrs = parts[1].replace('س', '').trim();
                    }
                }
                if (!name || name === '-' || name === 'عام') return '';
                return `<div style="margin-top:2px; text-align:center;">
                    <span style="display:inline-flex; align-items:center; justify-content:center; direction:rtl; gap:3px; font-size:7.5pt; color:#444; font-weight:bold;">
                        <span>(</span>
                        <span>${name}</span>
                        <span>:</span>
                        <span style="direction:rtl;">${hrs} س</span>
                        <span>)</span>
                    </span>
                </div>`;
            }).filter(Boolean).join('');

            return `<div style="margin-bottom:6px; text-align:center; word-break:break-word;">
                <div style="color:#1b5e20; font-weight:bold; font-size:8.5pt; line-height:1.3; word-break:break-word;">
                    <span style="display:inline-flex; align-items:center; justify-content:center; direction:rtl; gap:3px;">
                        <span>•</span>
                        <span>${title}</span>
                    </span>
                </div>
                ${deptsHTML}
            </div>`;
        }
        const text = c.display_text || title;
        return `<div style="margin-bottom:4px; color:#2e7d32; font-weight:bold; font-size:8.5pt; text-align:center; word-break:break-word; line-height:1.3;">
            <span style="display:inline-flex; align-items:center; justify-content:center; direction:rtl; gap:3px;">
                <span>•</span>
                <span>${text}</span>
            </span>
        </div>`;
    }
    return `<div style="margin-bottom:3px; color:#2e7d32; font-weight:600; text-align:center; word-break:break-word; line-height:1.3;">• ${String(c).replace('ساعة)', 'س)')}</div>`;
};

const renderCourseItemUI = (c, i) => {
    if (!c) return null;
    if (typeof c === 'object') {
        const cName = (c.course_name || "").trim();
        const cCode = (c.course_code || "").trim();
        let title = cName;
        if (cCode && cName && !cName.includes(cCode)) {
            title = `${cName} (${cCode})`;
        } else if (!title && cCode) {
            title = cCode;
        }

        if (c.is_module && c.dept_details && c.dept_details.length > 0) {
            return (
                <div key={i} className="mb-2 text-center" style={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
                    <div className="text-success fw-bold" style={{ fontSize: '0.85rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', gap: '3px' }}>
                            <span>•</span>
                            <span>{title}</span>
                        </span>
                    </div>
                    {c.dept_details.map((dept, di) => {
                        let name = typeof dept === 'object' ? (dept.dept_name || '') : dept;
                        let hrs = typeof dept === 'object' ? (dept.hours != null ? `${dept.hours}` : '') : '';
                        if (typeof dept === 'string') {
                            const parts = dept.split(':');
                            if (parts.length === 2) {
                                name = parts[0].trim();
                                hrs = parts[1].replace('س', '').trim();
                            }
                        }
                        if (!name || name === '-' || name === 'عام') return null;
                        return (
                            <div key={di} style={{ marginTop: '2px' }}>
                                <span 
                                    className="text-secondary fw-semibold" 
                                    style={{ 
                                        fontSize: '0.78rem', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        direction: 'rtl', 
                                        gap: '3px' 
                                    }}
                                >
                                    <span>(</span>
                                    <span>{name}</span>
                                    <span>:</span>
                                    <span style={{ direction: 'rtl' }}>{hrs} س</span>
                                    <span>)</span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        }
        return (
            <div key={i} className="mb-2 text-success fw-semibold text-center" style={{ fontSize: '0.85rem', lineHeight: 1.3, wordBreak: 'break-word' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', gap: '3px' }}>
                    <span>•</span>
                    <span>{c.display_text || title}</span>
                </span>
            </div>
        );
    }
    return (
        <div key={i} className="mb-2 text-success fw-semibold text-center" style={{ fontSize: '0.85rem', lineHeight: 1.3, wordBreak: 'break-word' }}>
            • {String(c).replace('ساعة)', 'س)')}
        </div>
    );
};

const MainTablePage = () => {
    const { user } = useContext(AuthContext);
    const isAllFacultiesUser = !user || user.role === 'admin' || user.role === 'student_affairs' || user.role === 'manager' || user.all_faculties_access || (user.assigned_faculties && user.assigned_faculties.length > 1) || (user.faculties && user.faculties.length > 1);
    const [report, setReport] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedYear, setSelectedYear] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState("");

    // Modal state for Professors
    const [showProfsModal, setShowProfsModal] = useState(false);
    const [modalYear, setModalYear] = useState("");
    const [modalFaculty, setModalFaculty] = useState("");
    const [modalProfSearch, setModalProfSearch] = useState("");
    const [modalProfs, setModalProfs] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [signatures, setSignatures] = useState([]);
    const [modalSignatures, setModalSignatures] = useState([]);

    useEffect(() => {
        const fetchSignatures = async () => {
            const effFaculty = selectedFaculty || (faculties.length > 0 ? String(faculties[0].id) : "");

            if (!effFaculty) {
                setSignatures([]);
                return;
            }
            try {
                let res = await axios.get(`${API}/api/signatures?faculty_id=${effFaculty}&report_type=${encodeURIComponent("الجدول الرئيسي")}`);
                if (!res.data || res.data.length === 0) {
                    res = await axios.get(`${API}/api/signatures?faculty_id=${effFaculty}&report_type=${encodeURIComponent("الخطة الدراسية")}`);
                }
                setSignatures(res.data || []);
            } catch (err) {
                console.error("Error fetching signatures for main table", err);
            }
        };
        fetchSignatures();
    }, [selectedFaculty, faculties]);

    useEffect(() => {
        const fetchModalSignatures = async () => {
            const effFaculty = modalFaculty || selectedFaculty || (faculties.length > 0 ? String(faculties[0].id) : "");

            if (!effFaculty) {
                setModalSignatures([]);
                return;
            }
            try {
                let res = await axios.get(`${API}/api/signatures?faculty_id=${effFaculty}&report_type=${encodeURIComponent("الجدول الرئيسي")}`);
                if (!res.data || res.data.length === 0) {
                    res = await axios.get(`${API}/api/signatures?faculty_id=${effFaculty}&report_type=${encodeURIComponent("الخطة الدراسية")}`);
                }
                setModalSignatures(res.data || []);
            } catch (err) {
                console.error("Error fetching modal signatures", err);
            }
        };
        fetchModalSignatures();
    }, [modalFaculty, selectedFaculty, faculties]);

    const yearSelectOptions = [
        { value: "", label: "جميع الأعوام" },
        ...academicYears.map(y => ({ value: y.name, label: y.name }))
    ];

    const facultySelectOptions = (faculties.length > 1)
        ? [
            { value: "", label: "جميع الكليات" },
            ...faculties.map(f => ({ value: String(f.id), label: f.name }))
          ]
        : faculties.map(f => ({ value: String(f.id), label: f.name }));

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [facRes, yearsRes] = await Promise.all([
                    axios.get(`${API}/api/faculties`),
                    axios.get(`${API}/api/academic-years`)
                ]);
                const loadedFaculties = facRes.data || [];
                setFaculties(loadedFaculties);
                if (loadedFaculties.length === 1) {
                    setSelectedFaculty(String(loadedFaculties[0].id));
                    setModalFaculty(String(loadedFaculties[0].id));
                } else {
                    setSelectedFaculty("");
                    setModalFaculty("");
                }
                
                const loadedYears = yearsRes.data || [];
                setAcademicYears(loadedYears);
                if (loadedYears.length > 0) {
                    setSelectedYear(loadedYears[0].name);
                    setModalYear(loadedYears[0].name);
                }
            } catch (err) {
                console.error("Error fetching filter metadata", err);
            }
        };
        fetchMetadata();
    }, []);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                setLoading(true);
                const params = {};
                if (selectedYear) params.academic_year = selectedYear;
                if (selectedFaculty) params.faculty_id = selectedFaculty;
                params._t = Date.now();

                const res = await axios.get(`${API}/api/main-table-report`, { params });
                setReport(res.data || []);
            } catch (err) {
                console.error("Error fetching main table report", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [selectedYear, selectedFaculty, user]);

    // Fetch professors report when modal is open or modal filters change
    useEffect(() => {
        if (!showProfsModal) return;

        const fetchProfsReport = async () => {
            try {
                setModalLoading(true);
                const params = {};
                if (modalYear) params.academic_year = modalYear;
                
                let defaultFacModal = "";
                if (user && !isAllFacultiesUser) {
                    if (user.faculties && user.faculties.length > 0) defaultFacModal = String(user.faculties[0]);
                    else if (user.faculty_id) defaultFacModal = String(user.faculty_id);
                }

                const effFaculty = (user && !isAllFacultiesUser && defaultFacModal)
                    ? defaultFacModal
                    : modalFaculty;

                if (effFaculty) params.faculty_id = effFaculty;
                params._t = Date.now();

                const res = await axios.get(`${API}/api/professors-report`, { params });
                
                let data = res.data;
                setModalProfs(data);
            } catch (err) {
                console.error("Error fetching professors report", err);
            } finally {
                setModalLoading(false);
            }
        };
        fetchProfsReport();
    }, [showProfsModal, modalYear, modalFaculty, user, faculties]);



    // Flatten report data to compute rowSpans and build rows
    const getFlattenedRows = () => {
        const flatRows = [];
        
        report.forEach((faculty) => {
            const isMedicine = faculty.faculty_name.includes("الطب والجراحة");
            const programsCount = faculty.programs.length;
            // For Medicine, we replace the single program with two sub-rows
            const extraRows = isMedicine ? 1 : 0;
            const facultySpan = programsCount + extraRows + 1;
            
            let isFirstFacultyRow = true;
            
            faculty.programs.forEach((program) => {
                if (isMedicine) {
                    flatRows.push({
                        isTotalRow: false,
                        facultyName: faculty.faculty_name,
                        facultySubText: isFirstFacultyRow && isMedicine ? "برنامج الطب و الجراحة اللائحة الجديدة" : "",
                        facultySpan: isFirstFacultyRow ? facultySpan : 0,
                        programName: "الحزم الدراسية",
                        coursesCountT1: program.bundles_count_t1 !== undefined ? program.bundles_count_t1 : 0,
                        coursesCountT2: program.bundles_count_t2 !== undefined ? program.bundles_count_t2 : 0,
                        coursesCountT3: program.bundles_count_t3 !== undefined ? program.bundles_count_t3 : 0,
                        professorsCountT1: program.professors_count_t1,
                        professorsCountT2: program.professors_count_t2,
                        professorsCountT3: program.professors_count_t3
                    });
                    isFirstFacultyRow = false;

                    flatRows.push({
                        isTotalRow: false,
                        facultyName: faculty.faculty_name,
                        facultySubText: "",
                        facultySpan: 0,
                        programName: "المقررات الطولية",
                        coursesCountT1: program.long_count_t1 !== undefined ? program.long_count_t1 : 0,
                        coursesCountT2: program.long_count_t2 !== undefined ? program.long_count_t2 : 0,
                        coursesCountT3: program.long_count_t3 !== undefined ? program.long_count_t3 : 0,
                        professorsCountT1: 0,
                        professorsCountT2: 0,
                        professorsCountT3: 0
                    });
                } else {
                    flatRows.push({
                        isTotalRow: false,
                        facultyName: faculty.faculty_name,
                        facultySubText: "",
                        facultySpan: isFirstFacultyRow ? facultySpan : 0,
                        programName: program.program_name,
                        coursesCountT1: program.courses_count_t1,
                        coursesCountT2: program.courses_count_t2,
                        coursesCountT3: program.courses_count_t3,
                        professorsCountT1: program.professors_count_t1,
                        professorsCountT2: program.professors_count_t2,
                        professorsCountT3: program.professors_count_t3
                    });
                    isFirstFacultyRow = false;
                }
            });
            
            // Push the totals row for this faculty
            flatRows.push({
                isTotalRow: true,
                facultyName: faculty.faculty_name,
                facultySpan: isFirstFacultyRow ? facultySpan : 0,
                programName: selectedFaculty ? "الإجمالي لكل ترم" : `الإجمالي لكل ترم (عدد البرامج: ${programsCount})`,
                coursesCountT1: faculty.total_courses_t1,
                coursesCountT2: faculty.total_courses_t2,
                coursesCountT3: faculty.total_courses_t3,
                professorsCountT1: faculty.total_professors_t1,
                professorsCountT2: faculty.total_professors_t2,
                professorsCountT3: faculty.total_professors_t3
            });
        });
        
        return flatRows;
    };

    const rows = getFlattenedRows();

    // Calculate Grand Totals
    const grandTotalColleges = report.length;
    const grandTotalPrograms = report.reduce((acc, f) => acc + f.programs.length, 0);
    const grandTotalCoursesT1 = report.reduce((acc, f) => acc + f.total_courses_t1, 0);
    const grandTotalCoursesT2 = report.reduce((acc, f) => acc + f.total_courses_t2, 0);
    const grandTotalCoursesT3 = report.reduce((acc, f) => acc + f.total_courses_t3, 0);
    const grandTotalProfsT1 = report.reduce((acc, f) => acc + f.total_professors_t1, 0);
    const grandTotalProfsT2 = report.reduce((acc, f) => acc + f.total_professors_t2, 0);
    const grandTotalProfsT3 = report.reduce((acc, f) => acc + f.total_professors_t3, 0);

    const totalAllCourses = grandTotalCoursesT1 + grandTotalCoursesT2 + grandTotalCoursesT3;
    const totalAllProfs = grandTotalProfsT1 + grandTotalProfsT2 + grandTotalProfsT3;

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

    const handlePrintMainTable = () => {
        const facName = faculties.find(f => String(f.id) === String(selectedFaculty))?.name || "جميع الكليات";
        const documentTitle = `الجدول الرئيسي الموحد - ${facName} - العام الجامعي ${selectedYear}`;

        // تسجيل حدث طباعة الجدول الرئيسي في الإشعارات
        const fids = selectedFaculty ? [Number(selectedFaculty)] : (faculties.map(f => f.id));
        const notifText = selectedFaculty 
            ? `قام بطباعة الجدول الرئيسي الموحد لكلية ${facName}` 
            : `قام بطباعة الجدول الرئيسي الموحد لجميع الكليات`;
        logAction(notifText, fids.length > 0 ? fids : null, selectedYear || null, null);

        let tableRowsHTML = "";
        rows.forEach((row, idx) => {
            const isNewFacultyStart = idx > 0 && row.facultySpan > 0;
            const borderTopStyle = isNewFacultyStart ? "border-top: 3px solid #2e7d32;" : "";
            const bgStyle = row.isTotalRow ? "background-color: #e8f5e9 !important; font-weight: bold; color: #1b5e20 !important; font-size: 11.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact;" : "";

            tableRowsHTML += `<tr style="${borderTopStyle} ${bgStyle}">`;
            if (row.facultySpan > 0) {
                const subTextHTML = row.facultySubText ? `<br/><span style="color: #444; font-size: 0.95em; font-weight: bold;">${row.facultySubText}</span>` : "";
                tableRowsHTML += `<td rowspan="${row.facultySpan}" style="font-weight: bold; background-color: #f8f9fa; vertical-align: top; padding-top: 10px;">${row.facultyName}${subTextHTML}</td>`;
            }
            tableRowsHTML += `
                <td style="${row.isTotalRow ? 'font-weight: bold;' : ''}">${row.programName}</td>
                <td>${row.coursesCountT1}</td>
                <td>${row.coursesCountT2}</td>
                <td>${row.coursesCountT3}</td>
                <td>${row.professorsCountT1}</td>
                <td>${row.professorsCountT2}</td>
                <td>${row.professorsCountT3}</td>
            </tr>`;
        });

        const showGrandTotalRow = !selectedFaculty;
        const grandTotalHTML = `
            ${showGrandTotalRow ? `
            <tr style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold; border-top: 2.5px solid #2e7d32; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold;">الإجمالي العام لكل ترم</td>
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold;">عدد البرامج: ${grandTotalPrograms}</td>
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold;">${grandTotalCoursesT1}</td>
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold;">${grandTotalCoursesT2}</td>
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold;">${grandTotalCoursesT3}</td>
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold;">${grandTotalProfsT1}</td>
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold;">${grandTotalProfsT2}</td>
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold;">${grandTotalProfsT3}</td>
            </tr>
            ` : ''}
            <tr style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold; border-top: 2.5px solid #2e7d32; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold; padding: 10px;">الإجمالي بالعام الجامعي</td>
                <td style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold; padding: 10px;">${!selectedFaculty ? `عدد البرامج = ${grandTotalPrograms} في ${grandTotalColleges} كليات` : `عدد البرامج = ${grandTotalPrograms}`}</td>
                <td colspan="3" style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold; padding: 10px;">إجمالي عدد المقرارات = ${totalAllCourses}</td>
                <td colspan="3" style="background-color: #e8f5e9 !important; color: #1b5e20 !important; font-weight: bold; padding: 10px;">إجمالي عدد أعضاء هيئة التدريس = ${totalAllProfs}</td>
            </tr>
        `;

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>${documentTitle}</title>
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
                            padding: 5px 6px;
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
                            font-size: 10.5pt;
                            border: 1px solid #1b5e20 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .header-row-sub th {
                            background-color: #4caf50 !important;
                            color: #ffffff !important;
                            font-weight: bold;
                            font-size: 8.5pt;
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
                            <colgroup>
                                <col style="width: 18%;">
                                <col style="width: 22%;">
                                <col style="width: 10%;"><col style="width: 10%;"><col style="width: 10%;">
                                <col style="width: 10%;"><col style="width: 10%;"><col style="width: 10%;">
                            </colgroup>
                            <thead>
                                <tr style="border: none !important;">
                                    <th colspan="8" style="border: none !important; background: transparent !important; color: inherit; padding: 10px 0 6px 0; font-weight: normal;">
                                        <div style="position: relative; width: 100%; box-sizing: border-box;">
                                            <div style="position: absolute; left: 0; top: 0; z-index: 10;">
                                                <img src="${window.location.origin}${logo}" width="80" height="80" style="object-fit: contain; display: block; float: left;" />
                                            </div>
                                            <div style="position: absolute; right: 0; top: 0; text-align: right; line-height: 1.35; white-space: nowrap;">
                                                <div style="font-size: 13.5pt; font-weight: bold; color: #1b5e20;">جامعة المنوفية الأهلية</div>
                                                <div style="font-size: 11pt; font-weight: bold; color: #222; margin-top: 2px;">شئون التعليم والطلاب</div>
                                            </div>
                                            <div style="width: 100%; text-align: center; line-height: 1.35; padding: 0 140px; box-sizing: border-box;">
                                                <div style="font-size: 16pt; font-weight: bold; color: #1b5e20; white-space: nowrap;">الجدول الرئيسي الموحد</div>
                                                <div style="font-size: 11.5pt; font-weight: bold; color: #222; margin-top: 3px; white-space: nowrap;">
                                                    <span>${facName}</span> &nbsp;&nbsp;   &nbsp;&nbsp; <span>العام الجامعي ${selectedYear || "جميع الأعوام"}</span>
                                                </div>
                                            </div>
                                            <div style="width: 100%; text-align: center; font-weight: bold; font-size: 10.5pt; color: #1b5e20; margin-top: 6px; margin-bottom: 2px; padding: 0; box-sizing: border-box;">
                                                بيان إحصائي بتوزيع المقرارات وأعضاء هيئة التدريس على مستوى الفصول الدراسية للعام الجامعي تبعاً للخطة الدراسية المعتمدة
                                            </div>
                                        </div>
                                    </th>
                                </tr>
                                <tr class="header-row-main">
                                    <th rowspan="2" style="width: 18%;">اسم الكلية</th>
                                    <th rowspan="2" style="width: 22%;">اسم البرنامج</th>
                                    <th colspan="3" style="width: 30%;">عدد المقرارات في كل برنامج</th>
                                    <th colspan="3" style="width: 30%;">عدد أعضاء هيئة التدريس الموجودين في كل برنامج</th>
                                </tr>
                                <tr class="header-row-sub">
                                    <th>الفصل الدراسي الأول</th>
                                    <th>الفصل الدراسي الثاني</th>
                                    <th>الفصل الدراسي الصيفي</th>
                                    <th>الفصل الدراسي الأول</th>
                                    <th>الفصل الدراسي الثاني</th>
                                    <th>الفصل الدراسي الصيفي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHTML}
                                ${grandTotalHTML}
                            </tbody>
                        </table>
                        ${selectedFaculty && signatures && signatures.length > 0 ? `
                            <div style="margin-top: 35px; display: flex; justify-content: space-around; align-items: flex-start; direction: rtl; page-break-inside: avoid;">
                                ${signatures.map(sig => `
                                    <div style="text-align: center; min-width: 140px;">
                                        <div style="font-weight: bold; font-size: 11pt; color: #1b5e20; border-bottom: 1px dashed #a5d6a7; padding-bottom: 5px; margin-bottom: 25px;">${sig.signature_title}</div>
                                        <div style="font-weight: bold; font-size: 10pt; color: #222;">${sig.official_name}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    const handlePrintModalProfs = () => {
        const facName = faculties.find(f => String(f.id) === String(modalFaculty))?.name || "جميع الكليات";
        const documentTitle = `بيانات أعضاء هيئة التدريس وتوزيع المقرارات - ${facName} - العام الجامعي ${modalYear}`;

        // تسجيل حدث طباعة بيانات أعضاء هيئة التدريس الخاصة بالجدول الرئيسي في الإشعارات
        const fids = modalFaculty ? [Number(modalFaculty)] : (faculties.map(f => f.id));
        const notifText = modalFaculty 
            ? `قام بطباعة بيانات أعضاء هيئة التدريس وتوزيع المقرارات بالجدول الرئيسي لكلية ${facName}` 
            : `قام بطباعة بيانات أعضاء هيئة التدريس وتوزيع المقرارات بالجدول الرئيسي لجميع الكليات`;
        logAction(notifText, fids.length > 0 ? fids : null, modalYear || null, null);

        const formatHours = (num) => Math.round((num || 0) * 100) / 100;

        const filteredModalProfs = modalProfs.filter(prof => {
            if (!modalProfSearch.trim()) return true;
            const q = modalProfSearch.trim().toLowerCase();
            const fullName = getProfNameWithAbv(prof);
            const facStr = getProfFacultyName(prof).toLowerCase();
            const rawJob = (prof.job_title || "").toLowerCase();
            const fullJob = (getFullJobTitle(prof.job_title) || "").toLowerCase();
            const abvJob = (getProfAbbreviation(prof) || "").toLowerCase();
            const inName = (prof.professor_name && prof.professor_name.toLowerCase().includes(q)) || fullName.toLowerCase().includes(q) || facStr.includes(q);
            const inJob = rawJob.includes(q) || fullJob.includes(q) || abvJob.includes(q);
            const inT1Sem = ("الأول".includes(q) || "الاول".includes(q) || "ترم اول".includes(q) || "فصل اول".includes(q) || "ترم 1".includes(q)) && prof.courses_t1 && prof.courses_t1.length > 0;
            const inT2Sem = ("الثاني".includes(q) || "الثانى".includes(q) || "ثاني".includes(q) || "ثانى".includes(q) || "ترم ثاني".includes(q) || "فصل ثاني".includes(q) || "ترم 2".includes(q)) && prof.courses_t2 && prof.courses_t2.length > 0;
            const inT3Sem = ("الصيفي".includes(q) || "صيفي".includes(q) || "ترم صيفي".includes(q) || "فصل صيفي".includes(q) || "ترم 3".includes(q)) && prof.courses_t3 && prof.courses_t3.length > 0;
            const inCourses = [...(prof.courses_t1 || []), ...(prof.courses_t2 || []), ...(prof.courses_t3 || [])].some(c => {
                if (typeof c === 'string') return c.toLowerCase().includes(q);
                if (typeof c === 'object' && c) {
                    const nameMatch = (c.course_name || '').toLowerCase().includes(q) || (c.course_code || '').toLowerCase().includes(q) || (c.display_text || '').toLowerCase().includes(q);
                    const deptMatch = (c.dept_details || []).some(d => d.toLowerCase().includes(q));
                    return nameMatch || deptMatch;
                }
                return false;
            });
            return inName || inJob || inT1Sem || inT2Sem || inT3Sem || inCourses;
        });

        let profRowsHTML = "";
        let term1ActualSum = 0;
        let term2ActualSum = 0;
        let term3ActualSum = 0;

        filteredModalProfs.forEach((prof, idx) => {
            const wBreakdown = getProfWeeksBreakdown(prof, modalYear, academicYears);
            const totalAnnualWeeklyHours = formatHours((prof.hours_t1 || 0) + (prof.hours_t2 || 0) + (prof.hours_t3 || 0));
            const t1TermHours = (prof.hours_t1 || 0) * (wBreakdown.s1Num || 0);
            const t2TermHours = (prof.hours_t2 || 0) * (wBreakdown.s2Num || 0);
            const t3TermHours = (prof.hours_t3 || 0) * (wBreakdown.s3Num || 0);
            term1ActualSum += t1TermHours;
            term2ActualSum += t2TermHours;
            term3ActualSum += t3TermHours;
            const totalAnnualActualHours = formatHours(t1TermHours + t2TermHours + t3TermHours);

            const nameWithTitle = getProfNameWithAbv(prof);
            const facText = getProfFacultyName(prof);
            const contractStr = prof.contract_type ? (prof.contract_type.startsWith('تعاقد') ? prof.contract_type : `تعاقد ${prof.contract_type}`) : "غير محدد";
            const weeksPrintHTML = `
                <div style="display:flex; flex-direction:column; gap:3px; font-size:9pt; text-align:right; white-space:nowrap; padding:2px 4px;">
                    <div style="display:flex; justify-content:space-between;"><span style="color:#555; font-weight:bold; font-size:8.5pt;">فصل أول:</span> <span style="color:#1b5e20; font-weight:bold; font-size:9pt;">${wBreakdown.sem1}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span style="color:#555; font-weight:bold; font-size:8.5pt;">فصل ثاني:</span> <span style="color:#1b5e20; font-weight:bold; font-size:9pt;">${wBreakdown.sem2}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span style="color:#555; font-weight:bold; font-size:8.5pt;">فصل صيفي:</span> <span style="color:#1b5e20; font-weight:bold; font-size:9pt;">${wBreakdown.summer}</span></div>
                </div>
            `;

            const coursesT1HTML = (prof.courses_t1 || []).length > 0
                ? (prof.courses_t1 || []).map(renderCourseItemHTML).join('') + `
                    <div style="margin-top:6px; font-weight:bold; color:#1b5e20; border-top:1px solid #eee; padding-top:4px;">
                        <div>إجمالي الساعات في الأسبوع: ${formatHours(prof.hours_t1)} ساعة</div>
                        <div style="font-size:8.5pt; color:#155724; margin-top:2px;">إجمالي الساعات في الترم = ${formatHours(t1TermHours)} ساعة</div>
                    </div>`
                : "-";

            const coursesT2HTML = (prof.courses_t2 || []).length > 0
                ? (prof.courses_t2 || []).map(renderCourseItemHTML).join('') + `
                    <div style="margin-top:6px; font-weight:bold; color:#1b5e20; border-top:1px solid #eee; padding-top:4px;">
                        <div>إجمالي الساعات في الأسبوع: ${formatHours(prof.hours_t2)} ساعة</div>
                        <div style="font-size:8.5pt; color:#155724; margin-top:2px;">إجمالي الساعات في الترم = ${formatHours(t2TermHours)} ساعة</div>
                    </div>`
                : "-";

            const coursesT3HTML = (prof.courses_t3 || []).length > 0
                ? (prof.courses_t3 || []).map(renderCourseItemHTML).join('') + `
                    <div style="margin-top:6px; font-weight:bold; color:#1b5e20; border-top:1px solid #eee; padding-top:4px;">
                        <div>إجمالي الساعات في الأسبوع: ${formatHours(prof.hours_t3)} ساعة</div>
                        <div style="font-size:8.5pt; color:#155724; margin-top:2px;">إجمالي الساعات في الترم = ${formatHours(t3TermHours)} ساعة</div>
                    </div>`
                : "-";

            profRowsHTML += `
                <tr style="background-color: ${idx % 2 !== 0 ? '#f1f8e9' : '#ffffff'};">
                    <td style="font-weight:bold; text-align:center; vertical-align:middle; padding:6px;">
                        <div style="font-size:10pt; font-weight:bold; color:#111;">${nameWithTitle}</div>
                        ${facText ? `<div style="font-size:8pt; color:#444; font-weight:bold; margin-top:2px;">${facText}</div>` : ''}
                        <div style="display:inline-block; margin-top:3px; font-size:8pt; color:#1b5e20; background:#e8f5e9; border:1px solid #c8e6c9; border-radius:4px; padding:1px 6px; font-weight:bold;">${contractStr}</div>
                    </td>
                    <td style="text-align:center; vertical-align:middle; padding:4px;">${weeksPrintHTML}</td>
                    <td style="text-align:center; vertical-align:top; padding:8px;">${coursesT1HTML}</td>
                    <td style="text-align:center; vertical-align:top; padding:8px;">${coursesT2HTML}</td>
                    <td style="text-align:center; vertical-align:top; padding:8px;">${coursesT3HTML}</td>
                    <td style="font-weight:bold; text-align:center; vertical-align:middle; color:#1b5e20; font-size:11px;">
                        <div style="font-size:8pt; color:#555; font-weight:normal; margin-bottom:2px;">إجمالي الساعات في الأسبوع =</div>
                        <div style="font-size:10pt; font-weight:bold; color:#1b5e20; margin-bottom:4px;">${totalAnnualWeeklyHours} ساعة</div>
                        <div style="font-size:8pt; color:#555; font-weight:normal; border-top:1px dashed #a5d6a7; padding-top:2px; margin-bottom:2px;">إجمالي الساعات بالعام =</div>
                        <div style="font-size:10pt; font-weight:bold; color:#222;">${totalAnnualActualHours} ساعة</div>
                    </td>
                </tr>
            `;
        });

        const coursesT1Count = new Set(filteredModalProfs.flatMap(p => (p.courses_t1 || []).map(getCourseBaseName))).size;
        const hoursT1Sum = formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t1 || 0), 0));

        const coursesT2Count = new Set(filteredModalProfs.flatMap(p => (p.courses_t2 || []).map(getCourseBaseName))).size;
        const hoursT2Sum = formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t2 || 0), 0));

        const coursesT3Count = new Set(filteredModalProfs.flatMap(p => (p.courses_t3 || []).map(getCourseBaseName))).size;
        const hoursT3Sum = formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t3 || 0), 0));

        const coursesAllCount = new Set(filteredModalProfs.flatMap(p => [...(p.courses_t1 || []), ...(p.courses_t2 || []), ...(p.courses_t3 || [])].map(getCourseBaseName))).size;
        const hoursAllSum = formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t1 || 0) + (p.hours_t2 || 0) + (p.hours_t3 || 0), 0));
        const grandAnnualActualHours = formatHours(term1ActualSum + term2ActualSum + term3ActualSum);

        const modalTotalsHTML = `
            <tr style="background-color: #e8f5e9; font-weight: bold; border-top: 2px solid #2e7d32;">
                <td colspan="2" style="color: #1b5e20; text-align: left; padding-left: 15px;">الإجمالي العام =</td>
                <td style="color: #1b5e20; text-align: center;">
                    <div>عدد المقررات: ${coursesT1Count}</div>
                    <div>إجمالي الساعات في الأسبوع: ${hoursT1Sum} ساعة</div>
                    <div style="font-size:8.5pt; color:#155724; margin-top:2px;">إجمالي الساعات في الترم = ${formatHours(term1ActualSum)} ساعة</div>
                </td>
                <td style="color: #1b5e20; text-align: center;">
                    <div>عدد المقررات: ${coursesT2Count}</div>
                    <div>إجمالي الساعات في الأسبوع: ${hoursT2Sum} ساعة</div>
                    <div style="font-size:8.5pt; color:#155724; margin-top:2px;">إجمالي الساعات في الترم = ${formatHours(term2ActualSum)} ساعة</div>
                </td>
                <td style="color: #1b5e20; text-align: center;">
                    <div>عدد المقررات: ${coursesT3Count}</div>
                    <div>إجمالي الساعات في الأسبوع: ${hoursT3Sum} ساعة</div>
                    <div style="font-size:8.5pt; color:#155724; margin-top:2px;">إجمالي الساعات في الترم = ${formatHours(term3ActualSum)} ساعة</div>
                </td>
                <td style="color: #1b5e20; text-align: center; background-color: #c8e6c9;">
                    <div>عدد المقررات: ${coursesAllCount}</div>
                    <div>إجمالي الساعات في الأسبوع: ${hoursAllSum} ساعة</div>
                    <div style="font-size:8.5pt; color:#155724; margin-top:2px;">إجمالي الساعات بالعام = ${grandAnnualActualHours} ساعة</div>
                </td>
            </tr>
        `;

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>${documentTitle}</title>
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
                            padding: 5px 6px;
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
                            font-size: 10.5pt;
                            border: 1px solid #1b5e20 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .header-row-sub th {
                            background-color: #4caf50 !important;
                            color: #ffffff !important;
                            font-weight: bold;
                            font-size: 8.5pt;
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
                            <colgroup>
                                <col style="width: 19%;">
                                <col style="width: 10%;">
                                <col style="width: 20%;"><col style="width: 20%;"><col style="width: 20%;">
                                <col style="width: 11%;">
                            </colgroup>
                            <thead>
                                <tr style="border: none !important;">
                                    <th colspan="6" style="border: none !important; background: transparent !important; color: inherit; padding: 10px 0 6px 0; font-weight: normal;">
                                        <div style="position: relative; width: 100%; box-sizing: border-box;">
                                            <div style="position: absolute; left: 0; top: 0; z-index: 10;">
                                                <img src="${window.location.origin}${logo}" width="80" height="80" style="object-fit: contain; display: block; float: left;" />
                                            </div>
                                            <div style="position: absolute; right: 0; top: 0; text-align: right; line-height: 1.35; white-space: nowrap;">
                                                <div style="font-size: 13.5pt; font-weight: bold; color: #1b5e20;">جامعة المنوفية الأهلية</div>
                                                <div style="font-size: 11pt; font-weight: bold; color: #222; margin-top: 2px;">شئون التعليم والطلاب</div>
                                            </div>
                                            <div style="width: 100%; text-align: center; line-height: 1.35; padding: 0 140px; box-sizing: border-box;">
                                                <div style="font-size: 16pt; font-weight: bold; color: #1b5e20; white-space: nowrap;">بيانات أعضاء هيئة التدريس وتوزيع المقرارات</div>
                                                <div style="font-size: 11.5pt; font-weight: bold; color: #222; margin-top: 3px; white-space: nowrap;">
                                                    <span>${facName}</span> &nbsp;&nbsp;   &nbsp;&nbsp; <span>العام الجامعي ${modalYear || "جميع الأعوام"}</span> &nbsp;&nbsp;   &nbsp;&nbsp; <span>عدد أعضاء هيئة التدريس = ${filteredModalProfs.length}</span>
                                                </div>
                                            </div>
                                            <div style="width: 100%; text-align: center; font-weight: bold; font-size: 10.5pt; color: #1b5e20; margin-top: 6px; margin-bottom: 2px; padding: 0; box-sizing: border-box;">
                                                بيان بالسادة أعضاء هيئة التدريس والهيئة المعاونة وتوزيع المقرارات والساعات الدراسية
                                            </div>
                                        </div>
                                    </th>
                                </tr>
                                <tr class="header-row-main">
                                    <th rowspan="2" style="width: 19%;">اسم عضو هيئة التدريس</th>
                                    <th rowspan="2" style="width: 10%;">أسابيع الحضور</th>
                                    <th colspan="3" style="width: 60%;">المقررات المكلف بتدريسها</th>
                                    <th rowspan="2" style="width: 11%;">إجمالي ساعات التدريس في الأسبوع بالعام الجامعي ${modalYear || ""}</th>
                                </tr>
                                <tr class="header-row-sub">
                                    <th style="width: 20%;">الفصل الدراسي الأول</th>
                                    <th style="width: 20%;">الفصل الدراسي الثاني</th>
                                    <th style="width: 20%;">الفصل الدراسي الصيفي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${profRowsHTML}
                                ${modalTotalsHTML}
                            </tbody>
                        </table>
                        ${modalSignatures && modalSignatures.length > 0 ? `
                            <div style="margin-top: 35px; display: flex; justify-content: space-around; align-items: flex-start; direction: rtl; page-break-inside: avoid;">
                                ${modalSignatures.map(sig => `
                                    <div style="text-align: center; min-width: 140px;">
                                        <div style="font-weight: bold; font-size: 11pt; color: #1b5e20; border-bottom: 1px dashed #a5d6a7; padding-bottom: 5px; margin-bottom: 25px;">${sig.signature_title}</div>
                                        <div style="font-weight: bold; font-size: 10pt; color: #222;">${sig.official_name}</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    return (
        <div style={{ padding: '20px', direction: 'rtl' }}>
            {/* عنوان الصفحة */}
            <div className="row mb-4 align-items-center">
                <div className="col-md-8">
                    <h2 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }} className="d-flex align-items-center gap-3">
                        <FaTable className="text-success" style={{ marginLeft: '15px' }} /> الجدول الرئيسي الموحد
                    </h2>
                    <p className="text-muted mt-3 mb-0">
                        عرض وتصفية إحصائيات الكليات والبرامج التعليمية وتوزيع المقرارات و أعضاء هيئة التدريس في كل ترم بناء على الخطة الدراسية
                    </p>
                </div>
                <div className="col-md-4 text-start d-flex justify-content-end gap-2">
                    <button 
                        className="btn btn-outline-success fw-bold px-3 py-2 shadow-sm d-inline-flex align-items-center gap-2"
                        onClick={handlePrintMainTable}
                    >
                        <FaPrint /> طباعة الجدول الرئيسي
                    </button>
                    {(user?.role === 'admin' || user?.perm_view_prof_data_btn) && (
                        <button 
                            className="btn btn-success fw-bold px-3 py-2 shadow-sm d-inline-flex align-items-center gap-2"
                            onClick={() => {
                                setModalFaculty(selectedFaculty);
                                setModalYear(selectedYear);
                                setModalProfSearch("");
                                setShowProfsModal(true);
                            }}
                        >
                            بيانات أعضاء هيئة التدريس
                        </button>
                    )}
                </div>
            </div>

            {/* الفلاتر */}
            <Card className="shadow-sm border-0 mb-4 bg-light">
                <Card.Body className="py-3">
                    <div className="row g-3 align-items-end">
                        {/* العام الجامعي */}
                        <div className="col-md-4">
                            <label className="form-label fw-bold text-success fs-5 mb-2">العام الجامعي</label>
                            <Select 
                                options={yearSelectOptions}
                                value={yearSelectOptions.find(o => o.value === selectedYear) || yearSelectOptions[0]}
                                onChange={(selected) => setSelectedYear(selected ? selected.value : "")}
                                isSearchable
                                placeholder="اختر العام الجامعي..."
                                noOptionsMessage={() => "لا توجد نتائج"}
                                styles={customSelectStyles}
                            />
                        </div>

                        {/* الكلية */}
                        <div className="col-md-8">
                            <label className="form-label fw-bold text-success fs-5 mb-2">الكلية</label>
                            <Select 
                                options={facultySelectOptions}
                                value={facultySelectOptions.find(o => String(o.value) === String(selectedFaculty)) || facultySelectOptions[0]}
                                onChange={(selected) => {
                                    if (isAllFacultiesUser) {
                                        setSelectedFaculty(selected ? selected.value : "");
                                    }
                                }}
                                isDisabled={!isAllFacultiesUser}
                                isSearchable={isAllFacultiesUser}
                                placeholder="اختر الكلية..."
                                noOptionsMessage={() => "لا توجد نتائج"}
                                styles={customSelectStyles}
                            />
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="success" style={{ width: "2.3rem", height: "2.3rem", borderWidth: "3px" }} />
                    <p className="mt-3 text-success fw-bolder" style={{ fontSize: "21px", fontWeight: "800" }}>جاري تصفية وتحميل البيانات...</p>
                </div>
            ) : (
                <div className="table-responsive">
                    <Table responsive striped bordered hover className="text-center align-middle" style={{ fontSize: '0.95rem' }}>
                        <thead>
                            {/* الصف الأول من الهيدر */}
                            <tr style={{ backgroundColor: '#e8f5e9', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                                <th rowSpan={2} style={{ width: '20%', verticalAlign: 'middle', borderBottom: '2.5px solid var(--secondary)' }}>اسم الكلية</th>
                                <th rowSpan={2} style={{ width: '20%', verticalAlign: 'middle', borderBottom: '2.5px solid var(--secondary)' }}>اسم البرنامج</th>
                                <th colSpan={3} style={{ width: '30%', verticalAlign: 'middle' }}>عدد المقرارات في كل برنامج</th>
                                <th colSpan={3} style={{ width: '30%', verticalAlign: 'middle' }}>عدد أعضاء هيئة التدريس الموجودين في كل برنامج</th>
                            </tr>
                            {/* الصف الثاني من الهيدر */}
                            <tr style={{ backgroundColor: '#e8f5e9', whiteSpace: 'nowrap', borderBottom: '2.5px solid var(--secondary)' }}>
                                <th style={{ width: '10%', fontSize: '0.85rem' }}>الفصل الدراسي الأول</th>
                                <th style={{ width: '10%', fontSize: '0.85rem' }}>الفصل الدراسي الثاني</th>
                                <th style={{ width: '10%', fontSize: '0.85rem' }}>الفصل الدراسي الصيفي</th>
                                <th style={{ width: '10%', fontSize: '0.85rem' }}>الفصل الدراسي الأول</th>
                                <th style={{ width: '10%', fontSize: '0.85rem' }}>الفصل الدراسي الثاني</th>
                                <th style={{ width: '10%', fontSize: '0.85rem' }}>الفصل الدراسي الصيفي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-muted py-5">لا توجد بيانات مطابقة للبحث.</td>
                                </tr>
                            ) : (
                                <>
                                    {rows.map((row, idx) => {
                                        const isNewFacultyStart = idx > 0 && row.facultySpan > 0;
                                        return (
                                            <tr 
                                                key={idx} 
                                                style={{ 
                                                    borderBottom: '1px solid #eee',
                                                    backgroundColor: row.isTotalRow ? '#e8f5e9' : 'transparent',
                                                    fontWeight: row.isTotalRow ? 'bold' : 'normal'
                                                }}
                                            >
                                                {row.facultySpan > 0 && (
                                                    <td 
                                                        rowSpan={row.facultySpan} 
                                                        className="fw-bold bg-light align-top pt-3" 
                                                        style={{ 
                                                            color: '#1b5e20', 
                                                            borderLeft: '2.5px solid var(--secondary)',
                                                            borderTop: isNewFacultyStart ? '3.5px solid var(--secondary)' : 'none'
                                                        }}
                                                    >
                                                        {row.facultyName}
                                                        {row.facultySubText && (
                                                            <div className="text-secondary mt-1" style={{ fontSize: '0.92em', fontWeight: 'bold' }}>
                                                                {row.facultySubText}
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                                
                                                <td 
                                                    className={row.isTotalRow ? "fw-bold" : "text-dark"}
                                                    style={row.isTotalRow ? { 
                                                        backgroundColor: '#e8f5e9',
                                                        color: '#1b5e20'
                                                    } : {
                                                        borderTop: isNewFacultyStart ? '3.5px solid var(--secondary)' : 'none'
                                                    }}
                                                >
                                                    {row.programName}
                                                </td>
                                                
                                                {/* عدد المقرارات - ترم أول */}
                                                <td 
                                                    className={row.isTotalRow ? "fw-bold" : "text-muted"}
                                                    style={row.isTotalRow ? { 
                                                        backgroundColor: '#e8f5e9',
                                                        color: '#1b5e20'
                                                    } : {
                                                        borderTop: isNewFacultyStart ? '3.5px solid var(--secondary)' : 'none'
                                                    }}
                                                >
                                                    {row.coursesCountT1}
                                                </td>
                                                
                                                {/* عدد المقرارات - ترم ثاني */}
                                                <td 
                                                    className={row.isTotalRow ? "fw-bold" : "text-muted"}
                                                    style={row.isTotalRow ? { 
                                                        backgroundColor: '#e8f5e9',
                                                        color: '#1b5e20'
                                                    } : {
                                                        borderTop: isNewFacultyStart ? '3.5px solid var(--secondary)' : 'none'
                                                    }}
                                                >
                                                    {row.coursesCountT2}
                                                </td>
                                                
                                                {/* عدد المقرارات - ترم صيفي */}
                                                <td 
                                                    className={row.isTotalRow ? "fw-bold" : "text-muted"}
                                                    style={row.isTotalRow ? { 
                                                        backgroundColor: '#e8f5e9',
                                                        color: '#1b5e20'
                                                    } : {
                                                        borderTop: isNewFacultyStart ? '3.5px solid var(--secondary)' : 'none'
                                                    }}
                                                >
                                                    {row.coursesCountT3}
                                                </td>
                                                
                                                {/* عدد أعضاء هيئة التدريس - ترم أول */}
                                                <td 
                                                    className={row.isTotalRow ? "fw-bold" : "text-muted"}
                                                    style={row.isTotalRow ? { 
                                                        backgroundColor: '#e8f5e9',
                                                        color: '#1b5e20'
                                                    } : {
                                                        borderTop: isNewFacultyStart ? '3.5px solid var(--secondary)' : 'none'
                                                    }}
                                                >
                                                    {row.professorsCountT1}
                                                </td>
                                                
                                                {/* عدد أعضاء هيئة التدريس - ترم ثاني */}
                                                <td 
                                                    className={row.isTotalRow ? "fw-bold" : "text-muted"}
                                                    style={row.isTotalRow ? { 
                                                        backgroundColor: '#e8f5e9',
                                                        color: '#1b5e20'
                                                    } : {
                                                        borderTop: isNewFacultyStart ? '3.5px solid var(--secondary)' : 'none'
                                                    }}
                                                >
                                                    {row.professorsCountT2}
                                                </td>
                                                
                                                {/* عدد أعضاء هيئة التدريس - ترم صيفي */}
                                                <td 
                                                    className={row.isTotalRow ? "fw-bold" : "text-muted"}
                                                    style={row.isTotalRow ? { 
                                                        backgroundColor: '#e8f5e9',
                                                        color: '#1b5e20'
                                                    } : {
                                                        borderTop: isNewFacultyStart ? '3.5px solid var(--secondary)' : 'none'
                                                    }}
                                                >
                                                    {row.professorsCountT3}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* صف الإجمالي العام المقسم بالترم (يظهر فقط عند تصفية جميع الكليات) */}
                                    {!selectedFaculty && (
                                        <tr style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', borderTop: '2.5px solid #2e7d32' }}>
                                            <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>الإجمالي العام لكل ترم</td>
                                            <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>
                                                عدد البرامج: {grandTotalPrograms}
                                            </td>
                                            <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>{grandTotalCoursesT1}</td>
                                            <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>{grandTotalCoursesT2}</td>
                                            <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>{grandTotalCoursesT3}</td>
                                            <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>{grandTotalProfsT1}</td>
                                            <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>{grandTotalProfsT2}</td>
                                            <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold' }}>{grandTotalProfsT3}</td>
                                        </tr>
                                    )}
                                    {/* صف الإجمالي السنوي العام لجميع الأترام */}
                                    <tr style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', borderTop: '2.5px solid #2e7d32' }}>
                                        <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', padding: '10px' }}>
                                            الإجمالي بالعام الجامعي
                                        </td>
                                        <td style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', padding: '10px' }}>
                                            {!selectedFaculty ? `عدد البرامج = ${grandTotalPrograms} في ${grandTotalColleges} كليات` : `عدد البرامج = ${grandTotalPrograms}`}
                                        </td>
                                        <td colSpan="3" style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', padding: '10px' }}>
                                            إجمالي المقرارات = {totalAllCourses}
                                        </td>
                                        <td colSpan="3" style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', fontWeight: 'bold', padding: '10px' }}>
                                            إجمالي أعضاء هيئة التدريس = {totalAllProfs}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </Table>
                    {selectedFaculty && signatures.length > 0 && (
                        <div className="mt-4 p-4 bg-white rounded border d-flex justify-content-around align-items-center flex-wrap gap-4 no-print shadow-sm">
                            {signatures.map(sig => (
                                <div key={sig.id} className="text-center" style={{ minWidth: '150px' }}>
                                    <div className="fw-bold text-success mb-3 fs-5" style={{ borderBottom: '1px dashed #c8e6c9', paddingBottom: '5px' }}>{sig.signature_title}</div>
                                    <div className="fw-bold text-dark fs-6">{sig.official_name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* مودال بيانات أعضاء هيئة التدريس */}
            <Modal show={showProfsModal} onHide={() => setShowProfsModal(false)} size="xl" dialogClassName="mw-100" style={{ paddingLeft: '20px', paddingRight: '20px' }} scrollable centered dir="rtl">
                <Modal.Header style={{ backgroundColor: '#e8f5e9', borderBottom: '2.5px solid var(--secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Modal.Title className="fw-bold text-success mb-0">
                        بيانات أعضاء هيئة التدريس وتوزيع المقرارات
                    </Modal.Title>
                    <div className="d-flex align-items-center gap-2">
                        <button 
                            type="button" 
                            className="btn btn-success btn-sm px-3 fw-bold shadow-sm d-flex align-items-center gap-2"
                            onClick={handlePrintModalProfs}
                        >
                            <FaPrint /> طباعة التقرير
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-outline-danger btn-sm px-3 fw-bold shadow-sm"
                            onClick={() => setShowProfsModal(false)}
                        >
                            إغلاق ✕
                        </button>
                    </div>
                </Modal.Header>
                <Modal.Body style={{ minHeight: '400px' }}>
                    {/* فلاتر البحث داخل المودال */}
                    <div className="row g-3 mb-4 p-3 bg-light rounded shadow-sm border align-items-end">
                        <div className="col-md-3">
                            <label className="form-label small fw-bold text-success mb-2">العام الجامعي</label>
                            <Select 
                                options={yearSelectOptions}
                                value={yearSelectOptions.find(o => o.value === modalYear) || yearSelectOptions[0]}
                                onChange={(selected) => setModalYear(selected ? selected.value : "")}
                                isSearchable
                                placeholder="اختر العام الجامعي..."
                                noOptionsMessage={() => "لا توجد نتائج"}
                                styles={customSelectStyles}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-bold text-success mb-2">الكلية</label>
                            <Select 
                                options={facultySelectOptions}
                                value={facultySelectOptions.find(o => String(o.value) === String(modalFaculty)) || facultySelectOptions[0]}
                                onChange={(selected) => {
                                    if (isAllFacultiesUser) {
                                        setModalFaculty(selected ? selected.value : "");
                                    }
                                }}
                                isDisabled={!isAllFacultiesUser}
                                isSearchable={isAllFacultiesUser}
                                placeholder="اختر الكلية..."
                                noOptionsMessage={() => "لا توجد نتائج"}
                                styles={customSelectStyles}
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small fw-bold text-success mb-2">البحث (باسم الدكتور / الوظيفة / الفصل الدراسي / المقرر)</label>
                            <input 
                                type="text"
                                className="form-control"
                                placeholder="ادخل اسم الدكتور، الوظيفة، الفصل الدراسي، أو المقرر..."
                                value={modalProfSearch}
                                onChange={(e) => setModalProfSearch(e.target.value)}
                            />
                        </div>
                        <div className="col-md-2 text-center">
                            <div className="p-2 rounded bg-success text-white fw-bold shadow-sm" style={{ fontSize: '0.85rem' }}>
                                عدد الأساتذة: {modalProfs.filter(prof => {
                                    if (!modalProfSearch.trim()) return true;
                                    const q = modalProfSearch.trim().toLowerCase();
                                    const fullName = getProfNameWithAbv(prof);
                                    const rawJob = (prof.job_title || "").toLowerCase();
                                    const fullJob = (getFullJobTitle(prof.job_title) || "").toLowerCase();
                                    const abvJob = (getProfAbbreviation(prof) || "").toLowerCase();
                                    const inName = (prof.professor_name && prof.professor_name.toLowerCase().includes(q)) || fullName.toLowerCase().includes(q);
                                    const inJob = rawJob.includes(q) || fullJob.includes(q) || abvJob.includes(q);
                                                                        const inT1Sem = ("الأول".includes(q) || "الاول".includes(q) || "ترم اول".includes(q) || "فصل اول".includes(q) || "ترم 1".includes(q)) && prof.courses_t1 && prof.courses_t1.length > 0;
                                    const inT2Sem = ("الثاني".includes(q) || "الثانى".includes(q) || "ثاني".includes(q) || "ثانى".includes(q) || "ترم ثاني".includes(q) || "فصل ثاني".includes(q) || "ترم 2".includes(q)) && prof.courses_t2 && prof.courses_t2.length > 0;
                                    const inT3Sem = ("الصيفي".includes(q) || "صيفي".includes(q) || "ترم صيفي".includes(q) || "فصل صيفي".includes(q) || "ترم 3".includes(q)) && prof.courses_t3 && prof.courses_t3.length > 0;
                                    const inCourses = [...(prof.courses_t1 || []), ...(prof.courses_t2 || []), ...(prof.courses_t3 || [])].some(c => c.toLowerCase().includes(q));
                                    return inName || inJob || inT1Sem || inT2Sem || inT3Sem || inCourses;
                                }).length}
                            </div>
                        </div>
                    </div>

                    {modalLoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="success" />
                            <p className="mt-3 fw-bold text-success">جاري تحميل تقرير أعضاء هيئة التدريس...</p>
                        </div>
                    ) : (() => {
                        const filteredModalProfs = modalProfs.filter(prof => {
                            if (!modalProfSearch.trim()) return true;
                            const q = modalProfSearch.trim().toLowerCase();
                            const fullName = getProfNameWithAbv(prof);
                            const rawJob = (prof.job_title || "").toLowerCase();
                            const fullJob = (getFullJobTitle(prof.job_title) || "").toLowerCase();
                            const abvJob = (getProfAbbreviation(prof) || "").toLowerCase();
                            const inName = (prof.professor_name && prof.professor_name.toLowerCase().includes(q)) || fullName.toLowerCase().includes(q) || (getProfFacultyName(prof) || '').toLowerCase().includes(q);
                            const inJob = rawJob.includes(q) || fullJob.includes(q) || abvJob.includes(q);
                            const inT1Sem = ("الأول".includes(q) || "الاول".includes(q) || "ترم اول".includes(q) || "فصل اول".includes(q) || "ترم 1".includes(q)) && prof.courses_t1 && prof.courses_t1.length > 0;
                            const inT2Sem = ("الثاني".includes(q) || "الثانى".includes(q) || "ثاني".includes(q) || "ثانى".includes(q) || "ترم ثاني".includes(q) || "فصل ثاني".includes(q) || "ترم 2".includes(q)) && prof.courses_t2 && prof.courses_t2.length > 0;
                            const inT3Sem = ("الصيفي".includes(q) || "صيفي".includes(q) || "ترم صيفي".includes(q) || "فصل صيفي".includes(q) || "ترم 3".includes(q)) && prof.courses_t3 && prof.courses_t3.length > 0;
                            const inCourses = [...(prof.courses_t1 || []), ...(prof.courses_t2 || []), ...(prof.courses_t3 || [])].some(c => {
                                if (typeof c === 'string') return c.toLowerCase().includes(q);
                                if (typeof c === 'object' && c) {
                                    const nameMatch = (c.course_name || '').toLowerCase().includes(q) || (c.course_code || '').toLowerCase().includes(q) || (c.display_text || '').toLowerCase().includes(q);
                                    const deptMatch = (c.dept_details || []).some(d => d.toLowerCase().includes(q));
                                    return nameMatch || deptMatch;
                                }
                                return false;
                            });
                            return inName || inJob || inT1Sem || inT2Sem || inT3Sem || inCourses;
                        });

                        const formatHours = (num) => Math.round((num || 0) * 100) / 100;

                        const coursesT1Count = new Set(filteredModalProfs.flatMap(p => (p.courses_t1 || []).map(getCourseBaseName))).size;
                        const coursesT2Count = new Set(filteredModalProfs.flatMap(p => (p.courses_t2 || []).map(getCourseBaseName))).size;
                        const coursesT3Count = new Set(filteredModalProfs.flatMap(p => (p.courses_t3 || []).map(getCourseBaseName))).size;
                        const coursesAllCount = new Set(filteredModalProfs.flatMap(p => [...(p.courses_t1 || []), ...(p.courses_t2 || []), ...(p.courses_t3 || [])].map(getCourseBaseName))).size;
                        const hoursT1Sum = formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t1 || 0), 0));
                        const hoursT2Sum = formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t2 || 0), 0));
                        const hoursT3Sum = formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t3 || 0), 0));
                        const hoursAllSum = formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t1 || 0) + (p.hours_t2 || 0) + (p.hours_t3 || 0), 0));

                        return (
                            <div className="table-responsive">
                                <Table responsive striped bordered hover className="text-center align-middle" style={{ fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#2e7d32', color: 'white', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                                            <th rowSpan={2} style={{ width: '19%', verticalAlign: 'middle', borderBottom: '2.5px solid var(--secondary)', textAlign: 'center', backgroundColor: '#2e7d32', color: 'white' }}>اسم عضو هيئة التدريس</th>
                                            <th rowSpan={2} style={{ width: '10%', verticalAlign: 'middle', borderBottom: '2.5px solid var(--secondary)', textAlign: 'center', backgroundColor: '#2e7d32', color: 'white' }}>أسابيع الحضور</th>
                                            <th colSpan={3} style={{ width: '60%', verticalAlign: 'middle', textAlign: 'center', backgroundColor: '#2e7d32', color: 'white' }}>المقررات المكلف بتدريسها</th>
                                            <th rowSpan={2} style={{ width: '11%', verticalAlign: 'middle', borderBottom: '2.5px solid var(--secondary)', whiteSpace: 'normal', textAlign: 'center', backgroundColor: '#2e7d32', color: 'white' }}>
                                                إجمالي ساعات التدريس في الأسبوع بالعام الجامعي {modalYear || ""}
                                            </th>
                                        </tr>
                                        <tr style={{ backgroundColor: '#2e7d32', color: 'white', whiteSpace: 'nowrap', borderBottom: '2.5px solid var(--secondary)' }}>
                                            <th style={{ width: '20%', fontSize: '0.88rem', textAlign: 'center', backgroundColor: '#2e7d32', color: 'white' }}>الفصل الدراسي الأول</th>
                                            <th style={{ width: '20%', fontSize: '0.88rem', textAlign: 'center', backgroundColor: '#2e7d32', color: 'white' }}>الفصل الدراسي الثاني</th>
                                            <th style={{ width: '20%', fontSize: '0.88rem', textAlign: 'center', backgroundColor: '#2e7d32', color: 'white' }}>الفصل الدراسي الصيفي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredModalProfs.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-muted py-5">لا توجد بيانات مطابقة للبحث.</td>
                                            </tr>
                                        ) : (
                                            filteredModalProfs.map((prof, idx) => {
                                                const w = getProfWeeksBreakdown(prof, modalYear, academicYears);
                                                const totalAnnualWeeklyHours = formatHours((prof.hours_t1 || 0) + (prof.hours_t2 || 0) + (prof.hours_t3 || 0));
                                                const t1TermHours = (prof.hours_t1 || 0) * (w.s1Num || 0);
                                                const t2TermHours = (prof.hours_t2 || 0) * (w.s2Num || 0);
                                                const t3TermHours = (prof.hours_t3 || 0) * (w.s3Num || 0);
                                                const totalAnnualActualHours = formatHours(t1TermHours + t2TermHours + t3TermHours);
                                                const facNameStr = getProfFacultyName(prof);
                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: idx % 2 !== 0 ? '#f1f8e9' : '#ffffff' }}>
                                                        <td className="align-middle text-center py-2" style={{ width: '19%' }}>
                                                            <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.95rem' }}>
                                                                {getProfNameWithAbv(prof)}
                                                            </div>
                                                            {facNameStr && (
                                                                <div className="text-secondary fw-bold mb-1" style={{ fontSize: '0.8rem' }}>
                                                                    {facNameStr}
                                                                </div>
                                                            )}
                                                            <div>
                                                                {prof.contract_type ? (
                                                                    <Badge 
                                                                        bg={prof.contract_type === 'كلي' ? 'success' : (prof.contract_type === 'جزئي' ? 'warning' : 'info')} 
                                                                        className={`px-2 py-1 shadow-sm ${prof.contract_type === 'جزئي' ? 'text-dark' : ''}`}
                                                                        style={{ fontSize: '0.82rem', fontWeight: 'bold' }}
                                                                    >
                                                                        {prof.contract_type.startsWith('تعاقد') ? prof.contract_type : `تعاقد ${prof.contract_type}`}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-muted small">تعاقد غير محدد</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="align-middle text-center" style={{ width: '10%', minWidth: '95px', padding: '6px 4px' }}>
                                                            <div className="d-flex flex-column gap-1 text-center" style={{ fontSize: '0.88rem' }}>
                                                                <div className="d-flex justify-content-between align-items-center bg-white px-2 py-1 rounded border shadow-sm" style={{ lineHeight: 1.25 }}>
                                                                    <span className="text-muted fw-bold" style={{ fontSize: '0.82rem' }}>فصل أول:</span>
                                                                    <span className="text-success fw-bold" style={{ fontSize: '0.88rem' }}>{w.sem1}</span>
                                                                </div>
                                                                <div className="d-flex justify-content-between align-items-center bg-white px-2 py-1 rounded border shadow-sm" style={{ lineHeight: 1.25 }}>
                                                                    <span className="text-muted fw-bold" style={{ fontSize: '0.82rem' }}>فصل ثاني:</span>
                                                                    <span className="text-success fw-bold" style={{ fontSize: '0.88rem' }}>{w.sem2}</span>
                                                                </div>
                                                                <div className="d-flex justify-content-between align-items-center bg-white px-2 py-1 rounded border shadow-sm" style={{ lineHeight: 1.25 }}>
                                                                    <span className="text-muted fw-bold" style={{ fontSize: '0.82rem' }}>فصل صيفي:</span>
                                                                    <span className="text-success fw-bold" style={{ fontSize: '0.88rem' }}>{w.summer}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {/* مقررات ترم 1 */}
                                                        <td className="align-top py-3 text-center" style={{ width: '20%', textAlign: 'center' }}>
                                                            {prof.courses_t1.length === 0 ? (
                                                                <span className="text-muted small">-</span>
                                                            ) : (
                                                                <div className="d-flex flex-column text-center" style={{ textAlign: 'center' }}>
                                                                    {prof.courses_t1.map(renderCourseItemUI)}
                                                                    <div className="mt-2 pt-2 fw-bold text-center" style={{ fontSize: '0.85rem', color: '#2e7d32', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                                        <div>إجمالي الساعات في الأسبوع: {formatHours(prof.hours_t1)} ساعة</div>
                                                                        <div className="mt-1" style={{ fontSize: '0.82rem', color: '#155724' }}>
                                                                            إجمالي الساعات في الترم = {formatHours(t1TermHours)} ساعة
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        {/* مقررات ترم 2 */}
                                                        <td className="align-top py-3 text-center" style={{ width: '20%', textAlign: 'center' }}>
                                                            {prof.courses_t2.length === 0 ? (
                                                                <span className="text-muted small">-</span>
                                                            ) : (
                                                                <div className="d-flex flex-column text-center" style={{ textAlign: 'center' }}>
                                                                    {prof.courses_t2.map(renderCourseItemUI)}
                                                                    <div className="mt-2 pt-2 fw-bold text-center" style={{ fontSize: '0.85rem', color: '#2e7d32', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                                        <div>إجمالي الساعات في الأسبوع: {formatHours(prof.hours_t2)} ساعة</div>
                                                                        <div className="mt-1" style={{ fontSize: '0.82rem', color: '#155724' }}>
                                                                            إجمالي الساعات في الترم = {formatHours(t2TermHours)} ساعة
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        {/* مقررات صيفي */}
                                                        <td className="align-top py-3 text-center" style={{ width: '20%', textAlign: 'center' }}>
                                                            {prof.courses_t3.length === 0 ? (
                                                                <span className="text-muted small">-</span>
                                                            ) : (
                                                                <div className="d-flex flex-column text-center" style={{ textAlign: 'center' }}>
                                                                    {prof.courses_t3.map(renderCourseItemUI)}
                                                                    <div className="mt-2 pt-2 fw-bold text-center" style={{ fontSize: '0.85rem', color: '#2e7d32', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                                        <div>إجمالي الساعات في الأسبوع: {formatHours(prof.hours_t3)} ساعة</div>
                                                                        <div className="mt-1" style={{ fontSize: '0.82rem', color: '#155724' }}>
                                                                            إجمالي الساعات في الترم = {formatHours(t3TermHours)} ساعة
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        {/* إجمالي ساعات العام الجامعي */}
                                                        <td className="fw-bold align-middle text-center" style={{ width: '11%', color: '#2e7d32', fontSize: '0.95rem' }}>
                                                            <div className="small text-muted fw-normal mb-1" style={{ fontSize: '0.78rem' }}>إجمالي الساعات في الأسبوع =</div>
                                                            <div className="fw-bold text-success fs-6 mb-2">{totalAnnualWeeklyHours} ساعة</div>
                                                            <div className="small text-muted fw-normal mb-1" style={{ fontSize: '0.78rem', borderTop: '1px dashed #c8e6c9', paddingTop: '4px' }}>إجمالي الساعات بالعام =</div>
                                                            <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{totalAnnualActualHours} ساعة</div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                    {filteredModalProfs.length > 0 && (
                                        <tfoot>
                                            <tr style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold', borderTop: '2px solid #2e7d32' }}>
                                                <td colSpan="2" className="align-middle" style={{ color: '#1b5e20', fontSize: '0.95rem', textAlign: 'left', paddingLeft: '15px' }}>
                                                    الإجمالي العام =
                                                </td>
                                                <td className="align-middle text-center" style={{ color: '#1b5e20', fontSize: '0.95rem' }}>
                                                    <div className="mb-1" style={{ fontSize: '0.85rem' }}>عدد المقررات: {coursesT1Count}</div>
                                                    <div>إجمالي الساعات في الأسبوع: {hoursT1Sum} ساعة</div>
                                                    <div className="mt-1 small" style={{ fontSize: '0.82rem', color: '#155724' }}>إجمالي الساعات في الترم = {formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t1 || 0) * (getProfWeeksBreakdown(p, modalYear, academicYears).s1Num || 0), 0))} ساعة</div>
                                                </td>
                                                <td className="align-middle text-center" style={{ color: '#1b5e20', fontSize: '0.95rem' }}>
                                                    <div className="mb-1" style={{ fontSize: '0.85rem' }}>عدد المقررات: {coursesT2Count}</div>
                                                    <div>إجمالي الساعات في الأسبوع: {hoursT2Sum} ساعة</div>
                                                    <div className="mt-1 small" style={{ fontSize: '0.82rem', color: '#155724' }}>إجمالي الساعات في الترم = {formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t2 || 0) * (getProfWeeksBreakdown(p, modalYear, academicYears).s2Num || 0), 0))} ساعة</div>
                                                </td>
                                                <td className="align-middle text-center" style={{ color: '#1b5e20', fontSize: '0.95rem' }}>
                                                    <div className="mb-1" style={{ fontSize: '0.85rem' }}>عدد المقررات: {coursesT3Count}</div>
                                                    <div>إجمالي الساعات في الأسبوع: {hoursT3Sum} ساعة</div>
                                                    <div className="mt-1 small" style={{ fontSize: '0.82rem', color: '#155724' }}>إجمالي الساعات في الترم = {formatHours(filteredModalProfs.reduce((acc, p) => acc + (p.hours_t3 || 0) * (getProfWeeksBreakdown(p, modalYear, academicYears).s3Num || 0), 0))} ساعة</div>
                                                </td>
                                                <td className="align-middle text-center" style={{ color: '#1b5e20', fontSize: '0.95rem', backgroundColor: '#c8e6c9' }}>
                                                    <div className="mb-1" style={{ fontSize: '0.85rem' }}>عدد المقررات: {coursesAllCount}</div>
                                                    <div>إجمالي الساعات في الأسبوع: {hoursAllSum} ساعة</div>
                                                    <div className="mt-1 small" style={{ fontSize: '0.82rem', color: '#155724' }}>إجمالي الساعات بالعام = {formatHours(filteredModalProfs.reduce((acc, p) => {
                                                        const w = getProfWeeksBreakdown(p, modalYear, academicYears);
                                                        return acc + ((p.hours_t1 || 0) * (w.s1Num || 0)) + ((p.hours_t2 || 0) * (w.s2Num || 0)) + ((p.hours_t3 || 0) * (w.s3Num || 0));
                                                    }, 0))} ساعة</div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </Table>

                                {modalSignatures && modalSignatures.length > 0 && (
                                    <div className="mt-4 p-4 bg-white rounded border d-flex justify-content-around align-items-center flex-wrap gap-4 no-print shadow-sm">
                                        {modalSignatures.map(sig => (
                                            <div key={sig.id} className="text-center" style={{ minWidth: '150px' }}>
                                                <div className="fw-bold text-success mb-3 fs-5" style={{ borderBottom: '1px dashed #c8e6c9', paddingBottom: '5px' }}>{sig.signature_title}</div>
                                                <div className="fw-bold text-dark fs-6">{sig.official_name}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default MainTablePage;
