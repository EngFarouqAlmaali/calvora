let counter = 0

/** Unique-enough id for local history entries; no network or secrets involved. */
export function createId(now: number = Date.now()): string {
  counter = (counter + 1) % 1_000_000
  return `${now.toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
