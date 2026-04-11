import * as React from "react"
import { XIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "error" | "success" | "info"

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>")
  return ctx
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  error: <AlertTriangleIcon className="size-4 shrink-0" />,
  success: <CheckCircleIcon className="size-4 shrink-0" />,
  info: <InfoIcon className="size-4 shrink-0" />,
}

const STYLES: Record<ToastVariant, string> = {
  error:
    "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20",
  success:
    "border-primary/30 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/20",
  info: "border-border bg-card text-foreground",
}

const DURATION_MS = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={cn(
              "flex w-80 items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-lg",
              "animate-in slide-in-from-right-4 fade-in duration-200",
              STYLES[t.variant],
            )}
          >
            {ICONS[t.variant]}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="mt-0.5 shrink-0 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
