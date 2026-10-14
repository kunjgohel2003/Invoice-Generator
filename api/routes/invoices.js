import { readDb, writeDb } from "../db.js";
import { parseJsonBody, sendJson } from "../utils.js";

export async function handleInvoicesRoute(req, res, next) {
  try {
    if (req.method === "GET") {
      const db = readDb();
      sendJson(res, 200, db.invoices || []);
      return;
    }

    if (req.method === "POST") {
      const newInvoice = await parseJsonBody(req);
      const db = readDb();
      const invoices = db.invoices || [];
      const existingIndex = invoices.findIndex((i) => i.id === newInvoice.id);

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
      const db = readDb();
      let invoices = db.invoices || [];
      invoices = invoices.map((inv) =>
        inv.id === updated.id ? { ...inv, ...updated } : inv
      );
      db.invoices = invoices;
      writeDb(db);
      sendJson(res, 200, updated);
      return;
    }

    if (req.method === "DELETE") {
      const { ids = [] } = await parseJsonBody(req);
      const db = readDb();
      db.invoices = (db.invoices || []).filter((inv) => !ids.includes(inv.id));
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
