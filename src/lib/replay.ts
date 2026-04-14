import type { ActivityEvent, AISPosition } from "@/types"

// ─── Binary search helper ───────────────────────────────────────────────────

/**
 * Returns the index of the last element where arr[i] <= target.
 * Returns -1 if all elements are greater than target.
 * Assumes arr is sorted ascending.
 */
function upperFloor(arr: number[], target: number): number {
  let lo = 0
  let hi = arr.length - 1
  let result = -1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (arr[mid] <= target) {
      result = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return result
}

// ─── AIS track interpolation ────────────────────────────────────────────────

/**
 * Pre-processed parallel arrays for fast binary-search interpolation.
 * Build once when positions data changes (via useMemo).
 */
export interface PositionArrays {
  timestampMs: number[]
  latitudes: number[]
  longitudes: number[]
  headings: (number | null)[]
}

export function buildPositionArrays(positions: AISPosition[]): PositionArrays {
  return {
    timestampMs: positions.map((p) => new Date(p.timestamp).getTime()),
    latitudes: positions.map((p) => p.latitude),
    longitudes: positions.map((p) => p.longitude),
    headings: positions.map((p) => p.heading),
  }
}

export interface InterpolatedPosition {
  latitude: number
  longitude: number
  heading: number | null
}

/**
 * Interpolate vessel position at targetMs using pre-built arrays.
 * - Returns null if targetMs is before the first recorded position.
 * - Clamps to the last position if targetMs is past the end.
 * - Linearly interpolates lat/lng; heading uses the leading position's value.
 */
export function interpolatePosition(
  arrays: PositionArrays,
  targetMs: number,
): InterpolatedPosition | null {
  const { timestampMs, latitudes, longitudes, headings } = arrays

  if (timestampMs.length === 0) return null

  const idx = upperFloor(timestampMs, targetMs)

  if (idx === -1) return null // before first position

  if (idx === timestampMs.length - 1) {
    // At or past last recorded position — clamp
    return {
      latitude: latitudes[idx],
      longitude: longitudes[idx],
      heading: headings[idx],
    }
  }

  // Linear interpolation between idx and idx+1
  const t0 = timestampMs[idx]
  const t1 = timestampMs[idx + 1]
  const frac = (targetMs - t0) / (t1 - t0)

  return {
    latitude: latitudes[idx] + frac * (latitudes[idx + 1] - latitudes[idx]),
    longitude: longitudes[idx] + frac * (longitudes[idx + 1] - longitudes[idx]),
    heading: headings[idx], // don't interpolate heading — use leading position's value
  }
}

/**
 * Returns the split index where all positions[0..splitIdx] have timestamp <= cursorMs.
 * positions[splitIdx+1..] are in the future (ghost track).
 * Returns -1 if no positions are in the past.
 */
export function findTrackSplitIndex(timestampMs: number[], cursorMs: number): number {
  return upperFloor(timestampMs, cursorMs)
}

// ─── Event visibility ───────────────────────────────────────────────────────

export type EventVisibility = "visible" | "dimmed" | "active"

/**
 * Compute the visibility state for every event (and its children) at the current cursor.
 *
 * - "dimmed"  — startTime > cursor (not yet revealed)
 * - "active"  — startTime <= cursor AND (no endTime OR endTime > cursor)
 * - "visible" — endTime <= cursor (fully elapsed span)
 *
 * Point events (endTime === null) stay "active" once revealed, forever.
 * Returns an empty Map when replayAt is null (replay mode off).
 */
export function computeEventVisibility(
  events: ActivityEvent[],
  replayAt: Date | null,
): Map<string, EventVisibility> {
  const map = new Map<string, EventVisibility>()
  if (replayAt === null) return map

  const cursorMs = replayAt.getTime()

  function process(event: ActivityEvent) {
    const startMs = new Date(event.startTime).getTime()
    const endMs = event.endTime != null ? new Date(event.endTime).getTime() : null

    let vis: EventVisibility
    if (startMs > cursorMs) {
      vis = "dimmed"
    } else if (endMs !== null && endMs <= cursorMs) {
      vis = "visible"
    } else {
      vis = "active"
    }

    map.set(event.id, vis)

    if (event.children) {
      for (const child of event.children) process(child)
    }
  }

  for (const event of events) process(event)
  return map
}
