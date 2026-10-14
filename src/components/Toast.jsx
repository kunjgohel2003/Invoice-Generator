import { useEffect } from "react";

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onDismiss, 3600);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div
      className={`toast toast-${toast.type}`}
      key={toast.shakeKey}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon" aria-hidden="true">
        {toast.type === "error" ? "!" : "✓"}
      </span>
      <span>{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
