/**
 * Request validation middleware — Zod schemas
 */

import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema } from "zod";

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: "Dữ liệu không hợp lệ",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validate request query params against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: "Query params không hợp lệ",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.query = result.data;
    next();
  };
}

/**
 * Validate request params against a Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: "Params không hợp lệ",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.params = result.data;
    next();
  };
}

// ─── Common Schemas ─────────────────────────────────

export const uuidParamSchema = z.object({
  id: z.string().uuid("ID không hợp lệ"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Safely extract a route param as string.
 * Express types params as string | string[] but after validateParams
 * they are always string. This helper provides type safety.
 */
export function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0];
  return value as string;
}
