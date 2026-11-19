import { NavLink, Link } from "react-router-dom";
import {
  BrandIcon,
  OverviewIcon,
  CreateIcon,
  HistoryIcon,
  PlusIcon,
  LogOutIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "./Icons";

const links = [
  {
    to: "/",
    icon: <OverviewIcon size={19} />,
    label: "Overview",
    shortLabel: "Overview",
    end: true,
  },
  {
    to: "/create",
    icon: <CreateIcon size={19} />,
    label: "Create Invoice",
    shortLabel: "Create",
    end: false,
  },
  {
    to: "/history",
    icon: <HistoryIcon size={19} />,
    label: "Invoice History",
    shortLabel: "History",
    end: false,
  },
];

export default function Sidebar({
  currentUser,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const initial = currentUser?.username
    ? currentUser.username.charAt(0).toUpperCase()
    : "U";

  return (
    <>
      {/* Mobile Top Header (visible on < 768px) */}
      <header className="mobile-header" aria-label="Mobile application header">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <BrandIcon size={28} />
          </span>
          <span className="brand-title">InvoiceG</span>
        </Link>
        <div className="mobile-header-actions">
          <Link
            to="/create"
            className="mobile-header-btn"
            aria-label="Create new invoice"
          >
            <span className="btn-icon">
              <PlusIcon size={16} />
            </span>
            <span className="btn-label">New</span>
          </Link>
          {currentUser && (
            <div className="mobile-header-user-actions">
              <Link
                to="/profile"
                className="mobile-header-profile-pill"
                title={`Account settings for @${currentUser.username}`}
              >
                <span className="mobile-user-initial">{initial}</span>
                <span className="mobile-username-text">@{currentUser.username}</span>
              </Link>
              <button
                type="button"
                className="mobile-header-logout-btn"
                onClick={onLogout}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOutIcon size={15} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Desktop & Tablet Sidebar (visible on >= 768px) */}
      <aside
        className={`sidebar desktop-sidebar ${isCollapsed ? "is-collapsed" : ""}`}
        aria-label="Desktop sidebar"
      >
        <div className="sidebar-brand-row">
          <Link to="/" className="brand" title="InvoiceG Overview">
            <span className="brand-mark">
              <BrandIcon size={isCollapsed ? 26 : 30} />
            </span>
            {!isCollapsed && <span className="brand-title">InvoiceG</span>}
          </Link>
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Open sidebar" : "Close sidebar"}
            aria-label={isCollapsed ? "Open sidebar" : "Close sidebar"}
          >
            {isCollapsed ? (
              <ChevronRightIcon size={14} />
            ) : (
              <ChevronLeftIcon size={14} />
            )}
          </button>
        </div>

        <nav aria-label="Primary navigation">
          {links.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span className="nav-icon" aria-hidden="true">
                {icon}
              </span>
              {!isCollapsed && <span className="nav-text">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {!isCollapsed && (
          <div className="sidebar-tip">
            <strong>Smart invoicing, simply.</strong>
            Build clear invoices and get paid faster.
          </div>
        )}

        {/* User Profile & Sign Out Widget */}
        {currentUser && (
          <div className="sidebar-user-card">
            <Link
              to="/profile"
              className="sidebar-user-profile-link"
              title={`Account settings for @${currentUser.username}`}
            >
              <div className="sidebar-user-avatar">{initial}</div>
              {!isCollapsed && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">
                    @{currentUser.username}
                  </span>
                  <span className="sidebar-user-badge">
                    <span className="sidebar-user-badge-text">Account Settings</span>
                    <span className="sidebar-user-arrow">→</span>
                  </span>
                </div>
              )}
            </Link>
            {!isCollapsed && (
              <button
                type="button"
                className="sidebar-logout-btn"
                onClick={onLogout}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOutIcon size={16} />
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Mobile Bottom Navigation Bar (visible on < 768px) */}
      <nav className="mobile-nav" aria-label="Mobile bottom navigation">
        {links.map(({ to, icon, shortLabel, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `mobile-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span className="mobile-nav-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="mobile-nav-label">{shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
