import * as React from "react"
import { SearchIcon, XIcon, LoaderCircleIcon, FilterIcon, AlertTriangleIcon, KeyRoundIcon } from "lucide-react"
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
  const { selectedVessel, setSelectedVessel, vesselStatusFilter, toggleVesselStatusFilter, triggerFetch, apiKey } = useAppStore()

  const hasApiKey = Boolean(apiKey.trim())
  
  const { data, isFetching, error } = useVesselSearch(query, vesselStatusFilter)
  const results = data?.data ?? []

  function handleSelect(vessel: VesselSearchResult) {
    setSelectedVessel(vessel)
    setQuery(vessel.name)
    setOpen(false)
    // Automatically trigger data fetching when a vessel is selected
    triggerFetch()
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

  const showDropdown = open && query.trim().length >= 2 && hasApiKey

  return (
    <div className="flex flex-col gap-2">
      {/* API Key Warning */}
      {!hasApiKey && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/50">
          <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              API Key Required
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              Add your Pole Star API key in the top bar to search and fetch vessel data.
            </p>
          </div>
        </div>
      )}

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
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="vessel-results"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            value={query}
            placeholder={hasApiKey ? "Search vessel name, IMO, MMSI…" : "API key required to search"}
            className={cn("pl-8 pr-8", !hasApiKey && "bg-muted cursor-not-allowed")}
            disabled={!hasApiKey}
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
            id="vessel-results"
            ref={listRef}
            role="listbox"
            aria-label="Vessel search results"
            className="absolute z-50 mt-1 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md max-h-72"
          >
            {error && (
              <li className="px-3 py-2 text-sm text-destructive flex items-start gap-2">
                <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                <span>{error.message || "Search failed"}</span>
              </li>
            )}
            {!error && results.length === 0 && !isFetching && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                No vessels found
              </li>
            )}
            {!error && results.map((vessel) => (
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
        disabled={!hasApiKey}
        className={cn(
          "flex items-center gap-1.5 self-start rounded-md border px-2 py-1 text-xs transition-colors",
          vesselStatusFilter
            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          !hasApiKey && "cursor-not-allowed opacity-50"
        )}
      >
        <FilterIcon className="size-3" />
        {vesselStatusFilter ? `Status: ${vesselStatusFilter}` : "All vessel statuses"}
      </button>
    </div>
  )
}
