import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import { Card, Button, Form, Spinner, Row, Col, Table, Badge, Modal } from 'react-bootstrap';
import { 
  FaUserTie, FaTasks, FaClock, FaPlus, FaTrash, FaEdit, 
  FaCheckCircle, FaSearch, FaFileExcel, FaPrint, FaInfoCircle, FaSave
} from 'react-icons/fa';
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
    padding: '3px 6px'
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#2e7d32',
    ':hover': {
      backgroundColor: '#c8e6c9',
      color: '#b71c1c'
    }
  })
};

const ProfessorTasksPage = () => {
  const { user } = useContext(AuthContext);

  // Mapping from abbreviation to full academic title
  const jobTitleMap = {
    'أ.د': 'أستاذ',
    'أ.م.د': 'أستاذ مساعد',
    'أ.م': 'أستاذ',
    'د': 'مدرس',
    'م.م': 'مدرس مساعد',
    'م': 'مدرس',
    'م.ع': 'معيد',
    'معيد': 'معيد',
    'أخصائي': 'أخصائي',
    'أ': 'أستاذ',
    'ط': 'طبيب',
    'ص': 'صيدلي'
  };
  const getFullJobTitle = (abbr) => {
    if (!abbr || !abbr.trim()) return '-';
    return jobTitleMap[abbr.trim()] || abbr;
  };

  // Filters State
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(() => localStorage.getItem('mnu_default_academic_year') || "2026/2027");
  const [selectedSemester, setSelectedSemester] = useState(() => localStorage.getItem('mnu_default_semester') || "الفصل الدراسي الأول");

  // Data State
  const [professors, setProfessors] = useState([]);
  const [taskDefinitions, setTaskDefinitions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State (Multi-selection)
  const [selectedProfessors, setSelectedProfessors] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [hoursInput, setHoursInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  // Edit Assignment Modal State
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editHours, setEditHours] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  // Search filter for tables
  const [searchQuery, setSearchQuery] = useState("");

  const semesterOptions = [
    { value: "الفصل الدراسي الأول", label: "الفصل الدراسي الأول" },
    { value: "الفصل الدراسي الثاني", label: "الفصل الدراسي الثاني" },
    { value: "الفصل الدراسي الصيفي", label: "الفصل الدراسي الصيفي" }
  ];

  // 1. Initial load: Faculties, Academic Years, Task Definitions
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const token = localStorage.getItem('token');
        const [facRes, yearsRes, tasksRes] = await Promise.all([
          axios.get(`${API}/api/faculties`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/api/academic-years`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/api/assigned-tasks/definitions`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setFaculties(facRes.data || []);
        setTaskDefinitions(tasksRes.data || []);

        const years = (yearsRes.data || []).map(y => ({ value: y.name, label: y.name }));
        setAcademicYears(years);

        // Determine default faculty
        if (facRes.data && facRes.data.length > 0) {
          if (user?.role !== 'admin' && user?.faculty_id) {
            setSelectedFaculty(String(user.faculty_id));
          } else {
            setSelectedFaculty(String(facRes.data[0].id));
          }
        }

        if (years.length > 0) {
          const savedYear = localStorage.getItem('mnu_default_academic_year');
          const matched = years.find(y => y.value === savedYear);
          setSelectedYear(matched ? savedYear : years[0].value);
        }
      } catch (err) {
        console.error("Error loading initial data", err);
        toast.error("حدث خطأ أثناء تحميل البيانات الأولية");
      }
    };
    fetchInitial();
  }, [user]);

  // 2. Load Professors and Task Definitions when Faculty changes
  useEffect(() => {
    if (!selectedFaculty) return;
    const fetchProfessorsAndTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        const [profsRes, tasksRes] = await Promise.all([
          axios.get(`${API}/api/assigned-tasks/professors/${selectedFaculty}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/api/assigned-tasks/definitions`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        setProfessors(profsRes.data || []);
        setTaskDefinitions(tasksRes.data || []);
        setSelectedProfessors([]);
        setSelectedTasks([]);
      } catch (err) {
        console.error("Error fetching professors or tasks", err);
      }
    };
    fetchProfessorsAndTasks();
  }, [selectedFaculty]);

  // 3. Load Assigned Tasks when Faculty, Year, or Semester changes
  const fetchAssignments = async () => {
    if (!selectedFaculty || !selectedYear || !selectedSemester) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/assigned-tasks`, {
        params: {
          faculty_id: selectedFaculty,
          academic_year: selectedYear,
          semester: selectedSemester
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignments(res.data || []);
    } catch (err) {
      console.error("Error fetching assignments", err);
      toast.error("حدث خطأ أثناء تحميل بيانات الأعباء المسندة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedFaculty, selectedYear, selectedSemester]);

  // Handle Select All Professors
  const handleSelectAllProfessors = () => {
    if (selectedProfessors.length === professors.length) {
      setSelectedProfessors([]);
    } else {
      setSelectedProfessors(professors.map(p => ({ value: p.id, label: p.label })));
    }
  };

  // Handle Select All Tasks
  const handleSelectAllTasks = () => {
    if (selectedTasks.length === taskDefinitions.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(taskDefinitions.map(t => ({ value: t.id, label: t.name })));
    }
  };

  // Submit Bulk Assignment
  const handleBulkAssign = async (e) => {
    e.preventDefault();
    if (selectedProfessors.length === 0) {
      toast.error("يرجى اختيار عضو هيئة تدريس واحد على الأقل");
      return;
    }
    if (selectedTasks.length === 0) {
      toast.error("يرجى اختيار مهمة واحدة على الأقل");
      return;
    }

    const hoursVal = parseFloat(hoursInput);
    if (isNaN(hoursVal) || hoursVal < 0) {
      toast.error("يرجى إدخال عدد ساعات صحيح (0 أو أكثر)");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        faculty_id: parseInt(selectedFaculty),
        academic_year: selectedYear,
        semester: selectedSemester,
        professor_ids: selectedProfessors.map(p => p.value),
        task_ids: selectedTasks.map(t => t.value),
        hours: hoursVal,
        notes: notesInput.trim() || null
      };

      const res = await axios.post(`${API}/api/assigned-tasks/bulk-assign`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(res.data?.message || "تم إسناد المهام بنجاح!");
      setSelectedProfessors([]);
      setSelectedTasks([]);
      setHoursInput("");
      setNotesInput("");
      fetchAssignments();
    } catch (err) {
      console.error("Error bulk assigning", err);
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء إسناد المهام");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (assignId, profName, taskName) => {
    const isConfirmed = await confirmAction({
      title: 'حذف التكليف',
      message: `هل أنت متأكد من حذف تكليف الدكتور "${profName}" بمهمة "${taskName}"؟`,
      confirmButtonText: 'نعم، احذف',
      confirmButtonClass: 'btn btn-outline-danger mx-2 px-4 fw-semibold'
    });

    if (!isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/api/assigned-tasks/${assignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("تم حذف التكليف بنجاح");
      setAssignments(prev => prev.filter(a => a.id !== assignId));
    } catch (err) {
      console.error("Error deleting assignment", err);
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء حذف التكليف");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (assignment) => {
    setEditingAssignment(assignment);
    setEditHours(String(assignment.hours));
    setEditNotes(assignment.notes || "");
  };

  // Save Edit Assignment
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAssignment) return;
    const h = parseFloat(editHours);
    if (isNaN(h) || h < 0) {
      toast.error("يرجى إدخال عدد ساعات صحيح");
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/assigned-tasks/${editingAssignment.id}`, {
        hours: h,
        notes: editNotes.trim() || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("تم تحديث الساعات والملاحظات بنجاح");
      setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? { ...a, hours: h, notes: editNotes.trim() || null } : a));
      setEditingAssignment(null);
    } catch (err) {
      console.error("Error updating assignment", err);
      toast.error("حدث خطأ أثناء تحديث التكليف");
    } finally {
      setUpdating(false);
    }
  };

  // Export Task Table to Excel (matching deductions format)
  const handleExportTaskExcel = async (taskName, taskRecords) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(taskName.substring(0, 31), { views: [{ rightToLeft: true }] });
      const facultyName = currentFacultyName || "كلية غير محددة";
      const totalHours = taskRecords.reduce((sum, r) => sum + (r.hours || 0), 0);

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
          ext: { width: 95, height: 95 }
        });
      } catch (e) {
        console.warn('Could not load logo for Excel export', e);
      }

      // Title Banner
      worksheet.mergeCells('B2:G3');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = `كشف أعباء ومهام: ${taskName} - ${facultyName}`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1B5E20' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // System Name
      worksheet.mergeCells('B4:G4');
      const sysCell = worksheet.getCell('B4');
      sysCell.value = 'منظومة إدارة وتوزيع الخطط والأعباء الدراسية - إدارة شؤون الطلاب - جامعة المنوفية الأهلية';
      sysCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B5E20' } };
      sysCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Subtitle
      worksheet.mergeCells('B5:G5');
      const subCell = worksheet.getCell('B5');
      subCell.value = `العام الجامعي: ${selectedYear}   |   الفصل الدراسي: ${selectedSemester}   |   تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`;
      subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF555555' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Columns Setup
      worksheet.columns = [
        { key: 'index', width: 8 },
        { key: 'prof_name', width: 30 },
        { key: 'job_title', width: 22 },
        { key: 'workplace', width: 28 },
        { key: 'hours', width: 18 },
        { key: 'notes', width: 30 },
        { key: 'created_by', width: 25 }
      ];

      // Header Row (Row 7)
      const headerRowIndex = 7;
      const headerRow = worksheet.getRow(headerRowIndex);
      headerRow.values = ['#', 'اسم عضو هيئة التدريس', 'الدرجة العلمية', 'جهة العمل الأصلية', 'عدد الساعات المحملة', 'ملاحظات', 'سُجل بواسطة'];
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
      taskRecords.forEach((r, idx) => {
        const creatorText = r.created_by_name ? (r.created_by_job ? `${r.created_by_name} (${r.created_by_job})` : r.created_by_name) : '-';
        const abbr = (r.professor_job_title || '').trim();
        const profDisplayName = abbr ? `${abbr}/ ${r.professor_name || 'غير محدد'}` : (r.professor_name || 'غير محدد');
        const row = worksheet.addRow({
          index: idx + 1,
          prof_name: profDisplayName,
          job_title: getFullJobTitle(r.professor_job_title),
          workplace: r.professor_workplace || '-',
          hours: r.hours,
          notes: r.notes || '-',
          created_by: creatorText
        });

        row.height = 22;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'right' : 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
          };
          // Highlight hours column
          if (colNumber === 5) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1B5E20' } };
          }
        });
      });

      // Total Row
      const totalRow = worksheet.addRow({
        index: '',
        prof_name: `إجمالي عدد الأعضاء: ${taskRecords.length}`,
        job_title: '',
        workplace: '',
        hours: totalHours,
        notes: '',
        created_by: ''
      });
      totalRow.height = 26;
      worksheet.mergeCells(`B${totalRow.number}:D${totalRow.number}`);

      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1B5E20' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F5E9' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF2E7D32' } },
          bottom: { style: 'medium', color: { argb: 'FF2E7D32' } },
          left: { style: 'thin', color: { argb: 'FF2E7D32' } },
          right: { style: 'thin', color: { argb: 'FF2E7D32' } }
        };
        if (colNumber === 5) {
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF2E7D32' } };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const safeFacName = facultyName.replace(/[\/\\:*?"<>|]/g, '_');
      const safeTaskName = taskName.replace(/[\/\\:*?"<>|]/g, '_');
      saveAs(new Blob([buffer]), `كشف_${safeTaskName}_${safeFacName}_${selectedYear.replace('/', '-')}_${selectedSemester}.xlsx`);
      toast.success("تم تصدير ملف Excel بنجاح!");
    } catch (err) {
      console.error("Excel export error", err);
      toast.error("حدث خطأ أثناء تصدير Excel");
    }
  };

  // Group assignments by Task
  const groupedTasks = useMemo(() => {
    const groups = {};

    taskDefinitions.forEach(t => {
      groups[t.id] = {
        task_id: t.id,
        task_name: t.name,
        default_hours: t.default_hours,
        description: t.description,
        records: []
      };
    });

    assignments.forEach(assign => {
      if (!groups[assign.task_id]) {
        groups[assign.task_id] = {
          task_id: assign.task_id,
          task_name: assign.task_name,
          records: []
        };
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const pName = (assign.professor_name || "").toLowerCase();
        const job = (assign.professor_job_title || "").toLowerCase();
        const workplace = (assign.professor_workplace || "").toLowerCase();
        if (!pName.includes(q) && !job.includes(q) && !workplace.includes(q)) {
          return;
        }
      }
      groups[assign.task_id].records.push(assign);
    });

    return Object.values(groups);
  }, [taskDefinitions, assignments, searchQuery]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    const uniqueProfIds = new Set(assignments.map(a => a.professor_id));
    const totalHours = assignments.reduce((acc, curr) => acc + (curr.hours || 0), 0);
    return {
      uniqueProfessorsCount: uniqueProfIds.size,
      totalAssignments: assignments.length,
      totalHours: totalHours
    };
  }, [assignments]);

  const currentFacultyName = faculties.find(f => String(f.id) === String(selectedFaculty))?.name || "";

  return (
    <div className="container-fluid py-4" dir="rtl">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-success d-flex align-items-center gap-3 mb-1" style={{ fontSize: '1.85rem' }}>
            <FaTasks className="text-success" />
            <span>أعباء إضافية لأعضاء هيئة التدريس</span>
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '1rem' }}>
            إسناد وإدارة ساعات المهام الإضافية (الكنترول، الإرشاد الأكاديمي، اللجان والامتحانات) لأعضاء هيئة التدريس بالكلية
          </p>
        </div>

        {/* Global summary badges */}
        <div className="d-flex gap-2 flex-wrap">
          <div className="bg-white border rounded-3 px-3 py-2 shadow-sm d-flex align-items-center gap-2">
            <FaUserTie className="text-success" size={20} />
            <div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>الدكاترة المكلفين</div>
              <div className="fw-bold text-dark fs-6">{overallStats.uniqueProfessorsCount} عضو</div>
            </div>
          </div>
          <div className="bg-white border rounded-3 px-3 py-2 shadow-sm d-flex align-items-center gap-2">
            <FaTasks className="text-primary" size={20} />
            <div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>إجمالي التكليفات</div>
              <div className="fw-bold text-dark fs-6">{overallStats.totalAssignments} تكليف</div>
            </div>
          </div>
          <div className="bg-white border rounded-3 px-3 py-2 shadow-sm d-flex align-items-center gap-2">
            <FaClock className="text-warning" size={20} />
            <div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>إجمالي الساعات المحملة</div>
              <div className="fw-bold text-dark fs-6">{overallStats.totalHours} ساعة</div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Scope Selectors Card (الكلية، العام، الفصل) */}
      <Card className="shadow-sm border-0 rounded-4 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            {/* Faculty */}
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold text-success mb-1" style={{ fontSize: '0.95rem' }}>الكلية</Form.Label>
                <Select
                  styles={customSelectStyles}
                  placeholder="اختر الكلية..."
                  value={faculties.map(f => ({ value: String(f.id), label: f.name })).find(o => o.value === String(selectedFaculty))}
                  onChange={(selected) => setSelectedFaculty(selected ? selected.value : "")}
                  options={faculties.map(f => ({ value: String(f.id), label: f.name }))}
                  isDisabled={user?.role !== 'admin' && !user?.all_faculties_access}
                  isSearchable
                />
              </Form.Group>
            </Col>

            {/* Academic Year */}
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold text-success mb-1" style={{ fontSize: '0.95rem' }}>العام الجامعي</Form.Label>
                <Select
                  styles={customSelectStyles}
                  placeholder="اختر العام الجامعي..."
                  value={academicYears.find(o => o.value === selectedYear)}
                  onChange={(selected) => setSelectedYear(selected ? selected.value : "")}
                  options={academicYears}
                  isSearchable
                />
              </Form.Group>
            </Col>

            {/* Semester */}
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold text-success mb-1" style={{ fontSize: '0.95rem' }}>الفصل الدراسي</Form.Label>
                <Select
                  styles={customSelectStyles}
                  placeholder="اختر الفصل الدراسي..."
                  value={semesterOptions.find(o => o.value === selectedSemester)}
                  onChange={(selected) => setSelectedSemester(selected ? selected.value : "")}
                  options={semesterOptions}
                  isSearchable
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 2. Assignment Form Card (Multi-select) */}
      <Card className="shadow-sm border-0 rounded-4 mb-4" style={{ borderTop: '4px solid #2e7d32' }}>
        <Card.Header className="bg-white border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold text-success mb-0 d-flex align-items-center gap-2">
            <FaPlus size={16} />
            <span>إسناد مهام وتحميل ساعات على أعضاء هيئة التدريس</span>
          </h5>
          <Badge bg="light" text="dark" className="border px-3 py-2 fw-normal" style={{ fontSize: '0.85rem' }}>
            <FaInfoCircle className="me-1 text-primary" />
            يمكنك اختيار أكثر من عضو وأكثر من مهمة في نفس الوقت
          </Badge>
        </Card.Header>
        <Card.Body className="p-4 pt-2">
          <Form onSubmit={handleBulkAssign}>
            <Row className="g-3">
              {/* Professors Multi-Select */}
              <Col md={6}>
                <Form.Group>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>
                      أعضاء هيئة التدريس بالكلية <span className="text-danger">*</span>
                    </Form.Label>
                    <Button 
                      variant="link" 
                      className="p-0 text-success fw-bold text-decoration-none" 
                      style={{ fontSize: '0.82rem' }}
                      onClick={handleSelectAllProfessors}
                    >
                      {selectedProfessors.length === professors.length && professors.length > 0 ? "إلغاء التحديد" : "تحديد جميع الدكاترة"}
                    </Button>
                  </div>
                  <Select
                    isMulti
                    styles={customSelectStyles}
                    placeholder="اختر عضو أو أكثر من أعضاء هيئة التدريس..."
                    value={selectedProfessors}
                    onChange={(val) => setSelectedProfessors(val || [])}
                    options={professors.map(p => ({ value: p.id, label: p.label }))}
                    noOptionsMessage={() => "لا يوجد أعضاء هيئة تدريس مسجلين بالكلية"}
                    isSearchable
                    closeMenuOnSelect={false}
                  />
                  <small className="text-muted d-block mt-1">
                    تم اختيار: <strong className="text-success">{selectedProfessors.length}</strong> من أصل {professors.length} عضو
                  </small>
                </Form.Group>
              </Col>

              {/* Tasks Multi-Select */}
              <Col md={6}>
                <Form.Group>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>
                      المهام المسندة <span className="text-danger">*</span>
                    </Form.Label>
                    <Button 
                      variant="link" 
                      className="p-0 text-success fw-bold text-decoration-none" 
                      style={{ fontSize: '0.82rem' }}
                      onClick={handleSelectAllTasks}
                    >
                      {selectedTasks.length === taskDefinitions.length && taskDefinitions.length > 0 ? "إلغاء التحديد" : "تحديد جميع المهام"}
                    </Button>
                  </div>
                  <Select
                    isMulti
                    styles={customSelectStyles}
                    placeholder="اختر مهمة أو أكثر (الكنترول، الإرشاد، اللجان...)..."
                    value={selectedTasks}
                    onChange={(val) => {
                      setSelectedTasks(val || []);
                      if (val && val.length === 1 && (!hoursInput || hoursInput === "0")) {
                        const tDef = taskDefinitions.find(t => t.id === val[0].value);
                        if (tDef && tDef.default_hours > 0) {
                          setHoursInput(String(tDef.default_hours));
                        }
                      }
                    }}
                    options={taskDefinitions.map(t => ({ value: t.id, label: t.name }))}
                    noOptionsMessage={() => "لا توجد مهام معرفة في لوحة التحكم"}
                    isSearchable
                    closeMenuOnSelect={false}
                  />
                  <small className="text-muted d-block mt-1">
                    تم اختيار: <strong className="text-success">{selectedTasks.length}</strong> من أصل {taskDefinitions.length} مهمة
                  </small>
                </Form.Group>
              </Col>

              {/* Hours Input */}
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold text-dark mb-1" style={{ fontSize: '0.92rem' }}>
                    عدد الساعات المحملة <span className="text-danger">*</span>
                  </Form.Label>
                  <div className="input-group">
                    <Form.Control
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="مثال: 4"
                      value={hoursInput}
                      onChange={(e) => setHoursInput(e.target.value)}
                      style={{ borderRadius: '0 10px 10px 0', fontSize: '0.95rem' }}
                      required
                    />
                    <span className="input-group-text bg-light text-muted fw-bold" style={{ borderRadius: '10px 0 0 10px' }}>
                      ساعة
                    </span>
                  </div>
                </Form.Group>
              </Col>

              {/* Notes Input */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold text-dark mb-1" style={{ fontSize: '0.92rem' }}>
                    ملاحظات أو توصيف للمهمة (اختياري)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="مثال: رئيس كنترول المستوى الثاني / منسق الإرشاد..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    style={{ borderRadius: '10px', fontSize: '0.95rem' }}
                  />
                </Form.Group>
              </Col>

              {/* Submit Button */}
              <Col md={3} className="d-flex align-items-end">
                <Button
                  type="submit"
                  variant="success"
                  className="w-100 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  style={{ borderRadius: '10px', height: '44px', fontSize: '0.95rem' }}
                  disabled={submitting || selectedProfessors.length === 0 || selectedTasks.length === 0}
                >
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>إسناد الأعباء وحفظ</span>
                    </>
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* 3. Search and Actions Row */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <h4 className="fw-bold text-dark mb-0 fs-5">
            جداول المهام المسندة في {selectedSemester} ({selectedYear})
          </h4>
        </div>
        <div style={{ minWidth: '280px', maxWidth: '400px' }}>
          <div className="input-group">
            <span className="input-group-text bg-white border-start-0" style={{ borderRadius: '0 10px 10px 0' }}>
              <FaSearch className="text-muted" />
            </span>
            <Form.Control
              type="text"
              placeholder="بحث باسم عضو هيئة التدريس أو الوظيفة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-end-0"
              style={{ borderRadius: '10px 0 0 10px', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      </div>

      {/* 4. Separate Tables Per Task */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="success" />
          <p className="mt-3 fw-bold text-success">جاري تحميل جداول الأعباء والمهام...</p>
        </div>
      ) : groupedTasks.length === 0 ? (
        <Card className="text-center p-5 border-0 shadow-sm rounded-4">
          <FaTasks size={40} className="text-muted mx-auto mb-3" />
          <h5 className="text-muted fw-bold">لا توجد مهام معرفة في النظام</h5>
          <p className="text-muted mb-0">يمكنك تعريف المهام مثل (الكنترول، الإرشاد، اللجان) من صفحة لوحة التحكم.</p>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-4">
          {groupedTasks.map((group) => {
            const taskRecords = group.records || [];
            const taskTotalHours = taskRecords.reduce((acc, curr) => acc + (curr.hours || 0), 0);

            return (
              <Card key={group.task_id} className="shadow-sm border-0 rounded-4 overflow-hidden">
                {/* Task Header */}
                <Card.Header className="bg-white border-bottom p-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ borderRight: '5px solid #2e7d32' }}>
                  <div className="d-flex align-items-center gap-3">
                    <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <span className="badge bg-success-subtle text-success p-2 rounded-circle">📋</span>
                      <span>جدول: {group.task_name}</span>
                    </h5>
                    {group.description && (
                      <span className="text-muted d-none d-md-inline" style={{ fontSize: '0.85rem' }}>
                        ({group.description})
                      </span>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Badge bg="success" className="px-3 py-2 fw-bold" style={{ fontSize: '0.85rem' }}>
                      عدد الدكاترة المكلفين: {taskRecords.length}
                    </Badge>
                    <Badge bg="warning" text="dark" className="px-3 py-2 fw-bold" style={{ fontSize: '0.85rem' }}>
                      إجمالي الساعات: {taskTotalHours} ساعة
                    </Badge>
                    {taskRecords.length > 0 && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="fw-bold d-flex align-items-center gap-1 py-1 px-3 rounded-3"
                        onClick={() => handleExportTaskExcel(group.task_name, taskRecords)}
                      >
                        <FaFileExcel />
                        <span>تصدير Excel</span>
                      </Button>
                    )}
                  </div>
                </Card.Header>

                {/* Task Table */}
                <Card.Body className="p-0">
                  {taskRecords.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <p className="mb-0 fw-semibold" style={{ fontSize: '0.95rem' }}>
                        لا يوجد أعضاء هيئة تدريس مسند لهم مهمة "{group.task_name}" حتى الآن في هذا الفصل.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table hover className="align-middle mb-0 text-center">
                        <thead className="table-light text-secondary" style={{ fontSize: '0.9rem' }}>
                          <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th style={{ width: '220px' }}>بواسطة</th>
                            <th className="text-end" style={{ width: '260px' }}>اسم عضو هيئة التدريس</th>
                            <th style={{ width: '160px' }}>الدرجة العلمية</th>
                            <th style={{ width: '200px' }}>جهة العمل الأصلية</th>
                            <th style={{ width: '140px' }}>الساعات المحملة</th>
                            <th>ملاحظات وتفاصيل</th>
                            <th style={{ width: '110px' }}>إجراءات</th>
                          </tr>
                        </thead>
                        <tbody style={{ fontSize: '0.92rem' }}>
                          {taskRecords.map((r, idx) => (
                            <tr key={r.id}>
                              <td className="text-muted fw-bold">{idx + 1}</td>
                              <td>
                                {r.created_by_name ? (
                                  <div className="d-flex flex-column align-items-center justify-content-center">
                                    <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                                      {r.created_by_name}
                                    </span>
                                    {r.created_by_job && (
                                      <span className="badge bg-light text-secondary border mt-1" style={{ fontSize: '0.78rem' }}>
                                        {r.created_by_job}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </td>
                              <td className="text-end fw-bold text-dark">
                                <div className="d-flex align-items-center gap-2">
                                  <FaUserTie className="text-success flex-shrink-0" />
                                  <span>{r.professor_job_title ? `${r.professor_job_title}/ ` : ''}{r.professor_name}</span>
                                </div>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border px-2 py-1">
                                  {getFullJobTitle(r.professor_job_title)}
                                </span>
                              </td>
                              <td className="text-muted">
                                {r.professor_workplace || "-"}
                              </td>
                              <td>
                                <span className="badge bg-success-subtle text-success px-3 py-1 fs-6 fw-bold border border-success-subtle">
                                  {r.hours} ساعة
                                </span>
                              </td>
                              <td className="text-muted">
                                {r.notes || "-"}
                              </td>
                              <td>
                                <div className="d-flex justify-content-center gap-2">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="p-1 px-2 rounded-2"
                                    title="تعديل الساعات والملاحظات"
                                    onClick={() => handleOpenEdit(r)}
                                  >
                                    <FaEdit size={13} />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="p-1 px-2 rounded-2"
                                    title="حذف التكليف"
                                    onClick={() => handleDeleteAssignment(r.id, r.professor_name, r.task_name)}
                                  >
                                    <FaTrash size={13} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="table-light">
                          <tr>
                            <td colSpan={5} className="text-end fw-bold py-2 px-3 text-success">
                              إجمالي ساعات مهمة ({group.task_name}):
                            </td>
                            <td className="fw-bold text-success py-2">
                              {taskTotalHours} ساعة
                            </td>
                            <td colSpan={2} className="text-muted text-start py-2 px-3" style={{ fontSize: '0.85rem' }}>
                              عدد الأعضاء المكلفين: {taskRecords.length}
                            </td>
                          </tr>
                        </tfoot>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Modal show={!!editingAssignment} onHide={() => setEditingAssignment(null)} centered dir="rtl">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-success fs-5">
            تعديل تكليف: {editingAssignment?.professor_name}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveEdit}>
          <Modal.Body className="pt-2">
            <div className="bg-light p-3 rounded-3 mb-3">
              <div className="mb-1">
                <strong>المهمة: </strong>
                <span className="text-success fw-bold">{editingAssignment?.task_name}</span>
              </div>
              <div className="mb-1">
                <strong>الكلية: </strong>
                <span>{currentFacultyName}</span>
              </div>
              <div>
                <strong>الفصل: </strong>
                <span>{selectedSemester} ({selectedYear})</span>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">عدد الساعات المحملة <span className="text-danger">*</span></Form.Label>
              <div className="input-group">
                <Form.Control
                  type="number"
                  step="0.5"
                  min="0"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  required
                />
                <span className="input-group-text bg-light text-muted">ساعة</span>
              </div>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="fw-bold">ملاحظات أو توصيف</Form.Label>
              <Form.Control
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="ملاحظات اختيارية..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="secondary" onClick={() => setEditingAssignment(null)} className="rounded-3">
              إلغاء
            </Button>
            <Button variant="success" type="submit" disabled={updating} className="rounded-3 fw-bold">
              {updating ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ProfessorTasksPage;
