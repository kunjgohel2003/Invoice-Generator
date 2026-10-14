import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { money, formatIndianNumber } from "../components/InvoiceTable";
import {
  PrintIcon,
  DownloadIcon,
  EditIcon,
  DeleteIcon,
  BackIcon,
  BrandIcon,
} from "../components/Icons";

export function formatDisplayDate(dateStr) {
  if (!dateStr || String(dateStr).trim() === "" || dateStr === "Not set")
    return "Not set";
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

export default function InvoiceDetail({
  invoice,
  onBack,
  onEdit,
  onDelete,
  onNotify,
  onStatusChange,
}) {
  const previewRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!invoice) return null;

  const items = invoice.items || [
    {
      description: invoice.detail || "General item",
      quantity: 1,
      unitPrice: invoice.amount ? invoice.amount / 1.18 : 0,
      tax: 18,
    },
  ];

  const subtotal = items.reduce(
    (acc, item) =>
      acc + Number(item.unitPrice || 0) * Number(item.quantity || 0),
    0,
  );

  const totalTax = items.reduce(
    (acc, item) =>
      acc +
      (Number(item.unitPrice || 0) *
        Number(item.quantity || 0) *
        Number(item.tax || 0)) /
        100,
    0,
  );

  const grandTotal = invoice.amount || subtotal + totalTax;

  // In A4 print, 6 or more items pushes the summary card to page 2
  const isMultiPage = items.length >= 6;
  const totalPages = isMultiPage ? 2 : 1;

  const invoiceDateDisplay = formatDisplayDate(
    invoice.invoiceDate || invoice.date,
  );
  const dueDateDisplay = formatDisplayDate(invoice.dueDate);
  const isPaid = (invoice.status || "").toLowerCase() === "paid";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current || isDownloading) return;
    try {
      setIsDownloading(true);
      onNotify?.("Generating PDF...", "info");

      const element = previewRef.current;

      // Renders an off-screen copy of the invoice card at the fixed PDF width.
      // `mutate` lets us strip the parts that belong to the other page.
      const renderCard = async (mutate) => {
        const host = document.createElement("div");
        host.setAttribute("data-pdf-host", "true");
        host.style.cssText =
          "position:fixed;left:-10000px;top:0;width:734px;background:#ffffff;";

        const card = element.cloneNode(true);
        card.classList.add("download-pdf-mode-preview");
        card.style.width = "734px";
        card.style.maxWidth = "734px";
        card.style.boxSizing = "border-box";
        card.style.margin = "0";

        // Remove print-only helpers
        card.querySelectorAll(".print-page-number").forEach((n) => n.remove());

        // Keep Due Date width matching Invoice Date (compact fit-content)
        const dueRowEl = card.querySelector(".preview-due-date-row");
        if (dueRowEl) {
          dueRowEl.style.width = "fit-content";
          dueRowEl.style.maxWidth = "fit-content";
          dueRowEl.style.alignSelf = "flex-start";
          dueRowEl.style.display = "inline-flex";
          dueRowEl.style.justifyContent = "flex-start";
          if (isPaid) {
            dueRowEl.style.background = "transparent";
            dueRowEl.style.border = "none";
            dueRowEl.style.padding = "0";
          }
        }
        const invRowEl = card.querySelector(".preview-date-row:not(.preview-due-date-row)");
        if (invRowEl) {
          invRowEl.style.width = "fit-content";
          invRowEl.style.maxWidth = "fit-content";
          invRowEl.style.alignSelf = "flex-start";
          invRowEl.style.display = "inline-flex";
          invRowEl.style.justifyContent = "flex-start";
        }

        // Ensure paid ribbon is visible on the cloned card for PDF rendering
        const ribbonEl = card.querySelector(".paid-corner-ribbon-wrapper");
        if (ribbonEl) {
          ribbonEl.style.display = "block";
          ribbonEl.style.visibility = "visible";
        }

        mutate?.(card);

        host.appendChild(card);
        document.body.appendChild(host);

        try {
          return await html2canvas(card, {
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
              const iRow = clonedDoc.querySelector(".preview-date-row:not(.preview-due-date-row)");
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
      };

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
      const printHeight = pdfHeight - marginY * 2 - 6; // leave room for page number

      // Places a canvas on the current PDF page, shrinking only if too tall
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
          "FAST",
        );
      };

      if (!isMultiPage) {
        // --- 1 PAGE INVOICE ---
        const canvas = await renderCard();
        addCanvasToPage(canvas);
      } else {
        // --- MULTI-PAGE: mirrors the print layout exactly ---
        // Page 1: stripe + header + parties + full items table
        const page1Canvas = await renderCard((card) => {
          card.querySelector(".preview-summary-wrapper")?.remove();
          card.querySelector(".note")?.remove();
        });
        addCanvasToPage(page1Canvas);

        // Page 2: summary card + thank-you note (in its own bordered card)
        const page2Canvas = await renderCard((card) => {
          card.querySelector(".paid-corner-ribbon-wrapper")?.remove();
          card.querySelector(".preview-top-stripe")?.remove();
          card.querySelector(".preview-head")?.remove();
          card.querySelector(".parties")?.remove();
          card.querySelector(".preview-table-scroll")?.remove();
        });
        pdf.addPage();
        addCanvasToPage(page2Canvas);

        // Page numbers, bottom right
        for (let p = 1; p <= 2; p++) {
          pdf.setPage(p);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`Page ${p} of 2`, pdfWidth - marginX, pdfHeight - 4, {
            align: "right",
          });
        }
      }

      const safeId = (invoice.id || "invoice").replace(/[^a-zA-Z0-9-_]/g, "_");
      pdf.save(`Invoice-${safeId}.pdf`);
      onNotify?.("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("PDF download failed:", error);
      onNotify?.(
        "Failed to generate PDF. You can use Print PDF as alternative.",
        "error",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section className="page invoice-detail-page">
      {/* If multi-page, inject print styles and fixed print page counter */}
      {isMultiPage && (
        <>
          <style>{`
            @page {
              size: A4 portrait;
              margin: 8mm 8mm 14mm 8mm;
              @bottom-right {
                content: "Page " counter(page) " of ${totalPages}";
                font-size: 8.5pt;
                color: #64748b;
                font-family: inherit;
              }
            }
          `}</style>
          <div
            className="print-fixed-page-counter"
            aria-hidden="true"
            data-total-pages={totalPages}
          />
        </>
      )}

      <div className="page-nav-back">
        <button className="back" onClick={onBack}>
          <BackIcon size={16} />
          <span>Back to invoice history</span>
        </button>
      </div>

      <header className="page-head detail-head">
        <div>
          <div className="detail-title-row">
            <h1>Invoice {invoice.id}</h1>
            <span className={`status ${isPaid ? "paid" : "due"}`}>
              {isPaid ? "Paid" : "Due"}
            </span>
          </div>
          <p className="subtitle">
            <span className="subtitle-date">Invoice Date: {invoiceDateDisplay}</span>
            <span className="subtitle-sep">·</span>
            <span className="subtitle-date">Due Date: {dueDateDisplay}</span>
          </p>
        </div>
      </header>

      <article className="invoice-preview" ref={previewRef}>
        {isPaid && (
          <div className="paid-corner-ribbon-wrapper" aria-label="Paid Invoice">
            <svg
              className="paid-corner-ribbon-svg"
              width="160"
              height="160"
              viewBox="0 0 160 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="paidRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#166534" />
                  <stop offset="50%" stopColor="#15803d" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
              {/* Main Green Band */}
              <polygon points="60,0 115,0 160,45 160,100" fill="url(#paidRibbonGrad)" />
              {/* Gold Top Border */}
              <line x1="115" y1="0" x2="160" y2="45" stroke="#fbbf24" strokeWidth="2.5" />
              {/* Gold Bottom Border */}
              <line x1="60" y1="0" x2="160" y2="100" stroke="#f59e0b" strokeWidth="2.5" />
              {/* PAID Text */}
              <text
                x="124"
                y="41"
                transform="rotate(45 124 36)"
                textAnchor="middle"
                fill="#ffffff"
                fontFamily="'Plus Jakarta Sans', Inter, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="15"
                letterSpacing="4"
              >
                PAID
              </text>
            </svg>
          </div>
        )}
        <div className="preview-top-stripe" aria-hidden="true"></div>
        <div className="preview-head">
          <div className="preview-brand-block">
            <span className="brand-mark">
              <BrandIcon size={26} />
            </span>
            <div>
              <h2>{invoice.from?.name || "Invoice"}</h2>
              <small>
                {invoice.from?.email || invoice.senderEmail || ""}{" "}
                {invoice.from?.phone ? `· ${invoice.from.phone}` : ""}
              </small>
            </div>
          </div>
          <div className="preview-meta-block">
            <div className="preview-meta-title">
              <b>INVOICE</b>
            </div>
            <small className="preview-inv-num">#{invoice.id}</small>
            <div className="preview-dates-info">
              <div className="preview-date-row">
                <span className="preview-date-label">Invoice Date:</span>
                <span className="preview-date-val">{invoiceDateDisplay}</span>
              </div>
              <div
                className={`preview-date-row preview-due-date-row ${!isPaid ? "highlight-due" : ""}`}
              >
                <span className="preview-date-label">Due Date:</span>
                <span className="preview-date-val">{dueDateDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="parties">
          <div className="party-card party-from">
            <small className="party-role">FROM</small>
            <p>
              <b>{invoice.from?.name || "Not provided"}</b>
              {(invoice.from?.email || invoice.senderEmail) && (
                <>
                  <br />
                  <span className="party-email">
                    {invoice.from?.email || invoice.senderEmail}
                  </span>
                </>
              )}
              {invoice.from?.phone && (
                <>
                  <br />
                  <span className="party-contact-label">Mobile No.:</span>{" "}
                  <span className="party-phone">{invoice.from.phone}</span>
                </>
              )}
              {invoice.from?.address && (
                <>
                  <br />
                  <span className="party-contact-label">Address:</span>{" "}
                  <span className="party-address">{invoice.from.address}</span>
                </>
              )}
              {invoice.from?.city && (
                <>
                  <br />
                  <span className="party-contact-label">City:</span>{" "}
                  <span className="party-city">{invoice.from.city}</span>
                </>
              )}
              {invoice.from?.pincode && (
                <>
                  <br />
                  <span className="party-contact-label">Pincode:</span>{" "}
                  <span className="party-pincode">{invoice.from.pincode}</span>
                </>
              )}
            </p>
          </div>
          <div className="party-card party-to">
            <small className="party-role">BILLED TO</small>
            <p>
              <b>{invoice.billedTo?.name || invoice.client}</b>
              {(invoice.billedTo?.email ||
                invoice.email ||
                invoice.clientEmail) && (
                <>
                  <br />
                  <span className="party-email">
                    {invoice.billedTo?.email ||
                      invoice.email ||
                      invoice.clientEmail}
                  </span>
                </>
              )}
              {invoice.billedTo?.phone && (
                <>
                  <br />
                  <span className="party-contact-label">Mobile No.:</span>{" "}
                  <span className="party-phone">{invoice.billedTo.phone}</span>
                </>
              )}
              {invoice.billedTo?.address && (
                <>
                  <br />
                  <span className="party-contact-label">Address:</span>{" "}
                  <span className="party-address">
                    {invoice.billedTo.address}
                  </span>
                </>
              )}
              {invoice.billedTo?.city && (
                <>
                  <br />
                  <span className="party-contact-label">City:</span>{" "}
                  <span className="party-city">{invoice.billedTo.city}</span>
                </>
              )}
              {invoice.billedTo?.pincode && (
                <>
                  <br />
                  <span className="party-contact-label">Pincode:</span>{" "}
                  <span className="party-pincode">
                    {invoice.billedTo.pincode}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="table-scroll preview-table-scroll">
          <table className="invoice-table preview-items-table">
            <thead>
              <tr>
                <th className="th-item-no text-center">#</th>
                <th>Description</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Tax</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="text-center item-no-cell">{index + 1}</td>
                  <td className="item-desc-cell">{item.description}</td>
                  <td className="text-center">
                    {formatIndianNumber(item.quantity, false)}
                  </td>
                  <td className="text-right">{money(item.unitPrice)}</td>
                  <td className="text-right">{item.tax}%</td>
                  <td className="text-right font-semibold">
                    {money(
                      Number(item.unitPrice) *
                        Number(item.quantity) *
                        (1 + Number(item.tax) / 100),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Subtotal, Tax and Grand Total Summary Card */}
        <div className="preview-summary-wrapper">
          <div className="preview-summary-card">
            <div className="summary-line">
              <span className="summary-label">Subtotal</span>
              <span className="summary-value">{money(subtotal)}</span>
            </div>
            <div className="summary-line">
              <span className="summary-label">Tax / GST</span>
              <span className="summary-value">{money(totalTax)}</span>
            </div>
            <div className="summary-line summary-total-line">
              <span className="summary-total-label">Total Due</span>
              <b className="summary-total-value">{money(grandTotal)}</b>
            </div>
          </div>
        </div>

        <p className="note">
          Thank you for choosing <strong>{invoice.from?.name || "our company"}</strong>.<br />
          We appreciate your business and look forward to working with you
          again.
        </p>

        <div
          className="print-page-number"
          aria-hidden="true"
          id="print-page-counter"
        />
      </article>

      {/* Floating/Bottom Action Bar */}
      <div className="detail-actions">
        <div className="detail-left-actions">
          <button className="secondary edit-invoice-btn" onClick={onEdit}>
            <EditIcon size={16} />
            <span>Edit invoice</span>
          </button>
          <button className="danger" onClick={onDelete}>
            <DeleteIcon size={16} />
            <span>Delete</span>
          </button>
        </div>
        <div className="detail-right-actions">
          <button
            type="button"
            className="secondary print-btn-bottom"
            onClick={handlePrint}
            title="Open print preview / print dialog"
          >
            <PrintIcon size={16} />
            <span>Print PDF</span>
          </button>
          <button
            type="button"
            className="primary download-btn-bottom"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            title="Download PDF file directly"
          >
            {isDownloading ? (
              <>
                <span className="btn-spinner" aria-hidden="true"></span>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <DownloadIcon size={16} />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
