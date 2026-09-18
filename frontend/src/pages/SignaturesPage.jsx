import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Card, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaGripLines, FaEye, FaBuilding } from 'react-icons/fa';
import { FaPenNib } from 'react-icons/fa6';
import { confirmAction } from '../utils/confirmAlert';
import Select from 'react-select';
import toast from 'react-hot-toast';

const API = "";

const SignaturesPage = () => {
    const [faculties, setFaculties] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState("");
    const [signatures, setSignatures] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        signature_title: "",
        official_name: "",
        faculty_id: ""
    });
    const [formErrors, setFormErrors] = useState({});
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [reportTypeFilter, setReportTypeFilter] = useState("الخطة الدراسية");

    // All Faculties Signatures Preview State
    const [allSignatures, setAllSignatures] = useState([]);
    const [viewAllFaculties, setViewAllFaculties] = useState(false);
    const [loadingAllSignatures, setLoadingAllSignatures] = useState(false);

    const fetchAllSignatures = async (reportType) => {
        setLoadingAllSignatures(true);
        try {
            const res = await axios.get(`${API}/api/signatures?report_type=${encodeURIComponent(reportType)}`);
            setAllSignatures(res.data || []);
        } catch (err) {
            console.error("Error fetching all signatures", err);
        } finally {
            setLoadingAllSignatures(false);
        }
    };

    const signaturesByFaculty = useMemo(() => {
        const grouped = {};
        allSignatures.forEach(sig => {
            if (!grouped[sig.faculty_id]) grouped[sig.faculty_id] = [];
            grouped[sig.faculty_id].push(sig);
        });
        Object.keys(grouped).forEach(fId => {
            grouped[fId].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        });
        return grouped;
    }, [allSignatures]);

    useEffect(() => {
        if (viewAllFaculties) {
            fetchAllSignatures(reportTypeFilter);
        }
    }, [reportTypeFilter, viewAllFaculties]);

    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const reordered = [...signatures];
        const draggedItem = reordered[draggedIndex];
        reordered.splice(draggedIndex, 1);
        reordered.splice(index, 0, draggedItem);

        setDraggedIndex(index);
        setSignatures(reordered);
    };

    const handleDragEnd = async () => {
        setDraggedIndex(null);
        try {
            const reorderData = signatures.map((sig, idx) => ({
                id: sig.id,
                order_index: idx
            }));
            await axios.post(`${API}/api/signatures/reorder`, reorderData);
            if (viewAllFaculties) {
                fetchAllSignatures(reportTypeFilter);
            }
        } catch (err) {
            console.error("Error saving new signatures order:", err);
            toast.error("حدث خطأ أثناء حفظ الترتيب الجديد");
        }
    };

    useEffect(() => {
        const fetchFaculties = async () => {
            try {
                const res = await axios.get(`${API}/api/faculties`);
                setFaculties(res.data);
                if (res.data.length > 0) {
                    setSelectedFaculty(res.data[0].id);
                }
            } catch (err) {
                console.error("Error fetching faculties", err);
            }
        };
        fetchFaculties();
    }, []);

    useEffect(() => {
        if (selectedFaculty) {
            fetchSignatures(selectedFaculty, reportTypeFilter);
        }
    }, [selectedFaculty, reportTypeFilter]);

    const fetchSignatures = async (facultyId, reportType) => {
        try {
            const res = await axios.get(`${API}/api/signatures?faculty_id=${facultyId}&report_type=${reportType}`);
            setSignatures(res.data);
        } catch (err) {
            console.error("Error fetching signatures", err);
        }
    };

    const handleOpenModal = (mode, sig = null) => {
        setModalMode(mode);
        if (mode === 'edit' && sig) {
            setEditingId(sig.id);
            setFormData({
                signature_title: sig.signature_title,
                official_name: sig.official_name,
                faculty_id: sig.faculty_id,
                report_type: sig.report_type || reportTypeFilter
            });
        } else {
            setEditingId(null);
            setFormData({
                signature_title: "",
                official_name: "",
                faculty_id: selectedFaculty || "",
                report_type: reportTypeFilter
            });
        }
        setFormErrors({});
        setShowModal(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.signature_title.trim()) errors.signature_title = "اسم التوقيع مطلوب";
        if (!formData.official_name.trim()) errors.official_name = "اسم المسؤول مطلوب";
        if (!formData.faculty_id) errors.faculty_id = "الكلية مطلوبة";
        if (!formData.report_type) errors.report_type = "يجب اختيار صفحة واحدة على الأقل";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            if (modalMode === 'add') {
                await axios.post(`${API}/api/signatures`, formData);
            } else {
                await axios.put(`${API}/api/signatures/${editingId}`, formData);
            }
            setShowModal(false);
            fetchSignatures(selectedFaculty, reportTypeFilter);
            if (viewAllFaculties) fetchAllSignatures(reportTypeFilter);
            toast.success("تم الحفظ بنجاح");
        } catch (err) {
            console.error("Error saving signature", err);
            toast.error("حدث خطأ أثناء الحفظ");
        }
    };

    const handleDelete = async (id) => {
        if (await confirmAction("هل أنت متأكد من حذف هذا التوقيع؟")) {
            try {
                await axios.delete(`${API}/api/signatures/${id}`);
                fetchSignatures(selectedFaculty, reportTypeFilter);
                if (viewAllFaculties) fetchAllSignatures(reportTypeFilter);
                toast.success("تم الحذف بنجاح");
            } catch (err) {
                console.error("Error deleting signature", err);
                toast.error("حدث خطأ أثناء الحذف");
            }
        }
    };

    return (
        <div style={{ padding: '20px', direction: 'rtl' }}>
            <div className="row mb-3 align-items-center">
                {/* عنوان الصفحة */}
                <div className="col-12 col-lg-9 mb-3 mb-lg-0">
                    <h2 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32' }} className="d-flex align-items-center gap-3"><FaPenNib className="text-success" style={{ marginLeft: '15px' }} /> توقيعات المسؤولين</h2>
                </div>
                <div className="col-12 col-lg-3">
                    {/* مساحة فارغة لمطابقة الهيدر */}
                </div>
            </div>

            <div className="row mb-3 align-items-center">
                {/* حقل اختيار الكلية */}
                <div className="col-12 col-lg-5 mb-2 mb-lg-0">
                    <Select
                        placeholder="اختر الكلية للبدء..."
                        value={faculties.find(f => String(f.id) === String(selectedFaculty)) ? {
                            value: selectedFaculty,
                            label: faculties.find(f => String(f.id) === String(selectedFaculty))?.name
                        } : null}
                        onChange={(selected) => setSelectedFaculty(selected ? selected.value : "")}
                        options={faculties.map(f => ({ value: f.id, label: f.name }))}
                        isSearchable
                    />
                </div>

                {/* نوع التقرير */}
                <div className="col-12 col-lg-4 mb-2 mb-lg-0">
                    <Form.Select
                        value={reportTypeFilter}
                        onChange={(e) => setReportTypeFilter(e.target.value)}
                        className="fw-bold"
                    >
                        <option value="الخطة الدراسية">الخطة الدراسية</option>
                        <option value="الجدول الرئيسي">الجدول الرئيسي</option>
                        <option value="المقرارات الدراسية">المقرارات الدراسية</option>
                        <option value="أعضاء هيئة التدريس">أعضاء هيئة التدريس</option>
                    </Form.Select>
                </div>

                {/* زر إضافة توقيع جديد */}
                <div className="col-12 col-lg-3">
                    <Button
                        variant="primary"
                        onClick={() => handleOpenModal('add')}
                        className="w-100 text-nowrap fw-bold"
                        disabled={!selectedFaculty}
                        style={{ backgroundColor: '#2e7d32', borderColor: '#2e7d32' }}
                    >
                        + إضافة توقيع جديد
                    </Button>
                </div>
            </div>

            <Table responsive striped bordered hover className="mt-3">
                <thead>
                    <tr style={{ borderBottom: '2.5px solid var(--secondary)', whiteSpace: 'nowrap' }}>
                        <th style={{ width: "5%" }}>#</th>
                        <th style={{ width: "8%" }}>ترتيب</th>
                        <th style={{ width: "37%" }}>اسم التوقيع</th>
                        <th style={{ width: "40%" }}>اسم المسؤول</th>
                        <th style={{ width: "10%" }}>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    {signatures.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="text-center p-4 text-muted">
                                لا توجد توقيعات مضافة لهذه الكلية.
                            </td>
                        </tr>
                    ) : (
                        signatures.map((sig, index) => (
                            <tr 
                                key={sig.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                style={{ 
                                    opacity: draggedIndex === index ? 0.5 : 1,
                                    backgroundColor: draggedIndex === index ? "#f8f9fa" : "",
                                    borderBottom: '1px solid #eee',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <td className="fw-bold">{index + 1}</td>
                                <td>
                                    <div style={{ cursor: "grab", color: "#6c757d" }} title="اسحب لإعادة الترتيب">
                                        <FaGripLines size={18} />
                                    </div>
                                </td>
                                <td className="fw-bold" style={{ color: "#1b5e20" }}>{sig.signature_title}</td>
                                <td className="fw-bold">{sig.official_name}</td>
                                <td>
                                    <div className="d-flex justify-content-center align-items-center gap-3">
                                        <Button variant="link" size="sm" className="p-0" title="تعديل" onClick={() => handleOpenModal('edit', sig)}>
                                            <i className="bi bi-pencil-square action-btn-edit" style={{ fontSize: '18px' }}></i>
                                        </Button>
                                        <Button variant="link" size="sm" className="p-0" title="حذف" onClick={() => handleDelete(sig.id)}>
                                            <i className="bi bi-trash3-fill action-btn-delete" style={{ fontSize: '18px' }}></i>
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>

            {/* معاينة شريط التوقيعات المعتمدة كما تظهر في أسفل صفحة الجدول الرئيسي */}
            <div className="mt-5 pt-4 border-top">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                    <div>
                        <h4 className="fw-bold text-success mb-1 d-flex align-items-center gap-2">
                            <span>التوقيعات المحددة للكلية كاملة</span>
                        </h4>
                        <p className="text-muted small mb-0">
                            ترتيب ومسميات التوقيعات المعتمدة لكافة مسؤولي الكلية كما تظهر في نهاية الصفحات والتقارير
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            variant={!viewAllFaculties ? "success" : "outline-success"}
                            size="sm"
                            className="fw-bold px-3 d-flex align-items-center gap-2 shadow-sm"
                            onClick={() => setViewAllFaculties(false)}
                        >
                            <span>🏛️</span>
                            <span>الكلية المحددة ({faculties.find(f => String(f.id) === String(selectedFaculty))?.name || "المختارة"})</span>
                        </Button>
                        <Button
                            variant={viewAllFaculties ? "success" : "outline-success"}
                            size="sm"
                            className="fw-bold px-3 d-flex align-items-center gap-2 shadow-sm"
                            onClick={() => {
                                setViewAllFaculties(true);
                                fetchAllSignatures(reportTypeFilter);
                            }}
                        >
                            <FaBuilding />
                            <span>عرض توقيعات كل كلية على حدة ({faculties.length} كليات)</span>
                        </Button>
                    </div>
                </div>

                {!viewAllFaculties ? (
                    // عرض توقيعات الكلية المحددة
                    <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4" style={{ borderTop: '4px solid #2e7d32' }}>
                        <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
                            <span className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                                <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                                <span>{faculties.find(f => String(f.id) === String(selectedFaculty))?.name || "الكلية المحددة"}</span>
                            </span>
                            <Badge bg="success" className="px-3 py-2 fw-bold">
                                {signatures.length} توقيعات معتمدة
                            </Badge>
                        </div>
                        <div className="card-body p-3 bg-light">
                            {signatures.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    لا توجد توقيعات مضافة لهذه الكلية حتى الآن في ({reportTypeFilter}).
                                </div>
                            ) : (
                                <div 
                                    className="py-4 px-3 bg-white rounded-3 border d-flex justify-content-between align-items-start shadow-sm" 
                                    style={{ 
                                        borderColor: '#e2e8f0', 
                                        flexWrap: 'nowrap',
                                        overflowX: 'auto',
                                        gap: '14px'
                                    }}
                                >
                                    {signatures.map(sig => (
                                        <div 
                                            key={sig.id} 
                                            className="text-center flex-fill" 
                                            style={{ 
                                                minWidth: '110px', 
                                                padding: '0 6px'
                                            }}
                                        >
                                            <div 
                                                className="fw-bold text-success mb-2" 
                                                style={{ 
                                                    fontSize: '1.02rem', 
                                                    lineHeight: '1.4',
                                                    borderBottom: '1.5px dashed #86efac', 
                                                    paddingBottom: '8px',
                                                    minHeight: '48px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {sig.signature_title}
                                            </div>
                                            <div 
                                                className="fw-bold text-dark" 
                                                style={{ 
                                                    fontSize: '0.98rem',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {sig.official_name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // عرض توقيعات كل كلية في الجامعة
                    <div className="d-flex flex-column gap-4">
                        {loadingAllSignatures ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="success" />
                                <p className="mt-2 text-muted fw-bold">جاري تحميل توقيعات كافة الكليات...</p>
                            </div>
                        ) : (
                            faculties.map(fac => {
                                const facSigs = signaturesByFaculty[fac.id] || [];
                                return (
                                    <div key={fac.id} className="card shadow-sm border-0 rounded-4 overflow-hidden" style={{ borderTop: '4px solid #2e7d32' }}>
                                        <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
                                            <div className="d-flex align-items-center gap-2">
                                                <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                                                <span className="fw-bold text-dark fs-6">{fac.name}</span>
                                            </div>
                                            <Badge bg={facSigs.length > 0 ? "success" : "secondary"} className="px-3 py-2 fw-bold">
                                                {facSigs.length > 0 ? `${facSigs.length} توقيعات معتمدة` : 'لا توجد توقيعات'}
                                            </Badge>
                                        </div>
                                        <div className="card-body p-3 bg-light">
                                            {facSigs.length === 0 ? (
                                                <div className="text-center py-3 text-muted small">
                                                    لا توجد توقيعات معتمدة لهذه الكلية في ({reportTypeFilter}).
                                                </div>
                                            ) : (
                                                <div 
                                                    className="py-4 px-3 bg-white rounded-3 border d-flex justify-content-between align-items-start shadow-sm" 
                                                    style={{ 
                                                        borderColor: '#e2e8f0', 
                                                        flexWrap: 'nowrap',
                                                        overflowX: 'auto',
                                                        gap: '14px'
                                                    }}
                                                >
                                                    {facSigs.map(sig => (
                                                        <div 
                                                            key={sig.id} 
                                                            className="text-center flex-fill" 
                                                            style={{ 
                                                                minWidth: '110px', 
                                                                padding: '0 6px'
                                                            }}
                                                        >
                                                            <div 
                                                                className="fw-bold text-success mb-2" 
                                                                style={{ 
                                                                    fontSize: '1.02rem', 
                                                                    lineHeight: '1.4',
                                                                    borderBottom: '1.5px dashed #86efac', 
                                                                    paddingBottom: '8px',
                                                                    minHeight: '48px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                {sig.signature_title}
                                                            </div>
                                                            <div 
                                                                className="fw-bold text-dark" 
                                                                style={{ 
                                                                    fontSize: '0.98rem',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {sig.official_name}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} dir="rtl" enforceFocus={false} size="lg">
                <Modal.Header closeButton closeVariant="white" style={{ backgroundColor: modalMode === 'add' ? "#198754" : "#0d6efd" }}>
                    <Modal.Title className="fw-bold fs-5 text-white">
                        {modalMode === 'add' ? "إضافة توقيع جديد" : "تعديل التوقيع"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">اسم التوقيع (مثال: عميد الكلية)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="أدخل اسم التوقيع"
                                value={formData.signature_title}
                                onChange={(e) => setFormData({ ...formData, signature_title: e.target.value })}
                                isInvalid={!!formErrors.signature_title}
                            />
                            <Form.Control.Feedback type="invalid">{formErrors.signature_title}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">اسم المسؤول (مثال: أ.د / أحمد محمد)</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="أدخل اسم المسؤول"
                                value={formData.official_name}
                                onChange={(e) => setFormData({ ...formData, official_name: e.target.value })}
                                isInvalid={!!formErrors.official_name}
                            />
                            <Form.Control.Feedback type="invalid">{formErrors.official_name}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">الصفحات المعروض بها (يمكن اختيار أكثر من صفحة)</Form.Label>
                            <div className="d-flex flex-wrap gap-3 mt-2">
                                {[
                                    "الخطة الدراسية",
                                    "الجدول الرئيسي",
                                    "المقرارات الدراسية",
                                    "أعضاء هيئة التدريس"
                                ].map((page) => (
                                    <Form.Check 
                                        key={page}
                                        type="checkbox"
                                        label={page}
                                        checked={formData.report_type && formData.report_type.includes(page)}
                                        onChange={(e) => {
                                            let selectedPages = formData.report_type ? formData.report_type.split(',').map(s => s.trim()).filter(Boolean) : [];
                                            if (e.target.checked) {
                                                if (!selectedPages.includes(page)) selectedPages.push(page);
                                            } else {
                                                selectedPages = selectedPages.filter(p => p !== page);
                                            }
                                            setFormData({ ...formData, report_type: selectedPages.join(',') });
                                        }}
                                    />
                                ))}
                            </div>
                            {formErrors.report_type && <span className="text-danger small">{formErrors.report_type}</span>}
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>إغلاق</Button>
                    <Button variant={modalMode === 'add' ? "success" : "primary"} onClick={handleSave}>
                        حفظ التوقيع
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default SignaturesPage;
