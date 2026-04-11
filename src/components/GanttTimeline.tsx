import * as React from "react"
import { useAppStore } from "@/store/useAppStore"
import type {
  ActivityEvent,
  EventCategory,
  PortCallEvent,
  ZoneEvent,
  AISGapEvent,
  STSEvent,
  DiscrepancyEvent,
  PSCEvent,
} from "@/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useDataStatus } from "@/components/DataOrchestrator"
import { CalendarOffIcon } from "lucide-react"
import { EVENT_COLOURS, CATEGORY_LABELS } from "@/config/constants"

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: EventCategory[] = [
  "port", "zone", "ais_gap", "sts", "discrepancy", "psc",
]

const SIDEBAR_W = 180
const ROW_H = 32
const HEADER_H = 40
const TICK_W = 3       // px width of a point-event tick mark
const MIN_BAR_PX = 4   // minimum px width for duration bars

// ─── Types ────────────────────────────────────────────────────────────────────

interface Row {
  id: string
  label: string
  category: EventCategory
}

interface Bar {
  eventId: string
  rowId: string
  label: string
  startMs: number
  endMs: number | null  // null = point event → rendered as tick
  colour: string
  tooltip: string
  event: ActivityEvent  // reference to full event for metadata
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtUtc(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

function buildRowsAndBars(
  events: ActivityEvent[],
  filters: Record<EventCategory, boolean>,
): { rows: Row[]; bars: Bar[]; minMs: number; maxMs: number } {
  const rows: Row[] = []
  const bars: Bar[] = []
  let minMs = Infinity
  let maxMs = -Infinity

  for (const category of CATEGORY_ORDER) {
    if (!filters[category]) continue
    const catEvents = events.filter((e) => e.category === category)
    if (catEvents.length === 0) continue

    // Create separate rows for different event types to handle nesting
    const eventTypeRows = new Map<string, Row>()
    
    for (const ev of catEvents) {
      const startMs = new Date(ev.startTime).getTime()
      if (isNaN(startMs)) continue
      const rawEndMs = ev.endTime ? new Date(ev.endTime).getTime() : null
      const validRawEnd = rawEndMs && !isNaN(rawEndMs) ? rawEndMs : null

      minMs = Math.min(minMs, startMs)
      maxMs = Math.max(maxMs, validRawEnd ?? startMs)

      const durMs = validRawEnd ? validRawEnd - startMs : 0
      const isPoint = validRawEnd === null || durMs < 60_000

      // Determine row based on event type
      let rowId: string
      let rowLabel: string
      
      if (category === "port") {
        if (ev.subType.includes("PORT_AREA")) {
          rowId = `port-area`
          rowLabel = "Port Area"
        } else if (ev.subType.includes("PORT_ARRIVAL") || ev.subType.includes("PORT_DEPARTURE")) {
          rowId = `port`
          rowLabel = "Port"
        } else {
          // BERTH events or others
          rowId = `berth`
          rowLabel = "Berth"
        }
      } else if (category === "zone") {
        rowId = `zone`
        rowLabel = "Zone"
      } else {
        // Other categories use single row
        rowId = `cat::${category}`
        rowLabel = CATEGORY_LABELS[category]
      }

      // Create row if it doesn't exist
      if (!eventTypeRows.has(rowId)) {
        eventTypeRows.set(rowId, { id: rowId, label: rowLabel, category })
      }

      const tooltip = [
        `${ev.subType}`,
        ev.label ? ev.label : null,
        `Time: ${fmtUtc(ev.startTime)}`,
        !isPoint && validRawEnd ? `End:  ${fmtUtc(ev.endTime!)}` : null,
        durMs > 0 ? `Duration: ${formatDuration(durMs)}` : null,
      ].filter(Boolean).join("\n")

      bars.push({
        eventId: ev.id,
        rowId,
        label: ev.label || ev.subType,
        startMs,
        endMs: isPoint ? null : validRawEnd,
        colour: EVENT_COLOURS[category],
        tooltip,
        event: ev,
      })
    }

    // Add rows for this category in the correct order for nesting
    if (category === "port") {
      // Port events should be ordered: Port Area -> Port -> Berth
      const order = ["port-area", "port", "berth"]
      order.forEach(rowId => {
        const row = eventTypeRows.get(rowId)
        if (row) rows.push(row)
      })
    } else {
      rows.push(...eventTypeRows.values())
    }
  }

  return { rows, bars, minMs, maxMs }
}

function getTicks(startMs: number, endMs: number, width: number): { ms: number; label: string }[] {
  const spanMs = endMs - startMs
  const approxCount = Math.max(3, Math.floor(width / 110))
  const rawStep = spanMs / approxCount
  const STEPS = [
    60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000,
    3_600_000, 3 * 3_600_000, 6 * 3_600_000, 12 * 3_600_000,
    86_400_000, 3 * 86_400_000, 7 * 86_400_000, 14 * 86_400_000, 30 * 86_400_000,
  ]
  const step = STEPS.find((s) => s >= rawStep) ?? STEPS[STEPS.length - 1]
  const ticks: { ms: number; label: string }[] = []
  const first = Math.ceil(startMs / step) * step
  for (let ms = first; ms <= endMs; ms += step) {
    const d = new Date(ms)
    const label = step >= 86_400_000
      ? d.toISOString().slice(0, 10)
      : d.toISOString().slice(0, 16).replace("T", " ")
    ticks.push({ ms, label })
  }
  return ticks
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GanttTimeline() {
  const { ganttEvents, filters, dateRange, fetchKey, highlightedEventId, setHighlightedEventId } = useAppStore()
  const { isLoading } = useDataStatus()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const [canvasW, setCanvasW] = React.useState(800)

  React.useEffect(() => {
    const updateWidth = () => {
      const el = canvasRef.current
      const containerEl = containerRef.current
      if (!el || !containerEl) return
      
      const rect = el.getBoundingClientRect()
      const containerRect = containerEl.getBoundingClientRect()
      
      // With grid layout, the canvas should take the remaining space
      const expectedWidth = containerRect.width - SIDEBAR_W
      
      // Use the expected width if the canvas hasn't been measured properly yet
      const actualWidth = rect.width > 0 ? rect.width : expectedWidth
      setCanvasW(Math.max(actualWidth, 1))
    }
    
    // Initial measurement
    updateWidth()
    
    const ro = new ResizeObserver(() => {
      updateWidth()
    })
    
    if (canvasRef.current) {
      ro.observe(canvasRef.current)
    }
    
    window.addEventListener('resize', updateWidth)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  const { rows, bars, minMs, maxMs } = React.useMemo(
    () => buildRowsAndBars(ganttEvents, filters),
    [ganttEvents, filters],
  )

  // Static timeline - always show full date range
  const { viewStart, viewEnd, msPerPx } = React.useMemo(() => {
    if (rows.length === 0 || minMs === Infinity) {
      const startMs = dateRange.from.getTime()
      const endMs = dateRange.to.getTime()
      return {
        viewStart: startMs,
        viewEnd: endMs,
        msPerPx: (endMs - startMs) / Math.max(canvasW, 1)
      }
    }
    
    // Show full event range with small padding
    const pad = (maxMs - minMs) * 0.04 || 3_600_000
    const startMs = minMs - pad
    const endMs = maxMs + pad
    const span = endMs - startMs
    
    return {
      viewStart: startMs,
      viewEnd: endMs,
      msPerPx: span / Math.max(canvasW, 1)
    }
  }, [rows, minMs, maxMs, dateRange, canvasW])

  // Remove wheel zoom - make it static
  // function handleWheel(e: React.WheelEvent) { ... }

  // Remove drag pan - make it completely static
  // const dragRef = React.useRef<{ startX: number; startViewStart: number } | null>(null)
  // function handleMouseDown(e: React.MouseEvent) { ... }
  // function handleMouseMove(e: React.MouseEvent) { ... }
  // function handleMouseUp() { ... }

  if (isLoading && fetchKey > 0) {
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 flex-1" />
        </div>
        {["w-24", "w-28", "w-20", "w-32"].map((w, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className={`h-4 ${w}`} />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  if (ganttEvents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <CalendarOffIcon className="size-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Fetch data to see the timeline</p>
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <CalendarOffIcon className="size-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No events match the active filters</p>
      </div>
    )
  }

  const ticks = getTicks(viewStart, viewEnd, canvasW)
  const totalH = rows.length * ROW_H

  function xOf(ms: number) { return Math.round((ms - viewStart) / msPerPx) }

  return (
    <div
      ref={containerRef}
      className="relative flex size-full select-none flex-col overflow-hidden bg-background text-foreground"
    >
      {/* Header */}
      <div className="flex shrink-0 border-b border-border" style={{ height: HEADER_H }}>
        <div
          className="shrink-0 border-r border-border bg-muted/40 px-2 flex items-end pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ width: SIDEBAR_W }}
        >
          Category
        </div>
        <div className="relative flex-1 overflow-hidden bg-muted/20">
          {ticks.map(({ ms, label }) => {
            const x = xOf(ms)
            if (x < -60 || x > canvasW + 60) return null
            return (
              <div
                key={ms}
                className="absolute bottom-1 flex flex-col items-center"
                style={{ left: x, transform: "translateX(-50%)" }}
              >
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: `${SIDEBAR_W}px 1fr` }}>
        {/* Sidebar */}
        <div className="border-r border-border" style={{ minHeight: totalH }}>
          {rows.map((row) => {
            const isRowHighlighted = bars.some(
              (b) =>
                b.rowId === row.id &&
                highlightedEventId != null &&
                (b.eventId === highlightedEventId ||
                  (b.event.sourceIds?.includes(highlightedEventId) ?? false)),
            )
            return (
              <div
                key={row.id}
                title={row.label}
                className="flex items-center truncate border-b border-border/30 text-xs"
                style={{
                  height: ROW_H,
                  paddingLeft: 8,
                  fontWeight: isRowHighlighted ? 700 : 600,
                  color: EVENT_COLOURS[row.category],
                  borderLeft: `3px solid ${EVENT_COLOURS[row.category]}`,
                  background: isRowHighlighted
                    ? `${EVENT_COLOURS[row.category]}30`
                    : `${EVENT_COLOURS[row.category]}12`,
                }}
              >
                {row.label}
              </div>
            )
          })}
        </div>

        {/* Canvas */}
        <div ref={canvasRef} className="relative" style={{ minHeight: totalH }}>
          {/* Grid lines */}
          {ticks.map(({ ms }) => {
            const x = xOf(ms)
            return <div key={ms} className="absolute top-0 bottom-0 w-px bg-border/25" style={{ left: x }} />
          })}

          {/* Row backgrounds */}
          {rows.map((row, i) => (
            <div
              key={row.id}
              className="absolute left-0 right-0 border-b border-border/20"
              style={{
                top: i * ROW_H,
                height: ROW_H,
                background: `${EVENT_COLOURS[row.category]}08`,
              }}
            />
          ))}

          {/* Highlighted row strip */}
          {bars.map((bar) => {
            const isHighlightedBar =
              highlightedEventId != null &&
              (bar.eventId === highlightedEventId ||
                (bar.event.sourceIds?.includes(highlightedEventId) ?? false))
            if (!isHighlightedBar) return null
            const rowIndex = rows.findIndex((r) => r.id === bar.rowId)
            if (rowIndex === -1) return null
            return (
              <div
                key={`hl-row-${bar.eventId}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: rowIndex * ROW_H,
                  height: ROW_H,
                  background: `${bar.colour}22`,
                  borderTop: `1px solid ${bar.colour}80`,
                  borderBottom: `1px solid ${bar.colour}80`,
                  zIndex: 0,
                }}
              />
            )
          })}

          {/* Bars and tick marks */}
          {bars.map((bar) => {
            const rowIndex = rows.findIndex((r) => r.id === bar.rowId)
            if (rowIndex === -1) return null
            const x1 = xOf(bar.startMs)
            const isHighlighted =
              highlightedEventId != null &&
              (bar.eventId === highlightedEventId ||
                (bar.event.sourceIds?.includes(highlightedEventId) ?? false))
            const top = rowIndex * ROW_H

            const tooltipContent = <EventTooltipContent bar={bar} />

            if (bar.endMs === null) {
              // Point event → render as a vertical tick
              if (x1 < -TICK_W || x1 > canvasW + TICK_W) return null
              return (
                <Tooltip key={bar.eventId}>
                  <TooltipTrigger asChild>
                    <div
                      data-bar="1"
                      onClick={() => setHighlightedEventId(highlightedEventId === bar.eventId ? null : bar.eventId)}
                      className="absolute cursor-pointer"
                      style={{
                        top: top + 3,
                        left: x1 - Math.floor(TICK_W / 2),
                        width: TICK_W,
                      height: ROW_H - 6,
                        background: isHighlighted ? `#fff` : bar.colour,
                        borderRadius: 2,
                        opacity: 1,
                        border: isHighlighted ? `2px solid ${bar.colour}` : undefined,
                        zIndex: isHighlighted ? 10 : 2,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={2}
                    avoidCollisions={true}
                    collisionPadding={10}
                    className="max-w-xs p-0 bg-background border border-border shadow-lg z-9999"
                  >
                    {tooltipContent}
                  </TooltipContent>
                </Tooltip>
              )
            }

            // Duration bar
            const x2 = xOf(bar.endMs)
            const barW = Math.max(x2 - x1, MIN_BAR_PX)
            if (x2 < 0 || x1 > canvasW) return null
            return (
              <Tooltip key={bar.eventId}>
                <TooltipTrigger asChild>
                  <div
                    data-bar="1"
                    onClick={() => setHighlightedEventId(highlightedEventId === bar.eventId ? null : bar.eventId)}
                    className="absolute cursor-pointer truncate px-1 text-[10px] font-medium text-white"
                    style={{
                      top: top + 4,
                      left: Math.max(x1, 0),
                      width: barW,
                      height: ROW_H - 8,
                      lineHeight: `${ROW_H - 8}px`,
                      background: isHighlighted ? `repeating-linear-gradient(45deg, #fff, #fff 2px, ${bar.colour} 2px, ${bar.colour} 4px)` : bar.colour,
                      borderRadius: 3,
                      opacity: 1,
                      border: isHighlighted ? `2px solid ${bar.colour}` : undefined,
                      color: isHighlighted ? bar.colour : "#fff",
                      fontWeight: isHighlighted ? 700 : 500,
                      zIndex: isHighlighted ? 10 : 1,
                    }}
                  >
                    {barW > 40 ? bar.label : ""}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={2}
                  avoidCollisions={true}
                  collisionPadding={10}
                  className="max-w-xs p-0 bg-background border border-border shadow-lg z-9999"
                >
                  {tooltipContent}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Per-category tooltip metadata ────────────────────────────────────────────

function PortTooltipMeta({ event }: { event: ActivityEvent }) {
  const raw = event.raw as PortCallEvent
  const port = raw.port_information
  const berth = raw.berth_information
  const eventDetails = raw.event_details
  return (
    <div className="space-y-1 text-xs">
      {Boolean(port?.name) && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Port:</span>
          <span className="text-foreground font-medium">{port?.name ?? ""}</span>
        </div>
      )}
      {Boolean(berth?.name) && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Berth:</span>
          <span className="text-foreground">{berth?.name ?? ""}</span>
        </div>
      )}
      {Boolean(eventDetails?.event_type) && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Event:</span>
          <span className="text-foreground">{eventDetails?.event_type ?? ""}</span>
        </div>
      )}
      {Boolean(port?.unlocode) && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">UNLOCODE:</span>
          <span className="text-foreground">{port?.unlocode ?? ""}</span>
        </div>
      )}
    </div>
  )
}

function ZoneTooltipMeta({ event }: { event: ActivityEvent }) {
  const raw = event.raw as ZoneEvent
  const zone = raw.zone_information
  const eventDetails = raw.event_details
  return (
    <div className="space-y-1 text-xs">
      {zone?.name != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Zone:</span>
          <span className="text-foreground font-medium">{zone.name}</span>
        </div>
      )}
      {zone?.type != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Type:</span>
          <span className="text-foreground">{zone.type}</span>
        </div>
      )}
      {eventDetails?.event_type != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Event:</span>
          <span className="text-foreground">{eventDetails.event_type}</span>
        </div>
      )}
    </div>
  )
}

function AISGapTooltipMeta({ event }: { event: ActivityEvent }) {
  const raw = event.raw as AISGapEvent
  const stopped = raw.stopped
  const resumed = raw.resumed
  return (
    <div className="space-y-1 text-xs">
      {raw.gap_duration_hours != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Duration:</span>
          <span className="text-foreground font-medium">{raw.gap_duration_hours.toFixed(1)}h</span>
        </div>
      )}
      {stopped?.navigational_status != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Stopped status:</span>
          <span className="text-foreground">{stopped.navigational_status.status}</span>
        </div>
      )}
      {stopped?.speed != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Stopped speed:</span>
          <span className="text-foreground">{stopped.speed.toFixed(1)} kn</span>
        </div>
      )}
      {resumed?.speed != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Resumed speed:</span>
          <span className="text-foreground">{resumed.speed.toFixed(1)} kn</span>
        </div>
      )}
    </div>
  )
}

function STSTooltipMeta({ event }: { event: ActivityEvent }) {
  const raw = event.raw as STSEvent
  const pairedVessel = raw.paired_vessel
  return (
    <div className="space-y-1 text-xs">
      {pairedVessel?.name != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Paired vessel:</span>
          <span className="text-foreground font-medium">{pairedVessel.name}</span>
        </div>
      )}
      {pairedVessel?.imo != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Paired IMO:</span>
          <span className="text-foreground">{pairedVessel.imo}</span>
        </div>
      )}
      {raw.duration_hours != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Duration:</span>
          <span className="text-foreground">{raw.duration_hours.toFixed(1)}h</span>
        </div>
      )}
      {raw.sts_type && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">STS type:</span>
          <span className="text-foreground">{raw.sts_type}</span>
        </div>
      )}
    </div>
  )
}

function DiscrepancyTooltipMeta({ event }: { event: ActivityEvent }) {
  const raw = event.raw as DiscrepancyEvent
  return (
    <div className="space-y-1 text-xs">
      {raw.event_type && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Type:</span>
          <span className="text-foreground font-medium">{raw.event_type}</span>
        </div>
      )}
      {raw.duration_hours != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Duration:</span>
          <span className="text-foreground">{raw.duration_hours.toFixed(1)}h</span>
        </div>
      )}
      {raw.has_ended != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Status:</span>
          <span className="text-foreground">{raw.has_ended ? "Ended" : "Ongoing"}</span>
        </div>
      )}
    </div>
  )
}

