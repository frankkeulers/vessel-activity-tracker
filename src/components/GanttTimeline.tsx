import * as React from "react"
import { useAppStore } from "@/store/useAppStore"
import type { GanttGroupMode } from "@/store/useAppStore"
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
import { EVENT_COLOURS, CATEGORY_LABELS, REPLAY_PLAYHEAD_COLOR, REPLAY_FUTURE_BAR_OPACITY } from "@/config/constants"
import { cn } from "@/lib/utils"

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: EventCategory[] = [
  "port", "zone", "ais_gap", "sts", "discrepancy", "psc",
]

const SIDEBAR_W    = 180
const GROUP_HEADER_H = 24  // visual separator header rows (no bars)
const LANE_ROW_H   = 32   // event lane rows (bars rendered here)
const HEADER_H     = 40
const TICK_W       = 3
const MIN_BAR_PX   = 4

// ─── Port type helpers ────────────────────────────────────────────────────────

type PortTypeKey = "port-area" | "port" | "berth"

const PORT_TYPE_ORDER: PortTypeKey[] = ["port-area", "port", "berth"]

const PORT_TYPE_LABELS: Record<PortTypeKey, string> = {
  "port-area": "Port Area",
  "port":      "Port",
  "berth":     "Berth",
}

const PORT_GROUP_LABELS: Record<PortTypeKey, string> = {
  "port-area": "PORT AREA",
  "port":      "PORT",
  "berth":     "BERTH",
}

