import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/googleDrive";
import { storeTokens } from "@/lib/tokenStore";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/members";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.authenticated || !session.email || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const oauth2Client = getOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    await storeTokens({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
    });

    return NextResponse.redirect(new URL("/setup?connected=true", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/setup?error=auth_failed", request.url));
  }
}
