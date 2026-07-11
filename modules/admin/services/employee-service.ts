import { prisma } from "@/lib/prisma";
import { PasswordService } from "@/modules/auth/services/password-provider";
import { destroyAllSessionsForUser } from "@/modules/auth/services/session";
import { AppError } from "@/server/errors";
import { logAdminAction } from "./audit-service";
import { Prisma } from "@prisma/client";

/**
 * EmployeeService
 * Centralized service managing administrative employee configurations.
 * Guarantees password hashing consistency and enforces transaction audits.
 */
export class EmployeeService {
  /**
   * Generates a transaction-safe unique employee code using the sequences table.
   * If the sequence record does not exist, it analyzes existing employee codes
   * in the database to initialize starting from the next numeric index.
   */
  static async generateEmployeeCode(tx: Prisma.TransactionClient): Promise<string> {
    const sequenceName = "EMPLOYEE_CODE_SEQUENCE";

    let seq = await tx.sequence.findUnique({
      where: { sequenceName },
    });

    if (!seq) {
      // Analyze existing codes to find the maximum numeric code
      const employees = await tx.employee.findMany({
        where: { isDeleted: false },
        select: { employeeCode: true },
      });

      let maxVal = 1; // start from EMP002 if EMP001 is found
      for (const emp of employees) {
        const numPart = emp.employeeCode.replace(/\D/g, "");
        if (numPart) {
          const val = parseInt(numPart, 10);
          if (val > maxVal) {
            maxVal = val;
          }
        }
      }

      seq = await tx.sequence.create({
        data: {
          sequenceName,
          currentValue: BigInt(maxVal),
          prefix: "EMP",
          paddingLength: 3,
          isActive: true,
        },
      });
    }

    const nextVal = Number(seq.currentValue) + 1;
    await tx.sequence.update({
      where: { sequenceName },
      data: { currentValue: BigInt(nextVal) },
    });

    const running = String(nextVal).padStart(seq.paddingLength, "0");
    return `${seq.prefix}${running}`;
  }

  /**
   * Generates a transaction-safe unique doctor registration number using the sequences table.
   * Format: DOC[YY][Sequence] (e.g. DOC26001)
   */
  static async generateDoctorRegistrationNumber(tx: Prisma.TransactionClient): Promise<string> {
    const yearStr = new Date().getFullYear().toString().slice(-2); // e.g. "26"
    const sequenceName = `DOCTOR_REG_SEQUENCE_${yearStr}`;

    let seq = await tx.sequence.findUnique({
      where: { sequenceName },
    });

    if (!seq) {
      // Analyze existing doctor registration numbers to initialize
      const doctors = await tx.doctor.findMany({
        where: { isDeleted: false },
        select: { registrationNumber: true },
      });

      let maxVal = 0;
      const expectedPrefix = `DOC${yearStr}`;
      for (const doc of doctors) {
        if (doc.registrationNumber.startsWith(expectedPrefix)) {
          const numPart = doc.registrationNumber.slice(expectedPrefix.length);
          if (numPart) {
            const val = parseInt(numPart, 10);
            if (val > maxVal) {
              maxVal = val;
            }
          }
        }
      }

      seq = await tx.sequence.create({
        data: {
          sequenceName,
          currentValue: BigInt(maxVal),
          prefix: expectedPrefix,
          paddingLength: 3,
          isActive: true,
        },
      });
    }

    const nextVal = Number(seq.currentValue) + 1;
    await tx.sequence.update({
      where: { sequenceName },
      data: { currentValue: BigInt(nextVal) },
    });

    const running = String(nextVal).padStart(seq.paddingLength, "0");
    return `${seq.prefix}${running}`;
  }

