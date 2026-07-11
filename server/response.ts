import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/server/errors";
import { securityLogger, applicationLogger } from "@/lib/logger";
import { RequestContextService } from "@/lib/services/request-context-service";

/**
 * Standard Success Response Format
 */
export interface StandardSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  requestId: string;
}

/**
 * Standard Error Response Format
 */
export interface StandardErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  details: unknown;
  requestId: string;
}

/**
 * Helper to build standard success response.
 */
export function successResponse<T>(
  message: string,
  data: T,
  status = 200,
  requestId?: string
): NextResponse<StandardSuccessResponse<T>> {
  const reqId = requestId || RequestContextService.get()?.requestId || "unknown";
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      requestId: reqId,
    },
    { status }
  );
}

/**
 * Helper to build standard error response.
 */
export function errorResponse(
  message: string,
  errorCode: string,
  details: unknown = null,
  status = 500,
  requestId?: string
): NextResponse<StandardErrorResponse> {
  const reqId = requestId || RequestContextService.get()?.requestId || "unknown";
  return NextResponse.json(
    {
      success: false,
      message,
      errorCode,
      details,
      requestId: reqId,
    },
    { status }
  );
}

/**
 * wrapRoute
 * Wraps Route Handlers with standard try-catch, request logging, request-id matching,
 * and security logging for unauthorized attempts.
 */
export function wrapRoute<T>(
  handler: (req: NextRequest, context: any) => Promise<T>
) {
  return async (req: NextRequest, context: any): Promise<NextResponse> => {
    const requestId = req.headers.get("x-request-id") || "unknown";

    try {
      const result = await handler(req, context);
      
      if (result instanceof NextResponse) {
        // Automatically append request-id header if not present
        if (!result.headers.has("x-request-id")) {
          result.headers.set("x-request-id", requestId);
        }
        return result;
      }
      
      return successResponse("Operation successful", result, 200, requestId);
    } catch (error: unknown) {
      const clientIp = req.headers.get("x-forwarded-for") || "unknown";
      const path = req.nextUrl.pathname;

      if (error instanceof AppError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          securityLogger.warn(
            `Access Denied [${error.errorCode}] on ${path}. IP: ${clientIp}. RequestID: ${requestId}. Reason: ${error.message}`,
            {
              path,
              ip: clientIp,
              errorCode: error.errorCode,
              requestId,
            }
          );
        } else {
          applicationLogger.warn(
            `API Warning [${error.errorCode}] on ${path}. RequestID: ${requestId}: ${error.message}`,
            {
              path,
              statusCode: error.statusCode,
              requestId,
              details: error.details ? (error.details as Record<string, unknown>) : null,
            }
          );
        }

        return errorResponse(error.message, error.errorCode, error.details, error.statusCode, requestId);
      }

      // Safe cast for unexpected errors
      const err = error instanceof Error ? error : new Error(String(error));

      applicationLogger.error(
        `Unhandled Exception on ${path}. RequestID: ${requestId}: ${err.message}`,
        {
          stack: err.stack,
          path,
          ip: clientIp,
          requestId,
        }
      );

      return errorResponse(
        err.message,
        "INTERNAL_SERVER_ERROR",
        err.stack,
        500,
        requestId
      );
    }
  };
}
