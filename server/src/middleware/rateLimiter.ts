/**
 * Rate limiter middleware
 *
 * - Global: 100 req/15min per IP
 * - Auth: 10 req/15min per IP (login/register)
 * - Chat: Uses DB daily_usage table (10 messages/day per student per bot)
 */

import rateLimit from "express-rate-limit";

/** Global rate limiter: 100 requests per 15 minutes */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Quá nhiều yêu cầu — vui lòng chờ 15 phút",
  },
});

/** Auth rate limiter: 10 requests per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Quá nhiều lần thử đăng nhập — vui lòng chờ 15 phút",
  },
});
