import { prisma } from "./db";
import { MemberStatus, MemberRole } from "@/generated/prisma/client";

export interface Member {
  email: string;
  name: string;
  picture?: string;
  approved: boolean;
  role: "MEMBER" | "ADMIN";
  addedAt: string;
}

function toMember(row: { email: string; name: string | null; picture: string | null; status: MemberStatus; role: MemberRole; createdAt: Date }): Member {
  return {
    email: row.email,
    name: row.name || row.email,
    picture: row.picture || undefined,
    approved: row.status === "APPROVED",
    role: row.role,
    addedAt: row.createdAt.toISOString(),
  };
}

export async function getMembers(): Promise<Member[]> {
  const rows = await prisma.member.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toMember);
}

export async function getApprovedMembers(): Promise<Member[]> {
  const rows = await prisma.member.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toMember);
}

export async function getPendingMembers(): Promise<Member[]> {
  const rows = await prisma.member.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toMember);
}

export async function isMemberApproved(email: string): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: { email: email.toLowerCase() },
  });
  return member?.status === "APPROVED";
}

export async function addPendingMember(
  email: string,
  name: string,
  picture?: string
): Promise<Member> {
  const row = await prisma.member.upsert({
    where: { email: email.toLowerCase() },
    update: { name, ...(picture && { picture }) },
    create: {
      email: email.toLowerCase(),
      name,
      picture,
      status: "PENDING",
    },
  });
  return toMember(row);
}

export async function approveMember(email: string): Promise<boolean> {
  try {
    await prisma.member.update({
      where: { email: email.toLowerCase() },
      data: { status: "APPROVED" },
    });
    return true;
  } catch {
    return false;
  }
}

export async function denyMember(email: string): Promise<boolean> {
  try {
    await prisma.member.update({
      where: { email: email.toLowerCase() },
      data: { status: "DENIED" },
    });
    return true;
  } catch {
    return false;
  }
}

export async function removeMember(email: string): Promise<boolean> {
  try {
    await prisma.member.delete({
      where: { email: email.toLowerCase() },
    });
    return true;
  } catch {
    return false;
  }
}

export function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}
