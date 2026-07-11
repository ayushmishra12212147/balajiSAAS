import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { InvoiceGenerationSchema } from "@/modules/billing/schemas";
import { BillingService } from "@/modules/billing/services/billing-service";
import { InvoiceStatus, Prisma } from "@prisma/client";

/**
 * GET /api/billing/invoices
 * Paginated list and filter search of all Invoices.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "Billing", "View");

  const searchParams = req.nextUrl.searchParams;
  const invoiceNumber = searchParams.get("invoiceNumber") || "";
  const status = searchParams.get("status") || "";
  const uhid = searchParams.get("uhid") || "";
  const name = searchParams.get("name") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = {
    isDeleted: false,
    hospitalId: reqContext.employee.hospitalId,
  };

  if (invoiceNumber.trim()) {
    where.invoiceNumber = { contains: invoiceNumber.trim(), mode: "insensitive" };
  }
  if (status.trim()) {
    where.paymentStatus = status as InvoiceStatus;
  }

  // Handle nested patient attributes search
  if (uhid.trim() || name.trim()) {
    where.patient = {
      isDeleted: false,
      uhid: uhid.trim() ? { contains: uhid.trim(), mode: "insensitive" } : undefined,
      name: name.trim() ? { contains: name.trim(), mode: "insensitive" } : undefined,
    };
  }

  // Date filter
  if (startDate || endDate) {
    const dateQuery: Prisma.DateTimeFilter = {};
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      dateQuery.gte = sDate;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      dateQuery.lte = eDate;
    }
    where.createdAt = dateQuery;
  }

  const total = await prisma.invoice.count({ where });

  const invoices = await prisma.invoice.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      patient: {
        select: {
          id: true,
          uhid: true,
          name: true,
          phone: true,
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
 * POST /api/billing/invoices
 * Generates a new invoice from selected pending charges, executing dynamic deposit allocations.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  
  // If discount is applied, check for specific "Apply Discount" permission, else general "Generate Invoice"
  const body = await req.json();
  const hasDiscount = (body.discountAmount && Number(body.discountAmount) > 0) || (body.discountPercentage && Number(body.discountPercentage) > 0);
  
  if (hasDiscount) {
    await requirePermission(reqContext.employee.id, "Billing", "Apply Discount");
  } else {
    await requirePermission(reqContext.employee.id, "Billing", "Generate Invoice");
  }

  const validated = ValidationService.validate(InvoiceGenerationSchema, body);

  const invoice = await BillingService.generateInvoice(
    validated,
    reqContext.employee.id,
    reqContext.employee.hospitalId
  );

  return invoice;
});