function getPortTypeKey(subType: string): PortTypeKey {
  if (subType.includes("PORT_AREA")) return "port-area"
  if (subType.includes("BERTH"))     return "berth"
  return "port"
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Row {
  id: string
  label: string
  category: EventCategory
  isGroupHeader: boolean  // true = visual separator, no bars rendered
  isIndented: boolean     // true = sidebar label indented 20px
  height: number          // GROUP_HEADER_H or LANE_ROW_H
}

interface Bar {
  eventId: string
  rowId: string
  label: string
  locationLabel: string  // ev.label — for bar text (duration + name)
  startMs: number
  endMs: number | null   // null = point event → rendered as tick
  colour: string
  tooltip: string
  event: ActivityEvent
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDurationShort(ms: number): string {
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const h = mins / 60
  if (h < 24)   return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}

function fmtUtc(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

function buildRowsAndBars(
  events: ActivityEvent[],
  filters: Record<EventCategory, boolean>,
  mode: GanttGroupMode,
): { rows: Row[]; bars: Bar[]; minMs: number; maxMs: number } {
  const rows: Row[] = []
  const bars: Bar[] = []
  let minMs = Infinity
  let maxMs = -Infinity

  function processEvent(ev: ActivityEvent, rowId: string): void {
    const startMs = new Date(ev.startTime).getTime()
    if (isNaN(startMs)) return
    const rawEndMs = ev.endTime ? new Date(ev.endTime).getTime() : null
    const validRawEnd = rawEndMs && !isNaN(rawEndMs) ? rawEndMs : null

    minMs = Math.min(minMs, startMs)
    maxMs = Math.max(maxMs, validRawEnd ?? startMs)

    const durMs = validRawEnd ? validRawEnd - startMs : 0
    const isPoint = validRawEnd === null || durMs < 60_000

    const tooltip = [
      `${ev.subType}`,
      ev.label ? ev.label : null,
      `Time: ${fmtUtc(ev.startTime)}`,
      !isPoint && validRawEnd ? `End:  ${fmtUtc(ev.endTime!)}` : null,
      durMs > 0 ? `Duration: ${formatDuration(durMs)}` : null,
    ].filter(Boolean).join("\n")

    bars.push({
      eventId:       ev.id,
      rowId,
      label:         ev.label || ev.subType,
      locationLabel: ev.label,
      startMs,
      endMs:   isPoint ? null : validRawEnd,
      colour:  EVENT_COLOURS[ev.category],
      tooltip,
      event:   ev,
    })
  }

  if (mode === "by-event-type") {
    for (const category of CATEGORY_ORDER) {
      if (!filters[category]) continue
      const catEvents = events.filter((e) => e.category === category)
      if (catEvents.length === 0) continue

      if (category === "port") {
        // Collect unique locations per port type key (preserve insertion/chronological order)
        const groups = new Map<PortTypeKey, Map<string, true>>()
        PORT_TYPE_ORDER.forEach((k) => groups.set(k, new Map()))

        for (const ev of catEvents) {
          const ptk = getPortTypeKey(ev.subType)
          groups.get(ptk)!.set(ev.label, true)
        }

        for (const ptk of PORT_TYPE_ORDER) {
          const locations = groups.get(ptk)!
          if (locations.size === 0) continue

          rows.push({
            id:            `group::${ptk}`,
            label:         PORT_GROUP_LABELS[ptk],
            category:      "port",
            isGroupHeader: true,
            isIndented:    false,
            height:        GROUP_HEADER_H,
          })

          for (const loc of locations.keys()) {
            rows.push({
              id:            `${ptk}::${loc}`,
              label:         loc,
              category:      "port",
              isGroupHeader: false,
              isIndented:    true,
              height:        LANE_ROW_H,
            })
          }
        }

        for (const ev of catEvents) {
          const ptk = getPortTypeKey(ev.subType)
          processEvent(ev, `${ptk}::${ev.label}`)
        }

      } else if (category === "zone") {
        const locations = new Map<string, true>()
        for (const ev of catEvents) locations.set(ev.label, true)

        rows.push({
          id:            "group::zone",
          label:         "ZONE EVENTS",
          category:      "zone",
          isGroupHeader: true,
          isIndented:    false,
          height:        GROUP_HEADER_H,
        })

        for (const loc of locations.keys()) {
          rows.push({
            id:            `zone::${loc}`,
            label:         loc,
            category:      "zone",
            isGroupHeader: false,
            isIndented:    true,
            height:        LANE_ROW_H,
          })
        }

        for (const ev of catEvents) {
          processEvent(ev, `zone::${ev.label}`)
        }

      } else {
        rows.push({
          id:            `cat::${category}`,
          label:         CATEGORY_LABELS[category],
          category,
          isGroupHeader: false,
          isIndented:    false,
          height:        LANE_ROW_H,
        })

        for (const ev of catEvents) {
          processEvent(ev, `cat::${category}`)
        }
      }
    }
  } else {
    // mode === "by-location"
    // First pass: collect unique locations in chronological order
    const portByLoc = new Map<string, Set<PortTypeKey>>()
    const zoneByLoc = new Map<string, true>()

    for (const ev of events) {
      if (!filters[ev.category]) continue
      if (ev.category === "port") {
        if (!portByLoc.has(ev.label)) portByLoc.set(ev.label, new Set())
        portByLoc.get(ev.label)!.add(getPortTypeKey(ev.subType))
      } else if (ev.category === "zone") {
        zoneByLoc.set(ev.label, true)
      }
    }

    // Port location groups
    for (const [loc, ptks] of portByLoc) {
      rows.push({
        id:            `loc-group::${loc}`,
        label:         loc.toUpperCase(),
        category:      "port",
        isGroupHeader: true,
        isIndented:    false,
        height:        GROUP_HEADER_H,
      })

      for (const ptk of PORT_TYPE_ORDER) {
        if (!ptks.has(ptk)) continue
        rows.push({
          id:            `${loc}::${ptk}`,
          label:         PORT_TYPE_LABELS[ptk],
          category:      "port",
          isGroupHeader: false,
          isIndented:    true,
          height:        LANE_ROW_H,
        })
      }
    }

    if (filters["port"]) {
      for (const ev of events.filter((e) => e.category === "port")) {
        processEvent(ev, `${ev.label}::${getPortTypeKey(ev.subType)}`)
      }
    }

    // Zone location groups
    if (filters["zone"] && zoneByLoc.size > 0) {
      for (const loc of zoneByLoc.keys()) {
        rows.push({
          id:            `zone-group::${loc}`,
          label:         loc.toUpperCase(),
          category:      "zone",
          isGroupHeader: true,
          isIndented:    false,
          height:        GROUP_HEADER_H,
        })
        rows.push({
          id:            `${loc}::zone`,
          label:         "Zone",
          category:      "zone",
          isGroupHeader: false,
          isIndented:    true,
          height:        LANE_ROW_H,
        })
      }

      for (const ev of events.filter((e) => e.category === "zone")) {
        processEvent(ev, `${ev.label}::zone`)
      }
    }

    // Flat categories
    for (const category of ["ais_gap", "sts", "discrepancy", "psc"] as EventCategory[]) {
      if (!filters[category]) continue
      const catEvents = events.filter((e) => e.category === category)
      if (catEvents.length === 0) continue

      rows.push({
        id:            `cat::${category}`,
        label:         CATEGORY_LABELS[category],
        category,
        isGroupHeader: false,
        isIndented:    false,
        height:        LANE_ROW_H,
      })

      for (const ev of catEvents) {
        processEvent(ev, `cat::${category}`)
      }
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

// ─── Replay helpers ───────────────────────────────────────────────────────────

type BarReplayState = "future" | "active" | "ended" | "normal"

function getBarReplayState(
  startMs: number,
  endMs: number | null,
  cursorMs: number,
): BarReplayState {
  if (startMs > cursorMs) return "future"
  if (endMs !== null && endMs <= cursorMs) return "ended"
  return "active" // started but not yet ended (or point event)
}

// Isolated sub-component: subscribes only to replayAt so it re-renders at 20 Hz
// without causing the full GanttTimeline to re-render.
function GanttPlayhead({
  viewStart,
  msPerPx,
  totalH,
}: {
  viewStart: number
  msPerPx: number
  totalH: number
}) {
  const replayAt = useAppStore((s) => s.replayAt)
  if (replayAt === null) return null

  const x = Math.round((replayAt.getTime() - viewStart) / msPerPx)

  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left:       x - 1,
        width:      1.5,
        height:     totalH,
        background: REPLAY_PLAYHEAD_COLOR,
        zIndex:     20,
      }}
    />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GanttTimeline() {
  const {
    ganttEvents, filters, dateRange, fetchKey,
    highlightedEventId, setHighlightedEventId,
    ganttGroupMode, setGanttGroupMode,
  } = useAppStore()
  // Throttle bar replay states to ~2 Hz via polling — the playhead smoothness
  // comes from the isolated GanttPlayhead sub-component, not from here.
  const [replayAtThrottled, setReplayAtThrottled] = React.useState<Date | null>(
    () => useAppStore.getState().replayAt,
  )
  React.useEffect(() => {
    const sync = () => setReplayAtThrottled(useAppStore.getState().replayAt)
    const id = setInterval(sync, 500)
    return () => clearInterval(id)
  }, [])
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
      const expectedWidth = containerRect.width - SIDEBAR_W
      const actualWidth = rect.width > 0 ? rect.width : expectedWidth
      setCanvasW(Math.max(actualWidth, 1))
    }

    updateWidth()

    const ro = new ResizeObserver(() => { updateWidth() })
    if (canvasRef.current) ro.observe(canvasRef.current)
    window.addEventListener("resize", updateWidth)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", updateWidth)
    }
  }, [])

  const { rows, bars, minMs, maxMs } = React.useMemo(
    () => buildRowsAndBars(ganttEvents, filters, ganttGroupMode),
    [ganttEvents, filters, ganttGroupMode],
  )

  const { rowTops, totalH } = React.useMemo(() => {
    const tops = new Map<string, number>()
    let y = 0
    for (const row of rows) {
      tops.set(row.id, y)
      y += row.height
    }
    return { rowTops: tops, totalH: y }
  }, [rows])

  const { viewStart, viewEnd, msPerPx } = React.useMemo(() => {
    if (rows.length === 0 || minMs === Infinity) {
      const startMs = dateRange.from.getTime()
      const endMs = dateRange.to.getTime()
      return {
        viewStart: startMs,
        viewEnd:   endMs,
        msPerPx:   (endMs - startMs) / Math.max(canvasW, 1),
      }
    }

    const pad = (maxMs - minMs) * 0.04 || 3_600_000
    const startMs = minMs - pad
    const endMs   = maxMs + pad
    const span    = endMs - startMs

    return {
      viewStart: startMs,
      viewEnd:   endMs,
      msPerPx:   span / Math.max(canvasW, 1),
    }
  }, [rows, minMs, maxMs, dateRange, canvasW])

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

  const hasLaneRows = rows.some((r) => !r.isGroupHeader)
  if (!hasLaneRows) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <CalendarOffIcon className="size-5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No events match the active filters</p>
      </div>
    )
  }

  const ticks = getTicks(viewStart, viewEnd, canvasW)

  function xOf(ms: number) { return Math.round((ms - viewStart) / msPerPx) }

  return (
    <div
      ref={containerRef}
      className="relative flex size-full select-none flex-col overflow-hidden bg-background text-foreground"
    >
      {/* Header */}
      <div className="flex shrink-0 border-b border-border" style={{ height: HEADER_H }}>
        {/* Sidebar: segmented toggle */}
        <div
          className="shrink-0 border-r border-border bg-muted/40 px-2 flex items-center gap-0"
          style={{ width: SIDEBAR_W }}
        >
          <button
            onClick={() => setGanttGroupMode("by-event-type")}
            className={cn(
              "rounded-l border px-2 py-0.5 text-[10px] font-semibold transition-colors focus-visible:outline-none",
              ganttGroupMode === "by-event-type"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80",
            )}
          >
            By Type
          </button>
          <button
            onClick={() => setGanttGroupMode("by-location")}
            className={cn(
              "rounded-r border border-l-0 px-2 py-0.5 text-[10px] font-semibold transition-colors focus-visible:outline-none",
              ganttGroupMode === "by-location"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80",
            )}
          >
            By Location
          </button>
        </div>

        {/* Tick labels */}
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

      {/* Body — single scroll container so sidebar + canvas move together */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div
          style={{ display: "grid", gridTemplateColumns: `${SIDEBAR_W}px 1fr`, minHeight: totalH }}
        >
        {/* Sidebar */}
        <div className="border-r border-border" style={{ height: totalH }}>
          {rows.map((row) => {
            if (row.isGroupHeader) {
              return (
                <div
                  key={row.id}
                  className="flex items-center border-b border-border/40 px-2"
                  style={{
                    height:     row.height,
                    background: `${EVENT_COLOURS[row.category]}18`,
                  }}
                >
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest truncate"
                    style={{ color: EVENT_COLOURS[row.category] }}
                  >
                    {row.label}
                  </span>
                </div>
              )
            }

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
                className="flex items-center truncate border-b border-border/20 text-xs"
                style={{
                  height:      row.height,
                  paddingLeft: row.isIndented ? 20 : 8,
                  fontWeight:  isRowHighlighted ? 600 : 400,
                  color:       isRowHighlighted
                    ? EVENT_COLOURS[row.category]
                    : "var(--muted-foreground)",
                  background: isRowHighlighted
                    ? `${EVENT_COLOURS[row.category]}18`
                    : "transparent",
                }}
              >
                {row.label}
              </div>
            )
          })}
        </div>

        {/* Canvas */}
        <div ref={canvasRef} className="relative" style={{ height: totalH }}>
          {/* Replay playhead — isolated sub-component, only it re-renders at 20 Hz */}
          <GanttPlayhead viewStart={viewStart} msPerPx={msPerPx} totalH={totalH} />

          {/* Grid lines */}
          {ticks.map(({ ms }) => {
            const x = xOf(ms)
            return <div key={ms} className="absolute top-0 bottom-0 w-px bg-border/25" style={{ left: x }} />
          })}

          {/* Row backgrounds */}
          {rows.map((row) => {
            const top = rowTops.get(row.id) ?? 0
            return (
              <div
                key={row.id}
                className="absolute left-0 right-0 border-b border-border/20"
                style={{
                  top,
                  height:     row.height,
                  background: row.isGroupHeader
                    ? `${EVENT_COLOURS[row.category]}18`
                    : "transparent",
                }}
              />
            )
          })}

          {/* Highlighted row strip */}
          {bars.map((bar) => {
            const isHighlightedBar =
              highlightedEventId != null &&
              (bar.eventId === highlightedEventId ||
                (bar.event.sourceIds?.includes(highlightedEventId) ?? false))
            if (!isHighlightedBar) return null
            const top = rowTops.get(bar.rowId)
            if (top === undefined) return null
            return (
              <div
                key={`hl-row-${bar.eventId}`}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top,
                  height:        LANE_ROW_H,
                  background:    `${bar.colour}22`,
                  borderTop:    `1px solid ${bar.colour}80`,
                  borderBottom: `1px solid ${bar.colour}80`,
                  zIndex: 0,
                }}
              />
            )
          })}

          {/* Bars and tick marks */}
          {bars.map((bar) => {
            const top = rowTops.get(bar.rowId)
            if (top === undefined) return null
            const x1 = xOf(bar.startMs)
            const isHighlighted =
              highlightedEventId != null &&
              (bar.eventId === highlightedEventId ||
                (bar.event.sourceIds?.includes(highlightedEventId) ?? false))

            const cursorMs = replayAtThrottled?.getTime() ?? Infinity
            const replayState: BarReplayState =
              replayAtThrottled !== null
                ? getBarReplayState(bar.startMs, bar.endMs, cursorMs)
                : "normal"

            const tooltipContent = <EventTooltipContent bar={bar} />

            if (bar.endMs === null) {
              // Point event → render as a vertical tick
              if (x1 < -TICK_W || x1 > canvasW + TICK_W) return null
              return (
                <Tooltip key={bar.eventId}>
                  <TooltipTrigger asChild>
                    <div
                      data-bar="1"
                      role="button"
                      tabIndex={0}
                      aria-label={bar.label}
                      aria-pressed={isHighlighted}
                      onClick={() => setHighlightedEventId(highlightedEventId === bar.eventId ? null : bar.eventId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setHighlightedEventId(highlightedEventId === bar.eventId ? null : bar.eventId)
                        }
                      }}
                      className="absolute cursor-pointer"
                      style={{
                        top:          top + 3,
                        left:         x1 - Math.floor(TICK_W / 2),
                        width:        TICK_W,
                        height:       LANE_ROW_H - 6,
                        background:   isHighlighted ? "#fff" : bar.colour,
                        borderRadius: 2,
                        border:       isHighlighted ? `2px solid ${bar.colour}` : undefined,
                        opacity:      replayState === "future" ? REPLAY_FUTURE_BAR_OPACITY : 1,
                        zIndex:       isHighlighted ? 10 : 2,
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
            const x2   = xOf(bar.endMs)
            const barW  = Math.max(x2 - x1, MIN_BAR_PX)
            if (x2 < 0 || x1 > canvasW) return null

            const durLabel = formatDurationShort(bar.endMs - bar.startMs)
            const displayLabel =
              barW > 80 ? `${durLabel} ${bar.locationLabel}`.trim()
              : barW > 36 ? durLabel
              : ""

            return (
              <Tooltip key={bar.eventId}>
                <TooltipTrigger asChild>
                  <div
                    data-bar="1"
                    role="button"
                    tabIndex={0}
                    aria-label={bar.label}
                    aria-pressed={isHighlighted}
                    onClick={() => setHighlightedEventId(highlightedEventId === bar.eventId ? null : bar.eventId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setHighlightedEventId(highlightedEventId === bar.eventId ? null : bar.eventId)
                      }
                    }}
                    className="absolute cursor-pointer truncate px-1.5 text-[10px] font-medium text-white"
                    style={{
                      top:          top + 4,
                      left:         Math.max(x1, 0),
                      width:        barW,
                      height:       LANE_ROW_H - 8,
                      lineHeight:   `${LANE_ROW_H - 8}px`,
                      background:   isHighlighted
                        ? `repeating-linear-gradient(45deg, #fff, #fff 2px, ${bar.colour} 2px, ${bar.colour} 4px)`
                        : bar.colour,
                      borderRadius: 6,
                      border:       (isHighlighted || replayState === "active")
                        ? `2px solid ${bar.colour}`
                        : undefined,
                      color:        isHighlighted ? bar.colour : "#fff",
                      fontWeight:   (isHighlighted || replayState === "active") ? 700 : 500,
                      filter:       replayState === "active" && !isHighlighted
                        ? "brightness(1.15)"
                        : undefined,
                      opacity:      replayState === "future" ? REPLAY_FUTURE_BAR_OPACITY : 1,
                      zIndex:       isHighlighted ? 10 : 1,
                    }}
                  >
                    {displayLabel}
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
  port:        PortTooltipMeta,
  zone:        ZoneTooltipMeta,
  ais_gap:     AISGapTooltipMeta,
  sts:         STSTooltipMeta,
  discrepancy: DiscrepancyTooltipMeta,
  psc:         PSCTooltipMeta,
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
