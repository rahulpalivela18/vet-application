import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Stethoscope, BadgeCheck, ShieldAlert } from "lucide-react";
import { Fragment, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { listVetAppointments, setAppointmentStatus } from "@/lib/appointments.functions";
import {
  getMyAccount,
  getMyVetDocuments,
  submitVetVerification,
  updateVetStatus,
  VET_DOC_KINDS,
  type VetDocKind,
} from "@/lib/account.functions";
import { listMyWorkingHours, saveMyWorkingHours } from "@/lib/vet-hours.functions";
import { StatusBadge } from "@/components/vetnow/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPOINTMENT_STATUS_META,
  VET_STATUS_META,
  consultationLabel,
  displayName,
  formatDateTime,
  formatFee,
  speciesLabel,
} from "@/lib/format";
import type { Enums } from "@/integrations/supabase/types";
import { Checkbox } from "@/components/ui/checkbox";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DOC_FIELDS: { kind: VetDocKind; label: string; required: boolean }[] = [
  { kind: "degree", label: "BVSc & AH degree certificate", required: true },
  { kind: "registration", label: "Veterinary council registration certificate", required: true },
  { kind: "gov_id", label: "Government photo ID (Aadhaar / PAN / passport)", required: true },
  { kind: "selfie", label: "Selfie holding your ID (optional)", required: false },
  { kind: "clinic", label: "Clinic registration (optional)", required: false },
];

type DayHours = { dayOfWeek: number; opens: string; closes: string; enabled: boolean };

const DEFAULT_HOURS: DayHours[] = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i,
  opens: "10:00",
  closes: "19:00",
  enabled: i >= 1 && i <= 6,
}));

