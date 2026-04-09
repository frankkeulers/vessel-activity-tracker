import { useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import {
  usePortCalls,
  useZoneEvents,
  useAISGaps,
  useSTSPairings,
  useDiscrepancies,
  usePSC,
} from "@/lib/hooks"
import type { ActivityEvent, EventCategory, PortCallEvent, ZoneEvent } from "@/types"

// ─── Pairing helpers ─────────────────────────────────────────────────────────

// Maps arrival event_type → its corresponding departure event_type
const ARRIVAL_TO_DEPARTURE: Record<string, string> = {
  PORT_AREA_ARRIVAL: "PORT_AREA_DEPARTURE",
  PORT_ARRIVAL: "PORT_DEPARTURE",
  BERTH_ARRIVAL: "BERTH_DEPARTURE",
  ZONE_ENTRY: "ZONE_EXIT",
}

// Subtype label for display
const ARRIVAL_TO_SUBTYPE: Record<string, string> = {
  PORT_AREA_ARRIVAL: "Port Area Visit",
  PORT_ARRIVAL: "Port Visit",
  BERTH_ARRIVAL: "Berth Visit",
  ZONE_ENTRY: "Zone Visit",
}

interface RawEvent {
  event_id: string
  event_type: string
  event_timestamp: string
  location_name: string
  lat: number | null
  lng: number | null
}

function pairEvents(
  rawEvents: RawEvent[],
  category: EventCategory,
): ActivityEvent[] {
  // Sort chronologically
  const sorted = [...rawEvents].sort(
    (a, b) => new Date(a.event_timestamp).getTime() - new Date(b.event_timestamp).getTime(),
  )

  const result: ActivityEvent[] = []
  // Stack of open arrivals keyed by "departure_type::location_name"
  const open = new Map<string, RawEvent>()

  for (const ev of sorted) {
    const departureType = ARRIVAL_TO_DEPARTURE[ev.event_type]
    if (departureType !== undefined) {
      // This is an arrival — push onto open stack
      const key = `${departureType}::${ev.location_name}`
      open.set(key, ev)
    } else {
      // Check if this is a departure that closes an open arrival
      const key = `${ev.event_type}::${ev.location_name}`
      const arrival = open.get(key)
      if (arrival) {
        open.delete(key)
        result.push({
          id: `${category}-${arrival.event_id}-${ev.event_id}`,
          category,
          subType: ARRIVAL_TO_SUBTYPE[
            Object.keys(ARRIVAL_TO_DEPARTURE).find(
              (k) => ARRIVAL_TO_DEPARTURE[k] === ev.event_type,
            ) ?? ""
          ] ?? ev.event_type,
          startTime: arrival.event_timestamp,
          endTime: ev.event_timestamp,
          latitude: arrival.lat,
          longitude: arrival.lng,
          label: arrival.location_name,
          raw: { arrival, departure: ev },
        })
      }
      // Unpaired departure — ignore (covered by the paired arrival or a gap)
    }
  }

  // Emit unpaired arrivals as open-ended spans
  for (const arrival of open.values()) {
    result.push({
      id: `${category}-${arrival.event_id}-open`,
      category,
      subType: ARRIVAL_TO_SUBTYPE[arrival.event_type] ?? arrival.event_type,
      startTime: arrival.event_timestamp,
      endTime: null,
      latitude: arrival.lat,
      longitude: arrival.lng,
      label: arrival.location_name,
      raw: arrival,
    })
  }

  return result
}

function portCallToRaw(pc: PortCallEvent): RawEvent {
  return {
    event_id: pc.event_details.event_id,
    event_type: pc.event_details.event_type,
    event_timestamp: pc.event_details.event_timestamp,
    location_name: pc.port_information?.name ?? "Unknown port",
    lat: pc.port_information?.centroid?.latitude ?? null,
    lng: pc.port_information?.centroid?.longitude ?? null,
  }
}

function zoneEventToRaw(z: ZoneEvent): RawEvent {
  return {
    event_id: z.event_details.event_id,
    event_type: z.event_details.event_type,
    event_timestamp: z.event_details.event_timestamp,
    location_name: z.zone_information?.name ?? "Unknown zone",
    lat: z.zone_information?.centroid?.latitude ?? null,
    lng: z.zone_information?.centroid?.longitude ?? null,
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

    // Port calls — pair ARRIVAL→DEPARTURE into spans
    pairEvents(
      (portCalls.data ?? []).map(portCallToRaw),
      "port",
    ).forEach((e) => events.push(e))

    // Zone events — pair ZONE_ENTRY→ZONE_EXIT into spans
    pairEvents(
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

  const isLoading =
    portCalls.isFetching ||
    zones.isFetching ||
    gaps.isFetching ||
    sts.isFetching ||
    discrepancies.isFetching ||
    psc.isFetching

  const errors = [portCalls, zones, gaps, sts, discrepancies, psc]
    .filter((q) => q.isError)
    .map((q) => (q.error as Error).message)

  return { isLoading, errors, fetchKey }
}
