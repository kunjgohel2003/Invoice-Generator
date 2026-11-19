import { readDb, writeDb } from "../db.js";
import { parseJsonBody, sendJson } from "../utils.js";

export async function handleUsersRoute(req, res, next) {
  try {
    const parsedUrl = new URL(req.url, "http://localhost");
    const pathname = parsedUrl.pathname.replace(/\/$/, "");

    // GET /api/users or /api/users/ or GET /api/users/hint?username=xxx
    if (req.method === "GET") {
      const db = readDb();
      const userParam = parsedUrl.searchParams.get("username");

      // If querying hint question for forgot password recovery
      if (pathname.includes("/hint") || pathname.includes("/security-question") || userParam) {
        if (!userParam) {
          sendJson(res, 400, { error: "Username is required" });
          return;
        }
        const user = (db.users || []).find(
          (u) => (u.username || "").toLowerCase() === userParam.toLowerCase()
        );
        if (!user) {
          sendJson(res, 404, { error: "No account found with this username" });
          return;
        }
        sendJson(res, 200, {
          username: user.username,
          hintQuestion:
            user.hintQuestion || "Who is your favorite school friend?",
        });
        return;
      }

      const users = (db.users || []).map((u) => ({
        username: u.username,
        password: u.password,
        hintQuestion: u.hintQuestion || "",
        hintAnswer: u.hintAnswer || "",
        createdAt: u.createdAt,
      }));
      sendJson(res, 200, users);
      return;
    }

    // POST /api/users/register or /register
    if (req.method === "POST" && (pathname === "/register" || pathname === "/api/users/register" || pathname === "")) {
      const body = await parseJsonBody(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const hintQuestion = String(body.hintQuestion || "").trim();
      const hintAnswer = String(body.hintAnswer || "").trim();

      if (!username || !password) {
        sendJson(res, 400, { error: "Username and password are required" });
        return;
      }

      const db = readDb();
      const users = db.users || [];
      const isTaken = users.some(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );

      if (isTaken) {
        sendJson(res, 409, {
          error: "this username is taken please choose differnt username",
        });
        return;
      }

      const newUser = {
        username,
        password,
        hintQuestion: hintQuestion || "Who is your favorite school friend?",
        hintAnswer: hintAnswer || "",
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      db.users = users;
      writeDb(db);

      sendJson(res, 201, {
        success: true,
        user: {
          username: newUser.username,
          hintQuestion: newUser.hintQuestion,
          createdAt: newUser.createdAt,
        },
      });
      return;
    }

    // POST /api/users/reset-password (Forgot password recovery using hint)
    if (
      req.method === "POST" &&
      (pathname === "/reset-password" ||
        pathname === "/api/users/reset-password")
    ) {
      const body = await parseJsonBody(req);
      const username = String(body.username || "").trim();
      const hintAnswer = String(body.hintAnswer || "").trim().toLowerCase();
      const newPassword = String(body.newPassword || "");

      if (!username || !hintAnswer || !newPassword) {
        sendJson(res, 400, {
          error: "Username, hint answer, and new password are required",
        });
        return;
      }

      const db = readDb();
      const users = db.users || [];
      const userIndex = users.findIndex(
        (u) => (u.username || "").toLowerCase() === username.toLowerCase()
      );

      if (userIndex === -1) {
        sendJson(res, 404, { error: "No account found with this username" });
        return;
      }

      const user = users[userIndex];
      const userStoredAnswer = String(user.hintAnswer || "")
        .trim()
        .toLowerCase();

      if (!userStoredAnswer || userStoredAnswer !== hintAnswer) {
        sendJson(res, 401, {
          error: "Security hint answer does not match. Please try again.",
        });
        return;
      }

      if (user.password === newPassword) {
        sendJson(res, 400, {
          error: "The current password and new password cannot be the same",
        });
        return;
      }

      user.password = newPassword;
      users[userIndex] = user;
      db.users = users;
      writeDb(db);

      sendJson(res, 200, {
        success: true,
        message: "Password reset successfully. You can now sign in.",
      });
      return;
    }

    // POST /api/users/login or /login
    if (req.method === "POST" && (pathname === "/login" || pathname === "/api/users/login")) {
      const body = await parseJsonBody(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");

      const db = readDb();
      const users = db.users || [];
      const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );

      if (!user) {
        sendJson(res, 404, { error: "No account found with this username. Please sign up." });
        return;
      }

      if (user.password !== password) {
        sendJson(res, 401, { error: "Incorrect password. Please try again." });
        return;
      }

      sendJson(res, 200, {
        success: true,
        user: { username: user.username, createdAt: user.createdAt },
      });
      return;
    }

    // PUT /api/users/profile or /profile or /update
    if (req.method === "PUT" && (pathname === "/profile" || pathname === "/api/users/profile" || pathname === "/update" || pathname === "")) {
      const body = await parseJsonBody(req);
      const oldUsername = String(body.oldUsername || "").trim();
      const newUsername = String(body.newUsername || "").trim();
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");

      const db = readDb();
      const users = db.users || [];
      const userIndex = users.findIndex(
        (u) => u.username.toLowerCase() === oldUsername.toLowerCase()
      );

      if (userIndex === -1) {
        sendJson(res, 404, { error: "User account not found" });
        return;
      }

      const user = users[userIndex];

      // If updating username, check uniqueness
      if (newUsername && newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
        const isTaken = users.some(
          (u) => u.username.toLowerCase() === newUsername.toLowerCase()
        );
        if (isTaken) {
          sendJson(res, 409, {
            error: "this username is taken please choose differnt username",
          });
          return;
        }

        // Migrate invoices to the new username in db.json
        if (db.invoices && Array.isArray(db.invoices)) {
          db.invoices = db.invoices.map((inv) =>
            (inv.username || "demo").toLowerCase() === oldUsername.toLowerCase()
              ? { ...inv, username: newUsername }
              : inv
          );
        }

        user.username = newUsername;
      }

      // If updating password, verify current password
      if (newPassword) {
        if (currentPassword && user.password !== currentPassword) {
          sendJson(res, 401, { error: "Current password is incorrect" });
          return;
        }

        if (
          (currentPassword && currentPassword === newPassword) ||
          user.password === newPassword
        ) {
          sendJson(res, 400, {
            error: "The current password and new password cannot be the same",
          });
          return;
        }

        user.password = newPassword;
      }

      users[userIndex] = user;
      db.users = users;
      writeDb(db);

      sendJson(res, 200, {
        success: true,
        user: { username: user.username, createdAt: user.createdAt },
      });
      return;
    }

    // DELETE /api/users/delete or DELETE /api/users (Delete Account Permanently)
    if (req.method === "DELETE") {
      const body = await parseJsonBody(req);
      const username = String(body.username || parsedUrl.searchParams.get("username") || "").trim();

      if (!username) {
        sendJson(res, 400, { error: "Username is required to delete account" });
        return;
      }

      const db = readDb();
      // Remove user
      db.users = (db.users || []).filter(
        (u) => u.username.toLowerCase() !== username.toLowerCase()
      );

      // Remove all invoices belonging to this username
      db.invoices = (db.invoices || []).filter(
        (inv) => (inv.username || "demo").toLowerCase() !== username.toLowerCase()
      );

      writeDb(db);
      sendJson(res, 200, {
        success: true,
        message: `Account for ${username} and all associated invoice data permanently deleted.`,
      });
      return;
    }

    if (typeof next === "function") {
      next();
    }
  } catch (err) {
    console.error("API Error in /api/users:", err);
    sendJson(res, 500, { error: err.message });
  }
}
