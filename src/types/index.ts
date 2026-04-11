// ─── Internal event model ──────────────────────────────────────────────────

export type EventCategory = "port" | "zone" | "ais_gap" | "sts" | "discrepancy" | "psc"

export interface ActivityEvent {
  id: string
  category: EventCategory
  subType: string
  startTime: string        // ISO UTC
  endTime: string | null   // null = point event
  latitude: number | null
  longitude: number | null
  label: string            // port name, zone name, paired vessel, etc.
  raw: unknown
  sourceIds?: string[]     // individual event IDs that make up this (paired) event
  children?: ActivityEvent[] // nested: berth ⊂ port ⊂ port_area
}

// ─── Vessel Search ─────────────────────────────────────────────────────────

export interface VesselSearchResult {
  imo: string
  mmsi: string | null
  name: string
  vessel_type: string | null
  vessel_status: string | null
  flag: string | null
  flag_code: string | null
  callsign: string | null
  asset_id: string
}

export interface VesselSearchResponse {
  meta: { total_count: number; limit: number; offset: number }
  data: VesselSearchResult[]
}

// ─── Vessel Characteristics ────────────────────────────────────────────────

export interface VesselCharacteristics {
  imo: string
  mmsi: string | null
  name: string
  type: string | null
  flag: { name: string; country_code: string } | null
  callsign: string | null
  gross_tonnage: number | null
  deadweight: number | null
  dimensions: { length: number | null; breadth: number | null } | null
  build_year: number | null
  ship_status: string | null
  asset_id: string
}

export interface VesselCharacteristicsResponse {
  meta: { request_id: string }
  data: VesselCharacteristics
}

// ─── AIS Positions ─────────────────────────────────────────────────────────

export interface AISPosition {
  latitude: number
  longitude: number
  timestamp: string
  speed: number | null
  heading: number | null
  navigational_status: { status: string; code: number } | null
  course: number | null
  mmsi: string | null
  imo_number: string | null
  name: string | null
}

export interface PositionsResponse {
  meta: { total_count?: number; limit: number; offset: number }
  data: AISPosition[]
}

// ─── Port Calls ────────────────────────────────────────────────────────────

export interface PortCallEvent {
  event_details: {
    event_id: string
    event_type: string
    event_timestamp: string
    latitude: number | null
    longitude: number | null
  }
  port_information: {
    name: string
    unlocode: string | null
    sub_type: string | null
    centroid: { latitude: number; longitude: number } | null
  } | null
  berth_information: {
    id: string
    name: string
  } | null
}

export interface PortCallsResponse {
  meta: { total_count: number; limit: number; offset: number }
  data: {
    vessel_information: VesselSearchResult
    events: PortCallEvent[]
  }
}

// ─── Zone Events ───────────────────────────────────────────────────────────

export interface ZoneEvent {
  event_details: {
    event_id: string
    event_type: string
    event_timestamp: string
    latitude: number | null
    longitude: number | null
  }
  zone_information: {
    name: string
    type: string | null
    sub_type: string | null
    centroid: { latitude: number; longitude: number } | null
  } | null
}

export interface ZoneEventsResponse {
  meta: { total_count: number; limit: number; offset: number }
  data: {
    vessel_information: VesselSearchResult
    events: ZoneEvent[]
  }
}

// ─── AIS Gaps ──────────────────────────────────────────────────────────────

export interface AISGapEvent {
  event_id: string
  gap_duration_hours: number
  stopped: {
    timestamp: string
    latitude: number | null
    longitude: number | null
  } | null
  resumed: {
    timestamp: string
    latitude: number | null
    longitude: number | null
  } | null
}

export interface AISGapsResponse {
  meta: { total_count: number; limit: number; offset: number }
  data: { events: AISGapEvent[] }
}

// ─── STS Pairings ──────────────────────────────────────────────────────────

export interface STSEvent {
  sts_type: string | null
  duration_hours: number | null
  started: string | null   // bare ISO timestamp
  stopped: string | null   // bare ISO timestamp
  location: {
    latitude: number | null
    longitude: number | null
  } | null
  paired_vessel: {
    name: string | null
    imo: string | null
    vessel_type: string | null
  } | null
}

export interface STSResponse {
  meta: { total_count: number; limit: number; offset: number }
  data: { events: STSEvent[] }
}

// ─── Positional Discrepancies ──────────────────────────────────────────────

export interface DiscrepancyEvent {
  event_type: string
  has_ended: boolean
  duration_hours: number | null
  started: {
    timestamp: string
    latitude: number | null
    longitude: number | null
  } | null
  stopped: {
    timestamp: string
    latitude: number | null
    longitude: number | null
  } | null
}

export interface DiscrepanciesResponse {
  meta: { total_count: number; limit: number; offset: number }
  data: { events: DiscrepancyEvent[] }
}

// ─── Port State Control ────────────────────────────────────────────────────

export interface PSCEvent {
  inspection_date: string
  authority: string | null
  no_defects: number | null
  detained: boolean | null
  inspection_type: string | null
  port_information: {
    name: string | null
    country_common_name: string | null
  } | null
}

export interface PSCResponse {
  meta: { total_count: number; limit: number; offset: number }
  data: { inspections: PSCEvent[] }
}

// ─── Store state ───────────────────────────────────────────────────────────

export type FilterState = Record<EventCategory, boolean>
