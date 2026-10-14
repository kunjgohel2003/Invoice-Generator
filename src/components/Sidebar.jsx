import { NavLink, Link } from "react-router-dom";
import {
  BrandIcon,
  OverviewIcon,
  CreateIcon,
  HistoryIcon,
  PlusIcon,
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

export default function Sidebar() {
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
      </header>

      {/* Desktop & Tablet Sidebar (visible on >= 768px) */}
      <aside className="sidebar desktop-sidebar" aria-label="Desktop sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <BrandIcon size={32} />
          </span>
          <span className="brand-title">InvoiceG</span>
        </Link>
        <nav aria-label="Primary navigation">
          {links.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span className="nav-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="nav-text">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-tip">
          <strong>Smart invoicing, simply.</strong>
          Build clear invoices and get paid faster.
        </div>
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