  /**
   * Reusable method to create a new Employee.
   * Can run within an existing database transaction client.
   */
  static async createEmployee(
    data: {
      name: string;
      employeeCode?: string | null;
      email: string;
      passwordRaw: string;
      role: "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "EMPLOYEE";
      designation: string;
      departmentId?: string | null;
      hospitalId: string;
      mobileNumber: string;
      joiningDate: Date;
    },
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;

    // Generate employee code if not provided
    let finalEmployeeCode = data.employeeCode?.trim();
    if (!finalEmployeeCode) {
      finalEmployeeCode = await this.generateEmployeeCode(db);
    }

    // Check email uniqueness
    const existingEmail = await db.employee.findFirst({
      where: { email: data.email, isDeleted: false },
    });
    if (existingEmail) {
      throw new AppError("An employee with this email already exists", 400, "BAD_REQUEST");
    }

    // Check employee code uniqueness
    const existingCode = await db.employee.findFirst({
      where: { employeeCode: finalEmployeeCode, isDeleted: false },
    });
    if (existingCode) {
      throw new AppError("An employee with this code already exists", 400, "BAD_REQUEST");
    }

    // Hash raw password
    const passwordHash = await PasswordService.hash(data.passwordRaw);

    const employee = await db.employee.create({
      data: {
        name: data.name,
        employeeCode: finalEmployeeCode,
        email: data.email,
        passwordHash,
        role: data.role,
        designation: data.designation,
        departmentId: data.departmentId || null,
        hospitalId: data.hospitalId,
        mobileNumber: data.mobileNumber,
        joiningDate: data.joiningDate,
        isActive: true,
      },
    });

    // Write Audit log
    await logAdminAction({
      action: "EMPLOYEE_CREATE",
      resource: "Employee",
      entityId: employee.id,
      newState: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        email: employee.email,
        role: employee.role,
        designation: employee.designation,
      },
      description: `Created new employee: ${employee.email} (${employee.employeeCode})`,
    });

    return employee;
  }

  /**
   * Updates employee attributes.
   * Automatically destroys all active sessions if employee is deactivated.
   */
  static async updateEmployee(
    id: string,
    data: {
      name?: string;
      role?: "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "EMPLOYEE";
      designation?: string;
      departmentId?: string | null;
      mobileNumber?: string;
      isActive?: boolean;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const before = await tx.employee.findUnique({ where: { id } });
      if (!before || before.isDeleted) {
        throw new AppError("Employee record not found", 404, "NOT_FOUND");
      }

      const employee = await tx.employee.update({
        where: { id },
        data: {
          name: data.name,
          role: data.role,
          designation: data.designation,
          departmentId: data.departmentId,
          mobileNumber: data.mobileNumber,
          isActive: data.isActive,
        },
      });

      // Session revocation: Force logout immediately if disabled
      if (data.isActive === false && before.isActive === true) {
        await destroyAllSessionsForUser(id);
      }

      await logAdminAction({
        action: "EMPLOYEE_UPDATE",
        resource: "Employee",
        entityId: id,
        previousState: {
          role: before.role,
          designation: before.designation,
          departmentId: before.departmentId,
          mobileNumber: before.mobileNumber,
          isActive: before.isActive,
        },
        newState: {
          role: employee.role,
          designation: employee.designation,
          departmentId: employee.departmentId,
          mobileNumber: employee.mobileNumber,
          isActive: employee.isActive,
        },
        description: `Updated profile details for employee ${employee.email}. ${
          data.isActive === false ? "Active sessions terminated." : ""
        }`,
      });

      return employee;
    });
  }

  /**
   * Administratively resets employee password.
   * Revokes all active user sessions for safety.
   */
  static async resetPassword(id: string, passwordRaw: string) {
    return prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id } });
      if (!employee || employee.isDeleted) {
        throw new AppError("Employee record not found", 404, "NOT_FOUND");
      }

      const passwordHash = await PasswordService.hash(passwordRaw);

      await tx.employee.update({
        where: { id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      // Revoke sessions immediately
      await destroyAllSessionsForUser(id);

      await logAdminAction({
        action: "PASSWORD_RESET",
        resource: "Employee",
        entityId: id,
        description: `Administratively reset password for employee ${employee.email}. Force logged out other terminals.`,
      });
    });
  }

  /**
   * Unlocks an employee account locked by failed login attempts.
   */
  static async unlockAccount(id: string) {
    const before = await prisma.employee.findUnique({ where: { id } });
    if (!before || before.isDeleted) {
      throw new AppError("Employee record not found", 404, "NOT_FOUND");
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    await logAdminAction({
      action: "ACCOUNT_UNLOCK",
      resource: "Employee",
      entityId: id,
      previousState: {
        failedLoginCount: before.failedLoginCount,
        lockedUntil: before.lockedUntil,
      },
      newState: {
        failedLoginCount: employee.failedLoginCount,
        lockedUntil: employee.lockedUntil,
      },
      description: `Unlocked account for employee ${employee.email}.`,
    });

    return employee;
  }
}
