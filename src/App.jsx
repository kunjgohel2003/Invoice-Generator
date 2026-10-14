import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ConfirmDialog from "./components/ConfirmDialog";
import InvoiceForm from "./components/InvoiceForm";
import Toast from "./components/Toast";
import Dashboard from "./routes/Dashboard";
import History from "./routes/History";
import InvoiceDetail from "./routes/InvoiceDetail";
import {
  invoices as initialInvoices,
  generateNextInvoiceNumber,
  commitInvoiceSequence,
  syncInvoiceSequence,
} from "./data/invoices";

const STORAGE_KEY = "invoices_db";

// Loads invoices from localStorage (or defaults) and cleans status values
function getInitialInvoices() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((inv) => ({
          ...inv,
          status: inv.status === "Sent" ? "Due" : inv.status || "Due",
        }));
      }
    }
  } catch (e) {
    console.error("Failed to load invoices from localStorage:", e);
  }
  return initialInvoices.map((inv) => ({
    ...inv,
    status: inv.status === "Sent" ? "Due" : inv.status || "Due",
  }));
}

// Handles the form page for both Create and Edit modes via URL :id
function CreateInvoiceRoute({ invoices, saveInvoice, notify }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const editingInvoice = id
    ? invoices.find((invoice) => invoice.id === id)
    : null;
  const formKey = editingInvoice
    ? `edit-${editingInvoice.id}`
    : `new-${invoices.map((inv) => inv.id || inv.number).join("_")}-${location.key || "root"}`;

  return (
    <InvoiceForm
      key={formKey}
      initialInvoice={editingInvoice}
      existingInvoices={invoices}
      onBack={() =>
        navigate(editingInvoice ? `/invoice/${editingInvoice.id}` : "/")
      }
      onSave={(form) =>
        navigate(`/invoice/${saveInvoice(form, editingInvoice)}`)
      }
      onNotify={notify}
    />
  );
}

// Finds invoice by :id and displays details (or redirects if not found)
function InvoiceDetailRoute({ invoices, onDelete, notify, onStatusChange }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return <Navigate to="/history" replace />;
  return (
    <InvoiceDetail
      invoice={invoice}
      onBack={() => navigate("/history")}
      onEdit={() => navigate(`/invoice/${invoice.id}/edit`)}
      onDelete={() => onDelete([invoice.id])}
      onNotify={notify}
      onStatusChange={onStatusChange}
    />
  );
}

