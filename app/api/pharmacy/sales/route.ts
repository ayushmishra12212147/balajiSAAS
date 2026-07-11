import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { PharmacySalesSchema } from "@/modules/pharmacy/schemas";
import { PharmacyService } from "@/modules/pharmacy/services/pharmacy-service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/pharmacy/sales
 * Search sales invoices.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "View");

  const searchParams = req.nextUrl.searchParams;
  const invoiceNumber = searchParams.get("invoiceNumber") || "";
  const customerName = searchParams.get("customerName") || "";
  const medicineName = searchParams.get("medicineName") || "";

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.PharmacyInvoiceWhereInput = {
    isDeleted: false,
  };

  if (invoiceNumber.trim()) {
    where.pharmacyInvoiceNumber = { contains: invoiceNumber.trim(), mode: "insensitive" };
  }
  if (customerName.trim()) {
    where.customerName = { contains: customerName.trim(), mode: "insensitive" };
  }
  if (medicineName.trim()) {
    where.items = {
      some: {
        medicine: {
          name: { contains: medicineName.trim(), mode: "insensitive" },
        },
      },
    };
  }

  const total = await prisma.pharmacyInvoice.count({ where });

  const invoices = await prisma.pharmacyInvoice.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      recipient: {
        select: {
          employeeCode: true,
          designation: true,
        },
      },
    },
  });

  return {
    invoices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/pharmacy/sales
 * Processes a new checkout sale invoice.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "Sell");

  const body = await req.json();
  const validated = ValidationService.validate(PharmacySalesSchema, body);

  const invoice = await PharmacyService.processSale(
    validated,
    context.employee.id
  );

  return invoice;
});
