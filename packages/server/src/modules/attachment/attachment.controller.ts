import { attachmentService, type AttachmentUploadResponse } from "./attachment.service";
import type { UploadedFile } from "./attachment.service";

export class AttachmentController {
  async upload(file: UploadedFile, workspaceId: string, userId: string): Promise<AttachmentUploadResponse> {
    const processed = await attachmentService.processAndSaveFile(file);

    const attachment = await attachmentService.createAttachment({
      workspaceId,
      userId,
      ...processed,
    });

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: `/api/uploads/attachments/${attachment.filePath.split("/").pop()}`,
      fileSize: attachment.fileSize ?? "",
      mimeType: attachment.mimeType ?? "",
      createdAt: attachment.createdAt,
    };
  }

  async list(params: {
    workspaceId?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  }) {
    return attachmentService.getAttachments(params);
  }

  async getById(id: string) {
    return attachmentService.getAttachmentById(id);
  }

  async delete(id: string, userId: string) {
    return attachmentService.deleteAttachment(id, userId);
  }
}

export const attachmentController = new AttachmentController();