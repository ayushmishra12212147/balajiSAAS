import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintData } from "@/print-engine/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/opd/[id]/print
 * Prepares and returns structured PrintData payload for OPD slips.
 */
export const GET = wrapAuthRoute(async (_req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OPD", "Print");

  const { id } = await (context.params as Promise<{ id: string }>);

  const encounter = await prisma.oPDConsultation.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: {
        include: {
          address: true,
        },
      },
      doctor: {
        include: {
          employee: true,
        },
      },
      department: true,
      labOrders: {
        include: {
          testCatalog: true,
        },
      },
      radiologyOrders: {
        include: {
          scanCatalog: true,
        },
      },
    },
  });

  if (!encounter) {
    throw new AppError("OPD consultation record not found.", 404, "NOT_FOUND");
  }

  // Load hospital information for header details
  const hospital = await prisma.hospital.findUnique({
    where: { id: reqContext.employee.hospitalId },
  });
  const hospitalName = hospital?.name || "Shree Ganesha Hospital";
  const hospitalFooter = hospital?.footerText || "Get well soon.";

  // Calculate patient age
  const birth = new Date(encounter.patient.dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  // Format patient address
  const addr = encounter.patient.address;
  const patientAddress = addr ? `${addr.addressLine}, ${addr.city}, ${addr.state} - ${addr.pincode}` : "Not Available";

  // Prepare structured print content
  const content: Record<string, unknown> = {
    "OPD ID": encounter.opdId,
    "Token Number": encounter.tokenNumber,
    "Patient Name": encounter.patient.name,
    "UHID": encounter.patient.uhid,
    "Age": String(age),
    "Gender": encounter.patient.gender,
    "Age / Gender": `${age} Years / ${encounter.patient.gender}`,
    "Contact Number": encounter.patient.phone || "Not Available",
    "Address": patientAddress,
    "Doctor": encounter.doctor.employee.name || "Attending Doctor",
    "Specialization": encounter.doctor.specialization || "General Medicine",
    "RegistrationNumber": encounter.doctor.registrationNumber || "PR-999999",
    "Department": encounter.department.name,
    "Consultation Fee": `INR ${encounter.appliedFee.toFixed(2)}`,
    "Symptoms / Remarks": encounter.symptoms || "None",
  };

  if (encounter.depositAmount.toNumber() > 0) {
    content["Consultation Deposit"] = `INR ${encounter.depositAmount.toFixed(2)}`;
  }

  if (encounter.labOrders.length > 0) {
    content["Assigned Labs"] = encounter.labOrders.map(o => o.testCatalog.name).join(", ");
  }

  if (encounter.radiologyOrders.length > 0) {
    content["Assigned Radiology"] = encounter.radiologyOrders.map(o => o.scanCatalog.name).join(", ");
  }

  const printData: PrintData = {
    title: "OPD Consultation Slip",
    timestamp: new Date().toLocaleString(),
    hospitalName,
    content,
    footer: hospitalFooter,
  };

  // Write audit log
  await logAdminAction({
    action: "OPD_PRINTED",
    resource: "OPDConsultation",
    entityId: id,
    description: `Generated print slip data payload for OPD ID ${encounter.opdId}.`,
  });

  return printData;
});
