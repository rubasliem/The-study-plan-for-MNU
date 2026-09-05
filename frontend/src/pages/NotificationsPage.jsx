import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Container, Card, Table, Button, Spinner, Form, Badge } from 'react-bootstrap';
import { FaTrash, FaBell, FaFilter, FaCheckCircle, FaPrint, FaFileExcel } from 'react-icons/fa';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import logo from '../assets/logo.png';
import { confirmAction } from '../utils/confirmAlert';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [filterYear, setFilterYear] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterPage, setFilterPage] = useState('');
    const [academicYearsList, setAcademicYearsList] = useState([]);

    const API = "http://localhost:8000";

    // جلب جميع الأعوام الجامعية المسجلة بالنظام مع دمج الأعوام الموجودة في الإشعارات
    const academicYears = Array.from(new Set([
        ...(academicYearsList.length > 0 ? academicYearsList : ["2024/2025", "2025/2026", "2026/2027", "2027/2028"]),
        ...notifications.map(n => n.academic_year).filter(Boolean)
    ])).sort((a, b) => b.localeCompare(a));

    const semesters = [
        'الفصل الدراسي الأول',
        'الفصل الدراسي الثاني',
        'الفصل الدراسي الصيفي',
    ];

    const pagesList = [
        'أعضاء هيئة التدريس',
        'المقررات الدراسية',
        'الخطة الدراسية',
        'إضافة مستخدم وصلاحيات',
        'استرجاع المحذوف'
    ];

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const notifRes = await axios.get(`${API}/api/notifications`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            const groupedMap = new Map();
            notifRes.data.forEach(n => {
                const timeKey = (n.created_at && typeof n.created_at === 'string') ? n.created_at.substring(0, 16) : ''; 
                const key = `${n.action_text}_${n.action_by}_${timeKey}`;
                if (groupedMap.has(key)) {
                    const group = groupedMap.get(key);
                    group.ids.push(n.id);
                    if (n.faculty && !group.facultyNames.includes(n.faculty.name)) {
                        group.facultyNames.push(n.faculty.name);
                    }
                    if (n.faculty_id && !group.facultyIds.includes(n.faculty_id)) {
                        group.facultyIds.push(n.faculty_id);
                    }
                } else {
                    groupedMap.set(key, {
                        ...n,
                        ids: [n.id],
                        facultyNames: n.faculty ? [n.faculty.name] : [],
                        facultyIds: n.faculty_id ? [n.faculty_id] : []
                    });
                }
            });
            
            const groupedArray = Array.from(groupedMap.values()).map(g => {
                g.group_id = g.ids.join(',');
                return g;
            });
            setNotifications(groupedArray);

            const [facRes, yearsRes] = await Promise.all([
                axios.get(`${API}/api/faculties`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API}/api/academic-years`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }).catch(() => ({ data: [] }))
            ]);
            
            setFaculties(facRes.data);
            if (Array.isArray(yearsRes.data) && yearsRes.data.length > 0) {
                const yList = yearsRes.data.map(y => (typeof y === 'string' ? y : (y.name || y.year || ''))).filter(Boolean);
                if (yList.length > 0) {
                    setAcademicYearsList(yList);
                }
            }
        } catch (error) {
            console.error("Error fetching data", error);
            toast.error("فشل في جلب البيانات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleDelete = async (group_id) => {
        if (!(await confirmAction("هل أنت متأكد من حذف هذا الإشعار؟"))) return;
        try {
            const idArray = String(group_id).split(',');
            for (let id of idArray) {
                await axios.delete(`${API}/api/notifications/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            }
            toast.success("تم حذف الإشعار بنجاح");
            fetchNotifications();
        } catch (error) {
            console.error("Error deleting notification", error);
            toast.error("فشل في حذف الإشعار");
        }
    };

    const handleBulkDelete = async () => {
        if (!(await confirmAction("هل أنت متأكد من حذف جميع الإشعارات المحددة؟"))) return;
        try {
            for (let group_id of selectedIds) {
                const idArray = String(group_id).split(',');
                for (let id of idArray) {
                    await axios.delete(`${API}/api/notifications/${id}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                }
            }
            toast.success("تم الحذف بنجاح");
            setSelectedIds([]);
            fetchNotifications();
        } catch (error) {
            console.error("Error deleting notifications", error);
            toast.error("حدث خطأ أثناء الحذف");
        }
    };

    const canDelete = user?.role === 'admin' || user?.role === 'faculty_professor' || ((user?.role === 'faculty_admin' || user?.role === 'student_affairs') && user?.perm_delete_notif_btn);

    const exportToExcel = async () => {
        if (filteredNotifications.length === 0) {
            toast.error("لا توجد بيانات للتصدير");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('الإشعارات', { views: [{ rightToLeft: true }] });

        // Add Logo
        try {
            const response = await fetch(logo);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const logoImageId = workbook.addImage({
                buffer: arrayBuffer,
                extension: 'png',
            });
            worksheet.addImage(logoImageId, {
                tl: { col: 0.6, row: 0.1 },
                ext: { width: 80, height: 80 }
            });
        } catch (e) {
            console.error('Failed to load logo for excel', e);
        }

        // Add Title
        worksheet.mergeCells('B2:E3');
        const titleCell = worksheet.getCell('B2');
        titleCell.value = 'سجل الإشعارات - جامعة المنوفية الأهلية';
        titleCell.font = { name: 'Arial', size: 16, bold: true };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

        // Start table at row 6
        const headerRowIndex = 6;
        
        // Define Columns
        worksheet.columns = [
            { key: 'faculty', width: 30 },
            { key: 'year', width: 15 },
            { key: 'semester', width: 20 },
            { key: 'by', width: 25 },
            { key: 'event', width: 70 },
            { key: 'datetime', width: 25 }
        ];

        // Style Header Row
        const headerRow = worksheet.getRow(headerRowIndex);
        headerRow.values = ['الكلية', 'العام الجامعي', 'الفصل الدراسي', 'بواسطة', 'الحدث', 'التاريخ والوقت'];
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;
        
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

        // Freeze Header Row
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: headerRowIndex, rightToLeft: true }
        ];

        // Add Data
        filteredNotifications.forEach(notif => {
            let dateStr = notif.created_at;
            try {
                const d = new Date(notif.created_at.endsWith('Z') ? notif.created_at : notif.created_at + 'Z');
                if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-US');
                }
            } catch (e) {}
            
            let text = notif.action_by ? notif.action_by.replace(/@gmail\.com/gi, '') : '';
            const match = text.match(/(.+?)\s*\((.+?)\)/);
            const username = match ? match[1].trim() : text.trim();

            const row = worksheet.addRow({
                faculty: notif.facultyNames && notif.facultyNames.length > 0 ? notif.facultyNames.join('، ') : "غير محدد",
                year: notif.academic_year || '—',
                semester: notif.semester || '—',
                by: username,
                event: notif.action_text || '',
                datetime: dateStr
            });

            row.eachCell((cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Save
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), "سجل_الإشعارات.xlsx");
    };

    const filteredNotifications = notifications.filter(n => {
        // فلتر الكلية: يتحقق من وجود الكلية في كل الكليات المرتبطة بالمجموعة
        if (searchTerm) {
            const allFacIds = (n.facultyIds && n.facultyIds.length > 0)
                ? n.facultyIds
                : (n.faculty_id ? [n.faculty_id] : []);
            if (!allFacIds.some(fid => String(fid) === String(searchTerm))) return false;
        }
        if (filterYear && n.academic_year && n.academic_year !== filterYear) return false;
        if (filterSemester && n.semester && n.semester !== filterSemester) return false;
        
        if (filterPage) {
            const text = n.action_text || '';
            if (filterPage === 'أعضاء هيئة التدريس' && !text.includes('هيئة التدريس') && !text.includes('عضو')) return false;
            if (filterPage === 'المقررات الدراسية' && !text.includes('مقرر')) return false;
            if (filterPage === 'الخطة الدراسية' && !text.includes('الخطة')) return false;
            if (filterPage === 'إضافة مستخدم وصلاحيات' && !text.includes('مستخدم') && !text.includes('صلاحية')) return false;
            if (filterPage === 'توقيعات المسؤولين' && !text.includes('توقيع')) return false;
            if (filterPage === 'استرجاع المحذوف' && !text.includes('سلة المحذوفات') && !text.includes('استرجاع عنصر')) return false;
        }

        return true;
    });


    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredNotifications.map(n => n.group_id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (group_id) => {
        if (selectedIds.includes(group_id)) {
            setSelectedIds(selectedIds.filter(i => i !== group_id));
        } else {
            setSelectedIds([...selectedIds, group_id]);
        }
    };

    const renderActionText = (text, actionBy) => {
        if (!text) return '';
        text = text.replace(/@gmail\.com/gi, '');

        let mainText = text;
        let role = '';
        
        // البحث عن جزء " من " في نهاية النص لاستخراج الوظيفة وحذف الاسم
        const authorMatch = text.match(/\s+من\s+(.+?)\s*\((.+?)\)$/);
        if (authorMatch) {
            mainText = text.substring(0, authorMatch.index);
            role = authorMatch[1].trim();
        } else {
            const altMatch = text.match(/\s+من\s+(.+)$/);
            if (altMatch) {
                mainText = text.substring(0, altMatch.index);
                role = altMatch[1].replace(/[()]/g, '').trim();
            }
        }

        // إذا لم توجد كلمة "من" في النص (مثل حدث الاعتماد)، نقرأ الوظيفة من actionBy
        if (!role && actionBy) {
            let cleanActionBy = actionBy.replace(/@gmail\.com/gi, '').replace('عضو هيئة تدريس', 'مدير برنامج');
            const byMatch = cleanActionBy.match(/(.+?)\s*\((.+?)\)/);
            if (byMatch) {
                role = byMatch[2].trim();
            } else {
                // تعويض للملفات القديمة التي سُجلت بدون المسمى الوظيفي
                if (cleanActionBy.includes('Soliman_Zahran')) role = 'مدير شؤون الطلاب';
                else if (cleanActionBy.includes('Ruba_Sliem')) role = 'مدير عام';
                else if (cleanActionBy.includes('Waael_Shaaban') || cleanActionBy.includes('Ahmed_Habeeb')) role = 'مسؤول كلية';
                else if (cleanActionBy.includes('rubaDR')) role = 'مدير برنامج';
            }
        }

        // إذا تم استخراج الوظيفة، نقوم بتعديل بداية النص
        if (role) {
            if (mainText.startsWith('تم الغاء اعتماد') || mainText.startsWith('تم إلغاء اعتماد')) {
                mainText = mainText.replace(/تم الغاء اعتماد|تم إلغاء اعتماد/, `قام بإلغاء اعتماد`);
            } else if (mainText.startsWith('تم اعتماد')) {
                mainText = mainText.replace('تم اعتماد', `قام باعتماد`);
            } else if (mainText.startsWith('تم الغاء إنهاء') || mainText.startsWith('تم إلغاء إنهاء')) {
                mainText = mainText.replace(/تم الغاء إنهاء|تم إلغاء إنهاء/, `قام بإلغاء إنهاء`);
            } else if (mainText.startsWith('تم إنهاء')) {
                mainText = mainText.replace('تم إنهاء', `قام بإنهاء`);
            } else if (mainText.startsWith('تم المراجعة')) {
                mainText = mainText.replace('تم المراجعة', `قام بإجراء المراجعة`);
            } else if (mainText.startsWith('تم الغاء المراجعة') || mainText.startsWith('تم إلغاء المراجعة')) {
                mainText = mainText.replace(/تم الغاء المراجعة|تم إلغاء المراجعة/, `قام بإلغاء المراجعة`);
            } else if (mainText.startsWith('تم ')) {
                mainText = mainText.replace('تم ', `قام بـ `);
            }
        }

        const parts = mainText.split(/(مدير شؤون الطلاب|مدير عام|مسؤول كلية|مدير برنامج|حذف|مسح|تعديل|حفظ|إضافة مستخدم جديد|اضافة مستخدم جديد|إضافة|إضافه|طباعة|تنزيل|رؤية|استرجاع|تفعيل صلاحية|الغاء صلاحية|إلغاء صلاحية|الغاء المراجعة الاولى|إلغاء المراجعة الاولى|الغاء المراجعة الأولى|إلغاء المراجعة الأولى|الغاء المراجعة الثانية|إلغاء المراجعة الثانية|الغاء إنهاء الخطة|إلغاء إنهاء الخطة|الغاء اعتماد|إلغاء اعتماد|الغاء|إلغاء|المراجعة الأولى|المراجعة الثانية|إنهاء الخطة|إنهاء|اعتماد الخطة الدراسية|اعتماد)/g);
        
        return parts.map((part, index) => {
            if (['مدير شؤون الطلاب', 'مدير عام', 'مسؤول كلية', 'مدير برنامج'].includes(part)) {
                return <span key={index} className="fw-bold text-dark">{part}</span>;
            }
            const redKeywords = ['حذف', 'مسح', 'الغاء', 'إلغاء', 'الغاء اعتماد', 'إلغاء اعتماد', 'الغاء المراجعة الاولى', 'إلغاء المراجعة الاولى', 'الغاء المراجعة الأولى', 'إلغاء المراجعة الأولى', 'الغاء المراجعة الثانية', 'إلغاء المراجعة الثانية', 'الغاء إنهاء الخطة', 'إلغاء إنهاء الخطة', 'الغاء صلاحية', 'إلغاء صلاحية'];
            if (redKeywords.includes(part)) {
                return <span key={index} className="text-danger fw-bold">{part}</span>;
            }
            if (['تفعيل صلاحية', 'إضافة مستخدم جديد', 'اضافة مستخدم جديد'].includes(part)) {
                return <span key={index} className="fw-bold">{part}</span>;
            }
            if (part === 'تعديل' || part === 'حفظ') {
                return <span key={index} className="fw-bold" style={{ color: '#cf8128ff' }}>{part}</span>;
            }
            if (part === 'إضافة' || part === 'إضافه' || part === 'استرجاع') {
                return <span key={index} className="text-success fw-bold">{part}</span>;
            }
            if (part === 'طباعة' || part === 'تنزيل' || part === 'رؤية' || part === 'المراجعة الأولى' || part === 'المراجعة الثانية' || part === 'إنهاء الخطة' || part === 'إنهاء') {
                return <span key={index} className="text-primary fw-bold">{part}</span>;
            }
            if (part === 'اعتماد' || part === 'اعتماد الخطة الدراسية') {
                return <span key={index} className="text-success fw-bold">{part} <FaCheckCircle className="me-1" /></span>;
            }
            return part;
        });
    };

    const hasActiveFilters = searchTerm || filterYear || filterSemester || filterPage;

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
                <h2 className="d-flex align-items-center gap-3 m-0" style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    <FaBell className="text-success" style={{ marginLeft: '15px' }} /> الإشعارات
                    {filteredNotifications.length > 0 && (
                        <Badge bg="secondary" className="fs-6 ms-2">
                            {filteredNotifications.length} إشعار
                        </Badge>
                    )}
                </h2>
                <div className="d-flex align-items-center gap-3">
                    {canDelete && selectedIds.length > 0 && (
                        <Button variant="danger" onClick={handleBulkDelete}>
                            <FaTrash className="me-2" />
                            حذف المحدد({selectedIds.length})
                        </Button>
                    )}
                    {filteredNotifications.length > 0 && (
                        <div className="d-flex gap-2">
                            <Button variant="success" className="text-white fw-bold d-flex align-items-center gap-2" onClick={exportToExcel}>
                                <FaFileExcel /> Excel
                            </Button>
                            <Button variant="info" className="text-white fw-bold d-flex align-items-center gap-2" onClick={() => window.print()}>
                                <FaPrint /> طباعة
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            <Card className="shadow-sm border-0" style={{ borderRadius: '15px' }}>
                <Card.Body className="p-4">
                    {/* Print Only Title */}
                    <div className="d-none d-print-block mb-4 text-center">
                        <h3 className="fw-bold mb-3" style={{ color: '#2e7d32' }}>تقرير الإشعارات</h3>
                        <div className="text-muted d-flex justify-content-center gap-3" style={{ fontSize: '1.1rem' }}>
                            {searchTerm ? <span>{faculties.find(f => String(f.id) === String(searchTerm))?.name || searchTerm}</span> : <span>جميع الكليات</span>}
                            {filterYear && <span>| العام الجامعي: {filterYear}</span>}
                            {filterSemester && <span>| الفصل الدراسي: {filterSemester}</span>}
                            {filterPage && <span>| الصفحة: {filterPage}</span>}
                        </div>
                    </div>

                    {/* فلاتر البحث */}
                    <div className="d-flex flex-wrap gap-3 align-items-center mb-4 d-print-none">
                        <div className="d-flex align-items-center gap-2">
                            <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>الكلية:</label>
                            <Form.Select
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: 'auto', minWidth: '350px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                <option value="">جميع الكليات</option>
                                {faculties.map(fac => (
                                    <option key={fac.id} value={fac.id}>{fac.name}</option>
                                ))}

                            </Form.Select>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>العام الجامعي:</label>
                            <Form.Select
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                style={{ width: '160px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                <option value="">جميع الأعوام</option>
                                {academicYears.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}

                            </Form.Select>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>الفصل الدراسي:</label>
                            <Form.Select
                                value={filterSemester}
                                onChange={(e) => setFilterSemester(e.target.value)}
                                style={{ width: '220px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                <option value="">كل الفصول الدراسية</option>
                                {semesters.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}

                            </Form.Select>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <label style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap' }}>الصفحة:</label>
                            <Form.Select
                                value={filterPage}
                                onChange={(e) => setFilterPage(e.target.value)}
                                style={{ width: '240px', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                <option value="">كل الصفحات</option>
                                {pagesList.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}

                            </Form.Select>
                        </div>


                        {hasActiveFilters && (
                            <Button
                                variant="outline-secondary rounded px-3"
                                size="sm"
                                onClick={() => { setSearchTerm(''); setFilterYear(''); setFilterSemester(''); setFilterPage(''); }}
                                style={{height: '35px'}}
                            >
                                إزالة الفلاتر
                            </Button>
                        )}


                    </div>


                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            لا توجد إشعارات حالياً
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="align-middle" style={{ minWidth: '900px' }}>
                                <thead className="table-light">
                                    <tr>
                                        {canDelete && (
                                            <th className="d-print-none" style={{ width: '40px' }}>
                                                <Form.Check 
                                                    type="checkbox"
                                                    onChange={handleSelectAll}
                                                    checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
                                                />
                                            </th>
                                        )}
                                        <th>الكلية</th>
                                        <th >العام الجامعي<br /> الفصل الدراسي</th>
                                        <th>بواسطة</th>
                                        <th>الحدث</th>
                                        <th>التاريخ والوقت</th>
                                        {canDelete && <th className="text-center d-print-none">إجراءات</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredNotifications.map((notif) => (
                                        <tr key={notif.group_id}>
                                            {canDelete && (
                                                <td className="d-print-none">
                                                    <Form.Check 
                                                        type="checkbox"
                                                        checked={selectedIds.includes(notif.group_id)}
                                                        onChange={() => handleSelect(notif.group_id)}
                                                    />
                                                </td>
                                            )}
                                            <td>
                                                <div className="fw-medium text-primary d-flex flex-column gap-1">
                                                    {notif.facultyNames && notif.facultyNames.length > 0 ? (
                                                        notif.facultyNames.map((name, idx) => <span key={idx}>{name}</span>)
                                                    ) : "غير محدد"}
                                                </div>
                                            </td>
                                            <td>
                                                {notif.academic_year || notif.semester ? (
                                                    <div className="d-flex flex-column gap-1 align-items-center">
                                                        {notif.academic_year && <Badge bg="success" style={{ fontSize: '13px' }}>{notif.academic_year}</Badge>}
                                                        {notif.semester && <small className="text-muted" style={{ whiteSpace: 'nowrap' }}>{notif.semester}</small>}
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <span className="text-muted small">—</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {(() => {
                                                    let text = notif.action_by ? notif.action_by.replace(/@gmail\.com/gi, '') : '';
                                                    let role = '';
                                                    let username = text.trim();
                                                    
                                                    const match = text.match(/(.+?)\s*\((.+?)\)/);
                                                    if (match) {
                                                        username = match[1].trim();
                                                        role = match[2].trim();
                                                    } else {
                                                        const textRoleMatch = notif.action_text?.match(/\s+من\s+.+?\s*\((.+?)\)$/);
                                                        if (textRoleMatch) {
                                                            role = textRoleMatch[1].trim();
                                                        } else {
                                                            if (username.includes('Soliman_Zahran') || username.includes('Shimaa_Elsab3')) role = 'مدير شؤون الطلاب';
                                                            else if (username.includes('Ruba_Sliem')) role = 'مدير عام';
                                                            else if (username.includes('Waael_Shaaban') || username.includes('Ahmed_Habeeb') || username.includes('mohamedHandsa') || username.includes('Elshimaa_Ramzy') || username.includes('Haytham_Gaber')) role = 'مسؤول كلية';
                                                            else if (username.includes('rubaDR')) role = 'مدير برنامج';
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <div className="text-center d-flex flex-column align-items-center gap-1">
                                                            <span className="fw-bold text-dark">{username}</span>
                                                            {role && <span className="fw-bold" style={{ fontSize: '12.5px', color: '#6c757d' }}>{role}</span>}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td>{renderActionText(notif.action_text, notif.action_by)}</td>
                                            <td>
                                                <small className="text-muted">
                                                    {(() => {
                                                        if (!notif.created_at || typeof notif.created_at !== 'string') return '';
                                                        try {
                                                            const d = new Date(notif.created_at.endsWith('Z') ? notif.created_at : notif.created_at + 'Z');
                                                            if (isNaN(d.getTime())) return notif.created_at;
                                                            return (
                                                                <div dir="ltr" className="text-end">
                                                                    <div>{d.toLocaleTimeString('en-US')}</div>
                                                                    <div>{d.toLocaleDateString('en-GB')}</div>
                                                                </div>
                                                            );
                                                        } catch (e) {
                                                            return notif.created_at || '';
                                                        }
                                                    })()}
                                                </small>
                                            </td>
                                            {canDelete && (
                                                <td className="text-center d-print-none">
                                                    <Button 
                                                        variant="light" 
                                                        className="text-danger p-2 rounded-circle"
                                                        onClick={() => handleDelete(notif.group_id)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </td>
                                            )}
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

export default NotificationsPage;
