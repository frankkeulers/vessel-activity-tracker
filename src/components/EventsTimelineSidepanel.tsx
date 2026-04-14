import * as React from "react"
import {
  PanelRightOpenIcon,
  PanelRightCloseIcon,
  SearchIcon,
  ClockIcon,
  ChevronRightIcon,
} from "lucide-react"
import { formatDistanceStrict, format, differenceInMilliseconds } from "date-fns"
import { useAppStore } from "@/store/useAppStore"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EVENT_COLOURS, CATEGORY_LABELS_SHORT } from "@/config/constants"
import { computeEventVisibility } from "@/lib/replay"
import type { EventVisibility } from "@/lib/replay"
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSubType(subType: string): string {
  return subType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Shows time + short date — year is already in the section header
function formatTimestamp(iso: string): string {
  try {
    return format(new Date(iso), "HH:mm · d MMM")
  } catch {
    return iso
  }
}

function formatDuration(startIso: string, endIso: string): string {
  try {
    return formatDistanceStrict(new Date(endIso), new Date(startIso))
  } catch {
    return ""
  }
}

function formatGapDuration(ms: number): string {
  if (ms <= 0) return ""
  const totalSecs = Math.floor(ms / 1000)
  const days = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m`
  return `${totalSecs}s`
}

function gapColorClass(ms: number): string {
  const hours = ms / 3_600_000
  if (hours > 24) return "text-amber-500"
  if (hours > 1) return "text-muted-foreground/50"
  return "text-muted-foreground/35"
}

function gapBorderClass(ms: number): string {
  const hours = ms / 3_600_000
  if (hours > 24) return "border-amber-500/40"
  return "border-border/40"
}

// ─── Category-specific metadata ──────────────────────────────────────────────

function EventMeta({ event }: { event: ActivityEvent }) {
  if (event.category === "port") {
    const raw = event.raw as PortCallEvent
    const portInfo = raw.port_information
    const berthInfo = raw.berth_information
    const hasContent = portInfo?.unlocode != null || berthInfo?.name != null
    if (!hasContent) return null
    return (
      <div className="mt-1.5 flex flex-col gap-0.5 text-[10px]">
        {portInfo?.unlocode != null && (
          <span>
            <span className="text-muted-foreground/50">UNLOCODE </span>
            <span className="text-muted-foreground">{portInfo.unlocode}</span>
          </span>
        )}
        {berthInfo?.name != null && (
          <span>
            <span className="text-muted-foreground/50">Berth </span>
            <span className="text-muted-foreground">{berthInfo.name}</span>
          </span>
        )}
      </div>
    )
  }

  if (event.category === "zone") {
    const raw = event.raw as ZoneEvent
    const zoneInfo = raw.zone_information
    if (zoneInfo?.type == null) return null
    return (
      <div className="mt-1.5 text-[10px]">
        <span className="text-muted-foreground/50">Type </span>
        <span className="text-muted-foreground">{zoneInfo.type}</span>
      </div>
    )
  }

  if (event.category === "ais_gap") {
    const raw = event.raw as AISGapEvent
    if (raw.gap_duration_hours == null) return null
    return (
      <div className="mt-1.5 text-[10px]">
        <span className="text-muted-foreground/50">Gap </span>
        <span className="text-muted-foreground">{raw.gap_duration_hours.toFixed(1)}h</span>
      </div>
    )
  }

  if (event.category === "sts") {
    const raw = event.raw as STSEvent
    const hasMeta = raw.paired_vessel?.name || raw.paired_vessel?.imo || raw.sts_type
    if (!hasMeta) return null
    return (
      <div className="mt-1.5 flex flex-col gap-0.5 text-[10px]">
        {raw.paired_vessel?.name && (
          <span>
            <span className="text-muted-foreground/50">Paired </span>
            <span className="text-muted-foreground">{raw.paired_vessel.name}</span>
          </span>
        )}
        {!raw.paired_vessel?.name && raw.paired_vessel?.imo && (
          <span>
            <span className="text-muted-foreground/50">IMO </span>
            <span className="text-muted-foreground">{raw.paired_vessel.imo}</span>
          </span>
        )}
        {raw.sts_type && (
          <span>
            <span className="text-muted-foreground/50">Type </span>
            <span className="text-muted-foreground">{raw.sts_type}</span>
          </span>
        )}
      </div>
    )
  }

  if (event.category === "discrepancy") {
    const raw = event.raw as DiscrepancyEvent
    if (raw.has_ended == null) return null
    return (
      <div className="mt-1.5 text-[10px]">
        {raw.has_ended
          ? <span className="text-muted-foreground">Resolved</span>
          : <span className="text-amber-500 font-medium">Ongoing</span>
        }
      </div>
    )
  }

  if (event.category === "psc") {
    const raw = event.raw as PSCEvent
    return (
      <div className="mt-1.5 flex flex-col gap-0.5 text-[10px]">
        {raw.inspection_type && (
          <span className="text-muted-foreground">{raw.inspection_type}</span>
        )}
        {raw.no_defects != null && (
          <span>
            <span className="text-muted-foreground/50">Deficiencies </span>
            <span className="text-muted-foreground">{raw.no_defects}</span>
          </span>
        )}
        {raw.detained && (
          <span className="font-semibold text-destructive">Detained</span>
        )}
      </div>
    )
  }

  return null
}

// ─── Raw tooltip content ──────────────────────────────────────────────────────

function RawTooltipContent({ event }: { event: ActivityEvent }) {
  return (
    <div className="p-3 max-w-[260px] space-y-1 text-[10px]">
      <div className="font-semibold">{event.label || event.subType}</div>
      <div className="text-muted-foreground font-mono">{event.id}</div>
      {event.latitude != null && event.longitude != null && (
        <div className="tabular-nums">{event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</div>
      )}
      {event.endTime && (
        <div>Duration: {formatDuration(event.startTime, event.endTime)}</div>
      )}
    </div>
  )
}

// ─── Single event card ────────────────────────────────────────────────────────

const EventCard = React.memo(function EventCard({
  event,
  isHighlighted,
  onClick,
  visibility,
}: {
  event: ActivityEvent
  isHighlighted: boolean
  onClick: () => void
  visibility?: EventVisibility
}) {
  const colour = EVENT_COLOURS[event.category]
  const isDimmed = visibility === "dimmed"
  const isActive = visibility === "active"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={isDimmed ? -1 : 0}
          onClick={isDimmed ? undefined : onClick}
          onKeyDown={(e) => !isDimmed && e.key === "Enter" && onClick()}
          className={[
            "rounded-lg px-3 py-2.5 transition-colors",
            isDimmed
              ? "pointer-events-none cursor-default opacity-40 italic"
              : "cursor-pointer",
            isHighlighted
              ? "bg-primary/5"
              : isDimmed ? "" : "bg-muted/30 hover:bg-muted/60",
          ].join(" ")}
          style={
            isHighlighted
              ? { borderLeft: `3px solid ${colour}`, paddingLeft: "9px" }
              : {}
          }
        >
          {/* Row 1 — subtype (colored) + active badge + timestamp */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[10px] font-bold uppercase tracking-widest leading-none"
                style={{ color: colour }}
              >
                {formatSubType(event.subType)}
              </span>
              {isActive && (
                <span className="animate-pulse rounded-sm bg-primary/15 px-1 py-px text-[9px] font-bold uppercase tracking-widest text-primary">
                  Active
                </span>
              )}
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {formatTimestamp(event.startTime)}
            </span>
          </div>

          {/* Row 2 — label (primary) */}
          {event.label && (
            <div className="mt-1 text-[13px] font-semibold leading-snug text-foreground">
              {event.label}
            </div>
          )}

          {/* Row 3 — duration + coordinates */}
          {(event.endTime || event.latitude != null) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {event.endTime && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(event.startTime, event.endTime)}
                </span>
              )}
              {event.latitude != null && event.longitude != null && (
                <span className="text-[10px] tabular-nums text-muted-foreground/55">
                  {event.latitude.toFixed(3)}, {event.longitude.toFixed(3)}
                </span>
              )}
            </div>
          )}

          {/* Row 4 — category-specific metadata */}
          <EventMeta event={event} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs p-0 bg-background border border-border shadow-lg z-9999 text-foreground">
        <RawTooltipContent event={event} />
      </TooltipContent>
    </Tooltip>
  )
})

// ─── Date section ─────────────────────────────────────────────────────────────

function DateSection({
  dateLabel,
  events,
  highlightedEventId,
  onEventClick,
  eventVisibility,
  forceExpand,
}: {
  dateLabel: string
  events: ActivityEvent[]
  highlightedEventId: string | null
  onEventClick: (id: string) => void
  eventVisibility?: Map<string, EventVisibility>
  forceExpand?: boolean
}) {
  const [open, setOpen] = React.useState(true)

  // Auto-expand when replay cursor enters this date group (rising-edge only)
  const prevForceRef = React.useRef(false)
  React.useEffect(() => {
    if (forceExpand && !prevForceRef.current) {
      setOpen(true)
    }
    prevForceRef.current = forceExpand ?? false
  }, [forceExpand])

  return (
    <div>
      {/* Sticky date header — horizontal-rule style */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="sticky top-0 z-10 flex w-full items-center gap-2 bg-background/95 px-4 py-2.5 text-left backdrop-blur-sm"
      >
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {dateLabel}
        </span>
        <div className="mx-1 h-px flex-1 bg-border/50" />
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
          {events.length}
        </span>
        <ChevronRightIcon
          className={`size-3 shrink-0 text-muted-foreground/40 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open && (
        <div className="flex flex-col px-4 pb-3 pt-1">
          {events.map((ev, idx) => {
            const nextEv = events[idx + 1]
            const isLast = idx === events.length - 1
            const gapMs = nextEv
              ? Math.max(
                  0,
                  differenceInMilliseconds(
                    new Date(ev.startTime),
                    new Date(nextEv.endTime ?? nextEv.startTime),
                  ),
                )
              : 0
            const colour = EVENT_COLOURS[ev.category]
            const isHighlighted = highlightedEventId === ev.id

            return (
              <React.Fragment key={ev.id}>
                {/* ── Event row ── */}
                <div className="flex gap-3">
                  {/* Left column: dot + spine segment */}
                  <div className="flex w-4 shrink-0 flex-col items-center pt-[11px]">
                    <div
                      className={[
                        "z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background transition-shadow",
                        isHighlighted
                          ? "shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                          : "",
                        eventVisibility?.get(ev.id) === "active"
                          ? "animate-pulse"
                          : "",
                      ].join(" ")}
                      style={{ backgroundColor: colour }}
                    />
                    {!isLast && (
                      <div className="mt-1.5 w-px flex-1 bg-border/40" />
                    )}
                  </div>

                  {/* Right column: card */}
                  <div className="flex-1 pb-2" data-event-id={ev.id}>
                    <EventCard
                      event={ev}
                      isHighlighted={isHighlighted}
                      onClick={() => onEventClick(ev.id)}
                      visibility={eventVisibility?.get(ev.id)}
                    />
                  </div>
                </div>

                {/* ── Gap connector ── */}
                {nextEv && gapMs > 0 && (
                  <div className="flex gap-3 py-0.5">
                    <div className="flex w-4 shrink-0 justify-center">
                      <div
                        className={`w-px border-l border-dashed ${gapBorderClass(gapMs)}`}
                      />
                    </div>
                    <span
                      className={`self-center text-[10px] tabular-nums ${gapColorClass(gapMs)}`}
                    >
                      {formatGapDuration(gapMs)}
                    </span>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Category chip ────────────────────────────────────────────────────────────

export function CategoryChip({
  category,
  active,
  onToggle,
}: {
  category: EventCategory
  active: boolean
  onToggle: () => void
}) {
  const colour = EVENT_COLOURS[category]
  return (
    <button
      onClick={onToggle}
      className={[
        "cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
        active ? "text-white" : "bg-background text-muted-foreground",
      ].join(" ")}
      style={
        active
          ? { backgroundColor: colour, borderColor: colour }
          : { borderColor: colour }
      }
    >
      {CATEGORY_LABELS_SHORT[category]}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const ALL_CATEGORIES: EventCategory[] = ["port", "zone", "ais_gap", "sts", "discrepancy", "psc"]

export function EventsTimelineSidepanel() {
  const {
    events,
    filters,
    highlightedEventId,
    setHighlightedEventId,
    fetchKey,
    timelinePanelOpen,
    setTimelinePanelOpen,
    replayAt,
    isReplaying,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const lastScrollTimeRef = React.useRef(0)
  const [enteredDates, setEnteredDates] = React.useState<Set<string>>(new Set())

  const filteredEvents = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return events
      .filter((ev) => filters[ev.category])
      .filter(
        (ev) =>
          !q ||
          ev.label.toLowerCase().includes(q) ||
          ev.subType.toLowerCase().includes(q),
      )
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [events, filters, searchQuery])

  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, ActivityEvent[]>()
    for (const ev of filteredEvents) {
      const dateKey = ev.startTime.slice(0, 10)
      const label = format(new Date(dateKey + "T00:00:00Z"), "d MMM yyyy")
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(ev)
    }
    return Array.from(map.entries())
  }, [filteredEvents])

  // ── Replay visibility map ──────────────────────────────────────────────────
  const eventVisibility = React.useMemo(
    () => computeEventVisibility(filteredEvents, replayAt),
    [filteredEvents, replayAt],
  )

  // ── Auto-expand date sections when playback enters them ────────────────────
  React.useEffect(() => {
    if (replayAt === null) {
      setEnteredDates(new Set())
      return
    }
    const cursorMs = replayAt.getTime()
    setEnteredDates((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const [dateLabel, dateEvents] of groupedByDate) {
        if (next.has(dateLabel)) continue
        const entered = dateEvents.some(
          (ev) => new Date(ev.startTime).getTime() <= cursorMs,
        )
        if (entered) {
          next.add(dateLabel)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [replayAt, groupedByDate])

  // ── Auto-scroll to most recently revealed event (1 Hz, replay only) ────────
  React.useEffect(() => {
    if (!isReplaying || replayAt === null) return
    const now = Date.now()
    if (now - lastScrollTimeRef.current < 1000) return
    lastScrollTimeRef.current = now

    // filteredEvents is descending; first entry with startTime <= cursor is the latest revealed
    const cursorMs = replayAt.getTime()
    const revealedEvent = filteredEvents.find(
      (ev) => new Date(ev.startTime).getTime() <= cursorMs,
    )
    if (!revealedEvent || !scrollRef.current) return
    const el = scrollRef.current.querySelector(
      `[data-event-id="${revealedEvent.id}"]`,
    )
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [replayAt, isReplaying, filteredEvents])

  function handleEventClick(id: string) {
    setHighlightedEventId(highlightedEventId === id ? null : id)
  }

  // ── Collapsed state ────────────────────────────────────────────────────────
  const hasActiveFilter = Object.values(filters).some((v) => !v)

  if (!timelinePanelOpen) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-l border-border bg-background py-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTimelinePanelOpen(true)}
            aria-expanded={false}
            aria-label="Open events timeline"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <PanelRightOpenIcon className="size-5" />
            <span
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Timeline
            </span>
          </button>
          {hasActiveFilter && (
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-amber-500" />
          )}
        </div>
      </aside>
    )
  }

  // ── Expanded state ─────────────────────────────────────────────────────────
  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-background">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-semibold">Events Timeline</span>
        {filteredEvents.length > 0 && (
          <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">
            ({filteredEvents.length})
          </span>
        )}
        <button
          type="button"
          onClick={() => setTimelinePanelOpen(false)}
          aria-expanded={true}
          aria-label="Collapse events timeline"
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <PanelRightCloseIcon className="size-4" />
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 pb-1 pt-2">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events…"
            className="h-7 pl-6 text-xs"
          />
        </div>
      </div>

      <Separator />

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {fetchKey === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
            <ClockIcon className="size-8 opacity-30" />
            <p>Select a vessel and fetch data</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
            <ClockIcon className="size-8 opacity-30" />
            <p>No events match the current filters</p>
          </div>
        ) : (
          groupedByDate.map(([dateLabel, dateEvents]) => (
            <DateSection
              key={dateLabel}
              dateLabel={dateLabel}
              events={dateEvents}
              highlightedEventId={highlightedEventId}
              onEventClick={handleEventClick}
              eventVisibility={eventVisibility}
              forceExpand={enteredDates.has(dateLabel)}
            />
          ))
        )}
      </div>
    </aside>
  )
}
