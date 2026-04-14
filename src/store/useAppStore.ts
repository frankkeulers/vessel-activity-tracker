import { create } from "zustand"
import { subDays, startOfDay } from "date-fns"
import type { VesselSearchResult, FilterState, EventCategory, ActivityEvent } from "@/types"
import { REPLAY_FULL_PLAY_SECS, REPLAY_TICK_MS } from "@/config/constants"

export type GanttGroupMode = "by-event-type" | "by-location"

// ─── Module-scoped replay timer ─────────────────────────────────────────────
// Lives outside the store so the tick closure always reads the latest state
// via get() without stale-closure issues.

let _replayTimer: ReturnType<typeof setInterval> | null = null

function _clearTimer() {
  if (_replayTimer !== null) {
    clearInterval(_replayTimer)
    _replayTimer = null
  }
}

interface DateRange {
  from: Date
  to: Date
}

interface AppState {
  // Vessel selection
  selectedVessel: VesselSearchResult | null
  setSelectedVessel: (vessel: VesselSearchResult | null) => void

  // Vessel search filter - status filter for vessel_type_label_incl
  vesselStatusFilter: string | null
  setVesselStatusFilter: (status: string | null) => void
  toggleVesselStatusFilter: () => void

  // Date range
  dateRange: DateRange
  setDateRange: (range: DateRange) => void

  // Fetch trigger — bumped to re-run queries
  fetchKey: number
  triggerFetch: () => void

  // Filters per category
  filters: FilterState
  toggleFilter: (category: EventCategory) => void

  // Highlighted event (for map ↔ Gantt cross-linking)
  highlightedEventId: string | null
  setHighlightedEventId: (id: string | null) => void

  // Events timeline sidepanel open/collapsed state
  timelinePanelOpen: boolean
  setTimelinePanelOpen: (open: boolean) => void

  // All resolved events (set by data layer after fetching)
  events: ActivityEvent[]
  setEvents: (events: ActivityEvent[]) => void

  // Gantt-specific events (with paired ranges for timeline view)
  ganttEvents: ActivityEvent[]
  setGanttEvents: (events: ActivityEvent[]) => void

  // Gantt grouping mode
  ganttGroupMode: GanttGroupMode
  setGanttGroupMode: (mode: GanttGroupMode) => void

  // Vessel Replay
  replayAt: Date | null       // current cursor time; null = replay mode off
  isReplaying: boolean        // timer is actively advancing the cursor
  replaySpeed: number         // multiplier relative to base rate (0.5 | 1 | 2 | 5 | 10)
  setReplayAt: (at: Date | null) => void
  startReplay: () => void
  pauseReplay: () => void
  resetReplay: () => void     // clears cursor + stops timer
  setReplaySpeed: (speed: number) => void
}

const DEFAULT_FILTERS: FilterState = {
  port: true,
  zone: true,
  ais_gap: true,
  sts: true,
  discrepancy: true,
  psc: true,
}

const DEFAULT_VESSEL_STATUS_FILTER = "In Service/Commission"

export const useAppStore = create<AppState>((set, get) => ({
  selectedVessel: null,
  setSelectedVessel: (vessel) => {
    _clearTimer()
    set({ selectedVessel: vessel, replayAt: null, isReplaying: false })
  },

  vesselStatusFilter: DEFAULT_VESSEL_STATUS_FILTER,
  setVesselStatusFilter: (status) => set({ vesselStatusFilter: status }),
  toggleVesselStatusFilter: () =>
    set((s) => ({
      vesselStatusFilter: s.vesselStatusFilter ? null : DEFAULT_VESSEL_STATUS_FILTER,
    })),

  dateRange: {
    from: startOfDay(subDays(new Date(), 7)),
    to: new Date(),
  },
  setDateRange: (range) => set({ dateRange: range }),

  fetchKey: 0,
  triggerFetch: () => {
    _clearTimer()
    set((s) => ({ fetchKey: s.fetchKey + 1, replayAt: null, isReplaying: false }))
  },

  filters: DEFAULT_FILTERS,
  toggleFilter: (category) =>
    set((s) => ({
      filters: { ...s.filters, [category]: !s.filters[category] },
    })),

  highlightedEventId: null,
  setHighlightedEventId: (id) => set({ highlightedEventId: id }),

  timelinePanelOpen: true,
  setTimelinePanelOpen: (open) => set({ timelinePanelOpen: open }),

  events: [],
  setEvents: (events) => set({ events }),

  ganttEvents: [],
  setGanttEvents: (events) => set({ ganttEvents: events }),

  ganttGroupMode: "by-event-type",
  setGanttGroupMode: (mode) => set({ ganttGroupMode: mode }),

  // ─── Replay ──────────────────────────────────────────────────────────────

  replayAt: null,
  isReplaying: false,
  replaySpeed: 1,

  setReplayAt: (at) => set({ replayAt: at }),

  startReplay: () => {
    const { dateRange, replayAt } = get()
    // If cursor is null or already at the end, restart from the beginning
    const at =
      replayAt === null || replayAt.getTime() >= dateRange.to.getTime()
        ? dateRange.from
        : replayAt
    set({ isReplaying: true, replayAt: at })
    _clearTimer()
    _replayTimer = setInterval(() => {
      const s = get()
      if (!s.isReplaying || s.replayAt === null) {
        _clearTimer()
        return
      }
      const rangeMs = s.dateRange.to.getTime() - s.dateRange.from.getTime()
      const baseRate = rangeMs / REPLAY_FULL_PLAY_SECS        // ms of vessel-time per wall-clock second at 1×
      const advanceMs = baseRate * s.replaySpeed * (REPLAY_TICK_MS / 1000)
      const newMs = Math.min(s.replayAt.getTime() + advanceMs, s.dateRange.to.getTime())
      if (newMs >= s.dateRange.to.getTime()) {
        set({ replayAt: new Date(newMs), isReplaying: false })
        _clearTimer()
      } else {
        set({ replayAt: new Date(newMs) })
      }
    }, REPLAY_TICK_MS)
  },

  pauseReplay: () => {
    _clearTimer()
    set({ isReplaying: false })
  },

  resetReplay: () => {
    _clearTimer()
    set({ replayAt: null, isReplaying: false })
  },

  setReplaySpeed: (speed) => set({ replaySpeed: speed }),
}))
