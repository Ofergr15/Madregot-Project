import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isMemberApproved, addPendingMember, isAdmin } from "@/lib/members";

interface GoogleTokenPayload {
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
}

async function verifyGoogleToken(
  idToken: string
): Promise<GoogleTokenPayload | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) return null;
    const payload = await res.json();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      return null;
    }

    if (!payload.email_verified) return null;

    return {
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture || "",
      email_verified: payload.email_verified === "true" || payload.email_verified === true,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const credential = formData.get("credential") as string;

    if (!credential) {
      return NextResponse.redirect(new URL("/?error=missing_credential", request.url));
    }

    const payload = await verifyGoogleToken(credential);
    if (!payload) {
      return NextResponse.redirect(new URL("/?error=invalid_token", request.url));
    }

    const { email, name, picture } = payload;

    if (isAdmin(email)) {
      const session = await getSession();
      session.authenticated = true;
      session.email = email;
      session.name = name;
      session.picture = picture;
      session.isAdmin = true;
      await session.save();
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (await isMemberApproved(email)) {
      const session = await getSession();
      session.authenticated = true;
      session.email = email;
      session.name = name;
      session.picture = picture;
      session.isAdmin = false;
      await session.save();
      return NextResponse.redirect(new URL("/upload", request.url));
    }

    await addPendingMember(email, name, picture);
    return NextResponse.redirect(new URL("/?pending=true", request.url));
  } catch {
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
