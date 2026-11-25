"use client";

import Link from "next/link";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { ThemeToggle } from "@/components/territory/ThemeToggle";
import { useI18n } from "@/i18n";
import type { ThemeMode } from "@/lib/territory/cell-paint";

interface AdminHeaderProps {
  theme: ThemeMode;
  isSampleData: boolean;
  onToggleTheme: () => void;
}

export function AdminHeader({ theme, isSampleData, onToggleTheme }: AdminHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="profile-header">
      <div className="profile-topbar">
        <Link href="/" className="profile-back-btn">
          <span aria-hidden="true">←</span>
          <span>{t.adminBackToMap}</span>
        </Link>

        <div className="profile-topbar-actions">
          {isSampleData && (
            <span className="ranking-sample-badge" data-testid="admin-sample-badge">
              {t.sampleDataBadge}
            </span>
          )}
          <LocaleToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      <div className="admin-hero">
        <h1 className="admin-title">{t.adminPageTitle}</h1>
        <p className="admin-subtitle">{t.adminSubtitle}</p>
      </div>
    </header>
  );
}
