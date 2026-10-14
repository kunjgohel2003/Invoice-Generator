import { useState, useRef, useEffect } from "react";

const money = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export function formatIndianNumber(val, allowDecimal = true) {
  if (val === undefined || val === null || val === "") return "";
  const raw = String(val).replace(/,/g, "");
  if (raw === "") return "";

  if (allowDecimal) {
    const parts = raw.split(".");
    let intPart = parts[0].replace(/\D/g, "");
    let decPart =
      parts.length > 1 ? "." + parts[1].replace(/\D/g, "").slice(0, 2) : "";
    if (!intPart && decPart) intPart = "0";
    if (!intPart && !decPart) return "";
    let last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    if (rest) last3 = "," + last3;
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + last3;
    if (raw.endsWith(".") && parts.length === 2 && !parts[1]) {
      return formatted + ".";
    }
    return formatted + decPart;
  } else {
    let intPart = raw.replace(/\D/g, "");
    if (!intPart) return "";
    let last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    if (rest) last3 = "," + last3;
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + last3;
  }
}

const clientNameLines = (name) =>
  (name || "New customer").split(" ").reduce((lines, word, index) => {
    const lineIndex = Math.floor(index / 2);
    lines[lineIndex] =
      `${lines[lineIndex] || ""}${lines[lineIndex] ? " " : ""}${word}`;
    return lines;
  }, []);

export function getProductDescriptions(invoice) {
  if (
    invoice?.items &&
    Array.isArray(invoice.items) &&
    invoice.items.length > 0
  ) {
    const descs = invoice.items
      .map((item) =>
        (typeof item === "string" ? item : item?.description || "").trim(),
      )
      .filter(Boolean);
    if (descs.length === 1) {
      return descs[0];
    }
    if (descs.length === 2) {
      return `${descs[0]}, ${descs[1]}`;
    }
    if (descs.length > 2) {
      return `${descs[0]}, ${descs[1]} ...`;
    }
  }
  return invoice?.detail || "—";
}

export { money };
import {
  ViewIcon,
  EditIcon,
  EmptyFileIcon,
  DeleteIcon,
  ChevronDownIcon,
  CheckIcon,
} from "./Icons";