// Configures all page routes and navigation paths
function AppRoutes({
  invoices,
  setInvoices,
  selected,
  setSelected,
  notify,
  confirmDelete,
  updateStatus,
}) {
  const navigate = useNavigate();

  // Calculates totals, auto-generates invoice number, updates state, and saves to storage & API
  const saveInvoice = (form, editingInvoice) => {
    const wasEditing = Boolean(editingInvoice);
    const invoiceYear = form.invoiceDate
      ? new Date(form.invoiceDate).getFullYear()
      : new Date().getFullYear();
    const id =
      editingInvoice?.id ||
      form.number?.trim() ||
      generateNextInvoiceNumber(invoices, invoiceYear);
    commitInvoiceSequence(id);
    const cleanedItems = (form.items || []).map((it) => ({
      ...it,
      unitPrice: Number(String(it.unitPrice || 0).replace(/,/g, "")),
      quantity: Number(String(it.quantity || 0).replace(/,/g, "")),
      tax: Math.min(40, Math.max(0, Number(it.tax || 0))),
    }));
    const amount = cleanedItems.reduce(
      (total, item) =>
        total +
        Number(item.unitPrice || 0) *
          Number(item.quantity || 0) *
          (1 + Number(item.tax || 0) / 100),
      0,
    );
    const savedInvoice = {
      ...form,
      id,
      number: id,
      items: cleanedItems,
      client: form.billedTo?.name || form.client || "Client",
      initials: (form.billedTo?.name || form.client || "IN")
        .slice(0, 2)
        .toUpperCase(),
      detail: (() => {
        const descs = cleanedItems
          .map((it) => it?.description?.trim())
          .filter(Boolean);
        if (descs.length === 1) return descs[0];
        if (descs.length === 2) return `${descs[0]}, ${descs[1]}`;
        if (descs.length > 2) return `${descs[0]}, ${descs[1]} ...`;
        return form.detail || "Invoice items";
      })(),
      date:
        form.invoiceDate || form.date || new Date().toISOString().slice(0, 10),
      amount,
      status:
        form.status === "Sent"
          ? "Due"
          : form.status || editingInvoice?.status || "Due",
    };

    setInvoices((current) => {
      const updatedList = editingInvoice
        ? current.map((inv) => (inv.id === id ? savedInvoice : inv))
        : [savedInvoice, ...current];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      } catch (e) {
        console.error(e);
      }
      return updatedList;
    });

    // Save to db.json via API
    fetch("/api/invoices", {
      method: wasEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savedInvoice),
    }).catch((err) => {
      console.log("API persistence fallback:", err);
    });

    notify(
      wasEditing ? "Invoice edited successfully" : "Invoice saved successfully",
    );
    return id;
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Dashboard
            invoices={invoices}
            onCreate={() => navigate("/create")}
            onOpen={(invoice) => navigate(`/invoice/${invoice.id}`)}
            onEdit={(invoice) => navigate(`/invoice/${invoice.id}/edit`)}
            onViewAll={() => navigate("/history")}
          />
        }
      />
      <Route
        path="/create"
        element={
          <CreateInvoiceRoute
            invoices={invoices}
            saveInvoice={saveInvoice}
            notify={notify}
          />
        }
      />
      <Route
        path="/history"
        element={
          <History
            invoices={invoices}
            selected={selected}
            onSelect={setSelected}
            onDelete={() => confirmDelete(selected)}
            onDeleteSingle={(id) => confirmDelete([id])}
            onStatusChange={updateStatus}
            onOpen={(invoice) => navigate(`/invoice/${invoice.id}`)}
            onEdit={(invoice) => navigate(`/invoice/${invoice.id}/edit`)}
            onBack={() => navigate("/")}
          />
        }
      />
      <Route
        path="/invoice/:id"
        element={
          <InvoiceDetailRoute
            invoices={invoices}
            onDelete={confirmDelete}
            notify={notify}
            onStatusChange={updateStatus}
          />
        }
      />
      <Route
        path="/invoice/:id/edit"
        element={
          <CreateInvoiceRoute
            invoices={invoices}
            saveInvoice={saveInvoice}
            notify={notify}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Root component managing app-wide state, toasts, and dialogs
export default function App() {
  const [invoices, setInvoices] = useState(() => {
    const initial = getInitialInvoices();
    syncInvoiceSequence(initial);
    return initial;
  });
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState([]);
  const [toast, setToast] = useState(null);

  // Pops up top-right toast alerts with shake animation
  const notify = (message, type = "success") =>
    setToast({ message, type, shakeKey: Date.now() });

  // Fetches and synchronizes invoices with /api/invoices on startup
  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("API not available");
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const cleaned = data.map((inv) => ({
            ...inv,
            status: inv.status === "Sent" ? "Due" : inv.status || "Due",
          }));
          setInvoices(cleaned);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          syncInvoiceSequence(cleaned);
        } else {
          // Sync current invoices into empty db.json
          const initial = getInitialInvoices();
          syncInvoiceSequence(initial);
          for (const inv of initial) {
            fetch("/api/invoices", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(inv),
            }).catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.log("Initial API fetch using local storage:", err);
        syncInvoiceSequence(invoices);
      });
  }, []);

  // Stores target IDs and opens the delete confirmation popup
  const confirmDelete = (ids) => {
    setDeleteIds(ids);
    setConfirmOpen(true);
  };

  // Deletes invoices from state, storage, and database
  const deleteInvoices = () => {
    setInvoices((current) => {
      const updated = current.filter(
        (invoice) => !deleteIds.includes(invoice.id),
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      syncInvoiceSequence(updated);
      return updated;
    });

    // Sync delete to db.json API
    fetch("/api/invoices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: deleteIds }),
    }).catch((err) => {
      console.log("Delete API persistence fallback:", err);
    });

    setSelected((prev) => prev.filter((id) => !deleteIds.includes(id)));
    setConfirmOpen(false);
    notify("Deleted successfully");
  };

  // Toggles invoice status (Paid / Due) and syncs changes
  const updateStatus = (id, newStatus) => {
    const previousInvoice = invoices.find((inv) => inv.id === id);
    const previousStatus = previousInvoice?.status;
    let updatedInvoice = null;
    setInvoices((current) => {
      const updated = current.map((inv) => {
        if (inv.id === id) {
          updatedInvoice = { ...inv, status: newStatus };
          return updatedInvoice;
        }
        return inv;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (updatedInvoice) {
      fetch("/api/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedInvoice),
      }).catch((err) => {
        console.log("Status API persistence fallback:", err);
      });
    }

    const isPaidToDue =
      String(previousStatus).toLowerCase() === "paid" &&
      String(newStatus).toLowerCase() === "due";

    notify(`Status changed to ${newStatus}`, isPaidToDue ? "error" : "success");
  };

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="content">
          <AppRoutes
            invoices={invoices}
            setInvoices={setInvoices}
            selected={selected}
            setSelected={setSelected}
            notify={notify}
            confirmDelete={confirmDelete}
            updateStatus={updateStatus}
          />
        </main>
        <ConfirmDialog
          open={confirmOpen}
          count={deleteIds.length}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={deleteInvoices}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    </BrowserRouter>
  );
}