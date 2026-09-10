import { Link } from "@tanstack/react-router";
import { MapPin, Star, Clock, IndianRupee, BadgeCheck } from "lucide-react";
import type { VetWithClinic } from "@/lib/vets.functions";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
import {
  consultationLabel,
  displayName,
  formatDistance,
  formatFee,
  initials,
  speciesLabel,
} from "@/lib/format";

export function VetCard({ vet, distanceKm }: { vet: VetWithClinic; distanceKm?: number }) {
  const name = displayName(vet.full_name);
  return (
    <article className="surface-panel flex flex-col gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent font-display text-sm font-bold text-accent-foreground">
          {initials(vet.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold">{name}</h3>
          <p className="truncate text-sm text-muted-foreground">{vet.qualification}</p>
          {vet.verification === "VERIFIED" && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-available">
              <BadgeCheck className="size-3.5" /> Verified
            </span>
          )}
        </div>
        <StatusBadge status={vet.current_status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        {vet.clinic && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {vet.clinic.area}
            {distanceKm !== undefined && <span className="text-foreground">· {formatDistance(distanceKm)}</span>}
          </span>
        )}
        {vet.rating !== null && (
          <span className="inline-flex items-center gap-1.5">
            <Star className="size-3.5 fill-busy text-busy" />
            <span className="font-medium text-foreground">{vet.rating.toFixed(1)}</span>
            <span>({vet.review_count})</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {vet.experience_years} yrs exp
        </span>
      </div>

      {vet.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {vet.specialties.slice(0, 3).map((s) => (
            <span key={s} className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              {s}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Treats {vet.pet_types.map(speciesLabel).join(", ")} · {vet.consultation_types.map(consultationLabel).join(", ")}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className="inline-flex items-center font-display text-lg font-bold">
            <IndianRupee className="size-4" />
            {vet.consultation_fee}
          </p>
          <p className="text-xs text-muted-foreground">consultation</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/vets/$vetId" params={{ vetId: vet.id }}>
              View
            </Link>
          </Button>
          <Button asChild size="sm" disabled={vet.current_status === "OFFLINE"}>
            <Link to="/book/$vetId" params={{ vetId: vet.id }}>
              Book
            </Link>
          </Button>
        </div>
      </div>
      <span className="sr-only">{formatFee(vet.consultation_fee)}</span>
    </article>
  );
}
