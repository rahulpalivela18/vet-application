import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ClipboardCheck } from "lucide-react";
import { getVetById } from "@/lib/vets.functions";
import { listMyPets } from "@/lib/pets.functions";
import { createAppointment } from "@/lib/appointments.functions";
import { useSession } from "@/hooks/use-session";
import { StatusBadge } from "@/components/vetnow/status-badge";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { consultationLabel, displayName, formatFee, speciesLabel } from "@/lib/format";
import { clearStoredHandoff, readStoredHandoff } from "@/lib/handoff";

const vetQuery = (id: string) =>
  queryOptions({ queryKey: ["vet", id], queryFn: () => getVetById({ data: { id } }) });

export const Route = createFileRoute("/book/$vetId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(vetQuery(params.vetId)),
  head: () => ({
    meta: [
      { title: "Book a veterinary consultation | VetNow" },
      {
        name: "description",
        content:
          "Book a clinic visit, video consult or home visit with a VetNow veterinarian and attach your AI-structured handoff note.",
      },
      { property: "og:title", content: "Book a veterinary consultation | VetNow" },
      { property: "og:description", content: "Pick a time, pick a format, send a clear handoff." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookPage,
});

type Slot = { iso: string; label: string };

function buildSlots(hours: { day_of_week: number; opens: string; closes: string }[]): {
  dayLabel: string;
  slots: Slot[];
}[] {
  const days: { dayLabel: string; slots: Slot[] }[] = [];
  const now = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() + d);
    const dow = date.getDay();
    const dayHours = hours.filter((h) => h.day_of_week === dow);
    if (dayHours.length === 0) continue;
    const slots: Slot[] = [];
    for (const h of dayHours) {
      const [oh = 9, om = 0] = h.opens.split(":").map(Number);
      const [ch = 17, cm = 0] = h.closes.split(":").map(Number);
      const cursor = new Date(date);
      cursor.setHours(oh, om, 0, 0);
      const end = new Date(date);
      end.setHours(ch, cm, 0, 0);
      while (cursor.getTime() + 30 * 60 * 1000 <= end.getTime()) {
        if (cursor.getTime() > now.getTime() + 30 * 60 * 1000) {
          slots.push({
            iso: cursor.toISOString(),
            label: cursor.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          });
        }
        cursor.setMinutes(cursor.getMinutes() + 30);
      }
    }
    if (slots.length > 0) {
      days.push({
        dayLabel:
          d === 0
            ? "Today"
            : d === 1
              ? "Tomorrow"
              : date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }),
        slots: slots.slice(0, 12),
      });
    }
  }
  return days;
}

function BookPage() {
  const { vetId } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const { data } = useSuspenseQuery(vetQuery(vetId));
  const vet = data.vet;
  const slotDays = buildSlots(data.hours);

  const listPets = useServerFn(listMyPets);
  const book = useServerFn(createAppointment);

  const pets = useQuery({ queryKey: ["my-pets"], queryFn: () => listPets(), enabled: Boolean(user) });

  const [petId, setPetId] = useState("none");
  const [consultationType, setConsultationType] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [reason, setReason] = useState("");
  const [handoff, setHandoff] = useState("");

  useEffect(() => {
    const stored = readStoredHandoff();
    if (stored) {
      setHandoff(stored.summary);
      setConsultationType((prev) => prev || stored.consultationType);
    }
  }, []);

  useEffect(() => {
    if (!consultationType && vet?.consultation_types[0]) setConsultationType(vet.consultation_types[0]);
  }, [vet, consultationType]);

  const mutation = useMutation({
    mutationFn: (input: {
      vetId: string;
      petId?: string;
      scheduledAt: string;
      consultationType: "clinic" | "video" | "home";
      reason: string;
      handoffSummary?: string;
    }) => book({ data: input }),
    onSuccess: () => {
      clearStoredHandoff();
      toast.success("Request sent — the vet will confirm shortly");
      navigate({ to: "/dashboard" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!vet) return null;

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in to book</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an account so the vet can reach you and see your pet's record.
        </p>
        <Button asChild className="mt-5">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const fee =
    consultationType === "home" ? (vet.home_visit_fee ?? vet.consultation_fee) : vet.consultation_fee;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold">Book a consultation</h1>

      <div className="surface-panel mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-display text-lg font-bold">{displayName(vet.full_name)}</p>
          <p className="text-sm text-muted-foreground">
            {vet.qualification}
            {vet.clinic ? ` · ${vet.clinic.name}, ${vet.clinic.area}` : ""}
          </p>
        </div>
        <StatusBadge status={vet.current_status} long />
      </div>

      <form
        className="surface-panel mt-6 space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!scheduledAt) {
            toast.error("Pick a time slot first");
            return;
          }
          mutation.mutate({
            vetId,
            ...(petId === "none" ? {} : { petId }),
            scheduledAt,
            consultationType: consultationType as "clinic" | "video" | "home",
            reason: reason.trim(),
            ...(handoff.trim() ? { handoffSummary: handoff.trim() } : {}),
          });
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Pet</Label>
            <Select value={petId} onValueChange={setPetId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a pet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not listed yet</SelectItem>
                {(pets.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {speciesLabel(p.species)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Consultation type</Label>
            <Select value={consultationType} onValueChange={setConsultationType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose format" />
              </SelectTrigger>
              <SelectContent>
                {vet.consultation_types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {consultationLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Pick a time slot</Label>
          {slotDays.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              This vet hasn't published working hours yet — send a request and they'll propose a
              time.
            </p>
          ) : (
            <div className="mt-1.5 space-y-3">
              {slotDays.map((day) => (
                <div key={day.dayLabel}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {day.dayLabel}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <button
                        key={slot.iso}
                        type="button"
                        onClick={() => setScheduledAt(slot.iso)}
                        className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                          scheduledAt === slot.iso
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="reason">Reason for the visit</Label>
          <Textarea
            id="reason"
            required
            minLength={5}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Vomiting since morning, refusing food."
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="handoff" className="flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            Clinical handoff note (optional)
          </Label>
          <Textarea
            id="handoff"
            rows={6}
            value={handoff}
            onChange={(e) => setHandoff(e.target.value)}
            placeholder="Generated by the VetNow Assistant, or write your own."
            className="mt-1.5 font-mono text-xs"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Don't have one?{" "}
            <Link to="/assistant" className="font-semibold text-primary hover:underline">
              Use the assistant
            </Link>{" "}
            to generate a structured note first.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <p className="text-sm text-muted-foreground">
            Estimated fee <span className="font-display text-lg font-bold text-foreground">{formatFee(fee)}</span>
          </p>
          <Button type="submit" size="lg" disabled={mutation.isPending}>
            <CalendarClock className="size-4" />
            {mutation.isPending ? "Sending…" : "Request appointment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
