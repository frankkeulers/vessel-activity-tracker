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
import { useAISPositions } from "@/lib/hooks"
import { useDataStatus } from "@/components/DataOrchestrator"
import type { ActivityEvent, AISGapEvent, EventCategory } from "@/types"
import { EVENT_COLOURS, CATEGORY_LABELS } from "@/config/constants"
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

function AISTrack({ imo, from, to, fetchKey }: { imo: number; from: Date; to: Date; fetchKey: number }) {
  const { data } = useAISPositions(imo, from, to, fetchKey)
  const positions = data ?? []

  if (positions.length === 0) return null

  // Build coloured segments between consecutive points
  const segments: { points: [number, number][]; colour: string }[] = []
  for (let i = 0; i < positions.length - 1; i++) {
    const a = positions[i]
    const b = positions[i + 1]
    segments.push({
      points: [
        [a.latitude, a.longitude],
        [b.latitude, b.longitude],
      ],
      colour: navStatusColour(a.navigational_status?.status),
    })
  }

  // Build direction arrows at intervals (every 5th segment to avoid clutter)
  const ARROW_INTERVAL = 5
  const arrows: { position: [number, number]; bearing: number; colour: string }[] = []
  for (let i = 0; i < positions.length - 1; i += ARROW_INTERVAL) {
    const a = positions[i]
    const b = positions[i + 1]
    // Midpoint of segment
    const midLat = (a.latitude + b.latitude) / 2
    const midLng = (a.longitude + b.longitude) / 2
    const bearing = calculateBearing(a.latitude, a.longitude, b.latitude, b.longitude)
    arrows.push({
      position: [midLat, midLng],
      bearing,
      colour: navStatusColour(a.navigational_status?.status),
    })
  }

  const markers = positions
  const allLatLngs: [number, number][] = positions.map((p) => [p.latitude, p.longitude])

  return (
    <>
      <FitBounds positions={allLatLngs} />
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.points}
          pane="aisTrackPane"
          pathOptions={{ color: seg.colour, weight: 2, opacity: 0.8 }}
        />
      ))}
      {/* Direction arrows showing vessel travel direction */}
      {arrows.map((arrow, i) => (
        <Marker
          key={`arrow-${i}`}
          position={arrow.position}
          icon={createArrowIcon(arrow.colour, arrow.bearing)}
          pane="aisTrackPane"
          interactive={false}
        />
      ))}
      {markers.map((pos, i) => (
        <CircleMarker
          key={i}
          center={[pos.latitude, pos.longitude]}
          radius={3}
          pane="aisTrackPane"
          pathOptions={{
            color: navStatusColour(pos.navigational_status?.status),
            fillColor: navStatusColour(pos.navigational_status?.status),
            fillOpacity: 0.9,
            weight: 1,
          }}
        >
          <Popup>
            <div className="text-xs">
              <div className="font-medium">{pos.navigational_status?.status ?? "Unknown"}</div>
              <div className="text-muted-foreground">{fmtUtc(pos.timestamp)}</div>
              {pos.speed != null && <div>Speed: {pos.speed} kn</div>}
            </div>
          </Popup>
        </CircleMarker>
      ))}
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
  if (!enabled) return null

  const gaps = events.filter((e) => e.category === "ais_gap")

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

  return (
    <>
      {events.map((ev) => {
        if (!filters[ev.category]) return null
        if (ev.category === "ais_gap") return null  // rendered by AISGapLayer
        if (ev.latitude == null || ev.longitude == null) return null

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

// ─── Pane setup for layer ordering ────────────────────────────────────────────

function PaneSetup() {
  const map = useMap()
  React.useEffect(() => {
    // Create panes with explicit z-index if they don't exist
    // Default leaflet panes: tilePane(200), overlayPane(400), shadowPane(500), markerPane(600), tooltipPane(650), popupPane(700)
    if (!map.getPane("eventMarkersPane")) {
      map.createPane("eventMarkersPane")
      map.getPane("eventMarkersPane")!.style.zIndex = "620" // Above markerPane(600), below tooltipPane(650)
    }
    if (!map.getPane("aisTrackPane")) {
      map.createPane("aisTrackPane")
      map.getPane("aisTrackPane")!.style.zIndex = "400" // Same as overlayPane for polylines
    }
  }, [map])
  return null
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function MapLegend({ filters }: { filters: Record<EventCategory, boolean> }) {
  const activeCategories = CATEGORY_ORDER.filter((c) => filters[c])
  if (activeCategories.length === 0) return null

  return (
    <div className="absolute bottom-6 right-3 z-1000 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur-sm">
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
        <div className="mt-1 border-t border-border pt-1">
          <div className="mb-0.5 text-[10px] font-medium text-muted-foreground">AIS Track</div>
          {[
            { label: "Underway", colour: "#2B969C" },
            { label: "Moored / Anchored", colour: "#FAAF89" },
            { label: "Other", colour: "#81E4E3" },
          ].map(({ label, colour }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-0.5 w-3 rounded-full" style={{ background: colour }} />
              <span className="text-[10px] text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
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

  const { selectedVessel, dateRange, fetchKey, events, filters } = useAppStore()
  const { isLoading } = useDataStatus()
  const imo = selectedVessel ? parseInt(selectedVessel.imo, 10) : null

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
          <AISTrack imo={imo} from={dateRange.from} to={dateRange.to} fetchKey={fetchKey} />
        )}

        <AISGapLayer events={events} enabled={filters["ais_gap"]} />
        <EventMarkers events={events} filters={filters} />
      </MapContainer>

      <MapStyleToggle style={mapStyle} onChange={setMapStyle} />
      <MapLegend filters={filters} />
    </div>
  )
}
