"use client";

import { useState } from "react";
import { RunMiniMap } from "@/components/runs/RunMiniMap";
import { useI18n } from "@/i18n";
import type { AdminActionType, AdminRunItem } from "@/lib/admin";
import { resolveRunReasonInfo } from "@/lib/profile/run-reason";
import type { ProfileRunStatus } from "@/lib/profile/types";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import {
  resolveAdminErrorMessage,
  resolveFlagLabel,
  resolveRunSourceLabel,
} from "./admin-error-message";

const VALID_PROFILE_STATUSES: ReadonlySet<string> = new Set<ProfileRunStatus>([
  "pending",
  "processing",
  "accepted",
  "rejected",
  "review",
  "voided",
]);

interface AdminReviewRunCardProps {
  run: AdminRunItem;
  theme: ThemeMode;
  busyKey: string | null;
  onAction: (
    action: AdminActionType,
    targetId: string,
    reason: string,
  ) => Promise<{
    ok: boolean;
    code?: string;
  }>;
}

export function AdminReviewRunCard({ run, theme, busyKey, onAction }: AdminReviewRunCardProps) {
  const { t, formatDate, formatDistance } = useI18n();
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAnyBusy = busyKey !== null;
  const isApproving = busyKey === `approve_run:${run.id}`;
  const isVoiding = busyKey === `void_run:${run.id}`;

  const normalizedStatus: ProfileRunStatus = VALID_PROFILE_STATUSES.has(run.status)
    ? (run.status as ProfileRunStatus)
    : "review";
  const rejectInfo = resolveRunReasonInfo(normalizedStatus, run.rejectCode);
  const rejectLabel = rejectInfo?.reasonKey ? t.profileRejectReasons[rejectInfo.reasonKey] : null;

  async function handleSubmit(action: "approve_run" | "void_run") {
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 500) {
      setErrorMsg(t.adminReasonTooShort);
      return;
    }
    setErrorMsg(null);
    const result = await onAction(action, run.id, trimmed);
    if (!result.ok && result.code) {
      setErrorMsg(resolveAdminErrorMessage(result.code, t));
    }
  }

  return (
    <article className="admin-card" data-testid={`admin-run-${run.id}`}>
      <div className="admin-card-header">
        <div className="admin-card-heading">
          <span className="admin-card-title">
            {t.adminRunnerLabel}: {run.runnerAlias ?? t.adminUnknownRunner}
          </span>
          <span className="admin-card-meta">
            {formatDate(run.createdAt)}
            {run.distanceInZoneM !== null ? ` · ${formatDistance(run.distanceInZoneM)}` : ""}
            {` · ${run.format.toUpperCase()} · ${resolveRunSourceLabel(run.source, t)}`}
          </span>
        </div>
        <span className="profile-run-status profile-run-status--review">
          {t.profileRunStatuses.review}
        </span>
      </div>

      {run.flags.length > 0 && (
        <div className="admin-chip-row" aria-label={t.adminFlagsLabel}>
          {run.flags.map((flag) => (
            <span key={flag} className="admin-flag-chip">
              {resolveFlagLabel(flag, t)}
            </span>
          ))}
        </div>
      )}

      {rejectLabel && (
        <p className="admin-detail-note">
          <strong>{t.adminRejectReasonLabel}:</strong> {rejectLabel}
        </p>
      )}

      <div className="admin-minimap-wrap">
        <RunMiniMap coordinates={run.coordinates} theme={theme} />
        {run.trackUnavailable && <p className="admin-track-warning">{t.adminTrackUnavailable}</p>}
      </div>

      <div className="admin-decision-box">
        <label className="admin-reason-label" htmlFor={`run-reason-${run.id}`}>
          {t.adminReasonLabel}
        </label>
        <input
          id={`run-reason-${run.id}`}
          type="text"
          className="admin-reason-input"
          value={reason}
          maxLength={500}
          disabled={isAnyBusy}
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
          <button
            type="button"
            className="admin-btn admin-btn--approve"
            disabled={isAnyBusy}
            onClick={() => void handleSubmit("approve_run")}
          >
            {isApproving ? t.adminSubmitting : t.adminApproveRun}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--danger"
            disabled={isAnyBusy}
            onClick={() => void handleSubmit("void_run")}
          >
            {isVoiding ? t.adminSubmitting : t.adminVoidRun}
          </button>
        </div>
      </div>
    </article>
  );
}
