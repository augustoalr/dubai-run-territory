"use client";

import { useState } from "react";
import { RunMiniMap } from "@/components/runs/RunMiniMap";
import { useI18n } from "@/i18n";
import type { AdminActionType, AdminReportItem } from "@/lib/admin";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import { resolveAdminErrorMessage, resolveFlagLabel } from "./admin-error-message";

interface AdminReportCardProps {
  report: AdminReportItem;
  theme: ThemeMode;
  isBusy: boolean;
  onAction: (
    action: AdminActionType,
    targetId: string,
    reason: string,
  ) => Promise<{
    ok: boolean;
    code?: string;
  }>;
}

export function AdminReportCard({ report, theme, isBusy, onAction }: AdminReportCardProps) {
  const { t, formatDate, formatDistance } = useI18n();
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const statusLabel =
    report.status === "reviewing" ? t.adminReportStatusReviewing : t.adminReportStatusOpen;

  async function handleSubmit(action: AdminActionType, targetId: string) {
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 500) {
      setErrorMsg(t.adminReasonTooShort);
      return;
    }
    setErrorMsg(null);
    const result = await onAction(action, targetId, trimmed);
    if (!result.ok && result.code) {
      setErrorMsg(resolveAdminErrorMessage(result.code, t));
    }
  }

  return (
    <article className="admin-card" data-testid={`admin-report-${report.id}`}>
      <div className="admin-card-header">
        <div className="admin-card-heading">
          <span className="admin-card-title">
            {t.adminReporterLabel}: {report.reporterAlias ?? t.adminUnknownRunner}
          </span>
          <span className="admin-card-meta">
            {formatDate(report.createdAt)}
            {report.run
              ? ` · ${t.adminRunnerLabel}: ${report.run.runnerAlias ?? t.adminUnknownRunner}`
              : ""}
            {report.run && report.run.distanceInZoneM !== null
              ? ` · ${formatDistance(report.run.distanceInZoneM)}`
              : ""}
          </span>
        </div>
        <span className="profile-status-pill profile-status-pill--review">{statusLabel}</span>
      </div>

      <p className="admin-detail-note">
        <strong>{t.adminReportReasonLabel}:</strong> {report.reason}
      </p>

      {report.run && (
        <>
          {report.run.flags.length > 0 && (
            <div className="admin-chip-row" aria-label={t.adminFlagsLabel}>
              {report.run.flags.map((flag) => (
                <span key={flag} className="admin-flag-chip">
                  {resolveFlagLabel(flag, t)}
                </span>
              ))}
            </div>
          )}

          <div className="admin-minimap-wrap">
            <RunMiniMap coordinates={report.run.coordinates} theme={theme} />
            {report.run.trackUnavailable && (
              <p className="admin-track-warning">{t.adminTrackUnavailable}</p>
            )}
          </div>
        </>
      )}

      <div className="admin-decision-box">
        <label className="admin-reason-label" htmlFor={`report-reason-${report.id}`}>
          {t.adminReasonLabel}
        </label>
        <input
          id={`report-reason-${report.id}`}
          type="text"
          className="admin-reason-input"
          value={reason}
          maxLength={500}
          disabled={isBusy}
          placeholder={t.adminReasonPlaceholder}
          onChange={(event) => {
            setReason(event.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
        />
        {errorMsg && (
          <p className="admin-inline-error" role="alert">
            {errorMsg}
          </p>
        )}
        <div className="admin-actions-row">
          {report.run && report.run.status !== "voided" && (
            <button
              type="button"
              className="admin-btn admin-btn--danger"
              disabled={isBusy}
              onClick={() => void handleSubmit("void_run", report.run!.id)}
            >
              {isBusy ? t.adminSubmitting : t.adminVoidRun}
            </button>
          )}
          <button
            type="button"
            className="admin-btn admin-btn--approve"
            disabled={isBusy}
            onClick={() => void handleSubmit("resolve_report", report.id)}
          >
            {isBusy ? t.adminSubmitting : t.adminResolveReport}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--neutral"
            disabled={isBusy}
            onClick={() => void handleSubmit("dismiss_report", report.id)}
          >
            {isBusy ? t.adminSubmitting : t.adminDismissReport}
          </button>
        </div>
      </div>
    </article>
  );
}
