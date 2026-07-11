import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { ExportService } from "@/lib/services/export-service";
import { PrintData } from "@/print-engine/types";
import {
  OPDReportService,
  IPDReportService,
  BillingReportService,
  DiagnosticsReportService,
  OTReportService,
  VitalReportService,
  PharmacyReportService,
  CollectionReportService,
} from "@/modules/reports/services/report-services";

const MAX_EXPORT_LIMIT = 20000;

interface ReportDataRow {
  id?: string;
  opdId?: string;
  patientName?: string;
  patientUhid?: string;
  doctorName?: string;
  departmentName?: string;
  consultationFee?: number;
  registrationTime?: string | Date;
  doctorId?: string;
  patientCount?: number;
  consultationAmount?: number;
  departmentId?: string;
  ipdId?: string;
  ward?: string;
  bedNumber?: string;
  admissionDate?: string | Date;
  dischargeDate?: string | Date | null;
  invoiceNumber?: string;
  amount?: number;
  discount?: number;
  paid?: number;
  balance?: number;
  paymentStatus?: string;
  date?: string | Date;
  testName?: string;
  status?: string;
  completionDate?: string | Date | null;
  createdAt?: string | Date;
  scanName?: string;
  otId?: string;
  procedure?: string;
  type?: string;
  certificateNumber?: string;
  motherName?: string;
  motherUhid?: string;
  babyName?: string;
  gender?: string;
  deliveryType?: string;
  cause?: string;
  invoice?: string;
  customer?: string;
  paymentMode?: string;
  surgeonName?: string;
}

interface CollectionRow {
  id: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  paymentMode: string;
  date: string | Date;
}

interface ReportResultData {
  rows?: ReportDataRow[];
  summary: Record<string, number | string>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRows: number;
  };
  hospitalCollection?: CollectionRow[];
  pharmacyCollection?: CollectionRow[];
}

