import api from "./api";

export interface Snapshot {
  id: string;
  workspaceId: string;
  userId: string;
  eventName: string;
  evidenceType: string;
  takenDate: string;
  description: string | null;
  fileName: string;
  filePath: string;
  thumbnailPath: string | null;
  fileSize: string;
  mimeType: string;
  createdAt: string;
}

export interface SnapshotFilter {
  workspaceId?: string;
  userId?: string;
  fiscalYear?: number;
  page?: number;
  pageSize?: number;
}

export interface SnapshotUploadPayload {
  workspaceId: string;
  eventName: string;
  evidenceType: string;
  takenDate: string;
  description?: string;
}

export const snapshotService = {
  async getSnapshots(filter: SnapshotFilter = {}): Promise<{ data: Snapshot[]; total: number }> {
    const params = new URLSearchParams();
    if (filter.workspaceId) params.set("workspaceId", filter.workspaceId);
    if (filter.userId) params.set("userId", filter.userId);
    if (filter.fiscalYear) params.set("fiscalYear", filter.fiscalYear.toString());
    if (filter.page) params.set("page", filter.page.toString());
    if (filter.pageSize) params.set("pageSize", filter.pageSize.toString());

    const { data } = await api.get(`/snapshots?${params.toString()}`);
    return data;
  },

  async getSnapshotById(id: string): Promise<Snapshot> {
    const { data } = await api.get(`/snapshots/${id}`);
    return data.data;
  },

  async uploadSnapshots(payload: SnapshotUploadPayload, files: File[]): Promise<Snapshot[]> {
    const formData = new FormData();
    formData.append("workspaceId", payload.workspaceId);
    formData.append("eventName", payload.eventName);
    formData.append("evidenceType", payload.evidenceType);
    formData.append("takenDate", payload.takenDate);
    if (payload.description) {
      formData.append("description", payload.description);
    }
    files.forEach((file) => {
      formData.append("files", file);
    });

    const { data } = await api.post("/snapshots", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  async deleteSnapshot(id: string): Promise<void> {
    await api.delete(`/snapshots/${id}`);
  },
};
