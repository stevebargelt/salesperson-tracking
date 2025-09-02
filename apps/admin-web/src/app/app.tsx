import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { SimpleLoginForm } from '../components/SimpleLoginForm';
import { SimpleDashboard } from '../pages/SimpleDashboard';
import { UserManagement } from '../pages/UserManagement';
import { VisitsView } from '../pages/VisitsView';
import { VisitInspector } from '../pages/VisitInspector';
import { AccountManagement } from '../pages/AccountManagement';

export function App() {
  const { user, profile, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login form if not authenticated or not admin
  if (!user || !profile || profile.role !== 'admin') {
    return <SimpleLoginForm />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimpleDashboard />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/accounts" element={<AccountManagement />} />
        <Route path="/visits" element={<VisitsView />} />
        <Route path="/visits/:visitId" element={<VisitInspector />} />
      </Routes>
    </Router>
  );
}

export default App;
