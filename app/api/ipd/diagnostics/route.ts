import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { z } from "zod";
import { BillingStatus } from "@prisma/client";
import { logAdminAction } from "@/modules/admin/services/audit-service";

const IPDDiagnosticsSchema = z.object({
  ipdAdmissionId: z.string().uuid("Invalid IPD Admission ID"),
  labTestCatalogIds: z.array(z.string().uuid()).default([]),
  radiologyScanCatalogIds: z.array(z.string().uuid()).default([]),
});

/**
 * POST /api/ipd/diagnostics
 * Books laboratory and radiology test orders for an active IPD patient.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View"); // General IPD view/edit permissions

  const body = await req.json();
  const { ipdAdmissionId, labTestCatalogIds, radiologyScanCatalogIds } = IPDDiagnosticsSchema.parse(body);

  if (labTestCatalogIds.length === 0 && radiologyScanCatalogIds.length === 0) {
    throw new AppError("Select at least one laboratory test or radiology investigation.", 400, "BAD_REQUEST");
  }

  // 1. Fetch active IPD admission
  const admission = await prisma.iPDAdmission.findUnique({
    where: { id: ipdAdmissionId, isDeleted: false },
    include: { patient: true },
  });

  if (!admission || admission.dischargeDate || admission.cancelledAt) {
    throw new AppError("Active inpatient admission record not found.", 404, "NOT_FOUND");
  }

  const patientId = admission.patientId;
  const doctorId = admission.primaryDoctorId;
  const hospitalId = admission.hospitalId;

  // 2. Database Transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check duplicates for Laboratory
    const existingLabs = await tx.labTestOrder.findMany({
      where: {
        ipdAdmissionId,
        testCatalogId: { in: labTestCatalogIds },
        isDeleted: false,
      },
      select: { testCatalogId: true },
    });
    const duplicateLabIds = existingLabs.map((l) => l.testCatalogId);
    const labsToCreate = labTestCatalogIds.filter((id) => !duplicateLabIds.includes(id));

    // Check duplicates for Radiology
    const existingRad = await tx.radiologyScanOrder.findMany({
      where: {
        ipdAdmissionId,
        scanCatalogId: { in: radiologyScanCatalogIds },
        isDeleted: false,
      },
      select: { scanCatalogId: true },
    });
    const duplicateRadIds = existingRad.map((r) => r.scanCatalogId);
    const radToCreate = radiologyScanCatalogIds.filter((id) => !duplicateRadIds.includes(id));

    if (labsToCreate.length === 0 && radToCreate.length === 0) {
      throw new AppError("All selected test orders have already been scheduled for this inpatient.", 400, "DUPLICATE_TEST_ORDER");
    }

    const createdLabs = [];
    for (const labCatId of labsToCreate) {
      const labCatalog = await tx.labTestCatalog.findUnique({
        where: { id: labCatId, isDeleted: false },
      });
      if (!labCatalog) throw new AppError(`Lab catalog ID ${labCatId} not found.`, 404, "NOT_FOUND");

      const order = await tx.labTestOrder.create({
        data: {
          patientId,
          testCatalogId: labCatId,
          orderedByDoctorId: doctorId,
          ipdAdmissionId,
          hospitalId,
          status: "SCHEDULED",
          createdBy: reqContext.employee.id,
        },
      });

      let chargeCat = await tx.chargeCatalog.findUnique({ where: { code: labCatalog.code } });
      if (!chargeCat) {
        chargeCat = await tx.chargeCatalog.create({
          data: {
            code: labCatalog.code,
            name: labCatalog.name,
            category: "LABORATORY",
            rate: labCatalog.standardRate,
          },
        });
      }

      const labCharge = await tx.billableCharge.create({
        data: {
          patientId,
          chargeCatalogId: chargeCat.id,
          sourceModule: "LABORATORY",
          sourceEntityId: order.id,
          quantity: 1,
          rate: labCatalog.standardRate,
          totalAmount: labCatalog.standardRate,
          billingStatus: "PENDING" as BillingStatus,
          createdBy: reqContext.employee.id,
        },
      });

      await tx.labTestOrder.update({
        where: { id: order.id },
        data: { billableChargeId: labCharge.id },
      });

      createdLabs.push(order);
    }

    const createdRad = [];
    for (const radCatId of radToCreate) {
      const radCatalog = await tx.radiologyScanCatalog.findUnique({
        where: { id: radCatId, isDeleted: false },
      });
      if (!radCatalog) throw new AppError(`Radiology scan catalog ID ${radCatId} not found.`, 404, "NOT_FOUND");

      const order = await tx.radiologyScanOrder.create({
        data: {
          patientId,
          scanCatalogId: radCatId,
          orderedByDoctorId: doctorId,
          ipdAdmissionId,
          status: "SCHEDULED",
          createdBy: reqContext.employee.id,
        },
      });

      let chargeCat = await tx.chargeCatalog.findUnique({ where: { code: radCatalog.code } });
      if (!chargeCat) {
        chargeCat = await tx.chargeCatalog.create({
          data: {
            code: radCatalog.code,
            name: radCatalog.name,
            category: "RADIOLOGY",
            rate: radCatalog.standardRate,
          },
        });
      }

      const radCharge = await tx.billableCharge.create({
        data: {
          patientId,
          chargeCatalogId: chargeCat.id,
          sourceModule: "RADIOLOGY",
          sourceEntityId: order.id,
          quantity: 1,
          rate: radCatalog.standardRate,
          totalAmount: radCatalog.standardRate,
          billingStatus: "PENDING" as BillingStatus,
          createdBy: reqContext.employee.id,
        },
      });

      await tx.radiologyScanOrder.update({
        where: { id: order.id },
        data: { billableChargeId: radCharge.id },
      });

      createdRad.push(order);
    }

    await logAdminAction({
      action: "IPD_DIAGNOSTICS_ASSIGNED",
      resource: "IPDAdmission",
      entityId: ipdAdmissionId,
      description: `Booked ${createdLabs.length} Lab tests and ${createdRad.length} Radiology scans for IPD Admission ID ${ipdAdmissionId}.`,
    });

    return {
      labsCount: createdLabs.length,
      radsCount: createdRad.length,
    };
  });

  return NextResponse.json(result);
});
