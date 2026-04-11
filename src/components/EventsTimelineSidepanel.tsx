import * as React from "react"
import {
  PanelRightOpenIcon,
  PanelRightCloseIcon,
  SearchIcon,
  ClockIcon,
} from "lucide-react"
import { formatDistanceStrict, format, differenceInMilliseconds } from "date-fns"
import { useAppStore } from "@/store/useAppStore"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EVENT_COLOURS, CATEGORY_LABELS_SHORT } from "@/config/constants"
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSubType(subType: string): string {
  return subType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTimestamp(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy, HH:mm 'UTC'")
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
  if (hours > 1) return "text-muted-foreground"
  return "text-muted-foreground/50"
}

function gapBorderClass(ms: number): string {
  const hours = ms / 3_600_000
  if (hours > 24) return "border-amber-500/40"
  if (hours > 1) return "border-border"
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
      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
        {portInfo?.unlocode != null && <span>UNLOCODE: {portInfo.unlocode}</span>}
        {berthInfo?.name != null && <span>Berth: {berthInfo.name}</span>}
      </div>
    )
  }

  if (event.category === "zone") {
    const raw = event.raw as ZoneEvent
    const zoneInfo = raw.zone_information
    if (zoneInfo?.type == null) return null
    return (
      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
        <span>Type: {zoneInfo.type}</span>
      </div>
    )
  }

  if (event.category === "ais_gap") {
    const raw = event.raw as AISGapEvent
    if (raw.gap_duration_hours == null) return null
    return (
      <div className="text-[10px] text-muted-foreground">
        Gap: {raw.gap_duration_hours.toFixed(1)}h
      </div>
    )
  }

  if (event.category === "sts") {
    const raw = event.raw as STSEvent
    return (
      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
        {raw.paired_vessel?.name && <span>Paired: {raw.paired_vessel.name}</span>}
        {!raw.paired_vessel?.name && raw.paired_vessel?.imo && <span>Paired IMO: {raw.paired_vessel.imo}</span>}
        {raw.sts_type && <span>Type: {raw.sts_type}</span>}
      </div>
    )
  }

  if (event.category === "discrepancy") {
    const raw = event.raw as DiscrepancyEvent
    if (raw.has_ended == null) return null
    return (
      <div className="text-[10px] text-muted-foreground">
        {raw.has_ended ? "Ended" : "Ongoing"}
      </div>
    )
  }

  if (event.category === "psc") {
    const raw = event.raw as PSCEvent
    return (
      <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
        {raw.inspection_type && <span>{raw.inspection_type}</span>}
        {raw.no_defects != null && <span>Deficiencies: {raw.no_defects}</span>}
        {raw.detained && <span className="text-destructive font-medium">Detained</span>}
      </div>
    )
  }

  return null
}

// ─── Raw tooltip content ──────────────────────────────────────────────────────

function RawTooltipContent({ event }: { event: ActivityEvent }) {
  return (
    <div className="max-w-[260px] space-y-1 text-[10px]">
      <div className="font-semibold">{event.label || event.subType}</div>
      <div className="text-muted-foreground">{event.id}</div>
      {event.latitude != null && event.longitude != null && (
        <div>{event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</div>
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
}: {
  event: ActivityEvent
  isHighlighted: boolean
  onClick: () => void
}) {
  const colour = EVENT_COLOURS[event.category]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => e.key === "Enter" && onClick()}
          className={[
            "flex cursor-pointer flex-col gap-1.5 rounded-md border p-3 text-xs transition-colors",
            isHighlighted
              ? "border-primary/60 bg-primary/5"
              : "border-border bg-card hover:bg-accent/40",
          ].join(" ")}
          style={isHighlighted ? { borderLeftColor: colour, borderLeftWidth: 3 } : {}}
        >
          {/* Header row */}
          <div className="flex items-center gap-1.5">
            <Badge
              className="shrink-0 px-1.5 py-0 text-[10px] font-semibold leading-5 max-w-[180px] truncate"
              style={{ backgroundColor: colour, color: "#fff", border: "none" }}
            >
              {formatSubType(event.subType)}
            </Badge>
            <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {formatTimestamp(event.startTime)}
            </span>
          </div>

          {/* Label */}
          {event.label && (
            <div className="font-medium leading-tight">{event.label}</div>
          )}

          {/* Duration */}
          {event.endTime && (
            <div className="text-[10px] text-muted-foreground">
              {formatDuration(event.startTime, event.endTime)}
            </div>
          )}

          {/* Coordinates */}
          {event.latitude != null && event.longitude != null && (
            <div className="text-[10px] tabular-nums text-muted-foreground">
              {event.latitude.toFixed(3)}, {event.longitude.toFixed(3)}
            </div>
          )}

          {/* Category metadata */}
          <EventMeta event={event} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" className="p-2">
        <RawTooltipContent event={event} />
      </TooltipContent>
    </Tooltip>
  )
})

