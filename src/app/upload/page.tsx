"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FolderBrowser from "@/components/FolderBrowser";
import CreateFolderDialog from "@/components/CreateFolderDialog";
import UploadDropzone from "@/components/UploadDropzone";
import UploadQueue, { QueuedFile } from "@/components/UploadQueue";

interface Folder {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface Member {
  email: string;
  name: string;
  picture?: string;
  approved: boolean;
  addedAt: string;
}

type Tab = "upload" | "settings";

export default function UploadPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [actualRootFolderId, setActualRootFolderId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [destinationLink, setDestinationLink] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Settings state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadFolders = useCallback(
    async (parentId?: string) => {
      setLoading(true);
      try {
        const url = parentId
          ? `/api/folders?parentId=${encodeURIComponent(parentId)}`
          : "/api/folders";
        const res = await fetch(url);

        if (res.status === 401) {
          router.push("/");
          return;
        }

        const data = await res.json();
        setFolders(data.folders || []);
        if (data.rootFolderId) setActualRootFolderId(data.rootFolderId);

        if (data.isRoot) {
          setBreadcrumbs([
            { id: "root", name: "My Drive" },
          ]);
          setCurrentFolderId("root");
        }
      } catch {
        console.error("Failed to load folders");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch("/api/admin/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      console.error("Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push("/");
        } else {
          if (data.isAdmin) setIsAdmin(true);
          loadFolders();
        }
      });
  }, [router, loadFolders]);

  useEffect(() => {
    if (activeTab === "settings" && isAdmin) {
      loadMembers();
    }
  }, [activeTab, isAdmin, loadMembers]);

  const handleOpenFolder = useCallback(
    async (folderId: string) => {
      setSelectedFolderId(null);
      setLoading(true);

      // If navigating to "root", don't pass parentId — the API defaults to the root folder
      const isRoot = folderId === "root";
      const url = isRoot ? "/api/folders" : `/api/folders?parentId=${encodeURIComponent(folderId)}`;

      try {
        const res = await fetch(url);

        if (res.status === 401) {
          router.push("/");
          return;
        }

        const data = await res.json();
        setFolders(data.folders || []);
        if (data.rootFolderId) setActualRootFolderId(data.rootFolderId);

        if (data.isRoot || isRoot) {
          setCurrentFolderId("root");
          setBreadcrumbs([{ id: "root", name: "My Drive" }]);
        } else {
          setCurrentFolderId(folderId);
          const folder = data.currentFolder;
          if (folder) {
            const existingIndex = breadcrumbs.findIndex((b) => b.id === folderId);
            if (existingIndex >= 0) {
              setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
            } else {
              setBreadcrumbs([...breadcrumbs, { id: folderId, name: folder.name }]);
            }
          }
        }
      } catch {
        console.error("Failed to open folder");
      } finally {
        setLoading(false);
      }
    },
    [router, breadcrumbs]
  );

  const handleBreadcrumbNavigate = useCallback(
    (folderId: string) => {
      handleOpenFolder(folderId);
    },
    [handleOpenFolder]
  );

