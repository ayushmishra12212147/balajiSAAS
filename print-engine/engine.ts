import { PrintJobOptions, PrintData, PrintResult } from "./types";
import { auditLogger } from "@/lib/logger";

/**
 * Core Print Engine manager coordinating document generation
 * and log-recording routines.
 */
export class PrintEngine {
  /**
   * Evaluates templates, generates device payload, logs audit entry, and registers printer job.
   */
  public static async processPrint(
    templateId: string,
    data: PrintData,
    options: PrintJobOptions
  ): Promise<PrintResult> {
    const jobId = `PRT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Log the print action as a security-compliant audit event
    auditLogger.audit(`Initiated print job ${jobId} for template ${templateId}`, {
      templateId,
      format: options.format,
      printer: options.printerName || "Default System Printer",
    });

    let renderedPayload = "";
    switch (options.format) {
      case "THERMAL_80MM":
      case "THERMAL_58MM":
        renderedPayload = this.compileThermal(templateId, data);
        break;
      case "LABEL_BARCODE":
      case "LABEL_QR":
        renderedPayload = this.compileLabel(templateId, data);
        break;
      case "A5":
      case "A4":
      default:
        renderedPayload = this.compileStandardA4(templateId, data);
    }

    return {
      success: true,
      jobId,
      outputFormat: options.format,
      renderedPayload,
      printedAt: new Date().toISOString(),
    };
  }

  private static escapeHtml(str: unknown): string {
    if (str === null || str === undefined) return "";
    const s = String(str);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private static compileStandardA4(templateId: string, data: PrintData): string {
    const escapedHospitalName = this.escapeHtml(data.hospitalName);
    const escapedTimestamp = this.escapeHtml(data.timestamp);
    const escapedTitle = this.escapeHtml(data.title);
    const escapedFooter = this.escapeHtml(data.footer);

    if (templateId === "opd-slip") {
      const content = (data.content as any) || {};
      const token = this.escapeHtml(content.tokenNumber);
      const opdId = this.escapeHtml(content.opdId);
      const uhid = this.escapeHtml(content.uhid);
      const name = this.escapeHtml(content.patientName);
      const age = this.escapeHtml(content.age);
      const gender = this.escapeHtml(content.gender);
      const doc = this.escapeHtml(content.doctor);
      const dept = this.escapeHtml(content.department);
      const type = this.escapeHtml(content.visitType);
      const fee = this.escapeHtml(content.fee);
      const sym = this.escapeHtml(content.symptoms || "N/A");

      return `
        <div class="print-document print-a4" style="font-family: monospace; padding: 40px; color: #000; max-width: 650px; margin: 0 auto; border: 2px dashed #334155; border-radius: 8px; background: #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <header style="border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${escapedHospitalName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase; color: #475569;">${escapedTitle || "OPD Consultation Slip"}</p>
          </header>
          <main>
            <div style="text-align: center; margin-bottom: 25px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 0;">
              <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; color: #64748b;">Consultation Queue Token</span>
              <h2 style="margin: 2px 0 0 0; font-size: 56px; font-weight: 900; color: #0f172a; line-height: 1;">${token}</h2>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
              <tr style="border-bottom: 1px dashed #e2e8f0;">
                <td style="padding: 8px 0; width: 50%;"><strong>OPD ID:</strong> <span style="font-weight: bold; font-family: monospace;">${opdId}</span></td>
                <td style="padding: 8px 0; width: 50%;"><strong>UHID:</strong> <span style="font-weight: bold; font-family: monospace;">${uhid}</span></td>
              </tr>
              <tr style="border-bottom: 1px dashed #e2e8f0;">
                <td style="padding: 8px 0;"><strong>Patient:</strong> ${name}</td>
                <td style="padding: 8px 0;"><strong>Age/Sex:</strong> ${age} Yrs / ${gender}</td>
              </tr>
              <tr style="border-bottom: 1px dashed #e2e8f0;">
                <td style="padding: 8px 0;"><strong>Department:</strong> ${dept}</td>
                <td style="padding: 8px 0;"><strong>Physician:</strong> ${doc}</td>
              </tr>
              <tr style="border-bottom: 1px dashed #e2e8f0;">
                <td style="padding: 8px 0;"><strong>Visit Type:</strong> <span style="text-transform: uppercase; font-weight: bold;">${type}</span></td>
                <td style="padding: 8px 0;"><strong>Fee Paid:</strong> <span style="font-weight: bold; color: #059669;">₹${Number(fee || 0).toFixed(2)}</span></td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 12px 0 4px 0;">
                  <strong style="display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; color: #64748b;">Chief Complaints / Symptoms:</strong>
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-family: sans-serif; font-size: 12px; min-height: 40px; color: #334155;">
                    ${sym}
                  </div>
                </td>
              </tr>
            </table>
          </main>
          <footer style="border-top: 2px dashed #000; padding-top: 15px; margin-top: 30px; font-size: 10px; text-align: center; color: #475569;">
            <p style="margin: 0; font-weight: bold; font-family: monospace;">Printed At: ${escapedTimestamp}</p>
            <p style="margin: 6px 0 0 0; font-family: sans-serif; font-style: italic;">${escapedFooter || "Please wait for your token to be announced outside the consultation room."}</p>
          </footer>
        </div>
      `;
    }

    if (data.content && typeof data.content === "object" && (data.content as any).reportType === "collection") {
      const hospitalColl = (data.content as any).hospitalCollection || [];
      const pharmacyColl = (data.content as any).pharmacyCollection || [];
      const summary = (data.content as any).summary || {};

      const hRowLines = hospitalColl.map((r: any) => {
        return `<tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; font-family: monospace;">${this.escapeHtml(r.invoiceNumber)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${this.escapeHtml(r.patientName)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; font-weight: bold; text-align: right;">₹${Number(r.amount).toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${this.escapeHtml(r.paymentMode)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; font-family: monospace;">${this.escapeHtml(new Date(r.date).toLocaleString("en-IN"))}</td>
        </tr>`;
      }).join("");

      const pRowLines = pharmacyColl.map((r: any) => {
        return `<tr>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; font-family: monospace;">${this.escapeHtml(r.invoiceNumber)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${this.escapeHtml(r.patientName)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; font-weight: bold; text-align: right;">₹${Number(r.amount).toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${this.escapeHtml(r.paymentMode)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; font-family: monospace;">${this.escapeHtml(new Date(r.date).toLocaleString("en-IN"))}</td>
        </tr>`;
      }).join("");

      return `
        <div class="print-document print-a4" style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <header style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; color: #0f172a;">${escapedHospitalName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-family: monospace;">Printed: ${escapedTimestamp}</p>
          </header>
          <main>
            <h2 style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #0f172a;">${escapedTitle}</h2>
            
            <h3 style="margin: 15px 0 6px 0; font-size: 13px; font-weight: bold; color: #059669;">Hospital Revenue Collection</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">INVOICE NO</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">PATIENT NAME</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-size: 10px; font-weight: bold; color: #475569;">AMOUNT</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">MODE</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">RECEIVED AT</th>
                </tr>
              </thead>
              <tbody>
                ${hRowLines}
                ${hospitalColl.length === 0 ? `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8; font-size: 11px;">No hospital collections recorded.</td></tr>` : ""}
              </tbody>
            </table>

            <h3 style="margin: 15px 0 6px 0; font-size: 13px; font-weight: bold; color: #2563eb;">Pharmacy Inventory Collection</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">INVOICE NO</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">CUSTOMER NAME</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-size: 10px; font-weight: bold; color: #475569;">AMOUNT</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">MODE</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">RECEIVED AT</th>
                </tr>
              </thead>
              <tbody>
                ${pRowLines}
                ${pharmacyColl.length === 0 ? `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8; font-size: 11px;">No pharmacy collections recorded.</td></tr>` : ""}
              </tbody>
            </table>

            <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: right;">
              <span style="display: block; font-size: 11px; color: #475569; margin-bottom: 2px;">Hospital Total: <strong>₹${Number(summary.hospitalTotal || 0).toFixed(2)}</strong></span>
              <span style="display: block; font-size: 11px; color: #475569; margin-bottom: 4px;">Pharmacy Total: <strong>₹${Number(summary.pharmacyTotal || 0).toFixed(2)}</strong></span>
              <span style="display: block; font-size: 13px; font-weight: bold; color: #0f172a; border-top: 1px dashed #cbd5e1; padding-top: 4px; margin-top: 4px;">Grand Revenue Total: ₹${Number(summary.grandTotal || 0).toFixed(2)}</span>
            </div>
          </main>
          <footer style="border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 40px; font-size: 9px; text-align: center; color: #64748b;">
            ${escapedFooter || "Thank you."}
          </footer>
        </div>
      `;
    }

    if (data.content && typeof data.content === "object" && "rows" in data.content && Array.isArray((data.content as any).rows)) {
      const rows = (data.content as any).rows;
      const summary = (data.content as any).summary || {};
      const headers = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== "id") : [];
      
      const headerCells = headers.map(h => `<th style="border: 1px solid #cbd5e1; padding: 6px 8px; background: #f8fafc; text-align: left; font-size: 10px; font-weight: bold; color: #475569;">${this.escapeHtml(h.replace(/([A-Z])/g, ' $1').toUpperCase())}</th>`).join("");
      const rowLines = rows.map((r: any) => {
        const cells = headers.map(h => {
          const val = r[h];
          const displayVal = val instanceof Date || (typeof val === "string" && !isNaN(Date.parse(val)) && val.includes("T")) 
            ? new Date(val).toLocaleDateString("en-IN") 
            : String(val !== null && val !== undefined ? val : "");
          return `<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; color: #334155;">${this.escapeHtml(displayVal)}</td>`;
        }).join("");
        return `<tr>${cells}</tr>`;
      }).join("");

      const summaryLines = Object.entries(summary).map(([k, v]) => {
        const formattedVal = typeof v === "number" && k.toLowerCase().includes("amount") ? `₹${v.toFixed(2)}` : String(v);
        return `<span style="margin-right: 20px; font-size: 11px; color: #475569;"><strong>${this.escapeHtml(k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))}:</strong> ${this.escapeHtml(formattedVal)}</span>`;
      }).join("");

      return `
        <div class="print-document print-a4" style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <header style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold; text-transform: uppercase; color: #0f172a;">${escapedHospitalName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-family: monospace;">Printed: ${escapedTimestamp}</p>
          </header>
          <main>
            <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #0f172a;">${escapedTitle}</h2>
            
            <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              ${summaryLines || '<span style="font-size: 11px; color: #94a3b8;">No summaries applicable.</span>'}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr>${headerCells}</tr>
              </thead>
              <tbody>
                ${rowLines}
                ${rows.length === 0 ? `<tr><td colspan="${headers.length || 1}" style="text-align: center; padding: 20px; color: #94a3b8; font-size: 11px;">No records match active filters.</td></tr>` : ""}
              </tbody>
            </table>
          </main>
          <footer style="border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 40px; font-size: 9px; text-align: center; color: #64748b;">
            ${escapedFooter || "End of Report summary."}
          </footer>
        </div>
      `;
    }

    // Fallback standard layout
    return `
      <div class="print-document print-a4" style="font-family: sans-serif; padding: 20px;">
        <header style="border-bottom: 2px solid #000; padding-bottom: 10px;">
          <h1 style="margin: 0; text-align: center;">${escapedHospitalName}</h1>
          <p style="margin: 5px 0 0 0; text-align: center; font-size: 12px;">Date: ${escapedTimestamp}</p>
        </header>
        <main style="margin: 20px 0;">
          <h2>${escapedTitle}</h2>
          <div class="content-table">
            ${Object.entries(data.content)
              .map(([k, v]) => `<p><strong>${this.escapeHtml(k)}:</strong> ${this.escapeHtml(v)}</p>`)
              .join("")}
          </div>
        </main>
        <footer style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 50px; font-size: 10px; text-align: center;">
          ${escapedFooter || "Thank you."}
        </footer>
      </div>
    `;
  }

  private static compileThermal(templateId: string, data: PrintData): string {
    // Simplified thermal ESC/POS text representation (will hold control characters in future)
    return `
-----------------------------------------
         ${data.hospitalName.toUpperCase()}
Date: ${data.timestamp}
-----------------------------------------
Job: ${templateId}
Title: ${data.title}
-----------------------------------------
${Object.entries(data.content)
  .map(([k, v]) => `${k.padEnd(20)}: ${v}`)
  .join("\n")}
-----------------------------------------
${data.footer || "Thank you."}
-----------------------------------------
    `;
  }

  private static compileLabel(templateId: string, data: PrintData): string {
    // Generate ZPL commands for direct barcode thermal printer output
    return `
^XA
^FO50,50^A0N,30,30^FD${data.hospitalName}^FS
^FO50,100^A0N,25,25^FDTitle: ${data.title}^FS
^FO50,150^BY2^BCN,60,Y,N,N^FD${String(data.content["id"] || "00000000")}^FS
^XZ
    `;
  }
}
