"use client";

import {
  LEAGUE_CODES,
  ZONE_CATALOG,
  cellPolygon,
  cellsForZone,
  jumeirahKiteZone,
  type LeagueCode,
} from "@dubai-run/core";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { dictionary, type Locale } from "@/i18n";
import { seasonRangeLabel } from "@/lib/example-season";
import { buildMockTerritory, paceLabel, paintCell, type MockCell } from "@/lib/mock-territory";
import { publicSupabaseConfig } from "@/lib/public-env";
import { MapView } from "./MapView";

const LEAGUE_ACCENT: Record<LeagueCode, string> = {
  elite: "#ff4d6a",
  advanced: "#ffb020",
  intermediate: "#3ee0b0",
  starter: "#7aa2ff",
};

export function MapStage() {
  const [locale, setLocale] = useState<Locale>("es");
  const [league, setLeague] = useState<LeagueCode>("advanced");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const copy = dictionary(locale);
  const backend = publicSupabaseConfig();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const polygon = jumeirahKiteZone.polygon;
  const h3Cells = useMemo(() => cellsForZone(jumeirahKiteZone), []);
  const territory = useMemo(
    () => buildMockTerritory(h3Cells, jumeirahKiteZone.centerline?.coordinates ?? [], league),
    [h3Cells, league],
  );
  const selected = territory.find((cell) => cell.h3 === selectedId) ?? null;
  const counts = countKinds(territory);

  const collection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: territory.map((cell) => {
        const paint = paintCell(cell);
        return {
          type: "Feature" as const,
          properties: {
            h3: cell.h3,
            color: paint.color,
            opacity: paint.opacity,
            lineColor: paint.lineColor,
            selected: cell.h3 === selectedId ? 1 : 0,
          },
          geometry: cellPolygon(cell.h3),
        };
      }),
    }),
    [selectedId, territory],
  );

  if (!polygon) return null;

  return (
    <main
      className="map-shell"
      data-supabase={backend.anonKeyConfigured ? "ready" : "pending"}
      data-supabase-url={backend.url}
    >
      <MapView
        polygon={polygon}
        cells={collection}
        onSelect={setSelectedId}
        onReady={() => setReady(true)}
        onFatal={setFatal}
        label={copy.mapLabel}
      />
      <div className="vignette" />

      <header className="glass hud hud-top">
        <div className="hud-top-row">
          <div>
            <p className="eyebrow">{copy.zoneEyebrow}</p>
            <h1 className="wordmark">{copy.appName}</h1>
          </div>
          <button
            type="button"
            className="locale-btn"
            aria-label={copy.localeLabel}
            onClick={() => setLocale(locale === "es" ? "en" : "es")}
          >
            {copy.localeSwitch}
          </button>
        </div>
        <p className="zone-name">{jumeirahKiteZone.name[locale]}</p>
        <p className="example-line">
          <span className="pill">{copy.example}</span>
          {copy.exampleNote}
        </p>
      </header>

      <section className="glass hud hud-bottom" aria-label={copy.leaguesLabel}>
        {selected ? (
          <CellDetail cell={selected} locale={locale} onClose={() => setSelectedId(null)} />
        ) : (
          <div key={league} className="stats">
            <Stat value={String(counts.mine)} label={copy.yours} accent />
            <Stat value={String(counts.other)} label={copy.rivals} />
            <Stat value={String(counts.free)} label={copy.free} />
          </div>
        )}

        <div className="season-row">
          <span>{copy.season}</span>
          <span>{seasonRangeLabel(locale)}</span>
        </div>

        <div className="chip-row" role="group" aria-label={copy.leaguesLabel}>
          {LEAGUE_CODES.map((code) => (
            <button
              key={code}
              type="button"
              className="chip"
              aria-pressed={league === code}
              style={{ "--league": LEAGUE_ACCENT[code] } as CSSProperties}
              onClick={() => {
                setLeague(code);
                setSelectedId(null);
              }}
            >
              {copy.leagues[code]}
            </button>
          ))}
        </div>

        <div className="legend" aria-hidden="true">
          <span>
            <i className="swatch mine" /> {copy.legendMine}
          </span>
          <span>
            <i className="swatch hard" /> {copy.legendHard}
          </span>
          <span>
            <i className="swatch easy" /> {copy.legendEasy}
          </span>
          <span>
            <i className="swatch free" /> {copy.legendFree}
          </span>
        </div>

        <div className="chip-row zones" role="group" aria-label={copy.zonesLabel}>
          {ZONE_CATALOG.map((zone) => {
            const active = zone.slug === jumeirahKiteZone.slug;
            return (
              <button
                key={zone.slug}
                type="button"
                className="zone-chip"
                disabled={!active}
                aria-pressed={active}
              >
                {zone.name[locale]}
                {!active ? <em>{copy.soon}</em> : null}
              </button>
            );
          })}
        </div>
      </section>

      {!ready && !fatal ? <p className="map-status">{copy.loading}</p> : null}
      {fatal ? <p className="map-status map-status-error">{copy.mapError}</p> : null}
    </main>
  );
}

function Stat({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <p className={accent ? "stat accent" : "stat"}>
      <strong>{value}</strong>
      <span>{label}</span>
    </p>
  );
}

function CellDetail({
  cell,
  locale,
  onClose,
}: {
  cell: MockCell;
  locale: Locale;
  onClose: () => void;
}) {
  const copy = dictionary(locale);
  const title =
    cell.kind === "mine" ? copy.cellYours : cell.kind === "free" ? copy.cellFree : copy.cellOther;
  const pace = paceLabel(cell.paceS);
  const best = paceLabel(cell.yourBestPaceS);
  const note =
    cell.kind === "mine"
      ? copy.yoursNote
      : cell.kind === "free"
        ? copy.freeNote
        : cell.yourBestPaceS === null || cell.paceS === null
          ? `${copy.noMark} ${cell.paceS === null ? "" : copy.under(paceLabel(cell.paceS) ?? "")}`
          : copy.gap(cell.yourBestPaceS - cell.paceS);

  const when = cell.achievedOn
    ? new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Dubai",
      }).format(new Date(`${cell.achievedOn}T12:00:00Z`))
    : null;

  return (
    <div className="detail" role="dialog" aria-label={title}>
      <div className="detail-head">
        <div>
          <p className="eyebrow">{title}</p>
          <h2>
            {cell.kind === "free" ? copy.free : cell.alias}
            {cell.kind === "mine" ? <span className="you-tag">{copy.you}</span> : null}
          </h2>
        </div>
        <button type="button" className="locale-btn" onClick={onClose}>
          {copy.close}
        </button>
      </div>
      <dl>
        <div>
          <dt>{copy.mark}</dt>
          <dd>{pace ? `${pace} ${copy.perKm}` : "—"}</dd>
        </div>
        <div>
          <dt>{copy.date}</dt>
          <dd>{when ?? "—"}</dd>
        </div>
        <div>
          <dt>{copy.yourBest}</dt>
          <dd>{best ? `${best} ${copy.perKm}` : copy.noBest}</dd>
        </div>
      </dl>
      <p className="detail-note">{note}</p>
    </div>
  );
}

function countKinds(cells: MockCell[]) {
  return cells.reduce(
    (totals, cell) => {
      totals[cell.kind] += 1;
      return totals;
    },
    { mine: 0, other: 0, free: 0 },
  );
}
