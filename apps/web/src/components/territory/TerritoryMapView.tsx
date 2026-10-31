"use client";

import type { PolygonGeometry } from "@dubai-run/core";
import {
  AttributionControl,
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
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

export function TerritoryMapView({
  polygon,
  cells,
  theme,
  onSelect,
  onReady,
  onFatal,
}: TerritoryMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cellsRef = useRef(cells);
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  const onFatalRef = useRef(onFatal);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    cellsRef.current = cells;
    onSelectRef.current = onSelect;
    onReadyRef.current = onReady;
    onFatalRef.current = onFatal;
  }, [cells, onFatal, onReady, onSelect]);

  const styleUrl =
    theme === "dark" ? "/map/style.json" : "https://tiles.openfreemap.org/styles/positron";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setWorkerUrl(new URL("/map/maplibre-gl-worker.mjs", window.location.href).href);

    const map = new MapLibreMap({
      container,
      style: styleUrl,
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

    const setupLayers = () => {
      if (!map.getSource("zone")) {
        map.addSource("zone", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: polygon,
          },
        });

        map.addLayer({
          id: "zone-track-line",
          type: "line",
          source: "zone",
          paint: {
            "line-color": theme === "dark" ? "#FF5500" : "#EA580C",
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

      // Initial fitBounds
      const ring = polygon.coordinates[0] ?? [];
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

      // Start the pulsing animation for threatened cells
      const startPulsing = () => {
        const animate = (time: number) => {
          if (!mapRef.current) return;
          try {
            if (mapRef.current.getLayer("cells-threatened-pulse")) {
              const wave = (Math.sin(time / 280) + 1) / 2; // 0 to 1
              const opacity = 0.35 + wave * 0.6; // 0.35 to 0.95
              const width = 2.8 + wave * 2.8; // 2.8px to 5.6px
              mapRef.current.setPaintProperty("cells-threatened-pulse", "line-opacity", opacity);
              mapRef.current.setPaintProperty("cells-threatened-pulse", "line-width", width);
            }
          } catch {
            // Layer may not be ready during style reload
          }
          animFrameRef.current = requestAnimationFrame(animate);
        };
        animFrameRef.current = requestAnimationFrame(animate);
      };

      startPulsing();
      onReadyRef.current();
    };

    map.on("load", setupLayers);

    map.on("click", (event) => {
      const hits = map.queryRenderedFeatures(event.point, { layers: ["cells-fill"] });
      const cellId = hits[0]?.properties?.id;
      onSelectRef.current(typeof cellId === "string" ? cellId : null);
    });

    map.on("mouseenter", "cells-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "cells-fill", () => {
      map.getCanvas().style.cursor = "";
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
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [polygon, styleUrl, theme]);

  // Sync cells GeoJSON updates without re-instantiating the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getSource("cells")) return;
    (map.getSource("cells") as GeoJSONSource).setData(cells);
  }, [cells]);

  return (
    <div
      ref={containerRef}
      className="territory-map-canvas"
      role="application"
      aria-label="Mapa de territorios de carrera en Jumeirah y Kite Beach"
    />
  );
}
