import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/googleDrive";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/members";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.authenticated || !session.email || !isAdmin(session.email)) {
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
