import type { Attachment } from "../../db/schema/attachments";

export interface AttachmentUploadResponse {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  mimeType: string;
  createdAt: Date;
}