import { eq, and, desc } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../../config/database";
import { snapshots } from "../../db/schema";
import { config } from "../../config/env";
import { ValidationError } from "../../shared/errors";
import type { Snapshot, NewSnapshot } from "../../db/schema/snapshots";

const UPLOAD_DIR = config.uploadDir;
const SNAPSHOT_DIR = `${UPLOAD_DIR}/snapshots`;
const THUMBNAIL_DIR = `${UPLOAD_DIR}/snapshots/thumbnails`;

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_SIZE = 400;

async function ensureDirectories() {
  try {
    const { exitCode } = await Bun.$`test -d ${SNAPSHOT_DIR}`.nothrow();
    if (exitCode !== 0) {
      await Bun.$`mkdir -p ${SNAPSHOT_DIR} ${THUMBNAIL_DIR}`;
    }
  } catch {
    await Bun.$`mkdir -p ${SNAPSHOT_DIR} ${THUMBNAIL_DIR}`;
  }
}

function generateFileName(originalName: string): string {
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

export interface UploadedFile {
  fieldName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  file: File;
}

export interface SnapshotUploadPayload {
  workspaceId: string;
  eventName: string;
  evidenceType: string;
  takenDate: string;
  description?: string;
}

export interface SnapshotWithThumb extends Snapshot {
  thumbnailUrl?: string;
}

export class SnapshotService {
  async getSnapshots(params: {
    workspaceId?: string;
    userId?: string;
    fiscalYear?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Snapshot[]; total: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const conditions = [];

    if (params.workspaceId) {
      conditions.push(eq(snapshots.workspaceId, params.workspaceId));
    }
    if (params.userId) {
      conditions.push(eq(snapshots.userId, params.userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: snapshots.id })
      .from(snapshots)
      .where(whereClause);
    const total = Number(countResult?.count ?? 0);

    const data = await db
      .select()
      .from(snapshots)
      .where(whereClause)
      .orderBy(desc(snapshots.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data, total };
  }

  async getSnapshotById(id: string): Promise<Snapshot | null> {
    const [snapshot] = await db
      .select()
      .from(snapshots)
      .where(eq(snapshots.id, id))
      .limit(1);
    return snapshot ?? null;
  }

  async createSnapshot(data: {
    workspaceId: string;
    userId: string;
    eventName: string;
    evidenceType: string;
    takenDate: string;
    description?: string;
    fileName: string;
    filePath: string;
    thumbnailPath?: string;
    fileSize: string;
    mimeType: string;
  }): Promise<Snapshot> {
    const [snapshot] = await db
      .insert(snapshots)
      .values({
        workspaceId: data.workspaceId,
        userId: data.userId,
        eventName: data.eventName,
        evidenceType: data.evidenceType as any,
        takenDate: data.takenDate,
        description: data.description,
        fileName: data.fileName,
        filePath: data.filePath,
        thumbnailPath: data.thumbnailPath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      } as NewSnapshot)
      .returning();
    return snapshot;
  }

  async deleteSnapshot(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(snapshots)
      .where(and(eq(snapshots.id, id), eq(snapshots.userId, userId)))
      .returning({ id: snapshots.id });
    return !!deleted;
  }

  validateFile(file: File): void {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ValidationError(
        `File type ${file.type} is not allowed. Allowed: ${ALLOWED_TYPES.join(", ")}`
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
      );
    }
  }

  async processAndSaveFile(file: File, workspaceId: string): Promise<{
    fileName: string;
    filePath: string;
    thumbnailPath?: string;
    fileSize: string;
    mimeType: string;
  }> {
    await ensureDirectories();
    this.validateFile(file);

    const fileName = generateFileName(file.name);
    const filePath = `${SNAPSHOT_DIR}/${fileName}`;
    const thumbnailPath = `${THUMBNAIL_DIR}/${fileName}`;

    // Write original file
    const buffer = await file.arrayBuffer();
    await Bun.write(filePath, buffer);

    // Generate thumbnail for images
    const isImage = ALLOWED_TYPES.slice(0, 5).includes(file.type); // exclude heic/heif from thumbnail
    if (isImage) {
      try {
        await sharp(buffer)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
      } catch (err) {
        console.warn("Thumbnail generation failed, skipping:", err);
      }
    }

    return {
      fileName: file.name,
      filePath,
      thumbnailPath: isImage ? thumbnailPath : undefined,
      fileSize: file.size.toString(),
      mimeType: file.type,
    };
  }
}

export const snapshotService = new SnapshotService();