// ─── Duration connector ───────────────────────────────────────────────────────

function DurationConnector({ gapMs }: { gapMs: number }) {
  if (gapMs <= 0) return null
  return (
    <div className={`flex items-center gap-1.5 py-0.5 pl-1 text-[10px] ${gapColorClass(gapMs)}`}>
      <div className={`ml-1.5 h-4 w-px border-l border-dashed ${gapBorderClass(gapMs)}`} />
      <span className="tabular-nums">{formatGapDuration(gapMs)}</span>
    </div>
  )
}

// ─── Date section ─────────────────────────────────────────────────────────────

function DateSection({
  dateLabel,
  events,
  highlightedEventId,
  onEventClick,
}: {
  dateLabel: string
  events: ActivityEvent[]
  highlightedEventId: string | null
  onEventClick: (id: string) => void
}) {
  const [open, setOpen] = React.useState(true)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="sticky top-0 z-10 flex items-center gap-1 bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        {dateLabel}
        <span className="ml-auto font-normal normal-case">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          {events.map((ev, idx) => {
            const nextEv = events[idx + 1]
            const gapMs = nextEv
              ? differenceInMilliseconds(new Date(ev.startTime), new Date(nextEv.startTime))
              : 0

            return (
              <React.Fragment key={ev.id}>
                <EventCard
                  event={ev}
                  isHighlighted={highlightedEventId === ev.id}
                  onClick={() => onEventClick(ev.id)}
                />
                {nextEv && <DurationConnector gapMs={gapMs} />}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Category chip ────────────────────────────────────────────────────────────

function CategoryChip({
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
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
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

const ALL_CATEGORIES: EventCategory[] = ["port", "zone", "ais_gap", "sts", "discrepancy", "psc"]

export function EventsTimelineSidepanel() {
  const {
    events,
    filters,
    toggleFilter,
    highlightedEventId,
    setHighlightedEventId,
    fetchKey,
    timelinePanelOpen,
    setTimelinePanelOpen,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = React.useState("")

  // Apply global category filters + local text search
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

  // Group by UTC date string (YYYY-MM-DD)
  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, ActivityEvent[]>()
    for (const ev of filteredEvents) {
      const dateKey = ev.startTime.slice(0, 10) // "YYYY-MM-DD"
      const label = format(new Date(dateKey + "T00:00:00Z"), "d MMM yyyy")
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(ev)
    }
    return Array.from(map.entries()) // already in descending order
  }, [filteredEvents])

  function handleEventClick(id: string) {
    setHighlightedEventId(highlightedEventId === id ? null : id)
  }

  // ── Collapsed state ────────────────────────────────────────────────────────
  if (!timelinePanelOpen) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center border-l border-border bg-background py-3">
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
      </aside>
    )
  }

  // ── Expanded state ─────────────────────────────────────────────────────────
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs font-semibold">Events Timeline</span>
        {filteredEvents.length > 0 && (
          <span className="ml-1 text-[10px] text-muted-foreground">
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
      <div className="shrink-0 px-3 pt-2 pb-1">
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

      {/* Category chips */}
      <div className="flex shrink-0 flex-wrap gap-1 px-3 pb-2">
        {ALL_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            category={cat}
            active={filters[cat]}
            onToggle={() => toggleFilter(cat)}
          />
        ))}
      </div>

      <Separator />

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
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
            />
          ))
        )}
      </div>
    </aside>
  )
}
