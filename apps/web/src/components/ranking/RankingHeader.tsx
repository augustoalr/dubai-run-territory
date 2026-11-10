"use client";

import Link from "next/link";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/supabase";

interface RankingHeaderProps {
  seasonName: string;
  daysRemaining: number | null;
  isFinished: boolean;
  isSampleData: boolean;
}

export function RankingHeader({
  seasonName,
  daysRemaining,
  isFinished,
  isSampleData,
}: RankingHeaderProps) {
  const { t } = useI18n();
  const { user, profile, openAuthModal } = useAuth();

  return (
    <header className="ranking-header glass">
      <div className="ranking-header-top">
        <Link href="/" className="back-link" aria-label={t.backToMap}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{t.map}</span>
        </Link>

        <div className="flex items-center gap-2">
          {isSampleData && <span className="ranking-sample-badge">{t.sampleDataBadge}</span>}
          <LocaleToggle />
          {user ? (
            <div className="ranking-user-pill" title={profile?.alias ?? t.userAccount}>
              <span className="ranking-user-avatar">
                {profile?.alias ? profile.alias[0].toUpperCase() : "R"}
              </span>
              <span className="ranking-user-alias">{profile?.alias ?? t.anonymousRunner}</span>
            </div>
          ) : (
            <button
              type="button"
              className="ranking-auth-btn"
              onClick={openAuthModal}
              aria-label={t.login}
            >
              <svg
                width="16"
                height="16"
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
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>

      <div className="ranking-title-row">
        <div>
          <div className="ranking-badge-row">
            <span className="zone-badge">{t.rankingEyebrow}</span>
            <span className="ranking-season-badge">{seasonName}</span>
          </div>
          <h1 className="ranking-page-title">{t.rankingPageTitle}</h1>
          <p className="ranking-subtitle">{t.rankingSubtitle}</p>
        </div>

        {daysRemaining !== null && (
          <div className="ranking-countdown-badge">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              {isFinished ? t.rankingSeasonFinished : t.rankingDaysRemaining(daysRemaining)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
