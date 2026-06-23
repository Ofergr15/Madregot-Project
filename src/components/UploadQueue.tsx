"use client";

export interface QueuedFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "uploaded" | "skipped" | "failed";
  progress: number;
  error?: string;
}

interface UploadQueueProps {
  files: QueuedFile[];
  destinationFolder?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIcon(fileName: string): "image" | "video" {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (["mp4", "mov", "avi", "quicktime"].includes(ext)) return "video";
  return "image";
}

function FileIcon({ type }: { type: "image" | "video" }) {
  if (type === "video") {
    return (
      <div className="w-8 h-8 bg-[#f1f3f4] rounded flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 bg-[#f1f3f4] rounded flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: QueuedFile["status"] }) {
  const config: Record<QueuedFile["status"], { text: string }> = {
    pending: { text: "text-[#5f6368]" },
    uploading: { text: "text-[#1a73e8]" },
    uploaded: { text: "text-[#188038]" },
    skipped: { text: "text-[#f9ab00]" },
    failed: { text: "text-[#d93025]" },
  };

  const { text } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${text}`}>
      {status === "uploaded" && (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      )}
      {status === "failed" && (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
        </svg>
      )}
      {status === "uploading" && (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {status}
    </span>
  );
}

export default function UploadQueue({ files, destinationFolder }: UploadQueueProps) {
  if (files.length === 0) return null;

  const uploaded = files.filter((f) => f.status === "uploaded").length;
  const skipped = files.filter((f) => f.status === "skipped").length;
  const failed = files.filter((f) => f.status === "failed").length;
  const total = files.length;
  const completedCount = uploaded + skipped + failed;
  const progressPercent = total > 0 ? (completedCount / total) * 100 : 0;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium text-[#202124] text-[14px]">
            Files ({completedCount}/{total})
          </h3>
          {destinationFolder && (
            <p className="text-[12px] text-[#5f6368] mt-0.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              {destinationFolder}
            </p>
          )}
        </div>
        <div className="flex gap-3 text-[12px] font-medium">
          {uploaded > 0 && (
            <span className="text-[#188038] flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#188038] rounded-full" />
              {uploaded} uploaded
            </span>
          )}
          {skipped > 0 && (
            <span className="text-[#f9ab00] flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#f9ab00] rounded-full" />
              {skipped} skipped
            </span>
          )}
          {failed > 0 && (
            <span className="text-[#d93025] flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#d93025] rounded-full" />
              {failed} failed
            </span>
          )}
        </div>
      </div>

      {completedCount > 0 && completedCount < total && (
        <div className="w-full bg-[#e8eaed] rounded-full h-1 mb-3 overflow-hidden">
          <div
            className="bg-[#1a73e8] h-1 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="rounded-lg border border-[#dadce0] overflow-hidden bg-white custom-scrollbar max-h-80 overflow-y-auto">
        {files.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
              index !== 0 ? "border-t border-[#e8eaed]" : ""
            } ${
              item.status === "uploading" ? "bg-[#e8f0fe]" : ""
            } ${
              item.status === "failed" ? "bg-[#fce8e6]" : ""
            }`}
          >
            <FileIcon type={getFileIcon(item.file.name)} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] truncate text-[#202124]">{item.file.name}</p>
              <p className="text-[11px] text-[#5f6368] mt-0.5">{formatSize(item.file.size)}</p>
              {item.status === "uploading" && (
                <div className="w-full bg-[#e8eaed] rounded-full h-0.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-[#1a73e8] h-0.5 rounded-full transition-all duration-300 animate-pulse-soft"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.error && (
                <p className="text-[11px] text-[#d93025] mt-1">{item.error}</p>
              )}
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
