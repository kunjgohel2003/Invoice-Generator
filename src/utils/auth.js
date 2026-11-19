export const USERS_STORAGE_KEY = "invoice_app_users";
export const CURRENT_USER_KEY = "invoice_app_current_user";

// Pre-defined security hint questions for account recovery
export const SECURITY_HINT_QUESTIONS = [
  "Who is your favorite school friend?",
  "What is your birthday? (e.g. 15 August or DD/MM)",
  "What was the name of your first school?",
  "What is the name of your favorite childhood pet?",
  "In what city were you born?",
];

// Default pre-seeded users if storage is empty
export const DEFAULT_USERS = [
  {
    username: "demo",
    password: "Password123!",
    hintQuestion: "Who is your favorite school friend?",
    hintAnswer: "Rahul",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
];

/**
 * Validates password against the 5 security requirements:
 * 1. At least 8 characters
 * 2. Numbers combination (at least 1 digit)
 * 3. Minimum 1 special character
 * 4. Minimum 1 uppercase letter
 * 5. Minimum 1 lowercase letter
 */
export function getPasswordValidationState(password = "") {
  const str = String(password || "");
  return {
    minLength: str.length >= 8,
    hasNumber: /\d/.test(str),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(str),
    hasCapital: /[A-Z]/.test(str),
    hasLower: /[a-z]/.test(str),
  };
}

export function isPasswordValid(password = "") {
  const state = getPasswordValidationState(password);
  return (
    state.minLength &&
    state.hasNumber &&
    state.hasSpecial &&
    state.hasCapital &&
    state.hasLower
  );
}

/**
 * Loads registered users from localStorage (with fallback seed)
 */
export function getRegisteredUsers() {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read users from localStorage:", e);
  }
  return [];
}

/**
 * Saves registered users to localStorage
 */
export function saveRegisteredUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save users to localStorage:", e);
  }
}

/**
 * Checks if a username is already taken (case-insensitive)
 */
export function isUsernameTaken(username, usersList = null) {
  const trimmed = String(username || "").trim().toLowerCase();
  if (!trimmed) return false;
  const list = usersList || getRegisteredUsers();
  return list.some((u) => (u.username || "").toLowerCase() === trimmed);
}

/**
 * Reads the active logged in user from localStorage
 */
export function getCurrentUser() {
  try {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.username) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read current user:", e);
  }
  return null;
}

/**
 * Persists the active logged in user
 */
export function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error("Failed to update current user:", e);
  }
}

/**
 * Clears active user session
 */
export function clearCurrentUser() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (e) {
    console.error("Failed to clear user:", e);
  }
}

/**
 * Updates a user's username and/or password with full data migration
 */
