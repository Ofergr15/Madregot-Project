import { prisma } from "./db";

interface StoredTokens {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const row = await prisma.oAuthToken.findUnique({ where: { id: "singleton" } });
  if (!row) return null;
  return {
    access_token: row.accessToken,
    refresh_token: row.refreshToken,
    expiry_date: Number(row.expiryDate),
  };
}

export async function storeTokens(tokens: StoredTokens): Promise<void> {
  const data = {
    accessToken: tokens.access_token || "",
    refreshToken: tokens.refresh_token || "",
    expiryDate: BigInt(tokens.expiry_date || 0),
  };

  await prisma.oAuthToken.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
}

export async function hasValidTokens(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return !!(tokens?.refresh_token);
}
