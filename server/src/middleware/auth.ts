/**
 * Auth Middleware — Protect routes & enforce role-based access
 */

import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth/index.js";
import { fromNodeHeaders } from "better-auth/node";

// Extend Express Request with user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "teacher" | "parent" | "student";
        displayName: string;
      };
      session?: {
        id: string;
        userId: string;
        token: string;
        expiresAt: Date;
      };
    }
  }
}

/**
 * Middleware: Require authenticated user
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({
        success: false,
        error: "Unauthorized — Vui lòng đăng nhập",
      });
      return;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: (session.user as any).role ?? "student",
      displayName: (session.user as any).displayName ?? session.user.name ?? "",
    };
    req.session = {
      id: session.session.id,
      userId: session.session.userId,
      token: session.session.token,
      expiresAt: session.session.expiresAt,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      error: "Session không hợp lệ",
    });
  }
}

/**
 * Middleware factory: Require specific role(s)
 */
export function requireRole(...roles: Array<"teacher" | "parent" | "student">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden — Cần quyền: ${roles.join(" hoặc ")}`,
      });
      return;
    }

    next();
  };
}
