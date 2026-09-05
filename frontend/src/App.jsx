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
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 5000, style: { fontFamily: 'inherit', fontSize: '15px', borderRadius: '10px', padding: '12px 20px' } }} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{ flex: 1, padding: '20px' }}>
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