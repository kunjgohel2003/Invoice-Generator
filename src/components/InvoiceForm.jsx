import { useRef, useState, useEffect, useMemo } from "react";
import { blankInvoice, generateNextInvoiceNumber } from "../data/invoices";
import { money, formatIndianNumber } from "./InvoiceTable";
import {
  CalendarIcon,
  PlusIcon,
  DeleteIcon,
  SaveIcon,
  BackIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
} from "./Icons";

const fields = [
  ["name", "Name", "text"],
  ["email", "Email", "email"],
  ["phone", "Mobile No.", "tel"],
  ["address", "Address", "text"],
  ["city", "City", "text"],
  ["pincode", "Pincode", "text"],
];

export const capitalizeWords = (str) => {
  if (!str) return str || "";
  return String(str).replace(
    /(^|[\s\-.'’])([a-z])/g,
    (_, boundary, char) => boundary + char.toUpperCase(),
  );
};

const copyInvoice = (invoice, existingInvoices = []) => {
  const source = JSON.parse(JSON.stringify(invoice || blankInvoice));
  const todayDate = new Date().toISOString().slice(0, 10);
  const invoiceDate =
    source.invoiceDate || (invoice ? source.date : todayDate) || todayDate;
  const targetYear = invoiceDate
    ? new Date(invoiceDate).getFullYear()
    : new Date().getFullYear();
  const generatedNumber = generateNextInvoiceNumber(
    existingInvoices,
    targetYear,
  );
  return {
    ...blankInvoice,
    ...source,
    number: invoice ? source.number || source.id : generatedNumber,
    invoiceDate,
    from: {
      ...blankInvoice.from,
      ...source.from,
      name: capitalizeWords(source.from?.name || ""),
    },
    billedTo: {
      ...blankInvoice.billedTo,
      ...source.billedTo,
      name: capitalizeWords(source.billedTo?.name || ""),
    },
    status: source.status === "Sent" ? "Due" : (source.status || ""),
    items: source.items?.length
      ? source.items.map((it) => ({
          ...it,
          unitPrice:
            it.unitPrice !== undefined && it.unitPrice !== ""
              ? formatIndianNumber(it.unitPrice, true)
              : "",
          quantity:
            it.quantity !== undefined && it.quantity !== ""
              ? formatIndianNumber(it.quantity, false)
              : "1",
          tax:
            it.tax !== undefined && it.tax !== ""
              ? Number(it.tax) > 40
                ? 40
                : it.tax
              : "",
        }))
      : [
          {
            description: source.detail || "",
            unitPrice:
              source.amount !== undefined && source.amount !== ""
                ? formatIndianNumber(source.amount, true)
                : "",
            quantity: "1",
            tax: 0,
          },
        ],
  };
};

const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "company.com",
];

const Field = ({
  id,
  label,
  value,
  type = "text",
  onChange,
  pattern,
  maxLength,
  required = true,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef([]);
  const isEmail = type === "email";

  const emailSuggestions = useMemo(() => {
    if (!isEmail) return [];
    const val = String(value || "").trim();
    if (!val) {
      return COMMON_EMAIL_DOMAINS.map((domain) => `@${domain}`);
    }
    const atIndex = val.indexOf("@");
    if (atIndex === -1) {
      return COMMON_EMAIL_DOMAINS.map((domain) => `${val}@${domain}`);
    }
    const prefix = val.slice(0, atIndex);
    const domainTyped = val.slice(atIndex + 1).toLowerCase();
    return COMMON_EMAIL_DOMAINS.filter((d) => d.startsWith(domainTyped)).map(
      (d) => (prefix ? `${prefix}@${d}` : `@${d}`),
    );
  }, [isEmail, value]);

  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  const handleSelectSuggestion = (suggestion) => {
    if (suggestion.startsWith("@") && value && !value.includes("@")) {
      onChange(`${value}${suggestion}`);
    } else {
      onChange(suggestion);
    }
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isEmail || !isOpen || emailSuggestions.length === 0) return;

    const isSingleExactMatch =
      emailSuggestions.length === 1 &&
      String(value || "").trim().toLowerCase() ===
        emailSuggestions[0].toLowerCase();

    if (e.key === "Tab") {
      // If user typed the full email already and hasn't highlighted a suggestion, let Tab move to next field
      if (isSingleExactMatch && activeIndex === -1) {
        setIsOpen(false);
        return;
      }

      // Tab cycles through suggestions list
      e.preventDefault();
      if (e.shiftKey) {
        setActiveIndex((prev) =>
          prev <= 0 ? emailSuggestions.length - 1 : prev - 1,
        );
      } else {
        setActiveIndex((prev) =>
          prev < 0 ? 0 : (prev + 1) % emailSuggestions.length,
        );
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < 0 ? 0 : (prev + 1) % emailSuggestions.length,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? emailSuggestions.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < emailSuggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(emailSuggestions[activeIndex]);
      } else if (emailSuggestions.length > 0) {
        e.preventDefault();
        handleSelectSuggestion(emailSuggestions[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <label className="field">
      <span>
        {label}
        {required && <span className="required-star">*</span>}
      </span>
      <div className="field-input-wrapper">
        <input
          id={id}
          name={id}
          required={required}
          type={type}
          value={value || ""}
          pattern={pattern}
          maxLength={maxLength}
          title={title}
          placeholder={`Enter ${label.toLowerCase()}`}
          onFocus={() => {
            if (isEmail) {
              setIsOpen(true);
              setActiveIndex(-1);
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsOpen(false);
              setActiveIndex(-1);
            }, 200);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setActiveIndex(-1);
            if (isEmail && !isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {isEmail && isOpen && emailSuggestions.length > 0 && (
          <div className="email-suggestions-dropdown">
            <div className="email-suggestions-header">Suggestions</div>
            {emailSuggestions.map((item, index) => (
              <button
                key={item}
                ref={(el) => (itemRefs.current[index] = el)}
                type="button"
                tabIndex={-1}
                className={`email-suggestion-item ${index === activeIndex ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(item);
                }}
              >
                <span>{item}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return dateStr;
  const monthAbbr =
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][m - 1] || "";
  const dayPad = String(d).padStart(2, "0");
  return `${dayPad} ${monthAbbr} ${y}`;
};

const DateField = ({
  id,
  label,
  value,
  onChange,
  required = true,
  alignRight = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hiddenInputRef = useRef(null);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = String(value).split("-").map(Number);
      if (y && m) return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    if (value) {
      const [y, m] = String(value).split("-").map(Number);
      if (y && m) {
        setViewDate({ year: y, month: m - 1 });
      }
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const daysMatrix = useMemo(() => {
    const { year, month } = viewDate;
    const days = [];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewDate]);

  const pad = (n) => String(n).padStart(2, "0");

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const handleSelectDay = (cell) => {
    const formatted = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    onChange(todayStr);
    const now = new Date();
    setViewDate({ year: now.getFullYear(), month: now.getMonth() });
    setIsOpen(false);
  };

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 };
      return { year, month: month - 1 };
    });
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 };
      return { year, month: month + 1 };
    });
  };

  const displayVal = formatDisplayDate(value);

  return (
    <div
      ref={containerRef}
      className={`field date-field ${alignRight ? "align-right" : ""} ${className}`.trim()}
    >
      <span>
        {label}
        {required && <span className="required-star">*</span>}
      </span>
      <button
        id={id}
        type="button"
        className={`date-button ${isOpen ? "is-open" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span
          className={
            displayVal ? "date-value-text" : "date-placeholder-text"
          }
        >
          {displayVal || `Choose ${label.toLowerCase()}`}
        </span>
        <span aria-hidden="true" className="date-icon-badge">
          <CalendarIcon size={15} />
        </span>
      </button>

      <input
        ref={hiddenInputRef}
        type="text"
        required={required}
        value={value || ""}
        tabIndex={-1}
        onChange={() => {}}
        className="date-picker-hidden-validator"
        aria-hidden="true"
      />

      {isOpen && (
        <div
          className="date-picker-popover"
          role="dialog"
          aria-label={`${label} calendar selector`}
        >
          <div className="date-picker-header">
            <button
              type="button"
              className="date-nav-btn"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <div className="date-picker-title">
              <span className="date-month-title">
                {MONTH_NAMES[viewDate.month]}
              </span>{" "}
              <span className="date-year-title">{viewDate.year}</span>
            </div>
            <button
              type="button"
              className="date-nav-btn"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>

          <div className="date-picker-weekdays" aria-hidden="true">
            {WEEK_DAYS.map((wd) => (
              <span key={wd} className="date-weekday">
                {wd}
              </span>
            ))}
          </div>

          <div className="date-picker-days" role="grid">
            {daysMatrix.map((cell, idx) => {
              const cellDateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
              const isSelected = value === cellDateStr;
              const isToday = todayStr === cellDateStr;

              return (
                <button
                  key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                  type="button"
                  className={`date-picker-day ${
                    !cell.isCurrentMonth ? "is-other-month" : ""
                  } ${isSelected ? "is-selected" : ""} ${
                    isToday ? "is-today" : ""
                  }`}
                  onClick={() => handleSelectDay(cell)}
                  aria-label={`${cell.day} ${MONTH_NAMES[cell.month]} ${cell.year}`}
                  aria-selected={isSelected}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="date-picker-footer">
            <button
              type="button"
              className="date-quick-btn today-btn"
              onClick={handleSelectToday}
            >
              Today
            </button>
            <button
              type="button"
              className="date-quick-btn close-btn"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const InvoiceNumberField = ({ value, required = true }) => {
  const currentYear = new Date().getFullYear();
  const fullNumber = value || `INV-${currentYear}-001`;

  return (
    <label className="field invoice-number-field">
      <span>
        Invoice number{required && <span className="required-star">*</span>}
      </span>
      <input
        readOnly
        tabIndex={-1}
        type="text"
        className="field-input readonly invoice-number-input"
        value={fullNumber}
        aria-label={`Invoice number ${fullNumber}`}
      />
    </label>
  );
};

const StatusSelect = ({
  id = "status-select-btn",
  value,
  onChange,
  required = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const hiddenInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isOpen]);

  const hasValue = Boolean(
    value && (value === "Paid" || value === "Due" || value === "Sent"),
  );
  const normalizedValue = value === "Sent" ? "Due" : value;
  const isPaid = normalizedValue === "Paid";
  const isDue = normalizedValue === "Due";

  const handleSelect = (newStatus) => {
    onChange(newStatus);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      handleSelect(isPaid ? "Due" : "Paid");
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className="field status-field" ref={dropdownRef}>
      <span>
        Status{required && <span className="required-star">*</span>}
      </span>
      <div className="status-select-container">
        <button
          id={id}
          type="button"
          className={`status-select-trigger ${
            !hasValue ? "is-placeholder" : isPaid ? "is-paid" : "is-due"
          } ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={hasValue ? `Status: ${normalizedValue}` : "Select status"}
        >
          <span className="status-select-dot" aria-hidden="true" />
          <span className="status-select-value">
            {hasValue ? normalizedValue : "Select status"}
          </span>
          <ChevronDownIcon
            size={14}
            className={`status-select-chevron ${isOpen ? "rotated" : ""}`}
            aria-hidden="true"
          />
        </button>

        <input
          ref={hiddenInputRef}
          type="text"
          required={required}
          value={value || ""}
          tabIndex={-1}
          onChange={() => {}}
          className="status-hidden-validator"
          aria-hidden="true"
        />

        {isOpen && (
          <div
            className="status-dropdown-menu"
            role="listbox"
            aria-label="Select invoice status"
          >
            <button
              type="button"
              role="option"
              aria-selected={isPaid}
              className={`status-dropdown-option paid ${isPaid ? "selected" : ""}`}
              onClick={() => handleSelect("Paid")}
            >
              <span className="status-option-dot paid" />
              <span className="status-option-text">Paid</span>
              {isPaid && (
                <CheckIcon size={14} className="status-option-check" />
              )}
            </button>
            <button
              type="button"
              role="option"
              aria-selected={isDue}
              className={`status-dropdown-option due ${isDue ? "selected" : ""}`}
              onClick={() => handleSelect("Due")}
            >
              <span className="status-option-dot due" />
              <span className="status-option-text">Due</span>
              {isDue && (
                <CheckIcon size={14} className="status-option-check" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function InvoiceForm({
  onSave,
  onBack,
  initialInvoice,
  existingInvoices = [],
  onNotify,
}) {
  const [invoice, setInvoice] = useState(() =>
    copyInvoice(initialInvoice, existingInvoices),
  );
  const formRef = useRef(null);

  useEffect(() => {
    if (!initialInvoice) {
      const pickedYear = invoice.invoiceDate
        ? new Date(invoice.invoiceDate).getFullYear()
        : new Date().getFullYear();
      const nextNum = generateNextInvoiceNumber(existingInvoices, pickedYear);
      setInvoice((prev) => {
        if (prev.number !== nextNum) {
          return { ...prev, number: nextNum };
        }
        return prev;
      });
    }
  }, [existingInvoices, initialInvoice, invoice.invoiceDate]);

  const updateParty = (party, key, value) => {
    const formattedValue =
      key === "name" && typeof value === "string"
        ? capitalizeWords(value)
        : value;
    setInvoice((current) => ({
      ...current,
      [party]: { ...current[party], [key]: formattedValue },
    }));
  };

  const updateItem = (index, key, value) =>
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));

  const addItem = () =>
    setInvoice((current) => ({
      ...current,
      items: [
        ...current.items,
        { description: "", unitPrice: "", quantity: "", tax: "" },
      ],
    }));

  const removeItem = (index) =>
    setInvoice((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));

  const totals = invoice.items.reduce(
    (result, item) => {
      const price = Number(String(item.unitPrice || "").replace(/,/g, "") || 0);
      const qty = Number(String(item.quantity || "").replace(/,/g, "") || 0);
      const subtotal = price * qty;
      return {
        subtotal: result.subtotal + subtotal,
        tax: result.tax + (subtotal * Number(item.tax || 0)) / 100,
      };
    },
    { subtotal: 0, tax: 0 },
  );

  const scrollToAndFocus = (target, errorMessage = null, openType = null) => {
    let element =
      typeof target === "string"
        ? formRef.current?.querySelector(target) ||
          document.querySelector(target)
        : target;
    if (!element) return;

    if (errorMessage) {
      onNotify?.(errorMessage, "error");
    }

    // If element is inside an overflow scroll container (tablet/mobile), ensure horizontal alignment
    const scrollParent = element.closest(
      ".invoice-details-scroll, .table-scroll",
    );
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      const elemRect = element.getBoundingClientRect();
      if (elemRect.left < parentRect.left || elemRect.right > parentRect.right) {
        scrollParent.scrollTo({
          left: element.offsetLeft - 20,
          behavior: "smooth",
        });
      }
    }

    // Smoothly scroll window so the element is centered vertically
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    const focusable = element.matches?.("button, input, select, textarea")
      ? element
      : element.querySelector?.(
          "button:not([tabindex='-1']), input:not([tabindex='-1']), select, textarea",
        ) || element;

    setTimeout(() => {
      try {
        focusable.focus({ preventScroll: true });
      } catch (_) {
        try {
          focusable.focus?.();
        } catch (__) {}
      }

      if (openType === "date" || focusable.classList?.contains("date-button")) {
        if (!focusable.classList?.contains("is-open")) {
          focusable.click();
        }
      } else if (
        openType === "status" ||
        focusable.classList?.contains("status-select-trigger")
      ) {
        if (!focusable.classList?.contains("open")) {
          focusable.click();
        }
      }
    }, 200);
  };

  return (
    <section className="page form-page">
      <div className="page-nav-back">
        <button className="back" onClick={onBack}>
          <BackIcon size={16} />
          <span>Back</span>
        </button>
      </div>
      <h1>{initialInvoice ? "Edit invoice" : "Create a New Invoice"}</h1>
      <p className="subtitle">Complete the form and save your invoice.</p>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();

          // 1. Validate From details
          const fromName = String(invoice.from?.name || "").trim();
          if (!fromName) {
            scrollToAndFocus(
              "#from-name",
              "Please enter sender's name (From details)",
            );
            return;
          }
          const fromEmail = String(invoice.from?.email || "").trim();
          if (!fromEmail) {
            scrollToAndFocus(
              "#from-email",
              "Please enter sender's email (From details)",
            );
            return;
          }
          const emailRegex =
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(fromEmail)) {
            scrollToAndFocus(
              "#from-email",
              "Sender email must contain a valid domain (e.g. company@domain.com)",
            );
            return;
          }
          const fromPhone = String(invoice.from?.phone || "").trim();
          if (!fromPhone || fromPhone.length !== 10) {
            scrollToAndFocus(
              "#from-phone",
              "Sender mobile number must be exactly 10 digits",
            );
            return;
          }
          const fromAddress = String(invoice.from?.address || "").trim();
          if (!fromAddress) {
            scrollToAndFocus(
              "#from-address",
              "Please enter sender's address",
            );
            return;
          }
          const fromCity = String(invoice.from?.city || "").trim();
          if (!fromCity) {
            scrollToAndFocus(
              "#from-city",
              "Please enter sender's city",
            );
            return;
          }
          const fromPincode = String(invoice.from?.pincode || "").trim();
          if (!fromPincode) {
            scrollToAndFocus(
              "#from-pincode",
              "Please enter sender's pincode",
            );
            return;
          }

          // 2. Validate Billed to details
          const billedName = String(invoice.billedTo?.name || "").trim();
          if (!billedName) {
            scrollToAndFocus(
              "#billedTo-name",
              "Please enter client's name (Billed to)",
            );
            return;
          }
          const billedEmail = String(invoice.billedTo?.email || "").trim();
          if (!billedEmail) {
            scrollToAndFocus(
              "#billedTo-email",
              "Please enter client's email (Billed to)",
            );
            return;
          }
          if (!emailRegex.test(billedEmail)) {
            scrollToAndFocus(
              "#billedTo-email",
              "Client email must contain a valid domain (e.g. client@domain.com)",
            );
            return;
          }
          const billedPhone = String(invoice.billedTo?.phone || "").trim();
          if (!billedPhone || billedPhone.length !== 10) {
            scrollToAndFocus(
              "#billedTo-phone",
              "Client mobile number must be exactly 10 digits",
            );
            return;
          }
          const billedAddress = String(invoice.billedTo?.address || "").trim();
          if (!billedAddress) {
            scrollToAndFocus(
              "#billedTo-address",
              "Please enter client's address",
            );
            return;
          }
          const billedCity = String(invoice.billedTo?.city || "").trim();
          if (!billedCity) {
            scrollToAndFocus(
              "#billedTo-city",
              "Please enter client's city",
            );
            return;
          }
          const billedPincode = String(invoice.billedTo?.pincode || "").trim();
          if (!billedPincode) {
            scrollToAndFocus(
              "#billedTo-pincode",
              "Please enter client's pincode",
            );
            return;
          }

          // 3. Validate Invoice Details (Number, Invoice Date, Due Date, Status)
          const numberToCheck = String(invoice.number || "").trim();
          if (!numberToCheck) {
            onNotify?.("Invoice number is required", "error");
            return;
          }

          const matchPrefix =
            numberToCheck.match(/^(INV-\d{4}-)(.+)$/i) ||
            numberToCheck.match(/^(INV-)(.+)$/i);
          if (!matchPrefix || !matchPrefix[2].trim()) {
            onNotify?.(
              "Please enter a valid invoice sequence number (e.g. 001)",
              "error",
            );
            return;
          }

          const isDuplicate = existingInvoices.some(
            (inv) =>
              inv.id !== initialInvoice?.id &&
              ((inv.id &&
                inv.id.toLowerCase() === numberToCheck.toLowerCase()) ||
                (inv.number &&
                  inv.number.toLowerCase() === numberToCheck.toLowerCase())),
          );

          if (isDuplicate) {
            onNotify?.(
              `Invoice number "${numberToCheck}" is already taken by another invoice. Please use a unique number to avoid overwriting.`,
              "error",
            );
            return;
          }

          const invoiceDate = String(invoice.invoiceDate || "").trim();
          if (!invoiceDate) {
            scrollToAndFocus(
              "#invoice-date-btn",
              "Please choose an invoice date",
              "date",
            );
            return;
          }

          const dueDate = String(invoice.dueDate || "").trim();
          if (!dueDate) {
            scrollToAndFocus(
              "#due-date-btn",
              "Please choose a due date",
              "date",
            );
            return;
          }

          const status = String(invoice.status || "").trim();
          if (!status) {
            scrollToAndFocus(
              "#status-select-btn",
              "Please select an invoice status",
              "status",
            );
            return;
          }

          // 4. Validate Items
          if (!invoice.items || invoice.items.length === 0) {
            scrollToAndFocus(
              ".add-item-button",
              "Please add at least one item to the invoice",
            );
            return;
          }

          for (let i = 0; i < invoice.items.length; i++) {
            const it = invoice.items[i];
            const desc = String(it.description || "").trim();
            if (!desc) {
              scrollToAndFocus(
                `#item-desc-${i}`,
                `Please enter a description for item #${i + 1}`,
              );
              return;
            }
            const priceStr = String(it.unitPrice || "")
              .replace(/,/g, "")
              .trim();
            if (!priceStr || isNaN(Number(priceStr)) || Number(priceStr) <= 0) {
              scrollToAndFocus(
                `#item-price-${i}`,
                `Please enter a valid unit price for item #${i + 1}`,
              );
              return;
            }
            const qtyStr = String(it.quantity || "")
              .replace(/,/g, "")
              .trim();
            if (!qtyStr || isNaN(Number(qtyStr)) || Number(qtyStr) <= 0) {
              scrollToAndFocus(
                `#item-qty-${i}`,
                `Please enter a valid quantity for item #${i + 1}`,
              );
              return;
            }
            const taxStr = String(
              it.tax !== undefined && it.tax !== null ? it.tax : "",
            ).trim();
            if (
              taxStr === "" ||
              isNaN(Number(taxStr)) ||
              Number(taxStr) < 0 ||
              Number(taxStr) > 40
            ) {
              scrollToAndFocus(
                `#item-tax-${i}`,
                "Tax rate cannot exceed 40%",
              );
              return;
            }
          }

          // 5. Fallback native invalid check
          const invalid = formRef.current?.querySelector(":invalid");
          if (invalid) {
            const dateField = invalid.closest?.(".date-field");
            if (dateField) {
              const btn = dateField.querySelector(".date-button");
              scrollToAndFocus(btn, "Please choose a date", "date");
              return;
            }
            const statusField = invalid.closest?.(".status-field");
            if (statusField) {
              const btn = statusField.querySelector(".status-select-trigger");
              scrollToAndFocus(btn, "Please select an invoice status", "status");
              return;
            }
            const isEmail =
              invalid.type === "email" ||
              invalid.getAttribute("type") === "email";
            const message = invalid.validity?.rangeOverflow
              ? "Tax rate cannot exceed 40%"
              : isEmail
                ? "Enter a valid email address with a '.' (e.g. name@domain.com)"
                : invalid.pattern
                  ? "Check the mobile number or pincode format"
                  : "Please complete all required fields";
            scrollToAndFocus(invalid, message);
            return;
          }

          onSave({
            ...invoice,
            from: {
              ...invoice.from,
              name: capitalizeWords(invoice.from?.name || ""),
            },
            billedTo: {
              ...invoice.billedTo,
              name: capitalizeWords(invoice.billedTo?.name || ""),
            },
            items: invoice.items.map((item) => ({
              ...item,
              unitPrice: Number(
                String(item.unitPrice || "").replace(/,/g, "") || 0,
              ),
              quantity: Number(
                String(item.quantity || "").replace(/,/g, "") || 0,
              ),
              tax: Math.min(40, Math.max(0, Number(item.tax || 0))),
            })),
          });
        }}
      >
        <section className="form-card">
          <h2>From details</h2>
          <div className="form-grid">
            {fields.map(([key, label, type]) => (
              <Field
                key={key}
                id={`from-${key}`}
                label={label}
                type={type}
                pattern={
                  key === "phone"
                    ? "[0-9]{10}"
                    : key === "pincode"
                      ? "[0-9]{1,7}"
                      : key === "email"
                        ? "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
                        : undefined
                }
                title={
                  key === "email"
                    ? "Enter a valid email address with a '.' (e.g. name@domain.com)"
                    : undefined
                }
                maxLength={
                  key === "phone" ? 10 : key === "pincode" ? 7 : undefined
                }
                value={invoice.from[key]}
                onChange={(value) =>
                  updateParty(
                    "from",
                    key,
                    key === "phone" || key === "pincode"
                      ? value
                          .replace(/\D/g, "")
                          .slice(0, key === "phone" ? 10 : 7)
                      : key === "name"
                        ? capitalizeWords(value)
                        : value,
                  )
                }
              />
            ))}
          </div>
        </section>

        <section className="form-card">
          <h2>Billed to</h2>
          <div className="form-grid">
            {fields.map(([key, label, type]) => (
              <Field
                key={key}
                id={`billedTo-${key}`}
                label={label}
                type={type}
                pattern={
                  key === "phone"
                    ? "[0-9]{10}"
                    : key === "pincode"
                      ? "[0-9]{1,7}"
                      : key === "email"
                        ? "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
                        : undefined
                }
                title={
                  key === "email"
                    ? "Enter a valid email address with a '.' (e.g. name@domain.com)"
                    : undefined
                }
                maxLength={
                  key === "phone" ? 10 : key === "pincode" ? 7 : undefined
                }
                value={invoice.billedTo[key]}
                onChange={(value) =>
                  updateParty(
                    "billedTo",
                    key,
                    key === "phone" || key === "pincode"
                      ? value
                          .replace(/\D/g, "")
                          .slice(0, key === "phone" ? 10 : 7)
                      : key === "name"
                        ? capitalizeWords(value)
                        : value,
                  )
                }
              />
            ))}
          </div>
        </section>

        <section className="form-card invoice-details-card">
          <h2>Invoice details</h2>
          <div
            className="table-scroll-hint invoice-details-hint"
            aria-hidden="true"
          >
            <span>⇄ Swipe horizontally to view all invoice details</span>
          </div>
          <div className="invoice-details-scroll">
            <div className="form-grid four invoice-details-grid">
              <InvoiceNumberField
                value={invoice.number}
              />
              <DateField
                id="invoice-date-btn"
                label="Invoice date"
                className="invoice-date-field"
                value={invoice.invoiceDate}
                onChange={(value) => {
                  if (!initialInvoice && value) {
                    const pickedYear = new Date(value).getFullYear();
                    if (
                      !isNaN(pickedYear) &&
                      pickedYear >= 2000 &&
                      pickedYear <= 2099
                    ) {
                      const newNumber = generateNextInvoiceNumber(
                        existingInvoices,
                        pickedYear,
                      );
                      setInvoice((prev) => ({
                        ...prev,
                        invoiceDate: value,
                        number: newNumber,
                      }));
                      return;
                    }
                  }
                  setInvoice((prev) => ({ ...prev, invoiceDate: value }));
                }}
              />
              <DateField
                id="due-date-btn"
                label="Due date"
                className="due-date-field"
                alignRight={true}
                value={invoice.dueDate}
                onChange={(value) => setInvoice({ ...invoice, dueDate: value })}
              />
              <StatusSelect
                id="status-select-btn"
                value={invoice.status}
                onChange={(newStatus) =>
                  setInvoice((prev) => ({ ...prev, status: newStatus }))
                }
              />
            </div>
          </div>
        </section>

        <section className="form-card items-card">
          <div className="items-heading">
            <h2>Items</h2>
            <button
              type="button"
              className="add-item-button"
              onClick={addItem}
            >
              <PlusIcon size={15} />
              <span>Add Items</span>
            </button>
          </div>
          <div className="table-scroll-hint" aria-hidden="true">
            <span>⇄ Swipe horizontally to edit all item fields</span>
          </div>
          <div className="table-scroll">
            <table className="item-table">
              <thead>
                <tr>
                  <th>Item no.</th>
                  <th>
                    Description / Product
                    <span className="required-star">*</span>
                  </th>
                  <th>
                    Unit price<span className="required-star">*</span>
                  </th>
                  <th>
                    Quantity<span className="required-star">*</span>
                  </th>
                  <th>
                    Tax %<span className="required-star">*</span>
                  </th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => {
                  const price = Number(
                    String(item.unitPrice || "").replace(/,/g, "") || 0,
                  );
                  const qty = Number(
                    String(item.quantity || "").replace(/,/g, "") || 0,
                  );
                  const amount =
                    price * qty * (1 + Number(item.tax || 0) / 100);
                  return (
                    <tr key={index}>
                      <td>{String(index + 1).padStart(2, "0")}</td>
                      <td>
                        <input
                          id={`item-desc-${index}`}
                          required
                          placeholder="Enter description or product"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, "description", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <span className="money-input">
                          ₹
                          <input
                            id={`item-price-${index}`}
                            required
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={item.unitPrice}
                            onKeyDown={(e) => {
                              if (["e", "E", "+", "-"].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/,/g, "");
                              if (raw === "") {
                                updateItem(index, "unitPrice", "");
                                return;
                              }
                              if (!/^\d*\.?\d*$/.test(raw)) return;
                              const num = Number(raw);
                              if (num > 1000000) {
                                updateItem(index, "unitPrice", "10,00,000");
                                onNotify(
                                  "Unit price cannot exceed ₹10,00,000 (10 Lakhs)",
                                  "error",
                                );
                              } else {
                                updateItem(
                                  index,
                                  "unitPrice",
                                  formatIndianNumber(raw, true),
                                );
                              }
                            }}
                          />
                        </span>
                      </td>
                      <td>
                        <input
                          id={`item-qty-${index}`}
                          required
                          type="text"
                          inputMode="numeric"
                          placeholder="1"
                          value={item.quantity}
                          onKeyDown={(e) => {
                            if (["e", "E", "+", "-", "."].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const raw = e.target.value
                              .replace(/,/g, "")
                              .replace(/\D/g, "");
                            if (raw === "") {
                              updateItem(index, "quantity", "");
                              return;
                            }
                            const num = Number(raw);
                            if (num > 500000) {
                              updateItem(index, "quantity", "5,00,000");
                              onNotify?.(
                                "Quantity cannot exceed 5,00,000 (5 Lakhs)",
                                "error",
                              );
                            } else {
                              updateItem(
                                index,
                                "quantity",
                                formatIndianNumber(raw, false),
                              );
                            }
                          }}
                        />
                      </td>
                      <td>
                        <input
                          id={`item-tax-${index}`}
                          required
                          min="0"
                          max="40"
                          type="number"
                          placeholder="0"
                          title="Tax percentage (Maximum 40%)"
                          value={item.tax}
                          onKeyDown={(e) => {
                            if (["e", "E", "+", "-", "."].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              updateItem(index, "tax", "");
                            } else {
                              // Strip any decimal — integers only
                              const intVal = String(parseInt(val, 10));
                              const num = parseInt(val, 10);
                              if (num > 40) {
                                updateItem(index, "tax", "40");
                                onNotify?.(
                                  "Tax rate cannot exceed 40%",
                                  "error",
                                );
                              } else if (num < 0) {
                                updateItem(index, "tax", "0");
                              } else {
                                updateItem(index, "tax", intVal);
                              }
                            }
                          }}
                        />
                      </td>
                      <td>{money(amount)}</td>
                      <td>
                        <button
                          type="button"
                          className="danger item-delete"
                          disabled={invoice.items.length === 1}
                          onClick={() => removeItem(index)}
                          aria-label={`Delete item ${index + 1}`}
                        >
                          <DeleteIcon size={14} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="totals-area">
            <div className="note-card">
              <div className="note-card-header">
                <b>Payment Note & Terms</b>
                <span className="note-card-badge">Official Terms</span>
              </div>
              <ul className="note-card-terms">
                <li>
                  Payment is due within the stipulated due date mentioned on the
                  invoice.
                </li>
                <li>
                  Please quote invoice number (
                  {invoice.number || "INV-2026-001"}) when making payments.
                </li>
                <li>
                  Digital receipts and confirmation will be issued immediately
                  upon payment clearance.
                </li>
              </ul>
              <p className="note-card-footer">
                Thank you for choosing our company. We truly appreciate your
                purchase and look forward to supporting you again.
              </p>
            </div>
            <div className="totals-wrapper">
              <div className="totals">
                <div>
                  <span>Subtotal</span>
                  <b>{money(totals.subtotal)}</b>
                </div>
                <div>
                  <span>Tax / GST</span>
                  <b>{money(totals.tax)}</b>
                </div>
                <div className="total">
                  <span>Total Amount</span>
                  <b>{money(totals.subtotal + totals.tax)}</b>
                </div>
              </div>
              <div className="form-actions">
                <button className="primary submit-invoice-btn" type="submit">
                  <SaveIcon size={17} />
                  <span>
                    {initialInvoice ? "Save Changes" : "Save Invoice"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </form>
    </section>
  );
}
