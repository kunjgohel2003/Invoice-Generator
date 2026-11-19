export const invoices = [
  {
    id: "INV-2026-001",
    number: "INV-2026-001",
    client: "NovaCraft Studio",
    initials: "NC",
    detail: "Design services",
    date: "23 Sep 2026",
    amount: 28320,
    status: "Paid",
    username: "demo",
  },
];

export const blankInvoice = {
  from: { name: "", email: "", phone: "", address: "", city: "", pincode: "" },
  billedTo: {
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
  },
  number: "",
  invoiceDate: "",
  dueDate: "",
  status: "",
  items: [{ description: "", unitPrice: "", quantity: "", tax: "" }],
};

/**
 * Returns the localStorage key used to store the sequence counter for a specific year and user.
 *
 * @param {string|number} year - The target calendar year
 * @param {string} [username] - The user whose sequence counter is retrieved
 * @returns {string} The localStorage key (e.g., "invoice_last_seq_demo_2026")
 */
export const getCounterKey = (year, username) => {
  const userPrefix = username ? `${String(username).trim().toLowerCase()}_` : "";
  return `invoice_last_seq_${userPrefix}${year}`;
};

/**
 * Scans a list of invoice records to discover the highest invoice sequence number for a given year.
 * Checks ID and number patterns matching formats like "INV-2026-001", "INV-001", or raw digits.
 *
 * @param {Array<Object>} [invoices=[]] - List of invoice records to scan
 * @param {string|number} [targetYear] - The calendar year to filter for (defaults to current year)
 * @returns {number} The maximum numeric sequence found among the invoices
 */
export function getMaxInvoiceSequence(invoices = [], targetYear) {
  const year = targetYear
    ? String(targetYear)
    : String(new Date().getFullYear());
  let maxFromInvoices = 0;

  if (Array.isArray(invoices)) {
    invoices.forEach((inv) => {
      const candidates = [inv?.number, inv?.id]
        .filter(Boolean)
        .map((s) => String(s).trim().toUpperCase());

      for (const str of candidates) {
        // Matches standard format: INV-2026-001, INV-2026-1
        const matchYear = str.match(new RegExp(`^INV-${year}-(\\d+)$`));
        if (matchYear) {
          const num = parseInt(matchYear[1], 10);
          if (!isNaN(num) && num > maxFromInvoices) maxFromInvoices = num;
          continue;
        }

        // Matches short prefix format: INV-001, INV-1
        const matchShort = str.match(/^INV-(\\d+)$/);
        if (matchShort) {
          const num = parseInt(matchShort[1], 10);
          if (!isNaN(num) && num > maxFromInvoices) maxFromInvoices = num;
          continue;
        }

        // Matches plain digits format: "001", "1", "002"
        const matchPlain = str.match(/^(\\d+)$/);
        if (matchPlain) {
          const num = parseInt(matchPlain[1], 10);
          if (!isNaN(num) && num > maxFromInvoices) maxFromInvoices = num;
          continue;
        }
      }
    });

    // If invoices exist, the sequence must at least match the count of existing invoices
    if (invoices.length > 0 && maxFromInvoices < invoices.length) {
      maxFromInvoices = invoices.length;
    }
  }

  return maxFromInvoices;
}

/**
 * Synchronizes the sequence counter stored in localStorage with the maximum sequence found in invoices.
 *
 * @param {Array<Object>} [invoices=[]] - Existing invoice records
 * @param {string|number} [targetYear] - The year to synchronize
 * @param {string} [username] - The active username
 * @returns {number} The maximum sequence synchronized
 */
export function syncInvoiceSequence(invoices = [], targetYear, username) {
  const year = targetYear
    ? String(targetYear)
    : String(new Date().getFullYear());
  const max = getMaxInvoiceSequence(invoices, year);
  try {
    if (typeof localStorage !== "undefined") {
      const counterKey = getCounterKey(year, username);
      if (max > 0) {
        localStorage.setItem(counterKey, String(max));
      } else {
        localStorage.removeItem(counterKey);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return max;
}

/**
 * Resets the invoice sequence counter stored in localStorage.
 *
 * @param {string|number} [year] - If specified, resets sequence for that year only; otherwise resets all years.
 * @param {string} [username] - Optional username
 */
export function resetInvoiceSequence(year, username) {
  try {
    if (typeof localStorage !== "undefined") {
      if (year) {
        localStorage.removeItem(getCounterKey(year, username));
      } else {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith("invoice_last_seq_")) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Calculates the next available numeric sequence number for a new invoice.
 *
 * @param {Array<Object>} [invoices=[]] - Existing invoice records
 * @param {string|number} [targetYear] - Target calendar year
 * @param {string} [username] - Active username
 * @returns {number} The next integer sequence (e.g., 2 if highest is 1)
 */
export function getNextInvoiceSequence(invoices = [], targetYear, username) {
  const year = targetYear
    ? String(targetYear)
    : String(new Date().getFullYear());
  const maxFromInvoices = getMaxInvoiceSequence(invoices, year);

  let storedLastSeq = 0;
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(getCounterKey(year, username));
      if (saved) {
        storedLastSeq = parseInt(saved, 10) || 0;
      }
    }
  } catch (e) {
    console.error(e);
  }

  // If stored sequence exceeds existing invoices, clamp it down so it stays synced
  if (storedLastSeq > maxFromInvoices) {
    storedLastSeq = maxFromInvoices;
    try {
      if (typeof localStorage !== "undefined") {
        const counterKey = getCounterKey(year, username);
        if (maxFromInvoices > 0) {
          localStorage.setItem(counterKey, String(maxFromInvoices));
        } else {
          localStorage.removeItem(counterKey);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  const currentMax = Math.max(maxFromInvoices, storedLastSeq);
  return currentMax + 1;
}

/**
 * Generates a formatted invoice number string for the next invoice (e.g. "INV-2026-002").
 *
 * @param {Array<Object>} [invoices=[]] - Existing invoice records
 * @param {string|number} [targetYear] - Target calendar year
 * @param {string} [username] - Active username
 * @returns {string} Formatted invoice number string
 */
export function generateNextInvoiceNumber(invoices = [], targetYear, username) {
  const year = targetYear
    ? String(targetYear)
    : String(new Date().getFullYear());
  const nextSeq = getNextInvoiceSequence(invoices, year, username);
  return `INV-${year}-${String(nextSeq).padStart(3, "0")}`;
}

/**
 * Commits a newly used invoice number or ID to the sequence tracking in localStorage,
 * ensuring subsequent calls generate the next successive number.
 *
 * @param {string} invoiceIdOrNumber - The invoice number or ID being committed (e.g. "INV-2026-003")
 * @param {string} [username] - Active username
 */
export function commitInvoiceSequence(invoiceIdOrNumber, username) {
  const match = String(invoiceIdOrNumber || "").match(/^INV-(\d{4})-(\d+)$/i);
  if (match) {
    const year = match[1];
    const num = parseInt(match[2], 10);
    if (!isNaN(num)) {
      try {
        if (typeof localStorage !== "undefined") {
          const counterKey = getCounterKey(year, username);
          const saved =
            parseInt(localStorage.getItem(counterKey) || "0", 10) || 0;
          if (num > saved) {
            localStorage.setItem(counterKey, String(num));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
}
