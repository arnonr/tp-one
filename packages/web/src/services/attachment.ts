import api from "./api";

export interface AttachmentUploadResponse {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  mimeType: string;
  createdAt: string;
}

export async function uploadAttachment(file: File, workspaceId: string): Promise<AttachmentUploadResponse> {
  const response = await api.postForm<any>(
    "/attachments",
    {
      file: file,
      workspaceId: workspaceId
    }
  );

  if (!response.data?.success) {
    throw new Error(response.data?.error?.message || "Upload failed");
  }

  return response.data.data;
}

export async function deleteAttachment(id: string): Promise<void> {
  await api.delete(`/attachments/${id}`);
}