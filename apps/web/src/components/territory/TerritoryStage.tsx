"use client";

import { cellPolygon, jumeirahKiteZone, type LeagueCode } from "@dubai-run/core";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/supabase";
import { getCellPaint, type ThemeMode } from "@/lib/territory/cell-paint";
import { territoryRepository } from "@/lib/territory/territory-repository";
import type { TerritoryCell, TerritoryData, TerritoryStats } from "@/lib/territory/types";
import { CellBottomSheet } from "./CellBottomSheet";
import { MapLegend } from "./MapLegend";
import { StealGuideModal } from "./StealGuideModal";
import { TerritoryHeader } from "./TerritoryHeader";
import { TerritoryMapView, type CellFeatureCollection } from "./TerritoryMapView";

const EMPTY_STATS: TerritoryStats = {
  mine: 0,
  threatened: 0,
  rival: 0,
  free: 0,
  total: 0,
};

export function TerritoryStage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const [currentLeague, setCurrentLeague] = useState<LeagueCode>("starter");
  const [fetchedUserLeague, setFetchedUserLeague] = useState<{
    userId: string;
    league: LeagueCode;
  } | null>(null);
  const hasManualSelectionRef = useRef(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const requestKey = `${currentLeague}:${currentUserId ?? "anon"}:${reloadTrigger}`;
  const [loadedSnapshot, setLoadedSnapshot] = useState<{
    key: string;
    data: TerritoryData;
  } | null>(null);

  const userLeague: LeagueCode =
    currentUserId && fetchedUserLeague?.userId === currentUserId
      ? fetchedUserLeague.league
      : "starter";

  // Sync html data-theme for css tokens
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Fetch authenticated user's real league from Supabase (defaults to "starter" when absent or logged out)
  useEffect(() => {
    if (!currentUserId) return;
    let isCancelled = false;

    territoryRepository
      .getUserLeague(currentUserId)
      .then((league) => {
        if (isCancelled || !league) return;
        setFetchedUserLeague({ userId: currentUserId, league });
        if (!hasManualSelectionRef.current) {
          setCurrentLeague(league);
        }
      })
      .catch(() => {
        // Keep default "starter" league when profile league cannot be fetched
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUserId]);

  // Load territory cells & ownership reactively on league, session, or retry changes
  useEffect(() => {
    let isCancelled = false;

    territoryRepository
      .getTerritoryData(currentLeague, currentUserId)
      .then((data) => {
        if (!isCancelled) {
          setLoadedSnapshot({ key: requestKey, data });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadedSnapshot({
            key: requestKey,
            data: {
              league: currentLeague,
              userProfile: null,
              seasonName: null,
              hasActiveSeason: false,
              cells: [],
              stats: EMPTY_STATS,
              isSampleData: false,
              error: "network_error",
            },
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentLeague, currentUserId, requestKey]);

  const isLoadingData = loadedSnapshot?.key !== requestKey;
  const activeData = loadedSnapshot?.key === requestKey ? loadedSnapshot.data : null;
  const isNetworkError = activeData?.error === "network_error";
  const activeCells = useMemo(() => activeData?.cells ?? [], [activeData]);
  const activeStats = activeData?.stats ?? EMPTY_STATS;

  const selectedCell: TerritoryCell | null = useMemo(
    () => activeCells.find((c: TerritoryCell) => c.id === selectedId) ?? null,
    [activeCells, selectedId],
  );

  const polygon = jumeirahKiteZone.polygon;

  // Build GeoJSON features for MapLibre
  const cellCollection: CellFeatureCollection = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: activeCells.map((cell: TerritoryCell) => {
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
  }, [activeCells, selectedId, theme]);

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
        userLeague={userLeague}
        stats={activeStats}
        theme={theme}
        seasonName={activeData?.seasonName ?? null}
        hasActiveSeason={activeData?.hasActiveSeason ?? true}
        isSampleData={Boolean(activeData?.isSampleData)}
        onSelectLeague={(league) => {
          hasManualSelectionRef.current = true;
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
      {(!isReady || isLoadingData) && !fatalError && !isNetworkError && (
        <div className="territory-loading-pill" aria-live="polite">
          <span className="spinner-dot" />
          <span>{!isReady ? t.mapLoading : t.territoryLoading}</span>
        </div>
      )}

      {/* Network or WebGL error state */}
      {fatalError && (
        <div className="territory-fatal-error" role="alert">
          <p className="fatal-title">{t.mapFatalTitle}</p>
          <p className="fatal-desc">{t.mapFatalDesc}</p>
        </div>
      )}

      {!fatalError && isNetworkError && (
        <div className="territory-fatal-error" role="alert">
          <p className="fatal-title">{t.territoryErrorTitle}</p>
          <p className="fatal-desc">{t.territoryErrorDesc}</p>
          <button
            type="button"
            className="ranking-retry-btn territory-retry-btn"
            onClick={() => {
              setSelectedId(null);
              setReloadTrigger((prev) => prev + 1);
            }}
          >
            {t.retry}
          </button>
        </div>
      )}
    </main>
  );
}
