import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * GET /api/opd/queue
 * Returns today's active queues sorted by token number ascending.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "OPD", "View");

  const searchParams = req.nextUrl.searchParams;
  const doctorId = searchParams.get("doctorId") || "";
  const departmentId = searchParams.get("departmentId") || "";

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const where: Prisma.OPDConsultationWhereInput = {
    isDeleted: false,
    hospitalId: reqContext.employee.hospitalId,
    cancelledAt: null, // Cancelled patients are not in the active queue
    consultationDate: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };

  if (doctorId.trim()) {
    where.doctorId = doctorId;
  }
  if (departmentId.trim()) {
    where.departmentId = departmentId;
  }

  const queue = await prisma.oPDConsultation.findMany({
    where,
    // Sort strictly by Token Number, with registration time as fallback
    orderBy: [
      { tokenNumber: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      patient: {
        select: {
          id: true,
          uhid: true,
          name: true,
          gender: true,
          dob: true,
          phone: true,
        },
      },
      doctor: {
        select: {
          id: true,
          employee: {
            select: {
              designation: true,
              name: true,
            },
          },
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return queue;
});
