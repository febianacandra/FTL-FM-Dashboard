import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyCommitInput from './pages/DailyCommitInput';
import CommitSetup from './pages/CommitSetup';
import MemberBaruInput from './pages/MemberBaruInput';
import FollowUpStatus from './pages/FollowUpStatus';
import TrainingEvent from './pages/TrainingEvent';

function Protected({ children }: { children: React.ReactNode }) {
  const { loading, profile } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-muted">Memuat...</div>;
  if (!profile) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/daily-commit" element={<Protected><DailyCommitInput /></Protected>} />
          <Route path="/commit-setup" element={<Protected><CommitSetup /></Protected>} />
          <Route path="/member-baru" element={<Protected><MemberBaruInput /></Protected>} />
          <Route path="/follow-up" element={<Protected><FollowUpStatus /></Protected>} />
          <Route path="/training" element={<Protected><TrainingEvent /></Protected>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
