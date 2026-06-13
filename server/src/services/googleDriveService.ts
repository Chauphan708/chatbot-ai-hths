import { google } from "googleapis";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// The callback URL will redirect to the backend auth handler
const REDIRECT_URI = `${env.BETTER_AUTH_URL.replace('/api/auth', '')}/api/google-drive/callback`;

export function getOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("❌ GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được cấu hình.");
  }
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

/**
 * Get authorization URL for Google Drive
 */
export function getAuthUrl(stateUserId: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly"
    ],
    prompt: "consent",
    state: stateUserId // Pass the user ID as state to identify them on callback
  });
}

/**
 * Retrieve credentials, handle token expiration, and return initialized oauth2 client.
 */
export async function getAuthorizedClient(userId: string) {
  const oauth2Client = getOAuth2Client();
  
  const [user] = await db
    .select({
      googleAccessToken: users.googleAccessToken,
      googleRefreshToken: users.googleRefreshToken,
      googleTokenExpiresAt: users.googleTokenExpiresAt
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || !user.googleAccessToken) {
    throw new Error("Tài khoản chưa liên kết Google Drive.");
  }

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken || undefined,
    expiry_date: user.googleTokenExpiresAt ? new Date(user.googleTokenExpiresAt).getTime() : undefined
  });

  // Check if token needs refresh
  const isExpired = user.googleTokenExpiresAt 
    ? new Date(user.googleTokenExpiresAt).getTime() < Date.now() + 60000 // 1 min buffer
    : true;

  if (isExpired && user.googleRefreshToken) {
    console.log(`[Google Drive] Token expired for user ${userId}. Refreshing...`);
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Save new tokens to DB
    const updateData: Partial<typeof users.$inferInsert> = {
      googleAccessToken: credentials.access_token || undefined,
      googleTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      updatedAt: new Date()
    };
    if (credentials.refresh_token) {
      updateData.googleRefreshToken = credentials.refresh_token;
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));
    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

/**
 * List files from Google Drive folder (or root)
 */
export async function listDriveFiles(authClient: any, folderId = "root") {
  const drive = google.drive({ version: "v3", auth: authClient });
  
  const query = `'${folderId}' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/pdf')`;
  
  const response = await drive.files.list({
    q: query,
    fields: "files(id, name, mimeType, size, createdTime)",
    orderBy: "folder, name",
    pageSize: 100
  });

  return response.data.files || [];
}

/**
 * Download text content of a file from Google Drive.
 * Supports: Google Docs (exported to plain text) and raw txt files.
 */
export async function downloadFileText(authClient: any, fileId: string, mimeType: string): Promise<{ title: string; content: string }> {
  const drive = google.drive({ version: "v3", auth: authClient });
  
  // 1. Get metadata
  const metadata = await drive.files.get({
    fileId,
    fields: "name, mimeType"
  });

  const name = metadata.data.name || "Tài liệu chưa đặt tên";
  const actualMimeType = metadata.data.mimeType;

  // 2. Download and extract content based on mime type
  if (actualMimeType === "application/vnd.google-apps.document") {
    // Google Doc -> Export to plain text
    const response = await drive.files.export({
      fileId,
      mimeType: "text/plain"
    });
    return { title: name, content: String(response.data) };
  } else if (actualMimeType === "text/plain") {
    // Raw Text File -> Download directly
    const response = await drive.files.get({
      fileId,
      alt: "media"
    });
    return { title: name, content: String(response.data) };
  } else {
    throw new Error(`Định dạng tệp '${actualMimeType}' chưa được hỗ trợ nhập trực tiếp. Vui lòng chuyển đổi sang Google Docs hoặc Txt.`);
  }
}
