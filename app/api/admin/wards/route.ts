import { NextRequest, NextResponse } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

/**
 * GET /api/admin/wards
 * Lists buildings, floors, wards, rooms, or the entire hierarchical tree.
 */
export const GET = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageUsers");

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type") || "all";

  if (type === "all") {
    const buildings = await prisma.building.findMany({
      where: { isDeleted: false },
      include: {
        floors: {
          where: { isDeleted: false },
          include: {
            wards: {
              where: { isDeleted: false },
              include: {
                rooms: {
                  where: { isDeleted: false },
                  include: {
                    beds: {
                      where: { isDeleted: false },
                      orderBy: { bedNumber: "asc" },
                    },
                  },
                  orderBy: { roomNumber: "asc" },
                },
              },
              orderBy: { name: "asc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return buildings;
  }

  if (type === "buildings") {
    return await prisma.building.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  if (type === "floors") {
    const buildingId = searchParams.get("buildingId");
    if (!buildingId) throw new AppError("buildingId parameter is required", 400, "BAD_REQUEST");
    return await prisma.floor.findMany({
      where: { buildingId, isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  if (type === "wards") {
    const floorId = searchParams.get("floorId");
    if (!floorId) throw new AppError("floorId parameter is required", 400, "BAD_REQUEST");
    return await prisma.ward.findMany({
      where: { floorId, isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  if (type === "rooms") {
    const wardId = searchParams.get("wardId");
    if (!wardId) throw new AppError("wardId parameter is required", 400, "BAD_REQUEST");
    return await prisma.bedRoom.findMany({
      where: { wardId, isDeleted: false },
      include: {
        beds: {
          where: { isDeleted: false },
        },
      },
      orderBy: { roomNumber: "asc" },
    });
  }

  throw new AppError("Invalid type parameter", 400, "BAD_REQUEST");
});

/**
 * POST /api/admin/wards
 * Creates a building, floor, ward, room, or bed.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageUsers");

  const body = await req.json();
  const { type } = body;

  if (type === "building") {
    const { name, code } = body;
    if (!name || !code) throw new AppError("name and code are required", 400, "BAD_REQUEST");
    return await prisma.building.create({
      data: { name, code },
    });
  }

  if (type === "floor") {
    const { name, buildingId } = body;
    if (!name || !buildingId) throw new AppError("name and buildingId are required", 400, "BAD_REQUEST");
    return await prisma.floor.create({
      data: { name, buildingId },
    });
  }

  if (type === "ward") {
    const { name, code, floorId } = body;
    if (!name || !code || !floorId) throw new AppError("name, code, and floorId are required", 400, "BAD_REQUEST");
    return await prisma.ward.create({
      data: { name, code, floorId },
    });
  }

  if (type === "room") {
    const { roomNumber, roomType, chargePerDay, wardId } = body;
    if (!roomNumber || !roomType || !chargePerDay || !wardId) {
      throw new AppError("roomNumber, roomType, chargePerDay, and wardId are required", 400, "BAD_REQUEST");
    }
    return await prisma.bedRoom.create({
      data: {
        roomNumber,
        roomType,
        chargePerDay: Number(chargePerDay),
        wardId,
      },
    });
  }

  if (type === "bed") {
    const { roomId, bedNumber } = body;
    if (!roomId || !bedNumber) throw new AppError("roomId and bedNumber are required", 400, "BAD_REQUEST");
    return await prisma.bed.create({
      data: {
        roomId,
        bedNumber,
        status: "AVAILABLE",
      },
    });
  }

  throw new AppError("Invalid type parameter", 400, "BAD_REQUEST");
});

/**
 * PUT /api/admin/wards
 * Updates a building, floor, ward, room, or bed details.
 */
export const PUT = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageUsers");

  const body = await req.json();
  const { type, id } = body;
  if (!id) throw new AppError("id is required", 400, "BAD_REQUEST");

  if (type === "building") {
    const { name, code } = body;
    return await prisma.building.update({
      where: { id },
      data: { name, code },
    });
  }

  if (type === "floor") {
    const { name } = body;
    return await prisma.floor.update({
      where: { id },
      data: { name },
    });
  }

  if (type === "ward") {
    const { name, code } = body;
    return await prisma.ward.update({
      where: { id },
      data: { name, code },
    });
  }

  if (type === "room") {
    const { roomNumber, roomType, chargePerDay } = body;
    return await prisma.bedRoom.update({
      where: { id },
      data: {
        roomNumber,
        roomType,
        chargePerDay: chargePerDay !== undefined ? Number(chargePerDay) : undefined,
      },
    });
  }

  if (type === "bed") {
    const { bedNumber, status } = body;
    return await prisma.bed.update({
      where: { id },
      data: {
        bedNumber,
        status,
      },
    });
  }

  throw new AppError("Invalid type parameter", 400, "BAD_REQUEST");
});

/**
 * DELETE /api/admin/wards
 * Soft-deletes a building, floor, ward, room, or bed.
 */
export const DELETE = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "ManageUsers");

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!type || !id) throw new AppError("type and id are required", 400, "BAD_REQUEST");

  if (type === "building") {
    return await prisma.building.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  if (type === "floor") {
    return await prisma.floor.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  if (type === "ward") {
    return await prisma.ward.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  if (type === "room") {
    return await prisma.bedRoom.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  if (type === "bed") {
    return await prisma.bed.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  throw new AppError("Invalid type parameter", 400, "BAD_REQUEST");
});
