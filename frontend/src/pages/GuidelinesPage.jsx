import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Container, Row, Col, Card, Badge, Button, Form, Alert, Accordion, Tab, Nav } from 'react-bootstrap';
import { 
  FaBookOpen, 
  FaUserShield, 
  FaKey, 
  FaUniversity, 
  FaChalkboardTeacher, 
  FaBook, 
  FaCalendarAlt, 
  FaFileSignature, 
  FaChartBar, 
  FaBell, 
  FaTrashAlt, 
  FaSlidersH, 
  FaCheckCircle, 
  FaShieldAlt, 
  FaInfoCircle, 
  FaLightbulb,
  FaQuestionCircle,
  FaLock,
  FaArrowLeft,
  FaTable
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const API = "http://localhost:8000";

const GuidelinesPage = () => {
  const { user } = useContext(AuthContext);
  const [allFaculties, setAllFaculties] = useState([]);
  const [loadingFacs, setLoadingFacs] = useState(true);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Security Question State
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [secLoading, setSecLoading] = useState(false);

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const res = await axios.get(`${API}/api/faculties`);
      setAllFaculties(res.data || []);
    } catch (err) {
      console.error("Error fetching faculties", err);
    } finally {
      setLoadingFacs(false);
    }
  };

  // Determine user accessible faculties
  const hasAllFaculties = user?.all_faculties_access || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'student_affairs';

  const userFacultiesList = (() => {
    if (hasAllFaculties) {
      return allFaculties;
    }
    if (user?.assigned_faculties && user.assigned_faculties.length > 0) {
      return user.assigned_faculties;
    }
    if (user?.faculty) {
      return [user.faculty];
    }
    if (user?.faculty_id) {
      const match = allFaculties.find(f => String(f.id) === String(user.faculty_id));
      return match ? [match] : [];
    }
    return [];
  })();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.error("يرجى إدخال كلمة المرور الحالية");
      return;
    }
    if (!/^\d{6}$/.test(newPassword)) {
      toast.error("يجب أن تتكون كلمة المرور الجديدة من 6 أرقام إنجليزية (0-9)");
      return;
    }
    if (new Set(newPassword).size !== 6) {
      toast.error("يجب أن تكون الأرقام الستة لكلمة المرور مختلفة وغير مكررة تماماً (مثال: 147258)");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/auth/change-password`, {
        old_password: oldPassword,
        new_password: newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success("تم تغيير كلمة المرور بنجاح! احتفظ بكلمة المرور الجديدة في مكان آمن.");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء تغيير كلمة المرور. تأكد من كلمة المرور الحالية.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSetSecurityQuestion = async (e) => {
    e.preventDefault();
    if (!securityQuestion.trim() || !securityAnswer.trim()) {
      toast.error("يرجى كتابة السؤال والإجابة السرية");
      return;
    }

    setSecLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/auth/security-question`, {
        security_question: securityQuestion,
        security_answer: securityAnswer
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success("تم إعداد وحفظ سؤال الأمان بنجاح!");
      setSecurityQuestion('');
      setSecurityAnswer('');
    } catch (err) {
      toast.error(err.response?.data?.detail || "حدث خطأ أثناء حفظ سؤال الأمان");
    } finally {
      setSecLoading(false);
    }
  };

  // Human-readable job / role
  const roleNameDisplay = (() => {
    if (user?.job_title) return user.job_title;
    if (user?.role === 'admin') return 'مدير عام النظام (Super Admin)';
    if (user?.role === 'faculty_admin') return 'مسؤول كلية';
    if (user?.role === 'faculty_professor') return 'مدير برنامج / عضو هيئة تدريس';
    if (user?.role === 'student_affairs') return 'مدير شؤون الطلاب';
    if (user?.role === 'reviewer') return 'مراجع أكاديمي';
    if (user?.role === 'manager') return 'مدير';
    return user?.role || 'مستخدم النظام';
  })();

  const systemPages = [
    {
      id: "dashboard",
      title: "الجدول الرئيسي",
      icon: <FaTable className="text-success fs-3" />,
      badge: "نظرة عامة",
      badgeColor: "success",
      whatIsIt: "لوحة المتابعة الشاملة التي تجمع عدد البرامج والمقررات وأعضاء هيئة التدريس لكل فصل دراسي للعام الجامعي في جدول واحد .",
      benefit: "تتيح للإدارة وقيادات الجامعة متابعة سير العملية الأكاديمية بنظرة واحدة، والتأكد من تغطية جميع المقررات وعدم وجود مقررات بدون هيئة تدريس مسندة، ومراقبة توازن أعداد الطلاب والمجموعات.",
      keyFeatures: [
        "عرض عدد المقررات والمسؤولين عن تدريسها في كل برنامج لكل فصل دراسي وامكانية طباعة الجدول",
        "معرفة الأستاذ القائم بالتدريس وعدد أسابيع حضورهم وإسم كل مقرر بساعات تدريسه",
        "تصفية سريعة حسب الكلية والعام الجامعي والفصل الدراسي",
        "متابعة إجمالي الساعات المنفذة والمطلوبة فورياً",
        "إجمالي الساعات للأستاذ في الترم = إجمالي ساعات المقررات القائم بتدريسها في الأسبوع * عدد أسابيع حضوره في هذا الترم",
      ]
    },
    {
      id: "professors",
      title: "أعضاء هيئة التدريس",
      icon: <FaChalkboardTeacher className="text-primary fs-3" />,
      badge: "الهيئة التدريسية",
      badgeColor: "primary",
      whatIsIt: "سجل متكامل وشامل لبيانات السادة أعضاء هيئة التدريس والهيئة المعاونة المنتدبين والمعينين بالجامعة.",
      benefit: "إدارة بيانات الأساتذة، ومتابعة أنصبتهم التدريسية  والحدود القصوى للساعات لمنع أي تجاوز أو تضارب في الجداول، مع ميزة الاستيراد والتصدير عبر ملفات Excel بضغطة زر واحدة.",
      keyFeatures: [
        "إضافة وتعديل بيانات الأستاذ (الاسم، اللقب العلمي، جهة القدوم، الرقم القومي)",
        "تحديد أسابيع التدريس ونوع العقد وحساب الساعات التدريسية بدقة",
        "يتم تسجيل الساعات الخاصة بعضو هيئة التدريس لكل مقرر في كل برنامج بناء على الخطة الدراسية",
        "استيراد بيانات أعضاء هيئة التدريس دفعة واحدة من شيت إكسيل مع نموذج جاهز للتحميل",
        "تصدير بيانات الأساتذة إلى ملف Excel جاهز ومعتمد",
        "أرشفة الأساتذة في سلة المحذوفات لمنع الفقدان المفاجئ"
      ]
    },
    {
      id: "courses",
      title: "المقررات الدراسية",
      icon: <FaBook className="text-info fs-3" />,
      badge: "اللوائح الأكاديمية",
      badgeColor: "info",
      whatIsIt: "قاعدة بيانات المقررات الدراسية لجميع الكليات بالساعات المعتمدة الرسمية وفقاً للائحة  ",
      benefit: "إدخال وتحديث مقررات اللائحة لكل مستوى دراسي وبرنامج، وإعداد المقررات المشتركة بين البرامج",
      keyFeatures: [
        "إدخال الساعات المعتمدة وتفصيلها (نظري، عملي، تمارين، توتوريال، حقل)",
        "دعم المقررات المدمجة/المشتركة بين أكثر من برنامج لنفس الكلية",
        "استيراد مقررات الكلية بالكامل من ملف إكسيل بضغطة زر واحدة",
        "تصدير لوائح المقررات لشيتات إكسيل منسقة",
        "البحث السريع والتصفية حسب الكود أو الاسم أو المستوى الأكاديمي"
      ]
    },
    {
      id: "study-plan",
      title: "الخطة الدراسية (نموذج 1 و 2)",
      icon: <FaCalendarAlt className="text-success fs-3" />,
      badge: "القلب النابض للنظام",
      badgeColor: "success",
      whatIsIt: "البيئة التفاعلية لإعداد وتوزيع الجداول والخطة التدريسية الفصلية، وحساب المجموعات والأعداد والساعات الفعلية.",
      benefit: "إنشاء الخطط الدراسية الرسمية المعتمدة (نموذج 1 تدريس ونموذج 2 تدريس)، وإدارة دورة الاعتماد والمراجعة، وإمكانية تصدير شيتات إكسيل و الطباعة بجودة عالية .",
      keyFeatures: [
        "إسناد المقررات للأساتذة مع حساب أعداد المجموعات لظهور الساعات المطلوبة",
        "إدارة دورة اعتماد محكمة: إنهاء الخطة ← مراجعة أولى ← مراجعة ثانية ← اعتماد الخطة",
        "بعد اعتماد الخطة الدراسية لا يمكن التعديل فيها من قبل أي مستخدم إلا بعد إلغاء اللإعتماد ",
        "طباعة نموذج (1) تدريس ونموذج (2) تدريس المنسقين مع التوقيعات المعتمدة",
        "تصدير ملفات Excel دقيقة جداً ومطابقة للمعايير الجامعية مع تثبيت الصفوف والشعار",
        "ميزة نسخ الخطة بالكامل من فصل أو عام سابق لتوفير الجهد والوقت"
      ]
    },
    {
      id: "signatures",
      title: "توقيعات المسؤولين",
      icon: <FaFileSignature className="text-secondary fs-3" />,
      badge: "التوثيق الرسمي",
      badgeColor: "secondary",
      whatIsIt: "لوحة تخصيص وترتيب ديباجة التوقيعات الرسمية التي تظهر في نهاية استمارات ونماذج الخطط الدراسية.",
      benefit: "تتيح لكل كلية ضبط أسماء ومسميات المسؤولين المعتمدين (عميد الكلية، وكيل الكلية، مدير البرنامج، رئيس القسم، مراجع الشؤون) ليتم إدراجهم تلقائياً في الطباعة وشيتات الإكسيل بدقة.",
      keyFeatures: [
        "إضافة توقيع مسؤول جديد وتحديد الصفة الوظيفية والاسم الرسمي",
        "التحكم في ترتيب التوقيعات في الصفحة",
        "تجميد التوقيعات آلياً عند اعتماد الخطة لضمان الموثوقية وعدم التعديل اللاحق"
      ]
    },
    {
      id: "statistics",
      title: "الإحصائيات والتقارير",
      icon: <FaChartBar className="text-warning fs-3" />,
      badge: "التحليلات والمؤشرات",
      badgeColor: "warning",
      whatIsIt: "مركز التحليلات البيانية والمؤشرات الرقمية لأداء الكليات ومقرراتها وأنصبة هيئتها التدريسية لكل الأترام خلال العام الجامعي.",
      benefit: "مساعدة قيادات الجامعة في اتخاذ قرارات دقيقة مبنية على البيانات (Data-Driven Decisions)، ومعرفة نسب العجز والفائض في ساعات التدريس وتوزيع الأعباء بين الأقسام.",
      keyFeatures: [
        "يتم تحديد البيانات بدقة للكلية والعام الجامعي المحدد بناءً على الخطة الدراسية",
        "رسوم بيانية تفاعلية لأسماء المقررات وعددها في كل برنامج وكل ترم من فصول العام الدراسي",
        " اجمالي عدد البرامج والمقررات وأعضاء هيئة التدريس للعام الجامعي المحدد في الكلية",
        "مؤشرات دقيقة لأسماء وأعداد الأساتذة القائمين بالتدريس لكل مقرر في كل فصل دراسي"
      ]
    },
    {
      id: "notifications",
      title: "الإشعارات وسجل العمليات",
      icon: <FaBell className="text-danger fs-3" />,
      badge: "سجل التدقيق (Audit Log)",
      badgeColor: "danger",
      whatIsIt: "سجل زمني لحظي يوثق جميع الأنشطة والإجراءات التي تتم داخل النظام من قبل كافة المستخدمين.",
      benefit: "تحقيق أعلى معايير الشفافية والأمان الأكاديمي، وتتبع من قام بأي تعديل، إضافة، حذف، مراجعة، أو اعتماد وتوقيته بدقة متناهية.",
      keyFeatures: [
        "إشعارات فورية بكل عملية اعتماد أو مراجعة أو تعديل في الخطة",
        "توثيق اسم المستخدم والرتبة والوقت والتاريخ بالدقيقة",
        "تجميع الإشعارات المتشابهة لتسهيل القراءة وتصفيتها حسب الكلية",
        "إمكانية استيراد وتصدير سجل الإشعارات"
      ]
    },
    {
      id: "recycle-bin",
      title: "استرجاع المحذوف (سلة المهملات)",
      icon: <FaTrashAlt className="text-dark fs-3" />,
      badge: "حماية البيانات",
      badgeColor: "dark",
      whatIsIt: "طبقة أمان ذكية تحتفظ بالعناصر المحذوفة مؤقتاً قبل إزالتها نهائياً من قاعدة البيانات.",
      benefit: "حماية البيانات من أي خطأ بشري أو حذف غير مقصود للمقررات أو الأساتذة، مما يمنح المستخدم راحة تامة وإمكانية استرجاع أي سجل بنقرة واحدة.",
      keyFeatures: [
        "استرجاع المقررات والأساتذة المحذوفين بكامل بياناتهم وارتباطاتهم السابقة",
        "الحذف النهائي المقيد بالصلاحيات للمحافظة على نظافة قاعدة البيانات",
        "عداد رقمي مباشر في القائمة الجانبية يوضح عدد العناصر في سلة المهملات"
      ]
    }
  ];

  return (
    <Container fluid className="p-3" style={{ direction: "rtl", textAlign: "right" }}>
      {/* ── 1. Page Header ── */}
      <Card className="shadow-sm mb-4 border-0 text-white" style={{ borderRadius: "12px", background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)" }}>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div style={{ backgroundColor: "rgba(255, 255, 255, 0.2)", padding: "10px 14px", borderRadius: "10px" }}>
                  <FaBookOpen style={{ fontSize: "28px", color: "#ffffff" }} />
                </div>
                <div>
                  <h3 className="fw-bold mb-1 text-white" style={{ fontSize: "22px", color: "#ffffff" }}>دليل الاستخدام والإرشادات الشاملة</h3>
                  <p className="mb-0 text-white" style={{ fontSize: "14.5px", color: "#ffffff", opacity: 0.95 }}>
                    نظام إدارة الخطط الدراسية و المقررات وهيئة التدريس - جامعة المنوفية الأهلية
                  </p>
                </div>
              </div>
            </div>
            <div className="text-start">
              <Badge bg="light" text="dark" className="px-3 py-2 fw-bold shadow-sm" style={{ fontSize: "13.5px", borderRadius: "8px" }}>
                <FaUserShield className="ms-2 text-success" />
                المستخدم الحالي: {user?.username} ({roleNameDisplay})
              </Badge>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ── 2. User Info & Available Faculties Card ── */}
      <Card className="shadow-sm mb-4 border-0" style={{ borderRadius: "12px", overflow: "hidden" }}>
        <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <FaUniversity className="text-success fs-5" />
            <span className="fw-bold text-dark" style={{ fontSize: "16px" }}>نطاق الصلاحيات والكليات المصرح لك بالدخول عليها</span>
          </div>
          <Badge bg={hasAllFaculties ? "success" : "info"} className="px-3 py-2 fw-bold" style={{ fontSize: "12.5px" }}>
            {hasAllFaculties ? "وصول لجميع الكليات بالجامعة" : `متاح لك (${userFacultiesList.length}) كلية`}
          </Badge>
        </Card.Header>
        <Card.Body className="p-4 bg-light">
          <Row className="g-3 align-items-center">
            <Col lg={4} md={12}>
              <div className="p-3 bg-white rounded-3 border h-100 shadow-sm">
                <div className="text-muted small mb-1 fw-bold">بيانات حسابك في النظام:</div>
                <div className="fw-bold text-dark fs-5 mb-2">{user?.username}</div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="text-muted small">الدور / المسمى الوظيفي:</span>
                  <Badge bg="success" className="px-2 py-1">{roleNameDisplay}</Badge>
                </div>
                <div className="text-muted small" style={{ lineHeight: "1.6" }}>
                  هذه الصلاحيات والنطاق محددة من قبل إدارة النظام لتمكينك من إنجاز المهام الأكاديمية الخاصة بقطاعك بأعلى دقة وأمان.
                </div>
              </div>
            </Col>
            <Col lg={8} md={12}>
              <div className="p-3 bg-white rounded-3 border h-100 shadow-sm">
                <div className="text-muted small mb-2 fw-bold">الكليات المتاحة لك للتعديل والعرض وإعداد الخطط:</div>
                {loadingFacs ? (
                  <div className="text-muted py-3 text-center">جاري تحميل قائمة الكليات...</div>
                ) : hasAllFaculties ? (
                  <div>
                    <div className="p-3 rounded-2 mb-2 fw-bold text-success d-flex align-items-center gap-2" style={{ backgroundColor: "#e8f5e9", border: "1.5px solid #a5d6a7" }}>
                      <FaCheckCircle className="fs-5" />
                      <span>حسابك يتمتع بصلاحية شاملة للوصول إلى كافة كليات جامعة المنوفية الأهلية.</span>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {allFaculties.map(fac => (
                        <Badge key={fac.id} bg="light" text="dark" className="p-2 border fw-semibold" style={{ fontSize: "12.5px" }}>
                          <FaUniversity className="ms-1 text-success" /> {fac.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : userFacultiesList.length > 0 ? (
                  <div>
                    <p className="small text-muted mb-2">أنت مصرح لك بإدارة وعرض الكليات التالية فقط:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {userFacultiesList.map(fac => (
                        <div key={fac.id} className="p-2 px-3 bg-light rounded-2 border d-flex align-items-center gap-2 fw-bold text-dark" style={{ fontSize: "13.5px" }}>
                          <FaUniversity className="text-success" />
                          <span>{fac.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert variant="warning" className="mb-0 small fw-bold">
                    لم يتم تعيين كلية محددة لحسابك حالياً. يرجى مراجعة إدارة النظام لتحديد الكلية التابع لها.
                  </Alert>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── 3. Main Guide Tabs ── */}
      <Card className="shadow-sm mb-4 border-0" style={{ borderRadius: "12px", overflow: "hidden" }}>
        <Tab.Container defaultActiveKey="pages-guide">
          <Card.Header className="bg-white p-0 border-bottom">
            <Nav variant="tabs" className="px-3 pt-2 border-bottom-0">
              <Nav.Item>
                <Nav.Link eventKey="pages-guide" className="fw-bold py-3 px-4 d-flex align-items-center gap-2" style={{ fontSize: "15px" }}>
                  <FaBook className="text-success" />
                  <span>دليل شاشات وصفحات النظام</span>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="password-security" className="fw-bold py-3 px-4 d-flex align-items-center gap-2" style={{ fontSize: "15px" }}>
                  <FaKey className="text-primary" />
                  <span>تغيير كلمة المرور وتأمين الحساب</span>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="workflow-guide" className="fw-bold py-3 px-4 d-flex align-items-center gap-2" style={{ fontSize: "15px" }}>
                  <FaCheckCircle className="text-success" />
                  <span>دورة اعتماد الخطة الدراسية</span>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="tips" className="fw-bold py-3 px-4 d-flex align-items-center gap-2" style={{ fontSize: "15px" }}>
                  <FaLightbulb className="text-warning" />
                  <span>إرشادات ونصائح هامة</span>
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>

          <Card.Body className="p-4">
            <Tab.Content>
              {/* ── TAB 1: Pages Guide ── */}
              <Tab.Pane eventKey="pages-guide">
                <div className="mb-4">
                  <h4 className="fw-bold text-dark mb-2" style={{ fontSize: "18px" }}>
                    شرح شاشات النظام: ما يعرض بها وكيف تستفيد منها
                  </h4>
                  <p className="text-muted" style={{ fontSize: "14px" }}>
                    تعرف على كل شاشة في النظام ووظيفتها الأساسية وكيف تساهم في إنجاز أعمالك الأكاديمية والإدارية بكل سهولة.
                  </p>
                </div>

                <Accordion defaultActiveKey="0" className="guide-accordion">
                  {systemPages.map((page, index) => (
                    <Accordion.Item key={page.id} eventKey={String(index)} className="mb-3 border rounded-3 overflow-hidden shadow-sm">
                      <Accordion.Header>
                        <div className="d-flex align-items-center justify-content-between w-100 pe-3 flex-wrap gap-2 py-1">
                          <div className="d-flex align-items-center gap-3">
                            <div style={{ backgroundColor: "#f8f9fa", padding: "10px 14px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {page.icon}
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span className="fw-bold text-dark ms-1" style={{ fontSize: "18px" }}>{page.title}</span>
                              <Badge bg={page.badgeColor} className="px-3 py-2 shadow-sm fw-semibold" style={{ fontSize: "15px", borderRadius: "8px", letterSpacing: "0.2px" }}>
                                {page.badge}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-muted ps-2" style={{ fontSize: "13.5px" }}>اضغط لمعرفة التفاصيل والاستفادة</span>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body className="bg-white p-4">
                        <Row className="g-3">
                          <Col md={6}>
                            <div className="p-3 bg-light rounded-3 h-100 border">
                              <h6 className="fw-bold text-success d-flex align-items-center gap-2 mb-2">
                                <FaInfoCircle /> ما يعرض في هذه الشاشة؟
                              </h6>
                              <p className="text-secondary mb-0" style={{ fontSize: "14px", lineHeight: "1.7" }}>
                                {page.whatIsIt}
                              </p>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="p-3 bg-light rounded-3 h-100 border">
                              <h6 className="fw-bold text-primary d-flex align-items-center gap-2 mb-2">
                                <FaLightbulb /> كيف تستفيد منها في عملك؟
                              </h6>
                              <p className="text-secondary mb-0" style={{ fontSize: "14px", lineHeight: "1.7" }}>
                                {page.benefit}
                              </p>
                            </div>
                          </Col>
                          <Col xs={12}>
                            <div className="p-3 rounded-3 border" style={{ backgroundColor: "#fafafa" }}>
                              <h6 className="fw-bold text-dark mb-2" style={{ fontSize: "14px" }}>
                                أبرز الإمكانيات والمزايا المتاحة لك:
                              </h6>
                              <Row className="g-2">
                                {page.keyFeatures.map((feat, fIdx) => (
                                  <Col md={6} key={fIdx}>
                                    <div className="d-flex align-items-start gap-2 small text-muted">
                                      <FaCheckCircle className="text-success mt-1 flex-shrink-0" />
                                      <span>{feat}</span>
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            </div>
                          </Col>
                        </Row>
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Tab.Pane>

              {/* ── TAB 2: Password & Security Guide + Direct Change Form ── */}
              <Tab.Pane eventKey="password-security">
                <Row className="g-4">
                  {/* Left Column: Instructions & Requirements */}
                  <Col lg={6} md={12}>
                    <div className="p-4 rounded-3 border h-100" style={{ backgroundColor: "#f8fdf9", borderColor: "#a5d6a7" }}>
                      <div className="d-flex align-items-center gap-2 text-success mb-3">
                        <FaShieldAlt className="fs-4" />
                        <h5 className="fw-bold mb-0">شروط وإرشادات كلمة المرور الآمنة</h5>
                      </div>
                      
                      <div className="alert alert-success border-success bg-white mb-3" style={{ fontSize: "14px", lineHeight: "1.7" }}>
                        <div className="fw-bold text-success mb-1">
                          <FaCheckCircle className="ms-1" /> شروط النظام الإلزامية لكلمة المرور:
                        </div>
                        <ul className="mb-0 pe-3">
                          <li>يجب أن تتكون كلمة المرور بدقة من <strong>6 أرقام إنجليزية فقط (0-9)</strong>.</li>
                          <li><strong>شرط الأمان الأهم:</strong> يجب أن تكون جميع الأرقام الستة <strong>مختلفة تماماً وغير مكررة</strong>.</li>
                          <li><span className="text-success fw-bold">أمثلة صحيحة ومقبولة:</span> <code>147258</code> أو <code>982361</code> أو <code>305928</code></li>
                          <li><span className="text-danger fw-bold">أمثلة غير مقبولة:</span> <code>112233</code> (تكرار)، <code>12345</code> (أقل من 6 أرقام)، <code>admin1</code> (تحتوي حروف).</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-white rounded-3 border mb-3">
                        <h6 className="fw-bold text-primary d-flex align-items-center gap-2 mb-2">
                          <FaQuestionCircle /> أهمية سؤال الأمان (Security Question):
                        </h6>
                        <p className="text-muted small mb-0" style={{ lineHeight: "1.7" }}>
                          سؤال الأمان وإجابته السرية هما وسيلتك الأساسية لاستعادة وتعيين كلمة مرور جديدة بنفسك في حال نسيانها من صفحة تسجيل الدخول (عبر خيار "نسيت كلمة المرور؟") دون الحاجة للرجوع لمسؤول النظام.
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-3 border">
                        <h6 className="fw-bold text-dark d-flex align-items-center gap-2 mb-2">
                          <FaSlidersH className="text-secondary" /> كيفية الوصول لتغيير كلمة المرور في أي وقت:
                        </h6>
                        <p className="text-muted small mb-0" style={{ lineHeight: "1.6" }}>
                          يمكنك في أي وقت فتح نافذة الإعدادات بالنقر على <strong>أيقونة الترس (⚙️الإعدادات)</strong> الموجودة أسفل القائمة الجانبية يمين الشاشة تحت اسم المستخدم الخاص بك.
                        </p>
                      </div>
                    </div>
                  </Col>

                  {/* Right Column: Direct Password Change & Security Forms */}
                  <Col lg={6} md={12}>
                    <Card className="border shadow-sm mb-4" style={{ borderRadius: "10px" }}>
                      <Card.Header className="bg-white py-3 border-bottom">
                        <div className="d-flex align-items-center gap-2">
                          <FaKey className="text-success fs-5" />
                          <span className="fw-bold text-dark fs-6">تغيير كلمة المرور الخاصة بك الآن</span>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-4">
                        <Form onSubmit={handleChangePassword}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">كلمة المرور الحالية:</Form.Label>
                            <Form.Control 
                              type="password" 
                              placeholder="أدخل كلمة المرور الحالية" 
                              value={oldPassword} 
                              onChange={(e) => setOldPassword(e.target.value)}
                              required 
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">كلمة المرور الجديدة (6 أرقام مختلفة):</Form.Label>
                            <Form.Control 
                              type="password" 
                              placeholder="مثال: 948271" 
                              maxLength={6}
                              value={newPassword} 
                              onChange={(e) => setNewPassword(e.target.value)}
                              required 
                            />
                            <Form.Text className="text-muted small">
                              يجب أن تكون 6 أرقام إنجليزية غير مكررة.
                            </Form.Text>
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">تأكيد كلمة المرور الجديدة:</Form.Label>
                            <Form.Control 
                              type="password" 
                              placeholder="أعد كتابة كلمة المرور الجديدة" 
                              maxLength={6}
                              value={confirmPassword} 
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required 
                            />
                          </Form.Group>

                          <Button variant="success" type="submit" className="w-100 fw-bold py-2" disabled={passwordLoading}>
                            {passwordLoading ? "جاري التحديث..." : "حفظ كلمة المرور الجديدة"}
                          </Button>
                        </Form>
                      </Card.Body>
                    </Card>

                    <Card className="border shadow-sm" style={{ borderRadius: "10px" }}>
                      <Card.Header className="bg-white py-3 border-bottom">
                        <div className="d-flex align-items-center gap-2">
                          <FaShieldAlt className="text-primary fs-5" />
                          <span className="fw-bold text-dark fs-6">إعداد سؤال الأمان لاستعادة الحساب</span>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-4">
                        <Form onSubmit={handleSetSecurityQuestion}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">سؤال الأمان الشخصي:</Form.Label>
                            <Form.Control 
                              type="text" 
                              placeholder="مثال: ما هو اسم أول مدرسة التحقت بها؟" 
                              value={securityQuestion} 
                              onChange={(e) => setSecurityQuestion(e.target.value)}
                              required 
                            />
                          </Form.Group>

                          <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">الإجابة السرية:</Form.Label>
                            <Form.Control 
                              type="text" 
                              placeholder="أدخل الإجابة التي تتذكرها فقط" 
                              value={securityAnswer} 
                              onChange={(e) => setSecurityAnswer(e.target.value)}
                              required 
                            />
                          </Form.Group>

                          <Button variant="primary" type="submit" className="w-100 fw-bold py-2" disabled={secLoading}>
                            {secLoading ? "جاري الحفظ..." : "حفظ سؤال الأمان"}
                          </Button>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Tab.Pane>

              {/* ── TAB 3: Workflow Guide ── */}
              <Tab.Pane eventKey="workflow-guide">
                <div className="mb-4">
                  <h4 className="fw-bold text-dark mb-2" style={{ fontSize: "18px" }}>
                    دورة مراحل واعتماد الخطة الدراسية (Workflow Lifecycle)
                  </h4>
                  <p className="text-muted" style={{ fontSize: "14px" }}>
                    تتبع الخطة الدراسية في جامعة المنوفية الأهلية مسار تدقيق هرمي متكامل لضمان صحة البيانات قبل الاعتماد النهائي:
                  </p>
                </div>

                <Row className="g-4 mb-4">
                  <Col md={3}>
                    <div className="p-4 bg-white rounded-3 border text-center h-100 shadow-sm position-relative">
                      <div className="badge bg-success mb-3 p-2 rounded-circle fs-5" style={{ width: "45px", height: "45px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</div>
                      <h6 className="fw-bold text-dark">المرحلة الأولى: إنهاء الخطة</h6>
                      <p className="small text-muted mb-0" style={{ lineHeight: "1.6" }}>
                        يقوم مدير البرنامج أو مسؤول الكلية بعد الانتهاء من توزيع الأساتذة والمقررات بالضغط على زر <strong>إنهاء الخطة</strong> وتجهيزها للمراجعة.
                      </p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-4 bg-white rounded-3 border text-center h-100 shadow-sm position-relative">
                      <div className="badge bg-primary mb-3 p-2 rounded-circle fs-5" style={{ width: "45px", height: "45px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</div>
                      <h6 className="fw-bold text-dark">المرحلة الثانية: مراجعة أولى</h6>
                      <p className="small text-muted mb-0" style={{ lineHeight: "1.6" }}>
                        يقوم مسؤول الكلية بفحص الخطة الدراسية ومطابقتها مع اللائحة، ثم الضغط على <strong>مراجعة أولى</strong> لتأكيد استيفاء الشروط.
                      </p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-4 bg-white rounded-3 border text-center h-100 shadow-sm position-relative">
                      <div className="badge bg-info text-white mb-3 p-2 rounded-circle fs-5" style={{ width: "45px", height: "45px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</div>
                      <h6 className="fw-bold text-dark">المرحلة الثالثة: مراجعة ثانية</h6>
                      <p className="small text-muted mb-0" style={{ lineHeight: "1.6" }}>
                        يقوم مراجع الشؤون أو مسؤول الكلية بالتدقيق على أنصبة أعضاء هيئة التدريس والبيانات الإدارية والضغط على <strong>مراجعة ثانية</strong>.
                      </p>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-4 bg-white rounded-3 border text-center h-100 shadow-sm position-relative" style={{ border: "2px solid #2e7d32 !important" }}>
                      <div className="badge bg-success mb-3 p-2 rounded-circle fs-5" style={{ width: "45px", height: "45px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>4</div>
                      <h6 className="fw-bold text-success">المرحلة الرابعة: إعتماد الخطة</h6>
                      <p className="small text-muted mb-0" style={{ lineHeight: "1.6" }}>
                        يقوم صاحب الصلاحية <strong>مدير إدارة شؤون الطلاب</strong> بالضغط على <strong>إعتماد الخطة</strong> فيمنع أي تعديل في الخطة حتى التوقيعات وتصبح خطة رسمية.
                      </p>
                    </div>
                  </Col>
                </Row>

                <Alert variant="success" className="d-flex align-items-center gap-3 p-3 border-success">
                  <FaCheckCircle className="fs-3 flex-shrink-0 text-success" />
                  <div>
                    <div className="fw-bold mb-1">ماذا يحدث بعد اعتماد الخطة؟</div>
                    <div className="small text-secondary" style={{ lineHeight: "1.7" }}>
                     لا يمكن لأي مستخدم على البرنامج من التعديل على الخطة حتى التوقيعات وتصبح خطة رسمية إلا إذا تم إلغاء الإعتماد من قبل المسؤول .
                    </div>
                  </div>
                </Alert>
              </Tab.Pane>

              {/* ── TAB 4: Tips & Best Practices ── */}
              <Tab.Pane eventKey="tips">
                <Row className="g-3">
                  <Col md={6}>
                    <div className="p-4 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-success fw-bold mb-2">
                        <FaFileSignature className="fs-5" />
                        <span>استيراد وتصدير ملفات Excel:</span>
                      </div>
                      <p className="text-muted small mb-0" style={{ lineHeight: "1.7" }}>
                          يمكن استيراد وتصدير البيانات في صفحة المقررات والأساتذة والخطط الدراسي وإمكانية نسخ الخطة الدراسية من اي فصل دراسي لأي عام جامعية.
                      </p>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="p-4 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-primary fw-bold mb-2">
                        <FaBook className="fs-5" />
                        <span>المقررات المشتركة بين البرامج:</span>
                      </div>
                      <p className="text-muted small mb-0" style={{ lineHeight: "1.7" }}>
                        عند إضافة مقرر مشترك بين أكثر من برنامج، استخدم ميزة "مقرر مشترك" لتسجيل ساعات تدريسه مرة واحدة فقط لعضو هيئة التدريس مع إمكانية دمج أعداد الطلاب وحساب مجموعاتهم بدقة.
                      </p>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="p-4 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-warning fw-bold mb-2">
                        <FaCalendarAlt className="fs-5" />
                        <span>نسخ الخطط السابقة:</span>
                      </div>
                      <p className="text-muted small mb-0" style={{ lineHeight: "1.7" }}>
                        بدلاً من إدخال الخطة من الصفر في كل فصل دراسي، يمكنك استخدام زر <strong>"نسخ خطة من عام سابق"</strong> في شاشة الخطة الدراسية، حيث سيتم نسخ التوزيع بالكامل لتعديل التغييرات الطفيفة فقط.
                      </p>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="p-4 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-danger fw-bold mb-2">
                        <FaTrashAlt className="fs-5" />
                        <span>سلة المحذوفات كصمام أمان:</span>
                      </div>
                      <p className="text-muted small mb-0" style={{ lineHeight: "1.7" }}>
                        إذا قمت بحذف أستاذ أو مقرر أو خطة بالخطأ، لا تقلق! انتقل فوراً إلى صفحة <strong>"استرجاع المحذوف"</strong> واضغط على زر الاستعادة ليعود السجل فوراً إلى مكانه بكامل بياناته.
                      </p>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="p-4 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-info fw-bold mb-2">
                        <FaFileSignature className="fs-5" />
                        <span>التحكم في التوقيعات الرسمية:</span>
                      </div>
                      <p className="text-muted small mb-0" style={{ lineHeight: "1.7" }}>
                        يمكنك اختيار مكان ظهور التوقيع في الصفحة (الخطة الدراسية - الجدول الرئيسي - بيانات أعضاء هيئة التدريس - المقررات - أعضاء هيئة التدريس) والتحكم في موضعه وترتيبه بسهولة، علماً بأنه بعد اعتماد الخطة الدراسية لا يمكن التغيير في التوقيعات الخاصة بها لضمان توثيقها رسمياً.
                      </p>
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="p-4 bg-light rounded-3 border h-100">
                      <div className="d-flex align-items-center gap-2 text-success fw-bold mb-2">
                        <FaShieldAlt className="fs-5" />
                        <span>تأمين الحساب:</span>
                      </div>
                      <p className="text-muted small mb-0" style={{ lineHeight: "1.7" }}>
                        يمكن تغيير كلمة المرور من زر الإعدادات في القائمة الجانبية أو من جزء تغيير كلمة المرور وتأمين الحساب في صفحة الإرشادات، ويجب اختيار سؤال الأمان والإجابة عليه لأنه سيظهر في صفحة تسجيل الدخول عند نسيان كلمة المرور.
                      </p>
                    </div>
                  </Col>
                </Row>
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Tab.Container>
      </Card>
    </Container>
  );
};

export default GuidelinesPage;
