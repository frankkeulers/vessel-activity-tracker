import { create } from "zustand"
import { subDays, startOfDay } from "date-fns"
import type { VesselSearchResult, FilterState, EventCategory, ActivityEvent } from "@/types"
import { getApiKey as readApiKey, setApiKey as writeApiKey } from "@/lib/api"

interface DateRange {
  from: Date
  to: Date
}

interface AppState {
  // API key
  apiKey: string
  saveApiKey: (key: string) => void

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

export const useAppStore = create<AppState>((set) => ({
  apiKey: readApiKey(),
  saveApiKey: (key) => {
    writeApiKey(key)
    set({ apiKey: key })
  },

  selectedVessel: null,
  setSelectedVessel: (vessel) => set({ selectedVessel: vessel }),

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
  triggerFetch: () => set((s) => ({ fetchKey: s.fetchKey + 1 })),

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
}))
