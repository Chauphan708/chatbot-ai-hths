/**
 * Global error handler middleware
 */

import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known operational errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Unknown errors
  console.error("💥 Unexpected error:", err);

  const isDev = process.env.NODE_ENV === "development";

  res.status(500).json({
    success: false,
    error: "Lỗi máy chủ — Vui lòng thử lại sau",
    ...(isDev && { stack: err.stack, details: err.message }),
  });
}

/**
 * Wrap async route handlers to catch unhandled rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
