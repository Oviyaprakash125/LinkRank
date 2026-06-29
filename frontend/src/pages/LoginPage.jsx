import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Spinner } from '../components/ui';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate   = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signup(email, password, fullName);
        setSuccessMsg('Account created successfully! Please sign in.');
        setIsSignUp(false);
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || (isSignUp ? 'Signup failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">⚡ LinkRank</div>
        <p className="login-tagline">AI-powered candidate scoring for modern recruiters</p>

        {error && <Alert type="error">{error}</Alert>}
        {successMsg && <Alert type="success">{successMsg}</Alert>}

        <form onSubmit={handleSubmit} id="login-form">
          {isSignUp && (
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                className="form-input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required={isSignUp}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            id="btn-login"
            className="btn btn-primary full-width"
            disabled={loading}
          >
            {loading ? <Spinner /> : (isSignUp ? 'Sign up' : 'Sign in')}
          </button>
        </form>

        <p className="text-xs text-center mt-4 text-secondary">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button 
             className="btn btn-ghost" 
             style={{ padding: 0, color: 'var(--accent-light)', textDecoration: 'underline' }}
             onClick={() => setIsSignUp(!isSignUp)}
          >
             {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
