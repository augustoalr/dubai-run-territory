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

type CellCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: CellProps;
    geometry: PolygonGeometry;
  }>;
};

type CellProps = {
  h3: string;
  color: string;
  opacity: number;
  lineColor: string;
  selected: number;
};

type MapViewProps = {
  polygon: PolygonGeometry;
  cells: CellCollection;
  onSelect: (h3: string | null) => void;
  onReady: () => void;
  onFatal: (message: string) => void;
  label: string;
};

export function MapView({ polygon, cells, onSelect, onReady, onFatal, label }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const cellsRef = useRef(cells);
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  const onFatalRef = useRef(onFatal);

  useEffect(() => {
    cellsRef.current = cells;
    onSelectRef.current = onSelect;
    onReadyRef.current = onReady;
    onFatalRef.current = onFatal;
  }, [cells, onFatal, onReady, onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compact = window.matchMedia("(max-width: 899px)").matches;
    // Absolute same-origin URL. A relative worker URL, or the one MapLibre
    // derives from import.meta.url inside a Turbopack chunk, 404s and comes
    // back as HTML. Safari then refuses the module worker (wrong MIME type).
    setWorkerUrl(new URL("/map/maplibre-gl-worker.mjs", window.location.href).href);
    const map = new MapLibreMap({
      container,
      style: "/map/style.json",
      center: [55.21, 25.17],
      zoom: 13,
      fadeDuration: 0,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      cooperativeGestures: false,
      minZoom: 11,
      maxZoom: 17.5,
      // Keep the default that accepts a software WebGL context. Some iPhones
      // would otherwise show a blank map instead of the territory.
      canvasContextAttributes: { failIfMajorPerformanceCaveat: false },
    });
    mapRef.current = map;
    map.addControl(new AttributionControl({ compact }), "top-right");

    const onLoad = () => {
      map.addSource("zone", { type: "geojson", data: polygonFeature(polygon) });
      map.addLayer({
        id: "zone-line",
        type: "line",
        source: "zone",
        paint: {
          "line-color": "#d6ff3c",
          "line-opacity": 0.28,
          "line-width": 1.5,
        },
      });
      map.addSource("cells", { type: "geojson", data: cellsRef.current });
      map.addLayer({
        id: "cells-fill",
        type: "fill",
        source: "cells",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["get", "opacity"],
        },
      });
      map.addLayer({
        id: "cells-line",
        type: "line",
        source: "cells",
        paint: {
          "line-color": ["case", ["==", ["get", "selected"], 1], "#ffffff", ["get", "lineColor"]],
          "line-width": ["case", ["==", ["get", "selected"], 1], 2.8, 1.2],
        },
      });

      map.on("click", (event) => {
        const hits = map.queryRenderedFeatures(event.point, { layers: ["cells-fill"] });
        const h3 = hits[0]?.properties?.h3;
        onSelectRef.current(typeof h3 === "string" ? h3 : null);
      });
      map.on("mouseenter", "cells-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cells-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      const ring = polygon.coordinates[0] ?? [];
      const first = ring[0];
      if (first) {
        const bounds = new LngLatBounds(first, first);
        for (const point of ring) bounds.extend(point);
        const narrow = window.innerWidth < 900;
        map.fitBounds(bounds, {
          padding: narrow
            ? { top: 132, bottom: 268, left: 28, right: 28 }
            : { top: 72, bottom: 72, left: 460, right: 56 },
          duration: 0,
          maxZoom: 15.2,
        });
      }
      onReadyRef.current();
    };

    map.on("load", onLoad);
    map.on("error", (event) => {
      const message = event.error?.message ?? "";
      if (/webgl|failed to initialize|worker failed to load/i.test(message)) {
        onFatalRef.current(message);
      }
    });

    const resize = () => map.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("orientationchange", resize);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", resize);
      map.remove();
      mapRef.current = null;
    };
  }, [polygon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getSource("cells")) return;
    (map.getSource("cells") as GeoJSONSource).setData(cells);
  }, [cells]);

  return <div ref={containerRef} className="map-canvas" role="application" aria-label={label} />;
}

function polygonFeature(polygon: PolygonGeometry): {
  type: "Feature";
  properties: Record<string, never>;
  geometry: PolygonGeometry;
} {
  return {
    type: "Feature",
    properties: {},
    geometry: polygon,
  };
}
