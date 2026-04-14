import * as React from "react"
import { PlayIcon, PauseIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { REPLAY_SPEED_OPTIONS } from "@/config/constants"
import { cn } from "@/lib/utils"

// ←/→ advance this fraction of the total range per keypress
const STEP_FRACTION = 1 / 200

const SLIDER_MAX = 1_000_000

function formatUtc(d: Date): string {
  return format(d, "yyyy-MM-dd HH:mm:ss") + " UTC"
}

export function ReplayBar() {
  const fetchKey = useAppStore((s) => s.fetchKey)
  const dateRange = useAppStore((s) => s.dateRange)
  const replayAt = useAppStore((s) => s.replayAt)
  const isReplaying = useAppStore((s) => s.isReplaying)
  const replaySpeed = useAppStore((s) => s.replaySpeed)
  const setReplayAt = useAppStore((s) => s.setReplayAt)
  const startReplay = useAppStore((s) => s.startReplay)
  const pauseReplay = useAppStore((s) => s.pauseReplay)
  const resetReplay = useAppStore((s) => s.resetReplay)
  const setReplaySpeed = useAppStore((s) => s.setReplaySpeed)

  // Register global keyboard shortcuts once; read fresh state via getState()
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      const s = useAppStore.getState()
      if (s.fetchKey === 0) return

      const { dateRange: dr } = s
      const fromMs = dr.from.getTime()
      const toMs = dr.to.getTime()
      const rangeMs = toMs - fromMs

      switch (e.key) {
        case " ":
          e.preventDefault()
          if (s.isReplaying) s.pauseReplay()
          else s.startReplay()
          break

        case "ArrowLeft":
        case "ArrowRight": {
          e.preventDefault()
          const dir = e.key === "ArrowLeft" ? -1 : 1
          const current = s.replayAt ?? dr.from
          const newMs = Math.min(
            Math.max(current.getTime() + rangeMs * STEP_FRACTION * dir, fromMs),
            toMs,
          )
          s.setReplayAt(new Date(newMs))
          break
        }

        case "Home":
          e.preventDefault()
          s.setReplayAt(dr.from)
          break

        case "End":
          e.preventDefault()
          s.setReplayAt(dr.to)
          break

        case "Escape":
          if (s.replayAt !== null) {
            e.preventDefault()
            s.resetReplay()
          }
          break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, []) // empty — always reads fresh state via getState()

  if (fetchKey === 0) return null

  const fromMs = dateRange.from.getTime()
  const toMs = dateRange.to.getTime()
  const rangeMs = toMs - fromMs

  const displayAt = replayAt ?? dateRange.from
  const sliderValue = rangeMs > 0
    ? Math.round(((displayAt.getTime() - fromMs) / rangeMs) * SLIDER_MAX)
    : 0

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const frac = Number(e.target.value) / SLIDER_MAX
    const ms = Math.min(Math.max(fromMs + frac * rangeMs, fromMs), toMs)
    setReplayAt(new Date(ms))
  }

  function handleReset() {
    pauseReplay()
    setReplayAt(dateRange.from)
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-t border-border bg-muted/20 px-3">
      {/* Play / Pause */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={() => (isReplaying ? pauseReplay() : startReplay())}
        aria-label={isReplaying ? "Pause replay" : "Play replay"}
      >
        {isReplaying ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
      </Button>

      {/* Current timestamp */}
      <span className="w-44 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {formatUtc(displayAt)}
      </span>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={SLIDER_MAX}
        value={sliderValue}
        onChange={handleSliderChange}
        className="h-1.5 flex-1 cursor-pointer accent-primary"
        aria-label="Replay scrubber"
      />

      {/* Speed selector */}
      <div className="flex shrink-0 overflow-hidden rounded-md border border-border bg-background text-xs">
        {REPLAY_SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setReplaySpeed(s)}
            className={cn(
              "px-1.5 py-0.5 font-mono leading-none transition-colors",
              replaySpeed === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* Reset to start */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={handleReset}
        aria-label="Reset to start"
        title="Reset to start"
      >
        <RotateCcwIcon className="size-3.5" />
      </Button>

      {/* Exit Replay */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 gap-1 px-2 text-xs"
        onClick={resetReplay}
        aria-label="Exit replay"
      >
        <XIcon className="size-3.5" />
        Exit
      </Button>
    </div>
  )
}
