jest.mock("googleapis", () => {
  const mockDrive = {
    files: {
      list: jest.fn(),
      create: jest.fn(),
      get: jest.fn(),
    },
  };

  const mockOAuth2Client = {
    setCredentials: jest.fn(),
    on: jest.fn(),
  };

  return {
    google: {
      auth: {
        OAuth2: jest.fn(() => mockOAuth2Client),
      },
      drive: jest.fn(() => mockDrive),
    },
  };
});

jest.mock("@/lib/tokenStore", () => ({
  getStoredTokens: jest.fn(),
  storeTokens: jest.fn(),
}));

import { google } from "googleapis";
import { getStoredTokens } from "@/lib/tokenStore";
import {
  getOAuth2Client,
  listChildFolders,
  createFolder,
  getFolder,
  isFolderInsideRoot,
  findDuplicateByName,
  uploadFileToFolder,
  getFolderWebViewLink,
} from "@/lib/googleDrive";

const mockGetStoredTokens = getStoredTokens as jest.MockedFunction<
  typeof getStoredTokens
>;

function getMockDrive() {
  return (google.drive as jest.Mock)();
}

describe("googleDrive", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      GOOGLE_REDIRECT_URI: "http://localhost:3000/callback",
      GOOGLE_REFRESH_TOKEN: "env-refresh-token",
    };
    mockGetStoredTokens.mockResolvedValue({
      refresh_token: "stored-refresh-token",
      access_token: "stored-access-token",
      expiry_date: 9999999999999,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getOAuth2Client", () => {
    it("creates OAuth2 client with env credentials", () => {
      const client = getOAuth2Client();
      expect(google.auth.OAuth2).toHaveBeenCalledWith(
        "test-client-id",
        "test-client-secret",
        "http://localhost:3000/callback"
      );
      expect(client).toBeDefined();
    });
  });

  describe("listChildFolders", () => {
    it("returns folders from Drive API response", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({
        data: {
          files: [
            {
              id: "folder1",
              name: "Folder 1",
              createdTime: "2024-01-01T00:00:00Z",
              modifiedTime: "2024-01-02T00:00:00Z",
              webViewLink: "https://drive.google.com/folder1",
            },
            {
              id: "folder2",
              name: "Folder 2",
              createdTime: "2024-02-01T00:00:00Z",
              modifiedTime: "2024-02-02T00:00:00Z",
              webViewLink: "https://drive.google.com/folder2",
            },
          ],
        },
      });

      const result = await listChildFolders("parent-id");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "folder1",
        name: "Folder 1",
        createdTime: "2024-01-01T00:00:00Z",
        modifiedTime: "2024-01-02T00:00:00Z",
        webViewLink: "https://drive.google.com/folder1",
      });
      expect(result[1].id).toBe("folder2");
    });

    it("returns empty array when no files in response", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({
        data: { files: [] },
      });

      const result = await listChildFolders("parent-id");
      expect(result).toEqual([]);
    });

    it("returns empty array when files is null/undefined", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({
        data: { files: null },
      });

      const result = await listChildFolders("parent-id");
      expect(result).toEqual([]);
    });

    it("handles missing optional fields with empty strings", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({
        data: {
          files: [
            {
              id: "folder1",
              name: "Folder 1",
              createdTime: null,
              modifiedTime: null,
              webViewLink: null,
            },
          ],
        },
      });

      const result = await listChildFolders("parent-id");
      expect(result[0].createdTime).toBe("");
      expect(result[0].modifiedTime).toBe("");
      expect(result[0].webViewLink).toBe("");
    });

    it("queries with correct folder MIME type filter", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

      await listChildFolders("my-parent");

      expect(mockDrive.files.list).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "'my-parent' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          orderBy: "name",
          pageSize: 200,
        })
      );
    });
  });

  describe("createFolder", () => {
    it("creates a folder and returns folder info", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.create.mockResolvedValue({
        data: {
          id: "new-folder-id",
          name: "New Folder",
          createdTime: "2024-06-01T00:00:00Z",
          modifiedTime: "2024-06-01T00:00:00Z",
          webViewLink: "https://drive.google.com/new-folder",
        },
      });

      const result = await createFolder("parent-id", "New Folder");

      expect(result).toEqual({
        id: "new-folder-id",
        name: "New Folder",
        createdTime: "2024-06-01T00:00:00Z",
        modifiedTime: "2024-06-01T00:00:00Z",
        webViewLink: "https://drive.google.com/new-folder",
      });
    });

    it("calls Drive API with correct parameters", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.create.mockResolvedValue({
        data: { id: "x", name: "y", createdTime: "", modifiedTime: "", webViewLink: "" },
      });

      await createFolder("parent-123", "My Folder");

      expect(mockDrive.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            name: "My Folder",
            mimeType: "application/vnd.google-apps.folder",
            parents: ["parent-123"],
          },
        })
      );
    });
  });

  describe("getFolder", () => {
    it("returns folder info for valid folder", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockResolvedValue({
        data: {
          id: "folder-id",
          name: "Test Folder",
          createdTime: "2024-01-01T00:00:00Z",
          modifiedTime: "2024-01-02T00:00:00Z",
          webViewLink: "https://drive.google.com/test",
          trashed: false,
        },
      });

      const result = await getFolder("folder-id");
      expect(result).toEqual({
        id: "folder-id",
        name: "Test Folder",
        createdTime: "2024-01-01T00:00:00Z",
        modifiedTime: "2024-01-02T00:00:00Z",
        webViewLink: "https://drive.google.com/test",
      });
    });

    it("returns null for trashed folder", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockResolvedValue({
        data: {
          id: "folder-id",
          name: "Trashed Folder",
          trashed: true,
        },
      });

      const result = await getFolder("folder-id");
      expect(result).toBeNull();
    });

    it("returns null when API throws error", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockRejectedValue(new Error("Not found"));

      const result = await getFolder("nonexistent-id");
      expect(result).toBeNull();
    });
  });

  describe("isFolderInsideRoot", () => {
    it("returns true when folderId equals rootFolderId", async () => {
      const result = await isFolderInsideRoot("root-123", "root-123");
      expect(result).toBe(true);
    });

    it("returns true when rootFolderId is 'root'", async () => {
      const result = await isFolderInsideRoot("any-folder", "root");
      expect(result).toBe(true);
    });

    it("returns true when folder is direct child of root", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockResolvedValue({
        data: { id: "child-folder", parents: ["root-folder"] },
      });

      const result = await isFolderInsideRoot("child-folder", "root-folder");
      expect(result).toBe(true);
    });

    it("returns true when folder is nested inside root", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get
        .mockResolvedValueOnce({
          data: { id: "grandchild", parents: ["child"] },
        })
        .mockResolvedValueOnce({
          data: { id: "child", parents: ["root-folder"] },
        });

      const result = await isFolderInsideRoot("grandchild", "root-folder");
      expect(result).toBe(true);
    });

    it("returns false when folder has no parents", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockResolvedValue({
        data: { id: "orphan-folder", parents: null },
      });

      const result = await isFolderInsideRoot("orphan-folder", "root-folder");
      expect(result).toBe(false);
    });

    it("returns false when folder is outside root hierarchy", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get
        .mockResolvedValueOnce({
          data: { id: "outside-folder", parents: ["other-parent"] },
        })
        .mockResolvedValueOnce({
          data: { id: "other-parent", parents: [] },
        });

      const result = await isFolderInsideRoot("outside-folder", "root-folder");
      expect(result).toBe(false);
    });

    it("returns false when API throws error", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockRejectedValue(new Error("API error"));

      const result = await isFolderInsideRoot("folder-id", "root-folder");
      expect(result).toBe(false);
    });
  });

  describe("findDuplicateByName", () => {
    it("returns file id when duplicate exists", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({
        data: { files: [{ id: "existing-file-id" }] },
      });

      const result = await findDuplicateByName("folder-id", "photo.jpg");
      expect(result).toBe("existing-file-id");
    });

    it("returns null when no duplicate exists", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({
        data: { files: [] },
      });

      const result = await findDuplicateByName("folder-id", "photo.jpg");
      expect(result).toBeNull();
    });

    it("returns null when files is null", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({
        data: { files: null },
      });

      const result = await findDuplicateByName("folder-id", "photo.jpg");
      expect(result).toBeNull();
    });

    it("escapes single quotes in filename", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

      await findDuplicateByName("folder-id", "it's a photo.jpg");

      expect(mockDrive.files.list).toHaveBeenCalledWith(
        expect.objectContaining({
          q: expect.stringContaining("it\\'s a photo.jpg"),
        })
      );
    });

    it("escapes backslashes in filename", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

      await findDuplicateByName("folder-id", "back\\slash.jpg");

      expect(mockDrive.files.list).toHaveBeenCalledWith(
        expect.objectContaining({
          q: expect.stringContaining("back\\\\slash.jpg"),
        })
      );
    });
  });

  describe("uploadFileToFolder", () => {
    it("uploads file and returns result", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.create.mockResolvedValue({
        data: {
          id: "uploaded-file-id",
          name: "photo.jpg",
          webViewLink: "https://drive.google.com/uploaded",
        },
      });

      const buffer = Buffer.from("fake-file-content");
      const result = await uploadFileToFolder(
        "folder-id",
        "photo.jpg",
        "image/jpeg",
        buffer
      );

      expect(result).toEqual({
        id: "uploaded-file-id",
        name: "photo.jpg",
        webViewLink: "https://drive.google.com/uploaded",
      });
    });

    it("calls API with correct folder and filename", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.create.mockResolvedValue({
        data: { id: "x", name: "y", webViewLink: "" },
      });

      const buffer = Buffer.from("content");
      await uploadFileToFolder("target-folder", "video.mp4", "video/mp4", buffer);

      expect(mockDrive.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            name: "video.mp4",
            parents: ["target-folder"],
          },
          media: expect.objectContaining({
            mimeType: "video/mp4",
          }),
        })
      );
    });

    it("handles missing webViewLink", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.create.mockResolvedValue({
        data: { id: "id", name: "name", webViewLink: null },
      });

      const buffer = Buffer.from("content");
      const result = await uploadFileToFolder(
        "folder",
        "file.jpg",
        "image/jpeg",
        buffer
      );
      expect(result.webViewLink).toBe("");
    });
  });

  describe("getFolderWebViewLink", () => {
    it("returns webViewLink from folder", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockResolvedValue({
        data: {
          id: "folder-id",
          name: "Folder",
          webViewLink: "https://drive.google.com/custom-link",
          trashed: false,
          createdTime: "",
          modifiedTime: "",
        },
      });

      const result = await getFolderWebViewLink("folder-id");
      expect(result).toBe("https://drive.google.com/custom-link");
    });

    it("returns fallback URL when folder not found", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockRejectedValue(new Error("Not found"));

      const result = await getFolderWebViewLink("folder-id");
      expect(result).toBe("https://drive.google.com/drive/folders/folder-id");
    });

    it("returns fallback URL when folder is trashed", async () => {
      const mockDrive = getMockDrive();
      mockDrive.files.get.mockResolvedValue({
        data: { id: "folder-id", name: "x", trashed: true },
      });

      const result = await getFolderWebViewLink("folder-id");
      expect(result).toBe("https://drive.google.com/drive/folders/folder-id");
    });
  });
});
