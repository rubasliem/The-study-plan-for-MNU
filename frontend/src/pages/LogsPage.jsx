import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Container, Card, Table, Button, Spinner, Form, Badge, Modal, Row, Col, Pagination } from 'react-bootstrap';
import { 
    FaHistory, FaFilter, FaPrint, FaFileExcel, FaTrash, FaSync, 
    FaUserShield, FaSignInAlt, FaExclamationTriangle, FaCheckCircle, 
    FaTimesCircle, FaEye, FaSearch, FaShieldAlt, FaDesktop, FaCalendarAlt
} from 'react-icons/fa';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import logo from '../assets/logo.png';
import { confirmAction } from '../utils/confirmAlert';
import toast from 'react-hot-toast';

const API = "";

const LogsPage = () => {
    const { user } = useContext(AuthContext);

    // Logs & Stats state
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        today: 0,
        logins: 0,
        failed_logins: 0,
        creates: 0,
        updates: 0,
        deletes: 0
    });
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filters state
    const [search, setSearch] = useState('');
    const [actionType, setActionType] = useState('');
    const [entityType, setEntityType] = useState('');
    const [facultyId, setFacultyId] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Auxiliary data
    const [faculties, setFaculties] = useState([]);

    // Selection & Modals
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Fetch faculties for filter dropdown
    useEffect(() => {
        axios.get(`${API}/api/faculties`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(res => setFaculties(res.data || []))
          .catch(err => console.error("Error loading faculties", err));
    }, []);

    // Fetch Stats
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const res = await axios.get(`${API}/api/logs/stats`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setStats(res.data);
        } catch (err) {
            console.error("Error fetching log stats", err);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Fetch Logs
    const fetchLogs = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const params = {
                page: targetPage,
                limit: limit
            };
            if (search.trim()) params.search = search.trim();
            if (actionType) params.action_type = actionType;
            if (entityType) params.entity_type = entityType;
            if (facultyId) params.faculty_id = facultyId;
            if (statusFilter) params.status = statusFilter;
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;

            const res = await axios.get(`${API}/api/logs`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params
            });

            setLogs(res.data.items || []);
            setTotalItems(res.data.total || 0);
            setTotalPages(res.data.total_pages || 1);
            setPage(res.data.page || 1);
            setSelectedIds([]);
        } catch (err) {
            console.error("Error fetching activity logs", err);
            toast.error("فشل في تحميل سجل العمليات");
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, actionType, entityType, facultyId, statusFilter, fromDate, toDate]);

    // Initial load and on filter changes
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchLogs(1);
    }, [actionType, entityType, facultyId, statusFilter, fromDate, toDate, limit]);

    // Search with enter key or manual trigger
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchLogs(1);
    };

    const handleResetFilters = () => {
        setSearch('');
        setActionType('');
        setEntityType('');
        setFacultyId('');
        setStatusFilter('');
        setFromDate('');
        setToDate('');
        setPage(1);
    };

    // Helper to safely extract error message string from Axios error (prevents React 19 object child crash)
    const getErrorMessage = (err, fallback) => {
        const detail = err?.response?.data?.detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && detail.length > 0) {
            return detail.map(d => (typeof d === 'string' ? d : (d.msg || JSON.stringify(d)))).join(' | ');
        }
        if (typeof detail === 'object' && detail !== null) {
            return detail.msg || JSON.stringify(detail);
        }
        return err?.message || fallback || 'حدث خطأ غير متوقع';
    };

    // Actions
    const handleDeleteSingle = async (id) => {
        if (!(await confirmAction("هل أنت متأكد من حذف هذا السجل نهائياً؟"))) return;
        try {
            await axios.delete(`${API}/api/logs/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success("تم حذف السجل بنجاح");
            fetchLogs(page);
            fetchStats();
        } catch (err) {
            toast.error(getErrorMessage(err, "فشل حذف السجل"));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!(await confirmAction(`هل أنت متأكد من حذف ${selectedIds.length} سجل محدد نهائياً؟`))) return;
        try {
            await axios.post(`${API}/api/logs/bulk-delete`, { ids: selectedIds }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success(`تم حذف ${selectedIds.length} سجل بنجاح`);
            setSelectedIds([]);
            fetchLogs(1);
            fetchStats();
        } catch (err) {
            toast.error(getErrorMessage(err, "فشل الحذف الجماعي"));
        }
    };

    const handleClearAll = async () => {
        if (!(await confirmAction("تحذير: هل أنت متأكد من مسح جميع السجلات والأنشطة نهائياً؟ لا يمكن التراجع عن هذا الإجراء!"))) return;
        try {
            await axios.delete(`${API}/api/logs/clear-all`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success("تم مسح كافة السجلات بنجاح");
            fetchLogs(1);
            fetchStats();
        } catch (err) {
            toast.error(getErrorMessage(err, "فشل مسح السجلات"));
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(logs.map(l => l.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    // Helper functions for formatting & badges
    const getActionBadge = (type) => {
        switch (type) {
            case 'LOGIN':
                return <Badge bg="success" className="px-2 py-1"><FaSignInAlt className="me-1" /> تسجيل دخول</Badge>;
            case 'LOGIN_FAILED':
                return <Badge bg="danger" className="px-2 py-1"><FaTimesCircle className="me-1" /> محاولة فاشلة</Badge>;
            case 'CREATE':
                return <Badge bg="success" className="px-2 py-1">إضافة جديدة</Badge>;
            case 'UPDATE':
                return <Badge bg="warning" text="dark" className="px-2 py-1">تعديل</Badge>;
            case 'DELETE':
                return <Badge bg="danger" className="px-2 py-1">حذف</Badge>;
            case 'APPROVE':
                return <Badge bg="primary" className="px-2 py-1">اعتماد</Badge>;
            case 'RESTORE':
                return <Badge bg="info" text="dark" className="px-2 py-1">استرجاع</Badge>;
            case 'EXPORT':
                return <Badge bg="secondary" className="px-2 py-1">تصدير / طباعة</Badge>;
            case 'SECURITY':
                return <Badge bg="dark" className="px-2 py-1"><FaShieldAlt className="me-1" /> أمان وكلمة مرور</Badge>;
            default:
                return <Badge bg="light" text="dark" className="border px-2 py-1">{type}</Badge>;
        }
    };

    const getEntityBadge = (entity) => {
        const map = {
            'AUTH': { label: 'المصادقة والأمان', color: 'secondary' },
            'PROFESSORS': { label: 'أعضاء التدريس', color: 'primary' },
            'COURSES': { label: 'المقررات الدراسية', color: 'info' },
            'STUDY_PLAN': { label: 'الخطة الدراسية', color: 'success' },
            'USERS': { label: 'المستخدمين والصلاحيات', color: 'warning' },
            'SIGNATURES': { label: 'التوقيعات', color: 'dark' },
            'RECYCLE_BIN': { label: 'سلة المحذوفات', color: 'danger' },
            'SYSTEM': { label: 'النظام العام', color: 'secondary' },
        };
        const item = map[entity] || { label: entity, color: 'light' };
        return <span className={`badge bg-${item.color}-subtle text-${item.color} border px-2 py-1`} style={{ fontSize: '0.82rem' }}>{item.label}</span>;
    };

    const formatDate = (dateInput) => {
        if (!dateInput) return '—';
        try {
            const d = (dateInput instanceof Date) 
                ? dateInput 
                : new Date(typeof dateInput === 'string' && dateInput.endsWith('Z') ? dateInput : dateInput + 'Z');
            if (isNaN(d.getTime())) return String(dateInput);
            
            const day = d.getDate();
            const month = d.getMonth() + 1;
            const year = d.getFullYear();
            
            let hours = d.getHours();
            const ampm = hours >= 12 ? 'م' : 'ص';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const formattedHours = String(hours).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            
            return `${day}/${month}/${year} - ${formattedHours}:${minutes}:${seconds} ${ampm}`;
        } catch {
            return String(dateInput);
        }
    };

    // Excel Export
    const exportToExcel = async () => {
        try {
            toast.loading("جاري إعداد ملف Excel...", { id: "excel-export" });
            
            // Get all filtered logs without limit for export
            const params = {
                page: 1,
                limit: 0
            };
            if (search.trim()) params.search = search.trim();
            if (actionType) params.action_type = actionType;
            if (entityType) params.entity_type = entityType;
            if (facultyId) params.faculty_id = facultyId;
            if (statusFilter) params.status = statusFilter;
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;

            const res = await axios.get(`${API}/api/logs`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params
            });
            const exportItems = res.data.items || [];

            if (exportItems.length === 0) {
                toast.error("لا توجد سجلات مطابقة لتصديرها", { id: "excel-export" });
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('سجل العمليات', { views: [{ rightToLeft: true }] });

            // Try load logo
            try {
                const response = await fetch(logo);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                const logoImageId = workbook.addImage({
                    buffer: arrayBuffer,
                    extension: 'png',
                });
                worksheet.addImage(logoImageId, {
                    tl: { col: 0.5, row: 0.2 },
                    ext: { width: 75, height: 75 }
                });
            } catch (e) {
                console.error("Failed to add logo to excel", e);
            }

            // Title
            worksheet.mergeCells('B2:F3');
            const titleCell = worksheet.getCell('B2');
            titleCell.value = 'جامعة المنوفية الأهلية - سجل العمليات والأنشطة (Audit Logs)';
            titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF2E7D32' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

            // Subtitle with date
            worksheet.mergeCells('B4:F4');
            const subCell = worksheet.getCell('B4');
            subCell.value = `تاريخ استخراج التقرير: ${formatDate(new Date())} | إجمالي السجلات: ${exportItems.length}`;
            subCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF555555' } };
            subCell.alignment = { vertical: 'middle', horizontal: 'center' };

            const headerRowIndex = 6;
            worksheet.columns = [
                { key: 'id', width: 10 },
                { key: 'datetime', width: 25 },
                { key: 'username', width: 20 },
                { key: 'role', width: 22 },
                { key: 'action', width: 18 },
                { key: 'entity', width: 22 },
                { key: 'description', width: 65 },
                { key: 'faculty', width: 28 },
                { key: 'ip', width: 18 },
                { key: 'status', width: 14 },
            ];

            const headerRow = worksheet.getRow(headerRowIndex);
            headerRow.values = ['#', 'التاريخ والوقت', 'اسم المستخدم', 'الدور الوظيفي', 'نوع العملية', 'القسم / الصفحة', 'تفاصيل البيان', 'الكلية', 'عنوان IP', 'الحالة'];
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 32;

            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2E7D32' }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Freeze
            worksheet.views = [
                { state: 'frozen', xSplit: 0, ySplit: headerRowIndex, rightToLeft: true }
            ];

            // Rows
            exportItems.forEach((logItem, idx) => {
                const row = worksheet.addRow({
                    id: idx + 1,
                    datetime: formatDate(logItem.created_at),
                    username: logItem.username || '—',
                    role: logItem.user_role || '—',
                    action: logItem.action_type || '—',
                    entity: logItem.entity_type || '—',
                    description: logItem.description || '—',
                    faculty: logItem.faculty_name || 'عام / غير محدد',
                    ip: logItem.ip_address || '—',
                    status: logItem.status === 'success' ? 'ناجح' : (logItem.status === 'failed' ? 'فشل' : logItem.status)
                });

                row.eachCell((cell, colNumber) => {
                    cell.alignment = { vertical: 'middle', horizontal: colNumber === 7 ? 'right' : 'center', wrapText: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };
                    if (logItem.status === 'failed') {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFDE8E8' }
                        };
                    }
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `سجل_العمليات_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success("تم تصدير سجل العمليات بنجاح", { id: "excel-export" });
        } catch (e) {
            console.error("Excel export error", e);
            toast.error("حدث خطأ أثناء تصدير Excel", { id: "excel-export" });
        }
    };

    const isAdmin = user?.role === 'admin';

    return (
        <Container fluid className="py-4">
            {/* Print Stylesheet */}
            <style>{`
                @page {
                    size: A4 landscape;
                    margin: 8mm 6mm;
                }
                @media print {
                    html, body {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif !important;
                    }
                    .no-print, .d-print-none, .sidebar, aside, nav {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .container-fluid {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    .card {
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .card-body {
                        padding: 0 !important;
                    }
                    .table-responsive {
                        overflow: visible !important;
                        overflow-x: visible !important;
                        display: block !important;
                        width: 100% !important;
                    }
                    .logs-custom-table {
                        width: 100% !important;
                        max-width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: collapse !important;
                        margin: 0 !important;
                        font-size: 8.5pt !important;
                    }
                    .logs-custom-table th,
                    .logs-custom-table td {
                        border: 1px solid #777777 !important;
                        padding: 5px 4px !important;
                        line-height: 1.3 !important;
                        word-break: break-word !important;
                        overflow-wrap: anywhere !important;
                    }
                    .logs-custom-table thead th {
                        background-color: #2e7d32 !important;
                        color: #ffffff !important;
                        font-weight: bold !important;
                        font-size: 9pt !important;
                        text-align: center !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .logs-custom-table tbody tr:nth-child(even) td {
                        background-color: #f8faf8 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .logs-custom-table tbody tr.row-failed td {
                        background-color: #fdf2f2 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .logs-custom-table tbody tr {
                        page-break-inside: avoid !important;
                    }
                    .badge {
                        border: 1px solid #bbb !important;
                        font-size: 8pt !important;
                        padding: 2px 4px !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 d-print-none">
                <div>
                    <h2 className="d-flex align-items-center gap-2 m-0 fw-bold" style={{ color: '#2e7d32' }}>
                        <FaHistory /> سجل العمليات والأنشطة (Logs)
                        {totalItems > 0 && (
                            <Badge bg="secondary" className="fs-6 ms-2">
                                {totalItems.toLocaleString()} حركة
                            </Badge>
                        )}
                    </h2>
                    <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.95rem' }}>
                        متابعة دقيقة وفورية لحركات المستخدمين، تسجيل الدخول، التعديلات، والأمان.
                    </p>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                    <Button 
                        variant="outline-secondary" 
                        className="d-flex align-items-center gap-2"
                        onClick={() => { fetchLogs(page); fetchStats(); }}
                        title="تحديث البيانات"
                    >
                        <FaSync className={loading || statsLoading ? 'fa-spin' : ''} /> تحديث
                    </Button>

                    <Button 
                        variant="success" 
                        className="d-flex align-items-center gap-2 text-white fw-semibold"
                        onClick={exportToExcel}
                        title="تصدير إلى Excel"
                    >
                        <FaFileExcel /> تصدير Excel
                    </Button>

                    <Button 
                        variant="info" 
                        className="d-flex align-items-center gap-2 text-white fw-semibold"
                        onClick={() => window.print()}
                        title="طباعة"
                    >
                        <FaPrint /> طباعة
                    </Button>

                    {isAdmin && selectedIds.length > 0 && (
                        <Button 
                            variant="danger" 
                            className="d-flex align-items-center gap-2 fw-semibold"
                            onClick={handleBulkDelete}
                        >
                            <FaTrash /> حذف المحدد ({selectedIds.length})
                        </Button>
                    )}

                    {isAdmin && (
                        <Button 
                            variant="outline-danger" 
                            size="sm"
                            className="d-flex align-items-center gap-1"
                            onClick={handleClearAll}
                            title="مسح كل السجلات"
                        >
                            مسح شامل
                        </Button>
                    )}
                </div>
            </div>

            {/* Official Print Header */}
            <div className="d-none d-print-block mb-3">
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom border-2 border-success">
                    {/* Right side in RTL: University Info with Logo */}
                    <div className="d-flex align-items-center gap-3">
                        <img src={logo} alt="MNU Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain' }} />
                        <div className="text-end">
                            <h4 className="fw-bold mb-0" style={{ color: '#2e7d32', fontSize: '1.25rem' }}>جامعة المنوفية الأهلية</h4>
                            <div className="fw-bold text-dark" style={{ fontSize: '0.92rem' }}>إدارة تكنولوجيا المعلومات والنظم</div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>منظومة إدارة وتوزيع الخطط الدراسية</div>
                        </div>
                    </div>

                    {/* Center: Title */}
                    <div className="text-center">
                        <div className="px-4 py-2 rounded-3 border border-2 border-success bg-light d-inline-block">
                            <h4 className="fw-bold mb-0 text-success" style={{ fontSize: '1.2rem' }}>تقرير سجل العمليات والأنشطة (Audit Logs)</h4>
                        </div>
                    </div>

                    {/* Left side in RTL: Report Metadata */}
                    <div className="text-start" style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>
                        <div>
                            <strong>تاريخ الطباعة: </strong>
                            <span dir="ltr" style={{ display: 'inline-block', direction: 'ltr', fontFamily: 'Consolas, Monaco, "Segoe UI", sans-serif', fontWeight: 600 }}>
                                {formatDate(new Date())}
                            </span>
                        </div>
                        <div>
                            <strong>إجمالي السجلات: </strong>
                            <span dir="ltr" style={{ display: 'inline-block', direction: 'ltr', fontWeight: 600 }}>
                                {totalItems.toLocaleString('en-US')}
                            </span> حركة
                        </div>
                        {facultyId && (
                            <div><strong>الكلية:</strong> {faculties.find(f => String(f.id) === String(facultyId))?.name}</div>
                        )}
                        {actionType && (
                            <div><strong>نوع الحركة:</strong> {actionType}</div>
                        )}
                        {entityType && (
                            <div><strong>القسم:</strong> {entityType}</div>
                        )}
                        {fromDate && toDate && (
                            <div><strong>الفترة:</strong> من {fromDate} إلى {toDate}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Stat Cards */}
            <Row className="g-3 mb-4 d-print-none">
                <Col xs={12} sm={6} md={3}>
                    <Card className="border-0 shadow-sm rounded-3 h-100" style={{ borderRight: '4px solid #2e7d32' }}>
                        <Card.Body className="d-flex align-items-center justify-content-between p-3">
                            <div>
                                <span className="text-muted fw-semibold d-block mb-1" style={{ fontSize: '0.85rem' }}>إجمالي العمليات</span>
                                <h3 className="fw-bold m-0" style={{ color: '#2e7d32' }}>{stats.total.toLocaleString()}</h3>
                                <small className="text-muted">{stats.today} حركة اليوم</small>
                            </div>
                            <div className="p-3 bg-success-subtle text-success rounded-circle">
                                <FaHistory size={24} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} sm={6} md={3}>
                    <Card className="border-0 shadow-sm rounded-3 h-100" style={{ borderRight: '4px solid #0d6efd' }}>
                        <Card.Body className="d-flex align-items-center justify-content-between p-3">
                            <div>
                                <span className="text-muted fw-semibold d-block mb-1" style={{ fontSize: '0.85rem' }}>تسجيلات الدخول</span>
                                <h3 className="fw-bold text-primary m-0">{stats.logins.toLocaleString()}</h3>
                                <small className="text-success fw-semibold">جلسات نشطة وناجحة</small>
                            </div>
                            <div className="p-3 bg-primary-subtle text-primary rounded-circle">
                                <FaSignInAlt size={24} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} sm={6} md={3}>
                    <Card className="border-0 shadow-sm rounded-3 h-100" style={{ borderRight: '4px solid #dc3545' }}>
                        <Card.Body className="d-flex align-items-center justify-content-between p-3">
                            <div>
                                <span className="text-muted fw-semibold d-block mb-1" style={{ fontSize: '0.85rem' }}>محاولات الدخول الفاشلة</span>
                                <h3 className="fw-bold text-danger m-0">{stats.failed_logins.toLocaleString()}</h3>
                                <small className={stats.failed_logins > 0 ? "text-danger fw-semibold" : "text-muted"}>
                                    {stats.failed_logins > 0 ? "يستدعي الانتباه" : "لا توجد محاولات مشبوهة"}
                                </small>
                            </div>
                            <div className="p-3 bg-danger-subtle text-danger rounded-circle">
                                <FaExclamationTriangle size={24} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xs={12} sm={6} md={3}>
                    <Card className="border-0 shadow-sm rounded-3 h-100" style={{ borderRight: '4px solid #ffc107' }}>
                        <Card.Body className="d-flex align-items-center justify-content-between p-3">
                            <div>
                                <span className="text-muted fw-semibold d-block mb-1" style={{ fontSize: '0.85rem' }}>التعديل والإضافة والحذف</span>
                                <h3 className="fw-bold text-dark m-0">{(stats.creates + stats.updates + stats.deletes).toLocaleString()}</h3>
                                <small className="text-muted">{stats.creates} إضافة • {stats.updates} تعديل • {stats.deletes} حذف</small>
                            </div>
                            <div className="p-3 bg-warning-subtle text-warning rounded-circle">
                                <FaUserShield size={24} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filter Card */}
            <Card className="border-0 shadow-sm rounded-3 mb-4 d-print-none">
                <Card.Body className="p-3">
                    <Form onSubmit={handleSearchSubmit}>
                        <Row className="g-2 align-items-end">
                            {/* Search Input */}
                            <Col xs={12} md={4}>
                                <Form.Label className="fw-semibold small text-muted mb-1">بحث عام</Form.Label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted" /></span>
                                    <Form.Control
                                        type="text"
                                        placeholder="بحث باسم المستخدم، البيان، الـ IP..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="border-start-0"
                                    />
                                    <Button variant="success" type="submit">بحث</Button>
                                </div>
                            </Col>

                            {/* Action Type Filter */}
                            <Col xs={6} sm={4} md={2}>
                                <Form.Label className="fw-semibold small text-muted mb-1">نوع العملية</Form.Label>
                                <Form.Select value={actionType} onChange={(e) => setActionType(e.target.value)}>
                                    <option value="">جميع العمليات</option>
                                    <option value="LOGIN">تسجيل دخول</option>
                                    <option value="LOGIN_FAILED">محاولة فاشلة</option>
                                    <option value="CREATE">إضافة جديدة</option>
                                    <option value="UPDATE">تعديل</option>
                                    <option value="DELETE">حذف</option>
                                    <option value="APPROVE">اعتماد</option>
                                    <option value="RESTORE">استرجاع محذوف</option>
                                    <option value="EXPORT">تصدير / طباعة</option>
                                    <option value="SECURITY">أمان وكلمة مرور</option>
                                </Form.Select>
                            </Col>

                            {/* Entity Filter */}
                            <Col xs={6} sm={4} md={2}>
                                <Form.Label className="fw-semibold small text-muted mb-1">القسم / الصفحة</Form.Label>
                                <Form.Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                                    <option value="">جميع الأقسام</option>
                                    <option value="AUTH">المصادقة والأمان</option>
                                    <option value="PROFESSORS">أعضاء هيئة التدريس</option>
                                    <option value="COURSES">المقررات الدراسية</option>
                                    <option value="STUDY_PLAN">الخطة الدراسية</option>
                                    <option value="USERS">المستخدمين والصلاحيات</option>
                                    <option value="SIGNATURES">التوقيعات</option>
                                    <option value="RECYCLE_BIN">سلة المحذوفات</option>
                                    <option value="SYSTEM">النظام العام</option>
                                </Form.Select>
                            </Col>

                            {/* Faculty Filter */}
                            <Col xs={6} sm={4} md={2}>
                                <Form.Label className="fw-semibold small text-muted mb-1">الكلية</Form.Label>
                                <Form.Select value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
                                    <option value="">جميع الكليات</option>
                                    {faculties.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </Form.Select>
                            </Col>

                            {/* Status Filter */}
                            <Col xs={6} sm={4} md={2}>
                                <Form.Label className="fw-semibold small text-muted mb-1">الحالة</Form.Label>
                                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="">الكل</option>
                                    <option value="success">ناجحة (Success)</option>
                                    <option value="failed">فاشلة (Failed)</option>
                                </Form.Select>
                            </Col>

                            {/* Date Range: From */}
                            <Col xs={6} sm={4} md={2}>
                                <Form.Label className="fw-semibold small text-muted mb-1">من تاريخ</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    value={fromDate} 
                                    onChange={(e) => setFromDate(e.target.value)} 
                                />
                            </Col>

                            {/* Date Range: To */}
                            <Col xs={6} sm={4} md={2}>
                                <Form.Label className="fw-semibold small text-muted mb-1">إلى تاريخ</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    value={toDate} 
                                    onChange={(e) => setToDate(e.target.value)} 
                                />
                            </Col>

                            {/* Items per page */}
                            <Col xs={6} sm={4} md={2}>
                                <Form.Label className="fw-semibold small text-muted mb-1">عناصر بالصفحة</Form.Label>
                                <Form.Select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                </Form.Select>
                            </Col>

                            {/* Reset Button */}
                            <Col xs={6} sm={4} md={2}>
                                <Button 
                                    variant="outline-secondary" 
                                    className="w-100" 
                                    onClick={handleResetFilters}
                                >
                                    إعادة ضبط
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {/* Main Table Card */}
            <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="success" />
                            <p className="mt-3 text-muted">جاري تحميل السجلات...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-5">
                            <FaHistory size={48} className="text-muted mb-3 opacity-50" />
                            <h5 className="text-muted">لا توجد سجلات تطابق خيارات البحث</h5>
                            <p className="text-muted small">جرب تغيير الفلاتر أو اضغط على إعادة الضبط</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table responsive hover className="align-middle mb-0 text-center logs-custom-table" style={{ fontSize: '0.92rem' }}>
                                <thead className="bg-light text-dark fw-bold border-bottom">
                                    <tr>
                                        {isAdmin && (
                                            <th style={{ width: '35px' }} className="d-print-none">
                                                <Form.Check 
                                                    type="checkbox"
                                                    checked={selectedIds.length === logs.length && logs.length > 0}
                                                    onChange={handleSelectAll}
                                                />
                                            </th>
                                        )}
                                        <th style={{ width: '4%' }}>#</th>
                                        <th style={{ width: '13%' }}>الوقت والتاريخ</th>
                                        <th style={{ width: '12%' }}>المستخدم</th>
                                        <th style={{ width: '10%' }}>نوع العملية</th>
                                        <th style={{ width: '10%' }}>القسم</th>
                                        <th className="text-end" style={{ width: '27%' }}>تفاصيل البيان</th>
                                        <th style={{ width: '11%' }}>الكلية</th>
                                        <th style={{ width: '8%' }}>عنوان IP</th>
                                        <th style={{ width: '5%' }}>الحالة</th>
                                        <th style={{ width: '90px' }} className="d-print-none">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((item, index) => {
                                        const isSelected = selectedIds.includes(item.id);
                                        const isFailed = item.status === 'failed';
                                        return (
                                            <tr key={item.id} className={`${isSelected ? 'table-active' : ''} ${isFailed ? 'table-danger-subtle row-failed' : ''}`}>
                                                {isAdmin && (
                                                    <td className="d-print-none">
                                                        <Form.Check 
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelect(item.id)}
                                                        />
                                                    </td>
                                                )}
                                                <td className="text-muted">{(page - 1) * limit + index + 1}</td>
                                                <td className="text-nowrap" style={{ fontSize: '0.85rem' }}>
                                                    <span dir="ltr" style={{ display: 'inline-block', direction: 'ltr', fontFamily: 'Consolas, Monaco, "Segoe UI", sans-serif' }}>
                                                        {formatDate(item.created_at)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center justify-content-center gap-2">
                                                        <div 
                                                            className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold d-print-none" 
                                                            style={{ width: '28px', height: '28px', fontSize: '0.75rem', flexShrink: 0 }}
                                                        >
                                                            {item.username ? item.username[0].toUpperCase() : 'U'}
                                                        </div>
                                                        <div className="text-center text-sm-start">
                                                            <span className="fw-bold d-block text-dark" style={{ fontSize: '0.86rem' }}>{item.username}</span>
                                                            <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>{item.user_role || 'مستخدم'}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{getActionBadge(item.action_type)}</td>
                                                <td>{getEntityBadge(item.entity_type)}</td>
                                                <td className="text-end fw-semibold text-dark" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                    {item.description}
                                                </td>
                                                <td>
                                                    <span className="text-muted small">
                                                        {item.faculty_name || 'عام / غير محدد'}
                                                    </span>
                                                </td>
                                                <td className="text-nowrap" dir="ltr" style={{ fontSize: '0.82rem' }}>
                                                    {item.ip_address ? (
                                                        <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                                                            {item.ip_address}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    {item.status === 'success' ? (
                                                        <Badge bg="success-subtle" text="success" className="border border-success px-2 py-1">
                                                            <FaCheckCircle className="me-1 d-print-none" /> ناجحة
                                                        </Badge>
                                                    ) : (
                                                        <Badge bg="danger" className="px-2 py-1">
                                                            <FaTimesCircle className="me-1 d-print-none" /> فاشلة
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="d-print-none">
                                                    <div className="d-flex align-items-center justify-content-center gap-1">
                                                        <Button 
                                                            variant="outline-primary" 
                                                            size="sm" 
                                                            className="p-1 px-2"
                                                            onClick={() => { setSelectedLog(item); setShowDetailModal(true); }}
                                                            title="عرض التفاصيل"
                                                        >
                                                            <FaEye />
                                                        </Button>
                                                        {isAdmin && (
                                                            <Button 
                                                                variant="outline-danger" 
                                                                size="sm" 
                                                                className="p-1 px-2"
                                                                onClick={() => handleDeleteSingle(item.id)}
                                                                title="حذف السجل"
                                                            >
                                                                <FaTrash />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>

                {/* Footer with Pagination */}
                {!loading && totalPages > 1 && (
                    <Card.Footer className="bg-white border-0 py-3 d-flex flex-wrap justify-content-between align-items-center gap-2 d-print-none">
                        <div className="text-muted small">
                            عرض الصفحة <strong>{page}</strong> من إجمالي <strong>{totalPages}</strong> صفحات ({totalItems} سجل)
                        </div>
                        <Pagination className="m-0">
                            <Pagination.First onClick={() => fetchLogs(1)} disabled={page === 1} />
                            <Pagination.Prev onClick={() => fetchLogs(page - 1)} disabled={page === 1} />
                            
                            {page > 3 && <Pagination.Ellipsis />}
                            {[...Array(totalPages).keys()]
                                .map(x => x + 1)
                                .filter(p => p >= page - 2 && p <= page + 2)
                                .map(p => (
                                    <Pagination.Item 
                                        key={p} 
                                        active={p === page} 
                                        onClick={() => fetchLogs(p)}
                                    >
                                        {p}
                                    </Pagination.Item>
                                ))
                            }
                            {page < totalPages - 2 && <Pagination.Ellipsis />}

                            <Pagination.Next onClick={() => fetchLogs(page + 1)} disabled={page === totalPages} />
                            <Pagination.Last onClick={() => fetchLogs(totalPages)} disabled={page === totalPages} />
                        </Pagination>
                    </Card.Footer>
                )}
            </Card>

            {/* Log Detail Modal */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered dir="rtl" size="lg">
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fs-5 fw-bold text-success d-flex align-items-center gap-2">
                        <FaHistory /> تفاصيل السجل #{selectedLog?.id}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedLog && (
                        <Row className="g-3">
                            <Col xs={12}>
                                <div className="p-3 bg-light rounded-3 border">
                                    <span className="text-muted small d-block mb-1">البيان والحدث:</span>
                                    <h6 className="fw-bold text-dark mb-0">{selectedLog.description}</h6>
                                </div>
                            </Col>

                            <Col xs={6} md={4}>
                                <div className="p-2 border rounded">
                                    <small className="text-muted d-block">اسم المستخدم</small>
                                    <span className="fw-bold">{selectedLog.username}</span>
                                </div>
                            </Col>

                            <Col xs={6} md={4}>
                                <div className="p-2 border rounded">
                                    <small className="text-muted d-block">الدور الوظيفي</small>
                                    <span className="fw-bold">{selectedLog.user_role || '—'}</span>
                                </div>
                            </Col>

                            <Col xs={6} md={4}>
                                <div className="p-2 border rounded">
                                    <small className="text-muted d-block">الحالة</small>
                                    {selectedLog.status === 'success' ? (
                                        <span className="badge bg-success">ناجحة</span>
                                    ) : (
                                        <span className="badge bg-danger">فاشلة</span>
                                    )}
                                </div>
                            </Col>

                            <Col xs={6} md={4}>
                                <div className="p-2 border rounded">
                                    <small className="text-muted d-block">نوع العملية</small>
                                    {getActionBadge(selectedLog.action_type)}
                                </div>
                            </Col>

                            <Col xs={6} md={4}>
                                <div className="p-2 border rounded">
                                    <small className="text-muted d-block">القسم المعني</small>
                                    {getEntityBadge(selectedLog.entity_type)}
                                </div>
                            </Col>

                            <Col xs={6} md={4}>
                                <div className="p-2 border rounded">
                                    <small className="text-muted d-block">الكلية</small>
                                    <span className="fw-semibold">{selectedLog.faculty_name || 'عام / غير محدد'}</span>
                                </div>
                            </Col>

                            <Col xs={6} md={6}>
                                <div className="p-2 border rounded">
                                    <small className="text-muted d-block">التاريخ والوقت</small>
                                    <span dir="ltr" style={{ display: 'inline-block', direction: 'ltr', fontFamily: 'Consolas, Monaco, "Segoe UI", sans-serif' }}>
                                        {formatDate(selectedLog.created_at)}
                                    </span>
                                </div>
                            </Col>

                            <Col xs={6} md={6}>
                                <div className="p-2 border rounded d-flex justify-content-between align-items-center">
                                    <div>
                                        <small className="text-muted d-block">عنوان الـ IP</small>
                                        <span className="font-monospace fw-bold">{selectedLog.ip_address || '—'}</span>
                                    </div>
                                    {selectedLog.ip_address && (
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(selectedLog.ip_address);
                                                toast.success("تم نسخ الـ IP");
                                            }}
                                        >
                                            نسخ
                                        </Button>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={() => setShowDetailModal(false)}>إغلاق</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default LogsPage;
