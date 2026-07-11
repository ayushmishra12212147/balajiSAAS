import { z } from "zod";
import { AppError } from "@/server/errors";
import { DynamicFieldsRegistry, RegistryContext } from "./dynamic-fields-registry";

// Layout Validation Schema
export const LayoutComponentTypeSchema = z.enum([
  "Text",
  "DynamicField",
  "Table",
  "Line",
  "Rectangle",
  "Logo",
  "Image",
  "QRCode",
  "Barcode",
  "Signature",
  "PageNumber",
  "Date",
  "Time",
]);

export type LayoutComponentType = z.infer<typeof LayoutComponentTypeSchema>;

export const LayoutComponentSchema = z.object({
  id: z.string().min(1),
  type: LayoutComponentTypeSchema,
  x: z.number().min(0).max(100), // Normalized percentage of page width
  y: z.number().min(0).max(100), // Normalized percentage of page height
  w: z.number().min(0).max(100), // Normalized width
  h: z.number().min(0).max(100), // Normalized height
  content: z.string().optional(),
  fieldName: z.string().optional(), // Dynamic field key e.g. "Patient.Name"
  fontSize: z.number().optional().default(12),
  align: z.enum(["left", "center", "right"]).optional().default("left"),
  bold: z.boolean().optional().default(false),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  color: z.string().optional().default("#000000"),
  visible: z.boolean().optional().default(true),
  // Table specific options
  columns: z.array(z.object({
    header: z.string(),
    field: z.string(),
    w: z.number(), // Column width percentage
  })).optional(),
});

export type LayoutComponent = z.infer<typeof LayoutComponentSchema>;

export const CanvasLayoutSchema = z.object({
  width: z.number().optional().default(100),
  height: z.number().optional().default(100),
  components: z.array(LayoutComponentSchema),
  isRawHtml: z.literal(false).optional(),
});

export const RawHtmlLayoutSchema = z.object({
  isRawHtml: z.literal(true),
  htmlContent: z.string(),
});

export const LayoutSchema = z.union([CanvasLayoutSchema, RawHtmlLayoutSchema]);

export type LayoutConfig = {
  width?: number;
  height?: number;
  components?: LayoutConfigComponent[];
  isRawHtml?: boolean;
  htmlContent?: string;
};

// Map helper type
type LayoutConfigComponent = z.infer<typeof LayoutComponentSchema>;

