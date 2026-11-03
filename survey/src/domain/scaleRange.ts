/** Invalid editor input must never allocate an unbounded preview. */
export function scaleValues(min: number, max: number): number[] {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min || max - min >= 100) return []
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}
