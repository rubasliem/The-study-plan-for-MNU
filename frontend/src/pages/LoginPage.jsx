import React, { useState, useContext } from 'react';
import { Form, Button, Modal } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import logo from '../assets/logo.png';

const LoginPage = () => {
    const { login } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const success = await login(username, password);
        if (success) {
            window.location.href = '/?tab=notifications';
        } else {
            setError('بيانات الدخول غير صحيحة');
        }
    };

    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1: Username, 2: Security Answer, 3: New Password
    const [forgotUsername, setForgotUsername] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [forgotOptions, setForgotOptions] = useState([]);
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const handleForgotUsernameSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        const cleanName = forgotUsername.trim();
        if (!cleanName) {
            setForgotError('يرجى إدخال اسم المستخدم');
            return;
        }
        setForgotLoading(true);
        try {
            const res = await axios.get(`/api/auth/forgot-password/${encodeURIComponent(cleanName)}`);
            setSecurityQuestion(res.data.security_question);
            setForgotOptions(res.data.options || []);
            setForgotStep(2);
        } catch (err) {
            const msg = err.response?.data?.detail || 'المستخدم غير موجود أو لم يتم إعداد سؤال أمان له';
            setForgotError(msg);
            toast.error(msg);
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setForgotError('');
        if (!/^\d{6}$/.test(newPassword) || new Set(newPassword).size !== 6) {
            const msg = 'يجب أن تتكون كلمة المرور الجديدة من 6 أرقام إنجليزية مختلفة (0-9)';
            setForgotError(msg);
            toast.error(msg);
            return;
        }
        setForgotLoading(true);
        try {
            await axios.post(`/api/auth/reset-password`, {
                username: forgotUsername.trim(),
                security_answer: securityAnswer.trim(),
                new_password: newPassword
            });
            toast.success('تم تعيين كلمة المرور الجديدة بنجاح، يمكنك الآن تسجيل الدخول.');
            setShowForgotModal(false);
            setForgotStep(1);
            setForgotUsername('');
            setSecurityAnswer('');
            setNewPassword('');
            setForgotOptions([]);
            setForgotError('');
        } catch (err) {
            const msg = err.response?.data?.detail || 'إجابة سؤال الأمان غير صحيحة';
            setForgotError(msg);
            toast.error(msg);
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            direction: 'rtl',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Outer Circular Logo Frame */}
            <div 
                style={{
                    width: 'min(860px, 120vh, 120vw)',
                    height: 'min(860px, 120vh, 120vw)',
                    maxWidth: '140vw',
                    maxHeight: '140vw',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 70px rgba(46, 125, 50, 0.12), 0 0 110px rgba(46, 125, 50, 0.06)',
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Transparent Logo Background Layer */}
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        backgroundImage: `url(${logo})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        opacity: 0.16,
                        zIndex: 1
                    }}
                />

                {/* Inner White Login Circle (Fit within 80% screen height) */}
                <div 
                    style={{
                        width: 'min(530px, 80vh, 90vw)',
                        height: 'min(530px, 80vh, 90vw)',
                        maxWidth: '92%',
                        maxHeight: '80vh',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'clamp(12px, 2.5vh, 26px) clamp(16px, 3vw, 25px)',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.03), 0 12px 35px rgba(0,0,0,0.1)',
                        textAlign: 'center',
                        zIndex: 2
                    }}
                >
                    {/* Title */}
                    <h3 className="fw-bold mb-1" style={{ color: '#2e7d32', fontSize: 'clamp(1.35rem, 2.8vh, 1.85rem)', marginTop: '-2px' }}>
                        تسجيل الدخول
                    </h3>
                    <p className="text-muted mt-0 mb-3" style={{ fontSize: 'clamp(0.72rem, 1.4vh, 0.82rem)', fontWeight: '500', lineHeight: '1.4' }}>
                        منظومة إدارة وتوزيع الخطط والأعباء الدراسية <br /> جامعة المنوفية الأهلية
                    </p>

                    {error && (
                        <div className="alert alert-danger py-1 px-3 mb-2 w-100" style={{ fontSize: 'clamp(0.75rem, 1.3vh, 0.85rem)', borderRadius: '15px' }}>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <Form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '320px' }}>
                        {/* Username Input */}
                        <div className="position-relative mb-2">
                            <Form.Control 
                                type="text" 
                                placeholder="اسم المستخدم" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ 
                                    borderRadius: '25px', 
                                    padding: 'clamp(6px, 1.1vh, 8px) 38px clamp(6px, 1.1vh, 8px) 15px', 
                                    textAlign: 'right', 
                                    backgroundColor: '#ebf3fc', 
                                    border: '1px solid #d2e3f7',
                                    fontSize: 'clamp(0.8rem, 1.4vh, 0.86rem)',
                                    fontWeight: '500',
                                    color: '#333'
                                }}
                                required
                            />
                            <FaUser 
                                style={{ 
                                    position: 'absolute', 
                                    right: '14px', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    color: '#2e7d32',
                                    fontSize: '0.9rem'
                                }} 
                            />
                        </div>

                        {/* Password Input */}
                        <div className="position-relative mb-2">
                            <Form.Control 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="كلمة المرور" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ 
                                    borderRadius: '25px', 
                                    padding: 'clamp(6px, 1.1vh, 8px) 38px clamp(6px, 1.1vh, 8px) 38px', 
                                    textAlign: 'right', 
                                    backgroundColor: '#ebf3fc', 
                                    border: '1px solid #d2e3f7',
                                    fontSize: 'clamp(0.8rem, 1.4vh, 0.86rem)',
                                    fontWeight: '500',
                                    color: '#333'
                                }}
                                required
                            />
                            <FaLock 
                                style={{ 
                                    position: 'absolute', 
                                    right: '14px', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    color: '#2e7d32',
                                    fontSize: '0.9rem'
                                }} 
                            />
                            <div 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ 
                                    position: 'absolute', 
                                    left: '14px', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    cursor: 'pointer',
                                    color: '#2e7d32',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button 
                            type="submit" 
                            className="w-100 fw-bold text-white shadow-sm login-submit-btn"
                            style={{ 
                                borderRadius: '25px', 
                                padding: 'clamp(6px, 1.1vh, 8px)', 
                                fontSize: 'clamp(0.92rem, 1.8vh, 1.02rem)', 
                                border: 'none' 
                            }}
                        >
                            دخول
                        </Button>
                        {/* Forgot Password Link */}
                        <div className="text-start mt-1">
                            <button 
                                type="button"
                                className="btn btn-link text-decoration-none p-0" 
                                style={{ color: '#2e7d32', fontSize: 'clamp(0.72rem, 1.3vh, 0.8rem)' }}
                                onClick={() => {
                                    setShowForgotModal(true);
                                    setForgotStep(1);
                                    setForgotUsername('');
                                    setSecurityAnswer('');
                                    setNewPassword('');
                                    setForgotOptions([]);
                                    setForgotError('');
                                }}
                            >
                                هل نسيت كلمة المرور؟
                            </button>
                        </div>
                    </Form>

                    {/* Footer Copyright */}
                    <div className="mt-2" style={{ fontSize: 'clamp(0.65rem, 1.2vh, 0.74rem)', color: '#888', lineHeight: '1.4', whiteSpace: 'nowrap' }}>
                        <div>جميع الحقوق محفوظة © 2027/2026</div>
                        <div>صُنِع بواسطة <strong style={{ fontWeight: '700' }}>الفريق الهندسي والتقني</strong> التابع لإدارة <strong style={{ fontWeight: '700' }}>شؤون الطلاب</strong></div>
                    </div>
                </div>
            </div>

            {/* نافذة استعادة كلمة المرور */}
            <Modal show={showForgotModal} onHide={() => setShowForgotModal(false)} centered dir="rtl">
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold text-success fs-5 w-100 text-center">استعادة كلمة المرور</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {forgotError && (
                        <div className="alert alert-danger py-2 px-3 mb-3 fw-bold" style={{ fontSize: '0.88rem', borderRadius: '10px', lineHeight: '1.6' }}>
                            {forgotError}
                        </div>
                    )}

                    {forgotStep === 1 ? (
                        <Form onSubmit={handleForgotUsernameSubmit}>
                            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                                يرجى إدخال اسم المستخدم الخاص بك للبحث عن سؤال الأمان المرتبط بحسابك.
                            </p>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-semibold">اسم المستخدم</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    placeholder="أدخل اسم المستخدم"
                                    value={forgotUsername} 
                                    onChange={e => {
                                        setForgotUsername(e.target.value);
                                        if (forgotError) setForgotError('');
                                    }} 
                                    required 
                                />
                            </Form.Group>
                            <Button type="submit" variant="success" className="w-100 fw-bold py-2" disabled={forgotLoading}>
                                {forgotLoading ? "جاري التحقق..." : "متابعة"}
                            </Button>
                        </Form>
                    ) : (
                        <Form onSubmit={handleResetPassword}>
                            <div className="alert alert-success py-2 mb-4" style={{ fontSize: '0.9rem' }}>
                                <strong>سؤال الأمان:</strong> {securityQuestion}
                            </div>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">إجابة السؤال (اختر من القائمة)</Form.Label>
                                <Form.Select 
                                    value={securityAnswer} 
                                    onChange={e => {
                                        setSecurityAnswer(e.target.value);
                                        if (forgotError) setForgotError('');
                                    }} 
                                    required
                                >
                                    <option value="" disabled hidden>-- اختر الإجابة الصحيحة --</option>
                                    {forgotOptions.map((opt, idx) => (
                                        <option key={idx} value={opt}>{opt}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-4">
                                <Form.Label className="fw-semibold">كلمة المرور الجديدة</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    placeholder="6 أرقام إنجليزية مختلفة (0-9)"
                                    value={newPassword} 
                                    onChange={e => {
                                        setNewPassword(e.target.value);
                                        if (forgotError) setForgotError('');
                                    }} 
                                    required 
                                />
                            </Form.Group>
                            <Button type="submit" variant="success" className="w-100 fw-bold py-2" disabled={forgotLoading}>
                                {forgotLoading ? "جاري التعيين..." : "تعيين كلمة المرور الجديدة"}
                            </Button>
                        </Form>
                    )}
                </Modal.Body>
            </Modal>

            {/* Toaster for notifications */}
            <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 5000, style: { fontFamily: 'inherit', fontSize: '15px', borderRadius: '10px', padding: '12px 20px' } }} />
        </div>
    );
};

export default LoginPage;
