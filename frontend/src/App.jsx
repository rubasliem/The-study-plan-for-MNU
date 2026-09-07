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
        {activeTab === 'dashboard' && <MainTablePage />}
        {activeTab === 'professors' && <ProfessorsPage />}
        {activeTab === 'courses' && <CoursesPage />}
        {activeTab === 'study-plan' && <StudyPlanPage />}
        {activeTab === 'signatures' && <SignaturesPage />}
        {activeTab === 'statistics' && <StatisticsPage />}
        {activeTab === 'notifications' && <NotificationsPage />}
        {activeTab === 'recycle-bin' && <RecycleBinPage />}
        {activeTab === 'logs' && <LogsPage />}
        {activeTab === 'admin' && user.role === 'admin' && <AdminUsersPage />}
        {activeTab === 'control-panel' && <ControlPanelPage />}
        {activeTab === 'guidelines' && <GuidelinesPage />}
      </main>
    </div>
  );
}


export default App;