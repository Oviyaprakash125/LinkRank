import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { recruiter, tier, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <NavLink to="/" className="navbar-brand">⚡ LinkRank</NavLink>

      <div className="navbar-links">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          end
        >
          Ingest
        </NavLink>
        <NavLink
          to="/leaderboard"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          Leaderboard
        </NavLink>
      </div>

      <div className="navbar-right">
        {recruiter && (
          <>
            <span className="text-sm text-secondary">{recruiter.name}</span>
            <span className={`tier-badge ${tier}`}>{tier?.replace('_', ' ')}</span>
            <button className="btn-logout" onClick={handleLogout} id="btn-logout">
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
