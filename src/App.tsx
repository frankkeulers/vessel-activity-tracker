import * as React from "react"
import {
  KeyRoundIcon,
  MoonIcon,
  SunIcon,
  MapIcon,
  LoaderCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { VesselSearch } from "@/components/VesselSearch"
import { VesselCard } from "@/components/VesselCard"
import { DateRangePicker } from "@/components/DateRangePicker"
import { DataOrchestrator, useDataStatus } from "@/components/DataOrchestrator"
import { GanttTimeline } from "@/components/GanttTimeline"
import { MapView } from "@/components/MapView"
import { getApiKey, setApiKey } from "@/lib/api"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useToast } from "@/components/Toaster"

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

function ApiKeyInput() {
  const [value, setValue] = React.useState(getApiKey)
  const [saved, setSaved] = React.useState(false)

  function handleSave() {
    setApiKey(value.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
      <Input
        type="password"
        placeholder="Pole Star API key"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-52"
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
      />
      <Button size="sm" variant="outline" onClick={handleSave}>
        {saved ? "Saved!" : "Save"}
      </Button>
    </div>
  )
}

function SidebarSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

const EVENT_BREAKDOWN_ROWS: { key: keyof ReturnType<typeof useDataStatus>["counts"]; label: string }[] = [
  { key: "port",        label: "Port events" },
  { key: "zone",        label: "Zone events" },
  { key: "sts",         label: "STS events" },
  { key: "ais_gap",     label: "AIS gaps" },
  { key: "psc",         label: "PSC inspections" },
  { key: "discrepancy", label: "Discrepancies" },
  { key: "positions",   label: "Positions" },
]

function DataStatusBar() {
  const { isLoading, errors, fetchKey, counts } = useDataStatus()
  const { toast } = useToast()
  const reportedErrors = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    for (const msg of errors) {
      if (!reportedErrors.current.has(msg)) {
        reportedErrors.current.add(msg)
        toast(msg, "error")
      }
    }
    if (errors.length === 0) {
      reportedErrors.current.clear()
    }
  }, [errors, toast])

  if (fetchKey === 0) return null

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderCircleIcon className="size-3.5 animate-spin" />
        Loading data…
      </div>
    )
  }

  if (errors.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        {errors.map((e, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
            {e}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircleIcon className="size-3.5 text-primary" />
        <span className="font-semibold">Data loaded</span>
      </div>
      <div className="flex flex-col gap-0.5 pl-5">
        {EVENT_BREAKDOWN_ROWS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{label}</span>
            <span className="tabular-nums font-medium text-foreground">{counts[key].toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <DataOrchestrator />

      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border px-4">
          <div className="flex items-center gap-2">
            <MapIcon className="size-5 text-primary" />
            <span className="font-display text-sm font-semibold tracking-wide">
              Vessel Activity Tracker
            </span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <ApiKeyInput />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left control panel */}
          <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4">
            <SidebarSection label="Vessel">
              <VesselSearch />
              <VesselCard />
            </SidebarSection>

            <Separator />

            <SidebarSection label="Date Range">
              <DateRangePicker />
            </SidebarSection>

            <Separator />

            <DataStatusBar />
          </aside>

          {/* Right pane: map + Gantt stacked */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Map */}
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary label="Map failed to render">
                <MapView />
              </ErrorBoundary>
            </div>

            <Separator />

            {/* Gantt timeline */}
            <div className="h-64 shrink-0 overflow-hidden border-t border-border w-full">
              <ErrorBoundary label="Timeline failed to render">
                <GanttTimeline />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
