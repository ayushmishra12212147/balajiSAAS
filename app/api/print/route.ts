import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { prisma } from "@/lib/prisma";
import { PrintEngineService } from "@/modules/print/services/print-engine-service";
import { AppError } from "@/server/errors";
import { getDefaultLayoutFor } from "@/modules/print/templates/default-layouts";

export const dynamic = "force-dynamic";

/**
 * POST /api/print
 * Centralized print compilation route.
 * Compiles print templates on the server side using PrintEngine, resolving client-side 'fs' errors.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  const body = await req.json();
  const { templateId, printData, options } = body as {
    templateId: string;
    printData: any;
    options: any;
  };

  let normalizedTemplateId = templateId;
  if (normalizedTemplateId === "opd-slip" || normalizedTemplateId === "OPD_SLIP") {
    normalizedTemplateId = "OPD_REGISTRATION_SLIP";
  }

  // 1. Find a published custom template for the hospital
  let template = await prisma.printTemplate.findFirst({
    where: {
      hospitalId: context.employee.hospitalId,
      documentType: normalizedTemplateId,
      status: "PUBLISHED",
      isDeleted: false,
    },
  });

  // 2. If not found, find the system default template
  if (!template) {
    template = await prisma.printTemplate.findFirst({
      where: {
        isSystemDefault: true,
        hospitalId: context.employee.hospitalId,
        documentType: normalizedTemplateId,
        status: "PUBLISHED",
        isDeleted: false,
      },
    });
  }

  let layoutJson: any;
  let pageFormat = options.format || "A4";
  let margins = "15mm";

  if (template) {
    layoutJson = template.layoutJson;
    pageFormat = template.pageFormat || pageFormat;
    margins = template.margins || margins;
  } else {
    // Dynamically fallback to standard hardcoded layouts to ensure printing never fails
    try {
      layoutJson = getDefaultLayoutFor(normalizedTemplateId);
    } catch {
      throw new AppError(`No template layout exists for document key '${normalizedTemplateId}'.`, 404, "NOT_FOUND");
    }
  }

  // 4. Retrieve active hospital details from database for high-fidelity settings
  const hospital = await prisma.hospital.findUnique({
    where: { id: context.employee.hospitalId },
  });

  // Dynamic html table rows compiling
  const content = printData.content || {};
  
  // 1. Build testRows for Laboratory Report
  let testRows = "";
  Object.keys(content).forEach((key) => {
    if (key.startsWith("Result Parameter ")) {
      const line = String(content[key]);
      const colonIdx = line.indexOf(": ");
      if (colonIdx !== -1) {
        const paramName = line.substring(0, colonIdx);
        let remainder = line.substring(colonIdx + 2);
        let referenceRange = "--";
        const rangeIdx = remainder.indexOf(" (Range: ");
        if (rangeIdx !== -1) {
          referenceRange = remainder.substring(rangeIdx + 9);
          if (referenceRange.endsWith(")")) {
            referenceRange = referenceRange.substring(0, referenceRange.length - 1);
          }
          remainder = remainder.substring(0, rangeIdx);
        }
        
        let value = remainder;
        let unit = "--";
        const spaceIdx = remainder.indexOf(" ");
        if (spaceIdx !== -1) {
          value = remainder.substring(0, spaceIdx);
          unit = remainder.substring(spaceIdx + 1);
        }
        
        testRows += `<tr>
          <td>${paramName}</td>
          <td><strong>${value}</strong></td>
          <td>${unit}</td>
          <td>${referenceRange}</td>
        </tr>`;
      }
    }
  });

  // 2. Build invoiceItems for Invoice / Final Bill
  let invoiceItems = "";
  Object.keys(content).forEach((key) => {
    if (key.startsWith("Item ")) {
      const line = String(content[key]);
      const match = line.match(/^(.*?) \(Qty: (\d+) @ ₹([\d.]+)\) = ₹([\d.]+)$/);
      if (match) {
        const particular = match[1];
        const qty = match[2];
        const rate = match[3];
        const amount = match[4];
        invoiceItems += `<tr>
          <td>${particular}</td>
          <td>${qty}</td>
          <td>₹ ${rate}</td>
          <td>₹ ${amount}</td>
        </tr>`;
      } else {
        invoiceItems += `<tr>
          <td colspan="3">${line}</td>
          <td>--</td>
        </tr>`;
      }
    }
  });

  // 3. Build receiptItems for Settlement Receipt
  const invoiceNumber = content["Invoice Number"] || content["invoiceNumber"] || "";
  const totalPaid = content["Total Paid"] || content["paidAmount"] || "";
  const receiptItems = `<tr>
    <td>Invoice Settlement (Ref: ${invoiceNumber})</td>
    <td>₹ ${String(totalPaid).replace("INR ", "")}</td>
  </tr>`;

  // Construct RegistryContext resolving both Title Case and camelCase fields
  const registryContext = {
    Hospital: {
      Name: hospital?.name || printData.hospitalName || "Shreeganesha Hospital",
      Phone: hospital?.phone || printData.content?.["Hospital Phone"] || printData.content?.["hospitalPhone"] || "",
      Email: hospital?.email || printData.content?.["Hospital Email"] || printData.content?.["hospitalEmail"] || "",
      Address: hospital?.address || printData.content?.["Hospital Address"] || printData.content?.["hospitalAddress"] || "",
      LogoUrl: hospital?.logoUrl || "",
      FooterText: printData.footer || "",
    },
    Patient: {
      Name: printData.content?.["Patient Name"] || printData.content?.["patientName"] || printData.content?.["Deceased Name"] || printData.content?.["Baby Name"] || "",
      UHID: printData.content?.["UHID"] || printData.content?.["uhid"] || "",
      Gender: printData.content?.["Gender"] || printData.content?.["gender"] || "",
      Age: printData.content?.["Age"] || printData.content?.["age"] || printData.content?.["Deceased Age"] || "",
      Phone: printData.content?.["Contact Number"] || printData.content?.["mobile"] || printData.content?.["Mobile"] || printData.content?.["Patient Phone"] || "",
      Address: printData.content?.["Address"] || printData.content?.["address"] || printData.content?.["Patient Address"] || "",
    },
    Doctor: {
      Name: printData.content?.["Doctor"] || printData.content?.["doctor"] || printData.content?.["Doctor Name"] || printData.content?.["doctorName"] || printData.content?.["Current Doctor"] || printData.content?.["Attending Doctor"] || printData.content?.["Ordering Doctor"] || printData.content?.["Ref. Doctor"] || "",
      Specialization: printData.content?.["Specialization"] || printData.content?.["specialization"] || printData.content?.["Doctor Specialization"] || printData.content?.["doctorSpecialization"] || "",
      RegistrationNumber: printData.content?.["RegistrationNumber"] || printData.content?.["registrationNumber"] || printData.content?.["Doctor Reg No"] || printData.content?.["doctorRegNo"] || "",
      RoomNumber: printData.content?.["Room Number"] || "",
    },
    OPD: {
      ID: printData.content?.["OPD ID"] || printData.content?.["opdId"] || "",
      Token: printData.content?.["Token Number"] || printData.content?.["tokenNumber"] || "",
      Date: printData.content?.["Date"] || printData.content?.["date"] || "",
      Fee: printData.content?.["Consultation Fee"] || printData.content?.["fee"] || printData.content?.["paidAmount"] || "",
      Symptoms: printData.content?.["Symptoms / Remarks"] || printData.content?.["symptoms"] || "",
      Department: printData.content?.["Department"] || printData.content?.["department"] || printData.content?.["Dept"] || printData.content?.["Dept."] || "",
    },
    IPD: {
      ID: printData.content?.["IPD ID"] || printData.content?.["ipdId"] || "",
      AdmissionDate: printData.content?.["Date of Admission"] || printData.content?.["Admission Date"] || printData.content?.["admissionDate"] || "",
      DischargeDate: printData.content?.["Discharge Date"] || printData.content?.["dischargeDate"] || "",
      Ward: printData.content?.["Ward"] || printData.content?.["ward"] || "",
      Room: printData.content?.["Room"] || printData.content?.["room"] || "",
      Bed: printData.content?.["Bed"] || printData.content?.["bed"] || "",
      Insurance: printData.content?.["Insurance"] || printData.content?.["insurance"] || "",
      Diagnosis: printData.content?.["Diagnosis"] || printData.content?.["Clinical Summary Notes"] || printData.content?.["diagnosis"] || "N/A",
      ClinicalSummary: printData.content?.["Clinical Summary Notes"] || printData.content?.["dischargeSummary"] || "N/A",
      Treatment: printData.content?.["Treatment"] || printData.content?.["treatment"] || printData.content?.["treatmentSummary"] || "N/A",
      Condition: printData.content?.["Condition"] || printData.content?.["condition"] || printData.content?.["conditionAtDischarge"] || "N/A",
      Advice: printData.content?.["Advice"] || printData.content?.["advice"] || printData.content?.["followUpInstructions"] || "N/A",
      ChiefComplaints: printData.content?.["Chief Complaints"] || printData.content?.["symptoms"] || "N/A",
    },
    Invoice: {
      Number: printData.content?.["Invoice Number"] || printData.content?.["invoiceNumber"] || "",
      Gross: printData.content?.["Gross Total"] || printData.content?.["gross"] || "",
      Discount: printData.content?.["Discount Applied"] || printData.content?.["Discount Deductions"] || printData.content?.["discount"] || "",
      Tax: printData.content?.["Taxes"] || printData.content?.["tax"] || "",
      Net: printData.content?.["Net Amount Due"] || printData.content?.["Net Payable"] || printData.content?.["net"] || "",
    },
    Receipt: {
      Number: printData.content?.["Transaction Receipt No"] || printData.content?.["receiptNo"] || printData.content?.["Receipt Number"] || "",
      Amount: printData.content?.["Amount"] || printData.content?.["paidAmount"] || printData.content?.["Fee"] || "",
      PaymentMode: printData.content?.["Payment Mode"] || printData.content?.["paymentMode"] || "",
      UTR: printData.content?.["UTR / Transaction Ref"] || printData.content?.["transactionId"] || printData.content?.["Txn ID"] || "",
    },
    OT: {
      ID: printData.content?.["OT ID"] || "",
      ProcedureName: printData.content?.["Procedure Name"] || "",
      Type: printData.content?.["OT Type"] || "",
      ScheduledDate: printData.content?.["Scheduled Date"] || "",
      PrimarySurgeon: printData.content?.["Primary Surgeon"] || "",
      AssistantSurgeon: printData.content?.["Assistant Surgeon"] || "",
      Diagnosis: printData.content?.["Clinical Diagnosis"] || "",
      Remarks: printData.content?.["Remarks / Post-Op Notes"] || "",
      CompletionDate: printData.content?.["Completion Date"] || "",
      Status: printData.content?.["Status"] || "",
    },
    TableRows: printData.content?.["TableRows"] || [],

    // FLAT PLACEHOLDERS FALLBACK INJECTION:
    hospitalLogo: hospital?.logoUrl || "",
    hospitalName: hospital?.name || printData.hospitalName || "Shreeganesha Hospital",
    hospitalAddress: hospital?.address || "",
    hospitalPhone: hospital?.phone || "",
    hospitalEmail: hospital?.email || "",

    uhid: printData.content?.["UHID"] || printData.content?.["uhid"] || "",
    patientName: printData.content?.["Patient Name"] || printData.content?.["patientName"] || "",
    age: printData.content?.["Age"] || printData.content?.["age"] || "",
    gender: printData.content?.["Gender"] || printData.content?.["gender"] || "",
    mobile: printData.content?.["Contact Number"] || printData.content?.["mobile"] || printData.content?.["Mobile"] || printData.content?.["Patient Phone"] || "",
    address: printData.content?.["Address"] || printData.content?.["address"] || "",

    patientAge: printData.content?.["Age"] || printData.content?.["age"] || printData.content?.["Patient Age"] || printData.content?.["patientAge"] || "",
    patientGender: printData.content?.["Gender"] || printData.content?.["gender"] || printData.content?.["Patient Gender"] || printData.content?.["patientGender"] || "",
    patientMobile: printData.content?.["Contact Number"] || printData.content?.["mobile"] || printData.content?.["Mobile"] || printData.content?.["Patient Phone"] || printData.content?.["patientMobile"] || "",
    invoiceNo: printData.content?.["Invoice Number"] || printData.content?.["invoiceNumber"] || printData.content?.["invoiceNo"] || printData.content?.["Invoice No"] || "",

    doctorName: printData.content?.["Doctor"] || printData.content?.["doctor"] || printData.content?.["Doctor Name"] || printData.content?.["doctorName"] || printData.content?.["Current Doctor"] || printData.content?.["Attending Doctor"] || printData.content?.["Ordering Doctor"] || printData.content?.["Ref. Doctor"] || "",
    department: printData.content?.["Department"] || printData.content?.["department"] || printData.content?.["Dept"] || printData.content?.["Dept."] || "",

    ipdNumber: printData.content?.["IPD ID"] || printData.content?.["ipdId"] || "",
    admissionDate: printData.content?.["Date of Admission"] || printData.content?.["Admission Date"] || printData.content?.["admissionDate"] || "",
    dischargeDate: printData.content?.["Discharge Date"] || printData.content?.["dischargeDate"] || "",
    ward: printData.content?.["Ward"] || printData.content?.["ward"] || "",
    room: printData.content?.["Room"] || printData.content?.["room"] || "",
    bed: printData.content?.["Bed"] || printData.content?.["bed"] || "",
    admissionType: printData.content?.["Admission Type"] || printData.content?.["admissionType"] || "General",
    attendantName: printData.content?.["Attendant Name"] || printData.content?.["attendantName"] || "--",

    // Billing slip items:
    totalBill: String(printData.content?.["Gross Total"] || printData.content?.["payableAmount"] || printData.content?.["payable"] || "0.00").replace("INR ", "").replace("₹", ""),
    paidAmount: String(printData.content?.["Cashier Paid Amount"] || printData.content?.["paidAmount"] || printData.content?.["totalPaid"] || printData.content?.["Total Paid"] || "0.00").replace("INR ", "").replace("₹", ""),
    discount: String(printData.content?.["Discount Deductions"] || printData.content?.["Discount Applied"] || printData.content?.["discountAmount"] || printData.content?.["discount"] || "0.00").replace("INR ", "").replace("₹", ""),
    dueAmount: String(printData.content?.["Remaining Balance Due"] || printData.content?.["balanceAmount"] || printData.content?.["dueAmount"] || printData.content?.["Balance"] || "0.00").replace("INR ", "").replace("₹", ""),
    paymentMode: printData.content?.["Payment Mode Breakdown"] || printData.content?.["paymentMode"] || "Cash",

    // Discharge Summary items:
    chiefComplaints: printData.content?.["Symptoms / Remarks"] || printData.content?.["symptoms"] || printData.content?.["Chief Complaints"] || "N/A",
    diagnosis: printData.content?.["Diagnosis"] || printData.content?.["diagnosis"] || "N/A",
    clinicalSummary: printData.content?.["Clinical Summary Notes"] || printData.content?.["dischargeSummary"] || "N/A",
    treatment: printData.content?.["Treatment"] || printData.content?.["treatment"] || printData.content?.["treatmentSummary"] || "N/A",
    investigations: printData.content?.["Investigations"] || printData.content?.["investigations"] || "N/A",
    procedure: printData.content?.["Procedure"] || printData.content?.["procedure"] || "N/A",
    condition: printData.content?.["Condition"] || printData.content?.["condition"] || printData.content?.["conditionAtDischarge"] || "N/A",
    advice: printData.content?.["Advice"] || printData.content?.["advice"] || printData.content?.["followUpInstructions"] || "N/A",

    // Inject all raw print data keys as flat placeholders dynamically
    ...printData.content,

    // Lab & Radiology items:
    labNumber: printData.content?.["Lab Order Ref"] || printData.content?.["labNumber"] || "",
    labDepartment: printData.content?.["Category"] || "Pathology",
    reportDate: printData.content?.["Original Completion"] || printData.content?.["reportDate"] || new Date().toLocaleDateString(),
    remarks: printData.content?.["Clinical Remarks"] || printData.content?.["Remarks"] || "None",
    testRows,

    reportNumber: printData.content?.["Radiology Order Ref"] || printData.content?.["reportNumber"] || "",
    investigationName: printData.content?.["Scan Name"] || printData.content?.["investigationName"] || "",
    modality: printData.content?.["Category"] || printData.content?.["modality"] || "",
    clinicalHistory: printData.content?.["Clinical Findings"] || printData.content?.["clinicalHistory"] || "No significant history.",
    findings: printData.content?.["Clinical Findings"] || printData.content?.["findings"] || "",
    impression: printData.content?.["Remarks"] || printData.content?.["impression"] || "Stable scan results.",

    // Receipt and Invoicing flat tables:
    receiptNo: printData.content?.["Receipt Number"] || printData.content?.["receiptNo"] || "",
    receiptDate: printData.content?.["Printed Date & Time"] || printData.content?.["receiptDate"] || new Date().toLocaleDateString(),
    totalAmount: String(printData.content?.["Net Payable"] || printData.content?.["totalAmount"] || "0.00").replace("INR ", ""),
    transactionId: printData.content?.["UTR / Transaction Ref"] || printData.content?.["transactionId"] || "--",
    receiptItems,

    invoiceNumber: printData.content?.["Invoice Number"] || printData.content?.["invoiceNumber"] || "",
    invoiceDate: printData.content?.["Printed Date & Time"] || printData.content?.["invoiceDate"] || new Date().toLocaleDateString(),
    subTotal: String(printData.content?.["Gross Total"] || printData.content?.["subTotal"] || "0.00").replace("INR ", ""),
    gstAmount: String(printData.content?.["GST"] || printData.content?.["Taxes"] || "0.00").replace("INR ", ""),
    balanceAmount: String(printData.content?.["Remaining Balance Due"] || printData.content?.["balanceAmount"] || "0.00").replace("INR ", ""),
    grandTotal: String(printData.content?.["Net Payable"] || printData.content?.["payableAmount"] || "0.00").replace("INR ", ""),
    amountInWords: printData.content?.["Amount in Words"] || printData.content?.["amountInWords"] || "Only",
    invoiceItems,
  };

  const watermarkText = (layoutJson?.components || []).find((c: any) => c.id === "base_watermark")?.content || "";

  // 5. Compile template using PrintEngineService
  const compiledHtml = PrintEngineService.compileTemplate(layoutJson, registryContext, {
    paperSize: pageFormat,
    margins: margins,
    watermark: watermarkText,
  });

  return { renderedPayload: compiledHtml };
});
