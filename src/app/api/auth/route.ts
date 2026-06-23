import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessCode } = body;

    if (!accessCode || typeof accessCode !== "string") {
      return NextResponse.json(
        { ok: false, error: "Access code is required" },
        { status: 400 }
      );
    }

    const expectedCode = process.env.APP_ACCESS_CODE;
    if (!expectedCode) {
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (accessCode !== expectedCode) {
      return NextResponse.json(
        { ok: false, error: "Invalid access code" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.authenticated = true;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
