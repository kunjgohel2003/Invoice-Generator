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
import Auth from "./routes/Auth";
import Profile from "./routes/Profile";
import {
  invoices as initialInvoices,
  generateNextInvoiceNumber,
  commitInvoiceSequence,
  syncInvoiceSequence,
} from "./data/invoices";
import {
  getCurrentUser,
  setCurrentUser as persistCurrentUser,
  clearCurrentUser,
} from "./utils/auth";

// Scrolls window and main scroll containers to the top on every route change or page load
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const contentEl = document.querySelector(".content");
    if (contentEl) contentEl.scrollTop = 0;
    const bodyEl = document.documentElement || document.body;
    if (bodyEl) bodyEl.scrollTop = 0;
  }, [pathname]);

  return null;
}

// Scoped per-user storage key generator
export const getUserStorageKey = (username) =>
  username ? `invoices_db_${String(username).trim().toLowerCase()}` : "invoices_db";

// Loads invoices for a specific user from localStorage (or defaults for demo user)
function getInitialInvoices(username) {
  if (!username) return [];
  const key = getUserStorageKey(username);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((inv) => ({
          ...inv,
          status: inv.status === "Sent" ? "Due" : inv.status || "Due",
        }));
      }
    }
  } catch (e) {
    console.error(`Failed to load invoices for user "${username}":`, e);
  }

  // Pre-seed sample invoices only for "demo" user so new signups start completely clean
  if (String(username).toLowerCase() === "demo") {
    return initialInvoices.map((inv) => ({
      ...inv,
      username: "demo",
      status: inv.status === "Sent" ? "Due" : inv.status || "Due",
    }));
  }

  return [];
}

