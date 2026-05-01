import { Elysia } from "elysia";
import { authMiddleware } from "../../middleware/auth.middleware";
import { attachmentController } from "./attachment.controller";
import type { UploadedFile } from "./attachment.service";
import { ValidationError } from "../../shared/errors";

export const attachmentPlugin = new Elysia({ prefix: "/api/attachments" })
  .onBeforeHandle(authMiddleware())
  .post("/", async ({ user, request, set }) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file");
      const workspaceId = formData.get("workspaceId") as string | null;

      console.log("[Attachment Plugin] Raw file from formData:", file, "type:", typeof file);
      console.log("[Attachment Plugin] file keys:", file ? Object.keys(file as object) : []);

      if (!file) {
        throw new ValidationError("No file provided");
      }

      if (!workspaceId) {
        throw new ValidationError("workspaceId is required");
      }

      // Bun formData wraps file in object with metadata: { fieldName, fileName, fileSize, mimeType, file }
      const fileObj = file as any;
      const actualFile = fileObj.file || fileObj;
      const fileName = fileObj.fileName || fileObj.name || "upload";
      const fileSize = fileObj.fileSize || fileObj.size || 0;
      const fileType = fileObj.mimeType || fileObj.type || "application/octet-stream";

      console.log("[Attachment Plugin] Processed file info:", { fileName, fileSize, fileType, actualFileType: typeof actualFile });

      const uploadedFile: UploadedFile = {
        fieldName: "file",
        fileName,
        fileSize,
        mimeType: fileType,
        file: actualFile as File,
      };

      console.log("[Attachment Plugin] user:", user);
      console.log("[Attachment Plugin] user.userId:", user?.userId);

      const result = await attachmentController.upload(uploadedFile, workspaceId, user.userId);

      return { success: true, data: result };
    } catch (err: any) {
      set.status = err.statusCode || 500;
      return { success: false, error: { code: err.code || "UPLOAD_ERROR", message: err.message } };
    }
  })
  .get("/", async ({ user, query }) => {
    return attachmentController.list({
      workspaceId: query.workspaceId as string | undefined,
      userId: query.userId as string | undefined,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  })
  .delete("/:id", async ({ params, user, set }) => {
    try {
      const deleted = await attachmentController.delete(params.id, user.id);
      if (!deleted) {
        set.status = 404;
        return { success: false, error: { code: "NOT_FOUND", message: "Attachment not found" } };
      }
      return { success: true };
    } catch (err: any) {
      set.status = err.statusCode || 500;
      return { success: false, error: { code: err.code || "DELETE_ERROR", message: err.message } };
    }
  });