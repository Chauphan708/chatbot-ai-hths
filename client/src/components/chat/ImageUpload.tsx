/**
 * ImageUpload — Camera/file picker with preview, compression, and send
 */

import { useState, useRef, useCallback } from "react";
import { Camera, X, Send, ImageIcon } from "lucide-react";
import { showToast } from "../ui";

const MAX_SIZE_BYTES = 1024 * 1024; // 1 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ImageUploadProps {
  onSend: (data: { image: string; mimeType: string; message?: string }) => void;
  disabled?: boolean;
}

/** Compress an image file to fit under MAX_SIZE_BYTES, returns base64 (without prefix) */
async function compressImage(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down if image is large
        const MAX_DIM = 1920;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Try progressively lower quality until under size limit
        const outputType =
          file.type === "image/png" ? "image/png" : "image/jpeg";
        let quality = 0.85;
        let dataUrl = canvas.toDataURL(outputType, quality);

        while (dataUrl.length * 0.75 > MAX_SIZE_BYTES && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        // Strip the data:...;base64, prefix
        const base64 = dataUrl.split(",")[1];
        const mimeType =
          quality < 0.85 && file.type === "image/png"
            ? "image/jpeg"
            : outputType;

        resolve({ base64, mimeType });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ onSend, disabled = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        showToast("Chỉ hỗ trợ ảnh JPG, PNG, WebP", "warning");
        return;
      }

      setProcessing(true);
      try {
        const { base64, mimeType } = await compressImage(file);
        setImageData({ base64, mimeType });
        // Create preview URL
        setPreview(URL.createObjectURL(file));
      } catch {
        showToast("Lỗi xử lý ảnh, thử lại nhé!", "error");
      } finally {
        setProcessing(false);
        // Reset file input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    []
  );

  const handleCancel = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setImageData(null);
    setMessage("");
  }, [preview]);

  const handleSend = useCallback(() => {
    if (!imageData) return;
    onSend({
      image: imageData.base64,
      mimeType: imageData.mimeType,
      message: message.trim() || undefined,
    });
    // Clean up
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setImageData(null);
    setMessage("");
  }, [imageData, message, onSend, preview]);

  // ── Camera button only (no preview) ──────────────
  if (!preview) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <button
          className="chat-btn"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || processing}
          title="Chụp / chọn ảnh bài tập"
          type="button"
        >
          {processing ? (
            <span className="btn__spinner" style={{ width: 18, height: 18 }} />
          ) : (
            <Camera size={18} />
          )}
        </button>
      </>
    );
  }

  // ── Preview panel ────────────────────────────────
  return (
    <div className="image-upload-preview">
      <div className="image-upload-preview__header">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
            Ảnh bài tập
          </span>
        </div>
        <button
          className="image-upload-preview__close"
          onClick={handleCancel}
          title="Hủy"
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <div className="image-upload-preview__body">
        <img
          src={preview}
          alt="Xem trước ảnh"
          className="image-upload-preview__thumb"
        />
        <div className="image-upload-preview__input-row">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Thêm câu hỏi (tùy chọn)..."
            className="image-upload-preview__text"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className="chat-btn chat-btn--send"
            onClick={handleSend}
            disabled={disabled}
            title="Gửi ảnh"
            type="button"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
