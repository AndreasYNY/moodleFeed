import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { NotificationsBridge } from './components/NotificationsBridge';
import { Sidebar } from './components/Sidebar';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { DiscussionPage } from './pages/DiscussionPage';
import { ForumsPage } from './pages/ForumsPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/auth';

function AppLayout() {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50 md:pl-[220px]">
      <Sidebar />
      <NotificationsBridge />
      <Outlet />
    </div>
  );
}

export function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/assignments" replace /> : <LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/forums" element={<ForumsPage />} />
        <Route path="/forums/:discussionId" element={<DiscussionPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? '/assignments' : '/login'} replace />} />
    </Routes>
  );
}
