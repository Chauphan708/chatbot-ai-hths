/**
 * Response Cache Service
 *
 * Cache phản hồi AI để giảm chi phí API và tăng tốc trả lời.
 * Sử dụng SHA-256 hash query text để lookup nhanh.
 */

import crypto from "node:crypto";
import { eq, and, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { responseCache } from "../../db/schema.js";

// ─── Types ───────────────────────────────────────

export interface CachedResponse {
  id: string;
  responseJson: unknown;
  hitCount: number;
}

// ─── Helpers ─────────────────────────────────────

function hashQuery(query: string): string {
  return crypto
    .createHash("sha256")
    .update(query.trim().toLowerCase())
    .digest("hex");
}

// ─── Core Functions ──────────────────────────────

/**
 * Tìm cache cho một query.
 * Tự động tăng hit_count nếu tìm thấy.
 */
export async function getFromCache(
  chatbotId: string,
  query: string
): Promise<CachedResponse | null> {
  const queryHash = hashQuery(query);

  const [cached] = await db
    .select()
    .from(responseCache)
    .where(
      and(
        eq(responseCache.chatbotId, chatbotId),
        eq(responseCache.queryHash, queryHash),
        sql`${responseCache.expiresAt} > NOW()`
      )
    );

  if (!cached) return null;

  // Increment hit count (background, non-blocking)
  db.update(responseCache)
    .set({ hitCount: sql`${responseCache.hitCount} + 1` })
    .where(eq(responseCache.id, cached.id))
    .catch((err) => console.error("Failed to update cache hit count:", err));

  return {
    id: cached.id,
    responseJson: cached.responseJson,
    hitCount: cached.hitCount + 1,
  };
}

/**
 * Lưu response vào cache.
 * Nếu đã tồn tại (cùng chatbotId + queryHash), sẽ cập nhật.
 */
export async function saveToCache(
  chatbotId: string,
  query: string,
  responseJson: unknown,
  ttlDays: number = 7
): Promise<void> {
  const queryHash = hashQuery(query);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  // Upsert: insert or update on conflict
  await db
    .insert(responseCache)
    .values({
      chatbotId,
      queryHash,
      queryText: query.trim(),
      responseJson,
      expiresAt,
      hitCount: 0,
    })
    .onConflictDoUpdate({
      target: [responseCache.chatbotId, responseCache.queryHash],
      set: {
        responseJson,
        expiresAt,
        hitCount: 0,
        createdAt: new Date(),
      },
    });
}

/**
 * Xóa toàn bộ cache cho một chatbot.
 * Gọi khi training data thay đổi.
 */
export async function invalidateCache(chatbotId: string): Promise<number> {
  const result = await db
    .delete(responseCache)
    .where(eq(responseCache.chatbotId, chatbotId))
    .returning({ id: responseCache.id });

  return result.length;
}

/**
 * Xóa các cache đã hết hạn (cleanup job).
 */
export async function cleanupExpired(): Promise<number> {
  const result = await db
    .delete(responseCache)
    .where(lt(responseCache.expiresAt, new Date()))
    .returning({ id: responseCache.id });

  return result.length;
}

// ─── Export ──────────────────────────────────────

export const cacheService = {
  getFromCache,
  saveToCache,
  invalidateCache,
  cleanupExpired,
};
