import {
  getAllowedMimeTypes,
  isAllowedMimeType,
  getMaxFileSizeBytes,
  isValidFileSize,
  sanitizeFileName,
  isValidFolderName,
} from "@/lib/validation";

describe("validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getAllowedMimeTypes", () => {
    it("includes image types by default", () => {
      const types = getAllowedMimeTypes();
      expect(types).toContain("image/jpeg");
      expect(types).toContain("image/png");
      expect(types).toContain("image/heic");
      expect(types).toContain("image/heif");
      expect(types).toContain("image/webp");
    });

    it("includes video types when ALLOW_VIDEO_UPLOAD is not set", () => {
      delete process.env.ALLOW_VIDEO_UPLOAD;
      const types = getAllowedMimeTypes();
      expect(types).toContain("video/mp4");
      expect(types).toContain("video/quicktime");
      expect(types).toContain("video/x-msvideo");
    });

    it("includes video types when ALLOW_VIDEO_UPLOAD is 'true'", () => {
      process.env.ALLOW_VIDEO_UPLOAD = "true";
      const types = getAllowedMimeTypes();
      expect(types).toContain("video/mp4");
      expect(types).toContain("video/quicktime");
      expect(types).toContain("video/x-msvideo");
    });

    it("excludes video types when ALLOW_VIDEO_UPLOAD is 'false'", () => {
      process.env.ALLOW_VIDEO_UPLOAD = "false";
      const types = getAllowedMimeTypes();
      expect(types).not.toContain("video/mp4");
      expect(types).not.toContain("video/quicktime");
      expect(types).not.toContain("video/x-msvideo");
    });

    it("still includes image types when video is disabled", () => {
      process.env.ALLOW_VIDEO_UPLOAD = "false";
      const types = getAllowedMimeTypes();
      expect(types).toContain("image/jpeg");
      expect(types).toContain("image/png");
    });
  });

  describe("isAllowedMimeType", () => {
    it("returns true for image/jpeg", () => {
      expect(isAllowedMimeType("image/jpeg")).toBe(true);
    });

    it("returns true for image/png", () => {
      expect(isAllowedMimeType("image/png")).toBe(true);
    });

    it("returns true for image/heic", () => {
      expect(isAllowedMimeType("image/heic")).toBe(true);
    });

    it("returns true for image/heif", () => {
      expect(isAllowedMimeType("image/heif")).toBe(true);
    });

    it("returns true for image/webp", () => {
      expect(isAllowedMimeType("image/webp")).toBe(true);
    });

    it("returns true for video/mp4 when video allowed", () => {
      delete process.env.ALLOW_VIDEO_UPLOAD;
      expect(isAllowedMimeType("video/mp4")).toBe(true);
    });

    it("returns true for video/quicktime when video allowed", () => {
      delete process.env.ALLOW_VIDEO_UPLOAD;
      expect(isAllowedMimeType("video/quicktime")).toBe(true);
    });

    it("returns true for video/x-msvideo when video allowed", () => {
      delete process.env.ALLOW_VIDEO_UPLOAD;
      expect(isAllowedMimeType("video/x-msvideo")).toBe(true);
    });

    it("returns false for video/mp4 when video disabled", () => {
      process.env.ALLOW_VIDEO_UPLOAD = "false";
      expect(isAllowedMimeType("video/mp4")).toBe(false);
    });

    it("returns false for application/pdf", () => {
      expect(isAllowedMimeType("application/pdf")).toBe(false);
    });

    it("returns false for text/plain", () => {
      expect(isAllowedMimeType("text/plain")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isAllowedMimeType("")).toBe(false);
    });

    it("returns false for image/gif (not in allowed list)", () => {
      expect(isAllowedMimeType("image/gif")).toBe(false);
    });

    it("returns false for image/svg+xml", () => {
      expect(isAllowedMimeType("image/svg+xml")).toBe(false);
    });

    it("is case-sensitive", () => {
      expect(isAllowedMimeType("IMAGE/JPEG")).toBe(false);
      expect(isAllowedMimeType("Image/Jpeg")).toBe(false);
    });
  });

  describe("getMaxFileSizeBytes", () => {
    it("returns default 2048MB when env not set", () => {
      delete process.env.MAX_FILE_SIZE_MB;
      expect(getMaxFileSizeBytes()).toBe(2048 * 1024 * 1024);
    });

    it("returns configured value from env", () => {
      process.env.MAX_FILE_SIZE_MB = "100";
      expect(getMaxFileSizeBytes()).toBe(100 * 1024 * 1024);
    });

    it("handles 1 MB limit", () => {
      process.env.MAX_FILE_SIZE_MB = "1";
      expect(getMaxFileSizeBytes()).toBe(1024 * 1024);
    });

    it("handles large limit (10GB)", () => {
      process.env.MAX_FILE_SIZE_MB = "10240";
      expect(getMaxFileSizeBytes()).toBe(10240 * 1024 * 1024);
    });

    it("returns NaN * 1024 * 1024 for non-numeric value", () => {
      process.env.MAX_FILE_SIZE_MB = "abc";
      expect(getMaxFileSizeBytes()).toBeNaN();
    });
  });

  describe("isValidFileSize", () => {
    beforeEach(() => {
      process.env.MAX_FILE_SIZE_MB = "10";
    });

    it("returns true for 1 byte", () => {
      expect(isValidFileSize(1)).toBe(true);
    });

    it("returns true for size exactly at limit", () => {
      expect(isValidFileSize(10 * 1024 * 1024)).toBe(true);
    });

    it("returns true for size below limit", () => {
      expect(isValidFileSize(5 * 1024 * 1024)).toBe(true);
    });

    it("returns false for 0 bytes", () => {
      expect(isValidFileSize(0)).toBe(false);
    });

    it("returns false for negative size", () => {
      expect(isValidFileSize(-1)).toBe(false);
    });

    it("returns false for size above limit", () => {
      expect(isValidFileSize(10 * 1024 * 1024 + 1)).toBe(false);
    });

    it("returns false for very large size", () => {
      expect(isValidFileSize(999999999999)).toBe(false);
    });
  });

  describe("sanitizeFileName", () => {
    it("returns normal filenames unchanged", () => {
      expect(sanitizeFileName("photo.jpg")).toBe("photo.jpg");
    });

    it("preserves spaces in filenames", () => {
      expect(sanitizeFileName("my photo.jpg")).toBe("my photo.jpg");
    });

    it("preserves dashes and underscores", () => {
      expect(sanitizeFileName("my-photo_2024.jpg")).toBe("my-photo_2024.jpg");
    });

    it("replaces < character", () => {
      expect(sanitizeFileName("file<name.jpg")).toBe("file_name.jpg");
    });

    it("replaces > character", () => {
      expect(sanitizeFileName("file>name.jpg")).toBe("file_name.jpg");
    });

    it("replaces : character", () => {
      expect(sanitizeFileName("file:name.jpg")).toBe("file_name.jpg");
    });

    it("replaces \" character", () => {
      expect(sanitizeFileName('file"name.jpg')).toBe("file_name.jpg");
    });

    it("replaces / character", () => {
      expect(sanitizeFileName("file/name.jpg")).toBe("file_name.jpg");
    });

    it("replaces \\ character", () => {
      expect(sanitizeFileName("file\\name.jpg")).toBe("file_name.jpg");
    });

    it("replaces | character", () => {
      expect(sanitizeFileName("file|name.jpg")).toBe("file_name.jpg");
    });

    it("replaces ? character", () => {
      expect(sanitizeFileName("file?name.jpg")).toBe("file_name.jpg");
    });

    it("replaces * character", () => {
      expect(sanitizeFileName("file*name.jpg")).toBe("file_name.jpg");
    });

    it("replaces null bytes and control characters", () => {
      expect(sanitizeFileName("file\x00name.jpg")).toBe("file_name.jpg");
      expect(sanitizeFileName("file\x01name.jpg")).toBe("file_name.jpg");
      expect(sanitizeFileName("file\x1fname.jpg")).toBe("file_name.jpg");
    });

    it("collapses multiple consecutive dots to single dot", () => {
      expect(sanitizeFileName("file..name.jpg")).toBe("file.name.jpg");
      expect(sanitizeFileName("file...name.jpg")).toBe("file.name.jpg");
      expect(sanitizeFileName("file....name.jpg")).toBe("file.name.jpg");
    });

    it("trims leading and trailing whitespace", () => {
      expect(sanitizeFileName("  photo.jpg  ")).toBe("photo.jpg");
    });

    it("truncates to 255 characters", () => {
      const longName = "a".repeat(300) + ".jpg";
      const result = sanitizeFileName(longName);
      expect(result.length).toBe(255);
    });

    it("handles multiple invalid characters at once", () => {
      expect(sanitizeFileName('f<i>l:e"n/a\\m|e?.j*g')).toBe(
        "f_i_l_e_n_a_m_e_.j_g"
      );
    });

    it("handles empty string", () => {
      expect(sanitizeFileName("")).toBe("");
    });

    it("handles string with only spaces", () => {
      expect(sanitizeFileName("   ")).toBe("");
    });
  });

  describe("isValidFolderName", () => {
    it("returns true for normal folder name", () => {
      expect(isValidFolderName("2024-01-15 Morning Run")).toBe(true);
    });

    it("returns true for simple name", () => {
      expect(isValidFolderName("photos")).toBe(true);
    });

    it("returns true for name with parentheses", () => {
      expect(isValidFolderName("Run (evening)")).toBe(true);
    });

    it("returns true for name with numbers", () => {
      expect(isValidFolderName("123")).toBe(true);
    });

    it("returns true for single character", () => {
      expect(isValidFolderName("a")).toBe(true);
    });

    it("returns true for exactly 255 characters", () => {
      expect(isValidFolderName("a".repeat(255))).toBe(true);
    });

    it("returns false for empty string", () => {
      expect(isValidFolderName("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
      expect(isValidFolderName("   ")).toBe(false);
      expect(isValidFolderName("\t")).toBe(false);
    });

    it("returns false for name longer than 255 characters", () => {
      expect(isValidFolderName("a".repeat(256))).toBe(false);
    });

    it("returns false for name containing <", () => {
      expect(isValidFolderName("folder<name")).toBe(false);
    });

    it("returns false for name containing >", () => {
      expect(isValidFolderName("folder>name")).toBe(false);
    });

    it("returns false for name containing :", () => {
      expect(isValidFolderName("folder:name")).toBe(false);
    });

    it('returns false for name containing "', () => {
      expect(isValidFolderName('folder"name')).toBe(false);
    });

    it("returns false for name containing /", () => {
      expect(isValidFolderName("folder/name")).toBe(false);
    });

    it("returns false for name containing \\", () => {
      expect(isValidFolderName("folder\\name")).toBe(false);
    });

    it("returns false for name containing |", () => {
      expect(isValidFolderName("folder|name")).toBe(false);
    });

    it("returns false for name containing ?", () => {
      expect(isValidFolderName("folder?name")).toBe(false);
    });

    it("returns false for name containing *", () => {
      expect(isValidFolderName("folder*name")).toBe(false);
    });

    it("returns false for single dot (.)", () => {
      expect(isValidFolderName(".")).toBe(false);
    });

    it("returns false for double dot (..)", () => {
      expect(isValidFolderName("..")).toBe(false);
    });

    it("returns true for name starting with dot", () => {
      expect(isValidFolderName(".hidden")).toBe(true);
    });

    it("returns true for name containing dots", () => {
      expect(isValidFolderName("folder.name")).toBe(true);
    });

    it("returns false for name with null byte", () => {
      expect(isValidFolderName("folder\x00name")).toBe(false);
    });

    it("returns false for name with control character", () => {
      expect(isValidFolderName("folder\x1fname")).toBe(false);
    });
  });
});
