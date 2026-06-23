import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/googleDrive";

export async function GET(request: NextRequest) {
  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
  });

  return NextResponse.redirect(authUrl);
}
