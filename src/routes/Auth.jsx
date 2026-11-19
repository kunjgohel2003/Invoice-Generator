import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";
import {
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckIcon,
  SparklesIcon,
  ShieldCheckIcon,
  HelpCircleIcon,
  CrossIcon,
} from "../components/Icons";
import {
  getPasswordValidationState,
  isPasswordValid,
  getRegisteredUsers,
  saveRegisteredUsers,
  isUsernameTaken,
  SECURITY_HINT_QUESTIONS,
  resetPasswordWithHint,
  setCurrentUser as persistCurrentUser,
} from "../utils/auth";

export default function Auth({ onLoginSuccess, initialMode = "signin" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // "signin" or "signup"
  const [switchDirection, setSwitchDirection] = useState("to-signup");
  const [switchAnimKey, setSwitchAnimKey] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Hint Question & Answer for Sign Up
  const [hintQuestion, setHintQuestion] = useState(SECURITY_HINT_QUESTIONS[0]);
  const [isQuestionDropdownOpen, setIsQuestionDropdownOpen] = useState(false);
  const questionDropdownRef = useRef(null);
  const [hintAnswer, setHintAnswer] = useState("");
  const hintAnswerInputRef = useRef(null);

  // Close custom question dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        questionDropdownRef.current &&
        !questionDropdownRef.current.contains(event.target)
      ) {
        setIsQuestionDropdownOpen(false);
      }
    }
    if (isQuestionDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isQuestionDropdownOpen]);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: enter username, 2: answer hint & new password
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotUserQuestion, setForgotUserQuestion] = useState("");
  const [forgotHintAnswer, setForgotHintAnswer] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const forgotUsernameInputRef = useRef(null);
  const forgotAnswerInputRef = useRef(null);
  const forgotPwInputRef = useRef(null);

  // Field input references to redirect cursor
  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Users database cache from storage/API
  const [usersList, setUsersList] = useState(() => getRegisteredUsers());

  // Form error states
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [authError, setAuthError] = useState("");

  // Animation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessAnimating, setIsSuccessAnimating] = useState(false);
  const [successUser, setSuccessUser] = useState(null);

  // Sync users with backend API if available
  useEffect(() => {
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setUsersList(data);
          saveRegisteredUsers(data);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time username check for Sign Up
  const usernameTrimmed = username.trim();
  const usernameTaken =
    mode === "signup" &&
    usernameTrimmed.length > 0 &&
    isUsernameTaken(usernameTrimmed, usersList);

  // Real-time password criteria
  const pwRules = getPasswordValidationState(password);
  const pwValid = isPasswordValid(password);

  const handleModeSwitch = (targetMode) => {
    if (targetMode === mode) return;
    setSwitchDirection(targetMode === "signup" ? "to-signup" : "to-signin");
    setMode(targetMode);
    setSwitchAnimKey((prev) => prev + 1);
    setAuthError("");
    setSubmitAttempted(false);
    setUsernameTouched(false);
    setPasswordTouched(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setAuthError("");

    // 1. Username validations
    if (!usernameTrimmed) {
      setAuthError("Please enter a username");
      usernameInputRef.current?.focus();
      return;
    }

    if (mode === "signup") {
      // Check username uniqueness
      if (isUsernameTaken(usernameTrimmed, usersList)) {
        usernameInputRef.current?.focus();
        return;
      }

      // 2. Password presence check
      if (!password) {
        setAuthError("Please enter a password");
        passwordInputRef.current?.focus();
        return;
      }

      // Check password rules
      if (!pwValid) {
        setAuthError("Password does not meet all security requirements");
        passwordInputRef.current?.focus();
        return;
      }

      // 3. Security Hint Answer presence check
      const trimmedAnswer = String(hintAnswer || "").trim();
      if (!trimmedAnswer) {
        setAuthError("Please enter an answer for your security question");
        hintAnswerInputRef.current?.focus();
        return;
      }

      setIsSubmitting(true);

      // Register new user with Security Question & Hint Answer
      const newUser = {
        username: usernameTrimmed,
        password,
        hintQuestion: hintQuestion || SECURITY_HINT_QUESTIONS[0],
        hintAnswer: trimmedAnswer,
        createdAt: new Date().toISOString(),
      };

      const updatedUsers = [...usersList, newUser];
      setUsersList(updatedUsers);
      saveRegisteredUsers(updatedUsers);

      // Initialize empty private invoice storage for this new user
      const userKey = `invoices_db_${newUser.username.toLowerCase()}`;
      if (!localStorage.getItem(userKey)) {
        localStorage.setItem(userKey, JSON.stringify([]));
      }

      // Try syncing with API
      fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          hintQuestion: newUser.hintQuestion,
          hintAnswer: newUser.hintAnswer,
        }),
      }).catch(() => {});

      // Trigger celebratory login animation!
      setSuccessUser(newUser);
      setIsSubmitting(false);
      setIsSuccessAnimating(true);

      setTimeout(() => {
        persistCurrentUser({ username: newUser.username });
        if (onLoginSuccess) {
          onLoginSuccess(newUser);
        }
        navigate("/", { replace: true });
      }, 1400);
    } else {
      // Sign In mode
      // Check password presence before checking correctness
      if (!password) {
        setAuthError("Please enter a password");
        passwordInputRef.current?.focus();
        return;
      }

      setIsSubmitting(true);

      // 1. Check if user exists
      const foundUser = usersList.find(
        (u) => u.username.toLowerCase() === usernameTrimmed.toLowerCase(),
      );

      if (!foundUser) {
        setIsSubmitting(false);
        setAuthError("No account found with this username. Please sign up.");
        usernameInputRef.current?.focus();
        return;
      }

      // 2. Validate password
      if (foundUser.password !== password) {
        setIsSubmitting(false);
        setAuthError("Incorrect password. Please try again.");
        passwordInputRef.current?.focus();
        return;
      }

      // Try notifying backend
      fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: foundUser.username,
          password: foundUser.password,
        }),
      }).catch(() => {});

      // Trigger celebratory login animation!
      setSuccessUser(foundUser);
      setIsSubmitting(false);
      setIsSuccessAnimating(true);

      setTimeout(() => {
        persistCurrentUser({ username: foundUser.username });
        if (onLoginSuccess) {
          onLoginSuccess(foundUser);
        }
        navigate("/", { replace: true });
      }, 1400);
    }
  };

  // Open Forgot Password Modal
  const openForgotPasswordModal = () => {
    setForgotStep(1);
    setForgotUsername(usernameTrimmed || "");
    setForgotUserQuestion("");
    setForgotHintAnswer("");
    setForgotNewPassword("");
    setForgotError("");
    setForgotSuccess("");
    setShowForgotModal(true);
    setTimeout(() => {
      forgotUsernameInputRef.current?.focus();
    }, 100);
  };

  // Step 1: Look up user's security question (Live API check first)
  const handleForgotLookup = async (e) => {
    e.preventDefault();
    setForgotError("");
    const trimmed = String(forgotUsername || "").trim();
    if (!trimmed) {
      setForgotError("Please enter your username");
      forgotUsernameInputRef.current?.focus();
      return;
    }

    setForgotSubmitting(true);

    try {
      // Check directly with the backend API first
      const res = await fetch(`/api/users/hint?username=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setForgotSubmitting(false);
        setForgotUserQuestion(data.hintQuestion || "Who is your favorite school friend?");
        setForgotStep(2);
        setTimeout(() => {
          forgotAnswerInputRef.current?.focus();
        }, 100);
        return;
      }
    } catch (err) {
      console.log("API hint lookup fallback to local:", err);
    }

    // Fallback: Check local cache if API failed
    const found = usersList.find(
      (u) => (u.username || "").toLowerCase() === trimmed.toLowerCase()
    );

    setForgotSubmitting(false);

    if (!found) {
      setForgotError("No account found with this username. Please check your username.");
      forgotUsernameInputRef.current?.focus();
      return;
    }

    setForgotUserQuestion(
      found.hintQuestion || "Who is your favorite school friend?"
    );
    setForgotStep(2);
    setTimeout(() => {
      forgotAnswerInputRef.current?.focus();
    }, 100);
  };

  // Step 2: Verify answer & reset password
  const handleForgotReset = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    const answer = String(forgotHintAnswer || "").trim();
    if (!answer) {
      setForgotError("Please enter the answer to your security question");
      forgotAnswerInputRef.current?.focus();
      return;
    }

    if (!forgotNewPassword) {
      setForgotError("Please enter a new password");
      forgotPwInputRef.current?.focus();
      return;
    }

    if (!isPasswordValid(forgotNewPassword)) {
      setForgotError("New password must meet all 5 security requirements");
      forgotPwInputRef.current?.focus();
      return;
    }

    setForgotSubmitting(true);

    try {
      // 1. Try resetting via backend API first
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername,
          hintAnswer: answer,
          newPassword: forgotNewPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setForgotSubmitting(false);
        const errMsg = data.error || "Failed to reset password. Please check your answer.";
        setForgotError(errMsg);
        if (errMsg.toLowerCase().includes("answer")) {
          forgotAnswerInputRef.current?.focus();
        } else {
          forgotPwInputRef.current?.focus();
        }
        return;
      }

      // 2. Also sync local registered users cache
      resetPasswordWithHint({
        username: forgotUsername,
        hintAnswer: answer,
        newPassword: forgotNewPassword,
      });

      setForgotSubmitting(false);
      setForgotSuccess("Password reset successfully! You can now sign in.");

      // Sync latest user list
      fetch("/api/users")
        .then((r) => (r.ok ? r.json() : null))
        .then((list) => {
          if (Array.isArray(list)) {
            setUsersList(list);
            saveRegisteredUsers(list);
          }
        })
        .catch(() => {});

      setTimeout(() => {
        setShowForgotModal(false);
        setMode("signin");
        setUsername(forgotUsername);
        setPassword(forgotNewPassword);
        setAuthError("");
      }, 1500);
      return;
    } catch (err) {
      console.log("API reset fallback to local:", err);
    }

    // Fallback: local reset if API failed
    const result = resetPasswordWithHint({
      username: forgotUsername,
      hintAnswer: answer,
      newPassword: forgotNewPassword,
    });

    setForgotSubmitting(false);

    if (!result.success) {
      setForgotError(result.error);
      if (result.error.toLowerCase().includes("answer")) {
        forgotAnswerInputRef.current?.focus();
      } else {
        forgotPwInputRef.current?.focus();
      }
      return;
    }

    // Update state cache
    setUsersList(getRegisteredUsers());
    setForgotSuccess("Password reset successfully! You can now sign in.");
    setTimeout(() => {
      setShowForgotModal(false);
      setMode("signin");
      setUsername(forgotUsername);
      setPassword(forgotNewPassword);
      setAuthError("");
    }, 1500);
  };

  return (
    <div className="auth-page-wrapper">
      {/* Background ambient lighting blobs */}
      <div className="auth-ambient-blob blob-1" aria-hidden="true" />
      <div className="auth-ambient-blob blob-2" aria-hidden="true" />

      <main className="auth-container">
        <div
          className={`auth-card ${isSuccessAnimating ? "auth-card-animating-exit" : ""}`}
        >
          {/* Celebratory Success Login Overlay */}
          {isSuccessAnimating && (
            <div className="auth-success-overlay" role="status" aria-live="polite">
              <div className="auth-confetti-container" aria-hidden="true">
                {[...Array(14)].map((_, i) => (
                  <span
                    key={i}
                    className={`auth-confetti-piece confetti-${i + 1}`}
                  />
                ))}
              </div>
              <div className="auth-success-circle">
                <svg
                  className="auth-success-check-svg"
                  viewBox="0 0 52 52"
                  fill="none"
                >
                  <circle
                    className="auth-success-check-circle"
                    cx="26"
                    cy="26"
                    r="24"
                  />
                  <path
                    className="auth-success-check-tick"
                    d="M14 27l8 8 16-16"
                  />
                </svg>
              </div>
              <h2 className="auth-success-title">
                {mode === "signup" ? "Account Created!" : "Welcome Back!"}
              </h2>
              <p className="auth-success-user">
                Logged in as <strong>@{successUser?.username}</strong>
              </p>
              <p className="auth-success-subtitle">
                Opening your personalized workspace...
              </p>
              <div className="auth-success-loader-bar">
                <div className="auth-success-loader-fill" />
              </div>
            </div>
          )}

          {/* LEFT FORM SECTION */}
          <div className="auth-form-section">
            {/* Brand Logo & Tag */}
            <div className="auth-brand-badge">
              <span className="auth-brand-icon">
                <img src="/logo.png" alt="InvoiceG Logo" width={22} height={22} />
              </span>
              <span className="auth-brand-name">InvoiceG</span>
            </div>

            <div className="auth-header">
              <h1 className="auth-title">
                {mode === "signin" ? "Hello!" : "Create Account"}
              </h1>
              <p className="auth-subtitle">
                {mode === "signin"
                  ? "Sign in to your account"
                  : "Sign up to start creating your invoices"}
              </p>
            </div>

            {/* Mode Switcher Tabs with Animated Glider */}
            <div className="auth-mode-pill-track" role="tablist">
              <div
                className={`auth-mode-pill-glider ${
                  mode === "signup" ? "glider-right" : "glider-left"
                }`}
                aria-hidden="true"
              />
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                className={`auth-mode-pill-btn ${mode === "signin" ? "active" : ""}`}
                onClick={() => handleModeSwitch("signin")}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={`auth-mode-pill-btn ${mode === "signup" ? "active" : ""}`}
                onClick={() => handleModeSwitch("signup")}
              >
                Sign Up
              </button>
            </div>

            {/* General Alert */}
            {authError && (
              <div className="auth-global-alert" role="alert">
                <span className="auth-alert-icon">⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {/* Animated Form Body on Mode Switch */}
            <div
              key={`form-content-${mode}-${switchAnimKey}`}
              className={`auth-form-animated-wrap ${switchDirection}`}
            >
              <form
                className="auth-form"
                onSubmit={handleSubmit}
                noValidate
                autoComplete="off"
              >
              {/* USERNAME FIELD */}
              <div className="auth-field-group">
                <div
                  className={`auth-pill-input-box ${
                    usernameTaken ||
                    (submitAttempted && !usernameTrimmed) ||
                    (mode === "signin" &&
                      submitAttempted &&
                      authError.includes("username"))
                      ? "has-danger-border"
                      : ""
                  }`}
                >
                  <div className="auth-input-icon-cube" aria-hidden="true">
                    <UserIcon size={19} />
                  </div>
                  <input
                    ref={usernameInputRef}
                    type="text"
                    id="auth-username-input"
                    className="auth-pill-input"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameTouched(true);
                      setAuthError("");
                    }}
                    onBlur={() => setUsernameTouched(true)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>

                {/* USERNAME TAKEN RED ALERT (Explicit user requirement) */}
                {mode === "signup" && usernameTaken && (
                  <div
                    className="auth-username-taken-alert"
                    role="alert"
                    style={{
                      color: "#dc2626",
                      fontSize: "12.5px",
                      marginTop: "6px",
                      paddingLeft: "16px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ fontSize: "14px", lineHeight: 1 }}>⚠️</span>
                    <span>this username is taken please choose differnt username</span>
                  </div>
                )}
              </div>

              {/* PASSWORD FIELD */}
              <div className="auth-field-group">
                <div
                  className={`auth-pill-input-box ${
                    (submitAttempted && !password) ||
                    (mode === "signup" && submitAttempted && !pwValid) ||
                    (mode === "signin" &&
                      submitAttempted &&
                      authError.includes("password"))
                      ? "has-danger-border"
                      : ""
                  }`}
                >
                  <div className="auth-input-icon-cube" aria-hidden="true">
                    <LockIcon size={19} />
                  </div>
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    id="auth-password-input"
                    className="auth-pill-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordTouched(true);
                      setAuthError("");
                    }}
                    onBlur={() => setPasswordTouched(true)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    className="auth-eye-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOffIcon size={20} />
                    ) : (
                      <EyeIcon size={20} />
                    )}
                  </button>
                </div>

                {/* SIGN UP PASSWORD REQUIREMENTS CHECKLIST */}
                {mode === "signup" && (
                  <div className="auth-password-criteria-panel">
                    <div className="auth-criteria-single-row">
                      <span
                        className={`auth-criteria-pill ${
                          pwRules.minLength ? "met" : ""
                        }`}
                      >
                        <span className="criteria-check">
                          {pwRules.minLength ? "✓" : "○"}
                        </span>
                        <span>8+ chars</span>
                      </span>
                      <span
                        className={`auth-criteria-pill ${
                          pwRules.hasNumber ? "met" : ""
                        }`}
                      >
                        <span className="criteria-check">
                          {pwRules.hasNumber ? "✓" : "○"}
                        </span>
                        <span>1+ number</span>
                      </span>
                      <span
                        className={`auth-criteria-pill ${
                          pwRules.hasSpecial ? "met" : ""
                        }`}
                      >
                        <span className="criteria-check">
                          {pwRules.hasSpecial ? "✓" : "○"}
                        </span>
                        <span>1+ special</span>
                      </span>
                      <span
                        className={`auth-criteria-pill ${
                          pwRules.hasCapital ? "met" : ""
                        }`}
                      >
                        <span className="criteria-check">
                          {pwRules.hasCapital ? "✓" : "○"}
                        </span>
                        <span>1+ uppercase</span>
                      </span>
                      <span
                        className={`auth-criteria-pill ${
                          pwRules.hasLower ? "met" : ""
                        }`}
                      >
                        <span className="criteria-check">
                          {pwRules.hasLower ? "✓" : "○"}
                        </span>
                        <span>1+ lowercase</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECURITY HINT QUESTION & ANSWER (Sign Up Only) */}
              {mode === "signup" && (
                <div className="auth-field-group" style={{ marginTop: "4px" }}>
                  {/* Custom Full-Width Styled Question Dropdown */}
                  <div
                    ref={questionDropdownRef}
                    className="auth-custom-dropdown-container"
                    style={{ marginBottom: "8px" }}
                  >
                    <button
                      type="button"
                      className={`auth-pill-input-box auth-custom-dropdown-trigger ${
                        isQuestionDropdownOpen ? "is-open" : ""
                      }`}
                      onClick={() =>
                        setIsQuestionDropdownOpen(!isQuestionDropdownOpen)
                      }
                      aria-haspopup="listbox"
                      aria-expanded={isQuestionDropdownOpen}
                    >
                      <div className="auth-input-icon-cube" aria-hidden="true">
                        <HelpCircleIcon size={19} />
                      </div>
                      <span className="auth-custom-dropdown-label">
                        {hintQuestion}
                      </span>
                      <span
                        className={`auth-select-arrow ${
                          isQuestionDropdownOpen ? "arrow-rotated" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ▼
                      </span>
                    </button>

                    {isQuestionDropdownOpen && (
                      <div
                        className="auth-custom-dropdown-menu"
                        role="listbox"
                        tabIndex={-1}
                      >
                        {SECURITY_HINT_QUESTIONS.map((q) => {
                          const isSelected = q === hintQuestion;
                          return (
                            <button
                              key={q}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={`auth-custom-dropdown-option ${
                                isSelected ? "selected" : ""
                              }`}
                              onClick={() => {
                                setHintQuestion(q);
                                setIsQuestionDropdownOpen(false);
                              }}
                            >
                              <span className="dropdown-option-text">{q}</span>
                              {isSelected && (
                                <span className="dropdown-check-icon">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Answer Input */}
                  <div
                    className={`auth-pill-input-box ${
                      submitAttempted && !String(hintAnswer || "").trim()
                        ? "has-danger-border"
                        : ""
                    }`}
                  >
                    <div className="auth-input-icon-cube" aria-hidden="true">
                      <ShieldCheckIcon size={19} />
                    </div>
                    <input
                      ref={hintAnswerInputRef}
                      type="text"
                      className="auth-pill-input"
                      placeholder="Your secret answer (e.g. friend's name, birthday)"
                      value={hintAnswer}
                      onChange={(e) => {
                        setHintAnswer(e.target.value);
                        setAuthError("");
                      }}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  </div>
                </div>
              )}

              {/* REMEMBER ME & HELPER ROW */}
              <div className="auth-options-row">
                <label className="auth-remember-label">
                  <input
                    type="checkbox"
                    className="auth-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={openForgotPasswordModal}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {/* ACTION SUBMIT BUTTON */}
              <div className="auth-submit-wrap">
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccessAnimating}
                  className={`auth-gradient-submit-btn ${
                    isSubmitting ? "loading" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <span className="auth-btn-spinner" />
                  ) : mode === "signin" ? (
                    "SIGN IN"
                  ) : (
                    "SIGN UP"
                  )}
                </button>
              </div>

              {/* FOOTER SWITCH LINK */}
              <div className="auth-footer-switch">
                {mode === "signin" ? (
                  <span>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="auth-switch-text-btn"
                      onClick={() => handleModeSwitch("signup")}
                    >
                      Create Account
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="auth-switch-text-btn"
                      onClick={() => handleModeSwitch("signin")}
                    >
                      Sign In
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT SHOWCASE SECTION */}
        <div className="auth-showcase-section">
          <div
            key={`showcase-content-${mode}-${switchAnimKey}`}
            className={`auth-showcase-content auth-showcase-animated ${switchDirection}`}
          >
            <span className="auth-showcase-pill">
              <SparklesIcon size={14} />{" "}
              {mode === "signin"
                ? "Smart Invoicing Workspace"
                : "Join InvoiceG Community"}
            </span>
            <h2 className="auth-showcase-title">
              {mode === "signin" ? "Welcome Back!" : "Get Started Today!"}
            </h2>
            <p className="auth-showcase-description">
              {mode === "signin"
                ? "Generate professional invoices, track client payments in real-time, and keep your billing completely private with isolated per-user workspaces."
                : "Create your personal account in seconds. Build clean invoices, track payments, and store all your billing in an isolated private vault."}
            </p>

            <div className="auth-feature-cards">
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <ShieldCheckIcon size={18} />
                </div>
                <div>
                  <strong>Isolated User Storage</strong>
                  <span>Your invoices and clients are strictly private to your username.</span>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <CheckIcon size={18} />
                </div>
                <div>
                  <strong>Automatic Sequencing</strong>
                  <span>Seamless invoice numbering (INV-2026-001) per individual account.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* FORGOT PASSWORD POPUP MODAL */}
      {showForgotModal && (
        <div
          className="forgot-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForgotModal(false);
          }}
        >
          <div className="forgot-modal-card">
            <div className="forgot-modal-header">
              <h3 id="forgot-modal-title" className="forgot-modal-title">
                <span className="forgot-modal-icon-badge">
                  <LockIcon size={18} />
                </span>
                <span>Reset Password</span>
              </h3>
              <button
                type="button"
                className="forgot-modal-close-btn"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close popup"
              >
                <CrossIcon size={18} />
              </button>
            </div>

            <p className="forgot-modal-subtitle">
              {forgotStep === 1
                ? "Enter your registered username to verify your identity with your personal security question."
                : "Answer your personal security question to set a new password."}
            </p>

            {/* Error & Success Alerts */}
            {forgotError && (
              <div
                className="auth-global-alert"
                role="alert"
                style={{ marginBottom: "14px" }}
              >
                <span>⚠️</span>
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#059669",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                role="status"
              >
                <span>✓</span>
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* Step 1: Username lookup */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotLookup} className="forgot-modal-form">
                <div
                  className={`auth-pill-input-box ${
                    forgotError && !forgotUsername ? "has-danger-border" : ""
                  }`}
                >
                  <div className="auth-input-icon-cube" aria-hidden="true">
                    <UserIcon size={19} />
                  </div>
                  <input
                    ref={forgotUsernameInputRef}
                    type="text"
                    className="auth-pill-input"
                    placeholder="Enter your username"
                    value={forgotUsername}
                    onChange={(e) => {
                      setForgotUsername(e.target.value);
                      setForgotError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="forgot-modal-btn"
                >
                  {forgotSubmitting ? "Checking User..." : "Continue & Verify Hint →"}
                </button>
              </form>
            )}

            {/* Step 2: Answer Security Question & Enter New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotReset} className="forgot-modal-form">
                {/* User's Hint Question Prompt */}
                <div className="forgot-question-prompt">
                  <span className="forgot-question-label">
                    Your Security Question
                  </span>
                  <div className="forgot-question-text">
                    {forgotUserQuestion}
                  </div>
                </div>

                {/* Answer Input */}
                <div
                  className={`auth-pill-input-box ${
                    forgotError.toLowerCase().includes("answer")
                      ? "has-danger-border"
                      : ""
                  }`}
                >
                  <div className="auth-input-icon-cube" aria-hidden="true">
                    <HelpCircleIcon size={19} />
                  </div>
                  <input
                    ref={forgotAnswerInputRef}
                    type="text"
                    className="auth-pill-input"
                    placeholder="Enter your answer"
                    value={forgotHintAnswer}
                    onChange={(e) => {
                      setForgotHintAnswer(e.target.value);
                      setForgotError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>

                {/* New Password Input */}
                <div
                  className={`auth-pill-input-box ${
                    forgotError.toLowerCase().includes("password")
                      ? "has-danger-border"
                      : ""
                  }`}
                >
                  <div className="auth-input-icon-cube" aria-hidden="true">
                    <LockIcon size={19} />
                  </div>
                  <input
                    ref={forgotPwInputRef}
                    type={showForgotNewPassword ? "text" : "password"}
                    className="auth-pill-input"
                    placeholder="Enter new password"
                    value={forgotNewPassword}
                    onChange={(e) => {
                      setForgotNewPassword(e.target.value);
                      setForgotError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    className="auth-eye-toggle-btn"
                    onClick={() =>
                      setShowForgotNewPassword(!showForgotNewPassword)
                    }
                    aria-label={
                      showForgotNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showForgotNewPassword ? (
                      <EyeOffIcon size={20} />
                    ) : (
                      <EyeIcon size={20} />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="forgot-modal-btn"
                >
                  {forgotSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
