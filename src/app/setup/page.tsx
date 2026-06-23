"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface FolderOption {
  id: string;
  name: string;
  webViewLink?: string;
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex items-center gap-3 text-[#5f6368]">
            <svg className="w-5 h-5 animate-spin text-[#1a73e8]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-[14px]">Loading...</span>
          </div>
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [message, setMessage] = useState("");

  const justConnected = searchParams.get("connected") === "true";
  const authError = searchParams.get("error");

  useEffect(() => {
    fetch("/api/oauth/status")
      .then((res) => res.json())
      .then((data) => {
        setConnected(data.connected);
        setRootFolderId(data.rootFolderId);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (justConnected) {
      setConnected(true);
      setMessage("Google Drive connected successfully!");
    }
    if (authError) {
      setMessage("Failed to connect. Please try again.");
    }
  }, [justConnected, authError]);

  useEffect(() => {
    if (connected) {
      setLoadingFolders(true);
      fetch("/api/oauth/root-folders")
        .then((res) => res.json())
        .then((data) => {
          setFolders(data.folders || []);
          setLoadingFolders(false);
        })
        .catch(() => setLoadingFolders(false));
    }
  }, [connected]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-[#5f6368]">
          <svg className="w-5 h-5 animate-spin text-[#1a73e8]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[14px]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-lg mx-auto pt-8">
        {/* Header card */}
        <div className="border border-[#dadce0] rounded-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <svg className="w-10 h-10" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 9.35z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            <div>
              <h1 className="text-[22px] font-normal text-[#202124]">
                Setup
              </h1>
              <p className="text-[#5f6368] text-[14px]">
                Connect Google Drive to enable uploads
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg text-[14px] flex items-center gap-2.5 ${
                authError
                  ? "bg-[#fce8e6] text-[#d93025] border border-[#f5c6cb]"
                  : "bg-[#e6f4ea] text-[#188038] border border-[#ceead6]"
              }`}
            >
              {authError ? (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              )}
              {message}
            </div>
          )}

          {/* Step 1: Connect Google */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-medium ${
                  connected
                    ? "bg-[#e6f4ea] text-[#188038] border border-[#ceead6]"
                    : "bg-[#1a73e8] text-white"
                }`}
              >
                {connected ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : "1"}
              </div>
              <h2 className="text-[16px] font-medium text-[#202124]">
                Connect Google Drive
              </h2>
            </div>

            {connected ? (
              <p className="text-[#188038] text-[14px] ml-11">
                Connected! Google Drive is linked.
              </p>
            ) : (
              <div className="ml-11">
                <p className="text-[#5f6368] text-[14px] mb-4">
                  Sign in with <strong className="text-[#202124]">madregot.club@gmail.com</strong> to grant
                  Drive access.
                </p>
                <a
                  href="/api/oauth"
                  className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-white border border-[#dadce0] rounded hover:bg-[#f1f3f4] transition-colors text-[14px] font-medium text-[#3c4043]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </a>
              </div>
            )}
          </div>

          {/* Step 2: Choose root folder */}
          {connected && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-medium ${
                    rootFolderId
                      ? "bg-[#e6f4ea] text-[#188038] border border-[#ceead6]"
                      : "bg-[#1a73e8] text-white"
                  }`}
                >
                  {rootFolderId ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  ) : "2"}
                </div>
                <h2 className="text-[16px] font-medium text-[#202124]">
                  Choose root folder
                </h2>
              </div>

              <div className="ml-11">
                {rootFolderId ? (
                  <div>
                    <p className="text-[#188038] text-[14px] mb-2">
                      Root folder configured.
                    </p>
                    <p className="text-[12px] text-[#5f6368] font-mono bg-[#f8f9fa] px-3 py-1.5 rounded inline-block border border-[#dadce0]">
                      ID: {rootFolderId}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[#5f6368] text-[14px] mb-4">
                      Select which Drive folder photographers will upload into.
                      Set the folder ID in your <code className="bg-[#f8f9fa] border border-[#dadce0] px-1.5 py-0.5 rounded text-[12px] font-mono text-[#202124]">.env.local</code> as{" "}
                      <code className="bg-[#f8f9fa] border border-[#dadce0] px-1.5 py-0.5 rounded text-[12px] font-mono text-[#202124]">GOOGLE_DRIVE_ROOT_FOLDER_ID</code>.
                    </p>

                    {loadingFolders ? (
                      <div className="flex items-center gap-2 text-[#5f6368] text-[14px]">
                        <svg className="w-4 h-4 animate-spin text-[#1a73e8]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading folders...
                      </div>
                    ) : (
                      <div className="border border-[#dadce0] rounded-lg overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                        {folders.map((folder, index) => (
                          <div
                            key={folder.id}
                            className={`p-3 flex items-center justify-between hover:bg-[#f1f3f4] transition-colors ${
                              index !== 0 ? "border-t border-[#e8eaed]" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <svg className="w-5 h-5 text-[#80868b]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                              </svg>
                              <span className="text-[14px] text-[#202124]">
                                {folder.name}
                              </span>
                            </div>
                            <code className="text-[11px] text-[#5f6368] ml-2 bg-[#f8f9fa] px-2 py-0.5 rounded font-mono border border-[#dadce0]">
                              {folder.id}
                            </code>
                          </div>
                        ))}
                        {folders.length === 0 && (
                          <p className="p-4 text-[14px] text-[#5f6368] text-center">
                            No folders found in root. Create one in Google Drive
                            first.
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-[12px] text-[#80868b] mt-3">
                      Copy the folder ID and add it to .env.local, then restart
                      the server.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {connected && rootFolderId && (
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e6f4ea] text-[#188038] border border-[#ceead6]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <h2 className="text-[16px] font-medium text-[#202124]">Ready!</h2>
              </div>
              <div className="ml-11">
                <p className="text-[#5f6368] text-[14px] mb-4">
                  The uploader is fully configured. Share the link with
                  photographers.
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1a73e8] text-white rounded text-[14px] font-medium hover:bg-[#1557b0] transition-colors"
                >
                  Go to Upload Portal
                </a>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[12px] text-[#5f6368] mt-6">
          Madregot Running Club - Admin Setup
        </p>
      </div>
    </div>
  );
}
