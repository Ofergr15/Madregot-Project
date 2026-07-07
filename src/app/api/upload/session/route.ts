import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  isFolderInsideRoot,
  findDuplicateByName,
  createResumableUploadSession,
} from "@/lib/googleDrive";
import { isAllowedMimeType, isValidFileSize, sanitizeFileName } from "@/lib/validation";

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
    const { folderId, fileName, mimeType, fileSize } = await request.json();

    if (!folderId || !fileName || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: "folderId, fileName, mimeType, and fileSize are required" },
        { status: 400 }
      );
    }

    if (!isAllowedMimeType(mimeType)) {
      return NextResponse.json(
        { error: `File type not allowed: ${mimeType}` },
        { status: 400 }
      );
    }

    if (!isValidFileSize(fileSize)) {
      return NextResponse.json(
        { error: "File size exceeds limit" },
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

    const sanitizedName = sanitizeFileName(fileName);

    const duplicateId = await findDuplicateByName(folderId, sanitizedName);
    if (duplicateId) {
      return NextResponse.json(
        { skipped: true, reason: "duplicate", fileName: sanitizedName },
        { status: 200 }
      );
    }

    const uploadUrl = await createResumableUploadSession(
      folderId,
      sanitizedName,
      mimeType,
      fileSize
    );

    return NextResponse.json({ uploadUrl, fileName: sanitizedName });
  } catch (error: any) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create upload session" },
      { status: 500 }
    );
  }
}
