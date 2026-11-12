"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n";
import {
  adminRepository,
  type AdminActionType,
  type AdminAuditLogItem,
  type AdminLoadResult,
  type AdminReportItem,
  type AdminRunItem,
} from "@/lib/admin";
import { useAuth } from "@/lib/supabase";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import { AdminAuditLogList } from "./AdminAuditLogList";
import { AdminHeader } from "./AdminHeader";
import { AdminReportCard } from "./AdminReportCard";
import { AdminReviewRunCard } from "./AdminReviewRunCard";

const THEME_STORAGE_KEY = "dubai-run-theme";
const THEME_CHANGE_EVENT = "dubai-run-admin-theme-change";

type AdminTab = "runs" | "reports" | "audit";

function subscribeToTheme(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    observer.disconnect();
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

function getThemeSnapshot(): ThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): ThemeMode {
  return "dark";
}

function applySampleMutation(
  prev: AdminLoadResult,
  action: AdminActionType,
  targetId: string,
  reason: string,
): AdminLoadResult {
  if (prev.status !== "sample") return prev;

  let runsReview: AdminRunItem[] = prev.runsReview;
  let reports: AdminReportItem[] = prev.reports;
  const targetType: "run" | "report" =
    action === "approve_run" || action === "void_run" ? "run" : "report";

  if (action === "approve_run" || action === "void_run") {
    runsReview = prev.runsReview.filter((run) => run.id !== targetId);
    reports = prev.reports.filter((report) => report.runId !== targetId);
  } else {
    reports = prev.reports.filter((report) => report.id !== targetId);
  }

  const newEntry: AdminAuditLogItem = {
    id: `sample-audit-${Date.now()}`,
    adminId: "sample-admin",
    adminAlias: "MarinaAdmin",
    action,
    targetType,
    targetId,
    reason,
    metadata: { admin_alias: "MarinaAdmin" },
    createdAt: new Date().toISOString(),
  };

  return {
    ...prev,
    runsReview,
    reports,
    auditLogs: [newEntry, ...prev.auditLogs],
  };
}

export function AdminContainer() {
  const { t } = useI18n();
  const { isLoading: authLoading, session, openAuthModal } = useAuth();
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  const [state, setState] = useState<AdminLoadResult | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("runs");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const handleToggleTheme = useCallback(() => {
    if (typeof document === "undefined") return;
    const next: ThemeMode = getThemeSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const accessToken = session?.access_token ?? null;

    adminRepository
      .getQueue(accessToken)
      .then((result) => {
        if (!cancelled) {
          setState(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            isSampleData: false,
            error: "network_error",
            runsReview: [],
            reports: [],
            auditLogs: [],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.access_token, reloadNonce]);

  const handleAction = useCallback(
    async (action: AdminActionType, targetId: string, reason: string) => {
      const opKey = `${action}:${targetId}`;
      setBusyKey(opKey);
      setSuccessNotice(null);

      const result = await adminRepository.submitAction({
        action,
        targetId,
        reason,
        accessToken: session?.access_token ?? null,
      });

      setBusyKey(null);

      if (!result.ok) {
        if (result.status === 401) {
          setReloadNonce((prev) => prev + 1);
        }
        return { ok: false, code: result.code };
      }

      setSuccessNotice(t.adminActionSuccess);

      setState((prev) => {
        if (!prev) return prev;
        if (prev.status === "sample") {
          return applySampleMutation(prev, action, targetId, reason);
        }
        return prev;
      });

      if (state?.status !== "sample") {
        setReloadNonce((prev) => prev + 1);
      }

      return { ok: true };
    },
    [session?.access_token, state?.status, t.adminActionSuccess],
  );

  const isSampleData = state?.status === "sample";

  return (
    <div className="profile-theme admin-page" data-theme={theme}>
      <div className="profile-shell admin-shell">
        <AdminHeader theme={theme} isSampleData={isSampleData} onToggleTheme={handleToggleTheme} />

        {(authLoading || state === null) && (
          <div className="profile-state-card" role="status" aria-live="polite">
            <p className="profile-state-desc">{t.adminLoading}</p>
          </div>
        )}

        {!authLoading && state?.status === "unauthenticated" && (
          <div className="profile-state-card">
            <h2 className="profile-state-title">{t.adminUnauthenticatedTitle}</h2>
            <p className="profile-state-desc">{t.adminUnauthenticatedDesc}</p>
            <button type="button" className="profile-cta-btn" onClick={() => openAuthModal()}>
              {t.adminSignInCta}
            </button>
          </div>
        )}

        {!authLoading && state?.status === "forbidden" && (
          <div className="profile-state-card">
            <h2 className="profile-state-title">{t.adminForbiddenTitle}</h2>
            <p className="profile-state-desc">{t.adminForbiddenDesc}</p>
          </div>
        )}

        {!authLoading && state?.status === "error" && (
          <div className="profile-state-card" role="alert">
            <h2 className="profile-state-title">{t.adminErrorTitle}</h2>
            <p className="profile-state-desc">{t.adminErrorDesc}</p>
            <button
              type="button"
              className="profile-cta-btn"
              onClick={() => setReloadNonce((prev) => prev + 1)}
            >
              {t.adminRetry}
            </button>
          </div>
        )}

        {!authLoading && (state?.status === "ready" || state?.status === "sample") && (
          <>
            {successNotice && (
              <div className="admin-success-banner" role="status" aria-live="polite">
                {successNotice}
              </div>
            )}

            <nav className="admin-tabs" aria-label={t.adminPageTitle}>
              <button
                type="button"
                className={`admin-tab-btn${activeTab === "runs" ? " admin-tab-btn--active" : ""}`}
                onClick={() => setActiveTab("runs")}
              >
                <span>{t.adminTabRuns}</span>
                <span className="admin-tab-count">{state.runsReview.length}</span>
              </button>
              <button
                type="button"
                className={`admin-tab-btn${activeTab === "reports" ? " admin-tab-btn--active" : ""}`}
                onClick={() => setActiveTab("reports")}
              >
                <span>{t.adminTabReports}</span>
                <span className="admin-tab-count">{state.reports.length}</span>
              </button>
              <button
                type="button"
                className={`admin-tab-btn${activeTab === "audit" ? " admin-tab-btn--active" : ""}`}
                onClick={() => setActiveTab("audit")}
              >
                <span>{t.adminTabAudit}</span>
                <span className="admin-tab-count">{state.auditLogs.length}</span>
              </button>
            </nav>

            {activeTab === "runs" && (
              <section className="admin-section" aria-label={t.adminTabRuns}>
                {state.runsReview.length === 0 ? (
                  <div className="profile-state-card">
                    <p className="profile-state-desc">{t.adminEmptyRuns}</p>
                  </div>
                ) : (
                  <div className="admin-cards-list">
                    {state.runsReview.map((run) => (
                      <AdminReviewRunCard
                        key={run.id}
                        run={run}
                        theme={theme}
                        isBusy={busyKey !== null}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "reports" && (
              <section className="admin-section" aria-label={t.adminTabReports}>
                {state.reports.length === 0 ? (
                  <div className="profile-state-card">
                    <p className="profile-state-desc">{t.adminEmptyReports}</p>
                  </div>
                ) : (
                  <div className="admin-cards-list">
                    {state.reports.map((report) => (
                      <AdminReportCard
                        key={report.id}
                        report={report}
                        theme={theme}
                        isBusy={busyKey !== null}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "audit" && (
              <section className="admin-section" aria-label={t.adminTabAudit}>
                <AdminAuditLogList logs={state.auditLogs} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
