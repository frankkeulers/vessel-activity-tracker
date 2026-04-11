import { useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import {
  usePortCalls,
  useZoneEvents,
  useAISGaps,
  useSTSPairings,
  useDiscrepancies,
  usePSC,
  useAISPositions,
} from "@/lib/hooks"
import type { ActivityEvent, EventCategory, PortCallEvent, ZoneEvent } from "@/types"

// ─── Individual event creation ────────────────────────────────────────────────


interface RawEvent {
  event_id: string
  event_type: string
  event_timestamp: string
  location_name: string
  lat: number | null
  lng: number | null
}

function createIndividualEvents(
  rawEvents: RawEvent[],
  category: EventCategory,
): ActivityEvent[] {
  // Sort chronologically
  const sorted = [...rawEvents].sort(
    (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime(),
  )

  const result: ActivityEvent[] = []

  for (const ev of sorted) {
    // Create an individual event for each raw event
    result.push({
      id: `${category}-${ev.event_id}`,
      category,
      subType: ev.event_type, // Use the actual event_type
      startTime: ev.event_timestamp,
      endTime: null, // Individual events are point events, no duration
      latitude: ev.lat,
      longitude: ev.lng,
      label: ev.location_name,
      raw: ev,
    })
  }

  return result
}

function portCallToRaw(pc: PortCallEvent): RawEvent {
  // Use event_details coordinates first (more precise), fall back to port centroid
  const lat = pc.event_details.latitude ?? pc.port_information?.centroid?.latitude ?? null
  const lng = pc.event_details.longitude ?? pc.port_information?.centroid?.longitude ?? null
  return {
    event_id: pc.event_details.event_id,
    event_type: pc.event_details.event_type,
    event_timestamp: pc.event_details.event_timestamp,
    location_name: pc.port_information?.name ?? "Unknown port",
    lat,
    lng,
  }
}

function zoneEventToRaw(z: ZoneEvent): RawEvent {
  // Use event_details coordinates first (more precise), fall back to zone centroid
  const lat = z.event_details.latitude ?? z.zone_information?.centroid?.latitude ?? null
  const lng = z.event_details.longitude ?? z.zone_information?.centroid?.longitude ?? null
  return {
    event_id: z.event_details.event_id,
    event_type: z.event_details.event_type,
    event_timestamp: z.event_details.event_timestamp,
    location_name: z.zone_information?.name ?? "Unknown zone",
    lat,
    lng,
  }
}

export function DataOrchestrator() {
  const { selectedVessel, dateRange, fetchKey, setEvents } = useAppStore()
  const imo = selectedVessel ? parseInt(selectedVessel.imo, 10) : null
  const { from, to } = dateRange

  const portCalls = usePortCalls(imo, from, to, fetchKey)
  const zones = useZoneEvents(imo, from, to, fetchKey)
  const gaps = useAISGaps(imo, from, to, fetchKey)
  const sts = useSTSPairings(imo, from, to, fetchKey)
  const discrepancies = useDiscrepancies(imo, from, to, fetchKey)
  const psc = usePSC(imo, from, to, fetchKey)

  useEffect(() => {
    if (fetchKey === 0) return

    const allLoaded =
      !portCalls.isFetching &&
      !zones.isFetching &&
      !gaps.isFetching &&
      !sts.isFetching &&
      !discrepancies.isFetching &&
      !psc.isFetching

    if (!allLoaded) return

    const events: ActivityEvent[] = []

    // Port calls — create individual events for each port call
    createIndividualEvents(
      (portCalls.data ?? []).map(portCallToRaw),
      "port",
    ).forEach((e) => events.push(e))

    // Zone events — create individual events for each zone event
    createIndividualEvents(
      (zones.data ?? []).map(zoneEventToRaw),
      "zone",
    ).forEach((e) => events.push(e))

    // AIS gaps — store both stopped and resumed coords in raw for map rendering
    ;(gaps.data ?? []).forEach((g) => {
      if (!g.stopped?.timestamp) return
      events.push({
        id: `gap-${g.event_id}`,
        category: "ais_gap",
        subType: "AIS_GAP",
        startTime: g.stopped.timestamp,
        endTime: g.resumed?.timestamp ?? null,
        latitude: g.stopped?.latitude ?? null,
        longitude: g.stopped?.longitude ?? null,
        label: `${g.gap_duration_hours?.toFixed(1) ?? "?"}h gap`,
        raw: g,
      })
    })

    // STS pairings — started/stopped are bare ISO strings; location holds lat/lng
    ;(sts.data ?? []).forEach((s, i) => {
      if (!s.started) return
      events.push({
        id: `sts-${i}`,
        category: "sts",
        subType: s.sts_type ?? "STS",
        startTime: s.started,
        endTime: s.stopped ?? null,
        latitude: s.location?.latitude ?? null,
        longitude: s.location?.longitude ?? null,
        label: s.paired_vessel?.name ?? (s.paired_vessel?.imo ? `IMO ${s.paired_vessel.imo}` : "STS pairing"),
        raw: s,
      })
    })

    // Discrepancies — event_type field, stopped (not ended), no event_id
    ;(discrepancies.data ?? []).forEach((d, i) => {
      if (!d.started?.timestamp) return
      events.push({
        id: `disc-${i}-${d.started.timestamp}`,
        category: "discrepancy",
        subType: d.event_type,
        startTime: d.started.timestamp,
        endTime: d.stopped?.timestamp ?? null,
        latitude: d.started?.latitude ?? null,
        longitude: d.started?.longitude ?? null,
        label: d.event_type,
        raw: d,
      })
    })

    // PSC — no event_id or centroid; use index as id
    ;(psc.data ?? []).forEach((p, i) => {
      events.push({
        id: `psc-${i}-${p.inspection_date}`,
        category: "psc",
        subType: p.inspection_type ?? "PSC Inspection",
        startTime: p.inspection_date,
        endTime: null,
        latitude: null,
        longitude: null,
        label: p.port_information?.name ?? "PSC inspection",
        raw: p,
      })
    })

    setEvents(events)
  }, [
    fetchKey,
    portCalls.isFetching,
    zones.isFetching,
    gaps.isFetching,
    sts.isFetching,
    discrepancies.isFetching,
    psc.isFetching,
    portCalls.data,
    zones.data,
    gaps.data,
    sts.data,
    discrepancies.data,
    psc.data,
    setEvents,
  ])

  return null
}

// Re-export query states for use in UI
export function useDataStatus() {
  const { selectedVessel, dateRange, fetchKey } = useAppStore()
  const imo = selectedVessel ? parseInt(selectedVessel.imo, 10) : null
  const { from, to } = dateRange

  const portCalls = usePortCalls(imo, from, to, fetchKey)
  const zones = useZoneEvents(imo, from, to, fetchKey)
  const gaps = useAISGaps(imo, from, to, fetchKey)
  const sts = useSTSPairings(imo, from, to, fetchKey)
  const discrepancies = useDiscrepancies(imo, from, to, fetchKey)
  const psc = usePSC(imo, from, to, fetchKey)

  const positions = useAISPositions(imo, from, to, fetchKey)

  const isLoading =
    portCalls.isFetching ||
    zones.isFetching ||
    gaps.isFetching ||
    sts.isFetching ||
    discrepancies.isFetching ||
    psc.isFetching ||
    positions.isFetching

  const errors = [portCalls, zones, gaps, sts, discrepancies, psc, positions]
    .filter((q) => q.isError)
    .map((q) => (q.error as Error).message)

  const counts = {
    port: portCalls.data?.length ?? 0,
    zone: zones.data?.length ?? 0,
    ais_gap: gaps.data?.length ?? 0,
    sts: sts.data?.length ?? 0,
    discrepancy: discrepancies.data?.length ?? 0,
    psc: psc.data?.length ?? 0,
    positions: positions.data?.length ?? 0,
  }

  return { isLoading, errors, fetchKey, counts }
}
