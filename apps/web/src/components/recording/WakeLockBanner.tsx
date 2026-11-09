"use client";

import { useI18n } from "@/i18n";

interface WakeLockBannerProps {
  isRecording: boolean;
}

export function WakeLockBanner({ isRecording }: WakeLockBannerProps) {
  const { t } = useI18n();

  if (!isRecording) return null;

  return (
    <div className="wakelock-banner glass active" role="status" aria-live="polite">
      <div className="banner-icon-badge" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      </div>
      <p className="banner-text">{t.wakeLockNotice}</p>
    </div>
  );
}
