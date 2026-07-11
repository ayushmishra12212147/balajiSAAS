import { z } from "zod";

/**
 * Standard schema to validate UUID resource identifiers.
 * Mitigates ID enumeration vectors.
 */
export const uuidSchema = z.string().uuid("Invalid resource identifier format");

/**
 * Global schema for validation of query pagination options.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
