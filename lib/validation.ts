import { z } from "zod";
import { ValidationError } from "@/server/errors";

/**
 * ValidationService
 * Centralized utility parsing data against Zod schemas.
 * Converts complex Zod nested arrays into flat path-based key-value error objects.
 */
export class ValidationService {
  /**
   * Validates target object against a Zod schema.
   * Throws ValidationError on failure.
   */
  static validate<T>(schema: z.Schema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    
    if (!result.success) {
      // Flatten errors into a dictionary of fieldPath -> errorMessage
      const formattedErrors = result.error.issues.reduce((acc, curr) => {
        const path = curr.path.join(".");
        acc[path] = curr.message;
        return acc;
      }, {} as Record<string, string>);

      throw new ValidationError("Input validation failed", formattedErrors);
    }
    
    return result.data;
  }
}
