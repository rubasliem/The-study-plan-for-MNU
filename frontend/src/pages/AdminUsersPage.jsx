import { FaUsersCog } from "react-icons/fa";
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Container, Card, Table, Button, Modal, Form, Spinner, Badge, InputGroup, Pagination } from 'react-bootstrap';
import { FaPlus, FaTrash, FaUserShield, FaEye, FaEyeSlash } from 'react-icons/fa';
import { confirmAction } from '../utils/confirmAlert';
import toast from 'react-hot-toast';

const AdminUsersPage = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [editingId, setEditingId] = useState(null);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('faculty_admin');
    const [newJobTitle, setNewJobTitle] = useState('');
    const [facultyAccessMode, setFacultyAccessMode] = useState('specific'); // 'all' or 'specific'
    const [newFacultyId, setNewFacultyId] = useState('');
    const [newAssignedFaculties, setNewAssignedFaculties] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterFaculty, setFilterFaculty] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 20;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole, filterFaculty]);

    const API = "";

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, facRes] = await Promise.all([
                axios.get(`${API}/api/users`),
                axios.get(`${API}/api/faculties`)
            ]);
            setUsers(usersRes.data);
            setFaculties(facRes.data);
        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (mode, u = null) => {
        setModalMode(mode);
        setShowPassword(false);
        setErrors({});
        if (mode === 'edit' && u) {
            setEditingId(u.id);
            setNewUsername(u.username || '');
            setNewPassword('');
            setNewRole(u.role);
            setNewJobTitle(u.job_title || (u.role === 'admin' ? 'مدير عام (Admin)' : u.role === 'student_affairs' ? 'مدير شؤون الطلاب' : u.role === 'reviewer' ? 'المراجع' : u.role === 'faculty_professor' ? 'مدير برنامج' : 'مسؤول كلية (Faculty Admin)'));
            const isAll = Boolean(u.all_faculties_access || (u.role === 'admin' && (!u.assigned_faculties || u.assigned_faculties.length === 0)));
            setFacultyAccessMode(isAll ? 'all' : 'specific');
            let assignedIds = [];
            if (u.assigned_faculties && u.assigned_faculties.length > 0) {
                assignedIds = u.assigned_faculties.map(f => f.id);
            } else if (u.faculty_id) {
                assignedIds = [u.faculty_id];
            }
            setNewAssignedFaculties(assignedIds);
            setNewFacultyId(u.faculty_id || (assignedIds[0] || ''));
        } else {
            setEditingId(null);
            setNewUsername('');
            setNewPassword('');
            setNewRole('faculty_admin');
            setNewJobTitle('مسؤول كلية (Faculty Admin)');
            setFacultyAccessMode('specific');
            setNewFacultyId('');
            setNewAssignedFaculties(faculties.length > 0 ? [faculties[0].id] : []);
        }
        setShowModal(true);
    };

    const handleJobTitleChange = (val) => {
        setNewJobTitle(val);
        if (val === 'مدير عام (Super Admin)' || val === 'مدير عام (Admin)' || val === 'مدير عام') {
            setNewRole('admin');
            setFacultyAccessMode('all');
        } else if (
            val === 'مدير' ||
            val === 'نائب رئيس الجامعة للشئون الأكاديمية' ||
            val === 'عميد قطاع الهندسة والعلوم الأساسية والتطبيقية' ||
            val === 'عميد قطاع العلوم الصحية' ||
            val === 'مدير إدارة IT' ||
            val === 'مدير إدارة المالية' ||
            val === 'عضو هيئة تدريس'
        ) {
            setNewRole('manager');
            setFacultyAccessMode('specific');
        } else if (val === 'مدير شؤون الطلاب') {
            setNewRole('student_affairs');
            setFacultyAccessMode('all');
        } else if (val === 'المراجع') {
            setNewRole('reviewer');
            setFacultyAccessMode('specific');
        } else if (val === 'مدير برنامج') {
            setNewRole('faculty_professor');
            setFacultyAccessMode('specific');
        } else {
            setNewRole('faculty_admin');
            setFacultyAccessMode('specific');
        }
    };

    const validateForm = () => {
        const errs = {};
        if (!newUsername.trim()) errs.username = 'اسم المستخدم مطلوب';
        if (modalMode === 'add' && !newPassword) {
            errs.password = 'كلمة المرور مطلوبة';
        } else if (newPassword) {
            if (!/^\d{6}$/.test(newPassword) || new Set(newPassword).size !== 6) {
                errs.password = 'يجب أن تتكون كلمة المرور من 6 أرقام إنجليزية مختلفة (0-9)';
            }
        }
        if (!newRole) errs.role = 'مستوى الصلاحية مطلوب';
        if (facultyAccessMode === 'specific' && newAssignedFaculties.length === 0) {
            errs.assigned_faculties = 'يجب اختيار كلية واحدة على الأقل عند تحديد كليات مخصصة';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        try {
            const isAllAccess = facultyAccessMode === 'all';
            const payload = {
                username: newUsername.trim(),
                role: newRole,
                job_title: newJobTitle.trim() || null,
                all_faculties_access: isAllAccess,
                faculty_id: isAllAccess ? null : (newAssignedFaculties[0] || null),
                assigned_faculty_ids: isAllAccess ? [] : newAssignedFaculties
            };
            
            if (newPassword.trim() !== '') {
                payload.password = newPassword;
            }

            if (modalMode === 'add') {
                await axios.post(`${API}/api/users`, payload);
                toast.success("تم إضافة المستخدم بنجاح");
            } else {
                await axios.put(`${API}/api/users/${editingId}`, payload);
                toast.success("تم تحديث المستخدم بنجاح");
            }
            
            setShowModal(false);
            setNewUsername('');
            setNewPassword('');
            setNewJobTitle('');
            setNewFacultyId('');
            setNewAssignedFaculties([]);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || "حدث خطأ أثناء حفظ المستخدم");
        }
    };

    const handleDeleteUser = async (id) => {
        if (!(await confirmAction("هل أنت متأكد من حذف هذا المستخدم؟"))) return;
        try {
            await axios.delete(`${API}/api/users/${id}`);
            toast.success("تم الحذف بنجاح");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || "حدث خطأ أثناء الحذف");
        }
    };

    const getFacultyName = (id) => {
        if (!id) return "الكل";
        const f = faculties.find(fac => fac.id === id);
        return f ? f.name : "غير معروف";
    };

    const filteredUsers = users.filter(u => {
        if (user?.role === 'faculty_professor') {
            if (u.role !== 'faculty_admin' || String(u.faculty_id) !== String(user.faculty_id)) {
                return false;
            }
        }
        
        if (filterRole) {
            let roleText = 'مدير برنامج';
            if (u.role === 'admin') roleText = 'مدير عام';
            else if (u.role === 'faculty_admin') roleText = 'مسؤول كلية';
            else if (u.role === 'student_affairs') roleText = 'مدير شؤون الطلاب';
            else if (u.role === 'reviewer') roleText = 'المراجع';
            
            const jobTitleText = u.job_title || roleText;
            
            if (filterRole === 'مدير عام (Super Admin)') {
                if (u.role !== 'admin') return false;
            } else if (filterRole === 'مسؤول كلية (Faculty Admin)') {
                if (u.role !== 'faculty_admin') return false;
            } else if (jobTitleText !== filterRole && roleText !== filterRole) {
                return false;
            }
        }
        
        if (filterFaculty) {
            if (u.all_faculties_access) {
                // accessible
            } else if (u.assigned_faculties && u.assigned_faculties.length > 0) {
                if (!u.assigned_faculties.some(f => String(f.id) === filterFaculty)) {
                    return false;
                }
            } else if (u.faculty_id) {
                if (String(u.faculty_id) !== filterFaculty) {
                    return false;
                }
            } else if (u.role === 'admin' || u.role === 'student_affairs') {
                // all faculties
            } else {
                return false;
            }
        }

        const usernameMatch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
        
        let roleText = 'مدير برنامج';
        if (u.role === 'admin') roleText = 'مدير عام';
        else if (u.role === 'faculty_admin') roleText = 'مسؤول كلية';
        else if (u.role === 'student_affairs') roleText = 'مدير شؤون الطلاب';
        else if (u.role === 'reviewer') roleText = 'المراجع';
        const jobTitleText = u.job_title || roleText;
        const roleMatch = jobTitleText.toLowerCase().includes(searchTerm.toLowerCase()) || roleText.toLowerCase().includes(searchTerm.toLowerCase());
        
        let facultyName = '';
        if (u.all_faculties_access || (u.role === 'admin' && (!u.assigned_faculties || u.assigned_faculties.length === 0))) {
            facultyName = 'جميع الكليات';
        } else if (u.assigned_faculties && u.assigned_faculties.length > 0) {
            facultyName = u.assigned_faculties.map(f => f.name).join(' ');
        } else {
            facultyName = getFacultyName(u.faculty_id);
        }
        const facultyMatch = facultyName.toLowerCase().includes(searchTerm.toLowerCase());
        
        return usernameMatch || roleMatch || facultyMatch;
    });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    if (loading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    const restrictedFromAdminPages = [
        'مدير',
        'نائب رئيس الجامعة للشئون الأكاديمية',
        'عميد قطاع الهندسة والعلوم الأساسية والتطبيقية',
        'عميد قطاع العلوم الصحية',
        'مدير إدارة IT',
        'مدير إدارة المالية',
        'عضو هيئة تدريس'
    ];
    const isSuperAdmin = user?.role === 'admin' && !restrictedFromAdminPages.includes(user?.job_title);

    if (!isSuperAdmin && user?.role !== 'faculty_professor') {
        return <Container className="mt-5 text-center text-danger"><h4>ليس لديك صلاحية للوصول إلى هذه الصفحة</h4></Container>;
    }

    return (
        <div style={{ padding: '20px', direction: 'rtl' }}>
            <div className="row mb-3 align-items-center">
                {/* عنوان الصفحة */}
                <div className="col-9">
                    <h2 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }} className="d-flex align-items-center gap-3"><FaUsersCog className="text-success" style={{ marginLeft: '15px' }} /> إدارة النظام والمسؤولين</h2>
                </div>
                <div className="col-3">
                    {/* مساحة فارغة لمطابقة الهيدر */}
                </div>
            </div>

            <div className="row mb-3 align-items-center">
                {/* الفلاتر والبحث */}
                <div className="col-9 d-flex gap-3">
                    <input
                        type="text"
                        className="form-control flex-grow-1"
                        placeholder="بحث باسم المستخدم، الوظيفة، أو الكلية المربوطة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Form.Select 
                        style={{ width: '25%', minWidth: '280px' }}
                        value={filterRole} 
                        onChange={(e) => setFilterRole(e.target.value)}
                    >
                        <option value="">جميع الوظائف</option>
                        <option value="مدير عام (Super Admin)">مدير عام (Super Admin)</option>
                        <option value="مدير">مدير</option>
                        <option value="مسؤول كلية (Faculty Admin)">مسؤول كلية (Faculty Admin)</option>
                        <option value="مدير برنامج">مدير برنامج</option>
                        <option value="مدير شؤون الطلاب">مدير شؤون الطلاب</option>
                        <option value="المراجع">المراجع</option>
                        <option value="نائب رئيس الجامعة للشئون الأكاديمية">نائب رئيس الجامعة للشئون الأكاديمية</option>
                        <option value="عميد قطاع الهندسة والعلوم الأساسية والتطبيقية">عميد قطاع الهندسة والعلوم الأساسية والتطبيقية</option>
                        <option value="عميد قطاع العلوم الصحية">عميد قطاع العلوم الصحية</option>
                        <option value="مدير إدارة IT">مدير إدارة IT</option>
                        <option value="مدير إدارة المالية">مدير إدارة المالية</option>
                        <option value="عضو هيئة تدريس">عضو هيئة تدريس</option>
                    </Form.Select>
                    <Form.Select 
                        style={{ width: '35%', minWidth: '350px' }}
                        value={filterFaculty} 
                        onChange={(e) => setFilterFaculty(e.target.value)}
                    >
                        <option value="">جميع الكليات</option>
                        {faculties.map(fac => (
                            <option key={fac.id} value={fac.id}>{fac.name}</option>
                        ))}
                    </Form.Select>
                </div>

                {/* زر إضافة مسؤول جديد */}
                <div className="col-3">
                    <Button
                        variant="primary"
                        onClick={() => handleOpenModal('add')}
                        className="w-100 text-nowrap fw-bold"
                        style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
                    >
                        + إضافة مسؤول جديد
                    </Button>
                </div>
            </div>

            <Table responsive striped bordered hover className="mt-3">
                <thead>
                    <tr style={{ borderBottom: '2.5px solid var(--secondary)', whiteSpace: 'nowrap' }}>
                        <th style={{ width: "6%" }}>#</th>
                        <th style={{ width: "24%" }}>اسم المستخدم</th>
                        <th style={{ width: "22%" }}>وظيفة المستخدم</th>
                        <th style={{ width: "36%" }}>الكليات المصرح برؤيتها</th>
                        <th style={{ width: "12%" }}>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    {currentUsers.map((u, index) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td className="fw-bold text-muted">{indexOfFirstUser + index + 1}</td>
                            <td className="fw-bold" style={{ color: 'var(--text-title)' }}>{u.username}</td>
                            <td>
                                <span className="badge px-3 py-2 fw-semibold" style={{
                                    borderRadius: '15px',
                                    border: u.role === 'admin' ? '1.5px solid #ef4444' : u.role === 'manager' ? '1.5px solid #0284c7' : u.role === 'student_affairs' ? '1.5px solid #f59e0b' : u.role === 'reviewer' ? '1.5px solid #8b5cf6' : u.role === 'faculty_professor' ? '1.5px solid #10b981' : '1.5px solid #3b82f6',
                                    color: u.role === 'admin' ? '#ef4444' : u.role === 'manager' ? '#0369a1' : u.role === 'student_affairs' ? '#b45309' : u.role === 'reviewer' ? '#8b5cf6' : u.role === 'faculty_professor' ? '#10b981' : '#3b82f6',
                                    backgroundColor: u.role === 'admin' ? '#fef2f2' : u.role === 'manager' ? '#f0f9ff' : u.role === 'student_affairs' ? '#fffbeb' : u.role === 'reviewer' ? '#f3e8ff' : u.role === 'faculty_professor' ? '#ecfdf5' : '#eff6ff',
                                    fontSize: '0.85rem'
                                }}>
                                    {u.job_title || (u.role === 'admin' ? 'مدير عام (Super Admin)' : u.role === 'manager' ? 'صلاحية مدير' : u.role === 'student_affairs' ? 'مدير شؤون الطلاب' : u.role === 'faculty_admin' ? 'مسؤول كلية (Faculty Admin)' : u.role === 'faculty_professor' ? 'مدير برنامج' : 'المراجع')}
                                </span>
                            </td>
                            <td style={{ verticalAlign: 'middle', whiteSpace: 'normal' }}>
                                {u.all_faculties_access || (u.role === 'admin' && (!u.assigned_faculties || u.assigned_faculties.length === 0)) ? (
                                    <span className="badge bg-success px-3 py-1 fw-bold fs-6">جميع الكليات</span>
                                ) : u.assigned_faculties && u.assigned_faculties.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-1">
                                        {u.assigned_faculties.map(f => (
                                            <span key={f.id} className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '0.8rem' }}>
                                                {f.name.replace(/^كلية\s+/, '')}
                                            </span>
                                        ))}
                                    </div>
                                ) : u.faculty_id ? (
                                    <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '0.8rem' }}>
                                        {getFacultyName(u.faculty_id).replace(/^كلية\s+/, '')}
                                    </span>
                                ) : (
                                    <span className="text-muted small">غير محدد</span>
                                )}
                            </td>
                            <td>
                                <div className="d-flex justify-content-center align-items-center gap-3">
                                    <Button variant="link" size="sm" className="p-0" title="تعديل" onClick={() => handleOpenModal('edit', u)}>
                                        <i className="bi bi-pencil-square action-btn-edit" style={{ fontSize: '18px' }}></i>
                                    </Button>
                                    {u.username !== 'admin' ? (
                                        <Button variant="link" size="sm" className="p-0" title="حذف" onClick={() => handleDeleteUser(u.id)}>
                                            <i className="bi bi-trash3-fill action-btn-delete" style={{ fontSize: '18px' }}></i>
                                        </Button>
                                    ) : (
                                        <span className="text-muted small">-</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                        <tr>
                            <td colSpan="5" className="text-muted py-5">
                                {users.length === 0 ? "لا يوجد مستخدمون مسجلون حالياً." : "لا توجد نتائج مطابقة للبحث."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>

            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                        <Pagination.First disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>»</Pagination.First>
                        <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>›</Pagination.Prev>
                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                            <Pagination.Item 
                                key={page} 
                                active={currentPage === page} 
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </Pagination.Item>
                        ))}
                        <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>‹</Pagination.Next>
                        <Pagination.Last disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>«</Pagination.Last>
                    </Pagination>
                </div>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} dir="rtl" centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold fs-5 text-success">
                        {modalMode === 'add' ? "إضافة مسؤول جديد" : "تعديل بيانات المسؤول"}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveUser} noValidate>
                    <Modal.Body className="px-4 py-4">
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold mb-2">اسم المستخدم (Username)</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="أدخل اسم المستخدم (مثال: Ruba_Sliem أو dr_ahmed)"
                                value={newUsername} 
                                onChange={e => { setNewUsername(e.target.value); setErrors(prev => ({ ...prev, username: null })); }} 
                                style={{ borderColor: errors.username ? 'red' : '' }}
                            />
                            {errors.username && <span className="text-danger small d-block mt-1" style={{ fontSize: '12px' }}>{errors.username}</span>}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold mb-2">كلمة المرور</Form.Label>
                            <InputGroup>
                                <Form.Control 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder={modalMode === 'add' ? "أدخل كلمة مرور المسؤول (6 أرقام)" : "اتركها فارغة لعدم التغيير"}
                                    value={newPassword} 
                                    onChange={e => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, password: null })); }} 
                                    style={{ borderColor: errors.password ? 'red' : '' }}
                                />
                                <InputGroup.Text 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    style={{ cursor: 'pointer', backgroundColor: '#f8fafc' }}
                                >
                                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                                </InputGroup.Text>
                            </InputGroup>
                            {errors.password && <span className="text-danger small d-block mt-1" style={{ fontSize: '12px' }}>{errors.password}</span>}
                        </Form.Group>

                        {/* وظيفة المستخدم (المسمى الوظيفي) */}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold mb-2">وظيفة المستخدم (المسمى الوظيفي)</Form.Label>
                            <Form.Select 
                                value={newJobTitle} 
                                onChange={e => handleJobTitleChange(e.target.value)}
                            >
                                <option value="مدير عام (Super Admin)">مدير عام (Super Admin)</option>
                                <option value="مدير">مدير</option>
                                <option value="مسؤول كلية (Faculty Admin)">مسؤول كلية (Faculty Admin)</option>
                                <option value="مدير برنامج">مدير برنامج</option>
                                <option value="مدير شؤون الطلاب">مدير شؤون الطلاب</option>
                                <option value="المراجع">المراجع</option>
                                <option value="نائب رئيس الجامعة للشئون الأكاديمية">نائب رئيس الجامعة للشئون الأكاديمية</option>
                                <option value="عميد قطاع الهندسة والعلوم الأساسية والتطبيقية">عميد قطاع الهندسة والعلوم الأساسية والتطبيقية</option>
                                <option value="عميد قطاع العلوم الصحية">عميد قطاع العلوم الصحية</option>
                                <option value="مدير إدارة IT">مدير إدارة IT</option>
                                <option value="مدير إدارة المالية">مدير إدارة المالية</option>
                                <option value="عضو هيئة تدريس">عضو هيئة تدريس</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold mb-2">مستوى صلاحيات النظام (System Role)</Form.Label>
                            <Form.Select 
                                disabled={user?.role === 'faculty_professor'}
                                value={newRole} 
                                onChange={e => { setNewRole(e.target.value); setErrors(prev => ({ ...prev, role: null })); }}
                                style={{ borderColor: errors.role ? 'red' : '' }}
                            >
                                <option value="admin">صلاحيات مدير عام (Super Admin) - كامل الصلاحيات</option>
                                <option value="manager">صلاحية مدير (Manager)</option>
                                <option value="faculty_admin">صلاحيات مسؤول كلية (Faculty Admin)</option>
                                <option value="faculty_professor">صلاحيات مدير برنامج (Program Manager)</option>
                                <option value="student_affairs">صلاحيات شؤون الطلاب (Student Affairs)</option>
                                <option value="reviewer">صلاحيات المراجع (Reviewer)</option>
                            </Form.Select>
                            {errors.role && <span className="text-danger small d-block mt-1" style={{ fontSize: '12px' }}>{errors.role}</span>}
                        </Form.Group>

                        {/* ── التحكم الشامل في الكليات المصرح برؤيتها ── */}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold mb-2 d-block">نطاق الكليات المصرح للمستخدم برؤيتها وإدارتها</Form.Label>
                            <div className="d-flex gap-4 mb-2 p-2 bg-light rounded border">
                                <Form.Check
                                    type="radio"
                                    id="fac-access-all"
                                    name="facultyAccessMode"
                                    label={<strong className="text-success">جميع الكليات بالجامعة</strong>}
                                    checked={facultyAccessMode === 'all'}
                                    onChange={() => {
                                        setFacultyAccessMode('all');
                                        setErrors(prev => ({ ...prev, assigned_faculties: null }));
                                    }}
                                />
                                <Form.Check
                                    type="radio"
                                    id="fac-access-specific"
                                    name="facultyAccessMode"
                                    label={<strong className="text-primary">تحديد كليات مخصصة</strong>}
                                    checked={facultyAccessMode === 'specific'}
                                    onChange={() => {
                                        setFacultyAccessMode('specific');
                                        if (newAssignedFaculties.length === 0 && faculties.length > 0) {
                                            setNewAssignedFaculties([faculties[0].id]);
                                        }
                                    }}
                                />
                            </div>
                            
                            {facultyAccessMode === 'specific' && (
                                <div style={{ border: errors.assigned_faculties ? '1.5px solid red' : '1px solid #ced4da', borderRadius: '0.375rem', padding: '12px', backgroundColor: '#fcfdfd' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
                                        <span className="small text-muted fw-bold">اختر الكليات المصرح بها:</span>
                                        <div className="d-flex gap-2">
                                            <Button 
                                                variant="link" 
                                                size="sm" 
                                                className="p-0 text-decoration-none small text-success fw-bold"
                                                onClick={() => setNewAssignedFaculties(faculties.map(f => f.id))}
                                            >
                                                ✓ تحديد الكل
                                            </Button>
                                            <span className="text-muted">|</span>
                                            <Button 
                                                variant="link" 
                                                size="sm" 
                                                className="p-0 text-decoration-none small text-danger fw-bold"
                                                onClick={() => setNewAssignedFaculties([])}
                                            >
                                                ✕ إلغاء الكل
                                            </Button>
                                        </div>
                                    </div>
                                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                        {faculties.map(f => (
                                            <div key={f.id} className="d-flex align-items-center gap-2 mb-2 p-1 rounded" style={{ backgroundColor: newAssignedFaculties.includes(f.id) ? '#f0fdf4' : 'transparent' }}>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    style={{ margin: 0, cursor: 'pointer' }}
                                                    id={`faculty-checkbox-${f.id}`}
                                                    checked={newAssignedFaculties.includes(f.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewAssignedFaculties([...newAssignedFaculties, f.id]);
                                                        } else {
                                                            setNewAssignedFaculties(newAssignedFaculties.filter(id => id !== f.id));
                                                        }
                                                        setErrors(prev => ({ ...prev, assigned_faculties: null }));
                                                    }}
                                                />
                                                <label htmlFor={`faculty-checkbox-${f.id}`} style={{ cursor: 'pointer', margin: 0, fontSize: '14px', fontWeight: newAssignedFaculties.includes(f.id) ? 'bold' : 'normal', color: newAssignedFaculties.includes(f.id) ? '#166534' : '#333' }}>
                                                    {f.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.assigned_faculties && <span className="text-danger small d-block mt-2" style={{ fontSize: '12px' }}>{errors.assigned_faculties}</span>}
                                </div>
                            )}
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="px-4">
                        <Button variant="secondary" className="fw-semibold px-4 py-2" onClick={() => setShowModal(false)}>
                            إلغاء
                        </Button>
                        <Button className="fw-semibold px-4 py-2 text-white" type="submit" style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}>
                            {modalMode === 'add' ? "حفظ الحساب" : "حفظ التعديلات"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminUsersPage;

