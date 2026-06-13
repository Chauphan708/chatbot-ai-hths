import { Router } from "express";
import { db } from "../db/index.js";
import { users, trainingData } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, asyncHandler, AppError } from "../middleware/index.js";
import { 
  getAuthUrl, 
  getOAuth2Client, 
  getAuthorizedClient, 
  listDriveFiles, 
  downloadFileText 
} from "../services/googleDriveService.js";
import { embedTrainingData } from "../services/rag/index.js";
import { env } from "../config/env.js";

const router = Router();

// ─── OAuth Flow (No role check for initial auth redirects, but require login) ─────────────────

/**
 * GET /api/google-drive/auth-url
 * Returns the Google consent screen URL.
 */
router.get(
  "/auth-url",
  requireAuth,
  requireRole("teacher"),
  asyncHandler(async (req, res) => {
    try {
      const authUrl = getAuthUrl(req.user!.id);
      res.json({ success: true, data: { url: authUrl } });
    } catch (err: any) {
      throw new AppError(500, err.message || "Không thể tạo URL xác thực Google.");
    }
  })
);

/**
 * GET /api/google-drive/callback
 * Handles Google OAuth callback and saves tokens.
 */
router.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    
    if (!code || !state) {
      res.redirect(`${env.CLIENT_URL}/teacher?error=google_auth_failed`);
      return;
    }

    const userId = String(state);
    
    try {
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(String(code));
      
      // Save tokens to database
      const updateData: Partial<typeof users.$inferInsert> = {
        googleAccessToken: tokens.access_token || undefined,
        googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        updatedAt: new Date()
      };
      if (tokens.refresh_token) {
        updateData.googleRefreshToken = tokens.refresh_token;
      }

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      // Redirect back to teacher settings page on frontend
      res.redirect(`${env.CLIENT_URL}/teacher?google_connected=true`);
    } catch (err) {
      console.error("[Google OAuth Callback Error]:", err);
      res.redirect(`${env.CLIENT_URL}/teacher?error=google_auth_error`);
    }
  })
);

// ─── Files and Data Ingestion (Requires Teacher role) ─────────────────────────

/**
 * GET /api/google-drive/status
 * Check if the teacher has linked their Google Drive.
 */
router.get(
  "/status",
  requireAuth,
  requireRole("teacher"),
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select({ googleAccessToken: users.googleAccessToken })
      .from(users)
      .where(eq(users.id, req.user!.id));

    res.json({
      success: true,
      data: {
        isConnected: !!user?.googleAccessToken
      }
    });
  })
);

/**
 * GET /api/google-drive/files
 * List files/folders inside a Google Drive folder.
 */
router.get(
  "/files",
  requireAuth,
  requireRole("teacher"),
  asyncHandler(async (req, res) => {
    const folderId = req.query.folderId ? String(req.query.folderId) : "root";
    
    try {
      const authClient = await getAuthorizedClient(req.user!.id);
      const files = await listDriveFiles(authClient, folderId);
      res.json({ success: true, data: files });
    } catch (err: any) {
      throw new AppError(400, err.message || "Lỗi tải tệp từ Google Drive.");
    }
  })
);

/**
 * POST /api/google-drive/import
 * Import a file's content, embed it and save to training_data database.
 */
router.post(
  "/import",
  requireAuth,
  requireRole("teacher"),
  asyncHandler(async (req, res) => {
    const { fileId, mimeType, chatbotId } = req.body;
    
    if (!fileId || !mimeType || !chatbotId) {
      throw new AppError(400, "Thiếu thông tin fileId, mimeType hoặc chatbotId.");
    }

    try {
      // 1. Download file content
      const authClient = await getAuthorizedClient(req.user!.id);
      const fileData = await downloadFileText(authClient, fileId, mimeType);
      
      // 2. Insert into training_data database table
      const [newTrainingItem] = await db
        .insert(trainingData)
        .values({
          chatbotId,
          title: fileData.title,
          content: fileData.content,
        })
        .returning();

      // 3. Create embedding vector via RAG service
      await embedTrainingData(newTrainingItem.id, fileData.content);

      res.status(201).json({
        success: true,
        message: "Nhập tài liệu và tạo embedding RAG thành công!",
        data: {
          id: newTrainingItem.id,
          title: newTrainingItem.title
        }
      });
    } catch (err: any) {
      console.error("[Google Import Error]:", err);
      throw new AppError(500, err.message || "Lỗi khi nhập tài liệu từ Google Drive.");
    }
  })
);

export default router;
