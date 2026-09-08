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
                    width: '970px',
                    height: '970px',
                    maxWidth: '160vw',
                    maxHeight: '160vw',
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
                        opacity: 0.15,
                        zIndex: 1
                    }}
                />

                {/* Inner White Login Circle */}
                <div 
                    style={{
                        width: '630px',
                        height: '630px',
                        maxWidth: '92%',
                        maxHeight: '92%',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 35px',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.03), 0 12px 35px rgba(0,0,0,0.1)',
                        textAlign: 'center',
                        zIndex: 2
                    }}
                >
                    {/* Title */}
                    <h3 className="fw-bold mb-3" style={{ color: '#2e7d32', fontSize: '2.5rem', marginTop: '-30px' }}>
                        تسجيل الدخول
                    </h3>
                    <p className="text-muted mb-5" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                        برنامج لكل ما يخص جامعة المنوفية الأهلية <br /> أعضاء هيئة التدريس - المقرارات - الخطط الدراسية
                    </p>

                    {error && (
                        <div className="alert alert-danger py-1 px-3 mb-3 w-100" style={{ fontSize: '0.9rem', borderRadius: '15px' }}>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <Form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '350px' }}>
                        {/* Username Input */}
                        <div className="position-relative mb-3">
                            <Form.Control 
                                type="text" 
                                placeholder="اسم المستخدم" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ 
                                    borderRadius: '25px', 
                                    padding: '9px 38px 9px 15px', 
                                    textAlign: 'right', 
                                    backgroundColor: '#ebf3fc', 
                                    border: '1px solid #d2e3f7',
                                    fontSize: '0.88rem',
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
                                    fontSize: '0.95rem'
                                }} 
                            />
                        </div>

                        {/* Password Input */}
                        <div className="position-relative mb-3">
                            <Form.Control 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="كلمة المرور" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ 
                                    borderRadius: '25px', 
                                    padding: '9px 38px 9px 38px', 
                                    textAlign: 'right', 
                                    backgroundColor: '#ebf3fc', 
                                    border: '1px solid #d2e3f7',
                                    fontSize: '0.88rem',
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
                                    fontSize: '0.95rem'
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
                                    fontSize: '0.95rem',
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
                            className="w-100 fw-bold text-white shadow-sm"
                            style={{ 
                                borderRadius: '25px', 
                                padding: '9px', 
                                fontSize: '1.1rem', 
                                backgroundColor: '#236c2e', 
                                border: 'none' 
                            }}
                        >
                            دخول
                        </Button>
                        {/* Forgot Password Link */}
                        <div className="text-start mt-2">
                            <button 
                                type="button"
                                className="btn btn-link text-decoration-none p-0" 
                                style={{ color: '#2e7d32', fontSize: '0.85rem' }}
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
                    <div className="mt-4" style={{ fontSize: '0.95rem', color: '#888', lineHeight: '1.6' }}>
                        <div>جميع الحقوق محفوظة © 2027/2026</div>
                        <div>صُنِع بواسطة <strong>الفريق الهندسي والتقني</strong> التابع لإدارة <strong>شؤون الطلاب</strong></div>
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
