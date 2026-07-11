import { auditLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type AuditAction = 
  | "LOGIN" 
  | "LOGOUT" 
  | "PAYMENT" 
  | "REFUND" 
  | "EDIT" 
  | "DELETE" 
  | "PERMISSION_CHANGE"
  | "SYSTEM_BOOT"
  | "PRINT";

export interface AuditRecordOptions {
  userId?: string;
  clientIp?: string;
  action: AuditAction;
  resource?: string;
  entityId?: string;
  description: string;
}

export class AuditService {
  /**
   * Logs a structured audit trail item to both the audit.log file and the database audits table.
   * Utilizes a fail-soft wrapper for database insertion to prevent system blockage.
   */
  public static async record(options: AuditRecordOptions): Promise<void> {
    // 1. Durably write to the file log immediately
    auditLogger.audit(`[${options.action}] - ${options.description}`, {
      userId: options.userId,
      resource: options.resource,
      entityId: options.entityId,
      ip: options.clientIp,
    });

    // 2. Persist to database audits table
    try {
      await prisma.audit.create({
        data: {
          userId: options.userId,
          clientIp: options.clientIp,
          action: options.action,
          resource: options.resource,
          entityId: options.entityId,
          description: options.description,
        },
      });
    } catch (dbError) {
      // Fail-soft: file logger is already written, preventing application crashes
      console.error("Database audit persistence failed:", dbError);
    }
  }
}
