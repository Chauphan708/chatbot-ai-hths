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
        role: "teacher" | "parent" | "student" | "admin";
        name: string;
        isVerified: boolean;
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
      name: session.user.name,
      isVerified: (session.user as any).isVerified ?? true,
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
export function requireRole(...roles: Array<"teacher" | "parent" | "student" | "admin">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
      return;
    }

    // Admin có quyền truy cập tất cả
    if (req.user.role === "admin") {
      return next();
    }

    if (!roles.includes(req.user.role as any)) {
      res.status(403).json({
        success: false,
        error: `Forbidden — Cần quyền: ${roles.join(" hoặc ")}`,
      });
      return;
    }

    // Kiểm tra xác minh cho Giáo viên
    if (req.user.role === "teacher" && !req.user.isVerified) {
      res.status(403).json({
        success: false,
        error: "Tài khoản Giáo viên chưa được Admin phê duyệt",
      });
      return;
    }

    next();
  };
}
