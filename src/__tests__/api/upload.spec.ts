import { NextRequest } from "next/server";

jest.mock("@/lib/auth", () => ({
  isAuthenticated: jest.fn(),
}));

jest.mock("@/lib/googleDrive", () => ({
  isFolderInsideRoot: jest.fn(),
  findDuplicateByName: jest.fn(),
  uploadFileToFolder: jest.fn(),
  getFolderWebViewLink: jest.fn(),
}));

jest.mock("@/lib/validation", () => {
  const actual = jest.requireActual("@/lib/validation");
  return {
    ...actual,
    isValidFileSize: jest.fn(actual.isValidFileSize),
  };
});

import { isAuthenticated } from "@/lib/auth";
import {
  isFolderInsideRoot,
  findDuplicateByName,
  uploadFileToFolder,
  getFolderWebViewLink,
} from "@/lib/googleDrive";
import { isValidFileSize } from "@/lib/validation";
import { POST } from "@/app/api/upload/route";

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<
  typeof isAuthenticated
>;
const mockIsFolderInsideRoot = isFolderInsideRoot as jest.MockedFunction<
  typeof isFolderInsideRoot
>;
const mockFindDuplicateByName = findDuplicateByName as jest.MockedFunction<
  typeof findDuplicateByName
>;
const mockUploadFileToFolder = uploadFileToFolder as jest.MockedFunction<
  typeof uploadFileToFolder
>;
const mockGetFolderWebViewLink = getFolderWebViewLink as jest.MockedFunction<
  typeof getFolderWebViewLink
>;
const mockIsValidFileSize = isValidFileSize as jest.MockedFunction<
  typeof isValidFileSize
>;

