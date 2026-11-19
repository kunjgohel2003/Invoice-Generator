import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { money, formatIndianNumber } from "../components/InvoiceTable.jsx";

/**
 * Formats a date string into a user-friendly display date (e.g. "23 Sep 2026").
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr || String(dateStr).trim() === "" || dateStr === "Not set") {
    return "Not set";
  }
  const str = String(dateStr).trim();
  if (/^\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}$/.test(str)) {
    return str;
  }
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const year = ymd[1];
    const month = months[parseInt(ymd[2], 10) - 1];
    const day = parseInt(ymd[3], 10);
    if (month) return `${day} ${month} ${year}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return str;
}

/**
 * Escapes characters for safe HTML injection.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let cachedLogoDataUrl = null;

/**
 * Loads and caches the brand logo as a Data URL to guarantee instantaneous,
 * CORS-free rendering in html2canvas.
 */
export async function getLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return "/logo.png";
  }
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return "/logo.png";
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoDataUrl = reader.result;
        resolve(cachedLogoDataUrl);
      };
      reader.onerror = () => resolve("/logo.png");
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return "/logo.png";
  }
}

/**
 * Builds an off-screen invoice DOM node replicating the exact preview structure
 * and styling from InvoiceDetail.jsx.
 */
export function buildInvoiceDomNode(invoice, logoSrc = "/logo.png", index = 0) {
  const items =
    invoice?.items && Array.isArray(invoice.items) && invoice.items.length > 0
      ? invoice.items
      : [
          {
            description: invoice?.detail || "General item",
            quantity: 1,
            unitPrice: invoice?.amount ? invoice.amount / 1.18 : 0,
            tax: 18,
          },
        ];

  const subtotal = items.reduce(
    (acc, item) =>
      acc + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0
  );

  const totalTax = items.reduce(
    (acc, item) =>
      acc +
      (Number(item.unitPrice || 0) *
        Number(item.quantity || 0) *
        Number(item.tax || 0)) /
        100,
    0
  );

  const grandTotal = invoice?.amount || subtotal + totalTax;

  const invoiceDateDisplay = formatDisplayDate(
    invoice?.invoiceDate || invoice?.date
  );
  const dueDateDisplay = formatDisplayDate(invoice?.dueDate);
  const isPaid = (invoice?.status || "").toLowerCase() === "paid";

  const card = document.createElement("article");
  card.className = "invoice-preview download-pdf-mode-preview";
  card.style.width = "734px";
  card.style.maxWidth = "734px";
  card.style.boxSizing = "border-box";
  card.style.margin = "0";
  card.style.background = "#ffffff";
  card.style.position = "relative";
  card.style.overflow = "visible";

  const gradId = `paidRibbonGrad_${index}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;

  const paidRibbonHtml = isPaid
    ? `<div class="paid-corner-ribbon-wrapper" aria-label="Paid Invoice" style="display:block;visibility:visible;">
        <svg class="paid-corner-ribbon-svg" width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#166534" />
              <stop offset="50%" stop-color="#15803d" />
              <stop offset="100%" stop-color="#16a34a" />
            </linearGradient>
          </defs>
          <polygon points="60,0 115,0 160,45 160,100" fill="url(#${gradId})" />
          <line x1="115" y1="0" x2="160" y2="45" stroke="#fbbf24" stroke-width="2.5" />
          <line x1="60" y1="0" x2="160" y2="100" stroke="#f59e0b" stroke-width="2.5" />
          <text x="124" y="41" transform="rotate(45 124 36)" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', Inter, -apple-system, sans-serif" font-weight="900" font-size="15" letter-spacing="4">PAID</text>
        </svg>
      </div>`
    : "";

  const fromName = invoice?.from?.name || "Invoice";
  const fromEmail = invoice?.from?.email || invoice?.senderEmail || "";
  const fromPhone = invoice?.from?.phone || "";
  const fromContactLine = `${fromEmail}${fromEmail && fromPhone ? " · " : ""}${fromPhone}`;

  const billedToName = invoice?.billedTo?.name || invoice?.client || "Client";
  const billedToEmail =
    invoice?.billedTo?.email || invoice?.email || invoice?.clientEmail || "";
  const billedToPhone = invoice?.billedTo?.phone || "";

  const partyField = (label, val, cls) =>
    val
      ? `<br /><span class="party-contact-label">${escapeHtml(label)}:</span> <span class="${cls}">${escapeHtml(val)}</span>`
      : "";

  const fromAddressHtml = partyField(
    "Address",
    invoice?.from?.address,
    "party-address"
  );
  const fromCityHtml = partyField("City", invoice?.from?.city, "party-city");
  const fromPincodeHtml = partyField(
    "Pincode",
    invoice?.from?.pincode,
    "party-pincode"
  );

  const billedToAddressHtml = partyField(
    "Address",
    invoice?.billedTo?.address,
    "party-address"
  );
  const billedToCityHtml = partyField(
    "City",
    invoice?.billedTo?.city,
    "party-city"
  );
  const billedToPincodeHtml = partyField(
    "Pincode",
    invoice?.billedTo?.pincode,
    "party-pincode"
  );

  const itemsHtml = items
    .map(
      (item, idx) => `
      <tr>
        <td class="text-center item-no-cell">${idx + 1}</td>
        <td class="item-desc-cell">${escapeHtml(item.description || "")}</td>
        <td class="text-center">${formatIndianNumber(item.quantity, false)}</td>
        <td class="text-right">${money(item.unitPrice)}</td>
        <td class="text-right">${escapeHtml(item.tax)}%</td>
        <td class="text-right font-semibold">${money(
          Number(item.unitPrice || 0) *
            Number(item.quantity || 0) *
            (1 + Number(item.tax || 0) / 100)
        )}</td>
      </tr>`
    )
    .join("");

  card.innerHTML = `
    ${paidRibbonHtml}
    <div class="preview-top-stripe" aria-hidden="true"></div>
    <div class="preview-head">
      <div class="preview-brand-block">
        <span class="brand-mark">
          <img src="${logoSrc}" alt="InvoiceG Logo" width="26" height="26" class="brand-logo-img brand-favicon-svg" style="width:26px;height:26px;object-fit:contain;" />
        </span>
        <div>
          <h2>${escapeHtml(fromName)}</h2>
          <small>${escapeHtml(fromContactLine)}</small>
        </div>
      </div>
      <div class="preview-meta-block">
        <div class="preview-meta-title">
          <b>INVOICE</b>
        </div>
        <small class="preview-inv-num">#${escapeHtml(invoice?.id || "")}</small>
        <div class="preview-dates-info">
          <div class="preview-date-row" style="width:fit-content;max-width:fit-content;align-self:flex-start;display:inline-flex;justify-content:flex-start;">
            <span class="preview-date-label">Invoice Date:</span>
            <span class="preview-date-val">${escapeHtml(invoiceDateDisplay)}</span>
          </div>
          <div class="preview-date-row preview-due-date-row ${!isPaid ? "highlight-due" : ""}" style="width:fit-content;max-width:fit-content;align-self:flex-start;display:inline-flex;justify-content:flex-start;${isPaid ? "background:transparent;border:none;padding:0;" : ""}">
            <span class="preview-date-label">Due Date:</span>
            <span class="preview-date-val">${escapeHtml(dueDateDisplay)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="parties">
      <div class="party-card party-from">
        <small class="party-role">FROM</small>
        <p>
          <b>${escapeHtml(fromName)}</b>
          ${fromEmail ? `<br /><span class="party-email">${escapeHtml(fromEmail)}</span>` : ""}
          ${fromPhone ? `<br /><span class="party-contact-label">Mobile No.:</span> <span class="party-phone">${escapeHtml(fromPhone)}</span>` : ""}
          ${fromAddressHtml}
          ${fromCityHtml}
          ${fromPincodeHtml}
        </p>
      </div>
      <div class="party-card party-to">
        <small class="party-role">BILLED TO</small>
        <p>
          <b>${escapeHtml(billedToName)}</b>
          ${billedToEmail ? `<br /><span class="party-email">${escapeHtml(billedToEmail)}</span>` : ""}
          ${billedToPhone ? `<br /><span class="party-contact-label">Mobile No.:</span> <span class="party-phone">${escapeHtml(billedToPhone)}</span>` : ""}
          ${billedToAddressHtml}
          ${billedToCityHtml}
          ${billedToPincodeHtml}
        </p>
      </div>
    </div>

    <div class="table-scroll preview-table-scroll" style="overflow:visible;">
      <table class="invoice-table preview-items-table">
        <thead>
          <tr>
            <th class="th-item-no text-center">#</th>
            <th>Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Tax</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="preview-summary-wrapper">
      <div class="preview-summary-card">
        <div class="summary-line">
          <span class="summary-label">Subtotal</span>
          <span class="summary-value">${money(subtotal)}</span>
        </div>
        <div class="summary-line">
          <span class="summary-label">Tax / GST</span>
          <span class="summary-value">${money(totalTax)}</span>
        </div>
        <div class="summary-line summary-total-line">
          <span class="summary-total-label">Total Due</span>
          <b class="summary-total-value">${money(grandTotal)}</b>
        </div>
      </div>
    </div>

    <p class="note">
      Thank you for choosing <strong>${escapeHtml(fromName || "our company")}</strong>.<br />
      We appreciate your business and look forward to working with you again.
    </p>
  `;

  return {
    card,
    isMultiPage: items.length >= 6,
    isPaid,
    itemsCount: items.length,
    invoiceId: invoice?.id || "invoice",
  };
}

/**
 * Mounts the invoice card in an off-screen container and captures it with html2canvas.
 */
async function renderCardToCanvas(cardNode, isPaid) {
  const host = document.createElement("div");
  host.setAttribute("data-pdf-host", "true");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:734px;background:#ffffff;z-index:-9999;";

  host.appendChild(cardNode);
  document.body.appendChild(host);

  try {
    return await html2canvas(cardNode, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc) => {
        clonedDoc.body.classList.add("download-pdf-mode");
        const h = clonedDoc.querySelector("[data-pdf-host]");
        if (h) {
          h.style.left = "0px";
          h.style.position = "absolute";
        }
        const dRow = clonedDoc.querySelector(".preview-due-date-row");
        if (dRow) {
          dRow.style.width = "fit-content";
          dRow.style.maxWidth = "fit-content";
          dRow.style.alignSelf = "flex-start";
          dRow.style.display = "inline-flex";
          dRow.style.justifyContent = "flex-start";
          if (isPaid) {
            dRow.style.background = "transparent";
            dRow.style.border = "none";
            dRow.style.padding = "0";
          }
        }
        const iRow = clonedDoc.querySelector(
          ".preview-date-row:not(.preview-due-date-row)"
        );
        if (iRow) {
          iRow.style.width = "fit-content";
          iRow.style.maxWidth = "fit-content";
          iRow.style.alignSelf = "flex-start";
          iRow.style.display = "inline-flex";
          iRow.style.justifyContent = "flex-start";
        }
        const scroll = clonedDoc.querySelector(".preview-table-scroll");
        if (scroll) scroll.style.overflow = "visible";
        const r = clonedDoc.querySelector(".paid-corner-ribbon-wrapper");
        if (r) {
          r.style.display = "block";
          r.style.visibility = "visible";
        }
      },
    });
  } finally {
    host.remove();
  }
}

/**
 * Exports all given invoices as a single combined PDF document.
 * Every invoice is rendered in full official PDF format.
 * Multi-item invoices (>= 6 items) span 2 pages, while standard invoices occupy 1 page.
 *
 * @param {Array<Object>} invoices - Array of invoice objects to export
 * @param {string} [username="user"] - Logged-in username for file naming
 * @param {Function} [onProgress] - Optional progress callback ({ current, total, invoiceId, message })
 * @returns {Promise<{ fileName: string, count: number, totalPages: number }>}
 */
export async function exportAllInvoicesToPdf(
  invoices,
  username = "user",
  onProgress
) {
  if (!invoices || !Array.isArray(invoices) || invoices.length === 0) {
    throw new Error("No invoices available to export.");
  }

  const logoDataUrl = await getLogoDataUrl();

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const marginX = 8;
  const marginY = 8;
  const printWidth = pdfWidth - marginX * 2; // 194mm
  const printHeight = pdfHeight - marginY * 2 - 8; // Leave margin at bottom for page numbering

  const addCanvasToPage = (canvas) => {
    let w = printWidth;
    let h = (canvas.height * w) / canvas.width;
    if (h > printHeight) {
      const ratio = printHeight / h;
      w = w * ratio;
      h = printHeight;
    }
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      marginX,
      marginY,
      w,
      h,
      undefined,
      "FAST"
    );
  };

  const pageEntries = [];
  let currentPageIndex = 0;

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    const invNum = i + 1;
    const invId = inv.id || `Invoice-${invNum}`;

    onProgress?.({
      current: invNum,
      total: invoices.length,
      invoiceId: invId,
      message: `Rendering invoice ${invNum} of ${invoices.length} (#${invId})...`,
    });

    const { card, isMultiPage, isPaid } = buildInvoiceDomNode(
      inv,
      logoDataUrl,
      i
    );

    if (!isMultiPage) {
      currentPageIndex++;
      if (currentPageIndex > 1) {
        pdf.addPage();
      }
      const canvas = await renderCardToCanvas(card, isPaid);
      addCanvasToPage(canvas);
      pageEntries.push({
        pageNum: currentPageIndex,
        invoiceId: invId,
        pageInInvoice: 1,
        totalInInvoice: 1,
      });
    } else {
      // Page 1: stripe + head + parties + items table
      currentPageIndex++;
      if (currentPageIndex > 1) {
        pdf.addPage();
      }
      const page1Node = card.cloneNode(true);
      page1Node.querySelector(".preview-summary-wrapper")?.remove();
      page1Node.querySelector(".note")?.remove();
      const canvas1 = await renderCardToCanvas(page1Node, isPaid);
      addCanvasToPage(canvas1);
      pageEntries.push({
        pageNum: currentPageIndex,
        invoiceId: invId,
        pageInInvoice: 1,
        totalInInvoice: 2,
      });

      // Page 2: summary card + thank-you note
      currentPageIndex++;
      pdf.addPage();
      const page2Node = card.cloneNode(true);
      page2Node.querySelector(".paid-corner-ribbon-wrapper")?.remove();
      page2Node.querySelector(".preview-top-stripe")?.remove();
      page2Node.querySelector(".preview-head")?.remove();
      page2Node.querySelector(".parties")?.remove();
      page2Node.querySelector(".preview-table-scroll")?.remove();
      const canvas2 = await renderCardToCanvas(page2Node, isPaid);
      addCanvasToPage(canvas2);
      pageEntries.push({
        pageNum: currentPageIndex,
        invoiceId: invId,
        pageInInvoice: 2,
        totalInInvoice: 2,
      });
    }
  }

  onProgress?.({
    current: invoices.length,
    total: invoices.length,
    message: "Finalizing combined PDF document...",
  });

  const totalPages = pdf.internal.getNumberOfPages();

  // Print bottom headers/page numbers on every page
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);

    const entry = pageEntries[p - 1];
    const leftText = entry ? `Invoice #${entry.invoiceId}` : "Invoice";
    const rightText = `Page ${p} of ${totalPages}`;

    pdf.text(leftText, marginX, pdfHeight - 4, { align: "left" });
    pdf.text(rightText, pdfWidth - marginX, pdfHeight - 4, { align: "right" });
  }

  const cleanUser = String(username || "all").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `All-Invoices-${cleanUser}-${dateStamp}.pdf`;

  pdf.save(fileName);

  return {
    fileName,
    count: invoices.length,
    totalPages,
  };
}
