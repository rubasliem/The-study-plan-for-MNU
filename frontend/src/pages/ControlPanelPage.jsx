import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Container, Card, Table, Form, Spinner, Button, InputGroup, Modal, Row, Col } from 'react-bootstrap';
import { FaShieldAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ControlPanelPage = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [newYearName, setNewYearName] = useState("");
    const [newYearSem1Weeks, setNewYearSem1Weeks] = useState("");
    const [newYearSem2Weeks, setNewYearSem2Weeks] = useState("");
    const [newYearSummerWeeks, setNewYearSummerWeeks] = useState("");
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
            // Show faculty_admin users (if program_manager, only for their faculty)
            let facultyAdmins = usersRes.data.filter(u => u.role === 'faculty_admin' || u.role === 'student_affairs' || u.role === 'reviewer');
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
                summer_weeks: newYearSummerWeeks ? (parseInt(newYearSummerWeeks) || 7) : 7
            });
            setAcademicYears([...academicYears, res.data]);
            setNewYearName("");
            setNewYearSem1Weeks("");
            setNewYearSem2Weeks("");
            setNewYearSummerWeeks("");
            toast.success("تم إضافة العام الجامعي بنجاح");
        } catch (error) {
            console.error("Error adding academic year", error);
            toast.error(error.response?.data?.detail || "حدث خطأ أثناء إضافة العام الجامعي");
        }
    };

    const handleDeleteAcademicYear = async (id) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا العام الجامعي؟")) return;
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
            semester2_weeks: yearObj.semester2_weeks ?? 15,
            summer_weeks: yearObj.summer_weeks ?? 8
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
                semester2_weeks: parseInt(editingYear.semester2_weeks) || 15,
                summer_weeks: parseInt(editingYear.summer_weeks) || 8
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

            {user?.role === 'admin' && (
                <Card className="shadow-sm border-0 mt-5" style={{ width: '100%', maxWidth: '850px' }}>
                    <Card.Header className="bg-white border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
                        <h4 style={{ color: '#2e7d32', fontWeight: 'bold' }}>إدارة الأعوام الجامعية</h4>
                    </Card.Header>
                    <Card.Body>
                        <div className="bg-light p-3 rounded-3 mb-4 border">
                            <h6 className="fw-bold text-success mb-3">إضافة عام جامعي جديد</h6>
                            <div className="d-flex flex-wrap align-items-end gap-2">
                                <Form.Group style={{ flex: '1 1 140px', minWidth: '130px' }}>
                                    <Form.Label className="small fw-bold mb-1">العام الجامعي</Form.Label>
                                    <Form.Control
                                        placeholder="مثال: 2028/2029"
                                        value={newYearName}
                                        onChange={(e) => setNewYearName(e.target.value)}
                                        style={{ textAlign: 'center' }}
                                    />
                                </Form.Group>
                                <Form.Group style={{ width: '95px', flexShrink: 0 }}>
                                    <Form.Label className="small fw-bold mb-1 text-nowrap">الفصل الأول</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="30"
                                        placeholder="15"
                                        value={newYearSem1Weeks}
                                        onChange={(e) => setNewYearSem1Weeks(e.target.value)}
                                        style={{ textAlign: 'center' }}
                                    />
                                </Form.Group>
                                <Form.Group style={{ width: '95px', flexShrink: 0 }}>
                                    <Form.Label className="small fw-bold mb-1 text-nowrap">الفصل الثاني</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="30"
                                        placeholder="14"
                                        value={newYearSem2Weeks}
                                        onChange={(e) => setNewYearSem2Weeks(e.target.value)}
                                        style={{ textAlign: 'center' }}
                                    />
                                </Form.Group>
                                <Form.Group style={{ width: '95px', flexShrink: 0 }}>
                                    <Form.Label className="small fw-bold mb-1 text-nowrap">الفصل الصيفي</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="30"
                                        placeholder="7"
                                        value={newYearSummerWeeks}
                                        onChange={(e) => setNewYearSummerWeeks(e.target.value)}
                                        style={{ textAlign: 'center' }}
                                    />
                                </Form.Group>
                                <div style={{ flexShrink: 0 }}>
                                    <Button variant="success" onClick={handleAddAcademicYear} className="fw-bold px-3 d-flex align-items-center gap-1" style={{ height: '38px', whiteSpace: 'nowrap' }}>
                                        <i className="bi bi-plus-circle"></i>
                                        <span>إضافة</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive">
                            <Table responsive striped bordered hover className="mb-0 text-center align-middle">
                                <thead className="bg-light">
                                    <tr style={{ borderBottom: '2px solid #2e7d32' }}>
                                        <th style={{ textAlign: 'right' }}>العام الجامعي</th>
                                        <th>الفصل الأول</th>
                                        <th>الفصل الثاني</th>
                                        <th>الفصل الصيفي</th>
                                        <th style={{ width: '130px' }}>إجراءات</th>
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
                                            <td className="fw-bold text-end" style={{ verticalAlign: 'middle' }}>
                                                <i className="bi bi-grip-vertical text-muted ms-2" style={{ cursor: 'grab' }}></i>
                                                {y.name}
                                            </td>
                                            <td><span className="badge bg-light text-dark border px-3 py-2 fs-6">{y.semester1_weeks ?? 15} أسبوع</span></td>
                                            <td><span className="badge bg-light text-dark border px-3 py-2 fs-6">{y.semester2_weeks ?? 15} أسبوع</span></td>
                                            <td><span className="badge bg-light text-dark border px-3 py-2 fs-6">{y.summer_weeks ?? 8} أسبوع</span></td>
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
                                            <td colSpan="5" className="text-center text-muted py-3">لا يوجد أعوام جامعية مضافة</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* Edit Academic Year Modal */}
            <Modal show={showEditYearModal} onHide={() => setShowEditYearModal(false)} centered dir="rtl">
                <Modal.Header closeButton className="bg-light">
                    <Modal.Title className="fw-bold text-success fs-5">تعديل بيانات العام الجامعي</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {editingYear && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold small">العام الجامعي</Form.Label>
                                <Form.Control
                                    value={editingYear.name}
                                    onChange={(e) => setEditingYear({ ...editingYear, name: e.target.value })}
                                    style={{ textAlign: 'center' }}
                                />
                            </Form.Group>
                            <Row className="g-2">
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold small">أسابيع الفصل الأول</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.semester1_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, semester1_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center' }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold small">أسابيع الفصل الثاني</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.semester2_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, semester2_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center' }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold small">أسابيع الفصل الصيفي</Form.Label>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={editingYear.summer_weeks}
                                            onChange={(e) => setEditingYear({ ...editingYear, summer_weeks: parseInt(e.target.value) || 0 })}
                                            style={{ textAlign: 'center' }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
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
