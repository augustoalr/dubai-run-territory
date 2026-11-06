"use client";

import { cellPolygon, jumeirahKiteZone, type LeagueCode } from "@dubai-run/core";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { getCellPaint, type ThemeMode } from "@/lib/territory/cell-paint";
import { territoryRepository } from "@/lib/territory/territory-repository";
import type { TerritoryCell } from "@/lib/territory/types";
import { CellBottomSheet } from "./CellBottomSheet";
import { MapLegend } from "./MapLegend";
import { StealGuideModal } from "./StealGuideModal";
import { TerritoryHeader } from "./TerritoryHeader";
import { TerritoryMapView, type CellFeatureCollection } from "./TerritoryMapView";

export function TerritoryStage() {
  const { t } = useI18n();
  const userProfile = useMemo(() => territoryRepository.getUserProfile(), []);
  const [currentLeague, setCurrentLeague] = useState<LeagueCode>(userProfile.league);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Sync html data-theme for css tokens
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const territoryData = useMemo(
    () => territoryRepository.getTerritoryData(currentLeague),
    [currentLeague],
  );

  const selectedCell: TerritoryCell | null = useMemo(
    () => territoryData.cells.find((c: TerritoryCell) => c.id === selectedId) ?? null,
    [territoryData.cells, selectedId],
  );

  const polygon = jumeirahKiteZone.polygon;

  // Build GeoJSON features for MapLibre
  const cellCollection: CellFeatureCollection = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: territoryData.cells.map((cell: TerritoryCell) => {
        const isSelected = cell.id === selectedId;
        const paint = getCellPaint(cell, isSelected, theme);
        return {
          type: "Feature" as const,
          properties: {
            id: cell.id,
            status: cell.status,
            fillColor: paint.fillColor,
            fillOpacity: paint.fillOpacity,
            strokeColor: paint.strokeColor,
            strokeWidth: paint.strokeWidth,
            isThreatened: paint.isThreatened,
            selected: paint.selected,
          },
          geometry: cellPolygon(cell.id),
        };
      }),
    };
  }, [territoryData.cells, selectedId, theme]);

  if (!polygon) {
    return (
      <div className="territory-error-state">
        <p>{t.mapGeometryError}</p>
      </div>
    );
  }

  return (
    <main className="territory-viewport" data-theme={theme}>
      <TerritoryMapView
        polygon={polygon}
        cells={cellCollection}
        theme={theme}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onReady={() => setIsReady(true)}
        onFatal={setFatalError}
      />

      <div className="territory-vignette" />

      {/* Floating Header */}
      <TerritoryHeader
        currentLeague={currentLeague}
        userLeague={userProfile.league}
        stats={territoryData.stats}
        theme={theme}
        onSelectLeague={(league) => {
          setCurrentLeague(league);
          setSelectedId(null);
        }}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
      />

      {/* Fixed Small Legend */}
      <MapLegend />

      {/* Floating Action Buttons: Mis carreras y Grabar */}
      {!selectedCell && (
        <div className="territory-fab-cluster">
          <Link href="/carreras" className="territory-runs-fab" aria-label={t.runs}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>{t.runs}</span>
          </Link>
          <Link href="/grabar" className="territory-record-fab" aria-label={t.record}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>{t.record}</span>
          </Link>
        </div>
      )}

      {/* Bottom Sheet on cell tap */}
      <CellBottomSheet
        cell={selectedCell}
        onClose={() => setSelectedId(null)}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Modal: Cómo robarla / defenderla */}
      <StealGuideModal
        cell={selectedCell}
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Loading state indicator */}
      {!isReady && !fatalError && (
        <div className="territory-loading-pill" aria-live="polite">
          <span className="spinner-dot" />
          <span>{t.mapLoading}</span>
        </div>
      )}

      {/* Error state */}
      {fatalError && (
        <div className="territory-fatal-error" role="alert">
          <p className="fatal-title">{t.mapFatalTitle}</p>
          <p className="fatal-desc">{t.mapFatalDesc}</p>
        </div>
      )}
    </main>
  );
}
