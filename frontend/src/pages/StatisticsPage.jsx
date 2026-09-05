import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { FaChartBar, FaUserTie, FaBookOpen } from 'react-icons/fa';
import Select from 'react-select';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const API = "http://127.0.0.1:8000";

const StatisticsPage = () => {
    const [faculties, setFaculties] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState("");
    const [selectedYear, setSelectedYear] = useState("2026/2027");
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [academicYearOptions, setAcademicYearOptions] = useState([]);

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
                    setSelectedYear(years[0].value);
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
                        <Col md={3} className="mb-3">
                            <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #1b5e20" }}>
                                <Card.Body className="d-flex align-items-center gap-3">
                                    <div className="p-3 bg-light rounded-circle me-3 ms-3">
                                        <FaUserTie size={30} className="text-success" />
                                    </div>
                                    <div>
                                        <h5 className="text-muted fw-bold mb-1">إجمالي أعضاء هيئة التدريس</h5>
                                        <h3 className="mb-0 fw-bold text-dark">{stats.total_professors}</h3>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        
                        {isMedicine ? (
                            <>
                                <Col md={3} className="mb-3">
                                    <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #0d6efd" }}>
                                        <Card.Body className="d-flex align-items-center gap-3">
                                            <div className="p-3 bg-light rounded-circle me-3 ms-3">
                                                <FaBookOpen size={30} className="text-primary" />
                                            </div>
                                            <div>
                                                <h5 className="text-muted fw-bold mb-1">إجمالي المقررات الطولية</h5>
                                                <h3 className="mb-0 fw-bold text-dark">
                                                    {stats.programs_stats.find(p => p.name === "المقررات الطولية")?.course_count || 0}
                                                </h3>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3} className="mb-3">
                                    <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #fd7e14" }}>
                                        <Card.Body className="d-flex align-items-center gap-3">
                                            <div className="p-3 bg-light rounded-circle me-3 ms-3">
                                                <FaBookOpen size={30} className="text-warning" />
                                            </div>
                                            <div>
                                                <h5 className="text-muted fw-bold mb-1">إجمالي الحزم الدراسية</h5>
                                                <h3 className="mb-0 fw-bold text-dark">
                                                    {stats.programs_stats.find(p => p.name === "الحزم الدراسية")?.course_count || 0}
                                                </h3>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </>
                        ) : (
                            <Col md={3} className="mb-3">
                                <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #0d6efd" }}>
                                    <Card.Body className="d-flex align-items-center gap-3">
                                        <div className="p-3 bg-light rounded-circle me-3 ms-3">
                                            <FaBookOpen size={30} className="text-primary" />
                                        </div>
                                        <div>
                                            <h5 className="text-muted fw-bold mb-1">إجمالي البرامج</h5>
                                            <h3 className="mb-0 fw-bold text-dark">{stats.programs_stats.length}</h3>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}
                        
                        <Col md={3} className="mb-3">
                            <Card className="shadow-sm border-0 h-100" style={{ borderRight: "5px solid #ffc107" }}>
                                <Card.Body className="d-flex align-items-center gap-3">
                                    <div className="p-3 bg-light rounded-circle me-3 ms-3">
                                        <FaChartBar size={30} className="text-warning" />
                                    </div>
                                    <div>
                                        <h5 className="text-muted fw-bold mb-1">إجمالي المقررات</h5>
                                        <h3 className="mb-0 fw-bold text-dark">
                                            {stats.courses_by_semester.reduce((acc, curr) => acc + curr.count, 0)}
                                        </h3>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

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
                                <Card.Body style={{ height: "400px" }}>
                                    {stats.programs_stats.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.programs_stats} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis 
                                                    dataKey="name" 
                                                    height={90} 
                                                    interval={0}
                                                    tick={(props) => {
                                                        const { x, y, payload } = props;
                                                        const prog = stats.programs_stats.find(p => p.name === payload.value);
                                                        const count = prog ? prog.course_count : "";
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
                                                    cursor={{ fill: '#f5f5f5' }}
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white border rounded shadow p-3 text-end" style={{ minWidth: "150px" }}>
                                                                    <div className="fw-bold text-dark border-bottom pb-2 mb-2">{label}</div>
                                                                    <div className="text-success fw-bold mb-2">عدد المقررات : {data.course_count}</div>
                                                                    {data.courses && data.courses.length > 0 && (
                                                                        <ul className="mb-0 ps-0 text-muted" style={{ listStyleType: "none", fontSize: "13px" }}>
                                                                            {data.courses.map((course, idx) => (
                                                                                <li key={idx} className="mb-1">• {course}</li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="course_count" name="عدد المقررات" fill="#1b5e20" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
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
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="count"
                                                    nameKey="semester"
                                                    label={({ cx, cy, midAngle, outerRadius, semester, count, index }) => {
                                                        const RADIAN = Math.PI / 180;
                                                        const radius = outerRadius + 25;
                                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                        
                                                        // For RTL, if x > cx (right side), text extends left so we must anchor "end".
                                                        // If x < cx (left side), text extends right so we must anchor "start".
                                                        const textAnchor = x > cx ? 'end' : 'start';
                                                        
                                                        let finalX = x;
                                                        if (count === 0) {
                                                            // إزاحة الأصفار أفقياً حتى لا تتداخل فوق بعضها
                                                            const offset = index * 60;
                                                            finalX = x > cx ? x + offset : x - offset;
                                                        }
                                                        
                                                        return (
                                                            <text x={finalX} y={y} fill="#333" textAnchor={textAnchor} dominantBaseline="central" fontSize={13} className="fw-bold">
                                                                {`${semester}: ${count}`}
                                                            </text>
                                                        );
                                                    }}
                                                >
                                                    {stats.courses_by_semester.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
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
                                    <h5 className="fw-bold text-dark mb-0">أعضاء هيئة التدريس المكلفين في كل فصل دراسي</h5>
                                </Card.Header>
                                <Card.Body style={{ height: "350px" }}>
                                    {stats.assigned_professors_by_semester.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.assigned_professors_by_semester} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="semester" tick={{ fontSize: 14, fontWeight: 'bold' }} />
                                                <YAxis allowDecimals={false} />
                                                <RechartsTooltip 
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white p-3 shadow-sm border rounded" dir="rtl" style={{ minWidth: "200px" }}>
                                                                    <p className="fw-bold mb-2 text-dark border-bottom pb-2">{label}</p>
                                                                    <p className="mb-2" style={{ color: "#c89e5a", fontWeight: "bold" }}>
                                                                        عدد الدكاترة المكلفين: {data.count}
                                                                    </p>
                                                                    {data.course_professors && Object.keys(data.course_professors).length > 0 ? (
                                                                        <div className="text-muted mt-2 text-end">
                                                                            {Object.entries(data.course_professors).map(([courseName, profs], cIdx) => (
                                                                                <div key={cIdx} className="mb-3">
                                                                                    <strong className="d-block text-success mb-1" style={{fontSize: "13px"}}>{courseName}:</strong>
                                                                                    <ul className="mb-0 ps-3 text-end" style={{ listStyleType: "disc", marginRight: "15px", paddingLeft: 0, fontSize: "13px" }}>
                                                                                        {profs.map((prof, idx) => (
                                                                                            <li key={idx}>{prof}</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : data.professors && data.professors.length > 0 ? (
                                                                        <div className="text-muted mt-2">
                                                                            <strong className="d-block mb-1">الأسماء:</strong>
                                                                            <ul className="mb-0 ps-3 text-end" style={{ listStyleType: "disc", marginRight: "15px", paddingLeft: 0 }}>
                                                                                {data.professors.map((prof, idx) => (
                                                                                    <li key={idx}>{prof}</li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }} 
                                                    cursor={{ fill: '#f5f5f5' }} 
                                                />
                                                <Bar dataKey="count" name="عدد الدكاترة المكلفين" fill="#c89e5a" radius={[4, 4, 0, 0]} barSize={60} />
                                            </BarChart>
                                        </ResponsiveContainer>
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