  const handleCreateFolder = async (name: string) => {
    const rawParentId = selectedFolderId || currentFolderId;
    const parentId = rawParentId === "root" ? actualRootFolderId : rawParentId;
    if (!parentId) throw new Error("No folder selected");
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, name }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create folder");
    }

    const newFolder = await res.json();
    handleOpenFolder(newFolder.id);
  };

  const handleFilesSelected = (files: File[]) => {
    const newFiles: QueuedFile[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setUploadQueue((prev) => [...prev, ...newFiles]);
    setUploadComplete(false);
    setDestinationLink(null);
  };

  const handleUpload = async () => {
    const rawTargetId = selectedFolderId || currentFolderId;
    const targetFolderId = rawTargetId === "root" ? actualRootFolderId : rawTargetId;
    if (!targetFolderId) return;

    const pendingFiles = uploadQueue.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setUploadComplete(false);

    const batchSize = 3;
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);

      const formData = new FormData();
      formData.append("folderId", targetFolderId);
      batch.forEach((qf) => formData.append("files", qf.file));

      setUploadQueue((prev) =>
        prev.map((f) =>
          batch.some((b) => b.id === f.id)
            ? { ...f, status: "uploading" as const, progress: 50 }
            : f
        )
      );

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setUploadQueue((prev) =>
            prev.map((f) =>
              batch.some((b) => b.id === f.id)
                ? { ...f, status: "failed" as const, error: data.error }
                : f
            )
          );
          continue;
        }

        setUploadQueue((prev) =>
          prev.map((f) => {
            if (!batch.some((b) => b.id === f.id)) return f;

            const uploaded = data.uploaded?.find(
              (u: { originalName: string }) => u.originalName === f.file.name
            );
            if (uploaded) {
              return { ...f, status: "uploaded" as const, progress: 100 };
            }

            const skipped = data.skipped?.find(
              (s: { originalName: string }) => s.originalName === f.file.name
            );
            if (skipped) {
              return { ...f, status: "skipped" as const, progress: 100 };
            }

            const failed = data.failed?.find(
              (x: { originalName: string }) => x.originalName === f.file.name
            );
            if (failed) {
              return { ...f, status: "failed" as const, error: failed.reason, progress: 100 };
            }

            return { ...f, status: "uploaded" as const, progress: 100 };
          })
        );

        if (data.destinationFolderLink) {
          setDestinationLink(data.destinationFolderLink);
        }
      } catch {
        setUploadQueue((prev) =>
          prev.map((f) =>
            batch.some((b) => b.id === f.id)
              ? { ...f, status: "failed" as const, error: "Network error" }
              : f
          )
        );
      }
    }

    setUploading(false);
    setUploadComplete(true);
  };

  const handleApprove = async (email: string) => {
    setActionLoading(email);
    try {
      const res = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.email === email ? { ...m, approved: true } : m))
        );
      }
    } catch {
      console.error("Failed to approve member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (email: string) => {
    setActionLoading(email);
    try {
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.email !== email));
      }
    } catch {
      console.error("Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  const targetFolderId = selectedFolderId || currentFolderId;
  const targetFolderName =
    folders.find((f) => f.id === selectedFolderId)?.name ||
    breadcrumbs[breadcrumbs.length - 1]?.name ||
    "Current folder";

  const pendingCount = uploadQueue.filter((f) => f.status === "pending").length;
  const pendingMembers = members.filter((m) => !m.approved);
  const approvedMembers = members.filter((m) => m.approved);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#dadce0] px-4 py-3 flex items-center gap-4 sticky top-0 z-40 bg-white">
        <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 9.35z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
        <h1 className="text-[18px] text-[#5f6368]">
          Madregot Running Club
        </h1>
        <div className="flex-1" />
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/");
          }}
          className="text-[14px] text-[#5f6368] font-medium hover:bg-[#f1f3f4] px-3 py-2 rounded transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Tab Navigation */}
      {isAdmin && (
        <div className="border-b border-[#dadce0] px-4 bg-white sticky top-[57px] z-30">
          <nav className="flex gap-0 max-w-3xl mx-auto">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-5 py-3 text-[14px] font-medium border-b-2 transition-colors ${
                activeTab === "upload"
                  ? "text-[#1a73e8] border-[#1a73e8]"
                  : "text-[#5f6368] border-transparent hover:text-[#202124] hover:bg-[#f1f3f4]"
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-5 py-3 text-[14px] font-medium border-b-2 transition-colors ${
                activeTab === "settings"
                  ? "text-[#1a73e8] border-[#1a73e8]"
                  : "text-[#5f6368] border-transparent hover:text-[#202124] hover:bg-[#f1f3f4]"
              }`}
            >
              Settings
            </button>
          </nav>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-2">
            <Breadcrumbs path={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 text-[14px] text-[#202124] bg-white border border-[#dadce0] rounded-full px-4 py-2 hover:bg-[#f1f3f4] shadow-sm transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10zM12 10h2v3h3v2h-3v3h-2v-3H9v-2h3v-3z"/>
              </svg>
              New folder
            </button>
          </div>

          {/* Selected destination */}
          {targetFolderId && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#e8f0fe] rounded text-[13px] text-[#1a73e8]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              Uploading to: <span className="font-medium">{targetFolderName}</span>
            </div>
          )}

          {/* Folder list */}
          <FolderBrowser
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onOpenFolder={handleOpenFolder}
            loading={loading}
          />

          {/* Upload section */}
          <div className="mt-6 pt-6 border-t border-[#dadce0]">
            <UploadDropzone
              onFilesSelected={handleFilesSelected}
              disabled={!targetFolderId}
            />

            <UploadQueue files={uploadQueue} destinationFolder={targetFolderName} />

            {pendingCount > 0 && !uploading && (
              <button
                onClick={handleUpload}
                className="mt-4 w-full bg-[#1a73e8] text-white rounded py-2.5 text-[14px] font-medium hover:bg-[#1557b0] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
              </button>
            )}

            {uploading && (
              <div className="mt-4 text-center text-[#1a73e8] text-[14px] font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading...
              </div>
            )}
          </div>

          {/* Upload complete */}
          {uploadComplete && (
            <div className="mt-6 p-4 bg-[#e6f4ea] rounded-lg border border-[#ceead6]">
              <div className="flex items-center gap-2 text-[#188038] text-[14px] font-medium mb-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Upload complete
              </div>
              <p className="text-[13px] text-[#3c4043] mb-3">
                {uploadQueue.filter((f) => f.status === "uploaded").length} uploaded,{" "}
                {uploadQueue.filter((f) => f.status === "skipped").length} skipped,{" "}
                {uploadQueue.filter((f) => f.status === "failed").length} failed
              </p>
              <div className="flex gap-3">
                {destinationLink && (
                  <a
                    href={destinationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-[#1a73e8] font-medium hover:underline"
                  >
                    Open in Google Drive
                  </a>
                )}
                <button
                  onClick={() => {
                    setUploadQueue([]);
                    setUploadComplete(false);
                    setDestinationLink(null);
                  }}
                  className="text-[14px] text-[#5f6368] font-medium hover:underline"
                >
                  Upload more
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab (Admin only) */}
      {activeTab === "settings" && isAdmin && (
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          {membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="w-5 h-5 animate-spin text-[#1a73e8]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              {/* Pending Members */}
              {pendingMembers.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-[14px] font-medium text-[#202124] mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#f9ab00]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    Pending Approval ({pendingMembers.length})
                  </h2>
                  <div className="rounded-lg border border-[#dadce0] overflow-hidden">
                    {pendingMembers.map((member, index) => (
                      <div
                        key={member.email}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          index !== 0 ? "border-t border-[#e8eaed]" : ""
                        }`}
                      >
                        {member.picture ? (
                          <img src={member.picture} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center text-white text-[14px] font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-[#202124] truncate">{member.name}</p>
                          <p className="text-[12px] text-[#5f6368] truncate">{member.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(member.email)}
                            disabled={actionLoading === member.email}
                            className="px-3 py-1.5 bg-[#1a73e8] text-white rounded text-[13px] font-medium hover:bg-[#1557b0] disabled:opacity-50 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRemove(member.email)}
                            disabled={actionLoading === member.email}
                            className="px-3 py-1.5 text-[#d93025] border border-[#dadce0] rounded text-[13px] font-medium hover:bg-[#fce8e6] disabled:opacity-50 transition-colors"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Members */}
              <div>
                <h2 className="text-[14px] font-medium text-[#202124] mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#188038]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Approved Members ({approvedMembers.length})
                </h2>
                {approvedMembers.length === 0 ? (
                  <div className="py-8 text-center border border-[#dadce0] rounded-lg">
                    <p className="text-[14px] text-[#5f6368]">No approved members yet</p>
                    <p className="text-[12px] text-[#80868b] mt-1">Approve pending members above to grant access</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[#dadce0] overflow-hidden">
                    {approvedMembers.map((member, index) => (
                      <div
                        key={member.email}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          index !== 0 ? "border-t border-[#e8eaed]" : ""
                        }`}
                      >
                        {member.picture ? (
                          <img src={member.picture} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#188038] flex items-center justify-center text-white text-[14px] font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-[#202124] truncate">{member.name}</p>
                          <p className="text-[12px] text-[#5f6368] truncate">{member.email}</p>
                        </div>
                        <span className="text-[11px] text-[#5f6368]">
                          {new Date(member.addedAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleRemove(member.email)}
                          disabled={actionLoading === member.email}
                          className="px-3 py-1.5 text-[#d93025] border border-[#dadce0] rounded text-[13px] font-medium hover:bg-[#fce8e6] disabled:opacity-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <CreateFolderDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}
