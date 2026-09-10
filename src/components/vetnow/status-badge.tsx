import { cn } from "@/lib/utils";
import { VET_STATUS_META, type VetStatus } from "@/lib/format";

export function StatusDot({ status, className }: { status: VetStatus; className?: string }) {
  const meta = VET_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        meta.dotClass,
        meta.pulse && "status-dot-live",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function StatusBadge({
  status,
  long = false,
  className,
}: {
  status: VetStatus;
  long?: boolean;
  className?: string;
}) {
  const meta = VET_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        meta.badgeClass,
        className,
      )}
    >
      <StatusDot status={status} />
      {long ? meta.label : meta.short}
    </span>
  );
}
