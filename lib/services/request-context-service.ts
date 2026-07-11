import { AsyncLocalStorage } from "async_hooks";
import { Employee, Hospital, Session } from "@prisma/client";

/**
 * RequestContext
 * Holds metadata for the active request lifecycle.
 */
export interface RequestContext {
  employee: Employee;
  hospital: Hospital;
  permissions: string[]; // Formatted list of toggled permissions, e.g. ["Patient:Create"]
  session: Omit<Session, "id">; // Excludes hashed session token key for safety
  sessionIdHash?: string;
  requestId: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * RequestContextService
 * Uses AsyncLocalStorage to expose request metadata.
 * Restricts query pollution by localizing context retrieval.
 */
export class RequestContextService {
  private static storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Executes a function inside the active RequestContext scope.
   */
  static run<R>(context: RequestContext, fn: () => R): R {
    return this.storage.run(context, fn);
  }

  /**
   * Reads the active RequestContext, or returns undefined if called outside active request scope.
   */
  static get(): RequestContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Retrieves the active RequestContext, throwing an error if context is missing.
   */
  static getRequired(): RequestContext {
    const store = this.get();
    if (!store) {
      throw new Error(
        "Request context is uninitialized. This execution context must run inside the authenticated Next.js middleware pipeline."
      );
    }
    return store;
  }
}
