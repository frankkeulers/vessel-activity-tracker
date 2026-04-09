import * as React from "react"
import { useAppStore } from "@/store/useAppStore"
import type { ActivityEvent, EventCategory } from "@/types"

// ─── Constants ────────────────────────────────────────────────────────────────

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

    const rowId = `cat::${category}`
    rows.push({ id: rowId, label: CATEGORY_LABELS[category], category })

    for (const ev of catEvents) {
      const startMs = new Date(ev.startTime).getTime()
      if (isNaN(startMs)) continue
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
        eventId: ev.id,
        rowId,
        label: ev.label || ev.subType,
        startMs,
        endMs: isPoint ? null : validRawEnd,
        colour: CATEGORY_COLOURS[category],
        tooltip,
      })
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
  const { events, filters, dateRange, highlightedEventId, setHighlightedEventId } = useAppStore()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [canvasW, setCanvasW] = React.useState(800)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setCanvasW(Math.max(entry.contentRect.width - SIDEBAR_W, 1))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [viewStart, setViewStart] = React.useState(() => dateRange.from.getTime())
  const [viewEnd, setViewEnd] = React.useState(() => dateRange.to.getTime())

  const { rows, bars, minMs, maxMs } = React.useMemo(
    () => buildRowsAndBars(events, filters),
    [events, filters],
  )

  // Auto-fit view to actual event extents whenever events change
  React.useEffect(() => {
    if (rows.length === 0 || minMs === Infinity) {
      setViewStart(dateRange.from.getTime())
      setViewEnd(dateRange.to.getTime())
      return
    }
    const pad = (maxMs - minMs) * 0.04 || 3_600_000
    setViewStart(minMs - pad)
    setViewEnd(maxMs + pad)
  }, [rows.length, minMs, maxMs]) // eslint-disable-line react-hooks/exhaustive-deps

  const spanMs = viewEnd - viewStart
  const msPerPx = spanMs / Math.max(canvasW, 1)

  // Wheel zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cursorX = e.clientX - rect.left - SIDEBAR_W
    const cursorMs = viewStart + cursorX * msPerPx
    const factor = e.deltaY > 0 ? 1.3 : 1 / 1.3
    const newSpan = Math.min(Math.max(spanMs * factor, 60_000), 365 * 86_400_000)
    const ratio = cursorX / Math.max(canvasW, 1)
    setViewStart(Math.round(cursorMs - ratio * newSpan))
    setViewEnd(Math.round(cursorMs + (1 - ratio) * newSpan))
  }

  // Drag pan
  const dragRef = React.useRef<{ startX: number; startViewStart: number } | null>(null)
  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).dataset.bar) return
    dragRef.current = { startX: e.clientX, startViewStart: viewStart }
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const delta = -dx * msPerPx
    setViewStart(dragRef.current.startViewStart + delta)
    setViewEnd(dragRef.current.startViewStart + delta + spanMs)
  }
  function handleMouseUp() { dragRef.current = null }

  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Fetch data to see the timeline
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No events match the active filters
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
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
      <div className="flex flex-1 overflow-auto">
        {/* Sidebar */}
        <div className="shrink-0 border-r border-border" style={{ width: SIDEBAR_W, minHeight: totalH }}>
          {rows.map((row) => (
            <div
              key={row.id}
              title={row.label}
              className="flex items-center truncate border-b border-border/30 text-xs"
              style={{
                height: ROW_H,
                paddingLeft: 8,
                fontWeight: 600,
                color: CATEGORY_COLOURS[row.category],
                borderLeft: `3px solid ${CATEGORY_COLOURS[row.category]}`,
                background: `${CATEGORY_COLOURS[row.category]}12`,
              }}
            >
              {row.label}
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="relative flex-1" style={{ minHeight: totalH }}>
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
                background: `${CATEGORY_COLOURS[row.category]}08`,
              }}
            />
          ))}

          {/* Bars and tick marks */}
          {bars.map((bar) => {
            const rowIndex = rows.findIndex((r) => r.id === bar.rowId)
            if (rowIndex === -1) return null
            const x1 = xOf(bar.startMs)
            const isHighlighted = highlightedEventId === bar.eventId
            const top = rowIndex * ROW_H

            if (bar.endMs === null) {
              // Point event → render as a vertical tick
              if (x1 < -TICK_W || x1 > canvasW + TICK_W) return null
              return (
                <div
                  key={bar.eventId}
                  data-bar="1"
                  title={bar.tooltip}
                  onClick={() => setHighlightedEventId(highlightedEventId === bar.eventId ? null : bar.eventId)}
                  className="absolute cursor-pointer"
                  style={{
                    top: top + 3,
                    left: x1 - Math.floor(TICK_W / 2),
                    width: TICK_W,
                    height: ROW_H - 6,
                    background: bar.colour,
                    borderRadius: 1,
                    opacity: isHighlighted ? 1 : 0.9,
                    boxShadow: isHighlighted ? `0 0 0 2px white, 0 0 0 3px ${bar.colour}` : undefined,
                    zIndex: isHighlighted ? 10 : 2,
                  }}
                />
              )
            }

            // Duration bar
            const x2 = xOf(bar.endMs)
            const barW = Math.max(x2 - x1, MIN_BAR_PX)
            if (x2 < 0 || x1 > canvasW) return null
            return (
              <div
                key={bar.eventId}
                data-bar="1"
                title={bar.tooltip}
                onClick={() => setHighlightedEventId(highlightedEventId === bar.eventId ? null : bar.eventId)}
                className="absolute cursor-pointer truncate px-1 text-[10px] font-medium text-white"
                style={{
                  top: top + 4,
                  left: Math.max(x1, 0),
                  width: barW,
                  height: ROW_H - 8,
                  lineHeight: `${ROW_H - 8}px`,
                  background: bar.colour,
                  borderRadius: 3,
                  opacity: isHighlighted ? 1 : 0.82,
                  boxShadow: isHighlighted ? `0 0 0 2px white, 0 0 0 3px ${bar.colour}` : undefined,
                  zIndex: isHighlighted ? 10 : 1,
                }}
              >
                {barW > 40 ? bar.label : ""}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
