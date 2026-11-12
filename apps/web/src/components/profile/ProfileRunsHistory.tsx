"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import type { ProfileRunItem } from "@/lib/profile";

interface ProfileRunsHistoryProps {
  runs: ProfileRunItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
}

const KNOWN_REASON_CODES = [
  "NO_TIMESTAMPS",
  "NOT_RUNNING",
  "OUT_OF_WINDOW",
  "LOW_DENSITY",
  "GPS_SPIKES",
  "TOO_SHORT",
  "DUPLICATE",
  "COPIED_TRACK",
  "RATE_LIMIT",
  "IMPOSSIBLE_PACE",
  "BIKE_PATTERN",
  "CADENCE",
] as const;

type KnownReasonCode = (typeof KNOWN_REASON_CODES)[number];

const KNOWN_REASON_SET: ReadonlySet<string> = new Set(KNOWN_REASON_CODES);

function resolveReasonText(
  rejectCode: string | null,
  reasons: Record<KnownReasonCode | "unknown", string>,
): string | null {
  if (!rejectCode) return null;
  const trimmed = rejectCode.trim();
  if (!trimmed) return null;
  if (KNOWN_REASON_SET.has(trimmed)) {
    return reasons[trimmed as KnownReasonCode];
  }
  return reasons.unknown;
}

export function ProfileRunsHistory({
  runs,
  hasMore,
  isLoadingMore,
  loadMoreError,
  onLoadMore,
}: ProfileRunsHistoryProps) {
  const { t, formatDate, formatDistance } = useI18n();

  return (
    <section className="profile-section-card" aria-labelledby="profile-runs-heading">
      <div className="profile-section-header">
        <h2 id="profile-runs-heading" className="profile-section-title">
          {t.profileRunsTitle}
        </h2>
      </div>

      {runs.length === 0 ? (
        <div className="profile-empty-box">
          <p className="profile-empty-title">{t.profileRunsEmptyTitle}</p>
          <p className="profile-empty-desc">{t.profileRunsEmptyDesc}</p>
          <Link href="/grabar" className="profile-primary-link-btn">
            {t.profileRunsEmptyCta}
          </Link>
        </div>
      ) : (
        <>
          <ul className="profile-runs-list" aria-label={t.profileRunsAria}>
            {runs.map((run) => {
              const displayDate = formatDate(run.startedAt ?? run.createdAt);
              const displayDistance =
                run.distanceInZoneM !== null
                  ? formatDistance(run.distanceInZoneM)
                  : t.profileRunNoZoneDistance;
              const reasonText = resolveReasonText(run.rejectCode, t.profileRejectReasons);

              return (
                <li key={run.id} className="profile-run-card">
                  <div className="profile-run-top-row">
                    <div className="profile-run-badges">
                      <span className={`profile-run-status profile-run-status--${run.status}`}>
                        {t.profileRunStatuses[run.status]}
                      </span>
                      <span className="profile-run-format">{run.format.toUpperCase()}</span>
                    </div>
                    <span className="profile-run-distance">{displayDistance}</span>
                  </div>

                  <div className="profile-run-meta-row">
                    <span className="profile-run-date">
                      {t.profileRunDateLabel}: {displayDate}
                    </span>
                    <span className="profile-run-zone-tag">{t.profileRunDistanceLabel}</span>
                  </div>

                  {reasonText && (
                    <p className="profile-run-reason">
                      <strong>{t.profileRunReasonLabel}:</strong> {reasonText}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {loadMoreError && (
            <div className="profile-inline-error" role="alert">
              {loadMoreError}
            </div>
          )}

          {hasMore && (
            <div className="profile-load-more-wrap">
              <button
                type="button"
                className="profile-load-more-btn"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? t.profileLoadingMoreRuns : t.profileLoadMoreRuns}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
