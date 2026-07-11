"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Save,
  Rocket,
  Trash2,
  Move,
  Type,
  Table as TableIcon,
  Minus,
  Square,
  Image as ImageIcon,
  QrCode,
  Barcode as BarcodeIcon,
  Edit3,
  Calendar,
  Clock,
  HelpCircle,
  Loader2,
  Copy,
  FolderOpen,
  Eye,
  Settings,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Layers,
} from "lucide-react";

// Categorized document tree (35 templates)
const DOCUMENT_CATEGORIES = [
  { id: "Patient Registration", label: "Patient Registration" },
  { id: "Clinical", label: "Clinical" },
  { id: "IPD", label: "IPD" },
  { id: "Billing", label: "Billing" },
  { id: "Certificates", label: "Certificates" },
  { id: "OT", label: "OT" },
  { id: "Pharmacy", label: "Pharmacy" },
];

const DOCUMENT_TYPES = [
  // Patient Registration
  { id: "OPD_REGISTRATION_SLIP", label: "OPD Slip", category: "Patient Registration" },
  { id: "APPOINTMENT_SLIP", label: "Appointment Slip", category: "Patient Registration" },
  { id: "VACCINATION_CARD", label: "Vaccination Card", category: "Patient Registration" },
  { id: "FOLLOW_UP_CARD", label: "Follow-up Card", category: "Patient Registration" },
  // Clinical
  { id: "OPD_PRESCRIPTION", label: "OPD Prescription", category: "Clinical" },
  { id: "REFERRAL_LETTER", label: "Referral Letter", category: "Clinical" },
  { id: "LABORATORY_SAMPLE_SLIP", label: "Laboratory Sample Slip", category: "Clinical" },
  { id: "LABORATORY_REPORT", label: "Laboratory Report", category: "Clinical" },
  { id: "RADIOLOGY_REQUEST_SLIP", label: "Radiology Request Slip", category: "Clinical" },
  { id: "RADIOLOGY_REPORT", label: "Radiology Report", category: "Clinical" },
  { id: "BLOOD_BANK_REQUEST", label: "Blood Bank Request", category: "Clinical" },
  { id: "BLOOD_ISSUE_SLIP", label: "Blood Issue Slip", category: "Clinical" },
  // IPD
  { id: "IPD_ADMISSION_FORM", label: "IPD Admission Form", category: "IPD" },
  { id: "IPD_BED_SLIP", label: "IPD Bed Slip", category: "IPD" },
  { id: "DISCHARGE_SUMMARY", label: "Discharge Summary", category: "IPD" },
  { id: "CONSENT_FORM", label: "Consent Form", category: "IPD" },
  { id: "EMERGENCY_SLIP", label: "Emergency Slip", category: "IPD" },
  { id: "NURSING_NOTES", label: "Nursing Notes", category: "IPD" },
  { id: "ICU_CHART", label: "ICU Chart", category: "IPD" },
  { id: "DIET_SHEET", label: "Diet Sheet", category: "IPD" },
  // Billing
  { id: "HOSPITAL_INVOICE", label: "Hospital Invoice", category: "Billing" },
  { id: "PAYMENT_RECEIPT", label: "Payment Receipt", category: "Billing" },
  { id: "NO_DUE_CERTIFICATE", label: "No Due Certificate", category: "Billing" },
  { id: "INSURANCE_CLAIM_FORM", label: "Insurance Claim Form", category: "Billing" },
  // Certificates
  { id: "BIRTH_CERTIFICATE", label: "Birth Certificate", category: "Certificates" },
  { id: "DEATH_CERTIFICATE", label: "Death Certificate", category: "Certificates" },
  { id: "MEDICAL_CERTIFICATE", label: "Medical Certificate", category: "Certificates" },
  { id: "SICK_LEAVE_CERTIFICATE", label: "Sick Leave Certificate", category: "Certificates" },
  { id: "FITNESS_CERTIFICATE", label: "Fitness Certificate", category: "Certificates" },
  // OT
  { id: "OT_BOOKING_SLIP", label: "OT Booking Slip", category: "OT" },
  { id: "OT_SUMMARY", label: "OT Summary", category: "OT" },
  { id: "OT_CONSENT", label: "OT Consent", category: "OT" },
  // Pharmacy
  { id: "PHARMACY_INVOICE", label: "Pharmacy Invoice", category: "Pharmacy" },
  { id: "PHARMACY_RETURN_SLIP", label: "Pharmacy Return Slip", category: "Pharmacy" },
  { id: "PHARMACY_PRESCRIPTION_COPY", label: "Pharmacy Prescription Copy", category: "Pharmacy" },
];

const VARIABLE_REGISTRY = {
  Patient: ["Patient.Name", "Patient.UHID", "Patient.Age", "Patient.Gender", "Patient.Phone", "Patient.BloodGroup", "Patient.Allergies"],
  Hospital: ["Hospital.Name", "Hospital.Phone", "Hospital.Email", "Hospital.Address", "Hospital.FooterText"],
  Doctor: ["Doctor.Name", "Doctor.RoomNumber"],
  Billing: ["Invoice.Number", "Invoice.Gross", "Invoice.Discount", "Invoice.Tax", "Invoice.Net", "Receipt.Number", "Receipt.Amount", "Receipt.PaymentMode", "Receipt.UTR"],
  Admission: ["IPD.ID", "IPD.AdmissionDate", "IPD.Ward", "IPD.Room", "IPD.Bed"],
  Certificates: ["Birth.CertificateNumber", "Birth.BabyName", "Birth.Dob", "Birth.BirthWeight", "Death.CertificateNumber", "Death.Date", "Death.Cause"],
};

interface TemplateRow {
  id: string;
  templateKey: string;
  name: string;
  category: string;
  pageFormat: string;
  orientation: string;
  margins: string;
  copies: number;
  language: string;
  documentType: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  isSystemDefault: boolean;
  createdAt: string;
  layoutJson: {
    width?: number;
    height?: number;
    components?: DesignerComponent[];
    isRawHtml?: boolean;
    htmlContent?: string;
  };
}

interface DesignerComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content?: string;
  fieldName?: string;
  fontSize?: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
  borderWidth?: number;
  borderColor?: string;
  color?: string;
  visible?: boolean;
  columns?: { header: string; field: string; w: number }[];
}

