import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Table, Button, Spinner, Container, Row, Col, Form, Card } from 'react-bootstrap';
import { FaTrash, FaUndo, FaTrashRestore } from 'react-icons/fa';
import { confirmAction } from '../utils/confirmAlert';
import { AuthContext } from '../context/AuthContext';

const API = 'http://127.0.0.1:8000';

const RecycleBinPage = () => {
    const { user } = useContext(AuthContext);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const [faculties, setFaculties] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState("");
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
    const [selectedType, setSelectedType] = useState("");

    const canRestore = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'faculty_professor' || user?.perm_recycle_restore_btn;
    const canHardDelete = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'faculty_professor' || user?.perm_recycle_delete_btn;

    const fetchItems = async (facultyId = selectedFaculty) => {
        setLoading(true);
        try {
            let url = `${API}/api/recycle-bin`;
            if (facultyId) url += `?faculty_id=${facultyId}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setItems(res.data);
            setSelectedItems([]);
        } catch (error) {
            console.error("Error fetching recycle bin items", error);
            toast.error("حدث خطأ أثناء جلب المحذوفات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
        if (user) {
            axios.get(`${API}/api/faculties`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }).then(res => setFaculties(res.data))
                .catch(err => console.error("Error fetching faculties", err));

            axios.get(`${API}/api/academic-years`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }).then(res => setAcademicYears(res.data))
                .catch(err => console.error("Error fetching academic years", err));
        }
    }, [user, selectedFaculty]);

    const filteredItems = items.filter(item => {
        const matchYear = selectedAcademicYear ? item.academic_year === selectedAcademicYear : true;
        const matchType = selectedType ? item.type === selectedType : true;
        return matchYear && matchType;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(filteredItems.map(item => ({ type: item.type, id: item.id })));
        } else {
            setSelectedItems([]);
        }
    };

    const isSelected = (type, id) => {
        return selectedItems.some(i => i.type === type && i.id === id);
    };

    const handleSelect = (type, id) => {
        if (isSelected(type, id)) {
            setSelectedItems(selectedItems.filter(i => !(i.type === type && i.id === id)));
        } else {
            setSelectedItems([...selectedItems, { type, id }]);
        }
    };

    const handleRestore = async (itemsToRestore) => {
        if (!(await confirmAction("هل أنت متأكد من استرجاع العناصر المحددة؟"))) return;
        try {
            await axios.post(`${API}/api/recycle-bin/restore`, { items: itemsToRestore }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success("تم استرجاع العناصر بنجاح");
            fetchItems();
        } catch (error) {
            console.error("Error restoring items", error);
            toast.error("حدث خطأ أثناء الاسترجاع");
        }
    };

    const handleHardDelete = async (itemsToDelete) => {
        if (!(await confirmAction("تحذير: سيتم حذف هذه العناصر نهائياً ولا يمكن استرجاعها. هل أنت متأكد؟"))) return;
        try {
            await axios.delete(`${API}/api/recycle-bin/hard-delete`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                data: { items: itemsToDelete }
            });
            toast.success("تم الحذف النهائي بنجاح");
            fetchItems();
        } catch (error) {
            console.error("Error hard deleting items", error);
            toast.error("حدث خطأ أثناء الحذف النهائي");
        }
    };

    const getTypeName = (type) => {
        switch (type) {
            case 'professor': return 'عضو هيئة تدريس';
            case 'course': return 'مقرر دراسي';
            case 'study_plan': return 'خطة دراسية';
            case 'signature': return 'توقيع مسؤول';
            default: return 'غير معروف';
        }
    };

    const handleClearFilters = () => {
        setSelectedFaculty("");
        setSelectedAcademicYear("");
        setSelectedType("");
    };

    return (
        <Container fluid className="py-4" style={{ direction: 'rtl' }}>
            <div className="d-flex justify-content-between align-items-center mb-5">
                <h2 className="text-success fw-bold mb-0 d-flex align-items-center gap-3">
                    <FaTrashRestore className="text-success" style={{ marginLeft: '15px' }} />
                    استرجاع المحذوف
                    <span className="badge bg-secondary fs-6 ms-3 rounded p-2">
                        {filteredItems.length} عنصر
                    </span>
                </h2>

                {(canRestore || canHardDelete) && selectedItems.length > 0 && (
                    <div className="d-flex gap-2">
                        {canRestore && (
                            <Button
                                variant="success"
                                onClick={() => handleRestore(selectedItems)}
                            >
                                <FaUndo className="me-2" />
                                استرجاع المحدد ({selectedItems.length})
                            </Button>
                        )}
                        {canHardDelete && (
                            <Button
                                variant="danger"
                                onClick={() => handleHardDelete(selectedItems)}
                            >
                                <FaTrash className="me-2" />
                                حذف نهائي للمحدد ({selectedItems.length})
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {user && (user.role === 'admin' || user.role === 'manager' || user.role === 'student_affairs' || user.role === 'faculty_professor' || faculties.length > 1) && (
                <div className="mb-4 d-flex flex-wrap gap-3">
                    <Form.Group style={{ flex: '1', minWidth: '200px', maxWidth: '350px' }}>
                        <Form.Select
                            value={selectedFaculty}
                            onChange={(e) => setSelectedFaculty(e.target.value)}
                            className="shadow-sm border-success"
                        >
                            <option value="">جميع الكليات</option>
                            {faculties.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
                        <Form.Select
                            value={selectedAcademicYear}
                            onChange={(e) => setSelectedAcademicYear(e.target.value)}
                            className="shadow-sm border-success"
                        >
                            <option value="">جميع الأعوام الجامعية</option>
                            {academicYears.map(y => (
                                <option key={y.id} value={y.name}>{y.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
                        <Form.Select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="shadow-sm border-success"
                        >
                            <option value="">جميع الصفحات</option>
                            <option value="professor">أعضاء هيئة التدريس</option>
                            <option value="course">المقررات الدراسية</option>
                            <option value="study_plan">الخطط الدراسية</option>
                            <option value="signature">توقيعات المسؤولين</option>
                        </Form.Select>
                    </Form.Group>

                    {(selectedFaculty || selectedAcademicYear || selectedType) && (
                        <Button
                            variant="outline-secondary"
                            onClick={handleClearFilters}
                            className="d-flex align-items-center rounded px-4"
                            style={{ height: '35px' }}
                        >
                            إزالة الفلاتر
                        </Button>
                    )}
                </div>
            )}

            <Card className="shadow-sm border-0 mt-4" style={{ borderRadius: '15px' }}>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="success" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <FaTrashRestore size={50} className="mb-3 text-muted" style={{ opacity: 0.2 }} />
                            <h5>لا توجد عناصر مطابقة</h5>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table responsive hover className="mb-0 align-middle">
                                <thead className="bg-success text-white">
                                    <tr>
                                        <th style={{ width: '50px' }}>
                                            <Form.Check
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                                            />
                                        </th>
                                        <th>النوع</th>
                                        <th>ما تم حذفه</th>
                                        <th>الكلية</th>
                                        <th className="text-center">وقت الحذف</th>
                                        <th className="text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => (
                                        <tr key={`${item.type}-${item.id}`}>
                                            <td>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={isSelected(item.type, item.id)}
                                                    onChange={() => handleSelect(item.type, item.id)}
                                                />
                                            </td>
                                            <td>
                                                <span className={`badge ${item.type === 'professor' ? 'bg-primary' : item.type === 'course' ? 'bg-info' : item.type === 'signature' ? 'bg-secondary' : 'bg-warning'}`} style={{ fontSize: '0.9rem', padding: '0.5rem 0.8rem' }}>
                                                    {getTypeName(item.type)}
                                                </span>
                                            </td>
                                            <td className="fw-bold">
                                                {item.type === 'course' ? (
                                                    <div>
                                                        <div style={{ color: 'var(--text-title, #1e293b)' }}>
                                                            {item.name_ar || item.name || item.name_en || "مقرر بدون اسم"}
                                                        </div>
                                                        {item.code && (
                                                            <div style={{ color: '#2e7d32', fontSize: '13px', marginTop: '2px', fontWeight: 'bold' }}>
                                                                {item.code}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    item.name
                                                )}
                                            </td>
                                            <td>{item.faculty}</td>
                                            <td dir="ltr" className="text-center">
                                                {item.deleted_at ? (
                                                    <><small>{new Date(item.deleted_at + 'Z').toLocaleTimeString('ar-EG')}</small> - <small>{new Date(item.deleted_at + 'Z').toLocaleDateString('ar-EG')}</small></>
                                                ) : '-'}
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-2">
                                                    {canRestore && (
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            title="استرجاع"
                                                            className="fw-bold"
                                                            onClick={() => handleRestore([item])}
                                                        >
                                                            <FaUndo className="ms-1" /> استرجاع
                                                        </Button>
                                                    )}
                                                    {canHardDelete && (
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            title="حذف نهائي"
                                                            className="fw-bold"
                                                            onClick={() => handleHardDelete([item])}
                                                        >
                                                            <FaTrash className="ms-1" /> حذف نهائي
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default RecycleBinPage;
