import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import { Container, Card, Table, Form, Spinner, Button, InputGroup, Modal, Row, Col, Badge } from 'react-bootstrap';
import { FaShieldAlt, FaEyeSlash, FaEye, FaSearch, FaUser, FaTimes, FaUndo, FaListUl, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirmAlert';

const SIDEBAR_PAGES = [
    { id: 'dashboard', label: 'الجدول الرئيسي', icon: '📊' },
    { id: 'professors', label: 'أعضاء هيئة التدريس', icon: '👨‍🏫' },
    { id: 'courses', label: 'المقررات الدراسية', icon: '📚' },
    { id: 'study-plan', label: 'الخطة الدراسية', icon: '📅' },
    { id: 'signatures', label: 'توقيعات المسؤولين', icon: '✍️' },
    { id: 'statistics', label: 'الإحصائيات', icon: '📈' },
    { id: 'notifications', label: 'الإشعارات', icon: '🔔' },
    { id: 'recycle-bin', label: 'استرجاع المحذوف', icon: '🗑️' },
    { id: 'guidelines', label: 'الإرشادات', icon: 'ℹ️' },
    { id: 'control-panel', label: 'لوحة التحكم', icon: '⚙️' },
    { id: 'logs', label: 'العمليات (Logs)', icon: '📋' },
    { id: 'admin', label: 'إدارة المسؤولين', icon: '🛡️' },
];

const ControlPanelPage = () => {
    const { user, setUser } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedPageToHide, setSelectedPageToHide] = useState("");
    const [hidingActionLoading, setHidingActionLoading] = useState(false);
    const [faculties, setFaculties] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [newYearName, setNewYearName] = useState("");
    const [newYearSem1Weeks, setNewYearSem1Weeks] = useState("");
    const [newYearSem2Weeks, setNewYearSem2Weeks] = useState("");
    const [newYearSummerWeeks, setNewYearSummerWeeks] = useState("");
    const [newYearMedSem1Weeks, setNewYearMedSem1Weeks] = useState("");
    const [newYearMedSem2Weeks, setNewYearMedSem2Weeks] = useState("");
    const [newYearMedSummerWeeks, setNewYearMedSummerWeeks] = useState("");
    const [showEditYearModal, setShowEditYearModal] = useState(false);
    const [editingYear, setEditingYear] = useState(null);
    const [loading, setLoading] = useState(true);
    const [draggedYearIndex, setDraggedYearIndex] = useState(null);

    const API = "";

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, facRes, yearsRes] = await Promise.all([
                axios.get(`${API}/api/users`),
                axios.get(`${API}/api/faculties`),
                axios.get(`${API}/api/academic-years`)
            ]);
            const rawUsers = usersRes.data || [];
            
            // All accessible users for hiding pages
            let accessibleUsers = rawUsers;
            if (user?.role === 'faculty_professor') {
                const userFacId = String(user.faculty_id);
                const userFacs = (user.faculties || []).map(f => String(f));
                accessibleUsers = rawUsers.filter(u => 
                    String(u.faculty_id) === userFacId || userFacs.includes(String(u.faculty_id))
                );
            }
            setAllUsers(accessibleUsers);

            // Show faculty_admin users (if program_manager, only for their faculty)
            let facultyAdmins = rawUsers.filter(u => u.role === 'faculty_admin' || u.role === 'student_affairs' || u.role === 'reviewer');
            if (user?.role === 'faculty_professor') {
                const userFacId = String(user.faculty_id);
                const userFacs = (user.faculties || []).map(f => String(f));
                facultyAdmins = facultyAdmins.filter(u => 
                    String(u.faculty_id) === userFacId || userFacs.includes(String(u.faculty_id))
                );
            }
            setUsers(facultyAdmins);
            setFaculties(facRes.data);
            setAcademicYears(yearsRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
            toast.error("خطأ في جلب البيانات");
        } finally {
            setLoading(false);
        }
    };

    const getFacultyName = (id) => {
        if (!id) return "غير محدد";
        const f = faculties.find(fac => fac.id === id);
        return f ? f.name : "غير محدد";
    };

    const parseHiddenPages = (u) => {
        if (!u || !u.hidden_pages) return [];
        try {
            const parsed = typeof u.hidden_pages === 'string' ? JSON.parse(u.hidden_pages) : u.hidden_pages;
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };

    const selectedUserObj = useMemo(() => {
        return allUsers.find(u => u.id === selectedUserId) || null;
    }, [allUsers, selectedUserId]);

    const currentUserHiddenPages = useMemo(() => {
        return parseHiddenPages(selectedUserObj);
    }, [selectedUserObj]);

    const availablePagesToHide = useMemo(() => {
        return SIDEBAR_PAGES.filter(p => !currentUserHiddenPages.includes(p.id));
    }, [currentUserHiddenPages]);

    const userSelectOptions = useMemo(() => {
        return allUsers.map(u => {
            const facName = getFacultyName(u.faculty_id);
            let roleText = u.job_title || (u.role === 'admin' ? 'مدير عام' : u.role === 'faculty_admin' ? 'مسؤول كلية' : u.role === 'faculty_professor' ? 'مدير برنامج' : u.role === 'student_affairs' ? 'شؤون طلاب' : u.role === 'reviewer' ? 'مراجع' : u.role);
            const hiddenCount = parseHiddenPages(u).length;
            const labelParts = [u.username];
            if (roleText) labelParts.push(`(${roleText})`);
            if (facName && facName !== 'غير محدد') labelParts.push(`- ${facName}`);
            if (hiddenCount > 0) labelParts.push(`[${hiddenCount} صفحة مخفية]`);
            return {
                value: u.id,
                label: labelParts.join(' '),
                username: u.username,
                roleText,
                facName,
                hiddenCount,
                user: u
            };
        });
    }, [allUsers, faculties]);

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '44px',
            borderRadius: '10px',
            borderColor: state.isFocused ? '#2e7d32' : '#ced4da',
            boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(46, 125, 50, 0.25)' : 'none',
            '&:hover': { borderColor: '#2e7d32' },
            direction: 'rtl',
            textAlign: 'right',
            backgroundColor: '#fff'
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
        placeholder: (base) => ({
            ...base,
            color: '#6c757d',
            fontSize: '0.92rem'
        }),
        singleValue: (base) => ({
            ...base,
            color: '#212529',
            fontSize: '0.92rem',
            fontWeight: '600'
        })
    };

    const handleHidePage = async () => {
        if (!selectedUserId) {
            toast.error('يرجى اختيار المستخدم أولاً');
            return;
        }
        if (!selectedPageToHide) {
            toast.error('يرجى اختيار الصفحة المراد إخفاؤها من القائمة');
            return;
        }

        setHidingActionLoading(true);
        try {
            const targetUser = allUsers.find(u => u.id === selectedUserId);
            const currentHidden = parseHiddenPages(targetUser);
            if (currentHidden.includes(selectedPageToHide)) {
                toast.error('هذه الصفحة مخفية بالفعل عن هذا المستخدم');
                return;
            }

            const newHidden = [...currentHidden, selectedPageToHide];
            await axios.put(`${API}/api/users/${selectedUserId}/hidden-pages`, {
                hidden_pages: newHidden
            });

            const updatedJson = JSON.stringify(newHidden);
            setAllUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, hidden_pages: updatedJson } : u));
            setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, hidden_pages: updatedJson } : u));

            if (user && user.id === selectedUserId && setUser) {
                setUser(prev => ({ ...prev, hidden_pages: updatedJson }));
            }

            const pageObj = SIDEBAR_PAGES.find(p => p.id === selectedPageToHide);
            toast.success(`تم إخفاء صفحة "${pageObj ? pageObj.label : selectedPageToHide}" بنجاح عن ${targetUser.username}`);
            setSelectedPageToHide("");
        } catch (error) {
            console.error('Error hiding page', error);
            toast.error(error.response?.data?.detail || 'حدث خطأ أثناء إخفاء الصفحة');
        } finally {
            setHidingActionLoading(false);
        }
    };

    const handleUnhidePage = async (pageId, customUserId = null) => {
        const targetUserId = customUserId || selectedUserId;
        if (!targetUserId) return;
        setHidingActionLoading(true);
        try {
            const targetUser = allUsers.find(u => u.id === targetUserId);
            const currentHidden = parseHiddenPages(targetUser);
            const newHidden = currentHidden.filter(id => id !== pageId);

            await axios.put(`${API}/api/users/${targetUserId}/hidden-pages`, {
                hidden_pages: newHidden
            });

            const updatedJson = JSON.stringify(newHidden);
            setAllUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, hidden_pages: updatedJson } : u));
            setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, hidden_pages: updatedJson } : u));

            if (user && user.id === targetUserId && setUser) {
                setUser(prev => ({ ...prev, hidden_pages: updatedJson }));
            }

            const pageObj = SIDEBAR_PAGES.find(p => p.id === pageId);
            toast.success(`تم إلغاء إخفاء صفحة "${pageObj ? pageObj.label : pageId}" بنجاح`);
        } catch (error) {
            console.error('Error unhiding page', error);
            toast.error('حدث خطأ أثناء إلغاء إخفاء الصفحة');
        } finally {
            setHidingActionLoading(false);
        }
    };

    const handleUnhideAllForUser = async (userId = null) => {
        const targetId = userId || selectedUserId;
        if (!targetId) return;
        if (!(await confirmAction('هل أنت متأكد من إلغاء إخفاء جميع الصفحات لهذا المستخدم؟'))) return;
        
        setHidingActionLoading(true);
        try {
            await axios.put(`${API}/api/users/${targetId}/hidden-pages`, {
                hidden_pages: []
            });

            setAllUsers(prev => prev.map(u => u.id === targetId ? { ...u, hidden_pages: '[]' } : u));
            setUsers(prev => prev.map(u => u.id === targetId ? { ...u, hidden_pages: '[]' } : u));

            if (user && user.id === targetId && setUser) {
                setUser(prev => ({ ...prev, hidden_pages: '[]' }));
            }

            toast.success('تم إظهار جميع الصفحات للمستخدم بنجاح');
        } catch (error) {
            console.error('Error unhiding all pages', error);
            toast.error('حدث خطأ أثناء إظهار الصفحات');
        } finally {
            setHidingActionLoading(false);
        }
    };

    const handleTogglePermission = async (userId, permName, currentValue) => {
        try {
            const newValue = !currentValue;
            await axios.put(`${API}/api/users/${userId}`, {
                [permName]: newValue
            });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, [permName]: newValue } : u));
            toast.success("تم تحديث الصلاحية بنجاح");
        } catch (error) {
            console.error("Error updating permission", error);
            toast.error("حدث خطأ أثناء تحديث الصلاحية");
        }
    };

    const handleAddAcademicYear = async () => {
        const trimmedName = newYearName.trim();
        if (!trimmedName) return;

        const yearRegex = /^\d{4}\/\d{4}$/;
        if (!yearRegex.test(trimmedName)) {
            toast.error("صيغة العام الجامعي غير صحيحة. يجب أن تكون 4 أرقام / 4 أرقام (مثال: 2028/2029)");
            return;
        }

        const [startYear, endYear] = trimmedName.split("/");
        if (parseInt(endYear) !== parseInt(startYear) + 1) {
            toast.error("العام الثاني يجب أن يكون العام التالي مباشرة للعام الأول (مثال: 2028/2029)");
            return;
        }

        try {
            const res = await axios.post(`${API}/api/academic-years`, {
                name: trimmedName,
                semester1_weeks: newYearSem1Weeks ? (parseInt(newYearSem1Weeks) || 15) : 15,
                semester2_weeks: newYearSem2Weeks ? (parseInt(newYearSem2Weeks) || 14) : 14,
                summer_weeks: newYearSummerWeeks ? (parseInt(newYearSummerWeeks) || 7) : 7,
                med_semester1_weeks: newYearMedSem1Weeks ? (parseInt(newYearMedSem1Weeks) || 15) : (newYearSem1Weeks ? parseInt(newYearSem1Weeks) : 15),
                med_semester2_weeks: newYearMedSem2Weeks ? (parseInt(newYearMedSem2Weeks) || 14) : (newYearSem2Weeks ? parseInt(newYearSem2Weeks) : 14),
                med_summer_weeks: newYearMedSummerWeeks ? (parseInt(newYearMedSummerWeeks) || 7) : (newYearSummerWeeks ? parseInt(newYearSummerWeeks) : 7),
            });
            setAcademicYears([...academicYears, res.data]);
            setNewYearName("");
            setNewYearSem1Weeks("");
            setNewYearSem2Weeks("");
            setNewYearSummerWeeks("");
            setNewYearMedSem1Weeks("");
            setNewYearMedSem2Weeks("");
            setNewYearMedSummerWeeks("");
            toast.success("تم إضافة العام الجامعي بنجاح");
        } catch (error) {
            console.error("Error adding academic year", error);
            toast.error(error.response?.data?.detail || "حدث خطأ أثناء إضافة العام الجامعي");
        }
    };

    const handleDeleteAcademicYear = async (id) => {
        if (!(await confirmAction("هل أنت متأكد من حذف هذا العام الجامعي؟"))) return;
        try {
            await axios.delete(`${API}/api/academic-years/${id}`);
            setAcademicYears(academicYears.filter(y => y.id !== id));
            toast.success("تم الحذف بنجاح");
        } catch (error) {
            console.error("Error deleting academic year", error);
            toast.error("حدث خطأ أثناء الحذف");
        }
    };

    const handleOpenEditModal = (yearObj) => {
        setEditingYear({
            id: yearObj.id,
            name: yearObj.name,
            semester1_weeks: yearObj.semester1_weeks ?? 15,
            semester2_weeks: yearObj.semester2_weeks ?? 14,
            summer_weeks: yearObj.summer_weeks ?? 7,
            med_semester1_weeks: yearObj.med_semester1_weeks ?? yearObj.semester1_weeks ?? 15,
            med_semester2_weeks: yearObj.med_semester2_weeks ?? yearObj.semester2_weeks ?? 14,
            med_summer_weeks: yearObj.med_summer_weeks ?? yearObj.summer_weeks ?? 7,
        });
        setShowEditYearModal(true);
    };

    const handleSaveEditAcademicYear = async () => {
        if (!editingYear) return;
        const trimmedName = editingYear.name.trim();
        if (!trimmedName) return;

        const yearRegex = /^\d{4}\/\d{4}$/;
        if (!yearRegex.test(trimmedName)) {
            toast.error("صيغة العام الجامعي غير صحيحة. يجب أن تكون 4 أرقام / 4 أرقام (مثال: 2028/2029)");
            return;
        }

        const [startYear, endYear] = trimmedName.split("/");
        if (parseInt(endYear) !== parseInt(startYear) + 1) {
            toast.error("العام الثاني يجب أن يكون العام التالي مباشرة للعام الأول (مثال: 2028/2029)");
            return;
        }

        try {
            const res = await axios.put(`${API}/api/academic-years/${editingYear.id}`, {
                name: trimmedName,
                semester1_weeks: parseInt(editingYear.semester1_weeks) || 15,
                semester2_weeks: parseInt(editingYear.semester2_weeks) || 14,
                summer_weeks: parseInt(editingYear.summer_weeks) || 7,
                med_semester1_weeks: parseInt(editingYear.med_semester1_weeks) || 15,
                med_semester2_weeks: parseInt(editingYear.med_semester2_weeks) || 14,
                med_summer_weeks: parseInt(editingYear.med_summer_weeks) || 7,
            });
            setAcademicYears(academicYears.map(y => y.id === editingYear.id ? res.data : y));
            setShowEditYearModal(false);
            toast.success("تم تعديل العام الجامعي بنجاح");
        } catch (error) {
            console.error("Error updating academic year", error);
            toast.error(error.response?.data?.detail || "حدث خطأ أثناء تعديل العام الجامعي");
        }
    };

    const handleYearDragStart = (e, index) => {
        setDraggedYearIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.style.opacity = '0.5';
    };

    const handleYearDragEnter = (e, index) => {
        if (draggedYearIndex === null || draggedYearIndex === index) return;
        
        const newYears = [...academicYears];
        const draggedItem = newYears[draggedYearIndex];
        
        newYears.splice(draggedYearIndex, 1);
        newYears.splice(index, 0, draggedItem);
        
        setDraggedYearIndex(index);
        setAcademicYears(newYears);
    };

    const handleYearDragEnd = async (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedYearIndex(null);
        
        const reorderData = academicYears.map((y, idx) => ({
            id: y.id,
            order_index: idx
        }));

        try {
            await axios.post(`${API}/api/academic-years/reorder`, reorderData);
        } catch (error) {
            console.error("Error saving new order", error);
            toast.error("حدث خطأ أثناء حفظ الترتيب الجديد");
            fetchData();
        }
    };

    if (loading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    if (user?.role !== 'admin' && user?.role !== 'faculty_professor') {
        return <Container className="mt-5 text-center text-danger"><h4>ليس لديك صلاحية للوصول إلى هذه الصفحة</h4></Container>;
    }

    return (
        <div style={{ padding: '20px', direction: 'rtl' }}>
            <div className="row mb-3 align-items-center">
                <div className="col-12">
                    <h2 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }} className="d-flex align-items-center gap-3">
                        <FaShieldAlt className="text-success" style={{ marginLeft: '15px' }} /> 
                        لوحة التحكم - صلاحيات مسؤولي الكليات
                    </h2>
                </div>
            </div>

            <Card className="shadow-sm border-0 mt-4" style={{ width: '100%' }}>
                <Card.Body className="p-0">
                    <style>
                        {`
                        .sticky-col-1 { position: sticky; right: 0; z-index: 2; background-color: inherit; width: 180px; min-width: 180px; border-left: 2px solid #dee2e6; }
                        .sticky-col-2 { position: sticky; right: 180px; z-index: 2; background-color: inherit; width: 340px; min-width: 340px; border-left: 2px solid #dee2e6; }
                        thead .sticky-col-1, thead .sticky-col-2 { background-color: var(--primary) !important; color: white; z-index: 3; }
                        /* Ensure sticky columns have opaque backgrounds over stripes */
                        tbody .sticky-col-1, tbody .sticky-col-2 { background-color: #fff; }
                        .table-striped > tbody > tr:nth-of-type(odd) > .sticky-col-1,
                        .table-striped > tbody > tr:nth-of-type(odd) > .sticky-col-2 {
                            background-color: var(--bs-table-striped-bg, rgba(0, 0, 0, 0.05));
                        }
                        .table-hover > tbody > tr:hover > .sticky-col-1,
                        .table-hover > tbody > tr:hover > .sticky-col-2 {
                            background-color: var(--bs-table-hover-bg, rgba(0, 0, 0, 0.075));
                        }
                        `}
                    </style>
                    <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', margin: 0 }}>
                        <Table responsive striped bordered hover className="mb-0" style={{ width: 'max-content', minWidth: '100%' }}>
                            <thead className="bg-light">
                                <tr style={{ borderBottom: '2.5px solid var(--secondary)', whiteSpace: 'nowrap', height: '80px' }}>
                                    <th className="sticky-col-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>اسم المستخدم</th>
                                    <th className="sticky-col-2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>الكلية</th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>جدول الأساتذة</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>بيانات الأساتذة</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الجدول الرئيسي)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>إنهاء الخطة</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>مراجعة أولى</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>مراجعة ثانية</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>إعتماد الخطة</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(الخطة الدراسية)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الحذف</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(هيئة التدريس)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الرؤية</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(هيئة التدريس)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>التصدير</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(هيئة التدريس)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الاستيراد</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(هيئة التدريس)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>استرجاع المحذوف</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(المحذوفات)</small>
                                    </th>
                                    <th className="text-center" style={{ verticalAlign: 'middle' }}>
                                        <div>الحذف النهائي</div>
                                        <small className="fw-semibold" style={{ fontSize: '0.78rem', color: '#ffe082', display: 'block', marginTop: '2px' }}>(المحذوفات)</small>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} style={{ height: '70px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                        <td className="fw-bold text-center sticky-col-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username.split('@')[0]}</div>
                                            {(() => {
                                                const jobTitle = u.job_title || (
                                                    u.role === 'admin' ? 'مدير عام (Super Admin)' :
                                                    u.role === 'manager' ? 'مدير' :
                                                    u.role === 'student_affairs' ? 'مدير شؤون الطلاب' :
                                                    u.role === 'reviewer' ? 'المراجع' :
                                                    u.role === 'faculty_professor' ? 'مدير برنامج' :
                                                    'مسؤول كلية'
                                                );
                                                
                                                let badgeBg = 'bg-secondary text-white';
                                                let badgeStyle = { fontSize: '11px', padding: '4px 8px', fontWeight: 'bold' };

                                                if (u.role === 'admin' || jobTitle.includes('Super Admin') || jobTitle.includes('مدير عام')) {
                                                    badgeBg = 'bg-danger text-white';
                                                } else if (u.role === 'manager' || jobTitle.includes('عميد') || jobTitle.includes('نائب') || jobTitle.includes('مدير إدارة')) {
                                                    badgeBg = 'text-white';
                                                    badgeStyle.backgroundColor = '#0d9488'; // teal
                                                } else if (u.role === 'student_affairs') {
                                                    badgeBg = 'bg-warning text-dark';
                                                } else if (u.role === 'reviewer' || jobTitle.includes('المراجع')) {
                                                    badgeBg = 'text-white';
                                                    badgeStyle.backgroundColor = '#8b5cf6'; // purple
                                                } else if (jobTitle.includes('هيئة تدريس') || u.role === 'faculty_professor') {
                                                    badgeBg = 'text-white';
                                                    badgeStyle.backgroundColor = '#16a34a'; // green
                                                } else {
                                                    badgeBg = 'bg-info text-white';
                                                }

                                                return (
                                                    <div className="mt-1">
                                                        <span className={`badge ${badgeBg}`} style={badgeStyle}>
                                                            {jobTitle}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="sticky-col-2" style={{ verticalAlign: 'middle', whiteSpace: 'normal', padding: '10px' }}>
                                            <div className="fw-bold" style={{ color: 'var(--primary-hover)', lineHeight: '1.5' }}>
                                                {u.all_faculties_access || u.role === 'admin' || u.role === 'student_affairs' ? (
                                                    <span className="text-success fw-bold">جميع الكليات بالجامعة</span>
                                                ) : u.assigned_faculties && u.assigned_faculties.length > 0 ? (
                                                    <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center w-100">
                                                        {u.assigned_faculties.map(f => {
                                                            const isLong = f.name.length > 22;
                                                            return (
                                                                <div 
                                                                    key={f.id} 
                                                                    className="text-center fw-semibold"
                                                                    style={{ 
                                                                        fontSize: '12.5px', 
                                                                        flex: isLong ? '1 1 100%' : '0 1 calc(50% - 0.5rem)',
                                                                        padding: '2px 4px',
                                                                        color: 'var(--primary-hover)'
                                                                    }}
                                                                >
                                                                    - {f.name}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    u.faculty_id ? getFacultyName(u.faculty_id) : "غير محدد"
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_study_plan}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_study_plan', u.perm_view_prof_study_plan)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_data_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_data_btn', u.perm_view_prof_data_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_finish_plan}
                                                onChange={() => handleTogglePermission(u.id, 'perm_finish_plan', u.perm_finish_plan)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_review_1}
                                                onChange={() => handleTogglePermission(u.id, 'perm_review_1', u.perm_review_1)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_review_2}
                                                onChange={() => handleTogglePermission(u.id, 'perm_review_2', u.perm_review_2)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_approve_plan}
                                                onChange={() => handleTogglePermission(u.id, 'perm_approve_plan', u.perm_approve_plan)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_delete_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_delete_btn', u.perm_view_prof_delete_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_view_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_view_btn', u.perm_view_prof_view_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_print_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_print_btn', u.perm_view_prof_print_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_view_prof_import_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_view_prof_import_btn', u.perm_view_prof_import_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_recycle_restore_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_recycle_restore_btn', u.perm_recycle_restore_btn)}
                                            />
                                        </td>
                                        <td className="text-center" style={{ verticalAlign: 'middle' }}>
                                            <Form.Check 
                                                type="switch"
                                                checked={u.perm_recycle_delete_btn}
                                                onChange={() => handleTogglePermission(u.id, 'perm_recycle_delete_btn', u.perm_recycle_delete_btn)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr style={{ height: '100px' }}>
                                        <td colSpan="14" className="text-muted text-center" style={{ verticalAlign: 'middle' }}>
                                            لا يوجد مسؤولي كليات حالياً.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Card لإدارة إخفاء الصفحات عن المستخدمين من القائمة الجانبية */}
            <Card className="shadow-sm border-0 mt-5" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
                <Card.Header className="bg-white border-0 pt-4 pb-3 px-4">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div style={{
                                width: '45px',
                                height: '45px',
                                borderRadius: '12px',
                                backgroundColor: '#fff3cd',
                                color: '#856404',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.3rem'
                            }}>
                                <FaEyeSlash />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }}>
                                    إدارة إخفاء الصفحات عن المستخدمين (القائمة الجانبية)
                                </h4>
                                <small className="text-muted">
                                    اختر المستخدم (مع إمكانية البحث بالاسم)، ثم حدد الصفحة المراد إخفاؤها من القائمة الجانبية الخاصة به
                                </small>
                            </div>
                        </div>
                    </div>
                </Card.Header>

                <Card.Body className="px-4 pb-4 pt-2">
                    {/* فورم اختيار المستخدم والصفحة */}
                    <div className="p-4 rounded-3 mb-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Row className="g-3 align-items-end">
                            {/* البحث واختيار المستخدم */}
                            <Col lg={5} md={6} xs={12}>
                                <Form.Group>
                                    <Form.Label className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: '#1e293b' }}>
                                        <FaUser className="text-success" />
                                        <span>اختر المستخدم (ابحث بالاسم):</span>
                                    </Form.Label>
                                    <Select
                                        options={userSelectOptions}
                                        value={userSelectOptions.find(opt => opt.value === selectedUserId) || null}
                                        onChange={(opt) => {
                                            setSelectedUserId(opt ? opt.value : null);
                                            setSelectedPageToHide("");
                                        }}
                                        placeholder="ابحث باسم المستخدم أو وظيفته أو كليته..."
                                        isClearable
                                        isSearchable
                                        noOptionsMessage={() => "لا يوجد مستخدم مطابق"}
                                        styles={customSelectStyles}
                                    />
                                </Form.Group>
                            </Col>

                            {/* اختيار الصفحة من الـ Sidebar */}
                            <Col lg={4} md={6} xs={12}>
                                <Form.Group>
                                    <Form.Label className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: '#1e293b' }}>
                                        <FaListUl className="text-primary" />
                                        <span>اختر الصفحة في القائمة الجانبية:</span>
                                    </Form.Label>
                                    <Form.Select
                                        value={selectedPageToHide}
                                        onChange={(e) => setSelectedPageToHide(e.target.value)}
                                        disabled={!selectedUserId}
                                        style={{
                                            minHeight: '44px',
                                            borderRadius: '10px',
                                            borderColor: '#ced4da',
                                            fontSize: '0.92rem',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <option value="">-- اختر صفحة لإخفائها --</option>
                                        {availablePagesToHide.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.icon} {p.label}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {/* زر إخفاء الصفحة */}
                            <Col lg={3} md={12} xs={12}>
                                <Button
                                    variant="danger"
                                    onClick={handleHidePage}
                                    disabled={!selectedUserId || !selectedPageToHide || hidingActionLoading}
                                    className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                                    style={{
                                        minHeight: '44px',
                                        borderRadius: '10px',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {hidingActionLoading ? (
                                        <Spinner size="sm" animation="border" />
                                    ) : (
                                        <>
                                            <FaEyeSlash />
                                            <span>إخفاء الصفحة للمستخدم</span>
                                        </>
                                    )}
                                </Button>
                            </Col>
                        </Row>
                    </div>

                    {/* حالة المستخدم المختار والصفحات المخفية عنه */}
                    {selectedUserObj && (
                        <div className="p-3 mb-4 rounded-3 border" style={{ backgroundColor: '#ffffff' }}>
                            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-success px-3 py-2 fs-6 fw-bold rounded-pill">
                                        المستخدم: {selectedUserObj.username}
                                    </span>
                                    <span className="badge bg-light text-dark border px-3 py-2 fs-6">
                                        {selectedUserObj.job_title || selectedUserObj.role}
                                    </span>
                                    {selectedUserObj.faculty_id && (
                                        <span className="badge bg-light text-secondary border px-3 py-2 fs-6">
                                            {getFacultyName(selectedUserObj.faculty_id)}
                                        </span>
                                    )}
                                </div>
                                {currentUserHiddenPages.length > 0 && (
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => handleUnhideAllForUser(selectedUserObj.id)}
                                        disabled={hidingActionLoading}
                                        className="d-flex align-items-center gap-1 rounded-pill px-3"
                                    >
                                        <FaUndo size={12} />
                                        <span>إظهار جميع الصفحات</span>
                                    </Button>
                                )}
                            </div>

                            <div>
                                <h6 className="fw-bold text-muted mb-3 d-flex align-items-center gap-2">
                                    <span>الصفحات المخفية حالياً من القائمة الجانبية:</span>
                                    <Badge bg={currentUserHiddenPages.length > 0 ? "warning" : "success"} text={currentUserHiddenPages.length > 0 ? "dark" : "white"}>
                                        {currentUserHiddenPages.length}
                                    </Badge>
                                </h6>

                                {currentUserHiddenPages.length === 0 ? (
                                    <div className="alert alert-success d-flex align-items-center gap-2 mb-0 py-2 px-3" role="alert">
                                        <FaCheckCircle className="text-success fs-5 flex-shrink-0" />
                                        <div>
                                            <strong>جميع صفحات القائمة الجانبية ظاهرة</strong> لهذا المستخدم حالياً ولا توجد أي صفحات مخفية عنه.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-wrap gap-2">
                                        {currentUserHiddenPages.map(pageId => {
                                            const pageObj = SIDEBAR_PAGES.find(p => p.id === pageId);
                                            const pageName = pageObj ? pageObj.label : pageId;
                                            const pageIcon = pageObj ? pageObj.icon : '📄';
                                            return (
                                                <div 
                                                    key={pageId}
                                                    className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm"
                                                    style={{
                                                        backgroundColor: '#fef2f2',
                                                        border: '1px solid #fecaca',
                                                        color: '#991b1b',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    <span>{pageIcon}</span>
                                                    <span>{pageName}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnhidePage(pageId, selectedUserObj.id)}
                                                        disabled={hidingActionLoading}
                                                        title={`إلغاء إخفاء صفحة ${pageName}`}
                                                        className="btn btn-sm p-0 ms-1 d-flex align-items-center justify-content-center text-danger"
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '50%',
                                                            backgroundColor: '#fee2e2',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <FaTimes size={11} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* جدول ملخص لجميع المستخدمين الذين لديهم صفحات مخفية */}
                    <div className="mt-4">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                <FaEyeSlash className="text-danger" />
                                <span>سجل المستخدمين الذين لديهم صفحات مخفية</span>
                            </h6>
                            <span className="text-muted small">
                                إجمالي: {allUsers.filter(u => parseHiddenPages(u).length > 0).length} مستخدم
                            </span>
                        </div>
                        <div className="table-responsive rounded-3 border">
                            <Table hover className="mb-0 align-middle text-center">
                                <thead className="bg-light">
                                    <tr style={{ borderBottom: '2px solid #e2e8f0', fontSize: '0.9rem' }}>
                                        <th style={{ textAlign: 'right', paddingRight: '15px' }}>المستخدم</th>
                                        <th>الوظيفة / الصفة</th>
                                        <th>الكلية</th>
                                        <th>الصفحات المخفية</th>
                                        <th style={{ width: '130px' }}>إجراء سريع</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allUsers.filter(u => parseHiddenPages(u).length > 0).map(u => {
                                        const hiddenList = parseHiddenPages(u);
                                        return (
                                            <tr key={u.id}>
                                                <td className="fw-bold text-end pe-3" style={{ color: '#1e293b' }}>
                                                    {u.username}
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border">
                                                        {u.job_title || u.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <small className="text-muted">{getFacultyName(u.faculty_id)}</small>
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-wrap justify-content-center gap-1">
                                                        {hiddenList.map(pId => {
                                                            const pObj = SIDEBAR_PAGES.find(p => p.id === pId);
                                                            return (
                                                                <span 
                                                                    key={pId} 
                                                                    className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1"
                                                                    style={{ fontSize: '0.78rem' }}
                                                                >
                                                                    {pObj ? pObj.label : pId}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td>
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={() => handleUnhideAllForUser(u.id)}
                                                        disabled={hidingActionLoading}
                                                        className="d-flex align-items-center gap-1 mx-auto py-1 px-2"
                                                        style={{ fontSize: '0.8rem' }}
                                                    >
                                                        <FaEye size={12} />
                                                        <span>إظهار الكل</span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {allUsers.filter(u => parseHiddenPages(u).length > 0).length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-4">
                                                لا توجد صفحات مخفية عن أي مستخدم حالياً.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {user?.role === 'admin' && (
                <Card className="shadow-sm border-0 mt-5" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
                    <Card.Header className="bg-white border-0 pt-4 pb-2 px-4 d-flex justify-content-between align-items-center">
                        <div>
                            <h4 style={{ color: '#2e7d32', fontWeight: 'bold', margin: 0 }}>إدارة الأعوام الجامعية (توزيع أسابيع الفصول الدراسية)</h4>
                            <small className="text-muted">تحديد عدد أسابيع الفصول الدراسية لكل عام جامعي لكافة الكليات ولكلية الطب والجراحة بشكل منفصل</small>
                        </div>
                    </Card.Header>
                    <Card.Body className="px-4 pb-4">
                        {/* بوكس إضافة عام جامعي جديد */}
                        <div className="p-4 rounded-3 mb-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                <h6 className="fw-bold text-success mb-0 d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                                    <i className="bi bi-calendar-plus"></i>
                                    <span>إضافة عام جامعي جديد</span>
                                </h6>
                                <Button 
                                    variant="success" 
                                    onClick={handleAddAcademicYear} 
                                    className="fw-bold px-4 d-flex align-items-center gap-2 shadow-sm" 
                                    style={{ height: '40px', borderRadius: '10px' }}
                                >
                                    <i className="bi bi-plus-circle"></i>
                                    <span>إضافة العام الجامعي</span>
                                </Button>
                            </div>

                            {/* إدخال اسم العام */}
                            <Row className="mb-3">
                                <Col md={4} sm={12}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold mb-1 text-dark">العام الجامعي:</Form.Label>
                                        <Form.Control
                                            placeholder="مثال: 2028/2029"
                                            value={newYearName}
                                            onChange={(e) => setNewYearName(e.target.value)}
                                            style={{ textAlign: 'center', fontWeight: 'bold', height: '42px', borderRadius: '8px' }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            {/* قسمين منفصلين: الكليات العامة + كلية الطب والجراحة */}
                            <Row className="g-3">
                                {/* 1. الكليات العامة */}
                                <Col lg={6} md={12}>
                                    <div className="p-3 rounded-3 border h-100" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                        <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom" style={{ borderColor: '#dcfce7' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                                            <h6 className="fw-bold text-success mb-0" style={{ fontSize: '0.95rem' }}>
                                                الكليات العامة (باقي كليات الجامعة)
                                            </h6>
                                        </div>
                                        <Row className="g-2 text-center">
                                            <Col xs={4}>
                                                <Form.Label className="small fw-bold mb-1 text-muted">الفصل الأول</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    placeholder="15"
                                                    value={newYearSem1Weeks}
                                                    onChange={(e) => setNewYearSem1Weeks(e.target.value)}
                                                    style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderRadius: '8px' }}
                                                />
                                            </Col>
                                            <Col xs={4}>
                                                <Form.Label className="small fw-bold mb-1 text-muted">الفصل الثاني</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    placeholder="14"
                                                    value={newYearSem2Weeks}
                                                    onChange={(e) => setNewYearSem2Weeks(e.target.value)}
                                                    style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderRadius: '8px' }}
                                                />
                                            </Col>
                                            <Col xs={4}>
                                                <Form.Label className="small fw-bold mb-1 text-muted">الفصل الصيفي</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    placeholder="7"
                                                    value={newYearSummerWeeks}
                                                    onChange={(e) => setNewYearSummerWeeks(e.target.value)}
                                                    style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderRadius: '8px' }}
                                                />
                                            </Col>
                                        </Row>
                                    </div>
                                </Col>

                                {/* 2. كلية الطب والجراحة */}
                                <Col lg={6} md={12}>
                                    <div className="p-3 rounded-3 border h-100" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                                        <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom" style={{ borderColor: '#e0f2fe' }}>
                                            <span style={{ fontSize: '1.2rem' }}>🩺</span>
                                            <h6 className="fw-bold mb-0" style={{ fontSize: '0.95rem', color: '#0369a1' }}>
                                                كلية الطب والجراحة
                                            </h6>
                                        </div>
                                        <Row className="g-2 text-center">
                                            <Col xs={4}>
                                                <Form.Label className="small fw-bold mb-1 text-muted">الفصل الأول (طب)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    placeholder="15"
                                                    value={newYearMedSem1Weeks}
                                                    onChange={(e) => setNewYearMedSem1Weeks(e.target.value)}
                                                    style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderRadius: '8px', borderColor: '#7dd3fc' }}
                                                />
                                            </Col>
                                            <Col xs={4}>
                                                <Form.Label className="small fw-bold mb-1 text-muted">الفصل الثاني (طب)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    placeholder="14"
                                                    value={newYearMedSem2Weeks}
                                                    onChange={(e) => setNewYearMedSem2Weeks(e.target.value)}
                                                    style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderRadius: '8px', borderColor: '#7dd3fc' }}
                                                />
                                            </Col>
                                            <Col xs={4}>
                                                <Form.Label className="small fw-bold mb-1 text-muted">الفصل الصيفي (طب)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    placeholder="7"
                                                    value={newYearMedSummerWeeks}
                                                    onChange={(e) => setNewYearMedSummerWeeks(e.target.value)}
                                                    style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderRadius: '8px', borderColor: '#7dd3fc' }}
                                                />
                                            </Col>
                                        </Row>
                                    </div>
                                </Col>
                            </Row>
                        </div>

                        {/* جدول الأعوام الجامعية بتنسيق مقسم */}
                        <div className="table-responsive rounded-3 border">
                            <Table responsive bordered hover className="mb-0 text-center align-middle">
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #2e7d32' }}>
                                        <th rowSpan="2" style={{ textAlign: 'right', verticalAlign: 'middle', width: '180px', backgroundColor: '#f8fafc', paddingRight: '18px' }}>
                                            العام الجامعي
                                        </th>
                                        <th colSpan="3" style={{ backgroundColor: '#2e7d32', color: '#fff', fontSize: '0.95rem', padding: '10px' }}>
                                            🏛️ الكليات العامة (باقي كليات الجامعة)
                                        </th>
                                        <th colSpan="3" style={{ backgroundColor: '#0284c7', color: '#fff', fontSize: '0.95rem', padding: '10px' }}>
                                            🩺 كلية الطب والجراحة
                                        </th>
                                        <th rowSpan="2" style={{ width: '150px', verticalAlign: 'middle', backgroundColor: '#f8fafc' }}>
                                            إجراءات
                                        </th>
                                    </tr>
                                    <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.85rem' }}>
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>الفصل الأول</th>
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>الفصل الثاني</th>
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>الفصل الصيفي</th>
                                        <th style={{ backgroundColor: '#f0f9ff', color: '#075985' }}>الفصل الأول</th>
                                        <th style={{ backgroundColor: '#f0f9ff', color: '#075985' }}>الفصل الثاني</th>
                                        <th style={{ backgroundColor: '#f0f9ff', color: '#075985' }}>الفصل الصيفي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {academicYears.map((y, index) => (
                                        <tr 
                                            key={y.id}
                                            draggable
                                            onDragStart={(e) => handleYearDragStart(e, index)}
                                            onDragEnter={(e) => handleYearDragEnter(e, index)}
                                            onDragEnd={handleYearDragEnd}
                                            onDragOver={(e) => e.preventDefault()}
                                            style={{ cursor: 'grab' }}
                                        >
                                            <td className="fw-bold text-end pe-3" style={{ verticalAlign: 'middle' }}>
                                                <i className="bi bi-grip-vertical text-muted ms-2" style={{ cursor: 'grab' }}></i>
                                                {y.name}
                                            </td>
                                            {/* الكليات العامة */}
                                            <td><span className="badge bg-light text-success border px-2 py-2 fs-6">{y.semester1_weeks ?? 15} أسبوع</span></td>
                                            <td><span className="badge bg-light text-success border px-2 py-2 fs-6">{y.semester2_weeks ?? 14} أسبوع</span></td>
                                            <td><span className="badge bg-light text-success border px-2 py-2 fs-6">{y.summer_weeks ?? 7} أسبوع</span></td>
                                            {/* كلية الطب والجراحة */}
                                            <td style={{ backgroundColor: '#f0f9ff' }}><span className="badge bg-light text-primary border px-2 py-2 fs-6" style={{ color: '#0369a1' }}>{y.med_semester1_weeks ?? y.semester1_weeks ?? 15} أسبوع</span></td>
                                            <td style={{ backgroundColor: '#f0f9ff' }}><span className="badge bg-light text-primary border px-2 py-2 fs-6" style={{ color: '#0369a1' }}>{y.med_semester2_weeks ?? y.semester2_weeks ?? 14} أسبوع</span></td>
                                            <td style={{ backgroundColor: '#f0f9ff' }}><span className="badge bg-light text-primary border px-2 py-2 fs-6" style={{ color: '#0369a1' }}>{y.med_summer_weeks ?? y.summer_weeks ?? 7} أسبوع</span></td>
                                            {/* إجراءات */}
                                            <td>
                                                <div className="d-flex justify-content-center gap-2">
                                                    <Button variant="outline-primary" size="sm" onClick={() => handleOpenEditModal(y)}>
                                                        تعديل
                                                    </Button>
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleDeleteAcademicYear(y.id)}>
                                                        حذف
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {academicYears.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="text-center text-muted py-4">لا يوجد أعوام جامعية مضافة</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Edit Academic Year Modal */}
            <Modal show={showEditYearModal} onHide={() => setShowEditYearModal(false)} size="lg" centered dir="rtl">
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold text-success fs-5">
                        تعديل بيانات العام الجامعي: {editingYear?.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {editingYear && (
                        <Form>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-bold small">العام الجامعي:</Form.Label>
                                <Form.Control
                                    value={editingYear.name}
                                    onChange={(e) => setEditingYear({ ...editingYear, name: e.target.value })}
                                    style={{ textAlign: 'center', fontWeight: 'bold', maxWidth: '280px', height: '42px' }}
                                />
                            </Form.Group>

                            {/* قسم الكليات العامة */}
                            <div className="p-3 rounded-3 border mb-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom" style={{ borderColor: '#dcfce7' }}>
                                    <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                                    <h6 className="fw-bold text-success mb-0">الكليات العامة (باقي كليات الجامعة)</h6>
                                </div>
                                <Row className="g-2 text-center">
                                    <Col md={4}>
                                        <Form.Label className="fw-bold small text-muted">أسابيع الفصل الأول</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.semester1_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, semester1_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center', fontWeight: 'bold', height: '40px' }}
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <Form.Label className="fw-bold small text-muted">أسابيع الفصل الثاني</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.semester2_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, semester2_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center', fontWeight: 'bold', height: '40px' }}
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <Form.Label className="fw-bold small text-muted">أسابيع الفصل الصيفي</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.summer_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, summer_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center', fontWeight: 'bold', height: '40px' }}
                                        />
                                    </Col>
                                </Row>
                            </div>

                            {/* قسم كلية الطب والجراحة */}
                            <div className="p-3 rounded-3 border" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                                <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom" style={{ borderColor: '#e0f2fe' }}>
                                    <span style={{ fontSize: '1.2rem' }}>🩺</span>
                                    <h6 className="fw-bold mb-0" style={{ color: '#0369a1' }}>كلية الطب والجراحة</h6>
                                </div>
                                <Row className="g-2 text-center">
                                    <Col md={4}>
                                        <Form.Label className="fw-bold small text-muted">أسابيع الفصل الأول (طب)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.med_semester1_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, med_semester1_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderColor: '#7dd3fc' }}
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <Form.Label className="fw-bold small text-muted">أسابيع الفصل الثاني (طب)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.med_semester2_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, med_semester2_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderColor: '#7dd3fc' }}
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <Form.Label className="fw-bold small text-muted">أسابيع الفصل الصيفي (طب)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.med_summer_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, med_summer_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center', fontWeight: 'bold', height: '40px', borderColor: '#7dd3fc' }}
                                        />
                                    </Col>
                                </Row>
                            </div>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={() => setShowEditYearModal(false)}>إلغاء</Button>
                    <Button variant="success" className="px-4 fw-bold" onClick={handleSaveEditAcademicYear}>حفظ التعديلات</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ControlPanelPage;
