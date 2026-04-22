import api from "./api";

export interface QuickNote {
  id: string;
  userId: string;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteParams {
  content: string;
  color?: string;
}

export interface UpdateNoteParams {
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  color?: string;
}

async function getNotes(): Promise<QuickNote[]> {
  const { data } = await api.get("/quick-notes/");
  return data.data;
}

async function getArchivedNotes(): Promise<QuickNote[]> {
  const { data } = await api.get("/quick-notes/archived");
  return data.data;
}

async function getNoteById(id: string): Promise<QuickNote | null> {
  const { data } = await api.get(`/quick-notes/${id}`);
  return data.success ? data.data : null;
}

async function createNote(params: CreateNoteParams): Promise<QuickNote> {
  const { data } = await api.post("/quick-notes/", params);
  return data.data;
}

async function updateNote(id: string, params: UpdateNoteParams): Promise<QuickNote> {
  const { data } = await api.patch(`/quick-notes/${id}`, params);
  return data.data;
}

async function deleteNote(id: string): Promise<boolean> {
  const { data } = await api.delete(`/quick-notes/${id}`);
  return data.success;
}

async function togglePin(id: string): Promise<QuickNote> {
  const { data } = await api.patch(`/quick-notes/${id}/toggle-pin`);
  return data.data;
}

async function archiveNote(id: string): Promise<QuickNote> {
  const { data } = await api.patch(`/quick-notes/${id}/archive`);
  return data.data;
}

async function unarchiveNote(id: string): Promise<QuickNote> {
  const { data } = await api.patch(`/quick-notes/${id}/unarchive`);
  return data.data;
}

export const quickNoteService = {
  getNotes,
  getArchivedNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  archiveNote,
  unarchiveNote,
};