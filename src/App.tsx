import * as React from "react"
import {
  KeyRoundIcon,
  MoonIcon,
  SunIcon,
  MapIcon,
  LoaderCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  MenuIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels"
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
import { getApiKey } from "@/lib/api"
import { useAppStore } from "@/store/useAppStore"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useToast } from "@/components/Toaster"
import { EventsTimelineSidepanel, CategoryChip, ALL_CATEGORIES } from "@/components/EventsTimelineSidepanel"
import { ReplayBar } from "@/components/ReplayBar"
import { useIsMobile } from "@/hooks/use-mobile"

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
  const saveApiKey = useAppStore((s) => s.saveApiKey)

  function handleSave() {
    saveApiKey(value.trim())
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

function EventFilterChips() {
  const filters = useAppStore((s) => s.filters)
  const toggleFilter = useAppStore((s) => s.toggleFilter)
  return (
    <div className="flex items-center gap-1.5">
      <SlidersHorizontalIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex flex-wrap gap-1">
        {ALL_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            category={cat}
            active={filters[cat]}
            onToggle={() => toggleFilter(cat)}
          />
        ))}
      </div>
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
  const { isLoading, errors, fetchKey, counts, fetching } = useDataStatus()
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
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
          <LoaderCircleIcon className="size-3.5 animate-spin" />
          <span className="font-semibold">Loading data…</span>
        </div>
        <div className="flex flex-col gap-0.5 pl-5">
          {EVENT_BREAKDOWN_ROWS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                {fetching[key] ? (
                  <LoaderCircleIcon className="size-3 animate-spin shrink-0" />
                ) : (
                  <CheckCircleIcon className="size-3 shrink-0 text-primary" />
                )}
                <span>{label}</span>
              </div>
              {!fetching[key] && (
                <span className="tabular-nums font-medium text-foreground">{counts[key].toLocaleString()}</span>
              )}
            </div>
          ))}
        </div>
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
  const isMobile = useIsMobile()
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const replayAt = useAppStore((s) => s.replayAt)
  const resetReplay = useAppStore((s) => s.resetReplay)

  // Exit replay when switching to mobile (no replay bar on mobile)
  React.useEffect(() => {
    if (isMobile && replayAt !== null) resetReplay()
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <DataOrchestrator />

      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border px-4">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle navigation"
              onClick={() => setMobileSidebarOpen((v) => !v)}
            >
              <MenuIcon className="size-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <MapIcon className="size-5 text-primary" />
            <span className="font-display text-sm font-semibold tracking-wide">
              Vessel Activity Tracker
            </span>
          </div>
          {!isMobile && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <ApiKeyInput />
              <Separator orientation="vertical" className="h-5" />
              <EventFilterChips />
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            {replayAt !== null && (
              <span className="animate-pulse rounded-sm bg-psg-orange-700/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-psg-orange-700">
                REPLAY
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Main layout */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Left control panel — desktop: always visible; mobile: slide-in overlay */}
          {(!isMobile || mobileSidebarOpen) && (
            <aside
              className={[
                "flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4 bg-background",
                isMobile ? "absolute inset-y-0 left-0 z-50 shadow-xl" : "",
              ].join(" ")}
            >
              {isMobile && (
                <>
                  <ApiKeyInput />
                  <Separator />
                </>
              )}
              <SidebarSection label="Vessel">
                <VesselSearch />
                <VesselCard />
              </SidebarSection>

              <Separator />

              <SidebarSection label="Date Range">
                <DateRangePicker />
              </SidebarSection>

              <Separator />

              {isMobile && (
                <>
                  <SidebarSection label="Event Filters">
                    <EventFilterChips />
                  </SidebarSection>
                  <Separator />
                </>
              )}

              <DataStatusBar />
            </aside>
          )}

          {/* Mobile backdrop — tap outside to close sidebar */}
          {isMobile && mobileSidebarOpen && (
            <div
              className="absolute inset-0 z-40 bg-black/30"
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}

          {/* Centre pane: map + Gantt — vertically resizable */}
          <main className={["flex flex-1 flex-col overflow-hidden", replayAt !== null ? "border-t-2 border-psg-orange-700" : ""].join(" ")}>
            <PanelGroup orientation="vertical">
              <Panel defaultSize={65} minSize={25}>
                <div className="h-full overflow-hidden">
                  <ErrorBoundary label="Map failed to render">
                    <MapView />
                  </ErrorBoundary>
                </div>
              </Panel>
              <PanelResizeHandle className="group relative flex h-2 cursor-row-resize items-center justify-center border-t border-border bg-muted/20 transition-colors hover:bg-primary/10">
                <div className="h-0.5 w-8 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary/50" />
              </PanelResizeHandle>
              <Panel defaultSize={35} minSize={15}>
                <div className="h-full overflow-hidden">
                  <ErrorBoundary label="Timeline failed to render">
                    <GanttTimeline />
                  </ErrorBoundary>
                </div>
              </Panel>
            </PanelGroup>
            <ReplayBar />
          </main>

          {/* Right sidepanel: events timeline */}
          <EventsTimelineSidepanel />
        </div>
      </div>
    </>
  )
}
