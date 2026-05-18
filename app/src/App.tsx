import { Route, Routes } from 'react-router-dom';
import { AuthGuard } from './components/layout/AuthGuard';
import { AppShell } from './components/layout/AppShell';
import AuthPage from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import Knowledge from './pages/Knowledge';
import KnowledgeGraphPage from './pages/KnowledgeGraph';
import Analytics from './pages/Analytics';
import Digest from './pages/Digest';
import Settings from './pages/Settings';
import PublicProfile from './pages/PublicProfile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/u/:username" element={<PublicProfile />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <AppShell>
              <Dashboard />
            </AppShell>
          </AuthGuard>
        }
      />
      <Route
        path="/library"
        element={
          <AuthGuard>
            <AppShell>
              <Library />
            </AppShell>
          </AuthGuard>
        }
      />
      <Route
        path="/library/:linkId"
        element={
          <AuthGuard>
            <AppShell>
              <Library />
            </AppShell>
          </AuthGuard>
        }
      />
      <Route
        path="/knowledge"
        element={
          <AuthGuard>
            <AppShell>
              <Knowledge />
            </AppShell>
          </AuthGuard>
        }
      />
      <Route
        path="/knowledge/graph"
        element={
          <AuthGuard>
            <KnowledgeGraphPage />
          </AuthGuard>
        }
      />
      <Route
        path="/analytics"
        element={
          <AuthGuard>
            <AppShell>
              <Analytics />
            </AppShell>
          </AuthGuard>
        }
      />
      <Route
        path="/digest"
        element={
          <AuthGuard>
            <AppShell>
              <Digest />
            </AppShell>
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <AppShell>
              <Settings />
            </AppShell>
          </AuthGuard>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
