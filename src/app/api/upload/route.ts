export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  isFolderInsideRoot,
  findDuplicateByName,
  uploadFileToFolder,
  getFolderWebViewLink,
} from "@/lib/googleDrive";
import {
  isAllowedMimeType,
  isValidFileSize,
  sanitizeFileName,
  getMaxFileSizeBytes,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const folderId = formData.get("folderId") as string;
    const files = formData.getAll("files") as File[];

    if (!folderId) {
      return NextResponse.json(
        { error: "folderId is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      );
    }

    if (folderId !== rootFolderId) {
      const isInside = await isFolderInsideRoot(folderId, rootFolderId);
      if (!isInside) {
        return NextResponse.json(
          { error: "Access denied: folder is outside allowed root" },
          { status: 403 }
        );
      }
    }

    const uploaded: Array<{
      originalName: string;
      driveFileId: string;
      webViewLink: string;
    }> = [];
    const skipped: Array<{ originalName: string; reason: string }> = [];
    const failed: Array<{ originalName: string; reason: string }> = [];

    const maxSize = getMaxFileSizeBytes();

    for (const file of files) {
      const originalName = sanitizeFileName(file.name);

      if (!isAllowedMimeType(file.type)) {
        failed.push({
          originalName,
          reason: `File type not allowed: ${file.type}`,
        });
        continue;
      }

      if (!isValidFileSize(file.size)) {
        failed.push({
          originalName,
          reason: `File size exceeds limit (max ${maxSize / 1024 / 1024}MB)`,
        });
        continue;
      }

      try {
        const duplicateId = await findDuplicateByName(folderId, originalName);
        if (duplicateId) {
          skipped.push({ originalName, reason: "duplicate" });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToFolder(
          folderId,
          originalName,
          file.type,
          buffer
        );

        uploaded.push({
          originalName,
          driveFileId: result.id,
          webViewLink: result.webViewLink,
        });
      } catch (error) {
        console.error(`Failed to upload ${originalName}:`, error);
        failed.push({
          originalName,
          reason: "Upload failed",
        });
      }
    }

    const destinationFolderLink = await getFolderWebViewLink(folderId);

    return NextResponse.json({
      uploaded,
      skipped,
      failed,
      destinationFolderLink,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

