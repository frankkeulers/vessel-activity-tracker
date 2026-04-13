import { useState } from "react"
import {
  ShipIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  AnchorIcon,
  RulerIcon,
  GlobeIcon,
  UsersIcon,
} from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useVesselCharacteristics } from "@/lib/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-xs font-medium">{value}</span>
    </div>
  )
}

function Section({
  icon,
  label,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-border pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-1 flex w-full items-center gap-1.5 text-left"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {open ? (
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="size-3 text-muted-foreground" />
        )}
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  )
}

export function VesselCard() {
  const selectedVessel = useAppStore((s) => s.selectedVessel)
  const imoNum = selectedVessel ? parseInt(selectedVessel.imo, 10) : null
  const { data, isLoading } = useVesselCharacteristics(imoNum)
  const [collapsed, setCollapsed] = useState(false)

  if (!selectedVessel) return null

  const c = data?.data

  // Merge search result with characteristics for identity fields
  const mmsi = selectedVessel.mmsi ?? c?.mmsi
  const flagName = c?.flag?.name ?? selectedVessel.flag
  const callsign = selectedVessel.callsign ?? c?.callsign

  return (
    <div className="rounded-xl border border-border bg-card text-sm ring-1 ring-foreground/10">
      {/* Header — always visible */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <ShipIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-snug">{selectedVessel.name}</p>
          {selectedVessel.vessel_type && (
            <p className="truncate text-xs text-muted-foreground">{selectedVessel.vessel_type}</p>
          )}
        </div>
        <div className={cn("mt-0.5 transition-transform", collapsed ? "" : "rotate-180")}>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </div>
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          {/* Status badge */}
          {selectedVessel.vessel_status && (
            <Badge variant="secondary" className="text-xs font-normal">
              {selectedVessel.vessel_status}
            </Badge>
          )}

          {/* Identity rows — always visible, no loading dependency */}
          <div className="space-y-0.5">
            <Row label="IMO" value={selectedVessel.imo} />
            <Row label="MMSI" value={mmsi} />
            <Row label="Flag" value={flagName ? `${flagName}${selectedVessel.flag_code ? ` (${selectedVessel.flag_code})` : ""}` : null} />
            <Row label="Callsign" value={callsign} />
          </div>

          {isLoading && (
            <div className="space-y-1.5 border-t border-border pt-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          )}

          {c && (
            <div className="space-y-2">
              {/* Dimensions & Performance */}
              <Section icon={<RulerIcon className="size-3" />} label="Dimensions" defaultOpen={false}>
                <Row label="LOA" value={c.dimensions?.length ? `${c.dimensions.length} m` : null} />
                <Row label="Beam" value={c.dimensions?.breadth ? `${c.dimensions.breadth} m` : null} />
                <Row label="Draught" value={c.draught ? `${c.draught} m` : null} />
                <Row label="Gross Tonnage" value={c.gross_tonnage?.toLocaleString()} />
                <Row label="Deadweight" value={c.deadweight?.toLocaleString()} />
                <Row label="Displacement" value={c.displacement?.toLocaleString()} />
                <Row label="Service Speed" value={c.speed ? `${c.speed} kn` : null} />
              </Section>

              {/* Registry */}
              <Section icon={<AnchorIcon className="size-3" />} label="Registry" defaultOpen={false}>
                <Row label="Built" value={c.build_year} />
                <Row label="Shipbuilder" value={c.shipbuilder} />
                <Row label="Country of Build" value={c.country_of_build?.country_name} />
                <Row label="Hull Type" value={c.hull_type} />
                <Row label="Port of Registry" value={c.port_of_registry} />
                <Row label="Classification" value={c.classification_society} />
                <Row label="P&I Club" value={c.pandi_club} />
                <Row label="DOC Company" value={c.doc_company} />
              </Section>

              {/* Ownership */}
              {c.ownership && (
                <Section icon={<UsersIcon className="size-3" />} label="Ownership" defaultOpen={false}>
                  <Row label="Operator" value={c.ownership.operator} />
                  <Row label="Registered Owner" value={c.ownership.registered_owner} />
                  <Row label="Technical Manager" value={c.ownership.technical_manager} />
                  <Row label="Ship Manager" value={c.ownership.ship_manager} />
                  <Row label="Group Beneficial Owner" value={c.ownership.group_beneficial_owner} />
                </Section>
              )}

              {/* Flag State */}
              {c.flag?.effective_date && (
                <Section icon={<GlobeIcon className="size-3" />} label="Flag State" defaultOpen={false}>
                  <Row label="Effective" value={c.flag.effective_date} />
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
