import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { logAdminAction } from "@/modules/admin/services/audit-service";
import { PrintData } from "@/print-engine/types";

/**
 * GET /api/ipd/admissions/[id]/print
 * Compiles and returns only structured PrintData for various Inpatient forms.
 * Rendering is offloaded entirely to the central Print Engine.
 */
export const GET = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "Print");

  const { id } = await (context.params as Promise<{ id: string }>);

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type") || "admission"; // "admission" | "transfer" | "birth" | "death" | "discharge"

  const admission = await prisma.iPDAdmission.findUnique({
    where: { id, isDeleted: false },
    include: {
      patient: true,
      bed: { include: { room: { include: { ward: true } } } },
      primaryDoctor: { include: { employee: true } },
      department: true,
      doctorAssignments: {
        include: { assignedDoctor: { include: { employee: true } } },
      },
      bedTransfers: {
        include: { newBed: { include: { room: true } } },
      },
      births: { where: { isDeleted: false } },
      deaths: { where: { isDeleted: false } },
      attendants: { where: { isDeleted: false } },
      labOrders: {
        where: { isDeleted: false, status: "COMPLETED" },
        include: { testCatalog: true }
      },
      radiologyOrders: {
        where: { isDeleted: false, status: "COMPLETED" },
        include: { scanCatalog: true }
      },
      otBookings: {
        where: { isDeleted: false, completedAt: { not: null } }
      },
    },
  });

  if (!admission) {
    throw new AppError("Inpatient admission record not found.", 404, "NOT_FOUND");
  }

  // Fetch hospital
  const hospital = await prisma.hospital.findUnique({
    where: { id: reqContext.employee.hospitalId },
  });
  const hospitalName = hospital?.name || "Shree Ganesha Hospital";
  const hospitalFooter = hospital?.footerText || "Inpatient Services Department.";

  // Calculate patient age
  let ageStr = "N/A";
  if (admission.patient.dob) {
    const birthDate = new Date(admission.patient.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    ageStr = `${age} Years`;
  }

  // Active attendant
  const activeAttendant = admission.attendants.find((a) => a.isActive);

  // Common content mapping for all IPD print slips
  const content: Record<string, unknown> = {
    "IPD ID": admission.ipdId,
    "Patient Name": admission.patient.name,
    "UHID": admission.patient.uhid,
    "Age": ageStr,
    "Gender": admission.patient.gender,
    "Contact Number": admission.patient.phone,
    "Department": admission.department.name,
    "Current Doctor": (() => {
      let doctorDisplayName = admission.primaryDoctor.employee.name;
      if (
        admission.primaryDoctorId === "88888888-8888-8888-8888-888888888888" &&
        admission.admissionReason?.startsWith("[Doctor: ")
      ) {
        const match = admission.admissionReason.match(/^\[Doctor:\s*([^\]]+)\]/);
        if (match && match[1]) {
          doctorDisplayName = `${match[1].trim()}`;
        }
      }
      return doctorDisplayName;
    })(),
    "Ward": admission.bed.room.ward?.name || admission.bed.room.roomType,
    "Room": admission.bed.room.roomNumber,
    "Bed": admission.bed.bedNumber,
    "Admission Type": admission.admissionCategory || "General",
    "Attendant Name": activeAttendant ? `${activeAttendant.name} (${activeAttendant.relationship})` : "None Registered",
    "Date of Admission": new Date(admission.admissionDate).toLocaleString(),
  };

  let title = "IPD Document";

  if (type === "admission") {
    title = "Inpatient Admission Slip";
    content["Room Type"] = admission.bed.room.roomType;
  } else if (type === "transfer") {
    title = "Bed Transfer Summary Slip";
    admission.bedTransfers.forEach((tr, idx) => {
      content[`Transfer #${idx + 1}`] = `Date: ${new Date(tr.transferDate).toLocaleDateString()} | Bed: Bed ${tr.newBed.bedNumber} | Reason: ${tr.transferReason || "None"}`;
    });
  } else if (type === "discharge") {
    title = "Inpatient Discharge Summary Sheet";
    content["Admission Date"] = new Date(admission.admissionDate).toLocaleDateString();
    content["Discharge Date"] = admission.dischargeDate ? new Date(admission.dischargeDate).toLocaleDateString() : "Active Inpatient";
    content["Clinical Summary Notes"] = admission.dischargeSummary || "N/A";
    content["Diagnosis"] = admission.finalDiagnosis || "N/A";
    content["Treatment"] = admission.treatmentSummary || "N/A";
    content["Condition"] = admission.conditionAtDischarge || "N/A";
    content["Advice"] = admission.followUpInstructions || "N/A";
    content["Chief Complaints"] = admission.admissionReason || "N/A";

    // Dynamic completed investigations list
    const completedLabs = (admission as any).labOrders?.map((o: any) => o.testCatalog?.name) || [];
    const completedRads = (admission as any).radiologyOrders?.map((o: any) => o.scanCatalog?.name) || [];
    const allInvestigations = [...completedLabs, ...completedRads].join(", ");
    content["Investigations"] = allInvestigations || "None";

    // Dynamic completed surgical operations list
    const completedProcedures = (admission as any).otBookings?.map((ot: any) => ot.operationName) || [];
    content["Procedure"] = completedProcedures.join(", ") || "None";

    // Query invoice associated with this admission stay
    const invoice = await prisma.invoice.findFirst({
      where: {
        isDeleted: false,
        charges: {
          some: {
            billableCharge: {
              sourceEntityId: id,
            }
          }
        }
      },
      include: {
        payments: { where: { isDeleted: false } },
        depositAllocations: { where: { isDeleted: false } },
      }
    });

    if (invoice) {
      const totalDeposits = invoice.depositAllocations.reduce((acc, curr) => acc + Number(curr.amountAllocated), 0);
      const totalPayments = invoice.payments.reduce((acc, curr) => acc + Number(curr.amountPaid), 0);
      const breakdownText = invoice.payments
        .map(p => `${p.paymentMode}: ₹${Number(p.amountPaid).toFixed(2)}`)
        .join(", ");

      content["Gross Total"] = `INR ${Number(invoice.totalAmount).toFixed(2)}`;
      content["Discount Deductions"] = `INR ${Number(invoice.discountAmount).toFixed(2)}`;
      content["Net Payable"] = `INR ${Number(invoice.payableAmount).toFixed(2)}`;
      content["Cashier Paid Amount"] = `INR ${(totalPayments + totalDeposits).toFixed(2)}`;
      content["Remaining Balance Due"] = `INR ${Number(invoice.balanceAmount).toFixed(2)}`;
      content["Payment Mode Breakdown"] = breakdownText || "Deposits Allocation Only";
    } else {
      content["Gross Total"] = "INR 0.00";
      content["Discount Deductions"] = "INR 0.00";
      content["Net Payable"] = "INR 0.00";
      content["Cashier Paid Amount"] = "INR 0.00";
      content["Remaining Balance Due"] = "INR 0.00";
      content["Payment Mode Breakdown"] = "Cash";
    }
  } else if (type === "bill") {
    // Query invoice associated with this admission stay
    const invoice = await prisma.invoice.findFirst({
      where: {
        isDeleted: false,
        charges: {
          some: {
            billableCharge: {
              sourceEntityId: id,
            }
          }
        }
      },
      include: {
        patient: true,
        payments: { where: { isDeleted: false } },
        depositAllocations: { where: { isDeleted: false } },
        charges: {
          where: { isDeleted: false },
          include: {
            billableCharge: {
              include: {
                chargeCatalog: true,
              },
            },
          },
        },
      }
    });

    if (!invoice) {
      // Fallback: Compile an interim statement based on current accumulated billable charges
      const activeCharges = await prisma.billableCharge.findMany({
        where: {
          sourceModule: "IPD",
          sourceEntityId: id,
          isDeleted: false,
        },
        include: {
          chargeCatalog: true,
        },
        orderBy: { createdAt: "asc" },
      });

      title = "Interim Bill Statement";
      const itemsMap: Record<string, string> = {};
      activeCharges.forEach((b, idx) => {
        const chargeDate = new Date(b.createdAt).toLocaleDateString();
        itemsMap[`Item ${idx + 1}`] = `${b.chargeCatalog.name} (${chargeDate}) (Qty: ${b.quantity} @ ₹${Number(b.rate).toFixed(0)}) = ₹${Number(b.totalAmount).toFixed(0)}`;
      });

      const grossTotal = activeCharges.reduce((acc, c) => acc + Number(c.totalAmount), 0);
      
      const deposits = await prisma.patientDeposit.findMany({
        where: {
          patientId: admission.patientId,
          isRefunded: false,
          isDeleted: false,
        },
      });
      const totalDeposits = deposits.reduce((acc, curr) => acc + Number(curr.amount), 0);

      content["Invoice Number"] = "INTERIM_BILL";
      content["Gross Total"] = `INR ${grossTotal.toFixed(2)}`;
      content["Discount Deductions"] = "None";
      content["Net Payable"] = `INR ${grossTotal.toFixed(2)}`;
      content["Credit Deposits Used"] = totalDeposits > 0 ? `INR ${totalDeposits.toFixed(2)}` : "None";
      content["Cashier Paid Amount"] = `INR ${totalDeposits.toFixed(2)}`;
      content["Remaining Balance Due"] = `INR ${Math.max(0, grossTotal - totalDeposits).toFixed(2)}`;
      content["Invoice Status"] = "PENDING";
      
      Object.assign(content, itemsMap);
    } else {
      title = "Invoice Summary Statement";
      const itemsMap: Record<string, string> = {};
      invoice.charges.forEach((c, idx) => {
        const b = c.billableCharge;
        const chargeDate = new Date(b.createdAt).toLocaleDateString();
        itemsMap[`Item ${idx + 1}`] = `${b.chargeCatalog.name} (${chargeDate}) (Qty: ${b.quantity} @ ₹${Number(b.rate).toFixed(0)}) = ₹${Number(b.totalAmount).toFixed(0)}`;
      });

      const totalDeposits = invoice.depositAllocations.reduce((acc, curr) => acc + Number(curr.amountAllocated), 0);
      const totalPayments = invoice.payments.reduce((acc, curr) => acc + Number(curr.amountPaid), 0);

      content["Invoice Number"] = invoice.invoiceNumber;
      content["Gross Total"] = `INR ${Number(invoice.totalAmount).toFixed(2)}`;
      content["Discount Deductions"] = Number(invoice.discountAmount) > 0 ? `INR ${Number(invoice.discountAmount).toFixed(2)}` : "None";
      content["Net Payable"] = `INR ${Number(invoice.payableAmount).toFixed(2)}`;
      content["Credit Deposits Used"] = totalDeposits > 0 ? `INR ${totalDeposits.toFixed(2)}` : "None";
      content["Cashier Paid Amount"] = `INR ${(totalPayments + totalDeposits).toFixed(2)}`;
      content["Remaining Balance Due"] = `INR ${Number(invoice.balanceAmount).toFixed(2)}`;
      content["Invoice Status"] = invoice.paymentStatus;
      
      Object.assign(content, itemsMap);
    }
  } else if (type === "birth") {
    title = "Vital Birth Certificate";
    const birth = admission.births[0];
    if (!birth) throw new AppError("No birth registration logged for this delivery admission.", 404, "NOT_FOUND");
    content["Certificate Number"] = birth.certificateNumber;
    content["Baby Name"] = birth.babyName || "Baby Of " + admission.patient.name;
    content["Weight (Kg)"] = Number(birth.weightKg).toFixed(2);
    content["Gender"] = birth.gender;
    content["Date & Time of Birth"] = new Date(birth.dob).toLocaleString();
    content["Delivery Type"] = birth.deliveryType;
  } else if (type === "death") {
    title = "Vital Death Certificate";
    const death = admission.deaths[0];
    if (!death) throw new AppError("No death registration logged for this admission.", 404, "NOT_FOUND");
    content["Certificate Number"] = death.certificateNumber;
    content["Deceased Name"] = death.deceasedName;
    content["Deceased Age"] = death.deceasedAge;
    content["Gender"] = death.deceasedGender;
    content["Date of Death"] = new Date(death.dateOfDeath).toLocaleString();
    content["Cause of Death"] = death.causeOfDeath;
    content["Location Type"] = death.locationType;
  } else {
    throw new AppError("Invalid printing document type parameter.", 400, "BAD_REQUEST");
  }

  content["Printed Date & Time"] = new Date().toLocaleString();
  content["Printed By Staff"] = `${reqContext.employee.designation} (${reqContext.employee.employeeCode})`;

  const printData: PrintData = {
    title,
    timestamp: new Date().toLocaleString(),
    hospitalName,
    content,
    footer: hospitalFooter,
  };

  // Log Audit
  await logAdminAction({
    action: "DOCUMENTS_PRINTED",
    resource: "IPDAdmission",
    entityId: id,
    description: `Printed IPD Document: ${title} for IPD ID ${admission.ipdId}`,
  });

  return printData;
});