export class PrintEngineService {
  /**
   * Validates and normalizes raw JSON layout configuration objects
   */
  static validateLayout(rawLayout: unknown): LayoutConfig {
    const parsed = LayoutSchema.safeParse(rawLayout);
    if (!parsed.success) {
      throw new AppError(
        `Invalid layout JSON configuration: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
        400,
        "BAD_REQUEST"
      );
    }

    const layout = parsed.data as LayoutConfig;

    if (!layout.isRawHtml && layout.components) {
      // Check duplicate component IDs
      const ids = new Set<string>();
      for (const comp of layout.components) {
        if (ids.has(comp.id)) {
          throw new AppError(`Layout contains duplicate component ID: '${comp.id}'`, 400, "BAD_REQUEST");
        }
        ids.add(comp.id);
      }
    }

    return layout;
  }

  /**
   * Compiles percentage coordinates and JSON layout items into absolute-positioned HTML output
   */
  static compileTemplate(
    layoutJson: unknown,
    context: RegistryContext,
    options?: {
      headerHeight?: number;
      footerHeight?: number;
      watermark?: string;
      showLogo?: boolean;
      showQR?: boolean;
      showBarcode?: boolean;
      paperSize?: string; // e.g. "A4", "A5"
      margins?: string; // e.g. "10mm"
    }
  ): string {
    const layout = this.validateLayout(layoutJson);
    if (layout.isRawHtml) {
      return DynamicFieldsRegistry.interpolate(layout.htmlContent || "", context);
    }
    const paperSize = options?.paperSize || "A4";
    const margins = options?.margins || "15mm";
    const watermarkText = options?.watermark || "";

    // Generate absolute offset components
    const componentHtml = (layout.components || [])
      .filter((comp) => comp.visible !== false)
      .map((comp) => {
        // Enforce logo, qr, barcode settings override
        if (comp.type === "Logo" && options?.showLogo === false) return "";
        if (comp.type === "QRCode" && options?.showQR === false) return "";
        if (comp.type === "Barcode" && options?.showBarcode === false) return "";

        const style = `
          position: absolute;
          left: ${comp.x}%;
          top: ${comp.y}%;
          width: ${comp.w}%;
          height: ${comp.h}%;
          font-size: ${comp.fontSize || 12}px;
          text-align: ${comp.align || "left"};
          font-weight: ${comp.bold ? "bold" : "normal"};
          color: ${comp.color || "#000000"};
          box-sizing: border-box;
          overflow: hidden;
          ${comp.borderWidth ? `border: ${comp.borderWidth}px solid ${comp.borderColor || "#000000"};` : ""}
        `.replace(/\s+/g, " ");

        // Compile content by type
        switch (comp.type) {
          case "Text":
            return `<div style="${style}">${DynamicFieldsRegistry.interpolate(comp.content || "", context)}</div>`;

          case "DynamicField":
            if (comp.fieldName) {
              const val = DynamicFieldsRegistry.resolve(comp.fieldName, context);
              return `<div style="${style}">${val}</div>`;
            }
            return "";

          case "Table":
            // Render table grid
            if (comp.columns) {
              const tableRows = (context.TableRows || []) as Record<string, unknown>[];
              const headerRow = comp.columns
                .map((col) => `<th style="width: ${col.w}%; padding: 4px; border-bottom: 1px solid #000; text-align: left;">${col.header}</th>`)
                .join("");

              const bodyRows = tableRows
                .map((row) => {
                  const tds = comp.columns!
                    .map((col) => {
                      const val = row[col.field];
                      return `<td style="padding: 4px; border-bottom: 0.5px solid #eee;">${val !== undefined && val !== null ? String(val) : ""}</td>`;
                    })
                    .join("");
                  return `<tr>${tds}</tr>`;
                })
                .join("");

              return `
                <div style="${style}">
                  <table style="width: 100%; border-collapse: collapse; font-size: inherit;">
                    <thead><tr>${headerRow}</tr></thead>
                    <tbody>${bodyRows}</tbody>
                  </table>
                </div>
              `;
            }
            return "";

          case "Line":
            return `<div style="${style} border-top: 1px solid ${comp.color || "#000"}; height: 0;"></div>`;

          case "Rectangle":
            return `<div style="${style} border: 1px solid ${comp.color || "#000"};"></div>`;

          case "Logo":
            const logoUrl = String(context.Hospital?.LogoUrl || "");
            if (logoUrl) {
              return `<img src="${logoUrl}" style="${style} object-fit: contain;" alt="Hospital Logo" />`;
            }
            return `<div style="${style} display: flex; align-items: center; justify-content: center; background: #eee; font-size: 8px;">Logo</div>`;

          case "Image":
            if (comp.content) {
              return `<img src="${comp.content}" style="${style} object-fit: contain;" alt="Image Component" />`;
            }
            return "";

          case "QRCode":
            // Simulated QR code
            return `
              <div style="${style} border: 1px solid #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa; font-size: 8px; padding: 2px;">
                <div style="font-weight: bold;">[QR]</div>
                <div style="font-size: 6px; word-break: break-all; text-align: center;">${context.Invoice?.Number || context.Patient?.UHID || "MOCK_QR"}</div>
              </div>
            `;

          case "Barcode":
            // Simulated Barcode
            return `
              <div style="${style} border: 1px solid #ccc; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa; font-size: 8px; padding: 2px;">
                <div style="letter-spacing: 2px; font-family: monospace; font-weight: bold;">||||||||||||</div>
                <div style="font-size: 6px;">${context.Invoice?.Number || context.Patient?.UHID || "MOCK_BARCODE"}</div>
              </div>
            `;

          case "Signature":
            return `
              <div style="${style} display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
                <div style="border-top: 1px dotted #000; width: 80%; text-align: center; font-size: 10px; margin-top: auto; padding-top: 2px;">
                  ${comp.content || "Authorized Signatory"}
                </div>
              </div>
            `;

          case "PageNumber":
            return `<div style="${style}">Page 1 of 1</div>`;

          case "Date":
            return `<div style="${style}">${new Date().toLocaleDateString("en-IN")}</div>`;

          case "Time":
            return `<div style="${style}">${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>`;

          default:
            return "";
        }
      })
      .join("\n");

    // Standard absolute canvas html compiler wrapper
    const heightCm = paperSize === "A5" ? "21cm" : "29.7cm";
    const widthCm = paperSize === "A5" ? "14.8cm" : "21cm";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Document Printing</title>
        <style>
          @page {
            size: ${paperSize} portrait;
            margin: ${margins};
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #000000;
          }
          .page-canvas {
            position: relative;
            width: ${widthCm};
            height: ${heightCm};
            box-sizing: border-box;
            background: #ffffff;
            overflow: hidden;
          }
          ${watermarkText ? `
          .watermark {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 70px;
            color: rgba(200, 200, 200, 0.15);
            font-weight: bold;
            text-transform: uppercase;
            pointer-events: none;
            white-space: nowrap;
            z-index: 0;
          }
          ` : ""}
          @media print {
            .page-canvas {
              width: 100% !important;
              height: 100% !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-canvas">
          ${watermarkText ? `<div class="watermark">${watermarkText}</div>` : ""}
          ${componentHtml}
        </div>
      </body>
      </html>
    `.trim();
  }
}
