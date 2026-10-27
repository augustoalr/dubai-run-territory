/** GeoJSON order: longitude, latitude. */
export type LngLat = [number, number];

export type LineStringGeometry = {
  type: "LineString";
  coordinates: LngLat[];
};

export type PolygonGeometry = {
  type: "Polygon";
  coordinates: LngLat[][];
};
