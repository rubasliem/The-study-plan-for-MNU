import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Sidebar from './components/Sidebar/Sidebar';
import ProfessorsPage from './pages/ProfessorsPage';
import CoursesPage from './pages/CoursesPage';
import StudyPlanPage from './pages/StudyPlanPage';
import SignaturesPage from './pages/SignaturesPage';
import StatisticsPage from './pages/StatisticsPage';
import LoginPage from './pages/LoginPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ControlPanelPage from './pages/ControlPanelPage';
import MainTablePage from './pages/MainTablePage';
import NotificationsPage from './pages/NotificationsPage';
import RecycleBinPage from './pages/RecycleBinPage';
import GuidelinesPage from './pages/GuidelinesPage';
import LogsPage from './pages/LogsPage';
import { Spinner } from 'react-bootstrap';
import { Toaster } from 'react-hot-toast';

function App() {
  const { user, loading } = useContext(AuthContext);
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab') || 'professors';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const hiddenPages = React.useMemo(() => {
    try {
      if (!user?.hidden_pages) return [];
      const parsed = typeof user.hidden_pages === 'string' ? JSON.parse(user.hidden_pages) : user.hidden_pages;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [user?.hidden_pages]);

  useEffect(() => {
    if (user && hiddenPages.includes(activeTab)) {
      const allowedOrder = ['dashboard', 'professors', 'courses', 'study-plan', 'signatures', 'statistics', 'notifications', 'recycle-bin', 'guidelines'];
      const fallback = allowedOrder.find(t => !hiddenPages.includes(t));
      if (fallback) setActiveTab(fallback);
    }
  }, [user, activeTab, hiddenPages]);

  useEffect(() => {
    if (user) {
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?tab=' + activeTab;
      window.history.replaceState({path:newUrl},'',newUrl);
    }
  }, [activeTab, user]);

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}><Spinner animation="border" variant="primary" /></div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', position: 'relative' }}>
      <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 5000, style: { fontFamily: 'inherit', fontSize: '15px', borderRadius: '10px', padding: '12px 20px' } }} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main style={{ flex: 1, padding: '20px', width: '100%', overflowX: 'hidden' }}>
        <div className="d-md-none d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
          <button className="btn btn-light shadow-sm" onClick={() => setIsSidebarOpen(true)}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <h5 className="mb-0 text-success fw-bold">جامعة المنوفية الأهلية</h5>
          <div style={{width: '42px'}}></div> {/* Spacer for centering */}
        </div>
        {activeTab === 'dashboard' && !hiddenPages.includes('dashboard') && <MainTablePage />}
        {activeTab === 'professors' && !hiddenPages.includes('professors') && <ProfessorsPage />}
        {activeTab === 'courses' && !hiddenPages.includes('courses') && <CoursesPage />}
        {activeTab === 'study-plan' && !hiddenPages.includes('study-plan') && <StudyPlanPage />}
        {activeTab === 'signatures' && !hiddenPages.includes('signatures') && <SignaturesPage />}
        {activeTab === 'statistics' && !hiddenPages.includes('statistics') && <StatisticsPage />}
        {activeTab === 'notifications' && !hiddenPages.includes('notifications') && <NotificationsPage />}
        {activeTab === 'recycle-bin' && !hiddenPages.includes('recycle-bin') && <RecycleBinPage />}
        {activeTab === 'logs' && !hiddenPages.includes('logs') && <LogsPage />}
        {activeTab === 'admin' && user.role === 'admin' && !hiddenPages.includes('admin') && <AdminUsersPage />}
        {activeTab === 'control-panel' && !hiddenPages.includes('control-panel') && <ControlPanelPage />}
        {activeTab === 'guidelines' && !hiddenPages.includes('guidelines') && <GuidelinesPage />}
      </main>
    </div>
  );
}


export default App;