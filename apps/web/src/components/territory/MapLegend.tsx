"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";

export function MapLegend() {
  const { t } = useI18n();

  return (
    <aside className="map-legend-card glass" aria-label={t.legendTitle}>
      <div className="legend-items">
        <div className="legend-item" title={t.legendMineDesc}>
          <span className="swatch-indicator swatch-mine" />
          <span className="legend-label">{t.legendMine}</span>
        </div>

        <div className="legend-item" title={t.legendThreatenedDesc}>
          <span className="swatch-indicator swatch-threatened">
            <span className="pulse-halo" />
          </span>
          <span className="legend-label">{t.legendThreatened}</span>
        </div>

        <div className="legend-item" title={t.legendRivalDesc}>
          <span className="swatch-indicator swatch-rival" />
          <span className="legend-label">{t.legendRival}</span>
        </div>

        <div className="legend-item" title={t.legendFreeDesc}>
          <span className="swatch-indicator swatch-free" />
          <span className="legend-label">{t.legendFree}</span>
        </div>
      </div>

      <div className="legend-legal-row">
        <Link href="/privacidad" className="legend-legal-link">
          {t.privacy}
        </Link>
        <span className="legend-legal-sep" aria-hidden="true">
          ·
        </span>
        <Link href="/terminos" className="legend-legal-link">
          {t.terms}
        </Link>
      </div>
    </aside>
  );
}