function createFormDataRequest(
  fields: Record<string, string>,
  files: Array<{ name: string; type: string; content: string }>
): NextRequest {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  for (const file of files) {
    const blob = new Blob([file.content], { type: file.type });
    formData.append("files", blob, file.name);
  }

  return new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsValidFileSize.mockImplementation(
      (size: number) => size > 0 && size <= 10 * 1024 * 1024
    );
    process.env = {
      ...originalEnv,
      GOOGLE_DRIVE_ROOT_FOLDER_ID: "root-folder-123",
      MAX_FILE_SIZE_MB: "10",
    };
    mockGetFolderWebViewLink.mockResolvedValue(
      "https://drive.google.com/drive/folders/target-folder"
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 when not authenticated", async () => {
    mockIsAuthenticated.mockResolvedValue(false);
    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "photo.jpg", type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 500 when root folder ID not configured", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "photo.jpg", type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
  });

  it("returns 400 when folderId is missing", async () => {
    mockIsAuthenticated.mockResolvedValue(true);

    const request = createFormDataRequest(
      {},
      [{ name: "photo.jpg", type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("folderId is required");
  });

  it("returns 400 when no files provided", async () => {
    mockIsAuthenticated.mockResolvedValue(true);

    const request = createFormDataRequest({ folderId: "target-folder" }, []);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("At least one file is required");
  });

  it("returns 403 when folder is outside root", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(false);

    const request = createFormDataRequest(
      { folderId: "outside-folder" },
      [{ name: "photo.jpg", type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Access denied: folder is outside allowed root");
  });

  it("uploads valid file successfully", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockFindDuplicateByName.mockResolvedValue(null);
    mockUploadFileToFolder.mockResolvedValue({
      id: "uploaded-id",
      name: "photo.jpg",
      webViewLink: "https://drive.google.com/view/uploaded",
    });

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "photo.jpg", type: "image/jpeg", content: "fake-jpeg-data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploaded).toHaveLength(1);
    expect(data.uploaded[0].originalName).toBe("photo.jpg");
    expect(data.uploaded[0].driveFileId).toBe("uploaded-id");
    expect(data.skipped).toHaveLength(0);
    expect(data.failed).toHaveLength(0);
    expect(data.destinationFolderLink).toBeDefined();
  });

  it("fails file with invalid MIME type", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "document.pdf", type: "application/pdf", content: "pdf-data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploaded).toHaveLength(0);
    expect(data.failed).toHaveLength(1);
    expect(data.failed[0].originalName).toBe("document.pdf");
    expect(data.failed[0].reason).toContain("File type not allowed");
  });

  it("fails file that exceeds size limit", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockIsValidFileSize.mockReturnValue(false);

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "large-photo.jpg", type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.failed).toHaveLength(1);
    expect(data.failed[0].reason).toContain("File size exceeds limit");
  });

  it("skips duplicate files", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockFindDuplicateByName.mockResolvedValue("existing-file-id");

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "photo.jpg", type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploaded).toHaveLength(0);
    expect(data.skipped).toHaveLength(1);
    expect(data.skipped[0].originalName).toBe("photo.jpg");
    expect(data.skipped[0].reason).toBe("duplicate");
  });

  it("handles mixed results (upload, skip, fail)", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockFindDuplicateByName
      .mockResolvedValueOnce(null) // first file - no dup
      .mockResolvedValueOnce("dup-id"); // second file - duplicate
    mockUploadFileToFolder.mockResolvedValue({
      id: "new-id",
      name: "good.jpg",
      webViewLink: "https://link",
    });

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [
        { name: "good.jpg", type: "image/jpeg", content: "data" },
        { name: "dup.jpg", type: "image/jpeg", content: "data" },
        { name: "bad.txt", type: "text/plain", content: "data" },
      ]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploaded).toHaveLength(1);
    expect(data.skipped).toHaveLength(1);
    expect(data.failed).toHaveLength(1);
  });

  it("fails file when uploadFileToFolder throws", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockFindDuplicateByName.mockResolvedValue(null);
    mockUploadFileToFolder.mockRejectedValue(new Error("Upload API error"));

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "photo.jpg", type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uploaded).toHaveLength(0);
    expect(data.failed).toHaveLength(1);
    expect(data.failed[0].reason).toBe("Upload failed");
  });

  it("does not check isFolderInsideRoot when folderId equals root", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockFindDuplicateByName.mockResolvedValue(null);
    mockUploadFileToFolder.mockResolvedValue({
      id: "id",
      name: "photo.jpg",
      webViewLink: "",
    });

    const request = createFormDataRequest(
      { folderId: "root-folder-123" },
      [{ name: "photo.jpg", type: "image/jpeg", content: "data" }]
    );

    await POST(request);

    expect(mockIsFolderInsideRoot).not.toHaveBeenCalled();
  });

  it("sanitizes filenames with special characters", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockFindDuplicateByName.mockResolvedValue(null);
    mockUploadFileToFolder.mockResolvedValue({
      id: "id",
      name: "file_name.jpg",
      webViewLink: "",
    });

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: 'file<name>.jpg', type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(data.uploaded[0].originalName).toBe("file_name_.jpg");
  });

  it("returns destination folder link", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockFindDuplicateByName.mockResolvedValue(null);
    mockUploadFileToFolder.mockResolvedValue({
      id: "id",
      name: "photo.jpg",
      webViewLink: "",
    });
    mockGetFolderWebViewLink.mockResolvedValue(
      "https://drive.google.com/custom-link"
    );

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "photo.jpg", type: "image/jpeg", content: "data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(data.destinationFolderLink).toBe(
      "https://drive.google.com/custom-link"
    );
  });

  it("allows video files when video upload is enabled", async () => {
    delete process.env.ALLOW_VIDEO_UPLOAD;
    mockIsAuthenticated.mockResolvedValue(true);
    mockIsFolderInsideRoot.mockResolvedValue(true);
    mockFindDuplicateByName.mockResolvedValue(null);
    mockUploadFileToFolder.mockResolvedValue({
      id: "vid-id",
      name: "video.mp4",
      webViewLink: "",
    });

    const request = createFormDataRequest(
      { folderId: "target-folder" },
      [{ name: "video.mp4", type: "video/mp4", content: "video-data" }]
    );

    const response = await POST(request);
    const data = await response.json();

    expect(data.uploaded).toHaveLength(1);
    expect(data.failed).toHaveLength(0);
  });
});