export const Route = createFileRoute("/_authenticated/vet-console")({
  head: () => ({
    meta: [
      { title: "Vet console | VetNow" },
      {
        name: "description",
        content: "Set your live availability status and manage incoming consultation requests.",
      },
      { property: "og:title", content: "Vet console | VetNow" },
      {
        property: "og:description",
        content: "Live status control and request queue for VetNow vets.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VetConsolePage,
});

function VetConsolePage() {
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getMyAccount);
  const fetchAppointments = useServerFn(listVetAppointments);
  const setStatus = useServerFn(updateVetStatus);
  const setApptStatus = useServerFn(setAppointmentStatus);
  const submitVerification = useServerFn(submitVetVerification);
  const fetchDocs = useServerFn(getMyVetDocuments);
  const fetchHours = useServerFn(listMyWorkingHours);
  const saveHours = useServerFn(saveMyWorkingHours);
  const { user } = useSession();

  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });
  const documentsQuery = useQuery({
    queryKey: ["my-vet-documents"],
    queryFn: () => fetchDocs(),
    enabled: Boolean(account.data?.vet),
  });
  const appointments = useQuery({
    queryKey: ["vet-appointments"],
    queryFn: () => fetchAppointments(),
    enabled: Boolean(account.data?.vet),
  });

  const statusMutation = useMutation({
    mutationFn: (status: Enums<"vet_status">) => setStatus({ data: { status } }),
    onSuccess: () => {
      toast.success("Availability updated");
      qc.invalidateQueries({ queryKey: ["my-account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apptMutation = useMutation({
    mutationFn: (input: { id: string; status: "CONFIRMED" | "DECLINED" | "COMPLETED" }) =>
      setApptStatus({ data: input }),
    onSuccess: () => {
      toast.success("Appointment updated");
      qc.invalidateQueries({ queryKey: ["vet-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [regNumber, setRegNumber] = useState("");
  const [verifNotes, setVerifNotes] = useState("");
  const [files, setFiles] = useState<Partial<Record<VetDocKind, File>>>({});
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [hoursLoaded, setHoursLoaded] = useState(false);

  const hoursQuery = useQuery({
    queryKey: ["my-working-hours"],
    queryFn: () => fetchHours(),
    enabled: Boolean(account.data?.vet),
  });

  const saved = hoursQuery.data;
  if (saved && !hoursLoaded) {
    setHoursLoaded(true);
    if (saved.length > 0) {
      setHours(
        DAY_NAMES.map((_, i) => {
          const row = saved.find((r) => r.day_of_week === i);
          return row
            ? {
                dayOfWeek: i,
                opens: row.opens.slice(0, 5),
                closes: row.closes.slice(0, 5),
                enabled: true,
              }
            : { dayOfWeek: i, opens: "10:00", closes: "19:00", enabled: false };
        }),
      );
    }
  }

  const hoursMutation = useMutation({
    mutationFn: () =>
      saveHours({
        data: {
          hours: hours
            .filter((h) => h.enabled)
            .map((h) => ({ dayOfWeek: h.dayOfWeek, opens: h.opens, closes: h.closes })),
        },
      }),
    onSuccess: () => {
      toast.success("Working hours saved");
      qc.invalidateQueries({ queryKey: ["my-working-hours"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verificationMutation = useMutation({
    mutationFn: (payload: {
      registrationNumber: string;
      notes: string;
      documents: { kind: VetDocKind; filePath: string }[];
    }) => submitVerification({ data: payload }),
    onSuccess: () => {
      toast.success("Verification submitted — we'll review it shortly");
      setRegNumber("");
      setVerifNotes("");
      setFiles({});
      qc.invalidateQueries({ queryKey: ["my-account"] });
      qc.invalidateQueries({ queryKey: ["my-vet-documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function submitForVerification() {
    if (!user) {
      toast.error("Please sign in again");
      return;
    }
    setUploading(true);
    try {
      const payloadDocs: { kind: VetDocKind; filePath: string }[] = [];
      for (const kind of VET_DOC_KINDS) {
        const file = files[kind];
        if (!file) continue;
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const filePath = `${user.id}/${kind}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("vet-documents")
          .upload(filePath, file, { upsert: true, contentType: file.type });
        if (error) throw new Error(error.message);
        payloadDocs.push({ kind, filePath });
      }
      for (const doc of documentsQuery.data ?? []) {
        if (payloadDocs.some((d) => d.kind === doc.kind)) continue;
        payloadDocs.push({ kind: doc.kind as VetDocKind, filePath: doc.file_path });
      }
      await verificationMutation.mutateAsync({
        registrationNumber: regNumber.trim(),
        notes: verifNotes.trim(),
        documents: payloadDocs,
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (account.isLoading) {
    return (
      <p className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">Loading console…</p>
    );
  }

  const vet = account.data?.vet;

  if (!vet) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">No veterinarian profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your professional profile to start receiving consultation requests.
        </p>
        <Button asChild className="mt-5">
          <Link to="/for-vets">Join as a vet</Link>
        </Button>
      </div>
    );
  }

  const rows = appointments.data ?? [];
  const pending = rows.filter((a) => a.status === "PENDING");
  const confirmed = rows.filter((a) => a.status === "CONFIRMED");
  const completed = rows.filter((a) => a.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Vet console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayName(vet.full_name)} · {vet.qualification}
          </p>
        </div>
        <StatusBadge status={vet.current_status} long />
      </div>

      <div className="surface-panel mt-6 flex flex-wrap items-center gap-4 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Stethoscope className="size-4 text-primary" />
          Live availability
        </div>
        <Select
          value={vet.current_status}
          onValueChange={(v) => statusMutation.mutate(v as Enums<"vet_status">)}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(VET_STATUS_META) as Enums<"vet_status">[]).map((s) => (
              <SelectItem key={s} value={s}>
                {VET_STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {pending.length} pending request{pending.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="surface-panel mt-6 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {vet.verification === "VERIFIED" ? (
            <BadgeCheck className="size-4 text-available" />
          ) : (
            <ShieldAlert className="size-4 text-busy" />
          )}
          Verification
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              vet.verification === "VERIFIED"
                ? "bg-available/15 text-available"
                : vet.verification === "REJECTED"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-busy/15 text-busy"
            }`}
          >
            {vet.verification === "VERIFIED"
              ? "Verified"
              : vet.verification === "REJECTED"
                ? "Not verified"
                : vet.verification_submitted_at
                  ? "Under review"
                  : "Not submitted"}
          </span>
        </div>

        {vet.verification === "VERIFIED" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Your profile is verified and shows a badge to pet owners.
          </p>
        ) : vet.verification === "PENDING" && vet.verification_submitted_at ? (
          <p className="mt-2 text-sm text-muted-foreground">
            We received your documents on {formatDateTime(vet.verification_submitted_at)} and are
            reviewing them. You'll get a Verified badge once approved.
          </p>
        ) : (
          <form
            className="mt-4 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitForVerification();
            }}
          >
            {vet.verification === "REJECTED" && vet.verification_reason ? (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                Rejected: {vet.verification_reason}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Upload your veterinary council registration and identity proof. An admin reviews these
              before you can go live.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="reg-number">Registration number</Label>
              <Input
                id="reg-number"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. VCI/2014/01234"
                required
                minLength={3}
                maxLength={60}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {DOC_FIELDS.map((f) => {
                const uploaded = (documentsQuery.data ?? []).some((d) => d.kind === f.kind);
                return (
                  <div key={f.kind} className="grid gap-1.5">
                    <Label htmlFor={`doc-${f.kind}`}>
                      {f.label}
                      {uploaded ? (
                        <span className="ml-2 text-xs font-medium text-available">Uploaded</span>
                      ) : null}
                    </Label>
                    <Input
                      id={`doc-${f.kind}`}
                      type="file"
                      accept="image/*,application/pdf"
                      required={f.required && !uploaded}
                      onChange={(e) =>
                        setFiles((prev) => ({ ...prev, [f.kind]: e.target.files?.[0] }))
                      }
                    />
                  </div>
                );
              })}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="verif-notes">Notes for our review team (optional)</Label>
              <Textarea
                id="verif-notes"
                value={verifNotes}
                onChange={(e) => setVerifNotes(e.target.value)}
                placeholder="Your college, degree year, clinic address, or anything that helps us verify you."
                maxLength={1000}
                rows={3}
              />
            </div>
            <div>
              <Button
                type="submit"
                size="sm"
                disabled={uploading || verificationMutation.isPending}
              >
                {uploading || verificationMutation.isPending
                  ? "Submitting…"
                  : "Submit for verification"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <form
        className="surface-panel mt-6 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          hoursMutation.mutate();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">Working hours</p>
          <Button type="submit" size="sm" variant="outline" disabled={hoursMutation.isPending}>
            {hoursMutation.isPending ? "Saving…" : "Save hours"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pet owners pick a time slot from these hours when they book you.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hours.map((h, idx) => (
            <div key={h.dayOfWeek} className="rounded-lg border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={h.enabled}
                  onCheckedChange={(v) =>
                    setHours(hours.map((x, i) => (i === idx ? { ...x, enabled: v === true } : x)))
                  }
                />
                {DAY_NAMES[h.dayOfWeek]}
              </label>
              {h.enabled ? (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={`${DAY_NAMES[h.dayOfWeek]} opens`}
                    value={h.opens}
                    onChange={(e) =>
                      setHours(
                        hours.map((x, i) => (i === idx ? { ...x, opens: e.target.value } : x)),
                      )
                    }
                    className="h-9"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    aria-label={`${DAY_NAMES[h.dayOfWeek]} closes`}
                    value={h.closes}
                    onChange={(e) =>
                      setHours(
                        hours.map((x, i) => (i === idx ? { ...x, closes: e.target.value } : x)),
                      )
                    }
                    className="h-9"
                  />
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Closed</p>
              )}
            </div>
          ))}
        </div>
      </form>

      <div className="mt-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Pending", value: pending.length },
            { label: "Confirmed", value: confirmed.length },
            { label: "Completed", value: completed.length },
            { label: "Total", value: rows.length },
          ].map((s) => (
            <div key={s.label} className="surface-panel p-4">
              <p className="font-display text-2xl font-extrabold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="surface-panel mt-6 overflow-x-auto">
          {appointments.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading requests…</p>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-display text-lg font-bold">No requests yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Set yourself to Available so pet owners nearby can reach you.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Fee</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const meta = APPOINTMENT_STATUS_META[a.status];
                  const isOpen = expandedId === a.id;
                  return (
                    <Fragment key={a.id}>
                      <tr className="border-b border-border align-top">
                        <td className="px-4 py-3 font-medium">
                          {a.pet ? `${a.pet.name} (${speciesLabel(a.pet.species)})` : "—"}
                        </td>
                        <td className="px-4 py-3">{a.ownerName ?? "Pet owner"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(a.scheduled_at)}
                        </td>
                        <td className="px-4 py-3">{consultationLabel(a.consultation_type)}</td>
                        <td className="px-4 py-3">{formatFee(a.price ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedId(isOpen ? null : a.id)}
                            >
                              {isOpen ? "Hide" : "Details"}
                            </Button>
                            {a.status === "PENDING" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={apptMutation.isPending}
                                  onClick={() =>
                                    apptMutation.mutate({ id: a.id, status: "CONFIRMED" })
                                  }
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={apptMutation.isPending}
                                  onClick={() =>
                                    apptMutation.mutate({ id: a.id, status: "DECLINED" })
                                  }
                                >
                                  Decline
                                </Button>
                              </>
                            ) : null}
                            {a.status === "CONFIRMED" ? (
                              <Button
                                size="sm"
                                disabled={apptMutation.isPending}
                                onClick={() =>
                                  apptMutation.mutate({ id: a.id, status: "COMPLETED" })
                                }
                              >
                                Complete
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-border bg-secondary/40">
                          <td colSpan={7} className="px-4 py-4">
                            <p className="text-xs font-medium text-muted-foreground">Reason</p>
                            <p className="mt-1 text-sm">{a.reason}</p>
                            {a.handoff_summary ? (
                              <>
                                <p className="mt-3 text-xs font-medium text-muted-foreground">
                                  Handoff summary
                                </p>
                                <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground">
                                  {a.handoff_summary}
                                </pre>
                              </>
                            ) : null}
                            {a.pet ? (
                              <p className="mt-3 text-xs text-muted-foreground">
                                {[
                                  a.pet.breed,
                                  a.pet.weight_kg ? `${a.pet.weight_kg} kg` : null,
                                  a.pet.allergies ? `Allergies: ${a.pet.allergies}` : null,
                                  a.pet.conditions ? `Conditions: ${a.pet.conditions}` : null,
                                  a.pet.medications ? `Medications: ${a.pet.medications}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
