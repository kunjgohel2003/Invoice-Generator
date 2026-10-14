import InvoiceTable, { money } from "../components/InvoiceTable";
import { CardIcon, CheckIcon, ClockTimerIcon, PlusIcon } from "../components/Icons";

export default function Dashboard({
  invoices,
  onCreate,
  onOpen,
  onEdit,
  onViewAll,
}) {
  const totalAmount = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0,
  );
  const paidAmount = invoices
    .filter((inv) => inv.status?.toLowerCase() === "paid")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const pendingAmount = invoices
    .filter((inv) => inv.status?.toLowerCase() !== "paid")
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  const stats = [
    {
      label: "Total Invoiced",
      value: money(totalAmount),
      count: `${invoices.length} total`,
      icon: <CardIcon size={18} />,
      theme: "primary",
    },
    {
      label: "Collected",
      value: money(paidAmount),
      count: `${invoices.filter((i) => i.status?.toLowerCase() === "paid").length} paid`,
      icon: <CheckIcon size={18} />,
      theme: "success",
    },
    {
      label: "Outstanding",
      value: money(pendingAmount),
      count: `${invoices.filter((i) => i.status?.toLowerCase() !== "paid").length} pending`,
      icon: <ClockTimerIcon size={18} />,
      theme: "warning",
    },
  ];

  return (
    <section className="page dashboard-page">
      <header className="page-head dashboard-head">
        <div className="head-text">
          <h1>Invoice Generator</h1>
          <p className="subtitle">Manage, create, and track client billing</p>
        </div>
        <button className="primary create-main-btn" onClick={onCreate}>
          <PlusIcon size={16} />
          <span>Create Invoice</span>
        </button>
      </header>

      {/* Responsive Metrics Grid */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card stat-${stat.theme}`}>
            <div className="stat-header">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-icon" aria-hidden="true">
                {stat.icon}
              </span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-meta">{stat.count}</div>
          </div>
        ))}
      </div>

      <div className="section-title">
        <h2>Recent Invoices</h2>
        <button className="text-button view-all-btn" onClick={onViewAll}>
          View all →
        </button>
      </div>

      <div className="table-card">
        <InvoiceTable
          invoices={invoices.slice(0, 3)}
          onOpen={onOpen}
          onEdit={onEdit}
        />
      </div>
    </section>
  );
}