export const GET = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  // 1. Resolve params
  const { type } = await (context.params as Promise<{ type: string }>);

  // 2. Early Permission Enforcement
  const reqContext = RequestContextService.getRequired();
  const searchParams = req.nextUrl.searchParams;
  const isPrint = searchParams.get("print") === "true";
  const exportFormat = searchParams.get("export");
  const isExport = !!exportFormat;

  const permissionAction = isPrint ? "Print" : isExport ? "Export" : "View";
  await requirePermission(reqContext.employee.id, "Reports", permissionAction);

  // 3. Parse and Validate Date Ranges & Filters
  const startStr = searchParams.get("startDate");
  const endStr = searchParams.get("endDate");
  if (!startStr || !endStr) {
    throw new AppError("Start date and End date filters are required.", 400, "BAD_REQUEST");
  }

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new AppError("Invalid date format provided.", 400, "BAD_REQUEST");
  }

  if (startDate > endDate) {
    throw new AppError("Start date cannot be after end date.", 400, "BAD_REQUEST");
  }

  const doctorId = searchParams.get("doctorId") || undefined;
  const departmentId = searchParams.get("departmentId") || undefined;
  const status = searchParams.get("status") || undefined;

  // Validate doctor exists if provided
  if (doctorId) {
    const docExists = await prisma.doctor.findUnique({
      where: { id: doctorId, isDeleted: false },
    });
    if (!docExists) {
      throw new AppError("The specified doctor filter references a record that does not exist.", 404, "NOT_FOUND");
    }
  }

  // Validate department exists if provided
  if (departmentId) {
    const deptExists = await prisma.department.findUnique({
      where: { id: departmentId, isDeleted: false },
    });
    if (!deptExists) {
      throw new AppError("The specified department filter references a record that does not exist.", 404, "NOT_FOUND");
    }
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10));
  const bypassPagination = isExport || isPrint;

  // 4. Dispatch to Specialized Service
  let result: ReportResultData;
  const filterParams = { startDate, endDate, doctorId, departmentId, status, page, limit, bypassPagination };

  switch (type) {
    case "opd":
      result = await OPDReportService.getDailyOPD(filterParams);
      break;
    case "doctor-opd":
      result = await OPDReportService.getDoctorWiseOPD(filterParams);
      break;
    case "department-opd":
      result = await OPDReportService.getDepartmentWiseOPD(filterParams);
      break;
    case "ipd":
      result = await IPDReportService.getDailyIPD(filterParams);
      break;
    case "billing":
      result = await BillingReportService.getTodayBilling(filterParams);
      break;
    case "laboratory":
      result = await DiagnosticsReportService.getLaboratoryReport(filterParams);
      break;
    case "radiology":
      result = await DiagnosticsReportService.getRadiologyReport(filterParams);
      break;
    case "ot":
      result = await OTReportService.getOTReport(filterParams);
      break;
    case "birth":
      result = await VitalReportService.getBirthReport(filterParams);
      break;
    case "death":
      result = await VitalReportService.getDeathReport(filterParams);
      break;
    case "pharmacy":
      result = await PharmacyReportService.getPharmacySales(filterParams);
      break;
    case "collection":
      result = await CollectionReportService.getCollectionReport({ startDate, endDate });
      break;
    default:
      throw new AppError(`Report type '${type}' is unsupported by the platform.`, 400, "BAD_REQUEST");
  }

  // 5. Large Dataset Protection Limits Check
  let recordsCount = 0;
  if (type === "collection") {
    recordsCount = (result.hospitalCollection?.length || 0) + (result.pharmacyCollection?.length || 0);
  } else {
    recordsCount = result.rows?.length || 0;
  }

  if (bypassPagination && recordsCount > MAX_EXPORT_LIMIT) {
    throw new AppError(
      `Dataset size (${recordsCount} records) exceeds the maximum allowed limit for single actions (${MAX_EXPORT_LIMIT}). Please narrow your date ranges or apply additional filters.`,
      400,
      "LIMIT_EXCEEDED"
    );
  }

  // 6. Handle Prints Request
  if (isPrint) {
    const hospital = await prisma.hospital.findUnique({
      where: { id: reqContext.employee.hospitalId },
    });

    const printData: PrintData = {
      title: `${type.toUpperCase().replace("-", " ")} Report`,
      timestamp: new Date().toLocaleString(),
      hospitalName: hospital?.name || "Shree Ganesha Hospital",
      content: {
        filters: { startDate: startStr, endDate: endStr, doctorId, departmentId, status },
        reportType: type,
        rows: type === "collection" ? undefined : result.rows,
        summary: result.summary,
        // Separate tables for collection to maintain financial isolation
        hospitalCollection: type === "collection" ? result.hospitalCollection : undefined,
        pharmacyCollection: type === "collection" ? result.pharmacyCollection : undefined,
      },
      footer: hospital?.footerText || "End of Report Summary.",
    };

    // Log Print Audit Action
    await logAdminAction({
      action: "REPORT_PRINTED",
      resource: "Reports",
      newState: { type, startDate: startStr, endDate: endStr, doctorId, departmentId, status },
      description: `Printed report: ${type} from range ${startStr} to ${endStr}`,
    });

    return printData;
  }

  // 7. Handle Exports Request
  if (isExport) {
    let csvText = "";

    if (type === "collection") {
      // Custom Collection layout with strict financial separation
      const hHeaders = ["Invoice Number", "Patient Name", "Amount Paid", "Payment Mode", "Received Date"];
      const hRows = ExportService.generateCSV(
        hHeaders,
        result.hospitalCollection || [],
        (r: CollectionRow) => [r.invoiceNumber, r.patientName, String(r.amount), r.paymentMode, new Date(r.date).toLocaleString()]
      );

      const pHeaders = ["Invoice Number", "Customer Name", "Amount Paid", "Payment Mode", "Received Date"];
      const pRows = ExportService.generateCSV(
        pHeaders,
        result.pharmacyCollection || [],
        (r: CollectionRow) => [r.invoiceNumber, r.patientName, String(r.amount), r.paymentMode, new Date(r.date).toLocaleString()]
      );

      csvText = `HOSPITAL REVENUE COLLECTION\n${hRows}\n\nPHARMACY INVENTORY COLLECTION\n${pRows}\n\nSUMMARY\nHospital Total,Pharmacy Total,Grand Total\n${result.summary.hospitalTotal},${result.summary.pharmacyTotal},${result.summary.grandTotal}`;
    } else {
      let headers: string[] = [];
      let mapper: (r: ReportDataRow) => string[] = () => [];

      if (type === "opd") {
        headers = ["OPD ID", "Patient Name", "UHID", "Doctor", "Department", "Fee", "Registration Time"];
        mapper = (r: ReportDataRow) => [r.opdId || "", r.patientName || "", r.patientUhid || "", r.doctorName || "", r.departmentName || "", String(r.consultationFee || 0), r.registrationTime ? new Date(r.registrationTime).toLocaleString() : ""];
      } else if (type === "doctor-opd") {
        headers = ["Doctor Name", "Patient Count", "Consultation Amount"];
        mapper = (r: ReportDataRow) => [r.doctorName || "", String(r.patientCount || 0), String(r.consultationAmount || 0)];
      } else if (type === "department-opd") {
        headers = ["Department Name", "Patient Count", "Consultation Amount"];
        mapper = (r: ReportDataRow) => [r.departmentName || "", String(r.patientCount || 0), String(r.consultationAmount || 0)];
      } else if (type === "ipd") {
        headers = ["IPD ID", "Patient Name", "UHID", "Doctor", "Department", "Ward", "Bed", "Admission Date", "Discharge Date"];
        mapper = (r: ReportDataRow) => [r.ipdId || "", r.patientName || "", r.patientUhid || "", r.doctorName || "", r.departmentName || "", r.ward || "", r.bedNumber || "", r.admissionDate ? new Date(r.admissionDate).toLocaleString() : "", r.dischargeDate ? new Date(r.dischargeDate).toLocaleString() : "Active"];
      } else if (type === "billing") {
        headers = ["Invoice Number", "Patient Name", "UHID", "Total Amount", "Discount", "Paid Amount", "Balance", "Payment Status", "Date"];
        mapper = (r: ReportDataRow) => [r.invoiceNumber || "", r.patientName || "", r.patientUhid || "", String(r.amount || 0), String(r.discount || 0), String(r.paid || 0), String(r.balance || 0), r.paymentStatus || "", r.date ? new Date(r.date).toLocaleString() : ""];
      } else if (type === "laboratory") {
        headers = ["Test Name", "Patient Name", "UHID", "Doctor", "Status", "Completion Date", "Order Date"];
        mapper = (r: ReportDataRow) => [r.testName || "", r.patientName || "", r.patientUhid || "", r.doctorName || "", r.status || "", r.completionDate ? new Date(r.completionDate).toLocaleString() : "N/A", r.createdAt ? new Date(r.createdAt).toLocaleString() : ""];
      } else if (type === "radiology") {
        headers = ["Scan Name", "Patient Name", "UHID", "Doctor", "Status", "Completion Date", "Order Date"];
        mapper = (r: ReportDataRow) => [r.scanName || "", r.patientName || "", r.patientUhid || "", r.doctorName || "", r.status || "", r.completionDate ? new Date(r.completionDate).toLocaleString() : "N/A", r.createdAt ? new Date(r.createdAt).toLocaleString() : ""];
      } else if (type === "ot") {
        headers = ["OT ID", "Patient Name", "UHID", "Surgeon Name", "Procedure", "Type", "Scheduled Date"];
        mapper = (r: ReportDataRow) => [r.otId || "", r.patientName || "", r.patientUhid || "", r.surgeonName || "", r.procedure || "", r.type || "", r.date ? new Date(r.date).toLocaleString() : ""];
      } else if (type === "birth") {
        headers = ["Certificate Number", "Mother Name", "Mother UHID", "Baby Name", "Gender", "Delivery Type", "Birth Date"];
        mapper = (r: ReportDataRow) => [r.certificateNumber || "", r.motherName || "", r.motherUhid || "", r.babyName || "", r.gender || "", r.deliveryType || "", r.date ? new Date(r.date).toLocaleString() : ""];
      } else if (type === "death") {
        headers = ["Certificate Number", "Patient Name", "Patient UHID", "Certified Doctor", "Cause Of Death", "Death Date"];
        mapper = (r: ReportDataRow) => [r.certificateNumber || "", r.patientName || "", r.patientUhid || "", r.doctorName || "", r.cause || "", r.date ? new Date(r.date).toLocaleString() : ""];
      } else if (type === "pharmacy") {
        headers = ["Pharmacy Invoice", "Customer Name", "Amount Paid", "Payment Mode", "Sale Date"];
        mapper = (r: ReportDataRow) => [r.invoice || "", r.customer || "", String(r.amount || 0), r.paymentMode || "", r.date ? new Date(r.date).toLocaleString() : ""];
      }

      csvText = ExportService.generateCSV(headers, result.rows || [], mapper);
    }

    // Log Export Audit Action
    await logAdminAction({
      action: "REPORT_EXPORTED",
      resource: "Reports",
      newState: { type, startDate: startStr, endDate: endStr, doctorId, departmentId, status },
      description: `Exported report: ${type} (format: CSV/Excel) from range ${startStr} to ${endStr}`,
    });

    return new NextResponse(csvText, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}_report_${startStr}_to_${endStr}.csv"`,
      },
    });
  }

  // 8. Return Standard JSON Data (Viewing - No Audits Logged for View as requested)
  return result;
});