function StatusBadge({ invoice, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const currentStatus =
    invoice.status && invoice.status.toLowerCase() === "paid" ? "Paid" : "Due";
  const isPaid = currentStatus === "Paid";

  if (!onStatusChange) {
    return (
      <span className={`status ${currentStatus.toLowerCase()}`}>
        {currentStatus}
      </span>
    );
  }

  const handleSelect = (e, newStatus) => {
    e.stopPropagation();
    setOpen(false);
    if (newStatus !== currentStatus) {
      onStatusChange(invoice.id, newStatus);
    }
  };

  return (
    <div className="status-dropdown-wrap" ref={dropdownRef}>
      <button
        type="button"
        className={`status-btn ${currentStatus.toLowerCase()} ${open ? "open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Click to change status"
      >
        <span className="status-dot"></span>
        <span className="status-text">{currentStatus}</span>
        <ChevronDownIcon
          size={11}
          className={`status-chevron ${open ? "rotated" : ""}`}
        />
      </button>

      {open && (
        <div
          className="status-menu"
          role="listbox"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="option"
            aria-selected={isPaid}
            className={`status-menu-item paid ${isPaid ? "selected" : ""}`}
            onClick={(e) => handleSelect(e, "Paid")}
          >
            <span className="status-dot paid"></span>
            <span>Paid</span>
            {isPaid && <CheckIcon size={13} className="status-check" />}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={!isPaid}
            className={`status-menu-item due ${!isPaid ? "selected" : ""}`}
            onClick={(e) => handleSelect(e, "Due")}
          >
            <span className="status-dot due"></span>
            <span>Due</span>
            {!isPaid && <CheckIcon size={13} className="status-check" />}
          </button>
        </div>
      )}
    </div>
  );
}

export default function InvoiceTable({
  invoices,
  selectable = false,
  selected = [],
  onSelect,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
}) {
  const allSelected =
    invoices.length > 0 && selected.length === invoices.length;
  const toggleAll = () =>
    onSelect(allSelected ? [] : invoices.map((item) => item.id));

  const toggleInvoice = (id) => {
    if (selected.includes(id)) {
      onSelect(selected.filter((item) => item !== id));
    } else {
      onSelect([...selected, id]);
    }
  };

  if (!invoices.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon-wrap" aria-hidden="true">
          <EmptyFileIcon size={48} />
        </div>
        <h3>No invoices yet</h3>
        <p>Invoices will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="responsive-table-container">
      {/* Mobile Card List View (visible on mobile < 680px) */}
      <div
        className="invoice-cards-mobile"
        aria-label="Invoices list for mobile"
      >
        {selectable && invoices.length > 0 && (
          <div className="mobile-select-all-bar">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all invoices"
              />
              <span>
                {allSelected ? "Deselect all" : "Select all invoices"}
              </span>
            </label>
            <span className="selected-count-badge">
              {selected.length} of {invoices.length} selected
            </span>
          </div>
        )}

        {invoices.map((invoice) => {
          const isSelected = selected.includes(invoice.id);
          return (
            <div
              key={invoice.id}
              className={`invoice-mobile-card ${isSelected ? "selected" : ""}`}
            >
              <div className="card-top">
                <div className="card-client-meta">
                  {selectable && (
                    <input
                      type="checkbox"
                      aria-label={`Select invoice ${invoice.id}`}
                      checked={isSelected}
                      onChange={() => toggleInvoice(invoice.id)}
                      className="card-checkbox"
                    />
                  )}
                  <div
                    className="card-client-clickable"
                    onClick={() => onOpen(invoice)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpen(invoice);
                      }
                    }}
                    title={`View invoice ${invoice.id}`}
                    aria-label={`View invoice for ${invoice.client || "customer"}`}
                  >
                    <span className="client-avatar" aria-hidden="true">
                      {invoice.initials}
                    </span>
                    <div className="card-client-text">
                      <strong className="client-name">
                        {invoice.client || "New customer"}
                      </strong>
                      <span className="invoice-meta-sub">
                        #{invoice.id} · {invoice.date}
                      </span>
                    </div>
                  </div>
                </div>
                <StatusBadge
                  invoice={invoice}
                  onStatusChange={onStatusChange}
                />
              </div>

              {getProductDescriptions(invoice) &&
                getProductDescriptions(invoice) !== "—" && (
                  <div className="card-detail-text">
                    <span>{getProductDescriptions(invoice)}</span>
                  </div>
                )}

              <div className="card-bottom">
                <div className="card-amount">
                  <small className="amount-label">Amount</small>
                  <span className="amount-value">{money(invoice.amount)}</span>
                </div>
                <div className="mobile-card-actions">
                  <button
                    type="button"
                    className="mobile-view-btn"
                    onClick={() => onOpen(invoice)}
                  >
                    <ViewIcon size={14} />
                    <span>View</span>
                  </button>
                  {onEdit && (
                    <button
                      type="button"
                      className="mobile-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(invoice);
                      }}
                    >
                      <EditIcon size={14} />
                      <span>Edit</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="mobile-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(invoice.id);
                      }}
                      title={`Delete invoice ${invoice.id}`}
                      aria-label={`Delete invoice ${invoice.id}`}
                    >
                      <DeleteIcon size={14} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop / Tablet Table View (visible on >= 680px) */}
      <div className="table-scroll desktop-table-view">
        <table className="invoice-table">
          <thead>
            <tr>
              {selectable && (
                <th className="th-select">
                  <input
                    aria-label="Select all invoices"
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th>Client</th>
              <th>Description / Product</th>
              <th>Invoice</th>
              <th>Issued</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="th-actions">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                {selectable && (
                  <td className="td-select">
                    <input
                      aria-label={`Select ${invoice.id}`}
                      type="checkbox"
                      checked={selected.includes(invoice.id)}
                      onChange={() => toggleInvoice(invoice.id)}
                    />
                  </td>
                )}
                <td>
                  <div
                    className="client client-clickable"
                    onClick={() => onOpen(invoice)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpen(invoice);
                      }
                    }}
                    title={`View invoice ${invoice.id}`}
                    aria-label={`View invoice for ${invoice.client || "customer"}`}
                  >
                    <span className="client-avatar">{invoice.initials}</span>
                    <span className="client-name-wrap">
                      <b>
                        {clientNameLines(invoice.client).map((line, index) => (
                          <span className="client-name-line" key={line}>
                            {index > 0 && <br />}
                            {line}
                          </span>
                        ))}
                      </b>
                    </span>
                  </div>
                </td>
                <td className="td-desc">{getProductDescriptions(invoice)}</td>
                <td className="td-id">{invoice.id}</td>
                <td className="td-date">{invoice.date}</td>
                <td className="td-amount">{money(invoice.amount)}</td>
                <td>
                  <StatusBadge
                    invoice={invoice}
                    onStatusChange={onStatusChange}
                  />
                </td>
                <td className="td-actions">
                  <div className="table-actions-group">
                    <button
                      type="button"
                      className="text-button view-action-btn"
                      onClick={() => onOpen(invoice)}
                      aria-label={`View invoice ${invoice.id}`}
                    >
                      <ViewIcon size={14} />
                      <span>View</span>
                    </button>
                    {onEdit && (
                      <button
                        type="button"
                        className="text-button edit-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(invoice);
                        }}
                        aria-label={`Edit invoice ${invoice.id}`}
                      >
                        <EditIcon size={14} />
                        <span>Edit</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="text-button delete-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(invoice.id);
                        }}
                        aria-label={`Delete invoice ${invoice.id}`}
                        title={`Delete invoice ${invoice.id}`}
                      >
                        <DeleteIcon size={14} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
