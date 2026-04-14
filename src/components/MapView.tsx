import * as React from "react"
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
  Tooltip,
  Marker,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useTheme } from "@/components/theme-provider"
import { useAppStore } from "@/store/useAppStore"
import { useAISPositions, useVesselCharacteristics } from "@/lib/hooks"
import { useDataStatus } from "@/components/DataOrchestrator"
import type { ActivityEvent, AISGapEvent, EventCategory } from "@/types"
import { EVENT_COLOURS, CATEGORY_LABELS, REPLAY_GHOST_OPACITY, REPLAY_VESSEL_COLOR } from "@/config/constants"
import {
  buildPositionArrays,
  interpolatePosition,
  findTrackSplitIndex,
  type PositionArrays,
} from "@/lib/replay"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Anchor,
  Hexagon,
  WifiOff,
  ArrowLeftRight,
  AlertTriangle,
  ShieldCheck,
  Map as MapIcon,
  Satellite,
  MapPinOffIcon,
  type LucideIcon,
} from "lucide-react"


const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  port: Anchor,
  zone: Hexagon,
  ais_gap: WifiOff,
  sts: ArrowLeftRight,
  discrepancy: AlertTriangle,
  psc: ShieldCheck,
}

function navStatusColour(status: string | null | undefined): string {
  if (!status) return "#81E4E3"
  const s = status.toLowerCase()
  if (s.includes("moored") || s.includes("anchor")) return "#FAAF89"
  if (s.includes("underway") || s.includes("way")) return "#2B969C"
  return "#81E4E3"
}

export type TrackColorMode = "nav_status" | "speed" | "draught"

function speedColour(speed: number | null): string {
  if (speed === null) return "#81E4E3"
  if (speed < 0.1) return "#FAAF89"   // stopped
  if (speed < 5)   return "#F5C842"   // slow
  if (speed < 15)  return "#2B969C"   // medium
  return "#1E6FA5"                     // fast
}

function draughtColour(draught: number | null, maxDraught: number | null): string {
  if (draught === null) return "#81E4E3"
  if (maxDraught !== null && maxDraught > 0) {
    const pct = draught / maxDraught
    if (pct < 0.4) return "#81E4E3"
    if (pct < 0.7) return "#2B969C"
    if (pct < 0.9) return "#F5A623"
    return "#E05A3A"
  }
  // Absolute fallback
  if (draught < 4)  return "#81E4E3"
  if (draught < 8)  return "#2B969C"
  if (draught < 12) return "#F5A623"
  return "#E05A3A"
}

function getPositionColour(
  pos: { speed: number | null; draught: number | null; navigational_status: { status: string; code: number } | null },
  mode: TrackColorMode,
  maxDraught: number | null,
): string {
  switch (mode) {
    case "speed":   return speedColour(pos.speed)
    case "draught": return draughtColour(pos.draught, maxDraught)
    default:        return navStatusColour(pos.navigational_status?.status)
  }
}

// Calculate bearing between two lat/lng points in degrees (0-360)
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI

  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng)

  let bearing = toDeg(Math.atan2(y, x))
  return (bearing + 360) % 360
}

