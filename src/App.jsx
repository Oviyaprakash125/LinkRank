import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import IngestPage from './pages/IngestPage';
import LeaderboardPage from './pages/LeaderboardPage';
import CandidateDetailPage from './pages/CandidateDetailPage';

// ── Error boundary — catches render errors and shows a message instead of blank page
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) {
    return { error: err };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0b0d14', color: '#f1f5f9', fontFamily: 'monospace', padding: '2rem',
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>⚡ LinkRank — Runtime Error</h1>
          <pre style={{
            background: '#1f2337', padding: '1.5rem', borderRadius: '8px',
            color: '#fca5a5', maxWidth: '700px', whiteSpace: 'pre-wrap', overflowX: 'auto',
          }}>
            {this.state.error.message}\n\n{this.state.error.stack}
          </pre>
          <button
            style={{
              marginTop: '1.5rem', padding: '0.5rem 1.5rem', background: '#6c63ff',
              color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
            }}
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Redirect to /login if no token is present
function RequireAuth({ children }) {
  const { token } = useAuth();
  const location   = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function AppShell() {
  const { token } = useAuth();

  return (
    <div className="app-shell">
      {token && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><IngestPage /></RequireAuth>} />
        <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
        <Route path="/candidates/:id" element={<RequireAuth><CandidateDetailPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
