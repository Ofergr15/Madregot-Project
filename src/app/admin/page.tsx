"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  email: string;
  name: string;
  picture?: string;
  approved: boolean;
  addedAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/members");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      console.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || !data.isAdmin) {
          router.push("/");
        } else {
          loadMembers();
        }
      });
  }, [router, loadMembers]);

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
          prev.map((m) =>
            m.email === email ? { ...m, approved: true } : m
          )
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

  const pendingMembers = members.filter((m) => !m.approved);
  const approvedMembers = members.filter((m) => m.approved);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#dadce0] px-4 py-3 flex items-center gap-4">
        <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 9.35z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
          <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
        </svg>
        <h1 className="text-[18px] text-[#5f6368]">
          Admin - Member Management
        </h1>
        <div className="flex-1" />
        <a
          href="/upload"
          className="text-[14px] text-[#1a73e8] font-medium hover:bg-[#f1f3f4] px-3 py-2 rounded transition-colors"
        >
          Go to Upload
        </a>
      </header>

      <div className="max-w-3xl mx-auto p-4 sm:p-6">
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
                    <img
                      src={member.picture}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
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
                    <img
                      src={member.picture}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
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
      </div>
    </div>
  );
}
