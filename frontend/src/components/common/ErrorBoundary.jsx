import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in component tree:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="container py-5 text-center" dir="rtl">
                    <div className="card shadow border-danger mx-auto" style={{ maxWidth: '600px' }}>
                        <div className="card-body p-4">
                            <h4 className="text-danger fw-bold mb-3">عذراً، حدث خطأ غير متوقع في هذه الصفحة</h4>
                            <p className="text-muted mb-4">
                                حدث خطأ أثناء عرض المحتوى. يرجى محاولة إعادة تحميل الصفحة.
                            </p>
                            <div className="d-flex justify-content-center gap-3">
                                <button 
                                    className="btn btn-success px-4"
                                    onClick={() => window.location.reload()}
                                >
                                    إعادة تحميل الصفحة
                                </button>
                                <button 
                                    className="btn btn-outline-secondary px-4"
                                    onClick={() => this.setState({ hasError: false, error: null })}
                                >
                                    محاولة المتابعة
                                </button>
                            </div>
                            {this.state.error && (
                                <details className="mt-4 text-start" dir="ltr">
                                    <summary className="text-muted small cursor-pointer">تفاصيل الخطأ التقني (Technical Details)</summary>
                                    <pre className="bg-light p-2 mt-2 rounded border small text-danger" style={{ overflowX: 'auto' }}>
                                        {this.state.error.toString()}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
