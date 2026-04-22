import Elysia from "elysia";
import { snapshotService } from "./snapshot.service";
import { authMiddleware } from "../../middleware/auth.middleware";
import { ValidationError } from "../../shared/errors";

export const snapshotPlugin = new Elysia({ prefix: "/api/snapshots" })
  .onBeforeHandle(authMiddleware())
  .get("/", async ({ user, query }) => {
    const result = await snapshotService.getSnapshots({
      workspaceId: query.workspaceId as string | undefined,
      userId: query.userId as string | undefined,
      fiscalYear: query.fiscalYear ? Number(query.fiscalYear) : undefined,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    return { success: true, ...result };
  })
  .get("/:id", async ({ user, params }) => {
    const snapshot = await snapshotService.getSnapshotById(params.id);
    if (!snapshot) {
      return { success: false, error: { code: "NOT_FOUND", message: "Snapshot not found" } };
    }
    return { success: true, data: snapshot };
  })
  .post("/", async ({ user, request }) => {
    let workspaceId: string | undefined;
    let eventName: string | undefined;
    let evidenceType: string | undefined;
    let takenDate: string | undefined;
    let description: string | undefined;
    let files: File[] = [];

    const formData = await request.formData();

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      } else {
        switch (key) {
          case "workspaceId": workspaceId = value as string; break;
          case "eventName": eventName = value as string; break;
          case "evidenceType": evidenceType = value as string; break;
          case "takenDate": takenDate = value as string; break;
          case "description": description = value as string; break;
        }
      }
    }

    if (!workspaceId || !eventName || !evidenceType || !takenDate) {
      throw new ValidationError("workspaceId, eventName, evidenceType, and takenDate are required");
    }

    if (files.length === 0) {
      throw new ValidationError("At least one image file is required");
    }

    const createdSnapshots = [];

    for (const file of files) {
      const { fileName, filePath, thumbnailPath, fileSize, mimeType } =
        await snapshotService.processAndSaveFile(file, workspaceId!);

      const snapshot = await snapshotService.createSnapshot({
        workspaceId: workspaceId!,
        userId: user.userId.toString(),
        eventName: eventName!,
        evidenceType: evidenceType!,
        takenDate: takenDate!,
        description,
        fileName,
        filePath,
        thumbnailPath,
        fileSize,
        mimeType,
      });

      createdSnapshots.push(snapshot);
    }

    return { success: true, data: createdSnapshots };
  })
  .delete("/:id", async ({ user, params }) => {
    const deleted = await snapshotService.deleteSnapshot(params.id, user.userId.toString());
    return { success: deleted };
  });
