import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  BackIcon,
  CheckIcon,
  ShieldCheckIcon,
  DeleteIcon,
  LogOutIcon,
  CardIcon,
} from "../components/Icons";
import { money } from "../components/InvoiceTable";
import {
  getPasswordValidationState,
  isPasswordValid,
  isUsernameTaken,
  getRegisteredUsers,
  updateUserProfile,
  deleteUserAccountPermanently,
} from "../utils/auth";
import "../styles/profile.css";

export default function Profile({
  currentUser,
  invoices = [],
  onUserUpdate,
  onAccountDeleted,
  onLogout,
  onNotify,
}) {
  const navigate = useNavigate();

  // Username form state
  const [newUsername, setNewUsername] = useState(currentUser?.username || "");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Modals state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUsernameLower = (currentUser?.username || "").toLowerCase();
  const trimmedNewUsername = newUsername.trim();

  // Real-time check if new username is taken by another account
  const isTakenByOther =
    trimmedNewUsername.length > 0 &&
    trimmedNewUsername.toLowerCase() !== currentUsernameLower &&
    isUsernameTaken(trimmedNewUsername);

  // Password validation rules
  const pwRules = getPasswordValidationState(newPassword);
  const isNewPwValid = isPasswordValid(newPassword);

  // Real-time check: current password and new password cannot be the same
  const isSamePassword =
    Boolean(currentPassword) &&
    Boolean(newPassword) &&
    currentPassword === newPassword;

  // Stats calculation
  const totalAmount = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0
  );
  const paidCount = invoices.filter(
    (inv) => inv.status?.toLowerCase() === "paid"
  ).length;

  // Handle Username Update
  const handleSaveUsername = (e) => {
    e.preventDefault();
    setUsernameError("");

    if (!trimmedNewUsername) {
      setUsernameError("Username cannot be empty");
      return;
    }

    if (trimmedNewUsername.toLowerCase() === currentUsernameLower) {
      onNotify("No changes to username", "info");
      return;
    }

    if (isTakenByOther) {
      return; // Error is already shown beneath the input in red
    }

    setUsernameSaving(true);
    const result = updateUserProfile({
      oldUsername: currentUser.username,
      newUsername: trimmedNewUsername,
    });

    setUsernameSaving(false);
    if (result.success) {
      onUserUpdate(result.user);
      onNotify(`Username updated to @${result.user.username}`);
      setUsernameTouched(false);
    } else {
      setUsernameError(result.error || "Failed to update username");
    }
  };

  // Handle Password Update
  const handleSavePassword = (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!newPassword) {
      setPwError("Please enter a new password");
      return;
    }

    if (currentPassword && currentPassword === newPassword) {
      setPwError("The current password and new password cannot be the same");
      return;
    }

    if (!isNewPwValid) {
      setPwError("New password does not meet all security criteria");
      return;
    }

    setPwSaving(true);
    const result = updateUserProfile({
      oldUsername: currentUser.username,
      currentPassword,
      newPassword,
    });

    setPwSaving(false);
    if (result.success) {
      setPwSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      onNotify("Password updated successfully!");
    } else {
      setPwError(result.error || "Failed to update password");
    }
  };

  // Handle Permanent Account Deletion
  const handleConfirmDeleteAccount = () => {
    if (deleteConfirmText.trim().toLowerCase() !== currentUser.username.toLowerCase()) {
      setDeleteError(`Please type your exact username "${currentUser.username}" to confirm`);
      return;
    }

    setIsDeleting(true);
    deleteUserAccountPermanently(currentUser.username);

    setTimeout(() => {
      setIsDeleting(false);
      setShowDeleteModal(false);
      if (onAccountDeleted) {
        onAccountDeleted();
      }
      navigate("/auth", { replace: true });
    }, 400);
  };

  const initial = currentUser?.username
    ? currentUser.username.charAt(0).toUpperCase()
    : "U";

  return (
    <section className="page profile-page">
      {/* Back navigation matching other pages */}
      <div className="page-nav-back">
        <button className="back" onClick={() => navigate("/")}>
          <BackIcon size={16} />
          <span>Back to dashboard</span>
        </button>
      </div>

      {/* Top Page Header */}
      <header className="page-head profile-head">
        <div>
          <h1>Account & Profile Settings</h1>
          <p className="subtitle">
            Manage your credentials, private data vault, and account security
          </p>
        </div>

        <div className="profile-header-actions">
          <button
            type="button"
            className="secondary-btn profile-logout-top-btn"
            onClick={onLogout}
          >
            <LogOutIcon size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* User Identity & Vault Overview Card */}
      <div className="profile-user-hero-card">
        <div className="profile-hero-left">
          <div className="profile-avatar-large">{initial}</div>
          <div className="profile-hero-meta">
            <div className="profile-username-tag">
              <h2>@{currentUser?.username}</h2>
              <span className="profile-status-pill">
                <ShieldCheckIcon size={14} /> Private Vault Active
              </span>
            </div>
            <p className="profile-hero-sub">
              Your invoices, client databases, and sequence counters are completely
              isolated to your account.
            </p>
          </div>
        </div>

        <div className="profile-hero-stats">
          <div className="profile-hero-stat-card">
            <span className="stat-label">Invoices Created</span>
            <span className="stat-value">{invoices.length}</span>
            <span className="stat-hint">{paidCount} marked as paid</span>
          </div>
          <div className="profile-hero-stat-card">
            <span className="stat-label">Total Invoiced</span>
            <span className="stat-value">{money(totalAmount)}</span>
            <span className="stat-hint">Across all currencies</span>
          </div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="profile-settings-grid">
        {/* SECTION 1: CHANGE USERNAME */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-icon-box">
              <UserIcon size={20} />
            </div>
            <div>
              <h3>Change Username</h3>
              <p>Update your public username and migrate your private vault</p>
            </div>
          </div>

          <form onSubmit={handleSaveUsername} className="profile-form">
            <div className="profile-field-group">
              <label htmlFor="new-username-input">New Username</label>
              <div
                className={`profile-input-wrap ${
                  isTakenByOther ? "has-danger-border" : ""
                }`}
              >
                <div className="profile-field-icon" aria-hidden="true">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  id="new-username-input"
                  className="profile-input"
                  placeholder="Enter new username"
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    setUsernameTouched(true);
                    setUsernameError("");
                  }}
                  onBlur={() => setUsernameTouched(true)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
              </div>

              {/* Exact user-requested alert in red */}
              {isTakenByOther && (
                <div className="profile-field-alert-danger" role="alert">
                  <span>⚠️</span>
                  <span>this username is taken please choose differnt username</span>
                </div>
              )}

              {usernameError && !isTakenByOther && (
                <div className="profile-field-alert-danger" role="alert">
                  <span>⚠️</span>
                  <span>{usernameError}</span>
                </div>
              )}

              {/* Informational banner to balance height with password card */}
              <div className="profile-info-banner">
                <div className="profile-info-banner-header">
                  <ShieldCheckIcon size={16} />
                  <span>Private Vault & Data Safety</span>
                </div>
                <p>
                  Updating your username automatically migrates your private invoice
                  records, sequence numbers, and client history to your new username.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                usernameSaving ||
                isTakenByOther ||
                trimmedNewUsername.toLowerCase() === currentUsernameLower
              }
              className="primary profile-action-btn"
            >
              {usernameSaving ? "Saving..." : "Update Username"}
            </button>
          </form>
        </div>

        {/* SECTION 2: CHANGE PASSWORD */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-icon-box lock-box">
              <LockIcon size={20} />
            </div>
            <div>
              <h3>Change Password</h3>
              <p>Update your secure account password</p>
            </div>
          </div>

          <form onSubmit={handleSavePassword} className="profile-form">
            <div className="profile-field-group">
              <label htmlFor="current-pw-input">Current Password</label>
              <div className="profile-input-wrap">
                <div className="profile-field-icon" aria-hidden="true">
                  <LockIcon size={18} />
                </div>
                <input
                  type={showCurrentPw ? "text" : "password"}
                  id="current-pw-input"
                  className="profile-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPwError("");
                  }}
                />
                <button
                  type="button"
                  className="profile-eye-btn"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  aria-label="Toggle password view"
                >
                  {showCurrentPw ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            <div className="profile-field-group">
              <label htmlFor="new-pw-input">New Password</label>
              <div
                className={`profile-input-wrap ${
                  isSamePassword ? "has-danger-border" : ""
                }`}
              >
                <div className="profile-field-icon" aria-hidden="true">
                  <LockIcon size={18} />
                </div>
                <input
                  type={showNewPw ? "text" : "password"}
                  id="new-pw-input"
                  className="profile-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPwError("");
                    setPwSuccess("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="profile-eye-btn"
                  onClick={() => setShowNewPw(!showNewPw)}
                  aria-label="Toggle password view"
                >
                  {showNewPw ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>

              {/* Real-time alert: current and new password cannot be identical */}
              {isSamePassword && (
                <div className="profile-field-alert-danger" role="alert">
                  <span>⚠️</span>
                  <span>The current password and new password cannot be the same</span>
                </div>
              )}

              {/* Password criteria checklist */}
              <div className="profile-criteria-box">
                <div className="profile-criteria-grid">
                  <span className={`criteria-chip ${pwRules.minLength ? "met" : ""}`}>
                    {pwRules.minLength ? "✓" : "○"} 8+ chars
                  </span>
                  <span className={`criteria-chip ${pwRules.hasNumber ? "met" : ""}`}>
                    {pwRules.hasNumber ? "✓" : "○"} 1+ number
                  </span>
                  <span className={`criteria-chip ${pwRules.hasSpecial ? "met" : ""}`}>
                    {pwRules.hasSpecial ? "✓" : "○"} 1+ special
                  </span>
                  <span className={`criteria-chip ${pwRules.hasCapital ? "met" : ""}`}>
                    {pwRules.hasCapital ? "✓" : "○"} 1+ uppercase
                  </span>
                  <span className={`criteria-chip ${pwRules.hasLower ? "met" : ""}`}>
                    {pwRules.hasLower ? "✓" : "○"} 1+ lowercase
                  </span>
                </div>
              </div>

              {pwError && !isSamePassword && (
                <div className="profile-field-alert-danger" role="alert">
                  <span>⚠️</span>
                  <span>{pwError}</span>
                </div>
              )}

              {pwSuccess && (
                <div className="profile-field-alert-success" role="status">
                  <span>✓</span>
                  <span>{pwSuccess}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                pwSaving ||
                !newPassword ||
                !isNewPwValid ||
                isSamePassword
              }
              className="primary profile-action-btn"
            >
              {pwSaving ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* SECTION 3: DANGER ZONE - DELETE ACCOUNT PERMANENTLY */}
        <div className="profile-card danger-card">
          <div className="profile-card-header profile-danger-header">
            <div className="profile-card-icon-box danger-box">
              <DeleteIcon size={20} />
            </div>
            <div>
              <h3 className="danger-text">Delete Account Permanently</h3>
              <p>Permanently remove your account, credentials, and all stored data</p>
            </div>
          </div>

          <div className="profile-danger-layout">
            <p className="danger-warning-text">
              <strong>Warning:</strong> Deleting your account will immediately and permanently
              erase username <strong>@{currentUser?.username}</strong>, along with all{" "}
              <strong>{invoices.length} saved invoice(s)</strong>, clients, and sequence counters.
              This operation cannot be reversed.
            </p>

            <div className="profile-danger-action">
              <button
                type="button"
                className="danger-btn"
                onClick={() => {
                  setDeleteConfirmText("");
                  setDeleteError("");
                  setShowDeleteModal(true);
                }}
              >
                <DeleteIcon size={16} />
                <span>Delete My Account Permanently</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card danger-modal-card">
            <div className="modal-header">
              <div className="danger-badge-icon">⚠️</div>
              <div>
                <h3>Permanently Delete Account?</h3>
                <p>This will erase all data for @{currentUser?.username}</p>
              </div>
            </div>

            <div className="modal-body">
              <p>
                To confirm permanent deletion of your account and all associated invoice
                records, please type your username <strong>{currentUser?.username}</strong> below:
              </p>
              <input
                type="text"
                className="profile-input confirm-danger-input"
                placeholder={currentUser?.username}
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  setDeleteError("");
                }}
                autoCapitalize="none"
              />
              {deleteError && (
                <div className="profile-field-alert-danger" role="alert">
                  <span>⚠️</span>
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={handleConfirmDeleteAccount}
                disabled={
                  isDeleting ||
                  deleteConfirmText.trim().toLowerCase() !==
                    currentUser?.username.toLowerCase()
                }
              >
                {isDeleting ? "Deleting Everything..." : "Permanently Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
