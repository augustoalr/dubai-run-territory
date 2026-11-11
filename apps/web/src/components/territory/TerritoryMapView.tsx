"use client";

import type { PolygonGeometry } from "@dubai-run/core";
import {
  AttributionControl,
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  setWorkerUrl,
} from "maplibre-gl";
import { useCallback, useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useI18n } from "@/i18n";
import type { ThemeMode } from "@/lib/territory/cell-paint";

export type CellFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      id: string;
      status: string;
      fillColor: string;
      fillOpacity: number;
      strokeColor: string;
      strokeWidth: number;
      isThreatened: number;
      selected: number;
    };
    geometry: PolygonGeometry;
  }>;
};

type TerritoryMapViewProps = {
  polygon: PolygonGeometry;
  cells: CellFeatureCollection;
  theme: ThemeMode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReady: () => void;
  onFatal: (error: string) => void;
};

const getStyleUrl = (mode: ThemeMode): string =>
  mode === "dark" ? "/map/style.json" : "/map/style-light.json";

// ~15 fps throttle interval (66.67 ms) for mobile battery conservation
const FRAME_INTERVAL_MS = 1000 / 15;

export function TerritoryMapView({
  polygon,
  cells,
  theme,
  onSelect,
  onReady,
  onFatal,
}: TerritoryMapViewProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const polygonRef = useRef(polygon);
  const cellsRef = useRef(cells);
  const themeRef = useRef(theme);
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  const onFatalRef = useRef(onFatal);

  const appliedStyleUrlRef = useRef<string>(getStyleUrl(theme));
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    polygonRef.current = polygon;
    cellsRef.current = cells;
    themeRef.current = theme;
    onSelectRef.current = onSelect;
    onReadyRef.current = onReady;
    onFatalRef.current = onFatal;
  }, [cells, onFatal, onReady, onSelect, polygon, theme]);

  const stopAnimation = useCallback((applyStatic: boolean) => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (applyStatic) {
      const map = mapRef.current;
      if (map && map.getLayer("cells-threatened-pulse")) {
        try {
          map.setPaintProperty("cells-threatened-pulse", "line-opacity", 0.85);
          map.setPaintProperty("cells-threatened-pulse", "line-width", 3.8);
        } catch {
          // Layer may not be ready during style switches
        }
      }
    }
  }, []);

  const startAnimation = useCallback(() => {
    if (animFrameRef.current !== null) return;

    const tick = (time: number) => {
      // Pause if tab is hidden
      if (typeof document !== "undefined" && document.hidden) {
        animFrameRef.current = null;
        return;
      }

      // Stop and set fixed border if reduced motion is requested
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        stopAnimation(true);
        return;
      }

      // Throttle updates to ~15 fps
      if (time - lastTickRef.current >= FRAME_INTERVAL_MS) {
        lastTickRef.current = time;
        const map = mapRef.current;
        if (map && map.getLayer("cells-threatened-pulse")) {
          try {
            const wave = (Math.sin(time / 280) + 1) / 2; // 0 to 1
            const opacity = 0.35 + wave * 0.6; // 0.35 to 0.95
            const width = 2.8 + wave * 2.8; // 2.8px to 5.6px
            map.setPaintProperty("cells-threatened-pulse", "line-opacity", opacity);
            map.setPaintProperty("cells-threatened-pulse", "line-width", width);
          } catch {
            // Layer may not be ready
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [stopAnimation]);

  const updateAnimationState = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("cells-threatened-pulse")) {
      return;
    }

    const hasThreatened = cellsRef.current.features.some((f) => f.properties.isThreatened === 1);
    const isHidden = typeof document !== "undefined" && document.hidden;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!hasThreatened || isHidden || prefersReduced) {
      stopAnimation(prefersReduced || hasThreatened);
      return;
    }

    startAnimation();
  }, [startAnimation, stopAnimation]);

  // Setup custom GeoJSON sources and styling layers
  const setupLayers = useCallback((map: MapLibreMap, currentTheme: ThemeMode) => {
    if (!map.getSource("zone")) {
      map.addSource("zone", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: polygonRef.current,
        },
      });

      map.addLayer({
        id: "zone-track-line",
        type: "line",
        source: "zone",
        paint: {
          "line-color": currentTheme === "dark" ? "#FF5500" : "#EA580C",
          "line-opacity": 0.25,
          "line-width": 1.5,
          "line-dasharray": [3, 2],
        },
      });
    }

    if (!map.getSource("cells")) {
      map.addSource("cells", { type: "geojson", data: cellsRef.current });

      // Base polygon fill layer
      map.addLayer({
        id: "cells-fill",
        type: "fill",
        source: "cells",
        paint: {
          "fill-color": ["get", "fillColor"],
          "fill-opacity": ["get", "fillOpacity"],
        },
      });

      // Pulsing border layer for threatened cells
      map.addLayer({
        id: "cells-threatened-pulse",
        type: "line",
        source: "cells",
        filter: ["==", ["get", "isThreatened"], 1],
        paint: {
          "line-color": "#FFAA00",
          "line-width": 3.8,
          "line-opacity": 0.85,
          "line-blur": 1.5,
        },
      });

      // Standard stroke outline layer
      map.addLayer({
        id: "cells-line",
        type: "line",
        source: "cells",
        paint: {
          "line-color": ["get", "strokeColor"],
          "line-width": ["get", "strokeWidth"],
        },
      });
    }
  }, []);

  // Initialize MapLibre instance (independent of theme changes)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setWorkerUrl(new URL("/map/maplibre-gl-worker.mjs", window.location.href).href);

    const initialStyleUrl = getStyleUrl(themeRef.current);
    appliedStyleUrlRef.current = initialStyleUrl;

    const map = new MapLibreMap({
      container,
      style: initialStyleUrl,
      center: [55.21, 25.17],
      zoom: 13,
      fadeDuration: 0,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      minZoom: 11,
      maxZoom: 17.5,
      canvasContextAttributes: { failIfMajorPerformanceCaveat: false },
    });
    mapRef.current = map;

    const compact = window.matchMedia("(max-width: 899px)").matches;
    map.addControl(new AttributionControl({ compact }), "top-right");

    // Re-bind layers whenever a style finishes loading (initial load or setStyle)
    map.on("style.load", () => {
      setupLayers(map, themeRef.current);
      updateAnimationState();
    });

    // Initial map readiness and camera bounds fitting
    map.on("load", () => {
      const ring = polygonRef.current.coordinates[0] ?? [];
      const first = ring[0];
      if (first) {
        const bounds = new LngLatBounds(first, first);
        for (const point of ring) bounds.extend(point);
        const isMobile = window.innerWidth < 900;
        map.fitBounds(bounds, {
          padding: isMobile
            ? { top: 120, bottom: 280, left: 20, right: 20 }
            : { top: 80, bottom: 80, left: 420, right: 60 },
          duration: 0,
          maxZoom: 15.2,
        });
      }
      onReadyRef.current();
    });

    map.on("click", (event) => {
      if (!map.getLayer("cells-fill")) return;
      const hits = map.queryRenderedFeatures(event.point, { layers: ["cells-fill"] });
      const cellId = hits[0]?.properties?.id;
      onSelectRef.current(typeof cellId === "string" ? cellId : null);
    });

    map.on("mousemove", (event) => {
      if (!map.getLayer("cells-fill")) return;
      const hits = map.queryRenderedFeatures(event.point, { layers: ["cells-fill"] });
      map.getCanvas().style.cursor = hits.length > 0 ? "pointer" : "";
    });

    map.on("error", (event) => {
      const msg = event.error?.message ?? "";
      if (/webgl|failed to initialize|worker failed to load/i.test(msg)) {
        onFatalRef.current(msg);
      }
    });

    const onResize = () => map.resize();
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    window.addEventListener("orientationchange", onResize);

    return () => {
      stopAnimation(false);
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [setupLayers, stopAnimation, updateAnimationState]);

  // Handle theme changes via map.setStyle() without destroying the map instance
  useEffect(() => {
    themeRef.current = theme;
    const targetStyle = getStyleUrl(theme);
    if (appliedStyleUrlRef.current === targetStyle) return;
    appliedStyleUrlRef.current = targetStyle;

    const map = mapRef.current;
    if (!map) return;
    map.setStyle(targetStyle);
  }, [theme]);

  // Sync cells GeoJSON updates and adjust animation state
  useEffect(() => {
    cellsRef.current = cells;
    const map = mapRef.current;
    if (map?.isStyleLoaded() && map.getSource("cells")) {
      (map.getSource("cells") as GeoJSONSource).setData(cells);
    }
    updateAnimationState();
  }, [cells, updateAnimationState]);

  // Handle visibility changes (pause when tab is hidden) and prefers-reduced-motion changes
  useEffect(() => {
    const onVisibilityChange = () => {
      updateAnimationState();
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      updateAnimationState();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    mediaQuery.addEventListener("change", onMotionChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      mediaQuery.removeEventListener("change", onMotionChange);
    };
  }, [updateAnimationState]);

  return (
    <div
      ref={containerRef}
      className="territory-map-canvas"
      role="application"
      aria-label={t.mapAriaLabel}
    />
  );
}
