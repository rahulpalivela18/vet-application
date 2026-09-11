import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import {
  getMyAccount,
  getMyVetDocumentUrls,
  updateMyProfile,
  type MyAccount,
} from "@/lib/account.functions";
import {
  consultationLabel,
  displayName,
  formatDateTime,
  formatFee,
  speciesLabel,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

const DOC_LABEL: Record<string, string> = {
  degree: "Degree certificate",
  registration: "Council registration",
  gov_id: "Government ID",
  selfie: "Selfie with ID",
  clinic: "Clinic registration",
};

const VERIFICATION_LABEL: Record<string, string> = {
  VERIFIED: "Verified",
  PENDING: "Under review",
  REJECTED: "Not verified",
};

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Your profile | VetNow" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const fetchAccount = useServerFn(getMyAccount);
  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });

  if (account.isLoading) {
    return (
      <p className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted-foreground">Loading profile…</p>
    );
  }

  const roles = account.data?.roles ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{account.data?.email}</span>
        {roles.map((r) => (
          <span
            key={r}
            className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
          >
            {r}
          </span>
        ))}
      </div>

      <ProfileForm account={account.data} />
      {account.data?.vet ? <VetSummary vet={account.data.vet} /> : null}
    </div>
  );
}

function ProfileForm({ account }: { account: MyAccount | undefined }) {
  const qc = useQueryClient();
  const save = useServerFn(updateMyProfile);
  const profile = account?.profile ?? null;

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [area, setArea] = useState(profile?.area ?? "");
  const [city, setCity] = useState(profile?.city ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          area: area.trim() || undefined,
          city: city.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      className="surface-panel mt-6 grid gap-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="full-name">Full name</Label>
        <Input
          id="full-name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          placeholder="+91 90000 00000"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="area">Area</Label>
          <Input
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            maxLength={80}
            placeholder="MVP Colony"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            placeholder="Visakhapatnam"
          />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );
}

function VetSummary({ vet }: { vet: Tables<"vets"> }) {
  const fetchDocs = useServerFn(getMyVetDocumentUrls);
  const docs = useQuery({ queryKey: ["my-vet-documents"], queryFn: () => fetchDocs() });
  const urlByKind = new Map((docs.data ?? []).map((d) => [d.kind, d.url]));

  const verified = vet.verification === "VERIFIED";

  return (
    <section className="surface-panel mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {verified ? (
            <BadgeCheck className="size-5 text-available" />
          ) : (
            <ShieldAlert className="size-5 text-busy" />
          )}
          <h2 className="font-display text-lg font-bold">Veterinarian profile</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              verified
                ? "bg-available/15 text-available"
                : vet.verification === "REJECTED"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-busy/15 text-busy"
            }`}
          >
            {VERIFICATION_LABEL[vet.verification] ?? vet.verification}
          </span>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/vet-console">Open vet console</Link>
        </Button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{displayName(vet.full_name)}</p>

      {vet.verification === "REJECTED" && vet.verification_reason ? (
        <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Rejected: {vet.verification_reason}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Qualification" value={vet.qualification} />
        <Field label="Registration number" value={vet.registration_number ?? ""} />
        <Field label="Experience" value={`${vet.experience_years} yrs`} />
        <Field label="Consultation fee" value={formatFee(vet.consultation_fee)} />
        <Field
          label="Home visit fee"
          value={vet.home_visit_fee ? formatFee(vet.home_visit_fee) : ""}
        />
        <Field label="Accepts emergency" value={vet.accepts_emergency ? "Yes" : "No"} />
        <Field label="Specialties" value={vet.specialties.join(", ")} />
        <Field label="Pet types" value={vet.pet_types.map(speciesLabel).join(", ")} />
        <Field
          label="Consultation formats"
          value={vet.consultation_types.map(consultationLabel).join(", ")}
        />
        <Field
          label="Submitted"
          value={vet.verification_submitted_at ? formatDateTime(vet.verification_submitted_at) : ""}
        />
      </dl>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">Documents</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.keys(DOC_LABEL).map((kind) => {
            const has = urlByKind.has(kind);
            return has ? (
              <a
                key={kind}
                href={urlByKind.get(kind) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-available/15 px-2 py-1 text-xs font-medium text-available hover:underline"
              >
                {DOC_LABEL[kind]} · view
              </a>
            ) : (
              <span
                key={kind}
                className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground"
              >
                {DOC_LABEL[kind]} · not uploaded
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
