"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              width?: number;
              shape?: string;
              text?: string;
            }
          ) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const router = useRouter();

  const handleGoogleResponse = useCallback(
    async (response: { credential: string }) => {
      setError("");
      setPending(false);
      setLoading(true);

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });

        const data = await res.json();

        if (data.ok) {
          if (data.isAdmin) {
            router.push("/admin");
          } else {
            router.push("/upload");
          }
        } else if (data.pending) {
          setPending(true);
        } else {
          setError(data.error || "Sign-in failed");
        }
      } catch {
        setError("Connection error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!gsiLoaded || !window.google) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse,
    });

    const buttonEl = document.getElementById("google-signin-button");
    if (buttonEl) {
      window.google.accounts.id.renderButton(buttonEl, {
        theme: "outline",
        size: "large",
        width: 320,
        shape: "rectangular",
        text: "signin_with",
      });
    }
  }, [gsiLoaded, handleGoogleResponse]);

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push("/upload");
      } else {
        setError(data.error || "Invalid access code");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => setGsiLoaded(true)}
        strategy="afterInteractive"
      />

      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-[400px]">
          <div className="border border-[#dadce0] rounded-lg p-10 sm:p-12">
            {/* Google Drive logo */}
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 9.35z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>

            <h1 className="text-[24px] font-normal text-[#202124] text-center mb-1">
              Sign in
            </h1>
            <p className="text-center text-[#5f6368] text-[16px] mb-8">
              to Madregot Running Club Photos
            </p>

            {/* Pending approval message */}
            {pending && (
              <div className="flex items-center gap-3 text-[14px] text-[#f9ab00] bg-[#fef7e0] border border-[#f9ab00]/30 px-4 py-3 rounded-lg mb-6">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>Your account is pending admin approval. Please check back later.</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-[14px] text-[#d93025] bg-[#fce8e6] px-4 py-3 rounded-lg mb-6">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {error}
              </div>
            )}

            {/* Google Sign-In Button */}
            <div className="flex justify-center mb-6">
              <div id="google-signin-button" />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 border-t border-[#dadce0]" />
              <span className="text-[12px] text-[#5f6368]">or use access code</span>
              <div className="flex-1 border-t border-[#dadce0]" />
            </div>

            {/* Access code form */}
            <form onSubmit={handleAccessCodeSubmit}>
              <div className="relative mb-4">
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Access code"
                  className="w-full border border-[#dadce0] rounded px-4 py-3 text-[14px] text-[#202124] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] placeholder:text-[#5f6368] transition-colors"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#1a73e8] text-white rounded py-2.5 text-[14px] font-medium hover:bg-[#1557b0] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={loading || !accessCode}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[12px] text-[#5f6368] mt-6">
            Madregot Running Club
          </p>
        </div>
      </div>
    </>
  );
}
