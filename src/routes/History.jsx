import { useState, useRef, useEffect } from "react";
import InvoiceTable from "../components/InvoiceTable";
import {
  DeleteIcon,
  BackIcon,
  SearchIcon,
  CrossIcon,
  SortIcon,
  ChevronDownIcon,
  CheckIcon,
  FilterIcon,
  ResetIcon,
} from "../components/Icons";

export default function History({
  invoices,
  selected,
  onSelect,
  onDelete,
  onDeleteSingle,
  onStatusChange,
  onOpen,
  onEdit,
  onBack,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  const [sortBy, setSortBy] = useState("client-az");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  const isFilteredOrSorted =
    statusFilter !== "all" || sortBy !== "client-az" || searchTerm.trim() !== "";

  const handleResetFilters = () => {
    setStatusFilter("all");
    setSortBy("client-az");
    setSearchTerm("");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target)
      ) {
        setIsSortOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target)
      ) {
        setIsFilterOpen(false);
      }
    };
    if (isSortOpen || isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSortOpen, isFilterOpen]);

  const filterOptions = [
    { id: "all", label: "All" },
    { id: "paid", label: "Paid" },
    { id: "due", label: "Due" },
  ];

  const currentFilterLabel =
    filterOptions.find((opt) => opt.id === statusFilter)?.label || "All";

  const sortOptions = [
    { id: "client-az", label: "Client name A-Z" },
    { id: "number-asc", label: "Invoice numbers" },
    { id: "amount-asc", label: "Amount (Low-High)" },
  ];

  const currentSortLabel =
    sortOptions.find((opt) => opt.id === sortBy)?.label || "Client name A-Z";

  const filteredInvoices = invoices
    .filter((invoice) => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        invoice.client?.toLowerCase().includes(query) ||
        invoice.id?.toLowerCase().includes(query) ||
        (invoice.detail && invoice.detail.toLowerCase().includes(query)) ||
        (invoice.items &&
          invoice.items.some((it) =>
            (it?.description || "").toLowerCase().includes(query),
          ));

      const matchesStatus =
        statusFilter === "all" ||
        invoice.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "client-az": {
          const nameA = (a.client || "").trim();
          const nameB = (b.client || "").trim();
          return nameA.localeCompare(nameB, undefined, {
            sensitivity: "base",
          });
        }
        case "number-asc": {
          const numA = a.number || a.id || "";
          const numB = b.number || b.id || "";
          return numA.localeCompare(numB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        case "amount-asc": {
          const amtA = Number(a.amount || 0);
          const amtB = Number(b.amount || 0);
          if (amtA !== amtB) return amtA - amtB;
          const numA = a.number || a.id || "";
          const numB = b.number || b.id || "";
          return numA.localeCompare(numB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        default:
          return 0;
      }
    });

  return (
    <section className="page history-page">
      <div className="page-nav-back">
        <button className="back" onClick={onBack}>
          <BackIcon size={16} />
          <span>Back to overview</span>
        </button>
      </div>

      <header className="page-head history-head">
        <div className="history-head-info">
          <h1>Invoice History</h1>
          <p className="subtitle">
            Showing {filteredInvoices.length} of {invoices.length} total
            invoices
          </p>
        </div>
        <div className="history-actions">
          <span className="selected-badge">{selected.length} selected</span>
          <button
            className="danger delete-btn"
            disabled={!selected.length}
            onClick={onDelete}
          >
            <DeleteIcon size={16} />
            <span>Delete selected</span>
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="history-toolbar">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            role="searchbox"
            autoComplete="off"
            placeholder="Search by client, invoice # or item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            aria-label="Search invoices"
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              <CrossIcon size={14} />
            </button>
          )}
        </div>

        <div className="history-toolbar-actions">
          {/* Status Filter Dropdown */}
          <div className="sort-dropdown-container status-filter-dropdown" ref={filterDropdownRef}>
            <button
              type="button"
              className={`sort-trigger-btn status-trigger-btn ${isFilterOpen ? "active" : ""}`}
              onClick={() => {
                setIsFilterOpen((open) => !open);
                setIsSortOpen(false);
              }}
              aria-label="Filter by status"
              aria-haspopup="listbox"
              aria-expanded={isFilterOpen}
            >
              <span className="sort-trigger-left">
                <FilterIcon size={15} />
                <span className="sort-trigger-label">Status:</span>
                <span className="sort-current-val">{currentFilterLabel}</span>
              </span>
              <ChevronDownIcon
                size={13}
                className={`sort-chevron ${isFilterOpen ? "rotated" : ""}`}
              />
            </button>

            {isFilterOpen && (
              <div className="sort-menu-dropdown" role="listbox">
                {filterOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={statusFilter === opt.id}
                    className={`sort-menu-item ${statusFilter === opt.id ? "selected" : ""}`}
                    onClick={() => {
                      setStatusFilter(opt.id);
                      setIsFilterOpen(false);
                    }}
                  >
                    <span className="sort-option-text">{opt.label}</span>
                    {statusFilter === opt.id && (
                      <CheckIcon size={14} className="sort-check-icon" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="sort-dropdown-container sort-filter-dropdown" ref={sortDropdownRef}>
            <button
              type="button"
              className={`sort-trigger-btn sort-by-trigger-btn ${isSortOpen ? "active" : ""}`}
              onClick={() => {
                setIsSortOpen((open) => !open);
                setIsFilterOpen(false);
              }}
              aria-label="Sort options"
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
            >
              <span className="sort-trigger-left">
                <SortIcon size={15} />
                <span className="sort-trigger-label">Sort:</span>
                <span className="sort-current-val">{currentSortLabel}</span>
              </span>
              <ChevronDownIcon
                size={13}
                className={`sort-chevron ${isSortOpen ? "rotated" : ""}`}
              />
            </button>

            {isSortOpen && (
              <div className="sort-menu-dropdown" role="listbox">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={sortBy === opt.id}
                    className={`sort-menu-item ${sortBy === opt.id ? "selected" : ""}`}
                    onClick={() => {
                      setSortBy(opt.id);
                      setIsSortOpen(false);
                    }}
                  >
                    <span className="sort-option-text">{opt.label}</span>
                    {sortBy === opt.id && (
                      <CheckIcon size={14} className="sort-check-icon" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Filter Button */}
          <button
            type="button"
            className={`reset-filters-btn ${isFilteredOrSorted ? "is-active" : ""}`}
            onClick={handleResetFilters}
            title="Reset filters and sorting"
            aria-label="Reset filters"
          >
            <ResetIcon size={14} />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      <div className="table-card">
        <InvoiceTable
          invoices={filteredInvoices}
          selectable
          selected={selected}
          onSelect={onSelect}
          onOpen={onOpen}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      </div>
    </section>
  );
}
