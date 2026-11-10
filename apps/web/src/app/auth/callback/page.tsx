"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getSupabase } from "@/lib/supabase";

function getInitialUrlError(): string | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    searchParams.get("error_description") ||
    searchParams.get("error") ||
    hashParams.get("error_description") ||
    hashParams.get("error")
  );
}

export default function AuthCallbackPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(getInitialUrlError);

  useEffect(() => {
    if (errorMessage) return;

    let isMounted = true;

    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/");
      return;
    }

    // Wait for Supabase to detect the session from the URL hash or query params
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session) {
        router.replace("/");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        if (session) {
          router.replace("/");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(err instanceof Error ? err.message : t.authCallbackError);
      });

    // Fallback safety timeout
    const timeout = setTimeout(() => {
      if (isMounted) {
        router.replace("/");
      }
    }, 4000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, t, errorMessage]);

  return (
    <main className="min-h-screen bg-ink text-paper flex items-center justify-center p-4">
      <div className="modal-card glass max-w-md w-full text-center py-8 px-6">
        {errorMessage ? (
          <div>
            <div className="modal-icon-badge mx-auto mb-4 bg-red-500/10 border-red-500/30 text-red-400">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-xl font-bold font-display uppercase tracking-wide mb-2">
              {t.authCallbackError}
            </h1>
            <p className="text-sm text-text-secondary mb-6">{errorMessage}</p>
            <Link href="/" className="action-btn-primary inline-flex">
              {t.backToMap}
            </Link>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 border-4 border-color-mine border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold font-display uppercase tracking-wide mb-2">
              {t.authCallbackTitle}
            </h1>
            <p className="text-sm text-text-secondary">{t.authCallbackDesc}</p>
          </div>
        )}
      </div>
    </main>
  );
}
