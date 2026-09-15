import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import { Container, Card, Table, Form, Spinner, Button, InputGroup, Modal, Row, Col, Badge, Dropdown } from 'react-bootstrap';
import { FaShieldAlt, FaEyeSlash, FaEye, FaSearch, FaUser, FaTimes, FaUndo, FaListUl, FaCheckCircle, FaBalanceScale, FaSave, FaClock, FaRedo, FaPlus, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { confirmAction } from '../utils/confirmAlert';
import { 
    HOUR_VARIABLES, 
    MATH_OPERATORS, 
    DEFAULT_FACULTY_FORMULA, 
    DEFAULT_ASSISTANT_FORMULA,
    ACADEMIC_ROLE_OPTIONS,
    DEFAULT_FACULTY_ROLES,
    DEFAULT_ASSISTANT_ROLES
} from '../utils/workloadFormula';

const SIDEBAR_PAGES = [
    { id: 'dashboard', label: 'الجدول الرئيسي', icon: '📊' },
    { id: 'professors', label: 'أعضاء هيئة التدريس', icon: '👨‍🏫' },
    { id: 'courses', label: 'المقررات الدراسية', icon: '📚' },
    { id: 'study-plan', label: 'الخطة الدراسية', icon: '📅' },
    { id: 'signatures', label: 'توقيعات المسؤولين', icon: '✍️' },
    { id: 'statistics', label: 'الإحصائيات', icon: '📈' },
    { id: 'notifications', label: 'الإشعارات', icon: '🔔' },
    { id: 'recycle-bin', label: 'استرجاع المحذوف', icon: '🗑️' },
    { id: 'workload', label: 'تحديد الأعباء', icon: '⚖️' },
    { id: 'guidelines', label: 'الإرشادات', icon: 'ℹ️' },
    { id: 'control-panel', label: 'لوحة التحكم', icon: '⚙️' },
    { id: 'logs', label: 'العمليات (Logs)', icon: '📋' },
    { id: 'admin', label: 'إدارة المسؤولين', icon: '🛡️' },
];

const ControlPanelPage = () => {
    const { user, setUser } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [selectedPageToHide, setSelectedPageToHide] = useState([]);
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

    // Navigation Tabs State
    const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' | 'hidden-pages' | 'workload-limits' | 'academic-years'
    const [permissionSearch, setPermissionSearch] = useState('');
    const [permissionFacultyFilter, setPermissionFacultyFilter] = useState('');
    const [hiddenPagesSearch, setHiddenPagesSearch] = useState('');

    // Default year/semester (starred) - stored in localStorage
    const [defaultYear, setDefaultYear] = useState(() => localStorage.getItem('mnu_default_academic_year') || '');
    const [defaultSemester, setDefaultSemester] = useState(() => localStorage.getItem('mnu_default_semester') || 'الفصل الدراسي الأول');

    // Workload Limits & Dynamic Rule Groups State for Control Panel
    const [ruleGroups, setRuleGroups] = useState([
        {
            id: 'rule-1',
            title: 'القاعدة 1',
            faculties: [],
            facultyFormula: DEFAULT_FACULTY_FORMULA,
            assistantFormula: DEFAULT_ASSISTANT_FORMULA,
            facultyRoles: [...DEFAULT_FACULTY_ROLES],
            assistantRoles: [...DEFAULT_ASSISTANT_ROLES]
        }
    ]);
    const [selectedLimitYear, setSelectedLimitYear] = useState("");
    const [selectedLimitSemester, setSelectedLimitSemester] = useState("الفصل الدراسي الأول");
    const [workloadLimitsLoading, setWorkloadLimitsLoading] = useState(false);
    const [workloadLimitsSaving, setWorkloadLimitsSaving] = useState(false);
    const [workloadLimits, setWorkloadLimits] = useState({
        max_faculty_hours_per_day: 6.0,
        max_assistant_hours_per_day: 8.0,
        min_theory_hours_per_day: '',
        max_theory_hours_per_day: '6',
        min_practical_hours_per_day: '',
        max_practical_hours_per_day: '4',
        min_tutorial_hours_per_day: '',
        max_tutorial_hours_per_day: '',
        min_field_hours_per_day: '',
        max_field_hours_per_day: '',
        max_theory_hours_per_course: '',
        max_practical_hours_per_course: '',
        max_tutorial_hours_per_course: '',
        max_field_hours_per_course: ''
    });

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

            const facList = facRes.data || [];
            const yrsList = yearsRes.data || [];
            setFaculties(facList);
            setAcademicYears(yrsList);

            if (facList.length > 0) {
                if (user?.role === 'faculty_professor' && user?.faculty_id) {
                    const myFac = facList.find(f => String(f.id) === String(user.faculty_id));
                    if (myFac) {
                        setRuleGroups([{
                            id: 'rule-1',
                            title: 'القاعدة 1',
                            faculties: [{ value: String(myFac.id), label: myFac.name }],
                            facultyFormula: DEFAULT_FACULTY_FORMULA,
                            assistantFormula: DEFAULT_ASSISTANT_FORMULA,
                            facultyRoles: [...DEFAULT_FACULTY_ROLES],
                            assistantRoles: [...DEFAULT_ASSISTANT_ROLES]
                        }]);
                    }
                } else {
                    setRuleGroups([{
                        id: 'rule-1',
                        title: 'القاعدة 1 (الكليات العامة)',
                        faculties: facList.map(f => ({ value: String(f.id), label: f.name })),
                        facultyFormula: DEFAULT_FACULTY_FORMULA,
                        assistantFormula: DEFAULT_ASSISTANT_FORMULA,
                        facultyRoles: [...DEFAULT_FACULTY_ROLES],
                        assistantRoles: [...DEFAULT_ASSISTANT_ROLES]
                    }]);
                }
            }
            if (yrsList.length > 0) {
                setSelectedLimitYear(prev => prev || yrsList[0].name);
            }
        } catch (error) {
            console.error("Error fetching data", error);
            toast.error("خطأ في جلب البيانات");
        } finally {
            setLoading(false);
        }
    };

    const accessibleLimitFaculties = useMemo(() => {
        if (user?.role === 'admin') return faculties;
        if (user?.faculty_id) {
            return faculties.filter(f => String(f.id) === String(user.faculty_id));
        }
        if (user?.faculties && user.faculties.length > 0) {
            const allowed = user.faculties.map(String);
            return faculties.filter(f => allowed.includes(String(f.id)));
        }
        return faculties;
    }, [faculties, user]);

    const isLimitHealthTechFaculty = useMemo(() => {
        return ruleGroups.some(group => 
            (group.faculties || []).some(f => {
                const name = f.label || "";
                return name.includes("العلوم الصحية") || name.includes("تكنولوجيا العلوم");
            })
        );
    }, [ruleGroups]);

    // Add a new rule group for other faculties
    const handleAddRuleGroup = () => {
        const alreadySelectedIds = new Set(ruleGroups.flatMap(g => (g.faculties || []).map(f => String(f.value))));
        const unselected = accessibleLimitFaculties
            .filter(f => !alreadySelectedIds.has(String(f.id)))
            .map(f => ({ value: String(f.id), label: f.name }));

        const newIndex = ruleGroups.length + 1;
        const newGroup = {
            id: `rule-${Date.now()}`,
            title: `القاعدة ${newIndex}`,
            faculties: unselected.length > 0 ? [unselected[0]] : [],
            facultyFormula: DEFAULT_FACULTY_FORMULA,
            assistantFormula: DEFAULT_ASSISTANT_FORMULA,
            facultyRoles: [...DEFAULT_FACULTY_ROLES],
            assistantRoles: [...DEFAULT_ASSISTANT_ROLES]
        };
        setRuleGroups(prev => [...prev, newGroup]);
        toast.success(`تمت إضافة قاعدة جديدة (القاعدة ${newIndex})`);
    };

    // Remove a rule group
    const handleRemoveRuleGroup = (groupId) => {
        if (ruleGroups.length <= 1) {
            toast.error("يجب الإبقاء على قاعدة واحدة على الأقل");
            return;
        }
        setRuleGroups(prev => prev.filter(g => g.id !== groupId));
        toast.success("تم حذف القاعدة بنجاح");
    };

    // Update fields in a specific rule group
    const handleUpdateRuleGroup = (groupId, field, value) => {
        setRuleGroups(prev => prev.map(g => g.id === groupId ? { ...g, [field]: value } : g));
    };

    // Insert token into formula input for a specific group at cursor position
    const insertTokenInGroup = (groupId, target, token) => {
        const inputId = `formula-${target}-${groupId}`;
        const input = document.getElementById(inputId);
        setRuleGroups(prev => prev.map(group => {
            if (group.id !== groupId) return group;
            const isAssistant = target === 'assistant';
            const currentFormula = isAssistant ? group.assistantFormula : group.facultyFormula;
            if (input) {
                const start = input.selectionStart != null ? input.selectionStart : currentFormula.length;
                const end = input.selectionEnd != null ? input.selectionEnd : currentFormula.length;
                const newFormula = currentFormula.substring(0, start) + token + currentFormula.substring(end);
                setTimeout(() => {
                    input.focus();
                    input.setSelectionRange(start + token.length, start + token.length);
                }, 50);
                return {
                    ...group,
                    [isAssistant ? 'assistantFormula' : 'facultyFormula']: newFormula
                };
            } else {
                return {
                    ...group,
                    [isAssistant ? 'assistantFormula' : 'facultyFormula']: currentFormula + token
                };
            }
        }));
    };

    // Fetch limits for Control Panel and organize into Rule Groups
    useEffect(() => {
        if (!selectedLimitYear || !selectedLimitSemester || accessibleLimitFaculties.length === 0) return;
        const fetchLimits = async () => {
            setWorkloadLimitsLoading(true);
            try {
                const res = await axios.get(`${API}/api/workload/limits/all`, {
                    params: {
                        academic_year: selectedLimitYear,
                        semester: selectedLimitSemester
                    }
                });
                const allLimits = res.data || [];

                if (allLimits.length > 0) {
                    const formulaMap = new Map();
                    for (const item of allLimits) {
                        const facForm = (item.faculty_formula || DEFAULT_FACULTY_FORMULA).trim();
                        const assForm = (item.assistant_formula || DEFAULT_ASSISTANT_FORMULA).trim();
                        const rolesStr = (item.faculty_roles || DEFAULT_FACULTY_ROLES.join(',')).trim();
                        const rolesArray = rolesStr ? rolesStr.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_FACULTY_ROLES;
                        const assRolesStr = (item.assistant_roles || DEFAULT_ASSISTANT_ROLES.join(',')).trim();
                        const assRolesArray = assRolesStr ? assRolesStr.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_ASSISTANT_ROLES;
                        const key = `${facForm}___SEPARATOR___${assForm}___SEPARATOR___${rolesStr}___SEPARATOR___${assRolesStr}`;
                        if (!formulaMap.has(key)) {
                            formulaMap.set(key, {
                                facultyFormula: facForm,
                                assistantFormula: assForm,
                                facultyRoles: rolesArray,
                                assistantRoles: assRolesArray,
                                facultyIds: []
                            });
                        }
                        formulaMap.get(key).facultyIds.push(item.faculty_id);
                    }

                    const loadedGroups = [];
                    let gIndex = 1;
                    const assignedFacultyIds = new Set();

                    formulaMap.forEach((data) => {
                        const matched = accessibleLimitFaculties
                            .filter(f => data.facultyIds.includes(f.id))
                            .map(f => ({ value: String(f.id), label: f.name }));
                        if (matched.length > 0) {
                            matched.forEach(m => assignedFacultyIds.add(Number(m.value)));
                            loadedGroups.push({
                                id: `rule-${gIndex}`,
                                title: `القاعدة ${gIndex}`,
                                faculties: matched,
                                facultyFormula: data.facultyFormula,
                                assistantFormula: data.assistantFormula,
                                facultyRoles: data.facultyRoles || [...DEFAULT_FACULTY_ROLES],
                                assistantRoles: data.assistantRoles || [...DEFAULT_ASSISTANT_ROLES]
                            });
                            gIndex++;
                        }
                    });

                    // Add any remaining accessible faculties that are not yet saved
                    const unassigned = accessibleLimitFaculties
                        .filter(f => !assignedFacultyIds.has(f.id))
                        .map(f => ({ value: String(f.id), label: f.name }));

                    if (unassigned.length > 0) {
                        const nextIdx = loadedGroups.length + 1;
                        loadedGroups.push({
                            id: `rule-${nextIdx}`,
                            title: `القاعدة ${nextIdx}`,
                            faculties: unassigned,
                            facultyFormula: DEFAULT_FACULTY_FORMULA,
                            assistantFormula: DEFAULT_ASSISTANT_FORMULA,
                            facultyRoles: [...DEFAULT_FACULTY_ROLES],
                            assistantRoles: [...DEFAULT_ASSISTANT_ROLES]
                        });
                    }

                    if (loadedGroups.length > 0) {
                        setRuleGroups(loadedGroups);
                    }
                } else {
                    // Default single group with all faculties
                    setRuleGroups([{
                        id: 'rule-1',
                        title: 'القاعدة 1 (الكليات العامة)',
                        faculties: accessibleLimitFaculties.map(f => ({ value: String(f.id), label: f.name })),
                        facultyFormula: DEFAULT_FACULTY_FORMULA,
                        assistantFormula: DEFAULT_ASSISTANT_FORMULA,
                        facultyRoles: [...DEFAULT_FACULTY_ROLES],
                        assistantRoles: [...DEFAULT_ASSISTANT_ROLES]
                    }]);
                }
            } catch (err) {
                console.error("Error fetching workload limits", err);
            } finally {
                setWorkloadLimitsLoading(false);
            }
        };
        fetchLimits();
    }, [selectedLimitYear, selectedLimitSemester, accessibleLimitFaculties]);

    const handleSaveWorkloadLimits = async (e) => {
        e?.preventDefault();
        if (!ruleGroups || ruleGroups.length === 0) {
            toast.error("لا توجد قواعد لحفظها");
            return;
        }

        // Verify that each rule group has at least one faculty selected
        for (let i = 0; i < ruleGroups.length; i++) {
            const g = ruleGroups[i];
            if (!g.faculties || g.faculties.length === 0) {
                toast.error(`يرجى تحديد كلية واحدة على الأقل في ${g.title || `القاعدة ${i + 1}`} أو حذفها إذا لم تكن بحاجة إليها`);
                return;
            }
        }

        setWorkloadLimitsSaving(true);
        try {
            let totalSavedFaculties = 0;
            for (const group of ruleGroups) {
                const facultyIds = group.faculties.map(f => parseInt(f.value));
                totalSavedFaculties += facultyIds.length;
                await axios.post(`${API}/api/workload/limits`, {
                    faculty_id: facultyIds[0],
                    faculty_ids: facultyIds,
                    academic_year: selectedLimitYear,
                    semester: selectedLimitSemester,
                    faculty_formula: group.facultyFormula || DEFAULT_FACULTY_FORMULA,
                    assistant_formula: group.assistantFormula || DEFAULT_ASSISTANT_FORMULA,
                    faculty_roles: (group.facultyRoles && group.facultyRoles.length > 0 ? group.facultyRoles : DEFAULT_FACULTY_ROLES).join(','),
                    assistant_roles: (group.assistantRoles && group.assistantRoles.length > 0 ? group.assistantRoles : DEFAULT_ASSISTANT_ROLES).join(','),
                    max_faculty_hours_per_day: 6.0,
                    max_assistant_hours_per_day: 8.0,
                    min_theory_hours_per_day: parseFloat(workloadLimits.min_theory_hours_per_day) || 0.0,
                    max_theory_hours_per_day: parseFloat(workloadLimits.max_theory_hours_per_day) || 0.0,
                    min_practical_hours_per_day: parseFloat(workloadLimits.min_practical_hours_per_day) || 0.0,
                    max_practical_hours_per_day: parseFloat(workloadLimits.max_practical_hours_per_day) || 0.0,
                    min_tutorial_hours_per_day: isLimitHealthTechFaculty ? (parseFloat(workloadLimits.min_tutorial_hours_per_day) || 0.0) : 0.0,
                    max_tutorial_hours_per_day: isLimitHealthTechFaculty ? (parseFloat(workloadLimits.max_tutorial_hours_per_day) || 0.0) : 0.0,
                    min_field_hours_per_day: isLimitHealthTechFaculty ? (parseFloat(workloadLimits.min_field_hours_per_day) || 0.0) : 0.0,
                    max_field_hours_per_day: isLimitHealthTechFaculty ? (parseFloat(workloadLimits.max_field_hours_per_day) || 0.0) : 0.0,
                    max_theory_hours_per_course: parseFloat(workloadLimits.max_theory_hours_per_course) || 0.0,
                    max_practical_hours_per_course: parseFloat(workloadLimits.max_practical_hours_per_course) || 0.0,
                    max_tutorial_hours_per_course: isLimitHealthTechFaculty ? (parseFloat(workloadLimits.max_tutorial_hours_per_course) || 0.0) : 0.0,
                    max_field_hours_per_course: isLimitHealthTechFaculty ? (parseFloat(workloadLimits.max_field_hours_per_course) || 0.0) : 0.0
                });
            }
            toast.success(`تم حفظ وتثبيت كافة القواعد (${ruleGroups.length}) لعدد (${totalSavedFaculties}) كلية بنجاح`);
        } catch (err) {
            console.error("Error saving workload limits", err);
            toast.error(err.response?.data?.detail || "حدث خطأ أثناء حفظ القواعد والمعادلات");
        } finally {
            setWorkloadLimitsSaving(false);
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

    const selectedUserObjs = useMemo(() => {
        return allUsers.filter(u => selectedUserIds.includes(u.id));
    }, [allUsers, selectedUserIds]);

    // For single user selection, show their hidden pages; for multi, show union
    const currentUserHiddenPages = useMemo(() => {
        if (selectedUserObjs.length === 1) return parseHiddenPages(selectedUserObjs[0]);
        if (selectedUserObjs.length > 1) {
            // Show pages hidden for ALL selected users (intersection)
            const allHidden = selectedUserObjs.map(u => parseHiddenPages(u));
            return allHidden.reduce((acc, curr) => acc.filter(id => curr.includes(id)), allHidden[0] || []);
        }
        return [];
    }, [selectedUserObjs]);

    const availablePagesToHide = useMemo(() => {
        if (selectedUserObjs.length <= 1) {
            return SIDEBAR_PAGES.filter(p => !currentUserHiddenPages.includes(p.id));
        }
        // For multi-user, show all pages (different users may have different hidden pages)
        return SIDEBAR_PAGES;
    }, [currentUserHiddenPages, selectedUserObjs]);

    const userSelectOptions = useMemo(() => {
        return allUsers
            .filter(u => u.id !== user?.id)
            .map(u => {
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
    }, [allUsers, faculties, user?.id]);

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
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: '#e8f5e9',
            borderRadius: '6px',
            border: '1px solid #c8e6c9',
            margin: '3px'
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: '#1b5e20',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            padding: '2px 8px'
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: '#1b5e20',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer',
            ':hover': {
                backgroundColor: '#ffcdd2',
                color: '#b71c1c'
            }
        })
    };

    const facultyRoleSelectStyles = {
        ...customSelectStyles,
        control: (base, state) => ({
            ...base,
            minHeight: '38px',
            borderRadius: '8px',
            borderColor: state.isFocused ? '#2563eb' : '#cbd5e1',
            boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(37, 99, 235, 0.2)' : 'none',
            '&:hover': { borderColor: '#2563eb' },
            direction: 'rtl',
            textAlign: 'right',
            backgroundColor: '#fff'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'transparent',
            color: state.isSelected ? '#fff' : '#1e3a8a',
            cursor: 'pointer',
            direction: 'rtl',
            textAlign: 'right',
            padding: '8px 12px',
            fontSize: '0.85rem'
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: '#eff6ff',
            borderRadius: '6px',
            border: '1px solid #bfdbfe',
            margin: '2px'
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: '#1d4ed8',
            fontWeight: 'bold',
            fontSize: '0.82rem',
            padding: '2px 6px'
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: '#1d4ed8',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer',
            ':hover': {
                backgroundColor: '#fee2e2',
                color: '#b91c1c'
            }
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };

    const assistantRoleSelectStyles = {
        ...customSelectStyles,
        control: (base, state) => ({
            ...base,
            minHeight: '38px',
            borderRadius: '8px',
            borderColor: state.isFocused ? '#10b981' : '#cbd5e1',
            boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(16, 185, 129, 0.2)' : 'none',
            '&:hover': { borderColor: '#10b981' },
            direction: 'rtl',
            textAlign: 'right',
            backgroundColor: '#fff'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#059669' : state.isFocused ? '#ecfdf5' : 'transparent',
            color: state.isSelected ? '#fff' : '#065f46',
            cursor: 'pointer',
            direction: 'rtl',
            textAlign: 'right',
            padding: '8px 12px',
            fontSize: '0.85rem'
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: '#ecfdf5',
            borderRadius: '6px',
            border: '1px solid #a7f3d0',
            margin: '2px'
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: '#047857',
            fontWeight: 'bold',
            fontSize: '0.82rem',
            padding: '2px 6px'
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: '#047857',
            borderRadius: '0 4px 4px 0',
            cursor: 'pointer',
            ':hover': {
                backgroundColor: '#fee2e2',
                color: '#b91c1c'
            }
        }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };

    const handleHidePage = async () => {
        if (!selectedUserIds || selectedUserIds.length === 0) {
            toast.error('يرجى اختيار مستخدم واحد على الأقل');
            return;
        }
        if (!selectedPageToHide || selectedPageToHide.length === 0) {
            toast.error('يرجى اختيار صفحة واحدة على الأقل من القائمة');
            return;
        }

        setHidingActionLoading(true);
        try {
            const selectedPageIds = selectedPageToHide.map(opt => opt.value);
            let totalNewCount = 0;
            let totalAlreadyCount = 0;
            const affectedUsernames = [];

            // Process each selected user
            for (const userId of selectedUserIds) {
                const targetUser = allUsers.find(u => u.id === userId);
                if (!targetUser) continue;
                const currentHidden = parseHiddenPages(targetUser);
                const newPageIds = selectedPageIds.filter(id => !currentHidden.includes(id));
                const alreadyCount = selectedPageIds.filter(id => currentHidden.includes(id)).length;
                totalAlreadyCount += alreadyCount;

                if (newPageIds.length === 0) continue;

                const newHidden = [...currentHidden, ...newPageIds];
                await axios.put(`${API}/api/users/${userId}/hidden-pages`, {
                    hidden_pages: newHidden
                });

                const updatedJson = JSON.stringify(newHidden);
                setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, hidden_pages: updatedJson } : u));
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, hidden_pages: updatedJson } : u));

                if (user && user.id === userId && setUser) {
                    setUser(prev => ({ ...prev, hidden_pages: updatedJson }));
                }

                totalNewCount += newPageIds.length;
                affectedUsernames.push(targetUser.username);
            }

            if (totalNewCount > 0) {
                const pageNames = selectedPageIds.map(id => {
                    const p = SIDEBAR_PAGES.find(x => x.id === id);
                    return p ? p.label : id;
                }).join('، ');
                if (affectedUsernames.length === 1) {
                    toast.success(`تم إخفاء ${totalNewCount > 1 ? 'الصفحات' : 'صفحة'} (${pageNames}) بنجاح عن ${affectedUsernames[0]}`);
                } else {
                    toast.success(`تم إخفاء (${pageNames}) بنجاح عن ${affectedUsernames.length} مستخدمين`);
                }
            } else if (totalAlreadyCount > 0) {
                toast.error('جميع الصفحات المختارة مخفية بالفعل عن المستخدمين المحددين');
            }

            setSelectedPageToHide([]);
        } catch (error) {
            console.error('Error hiding page', error);
            toast.error(error.response?.data?.detail || 'حدث خطأ أثناء إخفاء الصفحات');
        } finally {
            setHidingActionLoading(false);
        }
    };

    const handleUnhidePage = async (pageId, customUserId = null) => {
        const targetUserId = customUserId || (selectedUserIds.length === 1 ? selectedUserIds[0] : null);
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
        const targetId = userId || (selectedUserIds.length === 1 ? selectedUserIds[0] : null);
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

    // Filtered users for Permissions Table
    const filteredPermissionsUsers = useMemo(() => {
        return users.filter(u => {
            const q = permissionSearch.trim().toLowerCase();
            const matchesSearch = !q ||
                (u.username || '').toLowerCase().includes(q) ||
                (u.job_title || '').toLowerCase().includes(q);

            let matchesFaculty = true;
            if (permissionFacultyFilter) {
                if (permissionFacultyFilter === 'all') {
                    matchesFaculty = Boolean(u.all_faculties_access || u.role === 'admin' || u.role === 'student_affairs');
                } else {
                    const facId = permissionFacultyFilter;
                    matchesFaculty = Boolean(
                        String(u.faculty_id) === String(facId) ||
                        (u.assigned_faculties && u.assigned_faculties.some(f => String(f.id) === String(facId)))
                    );
                }
            }
            return matchesSearch && matchesFaculty;
        });
    }, [users, permissionSearch, permissionFacultyFilter]);

    // Filtered users for Hidden Pages Summary Table
    const filteredHiddenPagesUsers = useMemo(() => {
        return allUsers.filter(u => {
            const role = (u.role || '').toLowerCase();
            const isExcludedAdmin = role === 'admin' || role === 'super_admin' || u.is_super_admin || u.is_superuser;
            const hasHidden = parseHiddenPages(u).length > 0;
            if (isExcludedAdmin || !hasHidden) return false;

            const q = hiddenPagesSearch.trim().toLowerCase();
            if (!q) return true;
            return (u.username || '').toLowerCase().includes(q) ||
                (u.job_title || '').toLowerCase().includes(q) ||
                getFacultyName(u.faculty_id).toLowerCase().includes(q);
        });
    }, [allUsers, hiddenPagesSearch, faculties]);

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
            {/* Header Title */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                <div>
                    <h2 style={{ margin: 0, fontWeight: 'bold', color: '#1e3a29' }} className="d-flex align-items-center gap-3">
                        <span style={{ 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '12px', 
                            backgroundColor: '#e8f5e9', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#2e7d32'
                        }}>
                            <FaShieldAlt size={22} />
                        </span>
                        <span>لوحة التحكم وإدارة الصلاحيات</span>
                    </h2>
                    <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.9rem' }}>
                        إدارة صلاحيات مسؤولي الكليات، إخفاء صفحات القائمة الجانبية، وضوابط الأعباء التدريسية وتوزيع الأسابيع
                    </p>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="d-flex flex-wrap gap-2 mb-4 p-2 rounded-4 shadow-sm bg-white border" style={{ borderColor: '#e2e8f0' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('permissions')}
                    className={`btn d-flex align-items-center gap-2 px-4 py-2 fw-bold rounded-3 transition-all ${
                        activeTab === 'permissions' ? 'btn-success shadow-sm' : 'btn-light text-secondary border-0'
                    }`}
                    style={{ fontSize: '0.95rem' }}
                >
                    <FaShieldAlt />
                    <span>صلاحيات مسؤولي الكليات</span>
                    <Badge bg={activeTab === 'permissions' ? 'light' : 'success'} text={activeTab === 'permissions' ? 'dark' : 'white'} className="ms-1 rounded-pill">
                        {users.length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('hidden-pages')}
                    className={`btn d-flex align-items-center gap-2 px-4 py-2 fw-bold rounded-3 transition-all ${
                        activeTab === 'hidden-pages' ? 'btn-success shadow-sm' : 'btn-light text-secondary border-0'
                    }`}
                    style={{ fontSize: '0.95rem' }}
                >
                    <FaEyeSlash />
                    <span>إدارة إخفاء الصفحات</span>
                    <Badge bg={activeTab === 'hidden-pages' ? 'light' : 'warning'} text={activeTab === 'hidden-pages' ? 'dark' : 'dark'} className="ms-1 rounded-pill">
                        {allUsers.filter(u => parseHiddenPages(u).length > 0).length}
                    </Badge>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('workload-limits')}
                    className={`btn d-flex align-items-center gap-2 px-4 py-2 fw-bold rounded-3 transition-all ${
                        activeTab === 'workload-limits' ? 'btn-success shadow-sm' : 'btn-light text-secondary border-0'
                    }`}
                    style={{ fontSize: '0.95rem' }}
                >
                    <FaBalanceScale />
                    <span>قواعد الأعباء التدريسية</span>
                </button>

                {user?.role === 'admin' && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('academic-years')}
                        className={`btn d-flex align-items-center gap-2 px-4 py-2 fw-bold rounded-3 transition-all ${
                            activeTab === 'academic-years' ? 'btn-success shadow-sm' : 'btn-light text-secondary border-0'
                        }`}
                        style={{ fontSize: '0.95rem' }}
                    >
                        <i className="bi bi-calendar3"></i>
                        <span>توزيع أسابيع الأعوام الجامعية</span>
                        <Badge bg={activeTab === 'academic-years' ? 'light' : 'secondary'} text={activeTab === 'academic-years' ? 'dark' : 'white'} className="ms-1 rounded-pill">
                            {academicYears.length}
                        </Badge>
                    </button>
                )}
            </div>

            {/* TAB 1: صلاحيات مسؤولي الكليات */}
            {activeTab === 'permissions' && (
                <Card className="shadow-sm border-0 rounded-4 overflow-hidden mb-4">
                    <Card.Header className="bg-white border-bottom p-4">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div>
                                <h4 style={{ color: '#166534', fontWeight: 'bold', margin: 0 }}>
                                    مصفوفة صلاحيات مسؤولي الكليات
                                </h4>
                                <small className="text-muted">
                                    تفعيل أو تعطيل الأزرار والإجراءات الحساسة لكل مسؤول كلية بدقة
                                </small>
                            </div>

                            {/* Search & Faculty Filter Controls */}
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <InputGroup style={{ width: '260px' }}>
                                    <InputGroup.Text className="bg-white border-end-0">
                                        <FaSearch className="text-muted" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="بحث باسم المستخدم..."
                                        value={permissionSearch}
                                        onChange={(e) => setPermissionSearch(e.target.value)}
                                        className="border-start-0 ps-2"
                                        style={{ fontSize: '0.9rem' }}
                                    />
                                    {permissionSearch && (
                                        <Button variant="outline-secondary" size="sm" onClick={() => setPermissionSearch('')}>
                                            <FaTimes size={12} />
                                        </Button>
                                    )}
                                </InputGroup>

                                <Form.Select
                                    value={permissionFacultyFilter}
                                    onChange={(e) => setPermissionFacultyFilter(e.target.value)}
                                    style={{ width: '220px', fontSize: '0.9rem' }}
                                >
                                    <option value="">جميع الكليات والمسؤولين</option>
                                    <option value="all">كل من لديه وصول لجميع الكليات</option>
                                    {faculties.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </Form.Select>

                                {(permissionSearch || permissionFacultyFilter) && (
                                    <Button 
                                        variant="outline-secondary" 
                                        size="sm" 
                                        onClick={() => { setPermissionSearch(''); setPermissionFacultyFilter(''); }}
                                        title="إلغاء التصفية"
                                    >
                                        إلغاء الفلتر
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card.Header>

                    <Card.Body className="p-0">
                        <style>
                            {`
                            .sticky-col-1 { position: sticky; right: 0; z-index: 2; width: 190px; min-width: 190px; border-left: 2px solid #dee2e6; }
                            .sticky-col-2 { position: sticky; right: 190px; z-index: 2; width: 300px; min-width: 300px; border-left: 2px solid #dee2e6; }
                            thead .sticky-col-1, thead .sticky-col-2 { z-index: 3; }
                            tbody .sticky-col-1, tbody .sticky-col-2 { background-color: #fff; }
                            .table-striped > tbody > tr:nth-of-type(odd) > .sticky-col-1,
                            .table-striped > tbody > tr:nth-of-type(odd) > .sticky-col-2 {
                                background-color: #f8fafc;
                            }
                            .table-hover > tbody > tr:hover > .sticky-col-1,
                            .table-hover > tbody > tr:hover > .sticky-col-2 {
                                background-color: #f1f5f9;
                            }
                            .perm-header-group {
                                font-weight: bold;
                                font-size: 0.92rem;
                                padding: 8px 12px;
                                text-align: center;
                                letter-spacing: 0.2px;
                            }
                            `}
                        </style>
                        <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', margin: 0 }}>
                            <Table responsive striped bordered hover className="mb-0 text-center align-middle" style={{ width: 'max-content', minWidth: '100%' }}>
                                <thead>
                                    {/* Level 1 Grouped Headers */}
                                    <tr>
                                        <th rowSpan="2" className="sticky-col-1 bg-dark text-white" style={{ verticalAlign: 'middle', fontSize: '0.95rem' }}>
                                            اسم المستخدم
                                        </th>
                                        <th rowSpan="2" className="sticky-col-2 bg-dark text-white" style={{ verticalAlign: 'middle', fontSize: '0.95rem' }}>
                                            الكلية المخصصة
                                        </th>
                                        <th colSpan="6" className="perm-header-group" style={{ backgroundColor: '#15803d', color: '#ffffff' }}>
                                            📗 الخطة الدراسية والاعتماد (6 صلاحيات)
                                        </th>
                                        <th colSpan="4" className="perm-header-group" style={{ backgroundColor: '#0284c7', color: '#ffffff' }}>
                                            📘 أعضاء هيئة التدريس (4 صلاحيات)
                                        </th>
                                        <th colSpan="2" className="perm-header-group" style={{ backgroundColor: '#ea580c', color: '#ffffff' }}>
                                            📙 سلة المحذوفات (صلاحيتان)
                                        </th>
                                        <th colSpan="1" className="perm-header-group" style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}>
                                            📕 الأعباء
                                        </th>
                                    </tr>

                                    {/* Level 2 Sub-Headers */}
                                    <tr style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                        {/* الخطة الدراسية */}
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534', minWidth: '105px' }}>جدول الأساتذة</th>
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534', minWidth: '105px' }}>بيانات الأساتذة</th>
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534', minWidth: '95px' }}>إنهاء الخطة</th>
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534', minWidth: '95px' }}>مراجعة أولى</th>
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534', minWidth: '95px' }}>مراجعة ثانية</th>
                                        <th style={{ backgroundColor: '#f0fdf4', color: '#166534', minWidth: '95px' }}>اعتماد الخطة</th>

                                        {/* هيئة التدريس */}
                                        <th style={{ backgroundColor: '#f0f9ff', color: '#0369a1', minWidth: '85px' }}>الحذف</th>
                                        <th style={{ backgroundColor: '#f0f9ff', color: '#0369a1', minWidth: '85px' }}>الرؤية</th>
                                        <th style={{ backgroundColor: '#f0f9ff', color: '#0369a1', minWidth: '85px' }}>التصدير</th>
                                        <th style={{ backgroundColor: '#f0f9ff', color: '#0369a1', minWidth: '85px' }}>الاستيراد</th>

                                        {/* المحذوفات */}
                                        <th style={{ backgroundColor: '#fff7ed', color: '#c2410c', minWidth: '110px' }}>استرجاع المحذوف</th>
                                        <th style={{ backgroundColor: '#fff7ed', color: '#c2410c', minWidth: '105px' }}>الحذف النهائي</th>

                                        {/* الأعباء */}
                                        <th style={{ backgroundColor: '#faf5ff', color: '#6b21a8', minWidth: '105px' }}>تعديل الأعباء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPermissionsUsers.map((u) => (
                                        <tr key={u.id} style={{ height: '62px', whiteSpace: 'nowrap' }}>
                                            <td className="fw-bold text-center sticky-col-1">
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#0f172a' }}>
                                                    {u.username.split('@')[0]}
                                                </div>
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
                                                    let badgeStyle = { fontSize: '10.5px', padding: '3px 8px', fontWeight: 'bold' };

                                                    if (u.role === 'admin' || jobTitle.includes('Super Admin') || jobTitle.includes('مدير عام')) {
                                                        badgeBg = 'bg-danger text-white';
                                                    } else if (u.role === 'manager' || jobTitle.includes('عميد') || jobTitle.includes('نائب') || jobTitle.includes('مدير إدارة')) {
                                                        badgeBg = 'text-white';
                                                        badgeStyle.backgroundColor = '#0d9488';
                                                    } else if (u.role === 'student_affairs') {
                                                        badgeBg = 'bg-warning text-dark';
                                                    } else if (u.role === 'reviewer' || jobTitle.includes('المراجع')) {
                                                        badgeBg = 'text-white';
                                                        badgeStyle.backgroundColor = '#8b5cf6';
                                                    } else if (jobTitle.includes('هيئة تدريس') || u.role === 'faculty_professor') {
                                                        badgeBg = 'text-white';
                                                        badgeStyle.backgroundColor = '#16a34a';
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
                                            <td className="sticky-col-2" style={{ whiteSpace: 'normal', padding: '8px' }}>
                                                <div className="fw-bold" style={{ color: '#1e293b', fontSize: '12.5px', lineHeight: '1.4' }}>
                                                    {u.all_faculties_access || u.role === 'admin' || u.role === 'student_affairs' ? (
                                                        <span className="text-success fw-bold">جميع الكليات بالجامعة</span>
                                                    ) : u.assigned_faculties && u.assigned_faculties.length > 0 ? (
                                                        <div className="d-flex flex-wrap gap-1 justify-content-center align-items-center w-100">
                                                            {u.assigned_faculties.map(f => (
                                                                <span key={f.id} className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '11px' }}>
                                                                    {f.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        u.faculty_id ? getFacultyName(u.faculty_id) : "غير محدد"
                                                    )}
                                                </div>
                                            </td>

                                            {/* الخطة الدراسية (6 switches) */}
                                            <td style={{ backgroundColor: '#f0fdf4' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_view_prof_study_plan}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_view_prof_study_plan', u.perm_view_prof_study_plan)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#f0fdf4' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_view_prof_data_btn}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_view_prof_data_btn', u.perm_view_prof_data_btn)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#f0fdf4' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_finish_plan}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_finish_plan', u.perm_finish_plan)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#f0fdf4' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_review_1}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_review_1', u.perm_review_1)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#f0fdf4' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_review_2}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_review_2', u.perm_review_2)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#f0fdf4' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_approve_plan}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_approve_plan', u.perm_approve_plan)}
                                                />
                                            </td>

                                            {/* هيئة التدريس (4 switches) */}
                                            <td style={{ backgroundColor: '#f0f9ff' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_view_prof_delete_btn}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_view_prof_delete_btn', u.perm_view_prof_delete_btn)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#f0f9ff' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_view_prof_view_btn}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_view_prof_view_btn', u.perm_view_prof_view_btn)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#f0f9ff' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_view_prof_print_btn}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_view_prof_print_btn', u.perm_view_prof_print_btn)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#f0f9ff' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_view_prof_import_btn}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_view_prof_import_btn', u.perm_view_prof_import_btn)}
                                                />
                                            </td>

                                            {/* المحذوفات (2 switches) */}
                                            <td style={{ backgroundColor: '#fff7ed' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_recycle_restore_btn}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_recycle_restore_btn', u.perm_recycle_restore_btn)}
                                                />
                                            </td>
                                            <td style={{ backgroundColor: '#fff7ed' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_recycle_delete_btn}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_recycle_delete_btn', u.perm_recycle_delete_btn)}
                                                />
                                            </td>

                                            {/* الأعباء (1 switch) */}
                                            <td style={{ backgroundColor: '#faf5ff' }}>
                                                <Form.Check 
                                                    type="switch"
                                                    className="d-inline-block"
                                                    checked={u.perm_view_professors_load}
                                                    onChange={() => handleTogglePermission(u.id, 'perm_view_professors_load', u.perm_view_professors_load)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPermissionsUsers.length === 0 && (
                                        <tr style={{ height: '100px' }}>
                                            <td colSpan="15" className="text-muted text-center py-4">
                                                لا توجد نتائج مطابقة لبحث الصلاحيات.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {/* TAB 2: إدارة إخفاء الصفحات عن المستخدمين */}
            {activeTab === 'hidden-pages' && (
                <Card className="shadow-sm border-0 rounded-4 overflow-hidden mb-4">
                    <Card.Header className="bg-white border-bottom p-4">
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
                                <h4 style={{ margin: 0, fontWeight: 'bold', color: '#166534' }}>
                                    إدارة إخفاء الصفحات عن المستخدمين (القائمة الجانبية)
                                </h4>
                                <small className="text-muted">
                                    حدد المستخدمين والصفحات المراد حجبها من القائمة الجانبية لديهم، أو اضغط على الشارة لإلغاء الحجب مباشرة
                                </small>
                            </div>
                        </div>
                    </Card.Header>

                    <Card.Body className="p-4">
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
                                            isMulti
                                            options={userSelectOptions}
                                            value={userSelectOptions.filter(opt => selectedUserIds.includes(opt.value))}
                                            onChange={(opts) => {
                                                setSelectedUserIds(opts ? opts.map(o => o.value) : []);
                                                setSelectedPageToHide([]);
                                            }}
                                            placeholder="ابحث باسم المستخدم أو وظيفته أو كليته..."
                                            isClearable
                                            isSearchable
                                            closeMenuOnSelect={false}
                                            noOptionsMessage={() => "لا يوجد مستخدم مطابق"}
                                            styles={{
                                                ...customSelectStyles,
                                                multiValue: (base) => ({ ...base, backgroundColor: '#e8f5e9', borderRadius: '6px' }),
                                                multiValueLabel: (base) => ({ ...base, color: '#2e7d32', fontWeight: '600', fontSize: '0.85rem' }),
                                                multiValueRemove: (base) => ({ ...base, color: '#c62828', ':hover': { backgroundColor: '#ffebee', color: '#c62828' } }),
                                            }}
                                        />
                                    </Form.Group>
                                </Col>

                                {/* اختيار الصفحات من الـ Sidebar */}
                                <Col lg={4} md={6} xs={12}>
                                    <Form.Group>
                                        <Form.Label className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ color: '#1e293b' }}>
                                            <FaListUl className="text-primary" />
                                            <span>اختر الصفحة في القائمة الجانبية:</span>
                                        </Form.Label>
                                        <Select
                                            isMulti
                                            isDisabled={selectedUserIds.length === 0}
                                            value={selectedPageToHide}
                                            onChange={(opts) => setSelectedPageToHide(opts || [])}
                                            options={availablePagesToHide.map(p => ({ value: p.id, label: `${p.icon} ${p.label}` }))}
                                            placeholder="-- اختر صفحة أو أكثر لإخفائها --"
                                            noOptionsMessage={() => "لا توجد صفحات متاحة للإخفاء"}
                                            closeMenuOnSelect={false}
                                            styles={{
                                                control: (base, state) => ({
                                                    ...base,
                                                    minHeight: '44px',
                                                    borderRadius: '10px',
                                                    borderColor: state.isFocused ? '#66bb6a' : '#ced4da',
                                                    boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(102,187,106,0.25)' : 'none',
                                                    fontSize: '0.92rem',
                                                    fontWeight: '500',
                                                    direction: 'rtl',
                                                }),
                                                menu: (base) => ({ ...base, zIndex: 9999, direction: 'rtl', textAlign: 'right' }),
                                                placeholder: (base) => ({ ...base, color: '#6c757d' }),
                                                multiValue: (base) => ({ ...base, backgroundColor: '#e8f5e9', borderRadius: '6px' }),
                                                multiValueLabel: (base) => ({ ...base, color: '#2e7d32', fontWeight: '600' }),
                                                multiValueRemove: (base) => ({ ...base, color: '#c62828', ':hover': { backgroundColor: '#ffebee', color: '#c62828' } }),
                                                option: (base, state) => ({
                                                    ...base,
                                                    backgroundColor: state.isSelected ? '#388e3c' : state.isFocused ? '#e8f5e9' : 'white',
                                                    color: state.isSelected ? 'white' : '#1e293b',
                                                    textAlign: 'right',
                                                    direction: 'rtl',
                                                }),
                                            }}
                                        />
                                    </Form.Group>
                                </Col>

                                {/* زر إخفاء الصفحة */}
                                <Col lg={3} md={12} xs={12}>
                                    <Button
                                        variant="danger"
                                        onClick={handleHidePage}
                                        disabled={selectedUserIds.length === 0 || selectedPageToHide.length === 0 || hidingActionLoading}
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
                                                <span>{selectedPageToHide.length > 1 ? `إخفاء ${selectedPageToHide.length} صفحات` : 'إخفاء الصفحة للمستخدم'}</span>
                                            </>
                                        )}
                                    </Button>
                                </Col>
                            </Row>
                        </div>

                        {/* حالة المستخدمين المختارين والصفحات المخفية عنهم */}
                        {selectedUserObjs.length > 0 && (
                            <div className="p-3 mb-4 rounded-3 border" style={{ backgroundColor: '#ffffff' }}>
                                {selectedUserObjs.map(userObj => {
                                    const userHiddenPages = parseHiddenPages(userObj);
                                    return (
                                        <div key={userObj.id} className={`${selectedUserObjs.length > 1 ? 'mb-3 pb-3 border-bottom' : ''}`}>
                                            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-success px-3 py-2 fs-6 fw-bold rounded-pill">
                                                        المستخدم: {userObj.username}
                                                    </span>
                                                    <span className="badge bg-light text-dark border px-3 py-2 fs-6">
                                                        {userObj.job_title || userObj.role}
                                                    </span>
                                                    {userObj.faculty_id && (
                                                        <span className="badge bg-light text-secondary border px-3 py-2 fs-6">
                                                            {getFacultyName(userObj.faculty_id)}
                                                        </span>
                                                    )}
                                                </div>
                                                {userHiddenPages.length > 0 && (
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => handleUnhideAllForUser(userObj.id)}
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
                                                    <Badge bg={userHiddenPages.length > 0 ? "warning" : "success"} text={userHiddenPages.length > 0 ? "dark" : "white"}>
                                                        {userHiddenPages.length}
                                                    </Badge>
                                                </h6>

                                                {userHiddenPages.length === 0 ? (
                                                    <div className="alert alert-success d-flex align-items-center gap-2 mb-0 py-2 px-3" role="alert">
                                                        <FaCheckCircle className="text-success fs-5 flex-shrink-0" />
                                                        <div>
                                                            <strong>جميع صفحات القائمة الجانبية ظاهرة</strong> لهذا المستخدم حالياً ولا توجد أي صفحات مخفية عنه.
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-wrap gap-2">
                                                        {userHiddenPages.map(pageId => {
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
                                                                        onClick={() => handleUnhidePage(pageId, userObj.id)}
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
                                    );
                                })}
                            </div>
                        )}

                        {/* جدول ملخص لجميع المستخدمين الذين لديهم صفحات مخفية */}
                        <div className="mt-4">
                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                                <div>
                                    <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                        <FaEyeSlash className="text-danger" />
                                        <span>سجل المستخدمين الذين لديهم صفحات مخفية</span>
                                    </h6>
                                    <small className="text-muted">اضغط على علامة (×) بجوار أي صفحة لإظهارها فوراً للمستخدم</small>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <InputGroup style={{ width: '250px' }}>
                                        <InputGroup.Text className="bg-white border-end-0">
                                            <FaSearch className="text-muted" />
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="بحث في السجل..."
                                            value={hiddenPagesSearch}
                                            onChange={(e) => setHiddenPagesSearch(e.target.value)}
                                            className="border-start-0 ps-2"
                                            style={{ fontSize: '0.88rem' }}
                                        />
                                    </InputGroup>
                                    <Badge bg="secondary" className="px-3 py-2 fs-6">
                                        {filteredHiddenPagesUsers.length} مستخدم
                                    </Badge>
                                </div>
                            </div>
                            <div className="table-responsive rounded-3 border">
                                <Table hover className="mb-0 align-middle text-center">
                                    <thead className="bg-light">
                                        <tr style={{ borderBottom: '2px solid #e2e8f0', fontSize: '0.9rem' }}>
                                            <th style={{ width: '50px' }}>#</th>
                                            <th style={{ textAlign: 'right', paddingRight: '15px' }}>المستخدم</th>
                                            <th>الوظيفة / الصفة</th>
                                            <th>الكلية</th>
                                            <th>الصفحات المخفية (اضغط × للحذف السريع)</th>
                                            <th style={{ width: '130px' }}>إجراء شامل</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHiddenPagesUsers.map((u, index) => {
                                            const hiddenList = parseHiddenPages(u);
                                            return (
                                                <tr key={u.id}>
                                                    <td className="fw-bold" style={{ color: '#64748b' }}>{index + 1}</td>
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
                                                                        className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 d-inline-flex align-items-center gap-1"
                                                                        style={{ fontSize: '0.8rem' }}
                                                                    >
                                                                        <span>{pObj ? pObj.label : pId}</span>
                                                                        <span 
                                                                            onClick={() => handleUnhidePage(pId, u.id)}
                                                                            title={`إظهار صفحة ${pObj ? pObj.label : pId}`}
                                                                            style={{ cursor: 'pointer', fontWeight: 'bold', marginRight: '3px' }}
                                                                            className="text-danger"
                                                                        >
                                                                            &times;
                                                                        </span>
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
                                        {filteredHiddenPagesUsers.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted py-4">
                                                    لا توجد صفحات مخفية مطابقة للبحث حالياً.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            )}
            {/* TAB 3: بطاقة حدود ساعات العمل في اليوم وضوابط الانتداب */}
            {activeTab === 'workload-limits' && (
            <Card className="shadow-sm border-0 mt-2" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
                <Card.Header className="bg-white border-0 pt-4 pb-2 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div className="d-flex align-items-center gap-2 text-success">
                            <FaBalanceScale className="fs-4" />
                            <h4 style={{ color: '#2e7d32', fontWeight: 'bold', margin: 0 }}>
                                حدود ساعات العمل في اليوم وضوابط الانتداب
                            </h4>
                        </div>
                        <small className="text-muted">
                            تحديد الحد الأقصى لساعات العمل اليومية لأعضاء هيئة التدريس والهيئة المعاونة وتفصيل الساعات حسب الكلية وقواعد الانتداب
                        </small>
                    </div>
                    {isLimitHealthTechFaculty && (
                        <Badge bg="info" className="px-3 py-2 fs-6">
                            تكنولوجيا العلوم الصحية (نظري، عملي، توتوريال، حقل)
                        </Badge>
                    )}
                </Card.Header>
                <Card.Body className="px-4 pb-4">
                    {/* شريط الفلاتر: العام الجامعي، الفصل الدراسي */}
                    <div className="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Row className="g-3 align-items-end">
                            <Col md={6}>
                                <Form.Label className="fw-bold small text-muted">📅 العام الجامعي:</Form.Label>
                                <Select
                                    options={academicYears.map(y => ({ value: y.name, label: y.name }))}
                                    value={selectedLimitYear ? { value: selectedLimitYear, label: selectedLimitYear } : null}
                                    onChange={(opt) => setSelectedLimitYear(opt ? opt.value : "")}
                                    placeholder="-- اختر العام الجامعي --"
                                    styles={customSelectStyles}
                                    isSearchable
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Label className="fw-bold small text-muted">🗓️ الفصل الدراسي:</Form.Label>
                                <Select
                                    options={[
                                        { value: "الفصل الدراسي الأول", label: "الفصل الدراسي الأول" },
                                        { value: "الفصل الدراسي الثاني", label: "الفصل الدراسي الثاني" },
                                        { value: "الفصل الدراسي الصيفي", label: "الفصل الدراسي الصيفي" }
                                    ]}
                                    value={selectedLimitSemester ? { value: selectedLimitSemester, label: selectedLimitSemester } : null}
                                    onChange={(opt) => setSelectedLimitSemester(opt ? opt.value : "الفصل الدراسي الأول")}
                                    styles={customSelectStyles}
                                    isSearchable={false}
                                />
                            </Col>
                        </Row>
                    </div>

                    {workloadLimitsLoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="success" />
                            <p className="mt-2 text-muted">جاري تحميل حدود الساعات والمعادلات...</p>
                        </div>
                    ) : (
                        <Form onSubmit={handleSaveWorkloadLimits}>
                            {/* القسم الرئيسي 1: قواعد ومعادلات احتساب الأعباء لعدة مجموعات من الكليات */}
                            <div className="mb-4">
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3 p-3 rounded-4 bg-white border shadow-xs">
                                    <div>
                                        <div className="d-flex align-items-center gap-2 text-success">
                                            <span style={{ fontSize: '1.3rem' }}>⚡</span>
                                            <h5 className="fw-bold text-success mb-0">
                                                قواعد ومعادلات احتساب الحد الأقصى للانتداب (حسب الكليات)
                                            </h5>
                                        </div>
                                        <small className="text-muted">
                                            يمكنك ضبط معادلة عامة لمعظم الكليات، وإضافة قواعد مخصصة لكليات أخرى 
                                        </small>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="success"
                                        size="sm"
                                        className="d-flex align-items-center gap-2 fw-bold px-3 py-2 shadow-sm rounded-pill"
                                        onClick={handleAddRuleGroup}
                                    >
                                        <FaPlus /> <span>إضافة قاعدة ومعادلة جديدة لكليات أخرى</span>
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="success"
                                        size="sm"
                                        className="d-flex align-items-center gap-2 fw-bold px-3 py-2 shadow-sm rounded-pill"
                                        disabled={workloadLimitsSaving}
                                    >
                                        {workloadLimitsSaving ? <Spinner size="sm" /> : <FaSave />}
                                        <span>حفظ القواعد</span>
                                    </Button>
                                </div>

                                {/* بطاقات القواعد المختلفة */}
                                {ruleGroups.map((group, gIdx) => {
                                    const isHealthTechInGroup = (group.faculties || []).some(f => (f.label || "").includes("العلوم الصحية") || (f.label || "").includes("تكنولوجيا العلوم"));
                                    const isNursingInGroup = (group.faculties || []).some(f => (f.label || "").includes("التمريض"));

                                    return (
                                        <div
                                            key={group.id}
                                            className="p-3 p-md-4 rounded-4 mb-4 border shadow-sm"
                                            style={{
                                                backgroundColor: gIdx === 0 ? '#f0fdf4' : (gIdx % 2 === 1 ? '#f8fafc' : '#fefce8'),
                                                borderColor: gIdx === 0 ? '#86efac' : (gIdx % 2 === 1 ? '#cbd5e1' : '#fde047'),
                                                borderWidth: '2px'
                                            }}
                                        >
                                            {/* رأس بطاقة القاعدة */}
                                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-3 border-bottom" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge rounded-circle p-2 fs-6 bg-success text-white shadow-xs" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {gIdx + 1}
                                                    </span>
                                                    <div>
                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                            <h5 className="fw-bold mb-0 text-dark">
                                                                {group.title || `القاعدة ${gIdx + 1}`}
                                                            </h5>
                                                            {isHealthTechInGroup && (
                                                                <Badge bg="info" className="px-2 py-1">🔬 تكنولوجيا العلوم الصحية</Badge>
                                                            )}
                                                            {isNursingInGroup && (
                                                                <Badge bg="primary" className="px-2 py-1">🩺 التمريض</Badge>
                                                            )}
                                                        </div>
                                                        <small className="text-muted" style={{ fontSize: '0.82rem' }}>
                                                            قاعدة ومعادلات احتساب مخصصة لمجموعة الكليات المحددة أدناه
                                                        </small>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center gap-2">
                                                    {ruleGroups.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="outline-danger"
                                                            size="sm"
                                                            className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill fw-bold shadow-xs"
                                                            onClick={() => handleRemoveRuleGroup(group.id)}
                                                            title="حذف هذه القاعدة"
                                                        >
                                                            <FaTrash size={12} /> <span>حذف هذه القاعدة</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* اختيار الكليات التابعة لهذه القاعدة */}
                                            <div className="p-3 rounded-3 bg-white border mb-3 shadow-xs">
                                                <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="fw-bold text-dark fs-6">🏛️ الكليات المطبق عليها هذه القاعدة:</span>
                                                        <Badge bg={group.faculties?.length > 0 ? "success" : "danger"} className="px-2 py-1">
                                                            تم اختيار {group.faculties?.length || 0} كلية
                                                        </Badge>
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline-success"
                                                            className="fw-bold px-2 py-1"
                                                            style={{ fontSize: '0.8rem' }}
                                                            onClick={() => {
                                                                const otherAssigned = new Set(
                                                                    ruleGroups
                                                                        .filter(og => og.id !== group.id)
                                                                        .flatMap(og => (og.faculties || []).map(f => String(f.value)))
                                                                );
                                                                const available = accessibleLimitFaculties
                                                                    .filter(f => !otherAssigned.has(String(f.id)))
                                                                    .map(f => ({ value: String(f.id), label: f.name }));
                                                                handleUpdateRuleGroup(group.id, 'faculties', available);
                                                            }}
                                                        >
                                                            ✓ تحديد الكليات المتبقية
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline-secondary"
                                                            className="px-2 py-1"
                                                            style={{ fontSize: '0.8rem' }}
                                                            onClick={() => handleUpdateRuleGroup(group.id, 'faculties', [])}
                                                        >
                                                            ✕ إلغاء التحديد
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Select
                                                    isMulti
                                                    options={accessibleLimitFaculties.map(f => ({ value: String(f.id), label: f.name }))}
                                                    value={group.faculties || []}
                                                    onChange={(opts) => handleUpdateRuleGroup(group.id, 'faculties', opts || [])}
                                                    placeholder="-- اضغط لاختيار الكليات التي تنطبق عليها هذه القاعدة --"
                                                    closeMenuOnSelect={false}
                                                    styles={customSelectStyles}
                                                    isSearchable
                                                />
                                                <small className="text-muted d-block mt-2" style={{ fontSize: '0.82rem' }}>
                                                    💡 يمكنك اختيار كلية واحدة محددة أو مجموعة كليات لتنطبق عليها المعادلات المحددة أدناه.
                                                </small>
                                            </div>

                                            {/* حقول المعادلات الديناميكية وزر الساعات لهذه القاعدة */}
                                            <Row className="g-3">
                                                {/* أعضاء هيئة التدريس */}
                                                <Col md={6}>
                                                    <div className="p-3 rounded-3 bg-white border h-100 shadow-xs d-flex flex-column justify-content-between">
                                                        <div>
                                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                                <span className="fw-bold text-dark fs-6">👨‍🏫 أعضاء هيئة التدريس</span>
                                                                <Badge bg="primary" className="px-2 py-1">
                                                                    {(group.facultyRoles || DEFAULT_FACULTY_ROLES).length} رتب محددة
                                                                </Badge>
                                                            </div>

                                                            {/* أداة اختيار وتحديد الوظائف والدرجات العلمية ديناميكياً (Droplist مع Multiple Selection) */}
                                                            <div className="p-2 rounded-3 mb-2 border" style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }}>
                                                                <div className="d-flex align-items-center justify-content-between mb-1">
                                                                    <small className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>
                                                                        🎯 الوظائف والدرجات العلمية المشمولة بالمعادلة (Multiple Selection):
                                                                    </small>
                                                                    <Badge bg="primary" className="fw-normal" style={{ fontSize: '0.72rem' }}>
                                                                        {(group.facultyRoles || DEFAULT_FACULTY_ROLES).length} مختارة
                                                                    </Badge>
                                                                </div>
                                                                <Select
                                                                    isMulti
                                                                    options={ACADEMIC_ROLE_OPTIONS}
                                                                    value={ACADEMIC_ROLE_OPTIONS.filter(opt => (group.facultyRoles || DEFAULT_FACULTY_ROLES).includes(opt.value))}
                                                                    onChange={(selected) => {
                                                                        const vals = selected ? selected.map(s => s.value) : [];
                                                                        if (vals.length === 0) {
                                                                            toast.error("يجب اختيار وظيفة أو درجة علمية واحدة على الأقل لأعضاء هيئة التدريس");
                                                                            return;
                                                                        }
                                                                        handleUpdateRuleGroup(group.id, 'facultyRoles', vals);
                                                                    }}
                                                                    styles={facultyRoleSelectStyles}
                                                                    placeholder="اختر الوظائف أو الدرجات العلمية لأعضاء هيئة التدريس..."
                                                                    noOptionsMessage={() => "لا توجد خيارات"}
                                                                    closeMenuOnSelect={false}
                                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                                    isSearchable
                                                                />
                                                                <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                                                                    💡 يطبق فحص الحد الأقصى (Validation) لهذه المعادلة على أصحاب الوظائف المختارة أعلاه.
                                                                </small>
                                                            </div>

                                                            <p className="text-muted small mb-2" style={{ fontSize: '0.8rem' }}>
                                                                المعادلة تطبق على: <strong className="text-primary">{(group.facultyRoles || DEFAULT_FACULTY_ROLES).join('، ')}</strong>
                                                            </p>

                                                            {/* شريط الأدوات: زر الساعات والعمليات السريعة */}
                                                            <div className="p-2 rounded-2 mb-2 border" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                                                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-2">
                                                                    <Dropdown>
                                                                        <Dropdown.Toggle
                                                                            variant="primary"
                                                                            size="sm"
                                                                            className="d-flex align-items-center gap-1 rounded-2 fw-bold shadow-sm"
                                                                            style={{ fontSize: '0.82rem' }}
                                                                        >
                                                                            <FaClock />
                                                                            <span>⏱️ زر الساعات (إدراج متغير) ▾</span>
                                                                        </Dropdown.Toggle>
                                                                        <Dropdown.Menu className="shadow-lg border-0 p-2" style={{ maxHeight: '350px', overflowY: 'auto', minWidth: '280px', zIndex: 1050 }}>
                                                                            <Dropdown.Header className="fw-bold text-primary border-bottom pb-1 mb-1">
                                                                                اضغط على المتغير لإدراجه داخل المعادلة:
                                                                            </Dropdown.Header>
                                                                            {HOUR_VARIABLES.map(v => (
                                                                                <Dropdown.Item
                                                                                    key={v.token}
                                                                                    onClick={() => insertTokenInGroup(group.id, 'faculty', v.token)}
                                                                                    className="py-2 px-2 rounded-2 d-flex align-items-center justify-content-between text-end"
                                                                                    style={{ fontSize: '0.86rem' }}
                                                                                >
                                                                                    <div>
                                                                                        <div className="fw-bold text-dark">{v.icon} {v.label}</div>
                                                                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>{v.desc}</small>
                                                                                    </div>
                                                                                    <Badge bg="light" text="dark" className="border ms-2 font-monospace">
                                                                                        {v.token}
                                                                                    </Badge>
                                                                                </Dropdown.Item>
                                                                            ))}
                                                                        </Dropdown.Menu>
                                                                    </Dropdown>

                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline-secondary"
                                                                        className="d-flex align-items-center gap-1 rounded-2 py-1 px-2"
                                                                        style={{ fontSize: '0.78rem' }}
                                                                        onClick={() => handleUpdateRuleGroup(group.id, 'facultyFormula', DEFAULT_FACULTY_FORMULA)}
                                                                        title="استعادة المعادلة الافتراضية"
                                                                    >
                                                                        <FaUndo /> <span>استعادة الافتراضي</span>
                                                                    </Button>
                                                                </div>

                                                                {/* أزرار العمليات الرياضية السريعة */}
                                                                <div className="d-flex flex-wrap align-items-center gap-1">
                                                                    <small className="text-muted fw-bold me-1" style={{ fontSize: '0.75rem' }}>عمليات سريعة:</small>
                                                                    {MATH_OPERATORS.map(op => (
                                                                        <Button
                                                                            key={op.label}
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="light"
                                                                            className="border fw-bold px-2 py-0 font-monospace text-primary shadow-xs"
                                                                            style={{ fontSize: '0.82rem', minWidth: '28px', height: '26px' }}
                                                                            onClick={() => insertTokenInGroup(group.id, 'faculty', op.token)}
                                                                            title={`إدراج ${op.label}`}
                                                                        >
                                                                            {op.label}
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* حقل المعادلة الديناميكي */}
                                                            <Form.Group>
                                                                <Form.Label className="small text-muted fw-bold mb-1">
                                                                    صيغة المعادلة الرياضية المعتمدة:
                                                                </Form.Label>
                                                                <Form.Control
                                                                    as="textarea"
                                                                    rows={2}
                                                                    id={`formula-faculty-${group.id}`}
                                                                    value={group.facultyFormula || ''}
                                                                    onChange={(e) => handleUpdateRuleGroup(group.id, 'facultyFormula', e.target.value)}
                                                                    className="font-monospace fw-bold fs-6 p-2 rounded-3 border-2"
                                                                    dir="ltr"
                                                                    style={{
                                                                        textAlign: 'left',
                                                                        borderColor: '#3b82f6',
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#1e3a8a',
                                                                        letterSpacing: '0.3px'
                                                                    }}
                                                                    placeholder={DEFAULT_FACULTY_FORMULA}
                                                                />
                                                            </Form.Group>
                                                        </div>
                                                        <small className="text-muted d-block mt-2 pt-2 border-top" style={{ fontSize: '0.78rem' }}>
                                                            ℹ️ اكتب المعادلة مع رمز المقارنة (<code>&lt;=</code>). الطرف الأيسر هو العبء المحتسب، والطرف الأيمن هو الحد الأقصى المسموح.
                                                        </small>
                                                    </div>
                                                </Col>

                                                {/* الهيئة المعاونة */}
                                                <Col md={6}>
                                                    <div className="p-3 rounded-3 bg-white border h-100 shadow-xs d-flex flex-column justify-content-between">
                                                        <div>
                                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                                <span className="fw-bold text-dark fs-6">🧑‍🔬 الهيئة المعاونة</span>
                                                                <Badge bg="success" className="px-2 py-1">
                                                                    {(group.assistantRoles || DEFAULT_ASSISTANT_ROLES).length} رتب محددة
                                                                </Badge>
                                                            </div>

                                                            {/* أداة اختيار وتحديد الوظائف والدرجات العلمية للهيئة المعاونة ديناميكياً (Droplist مع Multiple Selection) */}
                                                            <div className="p-2 rounded-3 mb-2 border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                                                <div className="d-flex align-items-center justify-content-between mb-1">
                                                                    <small className="fw-bold text-dark" style={{ fontSize: '0.8rem' }}>
                                                                        🎯 الوظائف والدرجات العلمية المشمولة بالمعادلة (Multiple Selection):
                                                                    </small>
                                                                    <Badge bg="success" className="fw-normal" style={{ fontSize: '0.72rem' }}>
                                                                        {(group.assistantRoles || DEFAULT_ASSISTANT_ROLES).length} مختارة
                                                                    </Badge>
                                                                </div>
                                                                <Select
                                                                    isMulti
                                                                    options={ACADEMIC_ROLE_OPTIONS}
                                                                    value={ACADEMIC_ROLE_OPTIONS.filter(opt => (group.assistantRoles || DEFAULT_ASSISTANT_ROLES).includes(opt.value))}
                                                                    onChange={(selected) => {
                                                                        const vals = selected ? selected.map(s => s.value) : [];
                                                                        if (vals.length === 0) {
                                                                            toast.error("يجب اختيار وظيفة أو درجة علمية واحدة على الأقل للهيئة المعاونة");
                                                                            return;
                                                                        }
                                                                        handleUpdateRuleGroup(group.id, 'assistantRoles', vals);
                                                                    }}
                                                                    styles={assistantRoleSelectStyles}
                                                                    placeholder="اختر الوظائف أو الدرجات العلمية للهيئة المعاونة..."
                                                                    noOptionsMessage={() => "لا توجد خيارات"}
                                                                    closeMenuOnSelect={false}
                                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                                    isSearchable
                                                                />
                                                                <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                                                                    💡 يطبق فحص الحد الأقصى (Validation) لهذه المعادلة على أصحاب الوظائف المختارة أعلاه.
                                                                </small>
                                                            </div>

                                                            <p className="text-muted small mb-2" style={{ fontSize: '0.8rem' }}>
                                                                المعادلة تطبق على: <strong className="text-success">{(group.assistantRoles || DEFAULT_ASSISTANT_ROLES).join('، ')}</strong>
                                                            </p>

                                                            {/* شريط الأدوات: زر الساعات والعمليات السريعة */}
                                                            <div className="p-2 rounded-2 mb-2 border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-2">
                                                                    <Dropdown>
                                                                        <Dropdown.Toggle
                                                                            variant="success"
                                                                            size="sm"
                                                                            className="d-flex align-items-center gap-1 rounded-2 fw-bold shadow-sm"
                                                                            style={{ fontSize: '0.82rem' }}
                                                                        >
                                                                            <FaClock />
                                                                            <span>⏱️ زر الساعات (إدراج متغير) ▾</span>
                                                                        </Dropdown.Toggle>
                                                                        <Dropdown.Menu className="shadow-lg border-0 p-2" style={{ maxHeight: '350px', overflowY: 'auto', minWidth: '280px', zIndex: 1050 }}>
                                                                            <Dropdown.Header className="fw-bold text-success border-bottom pb-1 mb-1">
                                                                                اضغط على المتغير لإدراجه داخل المعادلة:
                                                                            </Dropdown.Header>
                                                                            {HOUR_VARIABLES.map(v => (
                                                                                <Dropdown.Item
                                                                                    key={v.token}
                                                                                    onClick={() => insertTokenInGroup(group.id, 'assistant', v.token)}
                                                                                    className="py-2 px-2 rounded-2 d-flex align-items-center justify-content-between text-end"
                                                                                    style={{ fontSize: '0.86rem' }}
                                                                                >
                                                                                    <div>
                                                                                        <div className="fw-bold text-dark">{v.icon} {v.label}</div>
                                                                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>{v.desc}</small>
                                                                                    </div>
                                                                                    <Badge bg="light" text="dark" className="border ms-2 font-monospace">
                                                                                        {v.token}
                                                                                    </Badge>
                                                                                </Dropdown.Item>
                                                                            ))}
                                                                        </Dropdown.Menu>
                                                                    </Dropdown>

                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline-secondary"
                                                                        className="d-flex align-items-center gap-1 rounded-2 py-1 px-2"
                                                                        style={{ fontSize: '0.78rem' }}
                                                                        onClick={() => handleUpdateRuleGroup(group.id, 'assistantFormula', DEFAULT_ASSISTANT_FORMULA)}
                                                                        title="استعادة المعادلة الافتراضية"
                                                                    >
                                                                        <FaUndo /> <span>استعادة الافتراضي</span>
                                                                    </Button>
                                                                </div>

                                                                {/* أزرار العمليات الرياضية السريعة */}
                                                                <div className="d-flex flex-wrap align-items-center gap-1">
                                                                    <small className="text-muted fw-bold me-1" style={{ fontSize: '0.75rem' }}>عمليات سريعة:</small>
                                                                    {MATH_OPERATORS.map(op => (
                                                                        <Button
                                                                            key={op.label}
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="light"
                                                                            className="border fw-bold px-2 py-0 font-monospace text-success shadow-xs"
                                                                            style={{ fontSize: '0.82rem', minWidth: '28px', height: '26px' }}
                                                                            onClick={() => insertTokenInGroup(group.id, 'assistant', op.token)}
                                                                            title={`إدراج ${op.label}`}
                                                                        >
                                                                            {op.label}
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* حقل المعادلة الديناميكي */}
                                                            <Form.Group>
                                                                <Form.Label className="small text-muted fw-bold mb-1">
                                                                    صيغة المعادلة الرياضية المعتمدة:
                                                                </Form.Label>
                                                                <Form.Control
                                                                    as="textarea"
                                                                    rows={2}
                                                                    id={`formula-assistant-${group.id}`}
                                                                    value={group.assistantFormula || ''}
                                                                    onChange={(e) => handleUpdateRuleGroup(group.id, 'assistantFormula', e.target.value)}
                                                                    className="font-monospace fw-bold fs-6 p-2 rounded-3 border-2"
                                                                    dir="ltr"
                                                                    style={{
                                                                        textAlign: 'left',
                                                                        borderColor: '#10b981',
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#065f46',
                                                                        letterSpacing: '0.3px'
                                                                    }}
                                                                    placeholder={DEFAULT_ASSISTANT_FORMULA}
                                                                />
                                                            </Form.Group>
                                                        </div>
                                                        <small className="text-muted d-block mt-2 pt-2 border-top" style={{ fontSize: '0.78rem' }}>
                                                            ℹ️ يطبق على المعيد والمدرس المساعد فقط (للساعات غير النظرية). لا يمكنهم إعطاء نظري.
                                                        </small>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </div>
                                    );
                                })}

                                {/* زر إضافة قاعدة جديدة مخصصة تم إزالته بناءً على طلب المستخدم */}
                            </div>

                            {/* القسم 2: تفصيل الحدود حسب نوع الساعات اليومية */}
                            <div className="p-3 rounded-4 mb-4 border bg-light">
                                <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                                    <span style={{ fontSize: '1.2rem' }}>⏱️</span>
                                    <h6 className="fw-bold text-dark mb-0">تفصيل الحد الأقصى لساعات اليوم حسب النوع (ساعة/يوم):</h6>
                                </div>
                                <Row className="g-3">
                                    <Col md={isLimitHealthTechFaculty ? 3 : 6}>
                                        <div className="p-3 rounded-3 bg-white border shadow-sm">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="fw-bold text-dark">📖 ساعات نظري</span>
                                                <Badge bg="secondary">نظري</Badge>
                                            </div>
                                            <Form.Group>
                                                <Form.Label className="small text-muted fw-semibold">الحد الأقصى في اليوم (ساعة/يوم)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    placeholder="6"
                                                    value={workloadLimits.max_theory_hours_per_day}
                                                    onChange={(e) => setWorkloadLimits(prev => ({ ...prev, max_theory_hours_per_day: e.target.value }))}
                                                    className="rounded-3 text-center fw-bold"
                                                />
                                            </Form.Group>
                                        </div>
                                    </Col>

                                    <Col md={isLimitHealthTechFaculty ? 3 : 6}>
                                        <div className="p-3 rounded-3 bg-white border shadow-sm">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="fw-bold text-dark">🧪 ساعات عملي</span>
                                                <Badge bg="secondary">عملي</Badge>
                                            </div>
                                            <Form.Group>
                                                <Form.Label className="small text-muted fw-semibold">الحد الأقصى في اليوم (ساعة/يوم)</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    placeholder="4"
                                                    value={workloadLimits.max_practical_hours_per_day}
                                                    onChange={(e) => setWorkloadLimits(prev => ({ ...prev, max_practical_hours_per_day: e.target.value }))}
                                                    className="rounded-3 text-center fw-bold"
                                                />
                                            </Form.Group>
                                        </div>
                                    </Col>

                                    {isLimitHealthTechFaculty && (
                                        <Col md={3}>
                                            <div className="p-3 rounded-3 border shadow-sm" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <span className="fw-bold text-success">👥 توتوريال</span>
                                                    <Badge bg="success">توتوريال</Badge>
                                                </div>
                                                <Form.Group>
                                                    <Form.Label className="small text-muted fw-semibold">الحد الأقصى في اليوم (ساعة/يوم)</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        placeholder="4"
                                                        value={workloadLimits.max_tutorial_hours_per_day}
                                                        onChange={(e) => setWorkloadLimits(prev => ({ ...prev, max_tutorial_hours_per_day: e.target.value }))}
                                                        className="rounded-3 text-center fw-bold"
                                                    />
                                                </Form.Group>
                                            </div>
                                        </Col>
                                    )}

                                    {isLimitHealthTechFaculty && (
                                        <Col md={3}>
                                            <div className="p-3 rounded-3 border shadow-sm" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <span className="fw-bold text-primary">🏥 حقل / تدريب</span>
                                                    <Badge bg="primary">حقل</Badge>
                                                </div>
                                                <Form.Group>
                                                    <Form.Label className="small text-muted fw-semibold">الحد الأقصى في اليوم (ساعة/يوم)</Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        placeholder="4"
                                                        value={workloadLimits.max_field_hours_per_day}
                                                        onChange={(e) => setWorkloadLimits(prev => ({ ...prev, max_field_hours_per_day: e.target.value }))}
                                                        className="rounded-3 text-center fw-bold"
                                                    />
                                                </Form.Group>
                                            </div>
                                        </Col>
                                    )}
                                </Row>
                            </div>

                            {/* القسم 3: صندوق القواعد والمعادلات المعتمدة الديناميكي */}
                            <div className="p-3 rounded-4 mb-4 border" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                                <div className="fw-bold text-dark mb-2 d-flex align-items-center gap-2" style={{ fontSize: '0.95rem' }}>
                                    <FaBalanceScale className="text-success" /> 
                                    <span>ملخص ضوابط ومعادلات احتساب الأعباء المعتمدة ({ruleGroups.length} قاعدة):</span>
                                </div>
                                <div className="d-flex flex-column gap-3" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                                    {ruleGroups.map((group, idx) => (
                                        <div key={group.id} className="p-3 rounded-3 bg-white border">
                                            <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                                                <span className="fw-bold text-dark">
                                                    📌 {group.title || `القاعدة ${idx + 1}`} ({group.faculties?.length || 0} كلية):
                                                </span>
                                                <div className="d-flex flex-wrap gap-1">
                                                    {(group.faculties || []).slice(0, 5).map(f => (
                                                        <Badge key={f.value} bg="light" text="dark" className="border">
                                                            {f.label}
                                                        </Badge>
                                                    ))}
                                                    {(group.faculties || []).length > 5 && (
                                                        <Badge bg="secondary">
                                                            +{(group.faculties || []).length - 5} كليات أخرى
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <Row className="g-2">
                                                <Col md={6}>
                                                    <div className="small fw-bold text-primary mb-1 d-flex align-items-center justify-content-between">
                                                        <span>👨‍🏫 أعضاء هيئة التدريس:</span>
                                                        <span className="text-muted fw-normal" style={{ fontSize: '0.76rem' }}>
                                                            ({(group.facultyRoles || DEFAULT_FACULTY_ROLES).join('، ')})
                                                        </span>
                                                    </div>
                                                    <div className="font-monospace text-primary p-2 bg-light rounded-2 border fw-bold" dir="ltr" style={{ textAlign: 'left', fontSize: '0.82rem' }}>
                                                        {group.facultyFormula || DEFAULT_FACULTY_FORMULA}
                                                    </div>
                                                </Col>
                                                <Col md={6}>
                                                    <div className="small fw-bold text-success mb-1 d-flex align-items-center justify-content-between">
                                                        <span>🧑‍🔬 الهيئة المعاونة:</span>
                                                        <span className="text-muted fw-normal" style={{ fontSize: '0.76rem' }}>
                                                            ({(group.assistantRoles || DEFAULT_ASSISTANT_ROLES).join('، ')})
                                                        </span>
                                                    </div>
                                                    <div className="font-monospace text-success p-2 bg-light rounded-2 border fw-bold" dir="ltr" style={{ textAlign: 'left', fontSize: '0.82rem' }}>
                                                        {group.assistantFormula || DEFAULT_ASSISTANT_FORMULA}
                                                    </div>
                                                </Col>
                                            </Row>
                                        </div>
                                    ))}
                                    <div className="p-2 rounded-3 bg-white border text-muted small">
                                        📅 <strong>أيام الانتداب:</strong> انتداب كلي = 5 أيام | انتداب جزئي = 1 أو 2 أو 3 أيام (تُسحب تلقائياً من بيانات الأستاذ).
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end">
                                <Button
                                    type="submit"
                                    variant="success"
                                    className="px-5 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 rounded-3 shadow-sm fs-6"
                                    disabled={workloadLimitsSaving}
                                >
                                    {workloadLimitsSaving ? <Spinner size="sm" /> : <FaSave />}
                                    <span>حفظ وتثبيت كافة القواعد لجميع الكليات</span>
                                </Button>
                            </div>
                        </Form>
                    )}
                </Card.Body>
            </Card>
            )}

            {activeTab === 'academic-years' && user?.role === 'admin' && (
                <Card className="shadow-sm border-0 mt-2" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
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
                                                <span
                                                    title={defaultYear === y.name ? `العام الافتراضي: ${y.name} - ${defaultSemester}` : 'تعيين كعام افتراضي'}
                                                    style={{
                                                        cursor: 'pointer',
                                                        fontSize: '1.1rem',
                                                        marginRight: '6px',
                                                        color: defaultYear === y.name ? '#f59e0b' : '#d1d5db',
                                                        transition: 'color 0.2s, transform 0.15s',
                                                        display: 'inline-block',
                                                        verticalAlign: 'middle'
                                                    }}
                                                    onMouseEnter={e => { if (defaultYear !== y.name) e.currentTarget.style.color = '#fbbf24'; }}
                                                    onMouseLeave={e => { if (defaultYear !== y.name) e.currentTarget.style.color = '#d1d5db'; }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (defaultYear === y.name) {
                                                            // show semester picker as small popover via a quick prompt
                                                            const semChoices = ['الفصل الدراسي الأول', 'الفصل الدراسي الثاني', 'الفصل الدراسي الصيفي'];
                                                            const idx = semChoices.indexOf(defaultSemester);
                                                            const next = semChoices[(idx + 1) % semChoices.length];
                                                            setDefaultSemester(next);
                                                            localStorage.setItem('mnu_default_semester', next);
                                                            toast.success(`تم تغيير الفصل الافتراضي إلى: ${next}`, { icon: '⭐' });
                                                        } else {
                                                            setDefaultYear(y.name);
                                                            localStorage.setItem('mnu_default_academic_year', y.name);
                                                            localStorage.setItem('mnu_default_semester', defaultSemester);
                                                            toast.success(`تم تعيين ${y.name} كعام جامعي افتراضي`, { icon: '⭐' });
                                                        }
                                                    }}
                                                >
                                                    {defaultYear === y.name ? '⭐' : '☆'}
                                                </span>
                                                {defaultYear === y.name && (
                                                    <Badge
                                                        bg="warning"
                                                        text="dark"
                                                        className="ms-1"
                                                        style={{ fontSize: '0.7rem', cursor: 'pointer' }}
                                                        title="اضغط لتغيير الفصل الافتراضي"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const semChoices = ['الفصل الدراسي الأول', 'الفصل الدراسي الثاني', 'الفصل الدراسي الصيفي'];
                                                            const idx = semChoices.indexOf(defaultSemester);
                                                            const next = semChoices[(idx + 1) % semChoices.length];
                                                            setDefaultSemester(next);
                                                            localStorage.setItem('mnu_default_semester', next);
                                                            toast.success(`تم تغيير الفصل الافتراضي إلى: ${next}`, { icon: '⭐' });
                                                        }}
                                                    >
                                                        {defaultSemester === 'الفصل الدراسي الأول' ? 'الفصل الأول' : defaultSemester === 'الفصل الدراسي الثاني' ? 'الفصل الثاني' : 'الفصل الصيفي'}
                                                    </Badge>
                                                )}
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
