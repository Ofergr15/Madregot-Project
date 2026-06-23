import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  authenticated: boolean;
  email?: string;
  name?: string;
  picture?: string;
  isAdmin?: boolean;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "fallback-secret-must-be-at-least-32-characters-long",
  cookieName: "running-club-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session.authenticated === true;
}

export async function isAdminSession(): Promise<boolean> {
  const session = await getSession();
  return session.authenticated === true && session.isAdmin === true;
}
