import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { ValidationService } from "@/lib/validation";
import { MedicineMasterSchema } from "@/modules/pharmacy/schemas";
import { PharmacyService } from "@/modules/pharmacy/services/pharmacy-service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/pharmacy/medicines
 * Returns a paginated listing of medicines in the catalog.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "View");

  const searchParams = req.nextUrl.searchParams;
  const name = searchParams.get("name") || "";
  const genericName = searchParams.get("genericName") || "";
  const category = searchParams.get("category") || "";
  const isActive = searchParams.get("isActive");

  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || "10")));
  const skip = (page - 1) * limit;

  const where: Prisma.MedicineWhereInput = {
    isDeleted: false,
  };

  if (name.trim()) {
    where.name = { contains: name.trim(), mode: "insensitive" };
  }
  if (genericName.trim()) {
    where.genericName = { contains: genericName.trim(), mode: "insensitive" };
  }
  if (category.trim()) {
    where.category = { equals: category.trim() };
  }
  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  }

  const expiringSoon = searchParams.get("expiringSoon") === "true";
  if (expiringSoon) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 90); // 90 days from now
    where.stock = {
      some: {
        expiryDate: {
          gt: new Date(),
          lte: targetDate,
        },
        currentQuantity: {
          gt: 0,
        },
      },
    };
  }

  const total = await prisma.medicine.count({ where });

  const medicines = await prisma.medicine.findMany({
    where,
    skip,
    take: limit,
    orderBy: { name: "asc" },
    include: {
      stock: {
        where: {
          currentQuantity: { gt: 0 }
        },
        orderBy: {
          expiryDate: "asc"
        }
      }
    }
  });

  return {
    medicines,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

/**
 * POST /api/pharmacy/medicines
 * Creates a new medicine entry.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Pharmacy", "Purchase");

  const body = await req.json();
  const validated = ValidationService.validate(MedicineMasterSchema, body);

  const medicine = await PharmacyService.createMedicine(
    validated,
    context.employee.id
  );

  return medicine;
});
