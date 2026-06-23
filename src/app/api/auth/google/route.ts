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

    // Verify the audience matches our client ID
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
    const body = await request.json();
    const { credential } = body;

    if (!credential || typeof credential !== "string") {
      return NextResponse.json(
        { ok: false, error: "Google credential is required" },
        { status: 400 }
      );
    }

    const payload = await verifyGoogleToken(credential);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Invalid Google token" },
        { status: 401 }
      );
    }

    const { email, name, picture } = payload;

    // Check if admin
    if (isAdmin(email)) {
      const session = await getSession();
      session.authenticated = true;
      session.email = email;
      session.name = name;
      session.picture = picture;
      session.isAdmin = true;
      await session.save();
      return NextResponse.json({ ok: true, isAdmin: true });
    }

    // Check if approved member
    if (await isMemberApproved(email)) {
      const session = await getSession();
      session.authenticated = true;
      session.email = email;
      session.name = name;
      session.picture = picture;
      session.isAdmin = false;
      await session.save();
      return NextResponse.json({ ok: true });
    }

    // Not approved - add as pending
    await addPendingMember(email, name, picture);
    return NextResponse.json({
      ok: false,
      pending: true,
      error: "Your account is pending admin approval",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