export default function PrintTemplatesDashboard() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Patient Registration");
  const [selectedDocType, setSelectedDocType] = useState("OPD_REGISTRATION_SLIP");

  // Designer State
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null);
  const [canvasComponents, setCanvasComponents] = useState<DesignerComponent[]>([]);
  const [rawHtmlCode, setRawHtmlCode] = useState("");
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [activeVariablesSection, setActiveVariablesSection] = useState<string | null>("Patient");

  // Print settings inside editor
  const [pageFormat, setPageFormat] = useState("A4");
  const [orientation, setOrientation] = useState("PORTRAIT");
  const [margins, setMargins] = useState("15mm");
  const [copies, setCopies] = useState(1);
  const [language, setLanguage] = useState("en");

  // Clipboard layout JSON modal
  const [clipboardModal, setClipboardModal] = useState(false);
  const [clipboardText, setClipboardText] = useState("");

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await apiClient<TemplateRow[]>("/api/admin/print-templates");
      setTemplates(data || []);
    } catch {
      toast.error("Failed to sync clinical print templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter templates list
  const docTypesForActiveCategory = useMemo(() => {
    return DOCUMENT_TYPES.filter((d) => d.category === selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (docTypesForActiveCategory.length > 0) {
      // Pick first element of category on tab switch
      if (!docTypesForActiveCategory.some((d) => d.id === selectedDocType)) {
        setSelectedDocType(docTypesForActiveCategory[0].id);
      }
    }
  }, [docTypesForActiveCategory, selectedDocType]);

  const activeTemplates = useMemo(() => {
    return templates.filter((t) => t.documentType === selectedDocType);
  }, [templates, selectedDocType]);

  const systemDefaultTemplate = activeTemplates.find((t) => t.isSystemDefault);
  const activeCustomPublished = activeTemplates.find((t) => t.status === "PUBLISHED" && !t.isSystemDefault);
  const draftVersions = activeTemplates.filter((t) => t.status === "DRAFT");
  const archivedVersions = activeTemplates.filter((t) => t.status === "ARCHIVED");

  // Initialize templates API call
  const handleInitializeDefaultTemplates = async () => {
    setLoading(true);
    try {
      await apiClient("/api/admin/print-templates/initialize", { method: "POST" });
      toast.success("All 35 standard hospital templates loaded successfully.");
      loadTemplates();
    } catch {
      toast.error("Template initialization setup failed.");
      setLoading(false);
    }
  };

  // Open template inside designer workspace
  const handleOpenDesigner = (tpl: TemplateRow) => {
    setEditingTemplate(tpl);
    setCanvasComponents(tpl.layoutJson.components || []);
    setRawHtmlCode(tpl.layoutJson.htmlContent || "");
    setSelectedComponentId(null);
    setPageFormat(tpl.pageFormat || "A4");
    setOrientation(tpl.orientation || "PORTRAIT");
    setMargins(tpl.margins || "15mm");
    setCopies(tpl.copies || 1);
    setLanguage(tpl.language || "en");
  };

  // Create customized draft template
  const handleCreateDraft = async () => {
    try {
      const templateKey = `tpl_${selectedDocType.toLowerCase()}_${Date.now()}`;
      // Load layout elements from defaults if available
      const parentLayout = systemDefaultTemplate
        ? systemDefaultTemplate.layoutJson
        : { width: 100, height: 100, components: [] };

      const newTpl = await apiClient<TemplateRow>("/api/admin/print-templates", {
        method: "POST",
        body: JSON.stringify({
          templateKey,
          name: `${selectedDocType.replace(/_/g, " ")} Custom Draft`,
          category: selectedCategory,
          pageFormat: "A4",
          orientation: "PORTRAIT",
          margins: "15mm",
          copies: 1,
          language: "en",
          documentType: selectedDocType,
          layoutJson: parentLayout,
        }),
      });

      toast.success("Draft layout initiated. Customise it inside the canvas.");
      loadTemplates();
      handleOpenDesigner(newTpl);
    } catch {
      toast.error("Failed to create draft layout copy.");
    }
  };

  // Duplicate a template configuration
  const handleDuplicate = async (tpl: TemplateRow) => {
    try {
      const templateKey = `tpl_${tpl.documentType.toLowerCase()}_${Date.now()}`;
      await apiClient("/api/admin/print-templates", {
        method: "POST",
        body: JSON.stringify({
          templateKey,
          name: `${tpl.name} (Copy)`,
          category: tpl.category,
          pageFormat: tpl.pageFormat,
          orientation: tpl.orientation,
          margins: tpl.margins,
          copies: tpl.copies,
          language: tpl.language,
          documentType: tpl.documentType,
          layoutJson: tpl.layoutJson,
        }),
      });
      toast.success("Template cloned successfully.");
      loadTemplates();
    } catch {
      toast.error("Duplication failed.");
    }
  };

  // Rename action
  const handleRename = async (tpl: TemplateRow) => {
    const newName = prompt("Enter a new name for this template:", tpl.name);
    if (!newName || newName === tpl.name) return;
    try {
      await apiClient(`/api/admin/print-templates/${tpl.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: newName,
          layoutJson: tpl.layoutJson,
        }),
      });
      toast.success("Template renamed.");
      loadTemplates();
    } catch {
      toast.error("Failed to rename template.");
    }
  };

  // Soft delete / archive action
  const handleDelete = async (tplId: string) => {
    if (!confirm("Are you sure you want to delete this template version?")) return;
    try {
      await apiClient(`/api/admin/print-templates/${tplId}`, { method: "DELETE" });
      toast.success("Template deleted.");
      loadTemplates();
    } catch {
      toast.error("Failed to delete template.");
    }
  };

  // Restore defaults
  const handleRestoreDefault = async () => {
    if (!confirm("Are you sure you want to overwrite this layout and restore default settings?")) return;
    if (systemDefaultTemplate) {
      if (systemDefaultTemplate.layoutJson.isRawHtml) {
        setRawHtmlCode(systemDefaultTemplate.layoutJson.htmlContent || "");
      } else {
        setCanvasComponents(systemDefaultTemplate.layoutJson.components || []);
      }
      toast.success("Restored layout elements to system default configs.");
    } else {
      toast.error("No default layout template registered.");
    }
  };

  // Save changes
  const handleSaveDraft = async () => {
    if (!editingTemplate) return;
    try {
      const isRawHtml = editingTemplate.layoutJson.isRawHtml === true;
      const res = await apiClient<{ message?: string; template?: TemplateRow }>(
        `/api/admin/print-templates/${editingTemplate.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: editingTemplate.name,
            pageFormat,
            orientation,
            margins,
            copies,
            language,
            layoutJson: isRawHtml
              ? { isRawHtml: true, htmlContent: rawHtmlCode }
              : {
                  width: 100,
                  height: 100,
                  components: canvasComponents,
                },
          }),
        }
      );
      toast.success("Draft layout parameters saved successfully.");
      if (res.template) {
        setEditingTemplate(res.template);
        if (isRawHtml) {
          setRawHtmlCode(res.template.layoutJson.htmlContent || "");
        } else {
          setCanvasComponents(res.template.layoutJson.components || []);
        }
      }
      loadTemplates();
    } catch {
      toast.error("Failed to save draft edits.");
    }
  };

  // Publish / Activate template
  const handlePublish = async (tplId: string) => {
    try {
      await apiClient(`/api/admin/print-templates/${tplId}/publish`, { method: "POST" });
      toast.success("Template activated and set as published default print copy.");
      loadTemplates();
      if (editingTemplate?.id === tplId) {
        setEditingTemplate(null);
      }
    } catch {
      toast.error("Failed to publish template draft.");
    }
  };

  // Drag-and-drop mechanics
  const PALETTE_COMPONENTS = [
    { type: "Text", label: "Static Text", icon: Type },
    { type: "DynamicField", label: "Dynamic Field", icon: Edit3 },
    { type: "Table", label: "Data Table", icon: TableIcon },
    { type: "Line", label: "Horizontal Line", icon: Minus },
    { type: "Rectangle", label: "Rectangle Box", icon: Square },
    { type: "Logo", label: "Hospital Logo", icon: ImageIcon },
    { type: "QRCode", label: "QR Code", icon: QrCode },
    { type: "Barcode", label: "Barcode", icon: BarcodeIcon },
    { type: "Signature", label: "Signature Block", icon: Move },
    { type: "PageNumber", label: "Page Number", icon: FileText },
    { type: "Date", label: "Date Field", icon: Calendar },
    { type: "Time", label: "Time Field", icon: Clock },
  ];

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("componentType", type);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("componentType");
    if (!type) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const newComp: DesignerComponent = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      type,
      x: Math.max(0, Math.min(xPct, 95)),
      y: Math.max(0, Math.min(yPct, 95)),
      w: type === "Table" ? 80 : 30,
      h: type === "Table" ? 25 : 5,
      content: type === "Text" ? "Sample text placeholder" : type === "Signature" ? "Attending Physician" : undefined,
      fieldName: type === "DynamicField" ? "Patient.Name" : undefined,
      fontSize: 11,
      align: "left",
      bold: false,
      color: "#000000",
      visible: true,
    };

    if (type === "Table") {
      newComp.columns = [
        { header: "Description", field: "name", w: 50 },
        { header: "Qty", field: "qty", w: 20 },
        { header: "Total Amount", field: "total", w: 30 },
      ];
    }

    setCanvasComponents([...canvasComponents, newComp]);
    setSelectedComponentId(newComp.id);
  };

  const updateSelectedComponent = (fields: Partial<DesignerComponent>) => {
    if (!selectedComponentId) return;
    setCanvasComponents(
      canvasComponents.map((c) => (c.id === selectedComponentId ? { ...c, ...fields } : c))
    );
  };

  const handleDeleteComponent = (id: string) => {
    setCanvasComponents(canvasComponents.filter((c) => c.id !== id));
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  const handleInsertVariable = (variable: string) => {
    if (!selectedComponentId) {
      // Add a new dynamic field with clicked variable
      const newComp: DesignerComponent = {
        id: `dynamicfield_${Date.now()}`,
        type: "DynamicField",
        x: 10,
        y: 40,
        w: 30,
        h: 5,
        fieldName: variable,
        fontSize: 11,
        align: "left",
        bold: false,
        color: "#000000",
        visible: true,
      };
      setCanvasComponents([...canvasComponents, newComp]);
      setSelectedComponentId(newComp.id);
      return;
    }

    const currentComp = canvasComponents.find((c) => c.id === selectedComponentId);
    if (!currentComp) return;

    if (currentComp.type === "DynamicField") {
      updateSelectedComponent({ fieldName: variable });
    } else if (currentComp.type === "Text") {
      const currentVal = currentComp.content || "";
      updateSelectedComponent({ content: currentVal + ` {{${variable}}}` });
    }
  };

  // Checklist for headers/footers
  const toggleHeaderPreset = (presetId: string, type: string, defaultFields: Partial<DesignerComponent>) => {
    const exists = canvasComponents.some((c) => c.id === presetId);
    if (exists) {
      setCanvasComponents(canvasComponents.filter((c) => c.id !== presetId));
      if (selectedComponentId === presetId) setSelectedComponentId(null);
    } else {
      const newComp: DesignerComponent = {
        id: presetId,
        type,
        x: defaultFields.x ?? 10,
        y: defaultFields.y ?? 10,
        w: defaultFields.w ?? 20,
        h: defaultFields.h ?? 5,
        visible: true,
        fontSize: 10,
        bold: false,
        align: "left",
        color: "#000000",
        ...defaultFields,
      } as DesignerComponent;
      setCanvasComponents([...canvasComponents, newComp]);
      setSelectedComponentId(presetId);
    }
  };

  // Client side Live Preview Compiler
  const previewHtml = useMemo(() => {
    const widthCm = pageFormat === "A5" ? "14.8cm" : "21cm";
    const heightCm = pageFormat === "A5" ? "21cm" : "29.7cm";

    const compiledItems = canvasComponents
      .filter((c) => c.visible !== false)
      .map((comp) => {
        const borderStyle = comp.borderWidth ? `border: ${comp.borderWidth}px solid ${comp.borderColor || "#000"};` : "";
        const alignStyle = `text-align: ${comp.align || "left"};`;
        const boldStyle = comp.bold ? "font-weight: bold;" : "font-weight: normal;";

        const style = `
          position: absolute;
          left: ${comp.x}%;
          top: ${comp.y}%;
          width: ${comp.w}%;
          height: ${comp.h}%;
          font-size: ${comp.fontSize || 11}px;
          color: ${comp.color || "#000000"};
          box-sizing: border-box;
          overflow: hidden;
          line-height: 1.25;
          ${borderStyle}
          ${alignStyle}
          ${boldStyle}
        `.replace(/\s+/g, " ");

        // Interpolations
        let contentHtml = "";
        if (comp.type === "Text") {
          contentHtml = (comp.content || "")
            .replace(/\{\{Hospital\.Name\}\}/g, "Shreeganesha Hospital")
            .replace(/\{\{Patient\.Name\}\}/g, "Mrs. Priya Sharma")
            .replace(/\{\{Patient\.Age\}\}/g, "32")
            .replace(/\{\{Patient\.Gender\}\}/g, "FEMALE")
            .replace(/\{\{Patient\.UHID\}\}/g, "UHID-2026-000412")
            .replace(/\{\{Doctor\.Name\}\}/g, "Dr. Anil Kumar");
        } else if (comp.type === "DynamicField") {
          const mapping: Record<string, string> = {
            "Patient.Name": "Mrs. Priya Sharma",
            "Patient.UHID": "UHID-2026-000412",
            "Patient.Age": "32",
            "Patient.Gender": "FEMALE",
            "Doctor.Name": "Dr. Anil Kumar",
            "Hospital.Name": "Shreeganesha Hospital",
            "Hospital.Phone": "+91 98765 43210",
            "Hospital.Email": "info@shreeganesha.com",
            "Hospital.Address": "12, Ganesha Enclave, Main Arterial Road, New Delhi",
            "OPD.ID": "OPD-2026-000854",
            "OPD.Token": "24",
            "IPD.ID": "IPD-2026-000192",
            "Invoice.Number": "INV-2026-10492",
            "Invoice.Net": "INR 3,450.00",
            "Receipt.Number": "RCT-2026-0041",
            "Receipt.Amount": "INR 3,450.00",
          };
          contentHtml = mapping[comp.fieldName || ""] || `[${comp.fieldName}]`;
        } else if (comp.type === "Table") {
          const headers = comp.columns
            ?.map((col) => `<th style="width: ${col.w}%; border-bottom: 1px solid #000; text-align: left; padding: 2px;">${col.header}</th>`)
            .join("");
          const rows = `
            <tr><td style="padding: 2px; border-bottom: 0.5px solid #eee;">Consultation Fee</td><td style="padding: 2px; border-bottom: 0.5px solid #eee;">1</td><td style="padding: 2px; border-bottom: 0.5px solid #eee;">500.00</td></tr>
            <tr><td style="padding: 2px; border-bottom: 0.5px solid #eee;">Blood CBC Test</td><td style="padding: 2px; border-bottom: 0.5px solid #eee;">1</td><td style="padding: 2px; border-bottom: 0.5px solid #eee;">450.00</td></tr>
            <tr><td style="padding: 2px; border-bottom: 0.5px solid #eee;">Room Rent - General Ward</td><td style="padding: 2px; border-bottom: 0.5px solid #eee;">1</td><td style="padding: 2px; border-bottom: 0.5px solid #eee;">2,500.00</td></tr>
          `;
          return `
            <div style="${style}">
              <table style="width: 100%; border-collapse: collapse; font-size: inherit;">
                <thead><tr>${headers}</tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        } else if (comp.type === "Line") {
          return `<div style="${style} border-top: 1px solid ${comp.color || "#000"}; height: 0;"></div>`;
        } else if (comp.type === "Rectangle") {
          return `<div style="${style} border: 1px solid ${comp.color || "#000"};"></div>`;
        } else if (comp.type === "Logo") {
          return `<div style="${style} display: flex; align-items: center; justify-content: center; background: #f1f5f9; border: 1px dashed #cbd5e1; font-weight: bold; color: #64748b;">[ Hospital Logo ]</div>`;
        } else if (comp.type === "QRCode") {
          return `<div style="${style} border: 1px solid #ccc; background: #fafafa; display: flex; align-items: center; justify-content: center; font-size: 8px;">[ QR CODE ]</div>`;
        } else if (comp.type === "Barcode") {
          return `<div style="${style} border: 1px solid #ccc; background: #fafafa; display: flex; align-items: center; justify-content: center; font-size: 8px; font-family: monospace; letter-spacing: 2px;">||||||| BARCODE |||||||</div>`;
        } else if (comp.type === "Signature") {
          return `
            <div style="${style} display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
              <div style="border-top: 1px dotted #000; width: 85%; text-align: center; font-size: 9px; padding-top: 2px; margin-top: auto;">
                ${comp.content || "Signature"}
              </div>
            </div>
          `;
        } else if (comp.type === "PageNumber") {
          return `<div style="${style}">Page 1 of 1</div>`;
        } else if (comp.type === "Date") {
          return `<div style="${style}">${new Date().toLocaleDateString()}</div>`;
        } else if (comp.type === "Time") {
          return `<div style="${style}">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>`;
        }

        return `<div style="${style}">${contentHtml}</div>`;
      })
      .join("\n");

    const watermarkHtml = canvasComponents.some((c) => c.id === "base_watermark" && c.visible !== false)
      ? `<div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 64px; font-weight: bold; color: rgba(226, 232, 240, 0.45); text-transform: uppercase; white-space: nowrap; pointer-events: none; z-index: 0;">CONFIDENTIAL</div>`
      : "";

    return `
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: #e2e8f0; display: flex; justify-content: center; align-items: center; height: 100%; font-family: system-ui, sans-serif; }
            .canvas-wrapper { position: relative; width: ${widthCm}; height: ${heightCm}; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); box-sizing: border-box; padding: ${margins}; overflow: hidden; }
            .canvas-content { position: relative; width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div class="canvas-wrapper">
            <div class="canvas-content">
              ${watermarkHtml}
              ${compiledItems}
            </div>
          </div>
        </body>
      </html>
    `;
  }, [canvasComponents, pageFormat, margins]);

  // Layout Import/Export helpers
  const handleImportLayout = () => {
    try {
      const parsed = JSON.parse(clipboardText);
      if (parsed.components && Array.isArray(parsed.components)) {
        setCanvasComponents(parsed.components);
        toast.success("Layout JSON imported into designer.");
        setClipboardModal(false);
      } else {
        toast.error("Invalid clipboard layout format. Root components array missing.");
      }
    } catch {
      toast.error("JSON parsing error. Verify clipboard format.");
    }
  };

  const handleExportLayout = () => {
    const json = JSON.stringify({ components: canvasComponents }, null, 2);
    navigator.clipboard.writeText(json);
    toast.success("Layout JSON configuration copied to clipboard.");
  };

  const selectedComp = canvasComponents.find((c) => c.id === selectedComponentId);

  if (loading && templates.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-zinc-400 text-sm font-mono space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span>Loading templates registry module...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full gap-5 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
            <FileText size={16} className="text-emerald-500" />
            <span>Document Print Templates & Editor</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Initialize defaults, manage draft revisions, and customize layouts</p>
        </div>

        {editingTemplate ? (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRestoreDefault}
              className="flex items-center space-x-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs py-2 px-4 rounded-xl cursor-pointer transition-colors"
            >
              <RotateCcw size={13} />
              <span>Restore Default</span>
            </button>
            <button
              onClick={() => {
                setClipboardText(JSON.stringify({ components: canvasComponents }, null, 2));
                setClipboardModal(true);
              }}
              className="flex items-center space-x-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs py-2 px-4 rounded-xl cursor-pointer transition-colors"
            >
              <Copy size={13} />
              <span>Clipboard JSON</span>
            </button>
            <button
              onClick={handleSaveDraft}
              className="flex items-center space-x-1.5 bg-emerald-650 hover:bg-emerald-605 text-white text-xs py-2 px-4 rounded-xl cursor-pointer transition-all shadow font-semibold"
            >
              <Save size={13} />
              <span>Save Draft Copy</span>
            </button>
            <button
              onClick={() => setEditingTemplate(null)}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-750 text-slate-350 hover:text-white text-xs py-2 px-4 rounded-xl cursor-pointer transition-colors"
            >
              Exit Editor
            </button>
          </div>
        ) : (
          <button
            onClick={handleInitializeDefaultTemplates}
            disabled={loading}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-medium text-xs py-2.5 px-5 rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            <span>Initialize Default Templates</span>
          </button>
        )}
      </div>

      {editingTemplate ? (
        editingTemplate.layoutJson.isRawHtml ? (
          /* =========================================================
             RAW HTML/CSS CODE EDITOR LAYOUT (2-COLUMN)
             ========================================================= */
          <div className="flex-1 flex gap-5 overflow-hidden min-h-0 pb-4">
            {/* Left Column: Code Editor */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow">
              <div className="bg-slate-900/60 p-3.5 border-b border-slate-850 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-200">HTML & CSS Code Editor</span>
                <span className="text-[10px] text-zinc-550 font-mono">Use placeholders (e.g. &#123;&#123;Patient.Name&#125;&#125;)</span>
              </div>
              <div className="flex-1 p-4 flex flex-col space-y-3">
                <textarea
                  value={rawHtmlCode}
                  onChange={(e) => setRawHtmlCode(e.target.value)}
                  className="flex-1 w-full bg-slate-900 border border-slate-800 text-slate-200 p-4 rounded-xl outline-none font-mono text-xs resize-none hover:border-slate-700 focus:border-emerald-500 transition-all"
                  placeholder="Paste your HTML & CSS template here..."
                />
              </div>
            </div>

            {/* Right Column: Live Iframe Preview */}
            <div className="w-[500px] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow shrink-0">
              <div className="bg-slate-900/60 p-3.5 border-b border-slate-850 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-200">Compiled Render Preview</span>
                <span className="text-[10px] text-emerald-450 font-mono font-bold">Simulated Client Output</span>
              </div>
              <div className="flex-1 bg-white p-4 relative overflow-hidden">
                <iframe
                  title="HTML Template Preview"
                  srcDoc={rawHtmlCode
                    .replace(/\{\{Hospital\.LogoUrl\}\}/g, "https://via.placeholder.com/150")
                    .replace(/\{\{Hospital\.Name\}\}/g, "Balaji Hospital")
                    .replace(/\{\{Hospital\.Address\}\}/g, "Circular Road, Balaji Complex, NCR")
                    .replace(/\{\{Hospital\.Phone\}\}/g, "0123456789")
                    .replace(/\{\{Hospital\.Email\}\}/g, "info@balajihospital.com")
                    .replace(/\{\{Patient\.UHID\}\}/g, "UHID-2026-00015")
                    .replace(/\{\{Patient\.Name\}\}/g, "Jane Doe")
                    .replace(/\{\{Patient\.Age\}\}/g, "28")
                    .replace(/\{\{Patient\.Gender\}\}/g, "FEMALE")
                    .replace(/\{\{Patient\.Phone\}\}/g, "+91 9876543210")
                    .replace(/\{\{Patient\.Address\}\}/g, "New Delhi, India")
                    .replace(/\{\{Doctor\.Name\}\}/g, "Dr. Ayush Mishra")
                    .replace(/\{\{OPD\.Department\}\}/g, "Medicine")
                    .replace(/\{\{OPD\.ID\}\}/g, "OPD-2026-001548")
                    .replace(/\{\{OPD\.Date\}\}/g, new Date().toLocaleDateString("en-IN"))
                    .replace(/\{\{Receipt\.Number\}\}/g, "REC-123456")
                    .replace(/\{\{Receipt\.Amount\}\}/g, "500.00")
                    .replace(/\{\{Receipt\.PaymentMode\}\}/g, "CASH")
                    .replace(/\{\{Receipt\.UTR\}\}/g, "TXN-987654321")
                  }
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================
             THREE-COLUMN EDITOR LAYOUT
             ========================================================= */
          <div className="flex-1 flex gap-5 overflow-hidden min-h-0 pb-4">
          
          {/* COLUMN 1: Fields Sidebar & Print Settings (Left) */}
          <div className="w-80 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col p-4 shrink-0 overflow-y-auto scrollbar-thin space-y-5 select-none text-xs">
            
            {/* Template Basic Info */}
            <div className="bg-slate-900/30 border border-slate-850/50 p-3 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-550">Active Design</span>
              <h4 className="font-bold text-slate-200">{editingTemplate.name}</h4>
              <p className="text-[9px] font-mono text-zinc-500">Key: {editingTemplate.templateKey} (v{editingTemplate.version})</p>
            </div>

            {/* Print Configuration Settings */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5">
                <Settings size={12} className="text-emerald-450" />
                <span>Print Document Settings</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-450 uppercase">Page Size</label>
                  <select
                    value={pageFormat}
                    onChange={(e) => setPageFormat(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="A4">A4 Standard</option>
                    <option value="A5">A5 Small</option>
                    <option value="Letter">Letter Format</option>
                    <option value="Thermal58">Thermal 58mm</option>
                    <option value="Thermal80">Thermal 80mm</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-450 uppercase">Orientation</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="PORTRAIT">Portrait</option>
                    <option value="LANDSCAPE">Landscape</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-450 uppercase">Margins</label>
                  <select
                    value={margins}
                    onChange={(e) => setMargins(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="10mm">10 mm</option>
                    <option value="15mm">15 mm</option>
                    <option value="20mm">20 mm</option>
                    <option value="0mm">No Margins</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-450 uppercase">Default Copies</label>
                  <input
                    type="number"
                    min={1}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-2 rounded-lg outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Header/Footer Controls */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5">
                <Layers size={12} className="text-emerald-450" />
                <span>Header & Footer Builder</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                <label className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded-lg hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canvasComponents.some((c) => c.id === "base_logo")}
                    onChange={() => toggleHeaderPreset("base_logo", "Logo", { x: 5, y: 2, w: 12, h: 8 })}
                    className="rounded border-slate-800 text-emerald-500 bg-slate-950"
                  />
                  <span>Hospital Logo</span>
                </label>
                <label className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded-lg hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canvasComponents.some((c) => c.id === "base_h_name")}
                    onChange={() => toggleHeaderPreset("base_h_name", "DynamicField", { fieldName: "Hospital.Name", x: 19, y: 2, w: 60, h: 4, fontSize: 15, bold: true })}
                    className="rounded border-slate-800 text-emerald-500 bg-slate-950"
                  />
                  <span>Hospital Title</span>
                </label>
                <label className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded-lg hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canvasComponents.some((c) => c.id === "base_barcode")}
                    onChange={() => toggleHeaderPreset("base_barcode", "Barcode", { x: 81, y: 2, w: 14, h: 7 })}
                    className="rounded border-slate-800 text-emerald-500 bg-slate-950"
                  />
                  <span>Barcode ID</span>
                </label>
                <label className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded-lg hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canvasComponents.some((c) => c.id === "base_qr")}
                    onChange={() => toggleHeaderPreset("base_qr", "QRCode", { x: 46, y: 82, w: 8, h: 8 })}
                    className="rounded border-slate-800 text-emerald-500 bg-slate-950"
                  />
                  <span>QR Verifier</span>
                </label>
                <label className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded-lg hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canvasComponents.some((c) => c.id === "base_watermark")}
                    onChange={() => toggleHeaderPreset("base_watermark", "Text", { content: "CONFIDENTIAL", x: 10, y: 50, w: 80, h: 8, visible: false })}
                    className="rounded border-slate-800 text-emerald-500 bg-slate-950"
                  />
                  <span>Watermark</span>
                </label>
                <label className="flex items-center space-x-2 bg-slate-900/40 p-2 rounded-lg hover:bg-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canvasComponents.some((c) => c.id === "base_page_num")}
                    onChange={() => toggleHeaderPreset("base_page_num", "PageNumber", { x: 80, y: 93.5, w: 15, h: 3, align: "right" })}
                    className="rounded border-slate-800 text-emerald-500 bg-slate-950"
                  />
                  <span>Page Number</span>
                </label>
              </div>
            </div>

            {/* Dynamic Variables Browser */}
            <div className="space-y-2.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1.5 flex items-center space-x-1.5">
                <FolderOpen size={12} className="text-emerald-450" />
                <span>Dynamic Variables Browser</span>
              </h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-850">
                {Object.entries(VARIABLE_REGISTRY).map(([categoryName, variables]) => {
                  const isOpen = activeVariablesSection === categoryName;
                  return (
                    <div key={categoryName} className="bg-slate-900/10">
                      <button
                        type="button"
                        onClick={() => setActiveVariablesSection(isOpen ? null : categoryName)}
                        className="w-full flex justify-between items-center p-2.5 hover:bg-slate-800/30 text-slate-350 hover:text-slate-100 font-bold transition-all text-[11px]"
                      >
                        <span>{categoryName} Variables</span>
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>

                      {isOpen && (
                        <div className="p-2 space-y-1 bg-slate-955 max-h-36 overflow-y-auto pr-1">
                          {variables.map((v) => (
                            <div
                              key={v}
                              onClick={() => handleInsertVariable(v)}
                              className="px-2 py-1 bg-slate-900 hover:bg-emerald-600/15 border border-slate-850 hover:border-emerald-500/25 rounded-md text-[10px] font-mono text-zinc-400 hover:text-emerald-400 cursor-pointer flex justify-between items-center group truncate"
                              title={`Click to insert {{${v}}}`}
                            >
                              <span className="truncate">{v}</span>
                              <span className="text-[8px] text-zinc-550 opacity-0 group-hover:opacity-100 ml-1">Insert</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Component Layout Tools */}
            <div className="space-y-3.5 pt-3 border-t border-slate-850">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-1 flex items-center space-x-1.5">
                <Plus size={12} className="text-emerald-450" />
                <span>Insert New Elements</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {PALETTE_COMPONENTS.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onClick={() => {
                      // Click to insert at default position
                      const newComp: DesignerComponent = {
                        id: `${item.type.toLowerCase()}_${Date.now()}`,
                        type: item.type,
                        x: 10,
                        y: 35,
                        w: item.type === "Table" ? 80 : 30,
                        h: item.type === "Table" ? 25 : 5,
                        content: item.type === "Text" ? "Text Block" : item.type === "Signature" ? "Attending Signature" : undefined,
                        fieldName: item.type === "DynamicField" ? "Patient.Name" : undefined,
                        fontSize: 11,
                        align: "left",
                        bold: false,
                        color: "#000000",
                        visible: true,
                      };
                      if (item.type === "Table") {
                        newComp.columns = [
                          { header: "Description", field: "name", w: 50 },
                          { header: "Qty", field: "qty", w: 20 },
                          { header: "Total Amount", field: "total", w: 30 },
                        ];
                      }
                      setCanvasComponents([...canvasComponents, newComp]);
                      setSelectedComponentId(newComp.id);
                    }}
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 p-2 rounded-lg flex items-center space-x-2 cursor-grab text-slate-350 hover:text-slate-100 transition-all truncate"
                  >
                    <item.icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 2: Visual Canvas Grid Editor (Middle) */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow">
            {/* Canvas Toolbar */}
            <div className="bg-slate-900/60 p-3.5 border-b border-slate-850 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-200">Interactive Design Canvas</span>
              <span className="text-[10px] text-slate-500 font-mono">Normalized Grid (100% x 100%)</span>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto p-6 flex justify-center items-center bg-slate-900/10">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative bg-white border-2 border-slate-300 rounded-xl shadow-xl overflow-hidden select-none shrink-0"
                style={{
                  width: pageFormat === "A5" ? "350px" : "495px",
                  height: pageFormat === "A5" ? "495px" : "700px",
                }}
              >
                {/* Visual grid lines helper */}
                <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-[0.03] pointer-events-none">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="border border-black" />
                  ))}
                </div>

                {canvasComponents.map((comp) => {
                  const isSelected = comp.id === selectedComponentId;
                  const isHeaderPreset = ["base_logo", "base_h_name", "base_barcode", "base_qr", "base_watermark", "base_page_num"].includes(comp.id);

                  let innerHtml = "";
                  if (comp.type === "Text") {
                    innerHtml = comp.content || "";
                  } else if (comp.type === "DynamicField") {
                    innerHtml = `[${comp.fieldName}]`;
                  } else if (comp.type === "Table") {
                    innerHtml = `[Data Table: ${comp.columns?.map((c) => c.header).join(", ")}]`;
                  } else if (comp.type === "Line") {
                    innerHtml = "--------------------------------------";
                  } else if (comp.type === "Logo") {
                    innerHtml = "[ Logo ]";
                  } else if (comp.type === "QRCode") {
                    innerHtml = "[ QR Code ]";
                  } else if (comp.type === "Barcode") {
                    innerHtml = "[ Barcode ]";
                  } else if (comp.type === "Signature") {
                    innerHtml = `[Signature: ${comp.content || ""}]`;
                  } else {
                    innerHtml = `[${comp.type}]`;
                  }

                  return (
                    <div
                      key={comp.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedComponentId(comp.id);
                      }}
                      className={`absolute overflow-hidden p-1 text-[9px] border flex items-center select-none cursor-pointer transition-all hover:bg-slate-50 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500 z-30"
                          : isHeaderPreset
                          ? "border-slate-300 bg-slate-100/50 text-slate-500 border-dashed z-10"
                          : "border-slate-200 bg-white text-slate-800 z-20"
                      }`}
                      style={{
                        left: `${comp.x}%`,
                        top: `${comp.y}%`,
                        width: `${comp.w}%`,
                        height: `${comp.h}%`,
                        fontSize: `${comp.fontSize ? comp.fontSize * 0.95 : 10}px`,
                        fontWeight: comp.bold ? "bold" : "normal",
                        color: comp.color || "#000000",
                        justifyContent: comp.align === "center" ? "center" : comp.align === "right" ? "flex-end" : "flex-start",
                      }}
                    >
                      <span className="truncate">{innerHtml}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Component properties panel */}
            <div className="bg-slate-900/60 p-4 border-t border-slate-850 shrink-0 max-h-56 overflow-y-auto text-xs">
              {selectedComp ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200">Element Settings: <span className="font-mono text-emerald-450">{selectedComp.id}</span></span>
                    <button
                      onClick={() => handleDeleteComponent(selectedComp.id)}
                      className="text-red-400 hover:text-red-300 flex items-center space-x-1.5 cursor-pointer font-semibold"
                    >
                      <Trash2 size={12} />
                      <span>Delete Element</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {/* Positioning inputs */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Left X (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedComp.x}
                        onChange={(e) => updateSelectedComponent({ x: Math.max(0, Math.min(100, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1.5 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Top Y (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedComp.y}
                        onChange={(e) => updateSelectedComponent({ y: Math.max(0, Math.min(100, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1.5 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Width W (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={selectedComp.w}
                        onChange={(e) => updateSelectedComponent({ w: Math.max(1, Math.min(100, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1.5 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Height H (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={selectedComp.h}
                        onChange={(e) => updateSelectedComponent({ h: Math.max(1, Math.min(100, Number(e.target.value))) })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1.5 rounded-lg outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Font Size (px)</label>
                      <input
                        type="number"
                        min={6}
                        value={selectedComp.fontSize || 11}
                        onChange={(e) => updateSelectedComponent({ fontSize: Math.max(6, Number(e.target.value)) })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1.5 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Alignment</label>
                      <select
                        value={selectedComp.align || "left"}
                        onChange={(e) => updateSelectedComponent({ align: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1.5 rounded-lg outline-none cursor-pointer"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Color Hex</label>
                      <input
                        type="text"
                        value={selectedComp.color || "#000000"}
                        onChange={(e) => updateSelectedComponent({ color: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1 rounded-lg outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1 flex items-end">
                      <label className="flex items-center space-x-2 p-2 hover:bg-slate-900 rounded-lg cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedComp.bold || false}
                          onChange={(e) => updateSelectedComponent({ bold: e.target.checked })}
                          className="rounded border-slate-850 text-emerald-500 bg-slate-950"
                        />
                        <span className="text-[10px] font-bold text-slate-300">Style Bold</span>
                      </label>
                    </div>
                  </div>

                  {/* Component specific values */}
                  {selectedComp.type === "Text" && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Static Text Content</label>
                      <textarea
                        rows={2}
                        value={selectedComp.content || ""}
                        onChange={(e) => updateSelectedComponent({ content: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-2.5 rounded-xl outline-none"
                        placeholder="Write layout text, supports {{Patient.Name}} variables"
                      />
                    </div>
                  )}

                  {selectedComp.type === "Signature" && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Signatory Title</label>
                      <input
                        type="text"
                        value={selectedComp.content || ""}
                        onChange={(e) => updateSelectedComponent({ content: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 p-2.5 rounded-xl outline-none"
                        placeholder="e.g. Consultant Pathologist"
                      />
                    </div>
                  )}

                  {selectedComp.type === "DynamicField" && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-semibold text-slate-450 uppercase">Selected Variable Field</label>
                      <input
                        type="text"
                        disabled
                        value={selectedComp.fieldName || ""}
                        className="w-full bg-slate-900 border border-slate-850 text-slate-400 p-2.5 rounded-xl outline-none cursor-not-allowed font-mono"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-6 italic">
                  Select any visual canvas component to configure its layout coordinates, content, styles, and alignments.
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: Real-Time Live Preview Compile Sheet (Right) */}
          <div className="w-96 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow shrink-0">
            <div className="bg-slate-900/60 p-3.5 border-b border-slate-850 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Eye size={13} className="text-emerald-450 animate-pulse" />
                <span>Real-Time Live Preview Sheet</span>
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[8px] font-mono font-bold px-2 py-0.5 rounded-full">
                Active Render
              </span>
            </div>

            {/* Render Output inside iFrame */}
            <div className="flex-1 bg-slate-900/20 p-4 overflow-auto flex justify-center items-start">
              <iframe
                title="Live Preview"
                srcDoc={previewHtml}
                className="w-full border-0 bg-slate-100 rounded-xl shadow-inner min-h-[580px] max-h-screen"
                style={{
                  transform: pageFormat === "A5" ? "scale(0.85)" : "scale(0.88)",
                  transformOrigin: "top center",
                }}
              />
            </div>
          </div>
        </div>
      )
    ) : (
        /* =========================================================
           STANDARD TEMPLATES SELECTION WORKSPACE
           ========================================================= */
        <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          
          {/* Document list categories sidebar */}
          <div className="w-80 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col shrink-0 overflow-hidden select-none shadow">
            
            {/* Category tabs */}
            <div className="bg-slate-900/60 p-3 border-b border-slate-850/80 grid grid-cols-2 gap-1 gap-y-2 text-[9px] font-bold">
              {DOCUMENT_CATEGORIES.map((c) => {
                const isCatActive = c.id === selectedCategory;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`py-1.5 px-2 rounded-lg border transition-all cursor-pointer truncate ${
                      isCatActive
                        ? "bg-emerald-600/10 border-emerald-500/25 text-emerald-400"
                        : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Document types inside category */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-900 pb-1.5">
                {selectedCategory} Slips
              </div>
              {docTypesForActiveCategory.map((doc) => {
                const isActive = doc.id === selectedDocType;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocType(doc.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group ${
                      isActive
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-405 font-semibold"
                        : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="text-xs">{doc.label}</div>
                  </button>
                );
              })}
              {docTypesForActiveCategory.length === 0 && (
                <p className="text-xs text-zinc-500 italic text-center py-4">No slips found in category.</p>
              )}
            </div>
          </div>

          {/* Right workspace details list */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col p-5 overflow-hidden shadow">
            
            {/* Title / Description */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                  <span>{DOCUMENT_TYPES.find((d) => d.id === selectedDocType)?.label}</span>
                  <span className="text-[9px] bg-slate-900 border border-slate-805 text-zinc-500 px-2 py-0.5 rounded font-mono lowercase font-normal">{selectedDocType}</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">Activate, duplicate, rename, or restore layout versions.</p>
              </div>

              {templates.length > 0 && (
                <button
                  onClick={handleCreateDraft}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5 cursor-pointer shadow transition-all active:scale-[0.98]"
                >
                  <Plus size={14} />
                  <span>Create Custom Draft</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs font-mono">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                <span>Loading template layout configurations...</span>
              </div>
            ) : templates.length === 0 ? (
              /* Seeding Banner when empty */
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-4">
                <Sparkles size={36} className="text-emerald-500 animate-bounce" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-100">Initialize Print Templates System</h3>
                  <p className="text-xs text-slate-400 max-w-sm">No templates have been configured yet. Load all 35 clinical and administrative default templates into the database.</p>
                </div>
                <button
                  onClick={handleInitializeDefaultTemplates}
                  className="bg-emerald-650 hover:bg-emerald-600 text-white text-xs px-5 py-2.5 rounded-xl font-semibold cursor-pointer shadow transition-all active:scale-[0.98]"
                >
                  Initialize 35 Templates
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin">
                
                {/* 1. Active Published Template */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider border-l-2 border-emerald-500 pl-2">
                    Active Print Copy (Published)
                  </div>

                  {activeCustomPublished ? (
                    <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl flex justify-between items-center shadow">
                      <div>
                        <div className="text-xs font-bold text-slate-100">{activeCustomPublished.name}</div>
                        <div className="flex items-center space-x-3 mt-1.5 text-[9px] text-slate-500 font-mono">
                          <span>Version: {activeCustomPublished.version}</span>
                          <span>Format: {activeCustomPublished.pageFormat}</span>
                          <span>Orientation: {activeCustomPublished.orientation}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDuplicate(activeCustomPublished)}
                          className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                          title="Duplicate copy"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleRename(activeCustomPublished)}
                          className="bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-350 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleOpenDesigner(activeCustomPublished)}
                          className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Customize Layout
                        </button>
                      </div>
                    </div>
                  ) : systemDefaultTemplate ? (
                    <div className="bg-slate-900/25 border border-slate-850/60 p-4 rounded-2xl flex justify-between items-center shadow-inner">
                      <div>
                        <div className="text-xs font-bold text-slate-350">{systemDefaultTemplate.name}</div>
                        <p className="text-[9px] text-zinc-550 mt-1 italic font-sans">Using System Default Template settings. Custom drafts will inherit this layout.</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDuplicate(systemDefaultTemplate)}
                          className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                          title="Duplicate copy"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenDesigner(systemDefaultTemplate)}
                          className="bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-405 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Customize Layout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-4 bg-slate-905 border border-dashed border-slate-850 rounded-2xl text-center">
                      No published template found for this document type. Please create a custom draft or restore defaults.
                    </div>
                  )}
                </div>

                {/* 2. Draft Revisions */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider border-l-2 border-amber-500 pl-2">
                    Draft Revisions (Edit/Publish)
                  </div>
                  {draftVersions.length > 0 ? (
                    <div className="space-y-2">
                      {draftVersions.map((draft) => (
                        <div key={draft.id} className="bg-slate-900/20 border border-slate-850 p-4 rounded-2xl flex justify-between items-center hover:bg-slate-900/30 transition-colors">
                          <div>
                            <div className="text-xs font-bold text-slate-100">{draft.name}</div>
                            <div className="flex items-center space-x-3 mt-1.5 text-[9px] text-slate-500 font-mono">
                              <span>Version: {draft.version}</span>
                              <span>Format: {draft.pageFormat}</span>
                              <span>Orientation: {draft.orientation}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRename(draft)}
                              className="bg-slate-950 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleDelete(draft.id)}
                              className="p-2 bg-slate-950 border border-slate-800 hover:border-red-900/40 text-slate-500 hover:text-red-400 rounded-lg cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenDesigner(draft)}
                              className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Edit Layout
                            </button>
                            <button
                              onClick={() => handlePublish(draft.id)}
                              className="bg-emerald-650 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1.5 transition-all shadow active:scale-[0.98]"
                            >
                              <Rocket size={12} />
                              <span>Activate</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-505 italic p-4 bg-slate-905 border border-dashed border-slate-850 rounded-2xl text-center">
                      No draft revisions configured. Customize a template to create a new editable draft.
                    </div>
                  )}
                </div>

                {/* 3. Archival Logs */}
                {archivedVersions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-450 uppercase tracking-wider border-l-2 border-slate-600 pl-2">
                      Archived Version History (Audit)
                    </div>
                    <div className="bg-slate-900/10 border border-slate-850 rounded-2xl divide-y divide-slate-850/60 overflow-hidden text-xs text-slate-400">
                      {archivedVersions.map((arch) => (
                        <div key={arch.id} className="p-3.5 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-slate-350">{arch.name}</span>
                            <span className="ml-2 font-mono text-[9px] bg-slate-900 px-1.5 py-0.5 border border-slate-800 rounded">v{arch.version}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-[9px] font-mono text-slate-550">
                            <span>Format: {arch.pageFormat}</span>
                            <span>Archived: {new Date(arch.createdAt).toLocaleDateString()}</span>
                            <button
                              onClick={() => handleDuplicate(arch)}
                              className="text-emerald-450 hover:underline font-bold cursor-pointer text-[10px]"
                            >
                              Restore as Draft
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLIPBOARD MODAL */}
      {clipboardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setClipboardModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2 mb-4">
              Clipboard Layout Import / Export
            </h3>

            <div className="space-y-4 text-xs">
              <p className="text-[10px] text-slate-450 leading-relaxed">
                Copy the text below to backup layout structures, or paste a previously exported JSON block and click Import to load it on the canvas.
              </p>
              <textarea
                rows={10}
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-205 p-3 rounded-xl outline-none font-mono text-[10px] leading-normal scrollbar-thin"
              />

              <div className="flex justify-between items-center pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={handleExportLayout}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-xl cursor-pointer transition-colors"
                >
                  Copy to Clipboard
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setClipboardModal(false)}
                    className="bg-slate-850 text-zinc-300 px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportLayout}
                    className="bg-emerald-650 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold cursor-pointer"
                  >
                    Import Layout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
