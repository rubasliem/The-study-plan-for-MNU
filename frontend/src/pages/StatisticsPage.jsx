import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { FaChartBar, FaUserTie, FaBookOpen, FaExclamationTriangle } from 'react-icons/fa';
import Select from 'react-select';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const API = "";

const StatisticsPage = () => {
    const [faculties, setFaculties] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState("");
    const [selectedYear, setSelectedYear] = useState(() => localStorage.getItem('mnu_default_academic_year') || "2026/2027");
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [academicYearOptions, setAcademicYearOptions] = useState([]);

    // Custom interactive popup state for assigned professors by semester
    const [activeSemesterPopup, setActiveSemesterPopup] = useState(null);
    const [pinnedSemester, setPinnedSemester] = useState(null);
    const [popupCoordX, setPopupCoordX] = useState(null);
    const isHoveringPopupRef = useRef(false);
    const closeTimeoutRef = useRef(null);

    // Custom interactive popup state for courses per program
    const [activeProgramPopup, setActiveProgramPopup] = useState(null);
    const [pinnedProgram, setPinnedProgram] = useState(null);
    const [programPopupCoordX, setProgramPopupCoordX] = useState(null);
    const isHoveringProgramPopupRef = useRef(false);
    const closeProgramTimeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
            if (closeProgramTimeoutRef.current) clearTimeout(closeProgramTimeoutRef.current);
        };
    }, []);

    // Fetch faculties and academic years on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [facRes, yearsRes] = await Promise.all([
                    axios.get(`${API}/api/faculties`),
                    axios.get(`${API}/api/academic-years`)
                ]);
                setFaculties(facRes.data);
                if (facRes.data.length > 0) {
                    setSelectedFaculty(facRes.data[0].id);
                }
                
                const years = yearsRes.data.map(y => ({ value: y.name, label: y.name }));
                setAcademicYearOptions(years);
                if (years.length > 0) {
                    const savedDefault = localStorage.getItem('mnu_default_academic_year');
                    const matchedDefault = savedDefault && years.find(y => y.value === savedDefault);
                    setSelectedYear(matchedDefault ? savedDefault : years[0].value);
                }
            } catch (err) {
                console.error("Error fetching initial data", err);
            }
        };
        fetchInitialData();
    }, []);

    // Fetch statistics when a faculty or academic year is selected
    useEffect(() => {
        if (!selectedFaculty || !selectedYear) return;
        const fetchStats = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`${API}/api/statistics/${selectedFaculty}`, {
                    params: selectedYear ? { academic_year: selectedYear, _t: Date.now() } : { _t: Date.now() }
                });
                setStats(res.data);
            } catch (err) {
                console.error("Error fetching statistics", err);
                setError("حدث خطأ أثناء جلب الإحصائيات. يرجى المحاولة مرة أخرى.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [selectedFaculty, selectedYear]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
    const isMedicine = String(selectedFaculty) === "10" || faculties.find(f => String(f.id) === String(selectedFaculty))?.name?.includes("الطب والجراحة");

    const cleanCourseStr = (s) => (s || "")
        .normalize('NFKC')
        .replace(/[-\s*()_]+/g, '')
        .replace(/ی/g, 'ي')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .toLowerCase();

    // Build a map of courses across all programs to detect cross-program occurrences
    const courseProgramsMap = useMemo(() => {
        const map = {};
        if (!stats?.programs_stats) return map;
        stats.programs_stats.forEach(prog => {
            if (!prog.courses) return;
            prog.courses.forEach(c => {
                const match = typeof c === 'string' ? c.match(/^(.*?)\s*\((.*?)\)$/) : null;
                const cName = match ? match[1].trim() : (typeof c === 'string' ? c.trim() : c);
                const clean = cleanCourseStr(cName);
                if (!map[clean]) {
                    map[clean] = { name: cName, programs: new Set() };
                }
                if (prog.name) {
                    map[clean].programs.add(prog.name);
                }
            });
        });
        return map;
    }, [stats?.programs_stats]);

    const getRepeatedCourseInfo = (name) => {
        if (!name) return null;
        const cleanTarget = cleanCourseStr(name);
        const backendMatch = stats?.repeated_courses?.find(rc => 
            rc.course_name === name || cleanCourseStr(rc.course_name) === cleanTarget
        );
        const progGroup = courseProgramsMap[cleanTarget];
        
        const programsList = Array.from(new Set([
            ...(backendMatch?.programs || []),
            ...(progGroup && progGroup.programs.size > 1 ? Array.from(progGroup.programs) : [])
        ]));

        if (backendMatch || programsList.length > 1) {
            return {
                course_name: backendMatch?.course_name || (progGroup ? progGroup.name : name),
                programs: programsList,
                semesters: backendMatch?.semesters || [],
                note: backendMatch?.note || (programsList.length > 1 ? `مكرر بين البرامج (${programsList.join(' و ')})` : '')
            };
        }
        return null;
    };

    const allRepeatedCoursesList = useMemo(() => {
        const list = [];
        const seen = new Set();

        if (stats?.repeated_courses) {
            stats.repeated_courses.forEach(rc => {
                const clean = cleanCourseStr(rc.course_name);
                seen.add(clean);
                const progGroup = courseProgramsMap[clean];
                const progs = Array.from(new Set([
                    ...(rc.programs || []),
                    ...(progGroup ? Array.from(progGroup.programs) : [])
                ]));
                list.push({
                    ...rc,
                    programs: progs
                });
            });
        }

        Object.entries(courseProgramsMap).forEach(([clean, data]) => {
            if (data.programs.size > 1 && !seen.has(clean)) {
                seen.add(clean);
                const progs = Array.from(data.programs);
                list.push({
                    course_name: data.name,
                    programs: progs,
                    semesters: [],
                    note: `مكرر بين البرامج (${progs.join(' و ')})`
                });
            }
        });

        return list;
    }, [stats?.repeated_courses, courseProgramsMap]);

    return (
        <div className="container-fluid py-4" dir="rtl">
            <div className="mb-4">
                <h2 style={{ margin: 0, fontWeight: 'bold', color: '#2e7d32', fontSize: '2rem' }} className="d-flex align-items-center mb-1">
                    <FaChartBar className="text-success" style={{ marginLeft: '15px' }} /> إحصائيات الكلية
                </h2>
                <p className="text-muted mt-2" style={{ fontSize: '1.1rem' }}>
                    احصائيات الكلية للعام الجامعي في جميع الفصول الدراسية 
                </p>
            </div>

            {/* Faculty & Academic Year Selector */}
            <Card className="shadow-sm mb-4 border-0">
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={6} className="mb-3 mb-md-0">
                            <div className="form-group">
                                <label className="fw-bold text-success fs-5 mb-2">الكلية</label>
                                <Select
                                    placeholder="اختر الكلية..."
                                    value={faculties.map(f => ({ value: f.id, label: f.name })).find(o => o.value === selectedFaculty)}
                                    onChange={(selected) => setSelectedFaculty(selected ? selected.value : "")}
                                    options={faculties.map(f => ({ value: f.id, label: f.name }))}
                                    isSearchable
                                />
                            </div>
                        </Col>
                        <Col md={6}>
                            <div className="form-group">
                                <label className="fw-bold text-success fs-5 mb-2">العام الجامعي</label>
                                <Select
                                    placeholder="اختر العام الجامعي..."
                                    value={academicYearOptions.find(o => o.value === selectedYear)}
                                    onChange={(selected) => setSelectedYear(selected ? selected.value : "")}
                                    options={academicYearOptions}
                                    isSearchable
                                />
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="success" />
                    <p className="mt-3 fw-bold text-success">جاري تحميل الإحصائيات...</p>
                </div>
            ) : error ? (
                <Alert variant="danger" className="fw-bold text-center">{error}</Alert>
            ) : stats ? (
                <>
                    {/* Summary Cards */}
                    <Row className="mb-4">
                        <Col md={isMedicine ? 3 : 4} className="mb-3">
                            <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #1b5e20" }}>
                                <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                                    <div className="bg-light rounded-circle ms-2 d-flex align-items-center justify-content-center" style={{ width: "52px", height: "52px", flexShrink: 0 }}>
                                        <FaUserTie size={26} className="text-success" />
                                    </div>
                                    <div>
                                        <h5 className="text-muted fw-bold mb-1" style={{ whiteSpace: "nowrap", fontSize: "1.12rem" }}>إجمالي أعضاء هيئة التدريس</h5>
                                        <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.85rem" }}>{stats.total_professors}</h3>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        
                        {isMedicine ? (
                            <>
                                <Col md={3} className="mb-3">
                                    <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #0d6efd" }}>
                                        <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                                            <div className="bg-light rounded-circle ms-2 d-flex align-items-center justify-content-center" style={{ width: "52px", height: "52px", flexShrink: 0 }}>
                                                <FaBookOpen size={26} className="text-primary" />
                                            </div>
                                            <div>
                                                <h5 className="text-muted fw-bold mb-1" style={{ whiteSpace: "nowrap", fontSize: "1.12rem" }}>إجمالي المقررات الطولية</h5>
                                                <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.85rem" }}>
                                                    {stats.programs_stats.find(p => p.name === "المقررات الطولية")?.course_count || 0}
                                                </h3>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3} className="mb-3">
                                    <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #fd7e14" }}>
                                        <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                                            <div className="bg-light rounded-circle ms-2 d-flex align-items-center justify-content-center" style={{ width: "52px", height: "52px", flexShrink: 0 }}>
                                                <FaBookOpen size={26} className="text-warning" />
                                            </div>
                                            <div>
                                                <h5 className="text-muted fw-bold mb-1" style={{ whiteSpace: "nowrap", fontSize: "1.12rem" }}>إجمالي الحزم الدراسية</h5>
                                                <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.85rem" }}>
                                                    {stats.programs_stats.find(p => p.name === "الحزم الدراسية")?.course_count || 0}
                                                </h3>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </>
                        ) : (
                            <Col md={4} className="mb-3">
                                <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #0d6efd" }}>
                                    <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                                        <div className="bg-light rounded-circle ms-2 d-flex align-items-center justify-content-center" style={{ width: "52px", height: "52px", flexShrink: 0 }}>
                                            <FaBookOpen size={26} className="text-primary" />
                                        </div>
                                        <div>
                                            <h5 className="text-muted fw-bold mb-1" style={{ whiteSpace: "nowrap", fontSize: "1.12rem" }}>إجمالي البرامج</h5>
                                            <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.85rem" }}>{stats.programs_stats.length}</h3>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}
                        
                        <Col md={isMedicine ? 3 : 4} className="mb-3">
                            <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #ffc107" }}>
                                <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                                    <div className="bg-light rounded-circle ms-2 d-flex align-items-center justify-content-center" style={{ width: "52px", height: "52px", flexShrink: 0 }}>
                                        <FaChartBar size={26} className="text-warning" />
                                    </div>
                                    <div>
                                        <h5 className="text-muted fw-bold mb-1" style={{ whiteSpace: "nowrap", fontSize: "1.12rem" }}>إجمالي المقررات</h5>
                                        <div className="d-flex align-items-baseline gap-2">
                                            <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: "1.85rem" }}>
                                                {stats.total_courses != null ? stats.total_courses : stats.courses_by_semester.reduce((acc, curr) => acc + curr.count, 0)}
                                            </h3>
                                            {allRepeatedCoursesList.length > 0 && (
                                                <span className="badge bg-warning text-dark px-2 py-1" style={{ fontSize: "0.75rem", fontWeight: "bold" }}>
                                                    {allRepeatedCoursesList.length} مكرر
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Repeated Courses Alert Banner */}
                    {allRepeatedCoursesList.length > 0 && (
                        <div className="alert alert-warning border-warning d-flex flex-column gap-2 mb-4 py-3 px-3 shadow-sm rounded-3">
                            <div className="d-flex align-items-center gap-2">
                                <FaExclamationTriangle className="text-warning fs-5 flex-shrink-0" />
                                <div>
                                    <strong className="text-dark fs-6">المقررات المشتركة والمكررة:</strong>
                                    <span className="text-muted ms-2" style={{ fontSize: '0.9rem' }}>
                                        (تم احتساب المقررات الفعلية للكلية بدون تكرار : <strong>{stats.total_courses}</strong> مقررات)
                                    </span>
                                </div>
                            </div>
                            <div className="d-flex flex-wrap gap-2 mt-1">
                                {allRepeatedCoursesList.map((rc, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-white p-2 px-3 rounded-3 border border-warning shadow-sm d-flex flex-wrap align-items-center gap-2"
                                        style={{ fontSize: '0.92rem' }}
                                    >
                                        <span className="fw-bold text-dark">{rc.course_name}</span>
                                        <span className="badge bg-warning text-dark px-2 py-1" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                            مكرر
                                        </span>
                                        {rc.programs && rc.programs.length > 0 && (
                                            <span 
                                                className="badge border px-2 py-1" 
                                                style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontSize: '11.5px', fontWeight: '600' }}
                                            >
                                                البرامج: {rc.programs.join('، ')}
                                            </span>
                                        )}
                                        {rc.semesters && rc.semesters.length > 0 && (
                                            <span 
                                                className="badge border px-2 py-1" 
                                                style={{ backgroundColor: '#f8fafc', color: '#475569', borderColor: '#cbd5e1', fontSize: '11.5px', fontWeight: '500' }}
                                            >
                                                الفصول: {rc.semesters.join(' و ')}
                                            </span>
                                        )}
                                        {rc.note && !rc.programs?.length && !rc.semesters?.length && (
                                            <span className="text-muted small">({rc.note})</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Charts Row 1 */}
                    <Row className="mb-4">
                        {/* Programs vs Courses */}
                        <Col md={6} className="mb-3">
                            <Card className="shadow-sm border-0 h-100">
                                <Card.Header className="bg-white border-0 pt-4 pb-0">
                                    <h5 className="fw-bold text-success mb-0">
                                        {isMedicine ? "إحصائيات المقررات الطولية والحزم الدراسية" : "المقررات لكل برنامج"}
                                    </h5>
                                </Card.Header>
                                <Card.Body style={{ height: "400px", overflow: "visible", position: "relative" }}>
                                    {stats.programs_stats.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={stats.programs_stats} 
                                                margin={{ top: 20, right: 30, left: 0, bottom: stats.programs_stats.length <= 3 ? 55 : 80 }}
                                                onMouseLeave={() => {
                                                    if (!pinnedProgram) {
                                                        closeProgramTimeoutRef.current = setTimeout(() => {
                                                            if (!isHoveringProgramPopupRef.current) {
                                                                setActiveProgramPopup(null);
                                                            }
                                                        }, 300);
                                                    }
                                                }}
                                                onClick={(state) => {
                                                    if (closeProgramTimeoutRef.current) clearTimeout(closeProgramTimeoutRef.current);
                                                    if (state && state.activePayload && state.activePayload.length) {
                                                        const item = state.activePayload[0].payload;
                                                        setPinnedProgram((prev) => (prev?.name === item.name ? null : item));
                                                        setActiveProgramPopup(item);
                                                        if (state.chartX != null) setProgramPopupCoordX(state.chartX);
                                                    }
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis 
                                                    dataKey="name" 
                                                    height={stats.programs_stats.length <= 3 ? 60 : 90} 
                                                    interval={0}
                                                    tick={(props) => {
                                                        const { x, y, payload } = props;
                                                        const prog = stats.programs_stats.find(p => p.name === payload.value);
                                                        const count = prog ? prog.course_count : "";
                                                        const isFew = stats.programs_stats.length <= 3;

                                                        if (isFew) {
                                                            return (
                                                                <g transform={`translate(${x},${y})`}>
                                                                    <text x={0} y={15} textAnchor="middle" fill="#333" fontSize={12.5} className="fw-bold">
                                                                        {payload.value}
                                                                    </text>
                                                                    <text x={0} y={32} textAnchor="middle" fill="#1b5e20" fontSize={13} className="fw-bold">
                                                                        ({count} مقررات)
                                                                    </text>
                                                                </g>
                                                            );
                                                        }

                                                        return (
                                                            <g transform={`translate(${x},${y}) rotate(-45)`}>
                                                                <text x={0} y={0} dx={-15} dy={10} textAnchor="start" fill="#666" fontSize={12} className="fw-bold">
                                                                    {payload.value}
                                                                </text>
                                                                <text x={0} y={0} dx={-15} dy={27} textAnchor="start" fill="#1b5e20" fontSize={13} className="fw-bold">
                                                                    ({count} مقررات)
                                                                </text>
                                                            </g>
                                                        );
                                                    }} 
                                                />
                                                <YAxis allowDecimals={false} />
                                                <RechartsTooltip 
                                                    cursor={{ fill: 'rgba(27, 94, 32, 0.12)' }}
                                                    content={({ active, payload, coordinate }) => {
                                                        if (active && payload && payload.length) {
                                                            if (closeProgramTimeoutRef.current) clearTimeout(closeProgramTimeoutRef.current);
                                                            const data = payload[0].payload;
                                                            const x = coordinate?.x != null ? coordinate.x : 250;
                                                            if (activeProgramPopup?.name !== data.name || programPopupCoordX !== x) {
                                                                setTimeout(() => {
                                                                    setActiveProgramPopup(data);
                                                                    setProgramPopupCoordX(x);
                                                                }, 0);
                                                            }
                                                        }
                                                        return null;
                                                    }} 
                                                />
                                                <Bar dataKey="course_count" name="عدد المقررات" fill="#1b5e20" radius={[4, 4, 0, 0]} barSize={stats.programs_stats.length <= 3 ? 55 : 40} style={{ cursor: 'pointer' }} />
                                            </BarChart>
                                        </ResponsiveContainer>

                                        {/* ── نافذة مقررات البرنامج التفاعلية (قابلة للسكرول وشبكة من عمودين مطابقة لقائمة الأساتذة) ── */}
                                        {(pinnedProgram || activeProgramPopup) && (() => {
                                            const data = pinnedProgram || activeProgramPopup;
                                            const isPinned = pinnedProgram?.name === data.name;
                                            const rawX = programPopupCoordX != null ? programPopupCoordX : 280;
                                            const targetX = Math.max(280, Math.min(rawX, 360));

                                            return (
                                                <div 
                                                    dir="rtl"
                                                    onMouseEnter={() => {
                                                        if (closeProgramTimeoutRef.current) clearTimeout(closeProgramTimeoutRef.current);
                                                        isHoveringProgramPopupRef.current = true;
                                                    }}
                                                    onMouseLeave={() => {
                                                        isHoveringProgramPopupRef.current = false;
                                                        if (!pinnedProgram) {
                                                            closeProgramTimeoutRef.current = setTimeout(() => {
                                                                if (!isHoveringProgramPopupRef.current) {
                                                                    setActiveProgramPopup(null);
                                                                }
                                                            }, 300);
                                                        }
                                                    }}
                                                    style={{ 
                                                        position: 'absolute',
                                                        top: '-150px',
                                                        left: `${targetX}px`,
                                                        transform: 'translateX(-50%)',
                                                        background: '#ffffff', 
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '10px',
                                                        boxShadow: '0 12px 35px rgba(0,0,0,0.22)',
                                                        width: '560px',
                                                        maxWidth: '92vw',
                                                        maxHeight: '520px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        pointerEvents: 'auto',
                                                        zIndex: 9999,
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {/* Header */}
                                                    <div style={{ 
                                                        padding: '12px 18px 10px 18px', 
                                                        borderBottom: '2px solid #1b5e20', 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center',
                                                        backgroundColor: '#ffffff',
                                                        flexShrink: 0 
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 'bold', fontSize: '16.5px', color: '#1e293b' }}>
                                                                {data.name}
                                                            </span>
                                                            {isPinned && (
                                                                <span className="badge bg-secondary" style={{ fontSize: '11px' }}>
                                                                    مثبت
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ color: '#1b5e20', fontWeight: 'bold', fontSize: '14.5px' }}>
                                                                عدد المقررات: {data.course_count}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPinnedProgram(null);
                                                                    setActiveProgramPopup(null);
                                                                    isHoveringProgramPopupRef.current = false;
                                                                }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    fontSize: '18px',
                                                                    cursor: 'pointer',
                                                                    color: '#94a3b8',
                                                                    padding: '0 4px',
                                                                    lineHeight: 1,
                                                                    marginRight: '2px'
                                                                }}
                                                                title="إغلاق"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <style>{`
                                                        .program-course-list-scroll::-webkit-scrollbar {
                                                            width: 7px;
                                                        }
                                                        .program-course-list-scroll::-webkit-scrollbar-track {
                                                            background: #f8fafc;
                                                            border-radius: 4px;
                                                        }
                                                        .program-course-list-scroll::-webkit-scrollbar-thumb {
                                                            background: #1b5e20;
                                                            border-radius: 4px;
                                                        }
                                                        .program-course-list-scroll::-webkit-scrollbar-thumb:hover {
                                                            background: #144917;
                                                        }
                                                    `}</style>

                                                    {/* قائمة المقررات بشبكة عمودين وسكرول سلس */}
                                                    <div 
                                                        className="program-course-list-scroll"
                                                        style={{ 
                                                            padding: '12px 18px', 
                                                            overflowY: 'auto', 
                                                            flex: '1 1 auto',
                                                            minHeight: 0,
                                                            overscrollBehavior: 'contain',
                                                            scrollbarWidth: 'thin',
                                                            scrollbarColor: '#1b5e20 #f1f5f9'
                                                        }}
                                                        onWheel={(e) => e.stopPropagation()}
                                                    >
                                                        {data.courses && data.courses.length > 0 ? (
                                                             <div style={{ 
                                                                 display: 'grid', 
                                                                 gridTemplateColumns: data.courses.length > 1 ? 'repeat(2, 1fr)' : '1fr', 
                                                                 gap: '6px 12px',
                                                                 fontSize: '13.5px'
                                                             }}>
                                                                 {data.courses.map((course, idx) => {
                                                                     const match = typeof course === 'string' ? course.match(/^(.*?)\s*\((.*?)\)$/) : null;
                                                                     const courseName = match ? match[1].trim() : course;
                                                                     const depts = match ? match[2].trim() : null;
                                                                     const repeatedInfo = getRepeatedCourseInfo(courseName);
                                                                     const isRepeated = !!repeatedInfo;
                                                                     const progs = repeatedInfo?.programs || [];

                                                                     return (
                                                                         <div 
                                                                             key={idx}
                                                                             style={{ 
                                                                                 display: 'flex', 
                                                                                 alignItems: 'center', 
                                                                                 gap: '6px',
                                                                                 backgroundColor: isRepeated ? '#fff8e1' : '#f8fafc',
                                                                                 padding: isRepeated ? '4px 8px' : '4px 8px',
                                                                                 borderRadius: '5px',
                                                                                 border: isRepeated ? '1px dashed #ffb74d' : '1px solid #f1f5f9'
                                                                             }}
                                                                             title={repeatedInfo ? repeatedInfo.note : undefined}
                                                                         >
                                                                             <span style={{ color: isRepeated ? '#e65100' : '#1b5e20', fontSize: '14px', flexShrink: 0 }}>•</span>
                                                                             <span style={{ 
                                                                                 fontWeight: isRepeated ? '700' : '600', 
                                                                                 color: isRepeated ? '#e65100' : '#333', 
                                                                                 fontSize: '13px',
                                                                                 wordBreak: 'break-word'
                                                                             }}>
                                                                                 {courseName}
                                                                             </span>
                                                                             {isRepeated && (
                                                                                 <span 
                                                                                     className="badge bg-warning text-dark px-1 py-0" 
                                                                                     style={{ fontSize: '10px', fontWeight: 'bold', marginRight: 'auto', flexShrink: 0 }}
                                                                                 >
                                                                                     مكرر
                                                                                 </span>
                                                                             )}
                                                                             {depts && (
                                                                                 <span style={{ color: '#1565c0', fontSize: '11px', background: '#eff6ff', padding: '1px 5px', borderRadius: '3px', fontWeight: '500', flexShrink: 0 }}>
                                                                                     ({depts})
                                                                                 </span>
                                                                             )}
                                                                         </div>
                                                                     );
                                                                 })}
                                                             </div>
                                                        ) : (
                                                            <div className="text-muted text-center py-3">لا توجد مقررات مسجلة لهذا البرنامج.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : (
                                        <div className="d-flex h-100 align-items-center justify-content-center text-muted fw-bold">لا توجد بيانات</div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Courses by Semester */}
                        <Col md={6} className="mb-3">
                            <Card className="shadow-sm border-0 h-100">
                                <Card.Header className="bg-white border-0 pt-4 pb-0">
                                    <h5 className="fw-bold text-success mb-0">المقررات في كل فصل دراسي</h5>
                                </Card.Header>
                                <Card.Body style={{ height: "350px" }}>
                                    {stats.courses_by_semester.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.courses_by_semester}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="count"
                                                    nameKey="semester"
                                                    label={({ cx, cy, midAngle, outerRadius, count, index }) => {
                                                        const RADIAN = Math.PI / 180;
                                                        const radius = outerRadius + 18;
                                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                        let finalX = x;
                                                        if (count === 0) {
                                                            const offset = index * 20;
                                                            finalX = x > cx ? x + offset : x - offset;
                                                        }
                                                        return (
                                                            <text 
                                                                x={finalX} 
                                                                y={y} 
                                                                fill="#1f2937" 
                                                                textAnchor="middle" 
                                                                dominantBaseline="central" 
                                                                fontSize={14} 
                                                                className="fw-bold"
                                                            >
                                                                {count}
                                                            </text>
                                                        );
                                                    }}
                                                >
                                                    {stats.courses_by_semester.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white border rounded shadow-sm p-3 text-end" dir="rtl" style={{ minWidth: '180px' }}>
                                                                    <div className="fw-bold text-dark border-bottom pb-2 mb-2" style={{ fontSize: '16px' }}>
                                                                        {data.semester}
                                                                    </div>
                                                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                                                        <span className="text-muted" style={{ fontSize: '14.5px' }}>عدد المقررات:</span>
                                                                        <span className="text-primary fw-bold" style={{ fontSize: '16px' }}>{data.count}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="d-flex h-100 align-items-center justify-content-center text-muted fw-bold">لا توجد بيانات</div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Charts Row 2 */}
                    <Row className="mb-4">
                        {/* Assigned Professors by Semester */}
                        <Col md={12} className="mb-3">
                            <Card className="shadow-sm border-0 h-100">
                                <Card.Header className="bg-white border-0 pt-4 pb-0">
                                    <h5 className="fw-bold text-dark mb-1">أعضاء هيئة التدريس المكلفين في كل فصل دراسي</h5>
                                    <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        backgroundColor: '#fffbeb', 
                                        border: '1px solid #fde68a', 
                                        borderRadius: '6px', 
                                        padding: '4px 10px', 
                                        fontSize: '13px', 
                                        color: '#92400e',
                                        marginTop: '4px'
                                    }}>
                                        <span>💡</span>
                                        <span>
                                            <strong>ملحوظة: </strong> تم احتساب العدد الإجمالي بتجنب الاسم المتكرر لكل فصل دراسي
                                        </span>
                                    </div>
                                </Card.Header>
                                <Card.Body style={{ height: "450px", overflow: "visible", position: "relative" }}>
                                    {stats.assigned_professors_by_semester.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart 
                                                    data={stats.assigned_professors_by_semester} 
                                                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                                                    onMouseLeave={() => {
                                                        if (!pinnedSemester) {
                                                            closeTimeoutRef.current = setTimeout(() => {
                                                                if (!isHoveringPopupRef.current) {
                                                                    setActiveSemesterPopup(null);
                                                                }
                                                            }, 300);
                                                        }
                                                    }}
                                                    onClick={(state) => {
                                                        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                                                        if (state && state.activePayload && state.activePayload.length) {
                                                            const item = state.activePayload[0].payload;
                                                            setPinnedSemester((prev) => (prev?.semester === item.semester ? null : item));
                                                            setActiveSemesterPopup(item);
                                                            if (state.chartX != null) setPopupCoordX(state.chartX);
                                                        }
                                                    }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="semester" tick={{ fontSize: 14, fontWeight: 'bold' }} />
                                                    <YAxis allowDecimals={false} />
                                                    <RechartsTooltip 
                                                        cursor={{ fill: 'rgba(200, 158, 90, 0.15)' }}
                                                        content={({ active, payload, coordinate }) => {
                                                            if (active && payload && payload.length) {
                                                                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                                                                const data = payload[0].payload;
                                                                const x = coordinate?.x != null ? coordinate.x : 450;
                                                                if (activeSemesterPopup?.semester !== data.semester || popupCoordX !== x) {
                                                                    setTimeout(() => {
                                                                        setActiveSemesterPopup(data);
                                                                        setPopupCoordX(x);
                                                                    }, 0);
                                                                }
                                                            }
                                                            return null;
                                                        }} 
                                                    />
                                                    <Bar dataKey="count" name="عدد الدكاترة المكلفين" fill="#c89e5a" radius={[4, 4, 0, 0]} barSize={60} style={{ cursor: 'pointer' }} />
                                                </BarChart>
                                            </ResponsiveContainer>

                                            {/* ── نافذة أسماء أعضاء هيئة التدريس التفاعلية (قابلة للسكرول بشكل كامل ومضبوطة المسافات) ── */}
                                            {(pinnedSemester || activeSemesterPopup) && (() => {
                                                const data = pinnedSemester || activeSemesterPopup;
                                                const isPinned = pinnedSemester?.semester === data.semester;

                                                const groupProfessorsByDept = (profsList) => {
                                                    const groups = {};
                                                    for (const prof of profsList) {
                                                        const match = typeof prof === 'string' ? prof.match(/^(.*?)\s*\((.*?)\)$/) : null;
                                                        if (match) {
                                                            const pName = match[1].trim();
                                                            const dept = match[2].trim();
                                                            if (!groups[dept]) groups[dept] = [];
                                                            groups[dept].push(pName);
                                                        } else {
                                                            const noDeptKey = "";
                                                            if (!groups[noDeptKey]) groups[noDeptKey] = [];
                                                            groups[noDeptKey].push(typeof prof === 'string' ? prof.trim() : prof);
                                                        }
                                                    }
                                                    return groups;
                                                };

                                                const profCounts = {};
                                                if (data.course_professors && Object.keys(data.course_professors).length > 0) {
                                                    Object.values(data.course_professors).forEach(pList => {
                                                        pList.forEach(p => {
                                                            const match = typeof p === 'string' ? p.match(/^(.*?)\s*\((.*?)\)$/) : null;
                                                            const cleanName = match ? match[1].trim() : (typeof p === 'string' ? p.trim() : p);
                                                            profCounts[cleanName] = (profCounts[cleanName] || 0) + 1;
                                                        });
                                                    });
                                                } else if (data.professors && data.professors.length > 0) {
                                                    data.professors.forEach(p => {
                                                        const match = typeof p === 'string' ? p.match(/^(.*?)\s*\((.*?)\)$/) : null;
                                                        const cleanName = match ? match[1].trim() : (typeof p === 'string' ? p.trim() : p);
                                                        profCounts[cleanName] = (profCounts[cleanName] || 0) + 1;
                                                    });
                                                }

                                                const renderProfItem = (prof, idx) => {
                                                    const match = typeof prof === 'string' ? prof.match(/^(.*?)\s*\((.*?)\)$/) : null;
                                                    const cleanName = match ? match[1].trim() : (typeof prof === 'string' ? prof.trim() : prof);
                                                    const isRepeated = (profCounts[cleanName] || 0) > 1;

                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '6px',
                                                                backgroundColor: isRepeated ? '#fff7ed' : 'transparent',
                                                                padding: isRepeated ? '3px 8px' : '2px 4px',
                                                                borderRadius: isRepeated ? '5px' : '0',
                                                                border: isRepeated ? '1px dashed #fdba74' : 'none'
                                                            }}
                                                            title={isRepeated ? `هذا العضو مكلف في أكثر من مقرر/قسم (${profCounts[cleanName]} مرات)` : undefined}
                                                        >
                                                            <span style={{ color: isRepeated ? '#ea580c' : '#c89e5a', flexShrink: 0, fontSize: '14px', fontWeight: isRepeated ? 'bold' : 'normal' }}>•</span>
                                                            <span style={{ 
                                                                wordBreak: 'break-word', 
                                                                color: isRepeated ? '#c2410c' : '#333', 
                                                                fontWeight: isRepeated ? '700' : '600',
                                                                fontSize: '13.5px'
                                                            }}>
                                                                {cleanName}
                                                            </span>
                                                            {isRepeated && (
                                                                <span 
                                                                    style={{ 
                                                                        fontSize: '10.5px', 
                                                                        fontWeight: 'bold', 
                                                                        backgroundColor: '#ffedd5', 
                                                                        color: '#9a3412', 
                                                                        padding: '1px 5px', 
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #fed7aa',
                                                                        marginRight: 'auto',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    مكرر
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                };

                                                const targetX = popupCoordX != null ? Math.max(295, Math.min(popupCoordX, 850)) : 450;

                                                return (
                                                    <div 
                                                        dir="rtl"
                                                        onMouseEnter={() => {
                                                            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                                                            isHoveringPopupRef.current = true;
                                                        }}
                                                        onMouseLeave={() => {
                                                            isHoveringPopupRef.current = false;
                                                            if (!pinnedSemester) {
                                                                closeTimeoutRef.current = setTimeout(() => {
                                                                    if (!isHoveringPopupRef.current) {
                                                                        setActiveSemesterPopup(null);
                                                                    }
                                                                }, 300);
                                                            }
                                                        }}
                                                        style={{ 
                                                            position: 'absolute',
                                                            top: '-150px',
                                                            left: `${targetX}px`,
                                                            transform: 'translateX(-50%)',
                                                            background: '#ffffff', 
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '10px',
                                                            boxShadow: '0 12px 35px rgba(0,0,0,0.22)',
                                                            width: '570px',
                                                            maxWidth: '94vw',
                                                            maxHeight: '520px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            pointerEvents: 'auto',
                                                            zIndex: 9999,
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {/* الهيدر ثابت في أعلى القائمة */}
                                                        <div style={{ 
                                                            padding: '12px 18px 10px 18px', 
                                                            borderBottom: '2px solid #c89e5a', 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center',
                                                            backgroundColor: '#ffffff',
                                                            flexShrink: 0 
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontWeight: 'bold', fontSize: '16.5px', color: '#1e293b' }}>
                                                                    {data.semester}
                                                                </span>
                                                                {isPinned && (
                                                                    <span className="badge bg-secondary" style={{ fontSize: '11px' }}>
                                                                        مثبت
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ color: '#c89e5a', fontWeight: 'bold', fontSize: '14.5px' }}>
                                                                    عدد أعضاء هيئة التدريس: {data.count}
                                                                </span>
                                                                <span className="badge bg-success text-white" style={{ fontSize: '11.5px', fontWeight: 'bold', padding: '4px 7px' }}>
                                                                    (دون تكرار)
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setPinnedSemester(null);
                                                                        setActiveSemesterPopup(null);
                                                                        isHoveringPopupRef.current = false;
                                                                    }}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        fontSize: '18px',
                                                                        cursor: 'pointer',
                                                                        color: '#94a3b8',
                                                                        padding: '0 4px',
                                                                        lineHeight: 1,
                                                                        marginRight: '2px'
                                                                    }}
                                                                    title="إغلاق"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <style>{`
                                                            .semester-prof-list-scroll::-webkit-scrollbar {
                                                                width: 7px;
                                                            }
                                                            .semester-prof-list-scroll::-webkit-scrollbar-track {
                                                                background: #f8fafc;
                                                                border-radius: 4px;
                                                            }
                                                            .semester-prof-list-scroll::-webkit-scrollbar-thumb {
                                                                background: #c89e5a;
                                                                border-radius: 4px;
                                                            }
                                                            .semester-prof-list-scroll::-webkit-scrollbar-thumb:hover {
                                                                background: #b08745;
                                                            }
                                                        `}</style>

                                                        {/* جسم القائمة قابل للتمرير والسكرول السلس */}
                                                        <div 
                                                            className="semester-prof-list-scroll"
                                                            style={{ 
                                                                padding: '12px 18px', 
                                                                overflowY: 'auto', 
                                                                flex: '1 1 auto',
                                                                minHeight: 0,
                                                                overscrollBehavior: 'contain',
                                                                scrollbarWidth: 'thin',
                                                                scrollbarColor: '#c89e5a #f1f5f9'
                                                            }}
                                                            onWheel={(e) => e.stopPropagation()}
                                                        >
                                                            {data.course_professors && Object.keys(data.course_professors).length > 0 ? (
                                                                <div>
                                                                    {Object.entries(data.course_professors).map(([courseName, profs], cIdx) => {
                                                                        const deptGroups = groupProfessorsByDept(profs);
                                                                        const hasDepts = Object.keys(deptGroups).some(k => k !== "");
                                                                        const repeatedInfo = getRepeatedCourseInfo(courseName);
                                                                        const isCourseRepeated = !!repeatedInfo;

                                                                        return (
                                                                            <div key={cIdx} style={{ marginBottom: '8px' }} title={repeatedInfo ? repeatedInfo.note : undefined}>
                                                                                <div style={{ fontWeight: 'bold', color: isCourseRepeated ? '#e65100' : '#1b5e20', fontSize: '14px', marginBottom: '4px', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                    <span>{courseName}:</span>
                                                                                    {isCourseRepeated && (
                                                                                        <span className="badge bg-warning text-dark px-2 py-0" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                                                            مكرر
                                                                                        </span>
                                                                                    )}
                                                                                    {repeatedInfo?.programs && repeatedInfo.programs.length > 1 && (
                                                                                        <span className="badge border px-2 py-0" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontSize: '11px', fontWeight: '500' }}>
                                                                                            البرامج: {repeatedInfo.programs.join('، ')}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {hasDepts ? (
                                                                                    Object.entries(deptGroups).map(([dept, deptProfs], dIdx) => (
                                                                                        <div key={dIdx} style={{ marginRight: '8px', marginBottom: '4px' }}>
                                                                                            {dept && (
                                                                                                <div style={{ fontWeight: 'bold', color: '#1565c0', fontSize: '13px', marginBottom: '3px' }}>
                                                                                                    قسم {dept}:
                                                                                                </div>
                                                                                            )}
                                                                                            <div style={{ 
                                                                                                display: 'grid', 
                                                                                                gridTemplateColumns: deptProfs.length > 1 ? 'repeat(2, 1fr)' : '1fr', 
                                                                                                gap: '4px 12px',
                                                                                                fontSize: '13.5px',
                                                                                                color: '#333'
                                                                                            }}>
                                                                                                {deptProfs.map(renderProfItem)}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                ) : (
                                                                                    <div style={{ 
                                                                                        display: 'grid', 
                                                                                        gridTemplateColumns: profs.length > 1 ? 'repeat(2, 1fr)' : '1fr', 
                                                                                        gap: '4px 12px',
                                                                                        fontSize: '13.5px',
                                                                                        color: '#333',
                                                                                        marginRight: '8px'
                                                                                    }}>
                                                                                        {profs.map(renderProfItem)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : data.professors && data.professors.length > 0 ? (() => {
                                                                const deptGroups = groupProfessorsByDept(data.professors);
                                                                const hasDepts = Object.keys(deptGroups).some(k => k !== "");

                                                                return hasDepts ? (
                                                                    Object.entries(deptGroups).map(([dept, deptProfs], dIdx) => (
                                                                        <div key={dIdx} style={{ marginRight: '8px', marginBottom: '4px' }}>
                                                                            {dept && (
                                                                                <div style={{ fontWeight: 'bold', color: '#1565c0', fontSize: '13px', marginBottom: '3px' }}>
                                                                                    قسم {dept}:
                                                                                </div>
                                                                            )}
                                                                            <div style={{ 
                                                                                display: 'grid', 
                                                                                gridTemplateColumns: deptProfs.length > 1 ? 'repeat(2, 1fr)' : '1fr', 
                                                                                gap: '4px 12px',
                                                                                fontSize: '13.5px',
                                                                                color: '#333'
                                                                            }}>
                                                                                {deptProfs.map(renderProfItem)}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div style={{ 
                                                                        display: 'grid', 
                                                                        gridTemplateColumns: data.professors.length > 1 ? 'repeat(2, 1fr)' : '1fr', 
                                                                        gap: '4px 12px',
                                                                        fontSize: '13.5px',
                                                                        color: '#333'
                                                                    }}>
                                                                        {data.professors.map(renderProfItem)}
                                                                    </div>
                                                                );
                                                            })() : null}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        <div className="d-flex h-100 align-items-center justify-content-center text-muted fw-bold">لا توجد خطط دراسية مسجلة للفصول أو لا يوجد تكليف.</div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            ) : null}
        </div>
    );
};

export default StatisticsPage;
