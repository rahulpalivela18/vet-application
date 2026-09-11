import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, ShieldAlert, ExternalLink } from "lucide-react";
import {
  getMyAccount,
  listVetVerifications,
  reviewVetVerification,
  type VetVerificationRow,
  type VerificationFilter,
} from "@/lib/account.functions";
import { displayName, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const DOC_LABEL: Record<string, string> = {
  degree: "Degree certificate",
  registration: "Council registration",
  gov_id: "Government ID",
  selfie: "Selfie with ID",
  clinic: "Clinic registration",
};

const FILTERS: { value: VerificationFilter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const VERIFICATION_BADGE: Record<string, string> = {
  VERIFIED: "bg-available/15 text-available",
  PENDING: "bg-busy/15 text-busy",
  REJECTED: "bg-destructive/15 text-destructive",
};

const VERIFICATION_LABEL: Record<string, string> = {
  VERIFIED: "Verified",
  PENDING: "Under review",
  REJECTED: "Rejected",
};

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  head: () => ({
    meta: [{ title: "Vet verifications | VetNow admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminVerificationsPage,
});

function AdminVerificationsPage() {
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchVets = useServerFn(listVetVerifications);
  const review = useServerFn(reviewVetVerification);

  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const isAdmin = account.data?.roles.includes("admin") ?? false;

  const [filter, setFilter] = useState<VerificationFilter>("PENDING");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const vets = useQuery({
    queryKey: ["vet-verifications", filter],
    queryFn: () => fetchVets({ data: { status: filter } }),
    enabled: isAdmin,
  });

  const reviewMutation = useMutation({
    mutationFn: (input: { vetId: string; decision: "VERIFIED" | "REJECTED"; reason?: string }) =>
      review({ data: input }),
    onSuccess: (_res, vars) => {
      toast.success(vars.decision === "VERIFIED" ? "Vet approved" : "Vet rejected");
      qc.invalidateQueries({ queryKey: ["vet-verifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (account.isLoading) {
    return <p className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Admin only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have admin access.
        </p>
        <Button asChild className="mt-5">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  const rows = vets.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold">Vet verifications</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {rows.length} record{rows.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 space-y-5">
        {vets.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="surface-panel p-8 text-center">
            <p className="font-display text-lg font-bold">Nothing here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No verifications match this filter.
            </p>
          </div>
        ) : (
          rows.map((v: VetVerificationRow) => (
            <div key={v.id} className="surface-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold">{displayName(v.full_name)}</p>
                  <p className="text-sm text-muted-foreground">{v.qualification}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reg: {v.registration_number ?? "—"} · {v.experience_years} yrs ·{" "}
                    {v.specialties.join(", ")}
                    {v.phone ? ` · ${v.phone}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERIFICATION_BADGE[v.verification]}`}
                  >
                    {VERIFICATION_LABEL[v.verification] ?? v.verification}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {v.verification_submitted_at
                      ? formatDateTime(v.verification_submitted_at)
                      : "—"}
                  </span>
                </div>
              </div>

              {v.verification_reason ? (
                <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  Reason: {v.verification_reason}
                </p>
              ) : null}

              {v.verification_notes ? (
                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground">
                  {v.verification_notes}
                </pre>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {v.documents.length === 0 ? (
                  <span className="text-xs text-destructive">No documents attached</span>
                ) : (
                  v.documents.map((d) => (
                    <a
                      key={d.kind}
                      href={d.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      <ExternalLink className="size-3.5" />
                      {DOC_LABEL[d.kind] ?? d.kind}
                    </a>
                  ))
                )}
              </div>

              <div className="mt-4 grid gap-3 border-t border-border pt-4">
                <div className="grid gap-1.5">
                  <Label htmlFor={`reason-${v.id}`}>Rejection reason (required to reject)</Label>
                  <Textarea
                    id={`reason-${v.id}`}
                    rows={2}
                    value={reasons[v.id] ?? ""}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [v.id]: e.target.value }))}
                    placeholder="Registration number not found on the council register."
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ vetId: v.id, decision: "VERIFIED" })}
                  >
                    <BadgeCheck className="size-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        vetId: v.id,
                        decision: "REJECTED",
                        reason: (reasons[v.id] ?? "").trim(),
                      })
                    }
                  >
                    <ShieldAlert className="size-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
