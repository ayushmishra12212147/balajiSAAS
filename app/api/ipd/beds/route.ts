import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ipd/beds
 * Lists all active rooms and beds, noting vacancies, to populate forms.
 */
export const GET = wrapAuthRoute(async () => {
  RequestContextService.getRequired(); // Requires a valid user session

  const rooms = await prisma.bedRoom.findMany({
    where: { isDeleted: false },
    include: {
      ward: {
        include: {
          floor: {
            include: {
              building: true,
            },
          },
        },
      },
      beds: {
        where: { isDeleted: false },
        orderBy: { bedNumber: "asc" },
      },
    },
    orderBy: { roomNumber: "asc" },
  });

  const mappedRooms = rooms.map((room) => ({
    ...room,
    floor: room.ward ? `${room.ward.floor.building.name} - ${room.ward.floor.name} (${room.ward.name})` : "N/A",
  }));

  return mappedRooms;
});
