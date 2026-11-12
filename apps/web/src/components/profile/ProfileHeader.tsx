"use client";

import Link from "next/link";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { ThemeToggle } from "@/components/territory/ThemeToggle";
import { useI18n } from "@/i18n";
import type { ProfileRunner, ProfileSeasonInfo } from "@/lib/profile";
import { getInitials } from "@/lib/territory/helpers";

interface ProfileHeaderProps {
  runner: ProfileRunner | null;
  season: ProfileSeasonInfo | null;
  isSampleData: boolean;
  canSignOut: boolean;
  onOpenLogout: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function ProfileHeader({
  runner,
  season,
  isSampleData,
  canSignOut,
  onOpenLogout,
  theme,
  onToggleTheme,
}: ProfileHeaderProps) {
  const { t, formatDate } = useI18n();

  const displayName = runner ? (runner.alias ?? t.anonymousRunner) : t.profilePageTitle;
  const initials = runner?.alias ? getInitials(runner.alias) : "R";

  return (
    <header className="profile-header">
      <div className="profile-topbar">
        <Link href="/" className="profile-back-btn">
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
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          <span>{t.profileBackToMap}</span>
        </Link>

        <div className="profile-topbar-actions">
          {isSampleData && <span className="ranking-sample-badge">{t.sampleDataBadge}</span>}
          <LocaleToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {canSignOut && (
            <button type="button" className="profile-signout-btn" onClick={onOpenLogout}>
              {t.profileSignOutCta}
            </button>
          )}
        </div>
      </div>

      {runner ? (
        <div className="profile-identity-card">
          <div className="profile-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="profile-identity-meta">
            <span className="profile-eyebrow">{t.profileEyebrow}</span>
            <h1 className="profile-runner-name">{displayName}</h1>
            <div className="profile-identity-subrow">
              {runner.createdAt && (
                <span className="profile-member-since">
                  {t.profileMemberSince(formatDate(runner.createdAt))}
                </span>
              )}
              <span className="profile-season-pill">
                {season ? season.name : t.profileNoActiveSeasonHint}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="profile-title-block">
          <span className="profile-eyebrow">{t.profileEyebrow}</span>
          <h1 className="profile-page-title">{t.profilePageTitle}</h1>
          <p className="profile-page-subtitle">{t.profileSubtitle}</p>
        </div>
      )}
    </header>
  );
}
