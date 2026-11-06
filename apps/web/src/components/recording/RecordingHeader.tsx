"use client";

import Link from "next/link";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { useI18n } from "@/i18n";
import type { RecorderStatus } from "@/lib/recording/use-runner-recorder";

interface RecordingHeaderProps {
  status: RecorderStatus;
  gpsAccuracy: number | null;
}

export function RecordingHeader({ status, gpsAccuracy }: RecordingHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="recording-header glass">
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

      <div className="header-title-box">
        <span className="zone-badge">{t.zoneTrack}</span>
        <h1 className="recording-title">{t.recordRunTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <LocaleToggle />
        <div className="gps-status-box">
          {status === "acquiring" && (
            <span className="gps-pill acquiring">
              <span className="pulse-dot" />
              <span>{t.statusAcquiring}</span>
            </span>
          )}
          {status === "recording" && (
            <span className="gps-pill active">
              <span className="active-dot" />
              <span>GPS {gpsAccuracy !== null ? `±${gpsAccuracy}m` : "OK"}</span>
            </span>
          )}
          {status === "idle" && (
            <span className="gps-pill idle">
              <span>{t.statusIdle}</span>
            </span>
          )}
          {status === "finished" && (
            <span className="gps-pill saved">
              <span>{t.statusSaved}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
