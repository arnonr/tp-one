import { eq, and, desc } from "drizzle-orm";
import { db } from "../../config/database";
import { quickNotes } from "../../db/schema";
import type { QuickNote, NewQuickNote } from "../../db/schema/quick-notes";

export interface QuickNoteWithStats extends QuickNote {
  taskCount?: number;
}

export class QuickNoteService {
  async getNotes(userId: string): Promise<QuickNote[]> {
    return db
      .select()
      .from(quickNotes)
      .where(and(eq(quickNotes.userId, userId), eq(quickNotes.isArchived, false)))
      .orderBy(desc(quickNotes.isPinned), desc(quickNotes.createdAt));
  }

  async getArchivedNotes(userId: string): Promise<QuickNote[]> {
    return db
      .select()
      .from(quickNotes)
      .where(and(eq(quickNotes.userId, userId), eq(quickNotes.isArchived, true)))
      .orderBy(desc(quickNotes.updatedAt));
  }

  async getNoteById(id: string, userId: string): Promise<QuickNote | null> {
    const [note] = await db
      .select()
      .from(quickNotes)
      .where(and(eq(quickNotes.id, id), eq(quickNotes.userId, userId)))
      .limit(1);
    return note ?? null;
  }

  async createNote(data: {
    userId: string;
    content: string;
    color?: string;
  }): Promise<QuickNote> {
    const [note] = await db
      .insert(quickNotes)
      .values({
        userId: data.userId,
        content: data.content,
        color: data.color,
      } as NewQuickNote)
      .returning();
    return note;
  }

  async updateNote(
    id: string,
    userId: string,
    data: {
      content?: string;
      isPinned?: boolean;
      isArchived?: boolean;
      color?: string;
    }
  ): Promise<QuickNote | null> {
    const [note] = await db
      .update(quickNotes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(quickNotes.id, id), eq(quickNotes.userId, userId)))
      .returning();
    return note ?? null;
  }

  async deleteNote(id: string, userId: string): Promise<boolean> {
    const [result] = await db
      .delete(quickNotes)
      .where(and(eq(quickNotes.id, id), eq(quickNotes.userId, userId)))
      .returning({ id: quickNotes.id });
    return !!result;
  }

  async archiveNote(id: string, userId: string): Promise<QuickNote | null> {
    return this.updateNote(id, userId, { isArchived: true });
  }

  async unarchiveNote(id: string, userId: string): Promise<QuickNote | null> {
    return this.updateNote(id, userId, { isArchived: false });
  }

  async togglePin(id: string, userId: string): Promise<QuickNote | null> {
    const note = await this.getNoteById(id, userId);
    if (!note) return null;
    return this.updateNote(id, userId, { isPinned: !note.isPinned });
  }
}

export const quickNoteService = new QuickNoteService();