jest.mock("@/lib/db", () => ({
  prisma: {
    oAuthToken: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { getStoredTokens, storeTokens, hasValidTokens } from "@/lib/tokenStore";

const mockFindUnique = prisma.oAuthToken.findUnique as jest.MockedFunction<typeof prisma.oAuthToken.findUnique>;
const mockUpsert = prisma.oAuthToken.upsert as jest.MockedFunction<typeof prisma.oAuthToken.upsert>;

describe("tokenStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStoredTokens", () => {
    it("returns null when no token row exists", async () => {
      mockFindUnique.mockResolvedValue(null);
      expect(await getStoredTokens()).toBeNull();
    });

    it("returns parsed tokens when row exists", async () => {
      mockFindUnique.mockResolvedValue({
        id: "singleton",
        accessToken: "access123",
        refreshToken: "refresh456",
        expiryDate: BigInt(1700000000000),
        updatedAt: new Date(),
      } as never);

      const result = await getStoredTokens();
      expect(result).toEqual({
        access_token: "access123",
        refresh_token: "refresh456",
        expiry_date: 1700000000000,
      });
    });
  });

  describe("storeTokens", () => {
    it("upserts token row", async () => {
      mockUpsert.mockResolvedValue({} as never);

      await storeTokens({
        access_token: "new_access",
        refresh_token: "new_refresh",
        expiry_date: 2000,
      });

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: "singleton" },
        update: {
          accessToken: "new_access",
          refreshToken: "new_refresh",
          expiryDate: BigInt(2000),
        },
        create: {
          id: "singleton",
          accessToken: "new_access",
          refreshToken: "new_refresh",
          expiryDate: BigInt(2000),
        },
      });
    });

    it("handles missing fields with defaults", async () => {
      mockUpsert.mockResolvedValue({} as never);

      await storeTokens({});

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: "singleton" },
        update: {
          accessToken: "",
          refreshToken: "",
          expiryDate: BigInt(0),
        },
        create: {
          id: "singleton",
          accessToken: "",
          refreshToken: "",
          expiryDate: BigInt(0),
        },
      });
    });
  });

  describe("hasValidTokens", () => {
    it("returns true when refresh_token exists", async () => {
      mockFindUnique.mockResolvedValue({
        id: "singleton",
        accessToken: "access",
        refreshToken: "valid_refresh",
        expiryDate: BigInt(9999),
        updatedAt: new Date(),
      } as never);

      expect(await hasValidTokens()).toBe(true);
    });

    it("returns false when no row exists", async () => {
      mockFindUnique.mockResolvedValue(null);
      expect(await hasValidTokens()).toBe(false);
    });

    it("returns false when refresh_token is empty string", async () => {
      mockFindUnique.mockResolvedValue({
        id: "singleton",
        accessToken: "access",
        refreshToken: "",
        expiryDate: BigInt(9999),
        updatedAt: new Date(),
      } as never);

      expect(await hasValidTokens()).toBe(false);
    });
  });
});