function PSCTooltipMeta({ event }: { event: ActivityEvent }) {
  const raw = event.raw as PSCEvent
  const port = raw.port_information
  return (
    <div className="space-y-1 text-xs">
      {Boolean(port?.name) && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Port:</span>
          <span className="text-foreground font-medium">{port?.name ?? ""}</span>
        </div>
      )}
      {raw.authority && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Authority:</span>
          <span className="text-foreground">{raw.authority}</span>
        </div>
      )}
      {raw.inspection_type && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Type:</span>
          <span className="text-foreground">{raw.inspection_type}</span>
        </div>
      )}
      {raw.no_defects != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Defects:</span>
          <span className={raw.no_defects > 0 ? "text-orange-500 font-medium" : "text-foreground"}>{raw.no_defects}</span>
        </div>
      )}
      {raw.detained != null && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Detained:</span>
          <span className={raw.detained ? "text-red-500 font-medium" : "text-foreground"}>{raw.detained ? "Yes" : "No"}</span>
        </div>
      )}
    </div>
  )
}

const TOOLTIP_META: Record<EventCategory, React.ComponentType<{ event: ActivityEvent }>> = {
  port: PortTooltipMeta,
  zone: ZoneTooltipMeta,
  ais_gap: AISGapTooltipMeta,
  sts: STSTooltipMeta,
  discrepancy: DiscrepancyTooltipMeta,
  psc: PSCTooltipMeta,
}

