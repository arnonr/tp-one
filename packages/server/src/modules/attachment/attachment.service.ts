import { eq, desc } from "drizzle-orm";
import { db } from "../../config/database";
import { uploads } from "../../db/schema";
import { config } from "../../config/env";
import { ValidationError } from "../../shared/errors";
import type { Upload, NewUpload } from "../../db/schema/attachments";

const UPLOAD_DIR = config.uploadDir;
const ATTACHMENT_DIR = `${UPLOAD_DIR}/attachments`;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg", "image/png", "image/webp", "image/gif",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function ensureDirectory() {
  try {
    const dir = ATTACHMENT_DIR;
    console.log("[AttachmentService] Ensuring directory exists:", dir);
    await Bun.$`mkdir -p ${dir}`.catch(e => console.log("[AttachmentService] mkdir error:", e.message));
    // Verify it exists
    const exists = await Bun.$`test -d ${dir} && echo "yes" || echo "no"`.text();
    console.log("[AttachmentService] Directory exists:", exists.trim());
  } catch (err) {
    console.error("[AttachmentService] ensureDirectory error:", err);
  }
}

function generateFileName(originalName: string | null): string {
  const name = originalName || "file";
  const ext = name.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

export class AttachmentService {
  async getAttachments(params: {
    workspaceId?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Upload[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const conditions = [];

    if (params.workspaceId) {
      conditions.push(eq(uploads.workspaceId, params.workspaceId));
    }
    if (params.userId) {
      conditions.push(eq(uploads.userId, params.userId));
    }

    const whereClause = conditions.length > 0 ? eq(uploads.workspaceId, params.workspaceId!) : undefined;

    const [countResult] = await db
      .select({ count: uploads.id })
      .from(uploads)
      .where(whereClause);
    const total = Number(countResult?.count ?? 0);

    const data = await db
      .select()
      .from(uploads)
      .where(whereClause)
      .orderBy(desc(uploads.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data, total };
  }

  async getAttachmentById(id: string): Promise<Upload | null> {
    const [upload] = await db
      .select()
      .from(uploads)
      .where(eq(uploads.id, id))
      .limit(1);
    return upload ?? null;
  }

  async createAttachment(data: {
    workspaceId: string;
    userId: string;
    fileName: string;
    filePath: string;
    fileSize: string;
    mimeType: string;
  }): Promise<Upload> {
    const [upload] = await db
      .insert(uploads)
      .values({
        workspaceId: data.workspaceId,
        userId: data.userId,
        fileName: data.fileName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      } as NewUpload)
      .returning();
    return upload;
  }

  async deleteAttachment(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(uploads)
      .where(eq(uploads.id, id))
      .returning({ id: uploads.id });
    return !!deleted;
  }

  validateFile(type: string, size: number): void {
    const fileType = type || "application/octet-stream";
    // Allow octet-stream (unknown types) for editor uploads
    const allowed = [...ALLOWED_FILE_TYPES, "application/octet-stream"];
    if (!allowed.includes(fileType)) {
      throw new ValidationError(
        `File type ${fileType} is not allowed. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`
      );
    }
    if (size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
      );
    }
  }

  async processAndSaveFile(fileInput: any): Promise<{
    fileName: string;
    filePath: string;
    fileSize: string;
    mimeType: string;
  }> {
    await ensureDirectory();
    
    const file = fileInput.file || fileInput;
    const name = fileInput.fileName || file.name || "unknown";
    const size = fileInput.fileSize || file.size || 0;
    const type = fileInput.mimeType || file.type || "application/octet-stream";

    this.validateFile(type, size);

    const fileName = generateFileName(name);
    const filePath = `${ATTACHMENT_DIR}/${fileName}`;

    console.log("[AttachmentService] Processing file:", {
      name,
      size,
      type,
    });

    let buffer: ArrayBuffer;
    try {
      if (typeof file.arrayBuffer === 'function') {
        buffer = await file.arrayBuffer();
        console.log("[AttachmentService] Successfully read via native arrayBuffer");
      } else {
        const blob = new Blob([file]);
        buffer = await blob.arrayBuffer();
        console.log("[AttachmentService] Successfully read via Blob wrapper");
      }
    } catch (err) {
      console.error("[AttachmentService] All methods failed:", err);
      throw new Error("Cannot read file data with any available method");
    }

    await Bun.write(filePath, buffer);
    console.log("[AttachmentService] File written to:", filePath);

    return {
      fileName: name,
      filePath,
      fileSize: size.toString(),
      mimeType: type,
    };
  }
}

export const attachmentService = new AttachmentService();