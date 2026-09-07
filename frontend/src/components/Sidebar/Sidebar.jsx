import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { Modal, Form, Button } from 'react-bootstrap';
import toast from 'react-hot-toast';
import './Sidebar.css';
import logo from '../../assets/logo.png';

/**
 * Sidebar component for navigation
 * @param {string} activeTab - The current active tab ID
 * @param {function} setActiveTab - Handler to update the active tab
 * @param {boolean} isOpen - Whether the sidebar is open on mobile
 * @param {function} setIsOpen - Handler to toggle sidebar visibility
 */
export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }) {
  const { user, logout } = useContext(AuthContext);
  const [facultyName, setFacultyName] = useState('');
  const [facultiesList, setFacultiesList] = useState([]);
  const [recycleCount, setRecycleCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [logsCount, setLogsCount] = useState(0);
  
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('password'); // 'password' or 'security'
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(newPassword) || new Set(newPassword).size !== 6) {
        toast.error('يجب أن تتكون كلمة المرور الجديدة من 6 أرقام إنجليزية مختلفة (0-9)');
        return;
    }
    try {
        const token = localStorage.getItem('token');
        await axios.post(`/api/auth/change-password`, {
            old_password: oldPassword,
            new_password: newPassword
        }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('تم تغيير كلمة المرور بنجاح');
        setOldPassword('');
        setNewPassword('');
        setShowSettings(false);
    } catch (err) {
        toast.error(err.response?.data?.detail || 'حدث خطأ أثناء تغيير كلمة المرور');
    }
  };

  const handleSetSecurityQuestion = async (e) => {
    e.preventDefault();
    if (!securityQuestion.trim() || !securityAnswer.trim()) {
        toast.error('يجب إدخال السؤال والإجابة');
        return;
    }
    try {
        const token = localStorage.getItem('token');
        await axios.post(`/api/auth/security-question`, {
            security_question: securityQuestion,
            security_answer: securityAnswer
        }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('تم إعداد سؤال الأمان بنجاح');
        setSecurityQuestion('');
        setSecurityAnswer('');
        setShowSettings(false);
    } catch (err) {
        toast.error(err.response?.data?.detail || 'حدث خطأ أثناء إعداد سؤال الأمان');
    }
  };

  useEffect(() => {
    const fetchRecycleCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`/api/recycle-bin`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRecycleCount(res.data.length);
      } catch (err) {
        console.error("Error fetching recycle bin count", err);
      }
    };
    
    const fetchNotificationCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const groupedMap = new Map();
        res.data.forEach(n => {
            const timeKey = (n.created_at && typeof n.created_at === 'string') ? n.created_at.substring(0, 16) : ''; 
            const key = `${n.action_text}_${n.action_by}_${timeKey}`;
            if (!groupedMap.has(key)) {
                groupedMap.set(key, true);
            }
        });
        
        setNotificationCount(groupedMap.size);
      } catch (err) {
        console.error("Error fetching notification count", err);
      }
    };

    const fetchLogsCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`/api/logs/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogsCount(res.data.total || 0);
      } catch (err) {
        console.error("Error fetching logs count", err);
      }
    };

    let interval;
    if (user) {
      fetchRecycleCount();
      fetchNotificationCount();
      fetchLogsCount();
      
      interval = setInterval(() => {
        fetchRecycleCount();
        fetchNotificationCount();
        fetchLogsCount();
      }, 2000);
      
      axios.get(`/api/faculties`)
        .then(res => {
          const list = res.data || [];
          setFacultiesList(list);
          if (user?.faculty?.name) {
            setFacultyName(user.faculty.name);
          } else if (user?.faculty_id) {
            const match = list.find(f => String(f.id) === String(user.faculty_id));
            if (match) setFacultyName(match.name);
          } else if (list.length === 1) {
            setFacultyName(list[0].name);
          } else {
            setFacultyName('');
          }
        })
        .catch(err => console.error("Error fetching faculties", err));
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  // Navigation items definition
  const menuItems = [
    {
      id: 'dashboard',
      label: 'الجدول الرئيسي',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      )
    },
    {
      id: 'professors',
      label: 'أعضاء هيئة التدريس',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      id: 'courses',
      label: 'المقررات الدراسية',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      )
    },
    {
      id: 'study-plan',
      label: 'الخطة الدراسية',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
          <path d="M16 18h.01" />
        </svg>
      )
    },
    {
      id: 'signatures',
      label: 'توقيعات المسؤولين',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 19v-4a2 2 0 0 0-2-2h-3l-2.5 2.5a2 2 0 0 1-2.8 0L7 13H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z" />
          <path d="M14 2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
        </svg>
      )
    },
    {
      id: 'statistics',
      label: 'الإحصائيات',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      )
    },
    {
      id: 'notifications',
      label: 'الإشعارات',
      badge: notificationCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      )
    },
    {
      id: 'recycle-bin',
      label: 'استرجاع المحذوف',
      badge: recycleCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <polyline points="10 11 12 13 14 11"></polyline>
          <line x1="12" y1="13" x2="12" y2="17"></line>
        </svg>
      )
    },
    {
      id: 'guidelines',
      label: 'الإرشادات',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      )
    }
  ];

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

  if (isSuperAdmin) {
    menuItems.push({
      id: 'admin',
      label: 'إدارة المسؤولين',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    });

    menuItems.push({
      id: 'control-panel',
      label: 'لوحة التحكم',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      )
    });

    menuItems.push({
      id: 'logs',
      label: 'العمليات (Logs)',
      badge: logsCount,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    });
  }

  const getUserJobTitle = () => {
    if (user?.job_title) {
      return user.job_title.replace(/\s*\(Faculty Admin\)/i, '').trim();
    }
    switch (user?.role) {
      case 'admin':
        return 'مدير عام';
      case 'student_affairs':
        return 'مدير شؤون الطلاب';
      case 'reviewer':
        return 'المراجع';
      case 'faculty_admin':
        return 'مسؤول كلية';
      case 'faculty_professor':
        return 'مدير برنامج';
      case 'manager':
        return 'مسؤول إدارة';
      default:
        return 'مستخدم';
    }
  };

  const getUserFaculty = () => {
    if (!user) return '';
    // عضو هيئة التدريس تظهر كلياته في سطر منفصل تحته
    if (user.job_title && user.job_title.includes('عضو هيئة تدريس')) {
      return '';
    }
    // يظهر اسم الكلية بجانب الوظيفة فقط لمديري البرامج ومسؤولي الكليات
    const isFacultyAdmin = user.role === 'faculty_admin' || (user.job_title && user.job_title.includes('مسؤول كلية'));
    const isProgramManager = user.role === 'faculty_professor' || (user.job_title && user.job_title.includes('مدير برنامج'));
    if (!isFacultyAdmin && !isProgramManager) {
      return '';
    }

    let name = '';
    if (user?.faculty?.name) {
      name = user.faculty.name;
    } else if (user?.faculty_id && facultiesList.length > 0) {
      const match = facultiesList.find(f => String(f.id) === String(user.faculty_id));
      if (match) name = match.name;
    } else if (user?.assigned_faculties && user.assigned_faculties.length > 0) {
      if (user.assigned_faculties.length === 1) {
        name = user.assigned_faculties[0].name;
      } else {
        name = user.assigned_faculties.map(f => f.name.replace(/^كلية\s+/, '')).join('، ');
      }
    } else if (facultyName) {
      name = facultyName;
    }
    return name ? name.replace(/^كلية\s+/, '').trim() : '';
  };

  const getFacultyMemberColleges = () => {
    if (!user) return '';
    const isFacultyMember = user.job_title && user.job_title.includes('عضو هيئة تدريس');
    if (!isFacultyMember) return '';

    let colleges = [];
    if (user.assigned_faculties && user.assigned_faculties.length > 0) {
      colleges = user.assigned_faculties.map(f => f.name.replace(/^كلية\s+/, '').trim());
    } else if (user.faculty?.name) {
      colleges = [user.faculty.name.replace(/^كلية\s+/, '').trim()];
    } else if (user.faculty_id && facultiesList.length > 0) {
      const match = facultiesList.find(f => String(f.id) === String(user.faculty_id));
      if (match) colleges = [match.name.replace(/^كلية\s+/, '').trim()];
    }

    const uniqueColleges = Array.from(new Set(colleges)).filter(Boolean);
    return uniqueColleges.join(' - ');
  };

  const getUserProfileSubtitle = () => {
    const job = getUserJobTitle();
    const faculty = getUserFaculty();
    if (faculty) {
      return `${job} ${faculty}`;
    }
    return job;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="sidebar-backdrop d-md-none" 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99
          }}
        />
      )}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header position-relative">
          {/* Mobile close button */}
          <button 
            className="btn-close-sidebar d-md-none position-absolute" 
            style={{ top: '15px', left: '15px', background: 'transparent', border: 'none', color: '#6c757d' }}
            onClick={() => setIsOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          
          <div className="logo-container">
            <img src={logo} alt="MNU Logo" className="logo-image" />
            <div className="logo-text">
              <h1 className="logo-title" style={{ fontSize: '18px', fontWeight: 'bold', margin: '5px 0', color: '#2e7d32' }}>جامعة المنوفية الأهلية</h1>
            </div>
          </div>
        </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth <= 768 && setIsOpen) setIsOpen(false);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label d-flex justify-content-between align-items-center w-100">
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                      <span className="badge bg-danger rounded-pill px-2">{item.badge}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="user-profile-small d-flex flex-column gap-3" style={{ width: '100%' }}>
          {/* القسم العلوي: الصورة الرمزية واسم المستخدم والوظيفة والكلية */}
          <div className="d-flex align-items-center gap-3 w-100">
            <div className="avatar text-uppercase flex-shrink-0">{user?.username?.[0] || 'U'}</div>
            <div className="user-info" style={{ textAlign: 'right', minWidth: 0, flex: 1 }}>
              <span className="user-name fw-bold d-block text-truncate" style={{ fontSize: '0.92rem' }} title={user?.username}>
                {user?.username}
              </span>
              <span 
                className="user-role fw-semibold d-block" 
                style={{ 
                  fontSize: '0.85rem', 
                  color: '#2e7d32', 
                  marginTop: '2px', 
                  lineHeight: '1.45',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
                title={getUserProfileSubtitle()}
              >
                {getUserProfileSubtitle()}
              </span>
              {getFacultyMemberColleges() && (
                <span 
                  className="user-faculty fw-semibold d-block" 
                  style={{ 
                    fontSize: '0.82rem', 
                    color: '#2e7d32', 
                    marginTop: '2px', 
                    lineHeight: '1.4',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}
                  title={getFacultyMemberColleges()}
                >
                  {getFacultyMemberColleges()}
                </span>
              )}
            </div>
          </div>
          {/* زر الإعدادات */}
          <button 
            onClick={() => setShowSettings(true)} 
            className="btn-settings d-flex align-items-center gap-2 justify-content-center w-100 py-2"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-title)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            title="إعدادات الحساب"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span className="fw-bold" style={{ fontSize: '0.9rem' }}>الإعدادات</span>
          </button>
          
          {/* القسم السفلي: زر تسجيل الخروج بكامل العرض مع النص */}
          <button 
            onClick={logout} 
            className="btn-logout" 
            title="تسجيل الخروج"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span className="fw-bold" style={{ fontSize: '0.9rem' }}>تسجيل خروج</span>
          </button>
        </div>
      </div>

      {/* نافذة الإعدادات (تغيير كلمة المرور / سؤال الأمان) */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} centered dir="rtl">
        <Modal.Header closeButton>
            <Modal.Title className="fw-bold text-success fs-5 w-100 text-center">إعدادات الحساب</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
            <div className="d-flex border-bottom">
                <button 
                    className={`flex-fill py-3 fw-bold border-0 ${settingsTab === 'password' ? 'bg-white text-success border-bottom border-success border-3' : 'bg-light text-muted'}`}
                    onClick={() => setSettingsTab('password')}
                >
                    تغيير كلمة المرور
                </button>
                <button 
                    className={`flex-fill py-3 fw-bold border-0 ${settingsTab === 'security' ? 'bg-white text-success border-bottom border-success border-3' : 'bg-light text-muted'}`}
                    onClick={() => setSettingsTab('security')}
                >
                    إعداد سؤال الأمان
                </button>
            </div>
            
            <div className="p-4">
                {settingsTab === 'password' ? (
                    <Form onSubmit={handleChangePassword}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">كلمة المرور الحالية</Form.Label>
                            <Form.Control type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold">كلمة المرور الجديدة</Form.Label>
                            <Form.Control type="password" placeholder="6 أرقام إنجليزية مختلفة" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                        </Form.Group>
                        <Button type="submit" variant="success" className="w-100 fw-bold py-2">حفظ كلمة المرور</Button>
                    </Form>
                ) : (
                    <Form onSubmit={handleSetSecurityQuestion}>
                        <div className="alert alert-info py-2" style={{ fontSize: '0.85rem' }}>
                            سيُطلب منك هذا السؤال وإجابته إذا نسيت كلمة المرور الخاصة بك.
                        </div>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">سؤال الأمان</Form.Label>
                            <Form.Select value={securityQuestion} onChange={e => setSecurityQuestion(e.target.value)} required>
                                <option value="">-- اختر سؤالاً --</option>
                                <option value="ما هو اسم كليتك التي تخرجت منها؟">ما هو اسم كليتك التي تخرجت منها؟</option>
                                <option value="في أي عام التحقت بالجامعة؟">في أي عام التحقت بالجامعة؟</option>
                                <option value="ما هو اسم مقرر دراسي تفضله؟">ما هو اسم مقرر دراسي تفضله؟</option>
                                <option value="من هو أستاذك المفضل في الجامعة؟">من هو أستاذك المفضل في الجامعة؟</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold">إجابة السؤال</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={securityAnswer} 
                                onChange={e => setSecurityAnswer(e.target.value)} 
                                required 
                                placeholder="اكتب إجابتك هنا..."
                            />
                        </Form.Group>
                        <Button type="submit" variant="success" className="w-100 fw-bold py-2">حفظ سؤال الأمان</Button>
                    </Form>
                )}
            </div>
        </Modal.Body>
      </Modal>
    </aside>
    </>
  );
}