// ─── Event Tooltip Component ───────────────────────────────────────────────

function EventTooltipContent({ bar }: { bar: Bar }) {
  const ev = bar.event

  const fmtCoord = (lat: number | null, lon: number | null): string => {
    if (lat == null || lon == null) return "—"
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  }

  const durMs = ev.endTime ? new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime() : 0
  const MetaComponent = TOOLTIP_META[ev.category]

  return (
    <div className="p-3 space-y-2 min-w-[200px]">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EVENT_COLOURS[ev.category] }} />
        <span className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[ev.category]}</span>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{ev.label || ev.subType}</div>
        <div className="text-xs text-muted-foreground">{ev.subType}</div>
      </div>
      <div className="space-y-1 text-xs pt-1">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Start:</span>
          <span className="text-foreground">{fmtUtc(ev.startTime)}</span>
        </div>
        {ev.endTime && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">End:</span>
            <span className="text-foreground">{fmtUtc(ev.endTime)}</span>
          </div>
        )}
        {durMs > 0 && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Duration:</span>
            <span className="text-foreground">{formatDuration(durMs)}</span>
          </div>
        )}
        {(ev.latitude != null || ev.longitude != null) && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Location:</span>
            <span className="text-foreground">{fmtCoord(ev.latitude, ev.longitude)}</span>
          </div>
        )}
      </div>
      <div className="pt-2 border-t border-border mt-2">
        <MetaComponent event={ev} />
      </div>
    </div>
  )
}
