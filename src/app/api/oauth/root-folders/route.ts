import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuth2Client } from "@/lib/googleDrive";
import { getStoredTokens, hasValidTokens } from "@/lib/tokenStore";

export async function GET() {
  if (!(await hasValidTokens())) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const oauth2Client = getOAuth2Client();
  const tokens = await getStoredTokens();
  oauth2Client.setCredentials({
    refresh_token: tokens?.refresh_token,
    access_token: tokens?.access_token,
  });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  try {
    const res = await drive.files.list({
      q: "'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: "files(id, name, webViewLink)",
      orderBy: "name",
      pageSize: 100,
    });

    return NextResponse.json({ folders: res.data.files || [] });
  } catch (error) {
    console.error("Error listing root folders:", error);
    return NextResponse.json(
      { error: "Failed to list folders" },
      { status: 500 }
    );
  }
}
