"use client";

import { LngLatBounds, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import {
  computeSvgTrackData,
  computeTrackBounds,
  isRenderableTrack,
  resolveTrackCoordinates,
} from "./run-track-helpers";

export interface RunMiniMapProps {
  gpx?: string;
  coordinates?: readonly [number, number][];
  theme?: ThemeMode;
}

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

export function RunMiniMap({
  gpx,
  coordinates: explicitCoordinates,
  theme = "dark",
}: RunMiniMapProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [hasMapError, setHasMapError] = useState(false);

  const coordinates = useMemo(
    () => resolveTrackCoordinates({ gpx, coordinates: explicitCoordinates }),
    [gpx, explicitCoordinates],
  );

  const trackBounds = useMemo(() => computeTrackBounds(coordinates), [coordinates]);

  const svgData = useMemo(
    () => computeSvgTrackData(coordinates, trackBounds),
    [coordinates, trackBounds],
  );

  useEffect(() => {
    if (!isRenderableTrack(coordinates) || !containerRef.current) return;

    if (!checkWebGLSupport()) {
      const timer = setTimeout(() => {
        setHasMapError(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    let isMapLoaded = false;
    let resizeObserver: ResizeObserver | null = null;

    try {
      setWorkerUrl("/map/maplibre-gl-worker.mjs");
      const styleUrl = theme === "dark" ? "/map/style.json" : "/map/style-light.json";

      const map = new MapLibreMap({
        container: containerRef.current,
        style: styleUrl,
        attributionControl: false,
        cooperativeGestures: true,
        fadeDuration: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        canvasContextAttributes: { failIfMajorPerformanceCaveat: false },
      });

      mapRef.current = map;

      map.on("error", (event) => {
        const message = event.error?.message ?? "";
        const isFatal =
          /webgl|context|style|failed to initialize|worker failed to load/i.test(message) ||
          (!isMapLoaded && !/tile/i.test(message));

        if (isFatal) {
          setHasMapError(true);
        }
      });

      map.on("load", () => {
        if (!mapRef.current) return;
        isMapLoaded = true;

        try {
          map.resize();

          const isShort = trackBounds?.isVeryShort || coordinates.length < 2;
          if (isShort) {
            map.setCenter(coordinates[0]);
            map.setZoom(16.5);
          } else {
            const bounds = new LngLatBounds(coordinates[0], coordinates[0]);
            for (const coord of coordinates) {
              bounds.extend(coord);
            }
            map.fitBounds(bounds, {
              padding: { top: 32, bottom: 32, left: 32, right: 32 },
              maxZoom: 16.5,
              duration: 0,
            });
          }

          map.addSource("run-start-point", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: coordinates[0],
              },
              properties: {},
            },
          });

          map.addLayer({
            id: "run-start-halo",
            type: "circle",
            source: "run-start-point",
            paint: {
              "circle-radius": 11,
              "circle-color": "#22c55e",
              "circle-opacity": 0.35,
            },
          });

          map.addLayer({
            id: "run-start-dot",
            type: "circle",
            source: "run-start-point",
            paint: {
              "circle-radius": 5.5,
              "circle-color": "#22c55e",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });

          if (!isShort && coordinates.length >= 2) {
            map.addSource("run-track", {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates,
                },
                properties: {},
              },
            });

            map.addLayer({
              id: "run-track-glow",
              type: "line",
              source: "run-track",
              paint: {
                "line-color": "#ff5500",
                "line-width": 7,
                "line-opacity": 0.35,
              },
            });

            map.addLayer({
              id: "run-track-line",
              type: "line",
              source: "run-track",
              paint: {
                "line-color": "#ff5500",
                "line-width": 3.5,
              },
              layout: {
                "line-cap": "round",
                "line-join": "round",
              },
            });

            const lastCoord = coordinates[coordinates.length - 1];
            if (lastCoord[0] !== coordinates[0][0] || lastCoord[1] !== coordinates[0][1]) {
              map.addSource("run-end-point", {
                type: "geojson",
                data: {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: lastCoord,
                  },
                  properties: {},
                },
              });

              map.addLayer({
                id: "run-end-dot",
                type: "circle",
                source: "run-end-point",
                paint: {
                  "circle-radius": 5,
                  "circle-color": "#ff5500",
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ffffff",
                },
              });
            }
          }

          if (containerRef.current) {
            resizeObserver = new ResizeObserver(() => {
              map.resize();
            });
            resizeObserver.observe(containerRef.current);
          }
        } catch {
          setHasMapError(true);
        }
      });
    } catch {
      setTimeout(() => {
        setHasMapError(true);
      }, 0);
    }

    return () => {
      isMapLoaded = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coordinates, theme, trackBounds]);

  if (!isRenderableTrack(coordinates)) {
    return (
      <div className="run-mini-map-wrap glass">
        <div className="run-mini-map-empty flex flex-col items-center justify-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
            aria-hidden="true"
          >
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M10.45 10.45a3 3 0 1 0 4.24 4.24" />
            <path d="M18.88 17.65A9 9 0 0 0 21 12a9 9 0 0 0-14.86-6.86" />
            <path d="M5.11 5.11A9 9 0 0 0 3 12a9 9 0 0 0 13.78 7.68" />
          </svg>
          <span>{t.noGpsTrack}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="run-mini-map-wrap glass">
      <div
        ref={containerRef}
        className={`run-mini-map-canvas ${hasMapError ? "hidden" : ""}`}
        aria-hidden={hasMapError}
      />

      {hasMapError && svgData && (
        <svg
          className="run-mini-map-svg"
          viewBox={`0 0 ${svgData.width} ${svgData.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={t.mapTrackAria}
        >
          {svgData.isVeryShort ? (
            <g className="svg-start-group">
              <circle
                cx={svgData.startPt.x}
                cy={svgData.startPt.y}
                r="18"
                fill="rgba(34, 197, 94, 0.18)"
                stroke="rgba(34, 197, 94, 0.5)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={svgData.startPt.x}
                cy={svgData.startPt.y}
                r="7"
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={svgData.startPt.x}
                y={svgData.startPt.y + 36}
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="11"
                fontWeight="700"
                letterSpacing="0.06em"
              >
                {t.startPointBadge}
              </text>
              <text
                x={svgData.startPt.x}
                y={svgData.startPt.y + 50}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="9.5"
              >
                {t.shortRunNotice}
              </text>
            </g>
          ) : (
            <>
              {svgData.polyline && (
                <>
                  <polyline
                    fill="none"
                    stroke="rgba(255, 85, 0, 0.35)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={svgData.polyline}
                  />
                  <polyline
                    fill="none"
                    stroke="#ff5500"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={svgData.polyline}
                  />
                </>
              )}

              <circle
                cx={svgData.startPt.x}
                cy={svgData.startPt.y}
                r="8"
                fill="rgba(34, 197, 94, 0.35)"
              />
              <circle
                cx={svgData.startPt.x}
                cy={svgData.startPt.y}
                r="4.5"
                fill="#22c55e"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {svgData.endPt && (
                <>
                  <circle
                    cx={svgData.endPt.x}
                    cy={svgData.endPt.y}
                    r="8"
                    fill="rgba(255, 85, 0, 0.35)"
                  />
                  <circle
                    cx={svgData.endPt.x}
                    cy={svgData.endPt.y}
                    r="4.5"
                    fill="#ff5500"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </>
          )}
        </svg>
      )}
    </div>
  );
}
