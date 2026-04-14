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

// ─── Gantt chart pairing helpers ─────────────────────────────────────────────

// Maps arrival event_type → its corresponding departure event_type
const ARRIVAL_TO_DEPARTURE: Record<string, string> = {
  PORT_AREA_ARRIVAL: "PORT_AREA_DEPARTURE",
  PORT_ARRIVAL: "PORT_DEPARTURE",
  ZONE_ENTRY: "ZONE_EXIT",
}

// Events that should remain as individual markers (not paired)
const INDIVIDUAL_EVENTS = new Set([
  "BERTH_ARRIVAL",
  "BERTH_DEPARTURE",
])

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

function createGanttEvents(
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
    // Check if this should remain as an individual event
    if (INDIVIDUAL_EVENTS.has(ev.event_type)) {
      result.push({
        id: `${category}-${ev.event_id}`,
        category,
        subType: ev.event_type,
        startTime: ev.event_timestamp,
        endTime: null, // Individual marker
        latitude: ev.lat,
        longitude: ev.lng,
        label: ev.location_name,
        raw: ev,
      })
      continue
    }

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
          subType: `${arrival.event_type} → ${ev.event_type}`,
          startTime: arrival.event_timestamp,
          endTime: ev.event_timestamp,
          latitude: arrival.lat,
          longitude: arrival.lng,
          label: arrival.location_name,
          raw: { arrival, departure: ev },
          sourceIds: [`${category}-${arrival.event_id}`, `${category}-${ev.event_id}`],
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
      subType: arrival.event_type,
      startTime: arrival.event_timestamp,
      endTime: null,
      latitude: arrival.lat,
      longitude: arrival.lng,
      label: arrival.location_name,
      raw: arrival,
      sourceIds: [`${category}-${arrival.event_id}`],
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
  const { selectedVessel, dateRange, fetchKey, setEvents, setGanttEvents } = useAppStore()
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

    // Map events - individual markers for each event
    const mapEvents: ActivityEvent[] = []

    // Gantt events - paired ranges with individual markers for berth events
    const ganttEvents: ActivityEvent[] = []

    // Port calls - map: individual, gantt: paired + individual berth events
    const portRawEvents = (portCalls.data ?? []).map(portCallToRaw)
    createIndividualEvents(portRawEvents, "port").forEach((e) => mapEvents.push(e))
    createGanttEvents(portRawEvents, "port").forEach((e) => ganttEvents.push(e))

    // Zone events - map: individual, gantt: paired
    const zoneRawEvents = (zones.data ?? []).map(zoneEventToRaw)
    createIndividualEvents(zoneRawEvents, "zone").forEach((e) => mapEvents.push(e))
    createGanttEvents(zoneRawEvents, "zone").forEach((e) => ganttEvents.push(e))

    // AIS gaps — same for both map and gantt
    ;(gaps.data ?? []).forEach((g) => {
      if (!g.stopped?.timestamp) return
      const gapEvent = {
        id: `gap-${g.event_id}`,
        category: "ais_gap" as const,
        subType: "AIS_GAP",
        startTime: g.stopped.timestamp,
        endTime: g.resumed?.timestamp ?? null,
        latitude: g.stopped?.latitude ?? null,
        longitude: g.stopped?.longitude ?? null,
        label: `${g.gap_duration_hours?.toFixed(1) ?? "?"}h gap`,
        raw: g,
      }
      mapEvents.push(gapEvent)
      ganttEvents.push(gapEvent)
    })

    // STS pairings — same for both map and gantt
    ;(sts.data ?? []).forEach((s, i) => {
      if (!s.started) return
      const stsEvent = {
        id: `sts-${i}`,
        category: "sts" as const,
        subType: s.sts_type ?? "STS",
        startTime: s.started,
        endTime: s.stopped ?? null,
        latitude: s.location?.latitude ?? null,
        longitude: s.location?.longitude ?? null,
        label: s.paired_vessel?.name ?? (s.paired_vessel?.imo ? `IMO ${s.paired_vessel.imo}` : "STS pairing"),
        raw: s,
      }
      mapEvents.push(stsEvent)
      ganttEvents.push(stsEvent)
    })

    // Discrepancies — same for both map and gantt
    ;(discrepancies.data ?? []).forEach((d, i) => {
      if (!d.started?.timestamp) return
      const discEvent = {
        id: `disc-${i}-${d.started.timestamp}`,
        category: "discrepancy" as const,
        subType: d.event_type,
        startTime: d.started.timestamp,
        endTime: d.stopped?.timestamp ?? null,
        latitude: d.started?.latitude ?? null,
        longitude: d.started?.longitude ?? null,
        label: d.event_type,
        raw: d,
      }
      mapEvents.push(discEvent)
      ganttEvents.push(discEvent)
    })

    // PSC — same for both map and gantt
    ;(psc.data ?? []).forEach((p, i) => {
      const pscEvent = {
        id: `psc-${i}-${p.inspection_date}`,
        category: "psc" as const,
        subType: p.inspection_type ?? "PSC Inspection",
        startTime: p.inspection_date,
        endTime: null,
        latitude: null,
        longitude: null,
        label: p.port_information?.name ?? "PSC inspection",
        raw: p,
      }
      mapEvents.push(pscEvent)
      ganttEvents.push(pscEvent)
    })

    setEvents(mapEvents)
    setGanttEvents(ganttEvents)
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

  const fetching = {
    port: portCalls.isFetching,
    zone: zones.isFetching,
    ais_gap: gaps.isFetching,
    sts: sts.isFetching,
    discrepancy: discrepancies.isFetching,
    psc: psc.isFetching,
    positions: positions.isFetching,
  }

  return { isLoading, errors, fetchKey, counts, fetching }
}
