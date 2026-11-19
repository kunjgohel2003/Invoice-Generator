import { readDb, writeDb } from "../db.js";
import { parseJsonBody, sendJson } from "../utils.js";

export async function handleInvoicesRoute(req, res, next) {
  try {
    const parsedUrl = new URL(req.url, "http://localhost");
    const userParam = parsedUrl.searchParams.get("user");

    if (req.method === "GET") {
      const db = readDb();
      let invoices = db.invoices || [];
      if (userParam) {
        invoices = invoices.filter(
          (inv) => (inv.username || "demo").toLowerCase() === userParam.toLowerCase()
        );
      }
      sendJson(res, 200, invoices);
      return;
    }

    if (req.method === "POST") {
      const newInvoice = await parseJsonBody(req);
      if (userParam && !newInvoice.username) {
        newInvoice.username = userParam;
      }
      const db = readDb();
      const invoices = db.invoices || [];
      const invoiceUser = (newInvoice.username || userParam || "demo").toLowerCase();

      const existingIndex = invoices.findIndex(
        (i) =>
          i.id === newInvoice.id &&
          (i.username || "demo").toLowerCase() === invoiceUser
      );

      if (existingIndex >= 0) {
        invoices[existingIndex] = newInvoice;
      } else {
        invoices.unshift(newInvoice);
      }

      db.invoices = invoices;
      writeDb(db);
      sendJson(res, 200, newInvoice);
      return;
    }

    if (req.method === "PUT") {
      const updated = await parseJsonBody(req);
      if (userParam && !updated.username) {
        updated.username = userParam;
      }
      const db = readDb();
      let invoices = db.invoices || [];
      const invoiceUser = (updated.username || userParam || "demo").toLowerCase();

      invoices = invoices.map((inv) =>
        inv.id === updated.id &&
        (inv.username || "demo").toLowerCase() === invoiceUser
          ? { ...inv, ...updated }
          : inv
      );

      db.invoices = invoices;
      writeDb(db);
      sendJson(res, 200, updated);
      return;
    }

    if (req.method === "DELETE") {
      const { ids = [] } = await parseJsonBody(req);
      const db = readDb();
      db.invoices = (db.invoices || []).filter((inv) => {
        const matchesId = ids.includes(inv.id);
        if (!matchesId) return true;
        if (!userParam) return false;
        return (inv.username || "demo").toLowerCase() !== userParam.toLowerCase();
      });

      writeDb(db);
      sendJson(res, 200, { success: true, count: ids.length });
      return;
    }

    if (typeof next === "function") {
      next();
    }
  } catch (err) {
    console.error("API Error in /api/invoices:", err);
    sendJson(res, 500, { error: err.message });
  }
}
