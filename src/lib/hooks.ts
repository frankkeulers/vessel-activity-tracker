import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import type {
  VesselSearchResponse,
  VesselCharacteristicsResponse,
  PositionsResponse,
  PortCallEvent,
  PortCallsResponse,
  ZoneEvent,
  ZoneEventsResponse,
  AISGapEvent,
  AISGapsResponse,
  STSEvent,
  STSResponse,
  DiscrepancyEvent,
  DiscrepanciesResponse,
  PSCEvent,
  PSCResponse,
} from "@/types"

const PAGE_SIZE = 500
const POSITIONS_PAGE_SIZE = 100

// ─── Vessel search ─────────────────────────────────────────────────────────

function buildSearchParams(
  query: string,
  vesselStatusFilter: string | null,
): Record<string, string | number> {
  const trimmed = query.trim()
  const params: Record<string, string | number> = { limit: 50 }

  // 7-digit number → IMO; 9-digit number → MMSI; otherwise → name_contains
  if (/^\d{7}$/.test(trimmed)) {
    params.imo = Number(trimmed)
  } else if (/^\d{9}$/.test(trimmed)) {
    params.mmsi = Number(trimmed)
  } else {
    params.name_contains = trimmed
  }

  // Add vessel status filter if set (vessel_status_incl param)
  if (vesselStatusFilter) {
    params.vessel_status_incl = vesselStatusFilter
  }

  return params
}

export function useVesselSearch(query: string, vesselStatusFilter: string | null) {
  return useQuery({
    queryKey: ["vessel-search", query, vesselStatusFilter],
    queryFn: () =>
      apiFetch<VesselSearchResponse>("/vessel-insights/v1/vessel-search", {
        params: buildSearchParams(query, vesselStatusFilter),
      }),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  })
}

// ─── Vessel characteristics ────────────────────────────────────────────────

export function useVesselCharacteristics(imo: number | null) {
  return useQuery({
    queryKey: ["vessel-characteristics", imo],
    queryFn: () =>
      apiFetch<VesselCharacteristicsResponse>(
        `/vessel-insights/v1/vessel-characteristics/${imo}`,
      ),
    enabled: imo !== null,
    staleTime: 5 * 60_000,
  })
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function toUtcIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z") // 2026-01-01T00:00:00Z
}

function dateParams(from: Date, to: Date) {
  return {
    timestamp_start: toUtcIso(from),
    timestamp_end: toUtcIso(to),
  }
}

async function fetchAllPages<T>(
  path: string,
  baseParams: Record<string, string | number | boolean | undefined>,
  getItems: (res: Record<string, unknown>) => T[],
  getTotalCount: (res: Record<string, unknown>) => number,
): Promise<T[]> {
  const first = await apiFetch<Record<string, unknown>>(path, {
    params: { ...baseParams, limit: PAGE_SIZE, offset: 0 },
  })
  const total = getTotalCount(first)
  const items: T[] = [...getItems(first)]

  const extraPages = Math.ceil((total - PAGE_SIZE) / PAGE_SIZE)
  if (extraPages > 0) {
    const fetches = Array.from({ length: extraPages }, (_, i) =>
      apiFetch<Record<string, unknown>>(path, {
        params: { ...baseParams, limit: PAGE_SIZE, offset: (i + 1) * PAGE_SIZE },
      }).then(getItems),
    )
    const results = await Promise.all(fetches)
    results.forEach((r) => items.push(...r))
  }

  return items
}

// ─── AIS positions ─────────────────────────────────────────────────────────

async function fetchAllPositionPages(
  imo: number,
  from: Date,
  to: Date,
): Promise<PositionsResponse["data"]> {
  const body = { imo: String(imo), ...dateParams(from, to) }
  const items: PositionsResponse["data"] = []
  let offset = 0

  // limit/offset are query params, not body fields
  while (true) {
    const page = await apiFetch<PositionsResponse>("/unified-position/v1/positions", {
      method: "POST",
      params: { limit: POSITIONS_PAGE_SIZE, offset },
      body,
    })
    const pageData = page.data ?? []
    items.push(...pageData)
    if (pageData.length < POSITIONS_PAGE_SIZE) break
    offset += POSITIONS_PAGE_SIZE
  }

  items.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return items
}

export function useAISPositions(
  imo: number | null,
  from: Date,
  to: Date,
  fetchKey: number,
) {
  return useQuery({
    queryKey: ["ais-positions", imo, from.toISOString(), to.toISOString(), fetchKey],
    queryFn: () => fetchAllPositionPages(imo!, from, to),
    enabled: imo !== null && fetchKey > 0,
    staleTime: 0,
  })
}

