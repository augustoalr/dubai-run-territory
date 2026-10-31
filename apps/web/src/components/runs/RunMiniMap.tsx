"use client";

import { parseGpx, type RawPoint } from "@dubai-run/core";
import { LngLatBounds, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ThemeMode } from "@/lib/territory/cell-paint";

interface RunMiniMapProps {
  gpx: string;
  theme?: ThemeMode;
}

export function RunMiniMap({ gpx, theme = "dark" }: RunMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [hasWebGlError, setHasWebGlError] = useState(false);

  // Parse points safely
  const points: RawPoint[] = useMemo(() => {
    try {
      const parsed = parseGpx(gpx);
      return parsed.points;
    } catch {
      return [];
    }
  }, [gpx]);

  const coordinates: [number, number][] = useMemo(() => {
    return points.map((p) => [p.lon, p.lat]);
  }, [points]);

  // SVG Fallback projection if MapLibre fails
  const svgPath = useMemo(() => {
    if (coordinates.length < 2) return null;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const [lon, lat] of coordinates) {
      if (lon < minX) minX = lon;
      if (lon > maxX) maxX = lon;
      if (lat < minY) minY = lat;
      if (lat > maxY) maxY = lat;
    }

    const spanX = maxX - minX || 0.001;
    const spanY = maxY - minY || 0.001;
    const width = 280;
    const height = 140;
    const padding = 20;

    const coords = coordinates.map(([lon, lat]) => {
      const x = padding + ((lon - minX) / spanX) * (width - 2 * padding);
      // Invert Y for screen coordinates
      const y = height - (padding + ((lat - minY) / spanY) * (height - 2 * padding));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return coords.join(" ");
  }, [coordinates]);

  useEffect(() => {
    if (coordinates.length < 2 || !containerRef.current) return;

    try {
      setWorkerUrl("/map/maplibre-gl-worker.mjs");
      const styleUrl = theme === "dark" ? "/map/style.json" : "/map/style-light.json";

      const map = new MapLibreMap({
        container: containerRef.current,
        style: styleUrl,
        attributionControl: false,
        cooperativeGestures: true,
      });

      mapRef.current = map;

      map.on("error", () => {
        setHasWebGlError(true);
      });

      map.on("load", () => {
        if (!mapRef.current) return;

        const bounds = new LngLatBounds();
        coordinates.forEach((coord) => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 36, maxZoom: 16, duration: 0 });

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

        // Glow layer
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

        // Main track line
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
      });
    } catch {
      setTimeout(() => {
        setHasWebGlError(true);
      }, 0);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coordinates, theme]);

  if (coordinates.length < 2) {
    return (
      <div className="mini-map-empty glass">
        <span>Sin datos de mapa disponibles</span>
      </div>
    );
  }

  return (
    <div className="run-mini-map-wrap glass">
      {/* MapLibre Container */}
      <div ref={containerRef} className={`run-mini-map-canvas ${hasWebGlError ? "hidden" : ""}`} />

      {/* Resilient SVG Fallback */}
      {hasWebGlError && svgPath && (
        <svg
          className="run-mini-map-svg"
          viewBox="0 0 280 140"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Recorrido de la carrera"
        >
          <polyline
            fill="none"
            stroke="rgba(255, 85, 0, 0.3)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={svgPath}
          />
          <polyline
            fill="none"
            stroke="#ff5500"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={svgPath}
          />
        </svg>
      )}
    </div>
  );
}
