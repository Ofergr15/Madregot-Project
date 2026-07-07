export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const uploadUrl = request.headers.get("x-upload-url");
    const offset = parseInt(request.headers.get("x-chunk-offset") || "0", 10);
    const totalSize = parseInt(request.headers.get("x-total-size") || "0", 10);
    const mimeType = request.headers.get("x-mime-type") || "application/octet-stream";

    if (!uploadUrl || !totalSize) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await request.arrayBuffer());
    const end = offset + buffer.length;
    const isLast = end >= totalSize;

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Content-Range": `bytes ${offset}-${end - 1}/${totalSize}`,
      },
      body: buffer,
    });

    if (isLast && (res.status === 200 || res.status === 201)) {
      return NextResponse.json({ done: true });
    }

    if (!isLast && (res.status === 200 || res.status === 201 || res.status === 308)) {
      return NextResponse.json({ done: false, offset: end });
    }

    const errText = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Upload failed (${res.status}): ${errText.slice(0, 200)}` },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Chunk upload failed" },
      { status: 500 }
    );
  }
}
