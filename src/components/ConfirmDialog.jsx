import { DeleteIcon } from "./Icons";

// Modal dialog confirming the permanent deletion of one or more invoices
export default function ConfirmDialog({ open, count, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        <h2 id="delete-title">
          Delete {count > 1 ? `${count} invoices` : "invoice"}?
        </h2>
        <p>
          This will permanently remove{" "}
          {count > 1 ? "the selected invoices" : "this invoice"}. This action
          can’t be undone.
        </p>
        <div className="dialog-actions">
          <button className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="danger" onClick={onConfirm}>
            <DeleteIcon size={16} />
            <span>Yes, delete</span>
          </button>
        </div>
      </section>
    </div>
  );
}
