import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

import { getSession } from "@/lib/auth";
import { POST } from "@/app/api/auth/route";

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, APP_ACCESS_CODE: "secret123" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 200 with ok:true for valid access code", async () => {
    const mockSession = { authenticated: false, save: jest.fn() };
    mockGetSession.mockResolvedValue(mockSession as any);

    const response = await POST(createRequest({ accessCode: "secret123" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockSession.authenticated).toBe(true);
    expect(mockSession.save).toHaveBeenCalled();
  });

  it("returns 401 for invalid access code", async () => {
    const response = await POST(createRequest({ accessCode: "wrong" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Invalid access code");
  });

  it("returns 400 when accessCode is missing", async () => {
    const response = await POST(createRequest({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Access code is required");
  });

  it("returns 400 when accessCode is empty string", async () => {
    const response = await POST(createRequest({ accessCode: "" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Access code is required");
  });

  it("returns 400 when accessCode is not a string", async () => {
    const response = await POST(createRequest({ accessCode: 12345 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Access code is required");
  });

  it("returns 400 when accessCode is null", async () => {
    const response = await POST(createRequest({ accessCode: null }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Access code is required");
  });

  it("returns 500 when APP_ACCESS_CODE env is not set", async () => {
    delete process.env.APP_ACCESS_CODE;

    const response = await POST(createRequest({ accessCode: "anything" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Server configuration error");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Invalid request");
  });

  it("is case-sensitive for access code comparison", async () => {
    process.env.APP_ACCESS_CODE = "Secret123";

    const response = await POST(createRequest({ accessCode: "secret123" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid access code");
  });

  it("handles whitespace in access code (does not trim)", async () => {
    process.env.APP_ACCESS_CODE = "secret123";

    const response = await POST(createRequest({ accessCode: " secret123 " }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid access code");
  });
});
