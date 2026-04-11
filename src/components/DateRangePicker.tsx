import * as React from "react"
import { format, parseISO, isValid, startOfDay } from "date-fns"
import { PlayIcon, AlertCircleIcon } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function toDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function fromDatetimeLocal(value: string): Date | null {
  try {
    const d = parseISO(value)
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

export function DateRangePicker() {
  const { dateRange, setDateRange, triggerFetch, selectedVessel } = useAppStore()
  const [fromStr, setFromStr] = React.useState(toDatetimeLocal(dateRange.from))
  const [toStr, setToStr] = React.useState(toDatetimeLocal(dateRange.to))
  const [error, setError] = React.useState<string | null>(null)

  function handleFetch() {
    const from = fromDatetimeLocal(fromStr)
    const to = fromDatetimeLocal(toStr)

    if (!from || !to) {
      setError("Invalid date format.")
      return
    }
    if (from >= to) {
      setError("Start must be before end.")
      return
    }
    if (to > new Date()) {
      setError("End date cannot be in the future.")
      return
    }

    setError(null)
    setDateRange({ from, to })
    triggerFetch()
  }

  function handlePreset(days: number) {
    const to = new Date()
    const from = startOfDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000))
    setFromStr(toDatetimeLocal(from))
    setToStr(toDatetimeLocal(to))
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Preset buttons */}
      <div className="flex gap-1">
        {([7, 14, 30, 90] as const).map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => handlePreset(days)}
            className="flex-1 rounded-md border border-border bg-card px-1 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {days}d
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">From (UTC)</Label>
          <Input
            type="datetime-local"
            value={fromStr}
            onChange={(e) => { setFromStr(e.target.value); setError(null) }}
            className="text-xs"
          />
        </div>
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">To (UTC)</Label>
          <Input
            type="datetime-local"
            value={toStr}
            onChange={(e) => { setToStr(e.target.value); setError(null) }}
            className="text-xs"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircleIcon className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleFetch}
        disabled={!selectedVessel}
        className="w-full"
        size="sm"
      >
        <span className="flex items-center gap-2">
          <PlayIcon className="size-4 shrink-0" />
          <span className="truncate">{selectedVessel ? "Fetch Data" : "Select a vessel first"}</span>
        </span>
      </Button>
    </div>
  )
}
