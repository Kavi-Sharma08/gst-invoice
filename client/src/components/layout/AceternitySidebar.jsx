import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Aceternity UI Sidebar:
 * - Collapsed icon strip (76px) that expands on hover (260px)
 * - The expanded sidebar overlays content instead of pushing it
 * - Full-screen slide-in menu on mobile screens (< 860px)
 * - Links: Dashboard, Invoices, Customers, Products & services, Reports, Settings
 */
export function AceternitySidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const navLinks = [
    { to: '/app/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/app/invoices', label: 'Invoices', icon: '🧾' },
    { to: '/app/customers', label: 'Customers', icon: '👥' },
    { to: '/app/products', label: 'Products & services', icon: '📦' },
    { to: '/app/reports', label: 'Reports', icon: '📈' },
    { to: '/app/settings', label: 'Settings', icon: '⚙️' }
  ];

  const handleLinkClick = () => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <aside className={`side ${mobileOpen ? 'open' : ''}`} id="side">
      <Link to="/app/dashboard" className="logo" onClick={handleLinkClick}>
        <i>₹</i>
        <span>BillGST</span>
        <em>v2.0</em>
      </Link>

      <button
        className="burger"
        id="burger"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      <nav aria-label="Main sidebar navigation">
        {navLinks.map((item) => {
          const isDashboardActive =
            item.to === '/app/dashboard' &&
            (location.pathname === '/app/dashboard' || location.pathname === '/app' || location.pathname === '/app/');

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleLinkClick}
              className={({ isActive }) => (isActive || isDashboardActive ? 'on' : '')}
            >
              <b>{item.icon}</b>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="bot">
        {user && (
          <div className="pt-2 px-2 flex items-center gap-2.5 overflow-hidden">
            <UserButton afterSignOutUrl="/" />
            <span className="text-xs truncate font-medium text-[var(--muted)]">
              {user.name || user.email}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default AceternitySidebar;
