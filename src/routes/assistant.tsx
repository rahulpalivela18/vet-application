import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "VetNow Assistant — coming soon" },
      {
        name: "description",
        content: "AI symptom triage and structured clinical handoff notes. Coming soon.",
      },
    ],
  }),
  component: AssistantComingSoon,
});

function AssistantComingSoon() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Bot className="size-6" />
      </span>
      <h1 className="mt-4 font-display text-3xl font-extrabold">VetNow Assistant</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        AI symptom triage and structured handoff notes are coming soon. It will assess urgency and
        prepare a clinical note your vet can read in seconds — never diagnosing or prescribing.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/find">Find a vet</Link>
        </Button>
        <Button asChild variant="outline" className="text-emergency">
          <Link to="/emergency">
            <Siren className="size-4" />
            Emergency
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* Previous implementation kept for when the AI gateway is wired up (Phase 2).
 * Re-enable by restoring the Route component above to AssistantPage.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bot, ClipboardCheck, Copy, Siren } from "lucide-react";
import { triageCase, type TriageResult } from "@/lib/assistant.functions";
import { listMyPets } from "@/lib/pets.functions";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { consultationLabel, speciesLabel } from "@/lib/format";
import { HANDOFF_KEY } from "@/lib/handoff";

type TriageInput = {
  description: string;
  petName?: string | undefined;
  species?: string | undefined;
  breed?: string | undefined;
  ageText?: string | undefined;
  weightKg?: number | undefined;
  allergies?: string | undefined;
  conditions?: string | undefined;
  medications?: string | undefined;
  durationText?: string | undefined;
};

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "VetNow Assistant — AI pet symptom triage" },
      {
        name: "description",
        content:
          "Describe your pet's symptoms and get an urgency assessment, follow-up questions and a structured clinical handoff note for your veterinarian.",
      },
      { property: "og:title", content: "VetNow Assistant — AI pet symptom triage" },
      {
        property: "og:description",
        content: "Turn a worried description into a clear handoff note your vet can read in seconds.",
      },
    ],
  }),
  component: AssistantPage,
});

const URGENCY_STYLE: Record<TriageResult["urgency"], { class: string; label: string }> = {
  EMERGENCY: { class: "border-emergency/40 bg-emergency-soft text-emergency", label: "Emergency — seek care now" },
  URGENT: { class: "border-busy/50 bg-busy-soft text-busy-foreground", label: "Urgent — see a vet within 24 hours" },
  ROUTINE: { class: "border-available/40 bg-available-soft text-available-foreground", label: "Routine — book at your convenience" },
};

