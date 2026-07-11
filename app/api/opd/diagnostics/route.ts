import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { z } from "zod";
import { BillingStatus } from "@prisma/client";
import { logAdminAction } from "@/modules/admin/services/audit-service";

const DiagnosticsBookingSchema = z.object({
  opdConsultationId: z.string().uuid("Invalid OPD Consultation ID"),
  labTestCatalogIds: z.array(z.string().uuid()).default([]),
  radiologyScanCatalogIds: z.array(z.string().uuid()).default([]),
});

/**
 * POST /api/opd/diagnostics
 * Books laboratory and radiology test orders for an existing OPD patient encounter.
 * Enforces duplicate checks to prevent ordering the same test twice.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OPD", "Register");

  const body = await req.json();
  const { opdConsultationId, labTestCatalogIds, radiologyScanCatalogIds } = DiagnosticsBookingSchema.parse(body);

  if (labTestCatalogIds.length === 0 && radiologyScanCatalogIds.length === 0) {
    throw new AppError("Please select at least one laboratory or radiology test.", 400, "BAD_REQUEST");
  }

  // 1. Fetch the existing OPD consultation
  const opd = await prisma.oPDConsultation.findUnique({
    where: { id: opdConsultationId, isDeleted: false },
    include: { patient: true },
  });

  if (!opd) {
    throw new AppError("OPD consultation record not found.", 404, "NOT_FOUND");
  }

  const patientId = opd.patientId;
  const doctorId = opd.doctorId;
  const hospitalId = opd.hospitalId;

  // 2. Run Database Transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check duplicates for Laboratory
    const existingLabs = await tx.labTestOrder.findMany({
      where: {
        opdConsultationId,
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
        opdConsultationId,
        scanCatalogId: { in: radiologyScanCatalogIds },
        isDeleted: false,
      },
      select: { scanCatalogId: true },
    });
    const duplicateRadIds = existingRad.map((r) => r.scanCatalogId);
    const radToCreate = radiologyScanCatalogIds.filter((id) => !duplicateRadIds.includes(id));

    if (labsToCreate.length === 0 && radToCreate.length === 0) {
      throw new AppError("All selected tests are already assigned/ordered for this patient encounter.", 400, "DUPLICATE_TEST_ORDER");
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
          opdConsultationId,
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
      if (!radCatalog) throw new AppError(`Radiology catalog ID ${radCatId} not found.`, 404, "NOT_FOUND");

      const order = await tx.radiologyScanOrder.create({
        data: {
          patientId,
          scanCatalogId: radCatId,
          orderedByDoctorId: doctorId,
          opdConsultationId,
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

    return {
      labsCount: createdLabs.length,
      radsCount: createdRad.length,
    };
  });

  await logAdminAction({
    action: "OPD_TESTS_ASSIGNED_AFTER",
    resource: "OPDConsultation",
    entityId: opdConsultationId,
    newState: {
      labTestCatalogIds,
      radiologyScanCatalogIds,
    },
    description: `Booked ${result.labsCount} lab test(s) and ${result.radsCount} radiology scan(s) for patient ${opd.patient.name} (OPD Ref: ${opd.opdId})`,
  });

  return result;
});
