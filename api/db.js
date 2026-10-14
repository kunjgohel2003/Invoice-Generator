import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "..", "db.json");

export function readDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      return { invoices: [] };
    }
    const data = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading db.json:", e);
    return { invoices: [] };
  }
}

export function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing db.json:", e);
  }
}
