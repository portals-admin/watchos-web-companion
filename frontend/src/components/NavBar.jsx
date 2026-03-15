import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

export default function NavBar() {
  const { user, signOut } = useAuth();
  const { connected, watchConnected } = useSync();

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-brand">
        <span className="brand-icon" aria-hidden>⌚</span>
        <span className="brand-name">Watch Companion</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          History
        </NavLink>
        <NavLink to="/watch" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Watch
        </NavLink>
      </div>

      <div className="navbar-right">
        <div className="connection-indicators">
          <span className={`indicator ${connected ? 'on' : 'off'}`} title={connected ? 'Realtime connected' : 'Offline'}>
            <span className="indicator-dot" />
            Live
          </span>
          <span className={`indicator ${watchConnected ? 'on' : 'off'}`} title={watchConnected ? 'Watch connected' : 'Watch offline'}>
            <span className="indicator-dot" />
            Watch
          </span>
        </div>

        <div className="user-menu">
          <span className="user-name">{user?.name || user?.email || 'User'}</span>
          <button className="btn-signout" onClick={signOut} aria-label="Sign out">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
