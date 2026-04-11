import * as React from "react"
import { SearchIcon, XIcon, LoaderCircleIcon, FilterIcon } from "lucide-react"
import { useVesselSearch } from "@/lib/hooks"
import { useAppStore } from "@/store/useAppStore"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { VesselSearchResult } from "@/types"

export function VesselSearch() {
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const { selectedVessel, setSelectedVessel, vesselStatusFilter, toggleVesselStatusFilter } = useAppStore()

  const { data, isFetching } = useVesselSearch(query, vesselStatusFilter)
  const results = data?.data ?? []

  function handleSelect(vessel: VesselSearchResult) {
    setSelectedVessel(vessel)
    setQuery(vessel.name)
    setOpen(false)
  }

  function handleClear() {
    setSelectedVessel(null)
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false)
    }
    if (e.key === "ArrowDown" && open) {
      e.preventDefault()
      const first = listRef.current?.querySelector<HTMLElement>("[role='option']")
      first?.focus()
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLLIElement>, vessel: VesselSearchResult) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleSelect(vessel)
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = (e.currentTarget.nextElementSibling as HTMLElement | null)
      next?.focus()
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = (e.currentTarget.previousElementSibling as HTMLElement | null)
      if (prev) {
        prev.focus()
      } else {
        inputRef.current?.focus()
      }
    }
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div className="flex flex-col gap-2">
      {/* Search input with dropdown container */}
      <div className="relative">
        <div className="relative flex items-center">
          {isFetching ? (
            <LoaderCircleIcon className="absolute left-2.5 size-4 animate-spin text-muted-foreground" />
          ) : (
            <SearchIcon className="absolute left-2.5 size-4 text-muted-foreground" />
          )}
          <Input
            ref={inputRef}
            value={query}
            placeholder="Search vessel name, IMO, MMSI…"
            className="pl-8 pr-8"
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              if (selectedVessel && e.target.value !== selectedVessel.name) {
                setSelectedVessel(null)
              }
            }}
            onFocus={() => setOpen(true)}
            onBlur={(e) => {
              if (!listRef.current?.contains(e.relatedTarget)) {
                setOpen(false)
              }
            }}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 flex items-center text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        {/* Dropdown - positioned below search input */}
        {showDropdown && (
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Vessel search results"
            className="absolute z-50 mt-1 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md max-h-72"
          >
            {results.length === 0 && !isFetching && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No vessels found
              </li>
            )}
            {results.map((vessel) => (
              <li
                key={vessel.imo}
                role="option"
                tabIndex={0}
                aria-selected={selectedVessel?.imo === vessel.imo}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 px-3 py-2 text-sm outline-none hover:bg-accent focus:bg-accent",
                  selectedVessel?.imo === vessel.imo && "bg-accent",
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(vessel)
                }}
                onKeyDown={(e) => handleListKeyDown(e, vessel)}
              >
                {/* Vessel name */}
                <span className="truncate font-medium leading-snug">{vessel.name}</span>

                {/* Identifiers row */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">IMO {vessel.imo}</span>
                  {vessel.mmsi && <span className="font-mono">MMSI {vessel.mmsi}</span>}
                </div>

                {/* Type, flag, and status row */}
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                  {vessel.vessel_type && <span>{vessel.vessel_type}</span>}
                  {vessel.vessel_type && vessel.flag && <span>·</span>}
                  {vessel.flag && <span>{vessel.flag}</span>}
                  {(vessel.vessel_type || vessel.flag) && vessel.vessel_status && <span>·</span>}
                  {vessel.vessel_status && <span>{vessel.vessel_status}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Status filter toggle */}
      <button
        type="button"
        onClick={toggleVesselStatusFilter}
        className={cn(
          "flex items-center gap-1.5 self-start rounded-md border px-2 py-1 text-xs transition-colors",
          vesselStatusFilter
            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <FilterIcon className="size-3" />
        {vesselStatusFilter ? `Status: ${vesselStatusFilter}` : "All vessel statuses"}
      </button>
    </div>
  )
}
