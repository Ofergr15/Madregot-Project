import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  listChildFolders,
  createFolder,
  isFolderInsideRoot,
  getFolder,
} from "@/lib/googleDrive";
import { isValidFolderName } from "@/lib/validation";

export async function GET(request: NextRequest) {
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

  const parentId =
    request.nextUrl.searchParams.get("parentId") || rootFolderId;

  if (parentId !== rootFolderId) {
    const isInside = await isFolderInsideRoot(parentId, rootFolderId);
    if (!isInside) {
      return NextResponse.json(
        { error: "Access denied: folder is outside allowed root" },
        { status: 403 }
      );
    }
  }

  try {
    const folders = await listChildFolders(parentId);
    const currentFolder = await getFolder(parentId);
    return NextResponse.json({
      folders,
      currentFolder,
      isRoot: parentId === rootFolderId,
      rootFolderId,
    });
  } catch (error: any) {
    console.error("Error listing folders:", error);
    return NextResponse.json(
      { error: "Failed to list folders", detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const { parentId, name } = body;

    if (!parentId || !name) {
      return NextResponse.json(
        { error: "parentId and name are required" },
        { status: 400 }
      );
    }

    if (!isValidFolderName(name)) {
      return NextResponse.json(
        { error: "Invalid folder name" },
        { status: 400 }
      );
    }

    if (parentId !== rootFolderId) {
      const isInside = await isFolderInsideRoot(parentId, rootFolderId);
      if (!isInside) {
        return NextResponse.json(
          { error: "Access denied: folder is outside allowed root" },
          { status: 403 }
        );
      }
    }

    const folder = await createFolder(parentId, name.trim());
    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
