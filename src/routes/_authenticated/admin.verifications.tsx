import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, ShieldAlert, ExternalLink } from "lucide-react";
import {
  getMyAccount,
  listPendingVetVerifications,
  reviewVetVerification,
  type PendingVetVerification,
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

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  head: () => ({
    meta: [{ title: "Vet verifications | VetNow admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminVerificationsPage,
});

function AdminVerificationsPage() {
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchPending = useServerFn(listPendingVetVerifications);
  const review = useServerFn(reviewVetVerification);

  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const isAdmin = account.data?.roles.includes("admin") ?? false;

  const pending = useQuery({
    queryKey: ["pending-verifications"],
    queryFn: () => fetchPending(),
    enabled: isAdmin,
  });

  const [reasons, setReasons] = useState<Record<string, string>>({});

  const reviewMutation = useMutation({
    mutationFn: (input: { vetId: string; decision: "VERIFIED" | "REJECTED"; reason?: string }) =>
      review({ data: input }),
    onSuccess: (_res, vars) => {
      toast.success(vars.decision === "VERIFIED" ? "Vet approved" : "Vet rejected");
      qc.invalidateQueries({ queryKey: ["pending-verifications"] });
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

  const rows = pending.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold">Vet verifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {rows.length} pending submission{rows.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 space-y-5">
        {pending.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading submissions…</p>
        ) : rows.length === 0 ? (
          <div className="surface-panel p-8 text-center">
            <p className="font-display text-lg font-bold">Nothing to review</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New vet submissions will appear here.
            </p>
          </div>
        ) : (
          rows.map((v: PendingVetVerification) => (
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
                <span className="rounded-full bg-busy/15 px-3 py-1 text-xs font-semibold text-busy">
                  {v.verification_submitted_at ? formatDateTime(v.verification_submitted_at) : "—"}
                </span>
              </div>

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
