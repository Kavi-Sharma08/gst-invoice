import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MAIN_NAV_LINKS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/invoices', label: 'Invoices', icon: FileText },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/products', label: 'Products & services', icon: Package },
];

function getPageName(pathname) {
  if (pathname === '/app' || pathname === '/app/' || pathname === '/app/dashboard') return 'Dashboard';
  if (pathname === '/app/invoices/new') return 'New invoice';
  if (pathname.startsWith('/app/invoices/') && pathname.endsWith('/edit')) return 'Edit invoice';
  if (pathname.startsWith('/app/invoices/')) return 'Invoice';
  if (pathname.startsWith('/app/invoices')) return 'Invoices';
  if (pathname.startsWith('/app/customers/')) return 'Customer';
  if (pathname.startsWith('/app/customers')) return 'Customers';
  if (pathname.startsWith('/app/products')) return 'Products & services';
  if (pathname.startsWith('/app/settings')) return 'Settings';
  return '';
}

export function AceternitySidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  const isLinkActive = (to) => {
    if (to === '/app/dashboard') {
      return (
        location.pathname === '/app/dashboard' ||
        location.pathname === '/app' ||
        location.pathname === '/app/'
      );
    }
    return location.pathname.startsWith(to);
  };

  return (
    <>
      {/* ── 1. MOBILE TOP BAR (< md): full width, h-14, sticky top-0 ── */}
      <div className="md:hidden sticky top-0 z-40 w-full h-14 bg-surface border-b border-border px-4 flex items-center justify-between shrink-0">
        <Link
          to="/app/dashboard"
          className="flex items-center gap-2 font-semibold text-text text-base shrink-0"
        >
          <i className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center not-italic font-bold text-text">
            ₹
          </i>
          <span>BillGST</span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-text truncate max-w-[140px] sm:max-w-[200px]">
            {getPageName(location.pathname)}
          </span>
          <button
            type="button"
            className="p-2 -mr-2 rounded-lg text-text hover:bg-border/60 transition-colors cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── 2. MOBILE OFF-CANVAS DRAWER (< md): fixed w-72, backdrop bg-black/50 ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 transition-opacity md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <Link
            to="/app/dashboard"
            className="flex items-center gap-2.5 font-semibold text-text text-base"
            onClick={() => setMobileOpen(false)}
          >
            <i className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center not-italic font-bold text-text">
              ₹
            </i>
            <span>BillGST</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-border text-muted">
              v2.0
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-border/60 transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main group */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {MAIN_NAV_LINKS.map((item) => {
            const active = isLinkActive(item.to);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-border text-text font-semibold'
                    : 'text-muted hover:text-text hover:bg-border/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom group: Settings */}
        <div className="pt-2 pb-2 border-t border-border space-y-1">
          <NavLink
            to="/app/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isLinkActive('/app/settings')
                ? 'bg-border text-text font-semibold'
                : 'text-muted hover:text-text hover:bg-border/40'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </NavLink>
        </div>

        {/* User profile row */}
        <div className="pt-3 border-t border-border">
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-1">
              <UserButton afterSignOutUrl="/" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-text truncate">{user.name || 'Account'}</p>
                <p className="text-[11px] text-muted truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── 3. TABLET (md to lg, 768px-1023px): w-16 icon rail in flow; expanding overlays content ── */}
      <div className="hidden md:block lg:hidden w-16 shrink-0 relative z-30">
        <aside
          className="w-16 hover:w-60 focus-within:w-60 absolute inset-y-0 left-0 h-dvh bg-surface border-r border-border transition-[width] duration-300 ease-in-out flex flex-col p-3 overflow-hidden hover:shadow-2xl focus-within:shadow-2xl group"
        >
          {/* Logo */}
          <Link
            to="/app/dashboard"
            className="flex items-center gap-3 font-semibold text-text h-10 px-1 overflow-hidden shrink-0"
          >
            <i className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center not-italic font-bold text-text shrink-0">
              ₹
            </i>
            <span className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 whitespace-nowrap text-base">
              BillGST <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-border text-muted">v2.0</span>
            </span>
          </Link>

          {/* Main group */}
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
            {MAIN_NAV_LINKS.map((item) => {
              const active = isLinkActive(item.to);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={`flex items-center h-10 px-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-border text-text font-semibold'
                      : 'text-muted hover:text-text hover:bg-border/40'
                  }`}
                >
                  <span className="w-5 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="ml-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom group: Settings */}
          <div className="pt-2 pb-1 border-t border-border overflow-hidden shrink-0">
            <NavLink
              to="/app/settings"
              title="Settings"
              className={`flex items-center h-10 px-2.5 rounded-lg text-sm font-medium transition-colors ${
                isLinkActive('/app/settings')
                  ? 'bg-border text-text font-semibold'
                  : 'text-muted hover:text-text hover:bg-border/40'
              }`}
            >
              <span className="w-5 flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4" />
              </span>
              <span className="ml-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Settings
              </span>
            </NavLink>
          </div>

          {/* Bottom user */}
          <div className="pt-2 border-t border-border overflow-hidden shrink-0">
            {user && (
              <div className="flex items-center gap-2.5 px-1 py-1">
                <UserButton afterSignOutUrl="/" />
                <span className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 text-xs font-medium text-muted truncate whitespace-nowrap">
                  {user.name || user.email}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ── 4. DESKTOP (lg and up, >= 1024px): w-60 in flow, collapsible to w-16, resizes smoothly ── */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-dvh sticky top-0 bg-surface border-r border-border transition-[width] duration-300 ease-in-out overflow-hidden p-3 z-20 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Header with Logo + Collapse button */}
        <div className="flex items-center justify-between h-10 px-1 overflow-hidden shrink-0">
          <Link
            to="/app/dashboard"
            className="flex items-center gap-3 font-semibold text-text min-w-0"
          >
            <i className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center not-italic font-bold text-text shrink-0">
              ₹
            </i>
            {!isCollapsed && (
              <span className="whitespace-nowrap text-base truncate">
                BillGST <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-border text-muted">v2.0</span>
              </span>
            )}
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="p-1 rounded-md text-muted hover:text-text hover:bg-border/60 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* When collapsed on lg, show centered expand button */}
        {isCollapsed && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="p-1.5 rounded-md text-muted hover:text-text hover:bg-border/60 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main group */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {MAIN_NAV_LINKS.map((item) => {
            const active = isLinkActive(item.to);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center h-10 px-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-border text-text font-semibold'
                    : 'text-muted hover:text-text hover:bg-border/40'
                }`}
              >
                <span className="w-5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                {!isCollapsed && (
                  <span className="ml-3 whitespace-nowrap truncate">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom group: Settings */}
        <div className="pt-2 pb-1 border-t border-border overflow-hidden shrink-0">
          <NavLink
            to="/app/settings"
            title={isCollapsed ? 'Settings' : undefined}
            className={`flex items-center h-10 px-2.5 rounded-lg text-sm font-medium transition-colors ${
              isLinkActive('/app/settings')
                ? 'bg-border text-text font-semibold'
                : 'text-muted hover:text-text hover:bg-border/40'
            }`}
          >
            <span className="w-5 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4" />
            </span>
            {!isCollapsed && (
              <span className="ml-3 whitespace-nowrap truncate">
                Settings
              </span>
            )}
          </NavLink>
        </div>

        {/* Bottom user */}
        <div className="pt-2 border-t border-border overflow-hidden shrink-0">
          {user && (
            <div className="flex items-center gap-2.5 px-1 py-1">
              <UserButton afterSignOutUrl="/" />
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text truncate">{user.name || 'Account'}</p>
                  <p className="text-[11px] text-muted truncate">{user.email}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default AceternitySidebar;