export function updateUserProfile({
  oldUsername,
  newUsername,
  currentPassword,
  newPassword,
}) {
  const users = getRegisteredUsers();
  const oldCanonical = String(oldUsername || "").trim().toLowerCase();
  const userIndex = users.findIndex(
    (u) => (u.username || "").toLowerCase() === oldCanonical
  );

  if (userIndex === -1) {
    return { success: false, error: "User account not found" };
  }

  const user = users[userIndex];

  // If changing password, verify current password
  if (newPassword) {
    if (currentPassword && user.password !== currentPassword) {
      return { success: false, error: "Current password does not match" };
    }
    if (
      (currentPassword && currentPassword === newPassword) ||
      user.password === newPassword
    ) {
      return {
        success: false,
        error: "The current password and new password cannot be the same",
      };
    }
    if (!isPasswordValid(newPassword)) {
      return {
        success: false,
        error: "New password does not meet security requirements",
      };
    }
    user.password = newPassword;
  }

  // If changing username
  let targetUsername = user.username;
  if (
    newUsername &&
    newUsername.trim().toLowerCase() !== oldCanonical
  ) {
    const trimmedNew = newUsername.trim();
    const isTaken = users.some(
      (u) => (u.username || "").toLowerCase() === trimmedNew.toLowerCase()
    );

    if (isTaken) {
      return {
        success: false,
        error: "this username is taken please choose differnt username",
      };
    }

    targetUsername = trimmedNew;
    const oldKey = `invoices_db_${oldCanonical}`;
    const newKey = `invoices_db_${trimmedNew.toLowerCase()}`;

    // Migrate invoices in localStorage
    try {
      const existingInvoices = localStorage.getItem(oldKey);
      if (existingInvoices) {
        const parsed = JSON.parse(existingInvoices);
        const updated = parsed.map((inv) => ({
          ...inv,
          username: targetUsername,
        }));
        localStorage.setItem(newKey, JSON.stringify(updated));
        localStorage.removeItem(oldKey);
      }
    } catch (e) {
      console.error("Error migrating local invoice records:", e);
    }

    // Migrate sequence tracking keys
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        const prefix = `invoice_last_seq_${oldCanonical}_`;
        if (key && key.startsWith(prefix)) {
          const val = localStorage.getItem(key);
          const year = key.replace(prefix, "");
          localStorage.setItem(
            `invoice_last_seq_${trimmedNew.toLowerCase()}_${year}`,
            val
          );
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error("Error migrating sequence counters:", e);
    }

    user.username = targetUsername;
  }

  users[userIndex] = user;
  saveRegisteredUsers(users);
  setCurrentUser({ username: user.username });

  // Sync update with backend API
  fetch("/api/users/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      oldUsername,
      newUsername: targetUsername,
      currentPassword,
      newPassword,
    }),
  }).catch(() => {});

  return {
    success: true,
    user: { username: user.username, createdAt: user.createdAt },
  };
}

/**
 * Resets a forgotten password after verifying the security hint answer
 */
export function resetPasswordWithHint({ username, hintAnswer, newPassword }) {
  const users = getRegisteredUsers();
  const canonical = String(username || "").trim().toLowerCase();
  const userIndex = users.findIndex(
    (u) => (u.username || "").toLowerCase() === canonical
  );

  if (userIndex === -1) {
    return { success: false, error: "No account found with this username" };
  }

  const user = users[userIndex];
  const userStoredAnswer = String(user.hintAnswer || "").trim().toLowerCase();
  const providedAnswer = String(hintAnswer || "").trim().toLowerCase();

  if (!userStoredAnswer || userStoredAnswer !== providedAnswer) {
    return {
      success: false,
      error: "Security hint answer does not match. Please try again.",
    };
  }

  if (!isPasswordValid(newPassword)) {
    return {
      success: false,
      error: "New password does not meet all security requirements",
    };
  }

  if (user.password === newPassword) {
    return {
      success: false,
      error: "The current password and new password cannot be the same",
    };
  }

  user.password = newPassword;
  users[userIndex] = user;
  saveRegisteredUsers(users);

  // Sync with backend API
  fetch("/api/users/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user.username,
      hintAnswer: providedAnswer,
      newPassword,
    }),
  }).catch(() => {});

  return { success: true, message: "Password reset successfully" };
}

/**
 * Permanently deletes a user account and ALL associated invoice data
 */
export function deleteUserAccountPermanently(username) {
  if (!username) return;
  const canonical = String(username).trim().toLowerCase();

  // 1. Remove user from registered users in localStorage
  const users = getRegisteredUsers().filter(
    (u) => (u.username || "").toLowerCase() !== canonical
  );
  saveRegisteredUsers(users);

  // 2. Remove all invoices stored for this user
  try {
    localStorage.removeItem(`invoices_db_${canonical}`);
  } catch (e) {
    console.error("Error removing user invoice database:", e);
  }

  // 3. Remove sequence counters
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`invoice_last_seq_${canonical}_`)) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error("Error removing sequence counters:", e);
  }

  // 4. Clear active session
  clearCurrentUser();

  // 5. Delete on backend API if available
  fetch("/api/users", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  }).catch(() => {});
}
