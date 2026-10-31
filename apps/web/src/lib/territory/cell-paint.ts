import type { TerritoryCell } from "./types";

export type ThemeMode = "dark" | "light";

export type CellPaint = {
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  isThreatened: number;
  selected: number;
};

/**
 * 4 strictly defined visual states:
 * - Mía: Naranja intenso (#FF5500)
 * - Mía en peligro: Naranja con borde resaltado y animado
 * - De otro: Gris neutro (#64748B)
 * - Libre: Solo contorno, sin relleno (opacity 0)
 *
 * Calibrados para verse nítidos y legibles en modo oscuro y claro.
 */
export function getCellPaint(
  cell: TerritoryCell,
  isSelected: boolean,
  theme: ThemeMode = "dark",
): CellPaint {
  const isDark = theme === "dark";

  switch (cell.status) {
    case "mine":
      return {
        fillColor: "#FF5500", // Naranja intenso atlético (Strava/Nike style)
        fillOpacity: isDark ? 0.85 : 0.88,
        strokeColor: isSelected ? (isDark ? "#FFFFFF" : "#0F172A") : isDark ? "#FF7A30" : "#CC4400",
        strokeWidth: isSelected ? 3.5 : 2,
        isThreatened: 0,
        selected: isSelected ? 1 : 0,
      };

    case "threatened":
      return {
        fillColor: "#FF5500", // Mismo naranja intenso
        fillOpacity: isDark ? 0.85 : 0.88,
        strokeColor: isSelected ? (isDark ? "#FFFFFF" : "#0F172A") : "#FFAA00", // Borde de advertencia
        strokeWidth: isSelected ? 3.5 : 2.5,
        isThreatened: 1, // Activará la capa con pulso continuo en el mapa
        selected: isSelected ? 1 : 0,
      };

    case "rival":
      return {
        fillColor: isDark ? "#475569" : "#94A3B8", // Gris elegante
        fillOpacity: isDark ? 0.55 : 0.5,
        strokeColor: isSelected ? (isDark ? "#FFFFFF" : "#0F172A") : isDark ? "#64748B" : "#CBD5E1",
        strokeWidth: isSelected ? 3.5 : 1.2,
        isThreatened: 0,
        selected: isSelected ? 1 : 0,
      };

    case "free":
    default:
      return {
        fillColor: isDark ? "#000000" : "#FFFFFF",
        fillOpacity: 0.0, // Sin relleno
        strokeColor: isSelected
          ? isDark
            ? "#FFFFFF"
            : "#0F172A"
          : isDark
            ? "rgba(255, 255, 255, 0.42)"
            : "rgba(15, 23, 42, 0.38)",
        strokeWidth: isSelected ? 3.5 : 1.4,
        isThreatened: 0,
        selected: isSelected ? 1 : 0,
      };
  }
}
