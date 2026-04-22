import Elysia from "elysia";
import { quickNoteService } from "./quick-note.service";
import { authMiddleware } from "../../middleware/auth.middleware";

export const quickNotePlugin = new Elysia({ prefix: "/api/quick-notes" })
  .onBeforeHandle(authMiddleware())
  .get("/", async ({ user }) => {
    const notes = await quickNoteService.getNotes(user.userId.toString());
    return { success: true, data: notes };
  })
  .get("/archived", async ({ user }) => {
    const notes = await quickNoteService.getArchivedNotes(user.userId.toString());
    return { success: true, data: notes };
  })
  .get("/:id", async ({ user, params }) => {
    const note = await quickNoteService.getNoteById(params.id, user.userId.toString());
    if (!note) {
      return { success: false, error: { code: "NOT_FOUND", message: "Note not found" } };
    }
    return { success: true, data: note };
  })
  .post("/", async ({ user, body }) => {
    const note = await quickNoteService.createNote({
      userId: user.userId.toString(),
      content: body.content,
      color: body.color,
    });
    return { success: true, data: note };
  })
  .patch("/:id", async ({ user, params, body }) => {
    const note = await quickNoteService.updateNote(params.id, user.userId.toString(), {
      content: body.content,
      isPinned: body.isPinned,
      isArchived: body.isArchived,
      color: body.color,
    });
    if (!note) {
      return { success: false, error: { code: "NOT_FOUND", message: "Note not found" } };
    }
    return { success: true, data: note };
  })
  .patch("/:id/toggle-pin", async ({ user, params }) => {
    const note = await quickNoteService.togglePin(params.id, user.userId.toString());
    if (!note) {
      return { success: false, error: { code: "NOT_FOUND", message: "Note not found" } };
    }
    return { success: true, data: note };
  })
  .patch("/:id/archive", async ({ user, params }) => {
    const note = await quickNoteService.archiveNote(params.id, user.userId.toString());
    if (!note) {
      return { success: false, error: { code: "NOT_FOUND", message: "Note not found" } };
    }
    return { success: true, data: note };
  })
  .patch("/:id/unarchive", async ({ user, params }) => {
    const note = await quickNoteService.unarchiveNote(params.id, user.userId.toString());
    if (!note) {
      return { success: false, error: { code: "NOT_FOUND", message: "Note not found" } };
    }
    return { success: true, data: note };
  })
  .delete("/:id", async ({ user, params }) => {
    const deleted = await quickNoteService.deleteNote(params.id, user.userId.toString());
    return { success: deleted };
  });