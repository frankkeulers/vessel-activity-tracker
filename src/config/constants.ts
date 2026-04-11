import type { EventCategory } from "@/types"

// Sidebar layout & persistence
export const SIDEBAR_COOKIE_NAME = "sidebar_state"
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = "16rem"
export const SIDEBAR_WIDTH_MOBILE = "18rem"
export const SIDEBAR_WIDTH_ICON = "3rem"
export const SIDEBAR_KEYBOARD_SHORTCUT = "b"

// Theme provider
export const THEME_KEYBOARD_SHORTCUT = "d" // used with metaKey → ⌘D
export const ACCENT_KEYBOARD_SHORTCUT = "k" // used with metaKey → ⌘K
export const APP_SWITCHER_KEYBOARD_SHORTCUT = "\\" // used with metaKey → ⌘\

// Event category colours (map markers & Gantt bars)
export const EVENT_COLOURS = {
  port: "#2B969C",        // psg-green-400
  zone: "#1E40AF",        // blue-700 (distinct from green ports)
  ais_gap: "#F88E63",     // psg-orange-700
  sts: "#8B5CF6",         // violet-500 (distinct from teal ports and orange gaps)
  discrepancy: "#EC6436", // psg-orange-800
  psc: "#0F545A",         // psg-green-600
} as const

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  port: "Port Events",
  zone: "Zone Events",
  ais_gap: "AIS Gaps",
  sts: "STS Pairings",
  discrepancy: "Discrepancies",
  psc: "Port State Control",
}

export const CATEGORY_LABELS_SHORT: Record<EventCategory, string> = {
  port: "Port",
  zone: "Zone",
  ais_gap: "AIS Gap",
  sts: "STS",
  discrepancy: "Discrepancy",
  psc: "PSC",
}
