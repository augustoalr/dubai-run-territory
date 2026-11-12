"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { resolveRunReasonInfo, type ProfileRunItem } from "@/lib/profile";

interface ProfileRunsHistoryProps {
  runs: ProfileRunItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
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
              const reasonInfo = resolveRunReasonInfo(run.status, run.rejectCode);

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

                  {reasonInfo && (
                    <p className={`profile-run-reason profile-run-reason--${reasonInfo.variant}`}>
                      <strong>
                        {reasonInfo.labelKind === "note"
                          ? t.profileRunNoteLabel
                          : t.profileRunReasonLabel}
                        :
                      </strong>{" "}
                      {t.profileRejectReasons[reasonInfo.reasonKey]}
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
