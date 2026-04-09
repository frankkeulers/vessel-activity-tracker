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
  zone: "#18767C",        // psg-green-500
  ais_gap: "#F88E63",     // psg-orange-700
  sts: "#4ED0D0",         // psg-green-300
  discrepancy: "#EC6436", // psg-orange-800
  psc: "#0F545A",         // psg-green-600
} as const
