import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasValidTokens, getStoredTokens } from "@/lib/tokenStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const hasTokens = await hasValidTokens();
  const tokens = await getStoredTokens();
  const rootFolder = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "NOT SET";
  const hasRefreshEnv = !!process.env.GOOGLE_REFRESH_TOKEN;

  return NextResponse.json({
    session: {
      authenticated: session.authenticated,
      email: session.email,
      isAdmin: session.isAdmin,
    },
    drive: {
      hasDbTokens: hasTokens,
      hasRefreshInDb: !!tokens?.refresh_token,
      hasRefreshEnv,
      rootFolderId: rootFolder,
    },
  });
}