// ─── Port calls ────────────────────────────────────────────────────────────

export function usePortCalls(
  imo: number | null,
  from: Date,
  to: Date,
  fetchKey: number,
) {
  return useQuery({
    queryKey: ["port-calls", imo, from.toISOString(), to.toISOString(), fetchKey],
    queryFn: () =>
      fetchAllPages<PortCallEvent>(
        `/voyage-insights/v1/vessel-port-calls/${imo}`,
        dateParams(from, to),
        (r) => ((r.data as PortCallsResponse["data"]).events) ?? [],
        (r) => (r.meta as PortCallsResponse["meta"]).total_count ?? 0,
      ),
    enabled: imo !== null && fetchKey > 0,
    staleTime: 0,
  })
}

// ─── Zone events ───────────────────────────────────────────────────────────

export function useZoneEvents(
  imo: number | null,
  from: Date,
  to: Date,
  fetchKey: number,
) {
  return useQuery({
    queryKey: ["zone-events", imo, from.toISOString(), to.toISOString(), fetchKey],
    queryFn: () =>
      fetchAllPages<ZoneEvent>(
        `/voyage-insights/v1/vessel-zone-and-port-events/${imo}`,
        { ...dateParams(from, to), event_type: "ZONE_ENTRY,ZONE_EXIT" },
        (r) => ((r.data as ZoneEventsResponse["data"]).events) ?? [],
        (r) => (r.meta as ZoneEventsResponse["meta"]).total_count ?? 0,
      ),
    enabled: imo !== null && fetchKey > 0,
    staleTime: 0,
  })
}

// ─── AIS gaps ──────────────────────────────────────────────────────────────

export function useAISGaps(
  imo: number | null,
  from: Date,
  to: Date,
  fetchKey: number,
) {
  return useQuery({
    queryKey: ["ais-gaps", imo, from.toISOString(), to.toISOString(), fetchKey],
    queryFn: () =>
      fetchAllPages<AISGapEvent>(
        `/voyage-insights/v1/vessel-ais-reporting-gaps/${imo}`,
        dateParams(from, to),
        (r) => ((r.data as AISGapsResponse["data"]).events) ?? [],
        (r) => (r.meta as AISGapsResponse["meta"]).total_count ?? 0,
      ),
    enabled: imo !== null && fetchKey > 0,
    staleTime: 0,
  })
}

// ─── STS pairings ──────────────────────────────────────────────────────────

export function useSTSPairings(
  imo: number | null,
  from: Date,
  to: Date,
  fetchKey: number,
) {
  return useQuery({
    queryKey: ["sts-pairings", imo, from.toISOString(), to.toISOString(), fetchKey],
    queryFn: () =>
      fetchAllPages<STSEvent>(
        `/voyage-insights/v1/vessel-sts-pairings/${imo}`,
        dateParams(from, to),
        (r) => ((r.data as STSResponse["data"]).events) ?? [],
        (r) => (r.meta as STSResponse["meta"]).total_count ?? 0,
      ),
    enabled: imo !== null && fetchKey > 0,
    staleTime: 0,
  })
}

// ─── Positional discrepancies ──────────────────────────────────────────────

export function useDiscrepancies(
  imo: number | null,
  from: Date,
  to: Date,
  fetchKey: number,
) {
  return useQuery({
    queryKey: ["discrepancies", imo, from.toISOString(), to.toISOString(), fetchKey],
    queryFn: () =>
      fetchAllPages<DiscrepancyEvent>(
        `/voyage-insights/v1/vessel-positional-discrepancy/${imo}`,
        dateParams(from, to),
        (r) => ((r.data as DiscrepanciesResponse["data"]).events) ?? [],
        (r) => (r.meta as DiscrepanciesResponse["meta"]).total_count ?? 0,
      ),
    enabled: imo !== null && fetchKey > 0,
    staleTime: 0,
  })
}

// ─── Port State Control ────────────────────────────────────────────────────

export function usePSC(
  imo: number | null,
  from: Date,
  to: Date,
  fetchKey: number,
) {
  return useQuery({
    queryKey: ["psc", imo, from.toISOString(), to.toISOString(), fetchKey],
    queryFn: () =>
      fetchAllPages<PSCEvent>(
        `/voyage-insights/v1/vessel-port-state-control/${imo}`,
        dateParams(from, to),
        (r) => ((r.data as PSCResponse["data"]).inspections) ?? [],
        (r) => (r.meta as PSCResponse["meta"]).total_count ?? 0,
      ),
    enabled: imo !== null && fetchKey > 0,
    staleTime: 0,
  })
}
