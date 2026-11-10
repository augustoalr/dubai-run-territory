"use client";

import Link from "next/link";
import type { RankedRunner } from "@dubai-run/core";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/supabase";

interface UserStandingBannerProps {
  standing?: RankedRunner | null;
}

export function UserStandingBanner({ standing }: UserStandingBannerProps) {
  const { t } = useI18n();
  const { user, profile, openAuthModal } = useAuth();

  if (!user) {
    return (
      <div className="user-standing-card glass not-logged">
        <div className="user-standing-content">
          <div className="user-standing-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="user-standing-text">
            <span className="user-standing-title">{t.rankingYourPosition}</span>
            <span className="user-standing-desc">{t.rankingSignInToView}</span>
          </div>
        </div>
        <button type="button" className="user-standing-action-btn" onClick={openAuthModal}>
          {t.login}
        </button>
      </div>
    );
  }

  if (standing) {
    return (
      <div className="user-standing-card glass is-ranked">
        <div className="user-standing-content">
          <div className="user-standing-rank-badge">
            <span className="rank-hash">#</span>
            <span className="rank-num">{standing.rank}</span>
          </div>
          <div className="user-standing-text">
            <div className="user-standing-title-row">
              <span className="user-standing-title">{t.rankingYourPosition}</span>
              <span className="user-standing-alias">
                {profile?.alias ?? standing.alias ?? t.anonymousRunner}
              </span>
            </div>
            <div className="user-standing-metrics">
              <span className="standing-pts">
                {standing.points} {t.rankingPointsSuffix}
              </span>
              <span className="standing-divider">·</span>
              <span className="standing-cells">{t.rankingCellsCount(standing.cellsOwned)}</span>
              <span className="standing-divider">·</span>
              <span className="standing-km">
                {standing.distanceInZoneKm} {t.rankingKmUnit}
              </span>
            </div>
          </div>
        </div>
        <Link href="/grabar" className="user-standing-run-link">
          {t.record}
        </Link>
      </div>
    );
  }

  // Logged in but not yet ranked in this league
  return (
    <div className="user-standing-card glass not-ranked">
      <div className="user-standing-content">
        <div className="user-standing-icon pulse">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <div className="user-standing-text">
          <span className="user-standing-title">{t.rankingNotRankedYet}</span>
          <span className="user-standing-desc">{t.rankingRunToScore}</span>
        </div>
      </div>
      <Link href="/grabar" className="user-standing-action-btn">
        {t.rankingGoRun}
      </Link>
    </div>
  );
}
