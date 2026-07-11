import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { BackupService } from "@/modules/admin/services/backup-service";
import { AppError } from "@/server/errors";

/**
 * POST /api/admin/backups/restore
 * Handles backup verification preview and full restore execution.
 * Restricted to Super Admins only.
 */
export const POST = wrapAuthRoute(async (req: NextRequest) => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "Restore");

  // Double check Super Admin role restriction
  if (context.employee.role !== "SUPER_ADMIN") {
    throw new AppError("Only Super Admins are authorized to perform system restoration.", 403, "FORBIDDEN");
  }

  const body = await req.json();
  const { filename, action, confirmed } = body;

  if (!filename) {
    throw new AppError("Backup filename is required.", 400, "BAD_REQUEST");
  }

  if (action === "PREVIEW") {
    // Validate backup checksum and structure
    const { isValid, metadata } = BackupService.validateBackup(filename);
    return {
      isValid,
      metadata,
      restoreHistory: BackupService.listRestoreHistory().filter(h => h.backupFile === filename)
    };
  }

  if (action === "RESTORE") {
    if (!confirmed) {
      throw new AppError("Confirmation is required to execute restore.", 400, "BAD_REQUEST");
    }

    // Execute full restore
    await BackupService.restoreBackup(filename, context.employee.id);
    return { message: "System restored successfully. Rollback backup generated." };
  }

  throw new AppError("Invalid restore action specified.", 400, "BAD_REQUEST");
});

/**
 * GET /api/admin/backups/restore
 * Retrieve the full history of restored operations
 */
export const GET = wrapAuthRoute(async () => {
  const context = RequestContextService.getRequired();
  await requirePermission(context.employee.id, "Admin", "Restore");

  if (context.employee.role !== "SUPER_ADMIN") {
    throw new AppError("Only Super Admins are authorized to view restore logs.", 403, "FORBIDDEN");
  }

  return BackupService.listRestoreHistory();
});
