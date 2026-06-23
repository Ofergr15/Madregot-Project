"use client";

interface Folder {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
}

interface FolderBrowserProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onOpenFolder: (folderId: string) => void;
  loading: boolean;
}

export default function FolderBrowser({
  folders,
  selectedFolderId,
  onSelectFolder,
  onOpenFolder,
  loading,
}: FolderBrowserProps) {
  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center gap-3 text-[#5f6368]">
          <svg className="w-5 h-5 animate-spin text-[#1a73e8]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[14px]">Loading folders...</span>
        </div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex flex-col items-center">
          <div className="w-12 h-12 bg-[#f1f3f4] rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
          </div>
          <p className="text-[#5f6368] text-[14px]">No subfolders here</p>
          <p className="text-[#80868b] text-[12px] mt-1">You can create one or upload to this folder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#dadce0] overflow-hidden bg-white">
      {folders.map((folder, index) => (
        <div
          key={folder.id}
          className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors group ${
            index !== 0 ? "border-t border-[#e8eaed]" : ""
          } ${
            selectedFolderId === folder.id
              ? "bg-[#c2e7ff]"
              : "hover:bg-[#f1f3f4]"
          }`}
          onClick={() => onSelectFolder(folder.id)}
          onDoubleClick={() => onOpenFolder(folder.id)}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Google Drive gray folder icon */}
            <div className="flex-shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path
                  d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
                  fill={selectedFolderId === folder.id ? "#5f6368" : "#80868b"}
                />
              </svg>
            </div>
            <span className={`truncate text-[14px] ${
              selectedFolderId === folder.id ? "text-[#202124] font-medium" : "text-[#3c4043]"
            }`}>
              {folder.name}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFolder(folder.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-[12px] font-medium text-[#1a73e8] hover:bg-[#d3e3fd] px-2.5 py-1 rounded flex-shrink-0 ml-2 transition-all"
          >
            Open
          </button>
        </div>
      ))}
    </div>
  );
}
