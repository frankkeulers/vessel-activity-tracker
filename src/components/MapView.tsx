import * as React from "react"
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
  Tooltip,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { useTheme } from "@/components/theme-provider"
import { useAppStore } from "@/store/useAppStore"
import { useAISPositions } from "@/lib/hooks"
import type { ActivityEvent, AISGapEvent, EventCategory } from "@/types"

// ─── Colours ─────────────────────────────────────────────────────────────────

const CATEGORY_COLOURS: Record<EventCategory, string> = {
  port: "#2B969C",
  zone: "#18767C",
  ais_gap: "#F88E63",
  sts: "#4ED0D0",
  discrepancy: "#EC6436",
  psc: "#0F545A",
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  port: "Port Events",
  zone: "Zone Events",
  ais_gap: "AIS Gaps",
  sts: "STS Pairings",
  discrepancy: "Discrepancies",
  psc: "Port State Control",
}

function navStatusColour(status: string | null | undefined): string {
  if (!status) return "#81E4E3"
  const s = status.toLowerCase()
  if (s.includes("moored") || s.includes("anchor")) return "#FAAF89"
  if (s.includes("underway") || s.includes("way")) return "#2B969C"
  return "#81E4E3"
}

function fmtUtc(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
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

  const markers = positions
  const allLatLngs: [number, number][] = positions.map((p) => [p.latitude, p.longitude])

  return (
    <>
      <FitBounds positions={allLatLngs} />
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.points}
          pathOptions={{ color: seg.colour, weight: 2, opacity: 0.8 }}
        />
      ))}
      {markers.map((pos, i) => (
        <CircleMarker
          key={i}
          center={[pos.latitude, pos.longitude]}
          radius={3}
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

const GAP_COLOUR = CATEGORY_COLOURS["ais_gap"] // #F88E63

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

        const colour = CATEGORY_COLOURS[ev.category]
        const isHighlighted = highlightedEventId === ev.id
        const startMs = new Date(ev.startTime).getTime()
        const endMs = ev.endTime ? new Date(ev.endTime).getTime() : null
        const durMs = endMs ? endMs - startMs : null

        return (
          <CircleMarker
            key={ev.id}
            center={[ev.latitude, ev.longitude]}
            radius={isHighlighted ? 9 : 6}
            pathOptions={{
              color: "#fff",
              fillColor: colour,
              fillOpacity: isHighlighted ? 1 : 0.85,
              weight: isHighlighted ? 2 : 1,
            }}
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
                  <div>Start: {fmtUtc(ev.startTime)}</div>
                  {ev.endTime && <div>End: {fmtUtc(ev.endTime)}</div>}
                  {durMs && <div>Duration: {formatDuration(durMs)}</div>}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: EventCategory[] = [
  "port", "zone", "ais_gap", "sts", "discrepancy", "psc",
]

function MapLegend({ filters }: { filters: Record<EventCategory, boolean> }) {
  const activeCategories = CATEGORY_ORDER.filter((c) => filters[c])
  if (activeCategories.length === 0) return null

  return (
    <div className="absolute bottom-6 right-3 z-1000 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur-sm">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Events
      </div>
      <div className="flex flex-col gap-1">
        {activeCategories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div
              className="size-2.5 rounded-full border border-white/50"
              style={{ background: CATEGORY_COLOURS[cat] }}
            />
            <span className="text-[10px] text-foreground">{CATEGORY_LABELS[cat]}</span>
          </div>
        ))}
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

export function MapView() {
  const { theme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  const { selectedVessel, dateRange, fetchKey, events, filters } = useAppStore()
  const imo = selectedVessel ? parseInt(selectedVessel.imo, 10) : null

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  const tileAttribution = isDark
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

  return (
    <div className="relative size-full">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        className="size-full"
        zoomControl={true}
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} />

        {imo !== null && fetchKey > 0 && (
          <AISTrack imo={imo} from={dateRange.from} to={dateRange.to} fetchKey={fetchKey} />
        )}

        <AISGapLayer events={events} enabled={filters["ais_gap"]} />
        <EventMarkers events={events} filters={filters} />
      </MapContainer>

      <MapLegend filters={filters} />
    </div>
  )
}
