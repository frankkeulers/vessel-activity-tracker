import { ShipIcon, FlagIcon, AnchorIcon } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { useVesselCharacteristics } from "@/lib/hooks"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null) return null
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  )
}

export function VesselCard() {
  const selectedVessel = useAppStore((s) => s.selectedVessel)
  const imoNum = selectedVessel ? parseInt(selectedVessel.imo, 10) : null
  const { data, isLoading } = useVesselCharacteristics(imoNum)

  if (!selectedVessel) return null

  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm ring-1 ring-foreground/10">
      {/* Header */}
      <div className="mb-2 flex items-start gap-2">
        <ShipIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-snug">{selectedVessel.name}</p>
        </div>
      </div>

      {/* Vessel metadata row - aligned with icon for cleaner layout */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {selectedVessel.flag && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
            <FlagIcon className="size-3" />
            {selectedVessel.flag}
          </Badge>
        )}
        {selectedVessel.vessel_type && (
          <Badge variant="secondary" className="text-xs font-normal">
            {selectedVessel.vessel_type}
          </Badge>
        )}
      </div>

      {/* Quick identifiers */}
      <div className="mb-2 flex flex-wrap gap-1">
        <Badge variant="secondary" className="font-mono text-xs">
          IMO {selectedVessel.imo}
        </Badge>
        {selectedVessel.mmsi && (
          <Badge variant="secondary" className="font-mono text-xs">
            MMSI {selectedVessel.mmsi}
          </Badge>
        )}
        {selectedVessel.callsign && (
          <Badge variant="outline" className="font-mono text-xs">
            {selectedVessel.callsign}
          </Badge>
        )}
        {selectedVessel.vessel_status && (
          <Badge variant="secondary" className="text-xs">
            {selectedVessel.vessel_status}
          </Badge>
        )}
      </div>

      {/* Characteristics */}
      {isLoading && (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}
      {data && (
        <div className="space-y-1 border-t border-border pt-2">
          <Row label="GT" value={data.data.gross_tonnage?.toLocaleString()} />
          <Row label="DWT" value={data.data.deadweight?.toLocaleString()} />
          <Row label="LOA" value={data.data.dimensions?.length ? `${data.data.dimensions.length} m` : null} />
          <Row label="Beam" value={data.data.dimensions?.breadth ? `${data.data.dimensions.breadth} m` : null} />
          <Row label="Built" value={data.data.build_year} />
          <div className="flex items-center gap-1 pt-0.5">
            <AnchorIcon className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{data.data.ship_status ?? "—"}</span>
          </div>
        </div>
      )}
    </div>
  )
}
