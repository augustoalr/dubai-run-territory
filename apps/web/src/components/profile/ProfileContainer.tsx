"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n";
import {
  DEFAULT_RUNS_PAGE_SIZE,
  loadReadNoticeIds,
  markAllNoticesRead,
  markNoticeRead,
  profileRepository,
  type ProfileLoadResult,
  type ProfileRunItem,
} from "@/lib/profile";
import { useAuth } from "@/lib/supabase";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileLogoutModal } from "./ProfileLogoutModal";
import { ProfileRunsHistory } from "./ProfileRunsHistory";
import { ProfileStealNotices } from "./ProfileStealNotices";

const THEME_STORAGE_KEY = "dubai-run-theme";
const THEME_CHANGE_EVENT = "dubai-run-profile-theme-change";

function subscribeToTheme(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver(() => {
    callback();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });

  window.addEventListener(THEME_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    observer.disconnect();
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getThemeSnapshot(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): "dark" | "light" {
  return "dark";
}

interface LoadedProfileSnapshot {
  key: string;
  result: ProfileLoadResult;
  initialReadIds: string[];
}

interface ExtraRunsState {
  runs: ProfileRunItem[];
  hasMore: boolean;
  error: string | null;
}

export function ProfileContainer() {
  const { t, formatPace } = useI18n();
  const { user, isLoading: authLoading, isConfigured, openAuthModal, signOut } = useAuth();

  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  const handleToggleTheme = useCallback(() => {
    if (typeof document === "undefined") return;
    const next = getThemeSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures in Safari private mode.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const [reloadNonce, setReloadNonce] = useState(0);
  const [loadedSnapshot, setLoadedSnapshot] = useState<LoadedProfileSnapshot | null>(null);
  const [extraReadByKey, setExtraReadByKey] = useState<Record<string, string[]>>({});
  const [extraRunsByKey, setExtraRunsByKey] = useState<Record<string, ExtraRunsState>>({});
  const [isLoadingMoreRuns, setIsLoadingMoreRuns] = useState(false);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const isWaitingForAuth = isConfigured && authLoading;
  const effectiveUserId = isConfigured ? (user?.id ?? null) : null;
  const requestKey = isWaitingForAuth
    ? "waiting"
    : `${isConfigured ? "cfg" : "sample"}:${effectiveUserId ?? "anon"}:${reloadNonce}`;

  useEffect(() => {
    if (isWaitingForAuth) {
      return;
    }

    let cancelled = false;
    const activeKey = requestKey;

    profileRepository
      .getProfileData(effectiveUserId, DEFAULT_RUNS_PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        const scopeId =
          result.status === "ready"
            ? result.runner.id
            : result.status === "sample"
              ? "sample-runner"
              : null;
        const initialReadIds = scopeId ? Array.from(loadReadNoticeIds(scopeId)) : [];
        setLoadedSnapshot({ key: activeKey, result, initialReadIds });
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedSnapshot({
          key: activeKey,
          result: {
            status: "error",
            isSampleData: false,
            error: "network_error",
            runner: null,
            season: null,
            leagueAssignment: null,
            ownedCellsCount: 0,
            runs: [],
            hasMoreRuns: false,
            stealNotices: [],
          },
          initialReadIds: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isWaitingForAuth, requestKey, effectiveUserId]);

  const activeSnapshot = loadedSnapshot?.key === requestKey ? loadedSnapshot : null;
  const isLoadingProfile = isWaitingForAuth || activeSnapshot === null;
  const result = activeSnapshot?.result ?? null;

  const noticeScopeId =
    result?.status === "ready"
      ? result.runner.id
      : result?.status === "sample"
        ? "sample-runner"
        : null;

  const readIds = useMemo(() => {
    const initial = activeSnapshot?.initialReadIds ?? [];
    const extra = extraReadByKey[requestKey] ?? [];
    return new Set([...initial, ...extra]);
  }, [activeSnapshot, extraReadByKey, requestKey]);

  const handleMarkRead = useCallback(
    (noticeId: string) => {
      if (!noticeScopeId) return;
      markNoticeRead(noticeScopeId, noticeId);
      setExtraReadByKey((prev) => {
        const current = prev[requestKey] ?? [];
        if (current.includes(noticeId)) return prev;
        return {
          ...prev,
          [requestKey]: [...current, noticeId],
        };
      });
    },
    [noticeScopeId, requestKey],
  );

  const handleMarkAllRead = useCallback(() => {
    if (!noticeScopeId || !result) return;
    if (result.status !== "ready" && result.status !== "sample") return;
    const allIds = result.stealNotices.map((n) => n.id);
    if (allIds.length === 0) return;

    markAllNoticesRead(noticeScopeId, allIds);
    setExtraReadByKey((prev) => {
      const merged = new Set([...(prev[requestKey] ?? []), ...allIds]);
      return {
        ...prev,
        [requestKey]: Array.from(merged),
      };
    });
  }, [noticeScopeId, result, requestKey]);

  const extraRunsState = extraRunsByKey[requestKey];

  const mergedRuns = useMemo(() => {
    if (!result || (result.status !== "ready" && result.status !== "sample")) {
      return [];
    }
    const base = result.runs;
    const appended = extraRunsState?.runs ?? [];
    if (appended.length === 0) return base;

    const seen = new Set(base.map((run) => run.id));
    const uniqueAppended = appended.filter((run) => {
      if (seen.has(run.id)) return false;
      seen.add(run.id);
      return true;
    });
    return [...base, ...uniqueAppended];
  }, [result, extraRunsState]);

  const hasMoreRuns =
    result && (result.status === "ready" || result.status === "sample")
      ? (extraRunsState?.hasMore ?? result.hasMoreRuns)
      : false;

  const handleLoadMoreRuns = useCallback(async () => {
    if (!result || (result.status !== "ready" && result.status !== "sample")) return;
    if (isLoadingMoreRuns || !hasMoreRuns) return;

    const activeKey = requestKey;
    const offset = mergedRuns.length;

    setIsLoadingMoreRuns(true);
    setExtraRunsByKey((prev) => ({
      ...prev,
      [activeKey]: {
        runs: prev[activeKey]?.runs ?? [],
        hasMore: prev[activeKey]?.hasMore ?? result.hasMoreRuns,
        error: null,
      },
    }));

    try {
      const page = await profileRepository.loadMoreRuns(
        effectiveUserId,
        offset,
        DEFAULT_RUNS_PAGE_SIZE,
      );
      if (page.error) {
        setExtraRunsByKey((prev) => ({
          ...prev,
          [activeKey]: {
            runs: prev[activeKey]?.runs ?? [],
            hasMore: prev[activeKey]?.hasMore ?? result.hasMoreRuns,
            error: t.profileLoadMoreError,
          },
        }));
        return;
      }

      setExtraRunsByKey((prev) => ({
        ...prev,
        [activeKey]: {
          runs: [...(prev[activeKey]?.runs ?? []), ...page.runs],
          hasMore: page.hasMore,
          error: null,
        },
      }));
    } catch {
      setExtraRunsByKey((prev) => ({
        ...prev,
        [activeKey]: {
          runs: prev[activeKey]?.runs ?? [],
          hasMore: prev[activeKey]?.hasMore ?? result.hasMoreRuns,
          error: t.profileLoadMoreError,
        },
      }));
    } finally {
      setIsLoadingMoreRuns(false);
    }
  }, [
    result,
    isLoadingMoreRuns,
    hasMoreRuns,
    requestKey,
    mergedRuns.length,
    effectiveUserId,
    t.profileLoadMoreError,
  ]);

  const handleConfirmLogout = useCallback(async () => {
    setIsSigningOut(true);
    setLogoutError(null);
    try {
      const res = (await signOut()) as { error?: unknown } | void;
      if (res && typeof res === "object" && "error" in res && res.error) {
        setLogoutError(t.profileLogoutError);
        return;
      }
      setIsLogoutModalOpen(false);
    } catch {
      setLogoutError(t.profileLogoutError);
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, t.profileLogoutError]);

  const canSignOut =
    !isLoadingProfile && result?.status === "ready" && !result.isSampleData && Boolean(user);

  const headerRunner =
    result && (result.status === "ready" || result.status === "sample") ? result.runner : null;

  const headerSeason =
    result && (result.status === "ready" || result.status === "sample") ? result.season : null;

  return (
    <div className="profile-viewport">
      <div className="profile-shell">
        <ProfileHeader
          runner={headerRunner}
          season={headerSeason}
          isSampleData={Boolean(result?.isSampleData)}
          canSignOut={canSignOut}
          onOpenLogout={() => {
            setLogoutError(null);
            setIsLogoutModalOpen(true);
          }}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {isLoadingProfile ? (
          <div className="profile-state-card" role="status" aria-live="polite">
            <div className="profile-spinner" aria-hidden="true" />
            <p className="profile-state-desc">{t.profileLoading}</p>
          </div>
        ) : result?.status === "unauthenticated" ? (
          <div className="profile-state-card">
            <h2 className="profile-state-title">{t.profileAuthTitle}</h2>
            <p className="profile-state-desc">{t.profileAuthDesc}</p>
            <button type="button" className="profile-primary-btn" onClick={openAuthModal}>
              {t.profileAuthCta}
            </button>
          </div>
        ) : result?.status === "error" ? (
          <div className="profile-state-card" role="alert">
            <h2 className="profile-state-title">{t.profileErrorTitle}</h2>
            <p className="profile-state-desc">{t.profileErrorDesc}</p>
            <button
              type="button"
              className="profile-primary-btn"
              onClick={() => setReloadNonce((n) => n + 1)}
            >
              {t.profileRetry}
            </button>
          </div>
        ) : result && (result.status === "ready" || result.status === "sample") ? (
          <main className="profile-main-grid">
            {!result.season && (
              <div className="profile-info-banner" role="status">
                {t.profileNoActiveSeasonDesc}
              </div>
            )}

            <section className="profile-stats-grid" aria-label={t.profileStatsAria}>
              <article className="profile-stat-card">
                <span className="profile-stat-label">{t.profileCurrentLeagueLabel}</span>
                {result.leagueAssignment ? (
                  <span
                    className={`profile-stat-value profile-league-badge profile-league-badge--${result.leagueAssignment.code}`}
                  >
                    {t.leagues[result.leagueAssignment.code]}
                  </span>
                ) : (
                  <span className="profile-stat-muted">{t.profileNoLeagueYet}</span>
                )}
              </article>

              <article className="profile-stat-card">
                <span className="profile-stat-label">{t.profileRefPaceLabel}</span>
                <span className="profile-stat-value">
                  {formatPace(result.leagueAssignment?.refPaceS ?? null)}
                </span>
              </article>

              <article className="profile-stat-card">
                <span className="profile-stat-label">{t.profileOwnedTilesLabel}</span>
                <span className="profile-stat-value">{result.ownedCellsCount}</span>
                <span className="profile-stat-hint">{t.profileOwnedTilesZoneHint}</span>
              </article>
            </section>

            <ProfileStealNotices
              notices={result.stealNotices}
              readIds={readIds}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
            />

            <ProfileRunsHistory
              runs={mergedRuns}
              hasMore={hasMoreRuns}
              isLoadingMore={isLoadingMoreRuns}
              loadMoreError={extraRunsState?.error ?? null}
              onLoadMore={handleLoadMoreRuns}
            />

            <section
              className="profile-section-card profile-account-card"
              aria-labelledby="profile-account-heading"
            >
              <div className="profile-section-header">
                <h2 id="profile-account-heading" className="profile-section-title">
                  {t.profileAccountSectionTitle}
                </h2>
              </div>

              <div className="profile-account-row">
                <div className="profile-account-copy">
                  <h3 className="profile-account-subtitle">{t.profileDeleteAccountTitle}</h3>
                  <p className="profile-account-desc">{t.profileDeleteAccountDesc}</p>
                </div>
                <Link href="/privacidad#borrado-datos" className="profile-privacy-link">
                  {t.profileDeleteAccountLink}
                </Link>
              </div>
            </section>
          </main>
        ) : null}
      </div>

      <ProfileLogoutModal
        isOpen={isLogoutModalOpen}
        isSubmitting={isSigningOut}
        errorMessage={logoutError}
        onClose={() => {
          if (!isSigningOut) setIsLogoutModalOpen(false);
        }}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}
