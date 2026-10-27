/** 312 → "5:12". Marks are already rounded to 1 s/km. */
export function formatPace(paceSecondsPerKm: number): string {
  const rounded = Math.round(paceSecondsPerKm);
  const minutes = Math.floor(rounded / 60);
  const seconds = Math.abs(rounded % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
