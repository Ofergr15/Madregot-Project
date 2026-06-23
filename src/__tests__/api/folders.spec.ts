import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  isAuthenticated: jest.fn(),
}));

jest.mock("@/lib/googleDrive", () => ({
  listChildFolders: jest.fn(),
  createFolder: jest.fn(),
  isFolderInsideRoot: jest.fn(),
  getFolder: jest.fn(),
}));

import { isAuthenticated } from "@/lib/auth";
import {
  listChildFolders,
  createFolder,
  isFolderInsideRoot,
  getFolder,
} from "@/lib/googleDrive";
import { GET, POST } from "@/app/api/folders/route";

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<
  typeof isAuthenticated
>;
const mockListChildFolders = listChildFolders as jest.MockedFunction<
  typeof listChildFolders
>;
const mockCreateFolder = createFolder as jest.MockedFunction<
  typeof createFolder
>;
const mockIsFolderInsideRoot = isFolderInsideRoot as jest.MockedFunction<
  typeof isFolderInsideRoot
>;
const mockGetFolder = getFolder as jest.MockedFunction<typeof getFolder>;

describe("GET /api/folders", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_DRIVE_ROOT_FOLDER_ID: "root-folder-123",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 when not authenticated", async () => {
    mockIsAuthenticated.mockResolvedValue(false);
    const request = new NextRequest("http://localhost:3000/api/folders");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 500 when root folder ID is not configured", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    const request = new NextRequest("http://localhost:3000/api/folders");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
  });

  it("lists folders in root when no parentId given", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const mockFolders = [
      {
        id: "f1",
        name: "Folder 1",
        createdTime: "2024-01-01",
        modifiedTime: "2024-01-02",
        webViewLink: "https://link1",
      },
    ];
    mockListChildFolders.mockResolvedValue(mockFolders);
    mockGetFolder.mockResolvedValue({
      id: "root-folder-123",
      name: "Root",
      createdTime: "",
      modifiedTime: "",
      webViewLink: "",
    });

    const request = new NextRequest("http://localhost:3000/api/folders");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.folders).toEqual(mockFolders);
    expect(data.isRoot).toBe(true);
    expect(mockListChildFolders).toHaveBeenCalledWith("root-folder-123");
  });

  it("lists folders in sub-folder when parentId provided and valid", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockListChildFolders.mockResolvedValue([]);
    mockGetFolder.mockResolvedValue({
      id: "sub-folder",
      name: "Sub",
      createdTime: "",
      modifiedTime: "",
      webViewLink: "",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/folders?parentId=sub-folder"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isRoot).toBe(false);
    expect(mockIsFolderInsideRoot).toHaveBeenCalledWith(
      "sub-folder",
      "root-folder-123"
    );
  });

  it("returns 403 when parentId is outside root", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost:3000/api/folders?parentId=outside-folder"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Access denied: folder is outside allowed root");
  });

  it("does not check isFolderInsideRoot when parentId equals root", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockListChildFolders.mockResolvedValue([]);
    mockGetFolder.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/folders?parentId=root-folder-123"
    );
    await GET(request);

    expect(mockIsFolderInsideRoot).not.toHaveBeenCalled();
  });

  it("returns 500 when listChildFolders throws", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockListChildFolders.mockRejectedValue(new Error("Drive API error"));

    const request = new NextRequest("http://localhost:3000/api/folders");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to list folders");
  });
});

describe("POST /api/folders", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_DRIVE_ROOT_FOLDER_ID: "root-folder-123",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function createPostRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not authenticated", async () => {
    mockIsAuthenticated.mockResolvedValue(false);

    const response = await POST(
      createPostRequest({ parentId: "root-folder-123", name: "Test" })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 500 when root folder ID not configured", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    const response = await POST(
      createPostRequest({ parentId: "some-id", name: "Test" })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
  });

  it("returns 400 when parentId is missing", async () => {
    mockIsAuthenticated.mockResolvedValue(true);

    const response = await POST(createPostRequest({ name: "Test" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("parentId and name are required");
  });

  it("returns 400 when name is missing", async () => {
    mockIsAuthenticated.mockResolvedValue(true);

    const response = await POST(
      createPostRequest({ parentId: "root-folder-123" })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("parentId and name are required");
  });

  it("returns 400 for invalid folder name", async () => {
    mockIsAuthenticated.mockResolvedValue(true);

    const response = await POST(
      createPostRequest({ parentId: "root-folder-123", name: "folder<invalid" })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid folder name");
  });

  it("returns 400 for folder name that is just dots", async () => {
    mockIsAuthenticated.mockResolvedValue(true);

    const response = await POST(
      createPostRequest({ parentId: "root-folder-123", name: ".." })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid folder name");
  });

  it("returns 403 when parent folder is outside root", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(false);

    const response = await POST(
      createPostRequest({ parentId: "outside-folder", name: "New Folder" })
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Access denied: folder is outside allowed root");
  });

  it("creates folder successfully when all inputs valid", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    const newFolder = {
      id: "new-folder-id",
      name: "Morning Run",
      createdTime: "2024-06-01",
      modifiedTime: "2024-06-01",
      webViewLink: "https://drive.google.com/new",
    };
    mockCreateFolder.mockResolvedValue(newFolder);

    const response = await POST(
      createPostRequest({ parentId: "root-folder-123", name: "Morning Run" })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(newFolder);
    expect(mockCreateFolder).toHaveBeenCalledWith(
      "root-folder-123",
      "Morning Run"
    );
  });

  it("trims folder name before creating", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockCreateFolder.mockResolvedValue({
      id: "id",
      name: "Trimmed",
      createdTime: "",
      modifiedTime: "",
      webViewLink: "",
    });

    await POST(
      createPostRequest({ parentId: "root-folder-123", name: "  Trimmed  " })
    );

    expect(mockCreateFolder).toHaveBeenCalledWith("root-folder-123", "Trimmed");
  });

  it("does not check isFolderInsideRoot when parentId is root", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockCreateFolder.mockResolvedValue({
      id: "id",
      name: "x",
      createdTime: "",
      modifiedTime: "",
      webViewLink: "",
    });

    await POST(
      createPostRequest({ parentId: "root-folder-123", name: "Valid Name" })
    );

    expect(mockIsFolderInsideRoot).not.toHaveBeenCalled();
  });

  it("returns 500 when createFolder throws", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockCreateFolder.mockRejectedValue(new Error("Drive error"));

    const response = await POST(
      createPostRequest({ parentId: "root-folder-123", name: "New Folder" })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create folder");
  });
});
