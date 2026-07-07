import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { getStoredTokens, storeTokens } from "./tokenStore";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getDriveClient(): Promise<drive_v3.Drive> {
  const oauth2Client = getOAuth2Client();

  const storedTokens = await getStoredTokens();
  const refreshToken =
    storedTokens?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error("Google Drive not connected. Please complete setup at /setup");
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: storedTokens?.access_token,
    expiry_date: storedTokens?.expiry_date,
  });

  oauth2Client.on("tokens", (tokens) => {
    storeTokens({
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    });
  });

  return google.drive({
    version: "v3",
    auth: oauth2Client,
  });
}

export interface FolderInfo {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
}

export async function listChildFolders(parentId: string): Promise<FolderInfo[]> {
  const drive = await getDriveClient();
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name, createdTime, modifiedTime, webViewLink)",
    orderBy: "name",
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (res.data.files || []).map((f) => ({
    id: f.id!,
    name: f.name!,
    createdTime: f.createdTime || "",
    modifiedTime: f.modifiedTime || "",
    webViewLink: f.webViewLink || "",
  }));
}

export async function createFolder(
  parentId: string,
  name: string
): Promise<FolderInfo> {
  const drive = await getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, name, createdTime, modifiedTime, webViewLink",
    supportsAllDrives: true,
  });

  return {
    id: res.data.id!,
    name: res.data.name!,
    createdTime: res.data.createdTime || "",
    modifiedTime: res.data.modifiedTime || "",
    webViewLink: res.data.webViewLink || "",
  };
}

export async function getFolder(folderId: string): Promise<FolderInfo | null> {
  const drive = await getDriveClient();
  try {
    const res = await drive.files.get({
      fileId: folderId,
      fields: "id, name, createdTime, modifiedTime, webViewLink, parents, trashed",
      supportsAllDrives: true,
    });

    if (res.data.trashed) return null;

    return {
      id: res.data.id!,
      name: res.data.name!,
      createdTime: res.data.createdTime || "",
      modifiedTime: res.data.modifiedTime || "",
      webViewLink: res.data.webViewLink || "",
    };
  } catch {
    return null;
  }
}

export async function isFolderInsideRoot(
  folderId: string,
  rootFolderId: string
): Promise<boolean> {
  if (folderId === rootFolderId) return true;
  if (rootFolderId === "root") return true;

  const drive = await getDriveClient();
  let currentId = folderId;
  const maxDepth = 20;

  for (let i = 0; i < maxDepth; i++) {
    try {
      const res = await drive.files.get({
        fileId: currentId,
        fields: "id, parents",
        supportsAllDrives: true,
      });

      const parents = res.data.parents;
      if (!parents || parents.length === 0) return false;

      const parentId = parents[0];
      if (parentId === rootFolderId) return true;

      currentId = parentId;
    } catch {
      return false;
    }
  }

  return false;
}

export async function findDuplicateByName(
  folderId: string,
  fileName: string
): Promise<string | null> {
  const drive = await getDriveClient();
  const escapedName = fileName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '${escapedName}' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }
  return null;
}

export interface UploadResult {
  id: string;
  name: string;
  webViewLink: string;
}

export async function uploadFileToFolder(
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<UploadResult> {
  const drive = await getDriveClient();

  const readable = new Readable();
  readable.push(fileBuffer);
  readable.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: readable,
    },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return {
    id: res.data.id!,
    name: res.data.name!,
    webViewLink: res.data.webViewLink || "",
  };
}

export async function getFolderWebViewLink(folderId: string): Promise<string> {
  const folder = await getFolder(folderId);
  if (folder?.webViewLink) return folder.webViewLink;
  return `https://drive.google.com/drive/folders/${folderId}`;
}
