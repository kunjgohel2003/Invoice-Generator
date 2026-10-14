import React from "react";

// Helper base wrapper for consistent icon styling
const Icon = ({
  size = 18,
  className = "",
  children,
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 2,
  viewBox = "0 0 24 24",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`icon-svg ${className}`.trim()}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

// Brand / Logo Favicon Icon: Envelope with Verified Checkmark
export const BrandIcon = ({ size = 26, className = "", ...props }) => (
  <img
    src="/logo.png"
    alt="InvoiceG Logo"
    width={size}
    height={size}
    className={`brand-logo-img brand-favicon-svg ${className}`.trim()}
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "inline-block",
      verticalAlign: "middle",
      flexShrink: 0,
    }}
    {...props}
  />
);

// Navigation: Overview / Dashboard
export const OverviewIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Icon>
);

// Navigation & Actions: Create Invoice
export const CreateIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </Icon>
);

// Simple Plus Icon
export const PlusIcon = (props) => (
  <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

// Navigation: History / Clock
export const HistoryIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

// Action: Print PDF
export const PrintIcon = (props) => (
  <Icon {...props}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </Icon>
);

// Action: Download PDF
export const DownloadIcon = (props) => (
  <Icon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icon>
);

// Action: Edit
export const EditIcon = (props) => (
  <Icon {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Icon>
);

// Action: Save / Diskette
export const SaveIcon = (props) => (
  <Icon {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </Icon>
);

// Action: Delete / Trash
export const DeleteIcon = (props) => (
  <Icon {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </Icon>
);

// Action: View / Eye
export const ViewIcon = (props) => (
  <Icon {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

// Navigation: Back Arrow
export const BackIcon = (props) => (
  <Icon {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Icon>
);

// Search: Magnifying Glass
export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Icon>
);

// Calendar: Datepicker
export const CalendarIcon = (props) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Icon>
);

// Metrics: Credit Card (Total Invoiced)
export const CardIcon = (props) => (
  <Icon {...props}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </Icon>
);

// Metrics: Checkmark (Collected / Paid)
export const CheckIcon = (props) => (
  <Icon {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </Icon>
);

// Metrics: Clock / Timer (Outstanding / Due)
export const ClockTimerIcon = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 15" />
  </Icon>
);

// Empty State: Document
export const EmptyFileIcon = (props) => (
  <Icon {...props} size={props.size || 42}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </Icon>
);

// Close / Clear: X
export const CrossIcon = (props) => (
  <Icon {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);

// Action: Sort
export const SortIcon = (props) => (
  <Icon {...props}>
    <path d="M3 9l4-4 4 4M7 5v14M21 15l-4 4-4-4M17 19V5" />
  </Icon>
);

// Chevron Down / Dropdown Arrow
export const ChevronDownIcon = (props) => (
  <Icon {...props}>
    <polyline points="6 9 12 15 18 9" />
  </Icon>
);

// Action: Filter
export const FilterIcon = (props) => (
  <Icon {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </Icon>
);

// Action: Reset / Rotate CCW
export const ResetIcon = (props) => (
  <Icon {...props}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </Icon>
);

// Navigation: Chevron Left
export const ChevronLeftIcon = (props) => (
  <Icon {...props}>
    <polyline points="15 18 9 12 15 6" />
  </Icon>
);

// Navigation: Chevron Right
export const ChevronRightIcon = (props) => (
  <Icon {...props}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);