// Handles the form page for both Create and Edit modes via URL :id
function CreateInvoiceRoute({ invoices, saveInvoice, notify, currentUser }) {
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
      currentUser={currentUser}
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
  currentUser,
  selected,
  setSelected,
  notify,
  confirmDelete,
  updateStatus,
  handleLogout,
  handleUserUpdate,
  handleAccountDeleted,
  handleClearInvoices,
}) {
  const navigate = useNavigate();

  // Calculates totals, auto-generates invoice number, updates state, and saves to storage & API
  const saveInvoice = (form, editingInvoice) => {
    const wasEditing = Boolean(editingInvoice);
    const invoiceYear = form.invoiceDate
      ? new Date(form.invoiceDate).getFullYear()
      : new Date().getFullYear();
    const userPrefix = currentUser?.username;
    const id =
      editingInvoice?.id ||
      form.number?.trim() ||
      generateNextInvoiceNumber(invoices, invoiceYear, userPrefix);
    commitInvoiceSequence(id, userPrefix);

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
      username: currentUser?.username, // Scoped to active user
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
        if (currentUser?.username) {
          localStorage.setItem(
            getUserStorageKey(currentUser.username),
            JSON.stringify(updatedList),
          );
        }
      } catch (e) {
        console.error(e);
      }
      return updatedList;
    });

    // Save to backend db.json via API scoped to current user
    if (currentUser?.username) {
      fetch(`/api/invoices?user=${encodeURIComponent(currentUser.username)}`, {
        method: wasEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedInvoice),
      }).catch((err) => {
        console.log("API persistence fallback:", err);
      });
    }

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
            currentUser={currentUser}
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
            currentUser={currentUser}
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
            currentUser={currentUser}
            onNotify={notify}
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
            currentUser={currentUser}
            saveInvoice={saveInvoice}
            notify={notify}
          />
        }
      />
      <Route
        path="/profile"
        element={
          <Profile
            currentUser={currentUser}
            invoices={invoices}
            onUserUpdate={handleUserUpdate}
            onAccountDeleted={handleAccountDeleted}
            onLogout={handleLogout}
            onNotify={notify}
            onClearInvoices={handleClearInvoices}
          />
        }
      />
      <Route path="/account" element={<Navigate to="/profile" replace />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Root component managing app-wide state, toasts, and dialogs
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [invoices, setInvoices] = useState(() => {
    if (!currentUser?.username) return [];
    const initial = getInitialInvoices(currentUser.username);
    syncInvoiceSequence(initial, undefined, currentUser.username);
    return initial;
  });
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState([]);
  const [toast, setToast] = useState(null);

  // Validate active session against backend database on load/refresh
  useEffect(() => {
    if (!currentUser?.username) return;

    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((users) => {
        if (Array.isArray(users)) {
          const userExists = users.some(
            (u) =>
              (u.username || "").toLowerCase() ===
              (currentUser.username || "").toLowerCase()
          );
          if (!userExists) {
            // User was deleted or database was wiped: invalidate session
            clearCurrentUser();
            setCurrentUser(null);
            setInvoices([]);
            setSelected([]);
          }
        }
      })
      .catch((err) => {
        console.log("Session validation note:", err);
      });
  }, [currentUser?.username]);

  // Sidebar collapse toggle state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch (e) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  // Pops up top-right toast alerts with shake animation
  const notify = (message, type = "success") =>
    setToast({ message, type, shakeKey: Date.now() });

  // On login success handler
  const handleLoginSuccess = (user) => {
    persistCurrentUser(user);
    setCurrentUser(user);
    notify(`Signed in as @${user.username}`);
  };

  // Sign out handler
  const handleLogout = () => {
    clearCurrentUser();
    setCurrentUser(null);
    setInvoices([]);
    setSelected([]);
    notify("Signed out successfully");
  };

  // User profile update handler (username or password change)
  const handleUserUpdate = (updatedUser) => {
    persistCurrentUser(updatedUser);
    setCurrentUser(updatedUser);
    const newInvoices = getInitialInvoices(updatedUser.username);
    setInvoices(newInvoices);
    syncInvoiceSequence(newInvoices, undefined, updatedUser.username);
  };

  // Account deleted handler
  const handleAccountDeleted = () => {
    clearCurrentUser();
    setCurrentUser(null);
    setInvoices([]);
    setSelected([]);
    notify("Account and all associated invoice data permanently deleted");
  };

  // Reset invoices handler
  const handleClearInvoices = () => {
    if (!currentUser?.username) return;
    const username = currentUser.username;
    localStorage.setItem(getUserStorageKey(username), JSON.stringify([]));
    setInvoices([]);
    const ids = invoices.map((i) => i.id);
    if (ids.length > 0) {
      fetch(`/api/invoices?user=${encodeURIComponent(username)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }).catch(() => {});
    }
  };

  // Synchronize invoices whenever the active user changes
  useEffect(() => {
    if (!currentUser?.username) {
      setInvoices([]);
      return;
    }

    const username = currentUser.username;
    const initial = getInitialInvoices(username);
    setInvoices(initial);
    syncInvoiceSequence(initial, undefined, username);

    fetch(`/api/invoices?user=${encodeURIComponent(username)}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("API not available");
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const cleaned = data.map((inv) => ({
            ...inv,
            status: inv.status === "Sent" ? "Due" : inv.status || "Due",
          }));
          setInvoices(cleaned);
          localStorage.setItem(
            getUserStorageKey(username),
            JSON.stringify(cleaned),
          );
          syncInvoiceSequence(cleaned, undefined, username);
        }
      })
      .catch((err) => {
        console.log("Using localStorage for user:", username, err);
        syncInvoiceSequence(initial, undefined, username);
      });
  }, [currentUser?.username]);

  // Stores target IDs and opens the delete confirmation popup
  const confirmDelete = (ids) => {
    setDeleteIds(ids);
    setConfirmOpen(true);
  };

  // Deletes invoices from state, storage, and database for current user
  const deleteInvoices = () => {
    if (!currentUser?.username) return;
    const username = currentUser.username;

    setInvoices((current) => {
      const updated = current.filter(
        (invoice) => !deleteIds.includes(invoice.id),
      );
      localStorage.setItem(
        getUserStorageKey(username),
        JSON.stringify(updated),
      );
      syncInvoiceSequence(updated, undefined, username);
      return updated;
    });

    // Sync delete to db.json API for this user
    fetch(`/api/invoices?user=${encodeURIComponent(username)}`, {
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
    if (!currentUser?.username) return;
    const username = currentUser.username;
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
      localStorage.setItem(
        getUserStorageKey(username),
        JSON.stringify(updated),
      );
      return updated;
    });

    if (updatedInvoice) {
      fetch(`/api/invoices?user=${encodeURIComponent(username)}`, {
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

  // If not signed in, show the Auth page directly
  if (!currentUser) {
    return (
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route
            path="/auth"
            element={<Auth onLoginSuccess={handleLoginSuccess} />}
          />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar
          currentUser={currentUser}
          onLogout={handleLogout}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main className="content">
          <AppRoutes
            invoices={invoices}
            setInvoices={setInvoices}
            currentUser={currentUser}
            selected={selected}
            setSelected={setSelected}
            notify={notify}
            confirmDelete={confirmDelete}
            updateStatus={updateStatus}
            handleLogout={handleLogout}
            handleUserUpdate={handleUserUpdate}
            handleAccountDeleted={handleAccountDeleted}
            handleClearInvoices={handleClearInvoices}
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
