const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
];

export function getAllowedMimeTypes(): string[] {
  const types = [...ALLOWED_IMAGE_TYPES];
  if (process.env.ALLOW_VIDEO_UPLOAD !== "false") {
    types.push(...ALLOWED_VIDEO_TYPES);
  }
  return types;
}

export function isAllowedMimeType(mimeType: string): boolean {
  return getAllowedMimeTypes().includes(mimeType);
}

export function getMaxFileSizeBytes(): number {
  const mb = parseInt(process.env.MAX_FILE_SIZE_MB || "2048", 10);
  return mb * 1024 * 1024;
}

export function isValidFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= getMaxFileSizeBytes();
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 255);
}

export function isValidFolderName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.length > 255) return false;
  if (/[<>:"/\\|?*\x00-\x1f]/.test(name)) return false;
  if (name === "." || name === "..") return false;
  return true;
}
