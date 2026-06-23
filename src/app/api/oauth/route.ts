import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/googleDrive";
import { isAdminSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
  });

  return NextResponse.redirect(authUrl);
}