// Create a rotated arrow icon for direction indicators
function createArrowIcon(colour: string, rotation: number): L.DivIcon {
  return L.divIcon({
    className: "ais-direction-arrow",
    html: `<svg width="12" height="12" viewBox="0 0 12 12" style="transform: rotate(${rotation}deg); transform-origin: center;">
      <path d="M6 0 L12 12 L6 9 L0 12 Z" fill="${colour}"/>
    </svg>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

// SVG paths for category icons (from Lucide icons, 24x24 viewBox)
const CATEGORY_ICON_PATHS: Record<EventCategory, string> = {
  port: "M12 6v16m7-9 2-1a9 9 0 0 1-18 0l2 1M9 11h6 M12 4a2 2 0 1 0 0 0", // Anchor (with circle)
  zone: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", // Hexagon
  ais_gap: "M12 20h.01M8.5 16.429a5 5 0 0 1 7 0M5 12.859a10 10 0 0 1 5.17-2.69M19 12.859a10 10 0 0 0-2.007-1.523M2 8.82a15 15 0 0 1 4.177-2.643M22 8.82a15 15 0 0 0-11.288-3.764m2 2 20 20", // WifiOff
  sts: "M8 3 4 7l4 4M4 7h16m0 10-4-4 4-4M20 17H4", // ArrowLeftRight
  discrepancy: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01", // TriangleAlert
  psc: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zm-11 6 2 2 4-4", // ShieldCheck
}

function createEventIcon(category: EventCategory, colour: string, isHighlighted: boolean): L.DivIcon {
  if (isHighlighted) {
    const outer = 42
    const inner = 26
    return L.divIcon({
      className: `event-marker event-marker-${category}`,
      html: `
        <div style="
          width: ${outer}px; height: ${outer}px;
          border-radius: 50%;
          background: ${colour}30;
          border: 2.5px solid ${colour};
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="
            width: ${inner}px; height: ${inner}px;
            background: ${colour};
            border-radius: 50%;
            border: 2.5px solid #fff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.45);
            display: flex; align-items: center; justify-content: center;
          ">
            <svg width="${inner * 0.52}" height="${inner * 0.52}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="${CATEGORY_ICON_PATHS[category]}"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [outer, outer],
      iconAnchor: [outer / 2, outer / 2],
    })
  }

  const size = 22
  return L.divIcon({
    className: `event-marker event-marker-${category}`,
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${colour};
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="${CATEGORY_ICON_PATHS[category]}"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function fmtUtc(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

function fmtEta(iso: string | null | undefined): string {
  if (!iso) return "N/A"
  const d = new Date(iso)
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "N/A"
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

// ─── Resize handler ───────────────────────────────────────────────────────────

function MapResizeHandler() {
  const map = useMap()
  React.useEffect(() => {
    const container = map.getContainer()
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [map])
  return null
}

// ─── Auto-fit bounds ──────────────────────────────────────────────────────────

function FitBounds({
  positions,
}: {
  positions: [number, number][]
}) {
  const map = useMap()
  React.useEffect(() => {
    if (positions.length === 0) return
    const lats = positions.map((p) => p[0])
    const lngs = positions.map((p) => p[1])
    const sw: [number, number] = [Math.min(...lats), Math.min(...lngs)]
    const ne: [number, number] = [Math.max(...lats), Math.max(...lngs)]
    map.fitBounds([sw, ne], { padding: [40, 40], maxZoom: 10 })
  }, [positions.length]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ─── AIS Track layer ──────────────────────────────────────────────────────────

const ARROW_INTERVAL = 5

// Isolated sub-component: subscribes to replayAt at full 20 Hz so only the
// moving marker re-renders on each tick — not the entire track layer.
function ReplayVesselMarker({ posArrays }: { posArrays: PositionArrays }) {
  const replayAt = useAppStore((s) => s.replayAt)
  if (replayAt === null) return null
  const interpPos = interpolatePosition(posArrays, replayAt.getTime())
  if (interpPos === null) return null
  return (
    <Marker
      position={[interpPos.latitude, interpPos.longitude]}
      icon={createVesselPositionIcon(interpPos.heading)}
      pane="replayPositionPane"
      interactive={false}
    />
  )
}

function AISTrack({
  imo, from, to, fetchKey, colorMode, maxDraught,
}: {
  imo: number
  from: Date
  to: Date
  fetchKey: number
  colorMode: TrackColorMode
  maxDraught: number | null
}) {
  const { data } = useAISPositions(imo, from, to, fetchKey)
  const positions = data ?? []
  const posArrays = React.useMemo(() => buildPositionArrays(positions), [positions])

  // Throttle the past/ghost split to ~2 Hz by polling the store instead of
  // subscribing via a selector. Only ReplayVesselMarker subscribes at full 20 Hz.
  const [splitIdx, setSplitIdx] = React.useState(() => positions.length - 1)
  const [inReplay, setInReplay] = React.useState(false)
  React.useEffect(() => {
    function sync() {
      const { replayAt } = useAppStore.getState()
      setInReplay(replayAt !== null)
      setSplitIdx(
        replayAt !== null
          ? findTrackSplitIndex(posArrays.timestampMs, replayAt.getTime())
          : positions.length - 1,
      )
    }
    sync()
    const id = setInterval(sync, 500)
    return () => clearInterval(id)
  }, [posArrays, positions.length])

  // Merge consecutive same-colour positions into single Polylines.
  // A voyage typically has 3–10 colour groups vs hundreds of individual segments,
  // so this reduces Leaflet DOM elements from O(n) to O(colour transitions).
  const { pastLines, ghostLines } = React.useMemo(() => {
    if (positions.length === 0) return { pastLines: [], ghostLines: [] }
    function mergeLines(start: number, end: number) {
      const out: { pts: [number, number][]; col: string }[] = []
      const clampedEnd = Math.min(end, positions.length - 1)
      if (start > clampedEnd) return out
      let cur: { pts: [number, number][]; col: string } | null = null
      for (let i = start; i <= clampedEnd; i++) {
        const p = positions[i]
        const col = getPositionColour(p, colorMode, maxDraught)
        if (!cur || cur.col !== col) {
          if (cur) out.push(cur)
          cur = { pts: [[p.latitude, p.longitude]], col }
        } else {
          cur.pts.push([p.latitude, p.longitude])
        }
      }
      if (cur) out.push(cur)
      return out
    }
    const past = mergeLines(0, splitIdx)
    // Ghost overlaps by one point for visual continuity at the split boundary
    const ghost = inReplay ? mergeLines(Math.max(0, splitIdx), positions.length - 1) : []
    return { pastLines: past, ghostLines: ghost }
  }, [positions, splitIdx, inReplay, colorMode, maxDraught])

  const arrows = React.useMemo(() => {
    const out: { position: [number, number]; bearing: number; colour: string }[] = []
    const limit = Math.min(splitIdx, positions.length - 2)
    for (let i = 0; i <= limit; i += ARROW_INTERVAL) {
      if (i + 1 >= positions.length) break
      const a = positions[i]
      const b = positions[i + 1]
      out.push({
        position: [(a.latitude + b.latitude) / 2, (a.longitude + b.longitude) / 2],
        bearing: calculateBearing(a.latitude, a.longitude, b.latitude, b.longitude),
        colour: getPositionColour(a, colorMode, maxDraught),
      })
    }
    return out
  }, [positions, splitIdx, colorMode, maxDraught])

  const allLatLngs = React.useMemo(
    () => positions.map((p) => [p.latitude, p.longitude] as [number, number]),
    [positions],
  )

  if (positions.length === 0) return null

  return (
    <>
      <FitBounds positions={allLatLngs} />

      {/* Past track — merged Polylines at full opacity */}
      {pastLines.map((seg, i) => (
        <Polyline
          key={`past-${i}`}
          positions={seg.pts}
          pane="aisTrackPane"
          pathOptions={{ color: seg.col, weight: 2, opacity: 0.8 }}
        />
      ))}

      {/* Ghost track — merged Polylines at low opacity (replay only) */}
      {ghostLines.map((seg, i) => (
        <Polyline
          key={`ghost-${i}`}
          positions={seg.pts}
          pane="aisTrackPane"
          pathOptions={{ color: seg.col, weight: 2, opacity: REPLAY_GHOST_OPACITY }}
        />
      ))}

      {/* Direction arrows — past track only */}
      {arrows.map((arrow, i) => (
        <Marker
          key={`arrow-${i}`}
          position={arrow.position}
          icon={createArrowIcon(arrow.colour, arrow.bearing)}
          pane="aisTrackPane"
          interactive={false}
        />
      ))}

      {/* Position dots — past: full opacity; ghost: faint */}
      {positions.map((pos, i) => {
        const isPast = !inReplay || i <= splitIdx
        const col = getPositionColour(pos, colorMode, maxDraught)
        return (
          <CircleMarker
            key={i}
            center={[pos.latitude, pos.longitude]}
            radius={3}
            pane="aisTrackPane"
            pathOptions={{
              color: col,
              fillColor: col,
              fillOpacity: isPast ? 0.9 : REPLAY_GHOST_OPACITY,
              opacity: isPast ? 1 : REPLAY_GHOST_OPACITY,
              weight: 1,
            }}
          >
            {isPast && (
              <Popup>
                <div className="text-xs space-y-0.5 min-w-[170px]">
                  {pos.name && <div className="font-semibold">{pos.name}</div>}
                  <div className="font-medium">{pos.navigational_status?.status ?? "Unknown"}</div>
                  <div className="text-muted-foreground pb-1">{fmtUtc(pos.timestamp)}</div>
                  {pos.speed != null && <div><span className="text-muted-foreground">Speed: </span>{pos.speed} kn</div>}
                  {pos.course != null && <div><span className="text-muted-foreground">Course: </span>{pos.course}°</div>}
                  {pos.heading != null && <div><span className="text-muted-foreground">Heading: </span>{pos.heading}°</div>}
                  {pos.destination != null && pos.destination.trim() !== "" && (
                    <div><span className="text-muted-foreground">Destination: </span>{pos.destination}</div>
                  )}
                  {pos.draught != null && <div><span className="text-muted-foreground">Draught: </span>{pos.draught} m</div>}
                  <div><span className="text-muted-foreground">ETA: </span>{fmtEta(pos.eta)}</div>
                </div>
              </Popup>
            )}
          </CircleMarker>
        )
      })}

      {/* Moving vessel marker — isolated sub-component, updates at full 20 Hz */}
      <ReplayVesselMarker posArrays={posArrays} />
    </>
  )
}

// ─── AIS Gap layer ───────────────────────────────────────────────────────────

const GAP_COLOUR = EVENT_COLOURS["ais_gap"] // #F88E63

function AISGapLayer({
  events,
  enabled,
}: {
  events: ActivityEvent[]
  enabled: boolean
}) {
  const { highlightedEventId, setHighlightedEventId } = useAppStore()
  // Poll at 1 Hz — gap appearance/disappearance doesn't need 20 Hz precision
  const [replayAt, setReplayAt] = React.useState<Date | null>(() => useAppStore.getState().replayAt)
  React.useEffect(() => {
    const sync = () => setReplayAt(useAppStore.getState().replayAt)
    const id = setInterval(sync, 1000)
    return () => clearInterval(id)
  }, [])
  if (!enabled) return null

  const cursorMs = replayAt?.getTime() ?? Infinity
  const gaps = events.filter((e) => {
    if (e.category !== "ais_gap") return false
    if (replayAt !== null && new Date(e.startTime).getTime() > cursorMs) return false
    return true
  })

  return (
    <>
      {gaps.map((ev) => {
        const g = ev.raw as AISGapEvent
        const startLat = g.stopped?.latitude
        const startLng = g.stopped?.longitude
        const endLat = g.resumed?.latitude
        const endLng = g.resumed?.longitude
        const isHighlighted = highlightedEventId === ev.id
        const radius = isHighlighted ? 9 : 6
        const popupContent = (
          <div className="min-w-[160px] text-xs">
            <div
              className="mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: GAP_COLOUR }}
            >
              AIS Gap
            </div>
            <div className="font-medium">{ev.label}</div>
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              <div>Lost: {fmtUtc(ev.startTime)}</div>
              {ev.endTime && <div>Resumed: {fmtUtc(ev.endTime)}</div>}
            </div>
          </div>
        )

        return (
          <React.Fragment key={ev.id}>
            {/* Dashed line between stopped and resumed positions */}
            {startLat != null && startLng != null && endLat != null && endLng != null && (
              <Polyline
                positions={[[startLat, startLng], [endLat, endLng]]}
                pane="aisTrackPane"
                pathOptions={{
                  color: GAP_COLOUR,
                  weight: 2,
                  opacity: 0.8,
                  dashArray: "6 6",
                }}
              />
            )}
            {/* Gap-start marker (where signal was lost) */}
            {startLat != null && startLng != null && (
              <CircleMarker
                center={[startLat, startLng]}
                radius={radius}
                pane="aisTrackPane"
                pathOptions={{
                  color: "#fff",
                  fillColor: GAP_COLOUR,
                  fillOpacity: isHighlighted ? 1 : 0.9,
                  weight: isHighlighted ? 2 : 1,
                }}
                eventHandlers={{ click: () => setHighlightedEventId(highlightedEventId === ev.id ? null : ev.id) }}
              >
                <Tooltip direction="top" offset={[0, -8]} sticky={false}>
                  <span className="text-xs">AIS lost</span>
                </Tooltip>
                <Popup>{popupContent}</Popup>
              </CircleMarker>
            )}
            {/* Gap-end marker (where signal resumed) */}
            {endLat != null && endLng != null && (
              <CircleMarker
                center={[endLat, endLng]}
                radius={radius}
                pane="aisTrackPane"
                pathOptions={{
                  color: "#fff",
                  fillColor: GAP_COLOUR,
                  fillOpacity: isHighlighted ? 1 : 0.7,
                  weight: isHighlighted ? 2 : 1,
                  dashArray: "3 3",
                }}
                eventHandlers={{ click: () => setHighlightedEventId(highlightedEventId === ev.id ? null : ev.id) }}
              >
                <Tooltip direction="top" offset={[0, -8]} sticky={false}>
                  <span className="text-xs">AIS resumed</span>
                </Tooltip>
                <Popup>{popupContent}</Popup>
              </CircleMarker>
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

// ─── Event markers ────────────────────────────────────────────────────────────

function EventMarkers({
  events,
  filters,
}: {
  events: ActivityEvent[]
  filters: Record<EventCategory, boolean>
}) {
  const { highlightedEventId, setHighlightedEventId } = useAppStore()
  // Poll at 1 Hz — event appearance/disappearance doesn't need 20 Hz precision
  const [replayAt, setReplayAt] = React.useState<Date | null>(() => useAppStore.getState().replayAt)
  React.useEffect(() => {
    const sync = () => setReplayAt(useAppStore.getState().replayAt)
    const id = setInterval(sync, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {events.map((ev) => {
        if (!filters[ev.category]) return null
        if (ev.category === "ais_gap") return null  // rendered by AISGapLayer
        if (ev.latitude == null || ev.longitude == null) return null
        // In replay mode, hide events that haven't started yet
        if (replayAt !== null && new Date(ev.startTime).getTime() > replayAt.getTime()) return null

        const colour = EVENT_COLOURS[ev.category]
        const isHighlighted = highlightedEventId === ev.id

        return (
          <Marker
            key={ev.id}
            position={[ev.latitude, ev.longitude]}
            icon={createEventIcon(ev.category, colour, isHighlighted)}
            pane="eventMarkersPane"
            eventHandlers={{
              click: () =>
                setHighlightedEventId(highlightedEventId === ev.id ? null : ev.id),
            }}
          >
            <Popup>
              <div className="min-w-[160px] text-xs">
                <div
                  className="mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: colour }}
                >
                  {CATEGORY_LABELS[ev.category]}
                </div>
                <div className="font-medium">{ev.label}</div>
                <div className="text-muted-foreground">{ev.subType}</div>
                <div className="mt-1 space-y-0.5 text-muted-foreground">
                  <div>Time: {fmtUtc(ev.startTime)}</div>
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: EventCategory[] = [
  "port", "zone", "ais_gap", "sts", "discrepancy", "psc",
]

// Create the pulsing vessel-position icon for replay mode
function createVesselPositionIcon(heading: number | null): L.DivIcon {
  const rot = heading ?? 0
  return L.divIcon({
    className: "replay-vessel-marker",
    html: `<div style="
      width: 16px; height: 16px;
      border-radius: 50%;
      background: ${REPLAY_VESSEL_COLOR};
      border: 2.5px solid white;
      box-shadow: 0 0 0 5px ${REPLAY_VESSEL_COLOR}40, 0 2px 6px rgba(0,0,0,0.4);
      animation: vessel-pulse 1.5s ease-in-out infinite;
      transform: rotate(${rot}deg);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

// ─── Pane setup for layer ordering ────────────────────────────────────────────

function PaneSetup() {
  const map = useMap()
  React.useEffect(() => {
    // Default leaflet panes: tilePane(200), overlayPane(400), shadowPane(500), markerPane(600), tooltipPane(650), popupPane(700)
    if (!map.getPane("aisTrackPane")) {
      map.createPane("aisTrackPane")
      map.getPane("aisTrackPane")!.style.zIndex = "400"
    }
    if (!map.getPane("eventMarkersPane")) {
      map.createPane("eventMarkersPane")
      map.getPane("eventMarkersPane")!.style.zIndex = "620"
    }
    if (!map.getPane("replayPositionPane")) {
      map.createPane("replayPositionPane")
      map.getPane("replayPositionPane")!.style.zIndex = "650" // Above event markers
    }
  }, [map])
  return null
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function MapLegend({
  filters,
  colorMode,
  onColorModeChange,
  maxDraught,
  hasTrack,
}: {
  filters: Record<EventCategory, boolean>
  colorMode: TrackColorMode
  onColorModeChange: (mode: TrackColorMode) => void
  maxDraught: number | null
  hasTrack: boolean
}) {
  const activeCategories = CATEGORY_ORDER.filter((c) => filters[c])
  if (activeCategories.length === 0 && !hasTrack) return null

  const trackLegendItems = (() => {
    switch (colorMode) {
      case "speed":
        return [
          { label: "Stopped (< 0.1 kn)", colour: "#FAAF89" },
          { label: "Slow (0.1–5 kn)",     colour: "#F5C842" },
          { label: "Medium (5–15 kn)",    colour: "#2B969C" },
          { label: "Fast (≥ 15 kn)",      colour: "#1E6FA5" },
        ]
      case "draught":
        if (maxDraught !== null && maxDraught > 0) {
          return [
            { label: `< 40% (< ${(maxDraught * 0.4).toFixed(1)} m)`,                                               colour: "#81E4E3" },
            { label: `40–70% (${(maxDraught * 0.4).toFixed(1)}–${(maxDraught * 0.7).toFixed(1)} m)`, colour: "#2B969C" },
            { label: `70–90% (${(maxDraught * 0.7).toFixed(1)}–${(maxDraught * 0.9).toFixed(1)} m)`, colour: "#F5A623" },
            { label: `≥ 90% (≥ ${(maxDraught * 0.9).toFixed(1)} m)`,                                               colour: "#E05A3A" },
          ]
        }
        return [
          { label: "Light (< 4 m)",       colour: "#81E4E3" },
          { label: "Medium (4–8 m)",      colour: "#2B969C" },
          { label: "Heavy (8–12 m)",      colour: "#F5A623" },
          { label: "Very heavy (≥ 12 m)", colour: "#E05A3A" },
        ]
      default:
        return [
          { label: "Underway",           colour: "#2B969C" },
          { label: "Moored / Anchored",  colour: "#FAAF89" },
          { label: "Other",              colour: "#81E4E3" },
        ]
    }
  })()

  return (
    <div className="absolute bottom-6 right-3 z-1000 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur-sm">
      {activeCategories.length > 0 && (
        <>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Events
          </div>
          <div className="flex flex-col gap-1">
            {activeCategories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat]
              const colour = EVENT_COLOURS[cat]
              return (
                <div key={cat} className="flex items-center gap-1.5">
                  <div
                    className="flex size-4 items-center justify-center rounded-full"
                    style={{ background: colour }}
                  >
                    <Icon className="size-2.5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] text-foreground">{CATEGORY_LABELS[cat]}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
      {hasTrack && (
        <div className={activeCategories.length > 0 ? "mt-1 border-t border-border pt-1" : ""}>
          <div className="mb-1 text-[10px] font-medium text-muted-foreground">AIS Track</div>
          <div className="mb-1.5 flex overflow-hidden rounded border border-border">
            {(["nav_status", "speed", "draught"] as TrackColorMode[]).map((mode) => {
              const label = mode === "nav_status" ? "Nav" : mode === "speed" ? "Speed" : "Draught"
              return (
                <button
                  key={mode}
                  onClick={() => onColorModeChange(mode)}
                  className={`flex-1 px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                    colorMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-1">
            {trackLegendItems.map(({ label, colour }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="h-0.5 w-3 rounded-full" style={{ background: colour }} />
                <span className="text-[10px] text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type MapStyle = "street" | "satellite"

function MapStyleToggle({
  style,
  onChange,
}: {
  style: MapStyle
  onChange: (style: MapStyle) => void
}) {
  return (
    <div className="absolute right-3 top-3 z-1000 flex rounded-lg border border-border bg-card/90 p-1 shadow-md backdrop-blur-sm">
      <button
        onClick={() => onChange("street")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
          style === "street"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Street view"
      >
        <MapIcon className="size-3.5" />
        <span>Street</span>
      </button>
      <button
        onClick={() => onChange("satellite")}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
          style === "satellite"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Satellite view"
      >
        <Satellite className="size-3.5" />
        <span>Satellite</span>
      </button>
    </div>
  )
}

export function MapView() {
  const { theme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  const [mapStyle, setMapStyle] = React.useState<MapStyle>("street")
  const [trackColorMode, setTrackColorMode] = React.useState<TrackColorMode>("nav_status")

  const { selectedVessel, dateRange, fetchKey, events, filters } = useAppStore()
  const { isLoading } = useDataStatus()
  const imo = selectedVessel ? parseInt(selectedVessel.imo, 10) : null
  const { data: vesselChars } = useVesselCharacteristics(imo)
  const maxDraught = vesselChars?.data.draught ?? null

  // Street tiles (CartoDB) - light/dark variants
  const streetTileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
  const streetAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

  // Satellite tiles (Esri World Imagery) - same for both modes
  const satelliteTileUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  const satelliteAttribution =
    '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'

  const tileUrl = mapStyle === "street" ? streetTileUrl : satelliteTileUrl
  const tileAttribution = mapStyle === "street" ? streetAttribution : satelliteAttribution

  if (!selectedVessel && fetchKey === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <MapPinOffIcon className="size-6 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No vessel selected</p>
          <p className="text-xs text-muted-foreground">Search for a vessel to see its track and events on the map</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative size-full">
      {isLoading && fetchKey > 0 && (
        <div className="absolute inset-0 z-500 flex flex-col gap-2 p-3 bg-background/70 backdrop-blur-sm pointer-events-none">
          <Skeleton className="h-full w-full rounded-lg opacity-40" />
        </div>
      )}
      <MapContainer
        center={[20, 0]}
        zoom={3}
        className="size-full"
        zoomControl={true}
      >
        <MapResizeHandler />
        <PaneSetup />
        <TileLayer url={tileUrl} attribution={tileAttribution} />
        {/* Dark overlay for satellite view in dark mode */}
        {mapStyle === "satellite" && isDark && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            attribution=""
            opacity={0.3}
          />
        )}
        {/* Light labels overlay for satellite view */}
        {mapStyle === "satellite" && !isDark && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            attribution=""
          />
        )}

        {imo !== null && fetchKey > 0 && (
          <AISTrack
            imo={imo}
            from={dateRange.from}
            to={dateRange.to}
            fetchKey={fetchKey}
            colorMode={trackColorMode}
            maxDraught={maxDraught}
          />
        )}

        <AISGapLayer events={events} enabled={filters["ais_gap"]} />
        <EventMarkers events={events} filters={filters} />
      </MapContainer>

      <MapStyleToggle style={mapStyle} onChange={setMapStyle} />
      <MapLegend
        filters={filters}
        colorMode={trackColorMode}
        onColorModeChange={setTrackColorMode}
        maxDraught={maxDraught}
        hasTrack={imo !== null && fetchKey > 0}
      />
    </div>
  )
}
