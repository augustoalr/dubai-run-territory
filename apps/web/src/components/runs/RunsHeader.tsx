"use client";

import Link from "next/link";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { useI18n } from "@/i18n";

export function RunsHeader() {
  const { t } = useI18n();

  return (
    <header className="runs-header glass">
      <div className="runs-header-top">
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
          <LocaleToggle />
          <Link href="/grabar" className="runs-record-shortcut" aria-label={t.recordRunShortcut}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>{t.record}</span>
          </Link>
        </div>
      </div>

      <div className="runs-title-row">
        <div>
          <span className="zone-badge">{t.yourLog}</span>
          <h1 className="runs-page-title">{t.runsPageTitle}</h1>
        </div>
      </div>
    </header>
  );
}
