import { NextResponse } from "next/server";
import { hasValidTokens } from "@/lib/tokenStore";

export async function GET() {
  return NextResponse.json({
    connected: await hasValidTokens(),
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null,
  });
}