function AssistantPage() {
  const { user, loading } = useSession();
  const triage = useServerFn(triageCase);
  const listPets = useServerFn(listMyPets);

  const pets = useQuery({
    queryKey: ["my-pets"],
    queryFn: () => listPets(),
    enabled: Boolean(user),
  });

  const [petId, setPetId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");

  const mutation = useMutation({
    mutationFn: (input: TriageInput) => triage({ data: input }),
    onError: (error: Error) => toast.error(error.message),
  });

  const selectedPet = pets.data?.find((p) => p.id === petId);
  const result = mutation.data;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      description: description.trim(),
      durationText: duration || undefined,
      petName: selectedPet?.name,
      species: selectedPet?.species ?? (species || undefined),
      breed: selectedPet?.breed ?? (breed || undefined) ?? undefined,
      ageText: selectedPet?.birth_date ?? undefined,
      weightKg: selectedPet?.weight_kg ?? undefined,
      allergies: selectedPet?.allergies ?? undefined,
      conditions: selectedPet?.conditions ?? undefined,
      medications: selectedPet?.medications ?? undefined,
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Bot className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-extrabold">VetNow Assistant</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Describe what's happening in plain words. The assistant assesses urgency and writes a
            structured handoff note for the vet. It never diagnoses or prescribes.
          </p>
        </div>
      </div>

      {!loading && !user && (
        <div className="surface-panel mt-8 p-6 text-center">
          <p className="font-display text-lg font-bold">Sign in to use the assistant</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your pet records make the handoff far more useful to the vet.
          </p>
          <Button asChild className="mt-4">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      )}

      {user && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <form className="surface-panel h-fit space-y-4 p-6" onSubmit={submit}>
            {pets.data && pets.data.length > 0 && (
              <div>
                <Label>Which pet?</Label>
                <Select value={petId} onValueChange={setPetId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select a pet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not saved / another animal</SelectItem>
                    {pets.data.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {speciesLabel(p.species)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!selectedPet && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="species">Species</Label>
                  <Input
                    id="species"
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    placeholder="Dog"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="breed">Breed</Label>
                  <Input
                    id="breed"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="Indie"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="duration">How long has this been going on?</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Since last night"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">What's happening?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
                rows={7}
                placeholder="She has vomited three times since morning, won't eat, and is very quiet. No blood in the vomit."
                className="mt-1.5"
              />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Assessing…" : "Assess and prepare handoff"}
            </Button>
            <p className="text-xs text-muted-foreground">
              If your pet is collapsing, struggling to breathe or bleeding heavily, skip this and go
              to an <Link to="/emergency" className="font-semibold text-emergency hover:underline">emergency clinic</Link> now.
            </p>
          </form>

          <div className="space-y-4">
            {!result && !mutation.isPending && (
              <div className="surface-panel p-6 text-sm text-muted-foreground">
                Your assessment will appear here: urgency, red flags, questions the vet will ask,
                safe holding measures, and a clinical handoff note you can attach to a booking.
              </div>
            )}
            {result && <TriagePanel result={result} />}
          </div>
        </div>
      )}
    </div>
  );
}

function TriagePanel({ result }: { result: TriageResult }) {
  const style = URGENCY_STYLE[result.urgency];

  function useForBooking() {
    sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({ summary: result.handoffSummary, consultationType: result.suggestedConsultationType }),
    );
    toast.success("Handoff saved — it will be attached to your next booking");
  }

  return (
    <>
      <div className={`rounded-2xl border p-5 ${style.class}`}>
        <p className="inline-flex items-center gap-2 font-display text-lg font-bold">
          {result.urgency === "EMERGENCY" ? <Siren className="size-5" /> : <AlertTriangle className="size-5" />}
          {style.label}
        </p>
        <p className="mt-2 text-sm text-foreground">{result.urgencyReason}</p>
        {result.urgency === "EMERGENCY" && (
          <Button asChild className="mt-4" variant="outline">
            <Link to="/emergency">Emergency clinics near you</Link>
          </Button>
        )}
      </div>

      <Section title="Summary">
        <p className="text-sm text-muted-foreground">{result.summary}</p>
      </Section>

      {result.redFlags.length > 0 && (
        <Section title="Watch for">
          <List items={result.redFlags} dot="bg-emergency" />
        </Section>
      )}

      {result.followUpQuestions.length > 0 && (
        <Section title="The vet will likely ask">
          <List items={result.followUpQuestions} dot="bg-primary" />
        </Section>
      )}

      {result.homeCareAdvice.length > 0 && (
        <Section title="Until you're seen">
          <List items={result.homeCareAdvice} dot="bg-available" />
        </Section>
      )}

      <Section title="Suggested care">
        <p className="text-sm text-muted-foreground">
          {consultationLabel(result.suggestedConsultationType)}
          {result.suggestedSpecialties.length > 0 && ` · ${result.suggestedSpecialties.join(", ")}`}
        </p>
        <Button asChild size="sm" className="mt-3">
          <Link to="/find">Find a matching vet</Link>
        </Button>
      </Section>

      <Section title="Clinical handoff note">
        <pre className="whitespace-pre-wrap rounded-xl bg-secondary p-4 text-xs leading-relaxed text-secondary-foreground">
          {result.handoffSummary}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            navigator.clipboard.writeText(result.handoffSummary);
            toast.success("Handoff note copied");
          }}>
            <Copy className="size-4" />
            Copy
          </Button>
          <Button size="sm" onClick={useForBooking}>
            <ClipboardCheck className="size-4" />
            Attach to my next booking
          </Button>
        </div>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-panel p-5">
      <h2 className="font-display text-base font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function List({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm text-muted-foreground">
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

*/
