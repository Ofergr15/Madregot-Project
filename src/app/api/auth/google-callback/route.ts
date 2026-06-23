import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isMemberApproved, addPendingMember, isAdmin } from "@/lib/members";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=auth_cancelled", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google-callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
    }

    const tokens = await tokenRes.json();

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(new URL("/?error=userinfo_failed", request.url));
    }

    const userInfo = await userInfoRes.json();
    const { email, name, picture } = userInfo;

    if (isAdmin(email)) {
      const session = await getSession();
      session.authenticated = true;
      session.email = email;
      session.name = name || email.split("@")[0];
      session.picture = picture || "";
      session.isAdmin = true;
      await session.save();
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (await isMemberApproved(email)) {
      const session = await getSession();
      session.authenticated = true;
      session.email = email;
      session.name = name || email.split("@")[0];
      session.picture = picture || "";
      session.isAdmin = false;
      await session.save();
      return NextResponse.redirect(new URL("/upload", request.url));
    }

    await addPendingMember(email, name || email.split("@")[0], picture);
    return NextResponse.redirect(new URL("/?pending=true", request.url));
  } catch {
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
