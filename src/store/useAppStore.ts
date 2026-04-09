import { create } from "zustand"
import { subDays, startOfDay } from "date-fns"
import type { VesselSearchResult, FilterState, EventCategory, ActivityEvent } from "@/types"

interface DateRange {
  from: Date
  to: Date
}

interface AppState {
  // Vessel selection
  selectedVessel: VesselSearchResult | null
  setSelectedVessel: (vessel: VesselSearchResult | null) => void

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

  // All resolved events (set by data layer after fetching)
  events: ActivityEvent[]
  setEvents: (events: ActivityEvent[]) => void
}

const DEFAULT_FILTERS: FilterState = {
  port: true,
  zone: true,
  ais_gap: true,
  sts: true,
  discrepancy: true,
  psc: true,
}

export const useAppStore = create<AppState>((set) => ({
  selectedVessel: null,
  setSelectedVessel: (vessel) => set({ selectedVessel: vessel }),

  dateRange: {
    from: startOfDay(subDays(new Date(), 30)),
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

  events: [],
  setEvents: (events) => set({ events }),
}))
