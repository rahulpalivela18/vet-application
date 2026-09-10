import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PawPrint, Plus, Star, Trash2 } from "lucide-react";
import {
  cancelMyAppointment,
  createReview,
  listMyAppointments,
} from "@/lib/appointments.functions";
import { createPet, deletePet, listMyPets } from "@/lib/pets.functions";
import { getMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APPOINTMENT_STATUS_META,
  SPECIES_OPTIONS,
  consultationLabel,
  displayName,
  formatDateTime,
  formatFee,
  speciesLabel,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My dashboard | VetNow" },
      {
        name: "description",
        content: "Track your veterinary appointments, manage pet profiles and leave reviews.",
      },
      { property: "og:title", content: "My dashboard | VetNow" },
      { property: "og:description", content: "Your pets, appointments and reviews in one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const qc = useQueryClient();
  const fetchAppointments = useServerFn(listMyAppointments);
  const fetchPets = useServerFn(listMyPets);
  const fetchAccount = useServerFn(getMyAccount);

  const appointments = useQuery({ queryKey: ["my-appointments"], queryFn: () => fetchAppointments() });
  const pets = useQuery({ queryKey: ["my-pets"], queryFn: () => fetchPets() });
  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });

  const cancel = useServerFn(cancelMyAppointment);
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => {
      toast.success("Appointment cancelled");
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isVet = (account.data?.roles ?? []).includes("vet");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">My dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {account.data?.profile?.full_name
              ? `Welcome back, ${account.data.profile.full_name}.`
              : "Your pets, requests and consultations."}
          </p>
        </div>
        <div className="flex gap-2">
          {isVet ? (
            <Button asChild variant="outline">
              <Link to="/vet-console">Vet console</Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link to="/find">Find a vet</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="appointments" className="mt-8">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="pets">My pets</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-6 space-y-4">
          {appointments.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading appointments…</p>
          ) : (appointments.data ?? []).length === 0 ? (
            <div className="surface-panel p-8 text-center">
              <p className="font-display text-lg font-bold">No appointments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Find an available vet and send your first request.
              </p>
              <Button asChild className="mt-4">
                <Link to="/find">Find a vet</Link>
              </Button>
            </div>
          ) : (
            (appointments.data ?? []).map((a) => {
              const meta = APPOINTMENT_STATUS_META[a.status];
              return (
                <div key={a.id} className="surface-panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-bold">
                        {a.vet ? displayName(a.vet.full_name) : "Veterinarian"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(a.scheduled_at)} · {consultationLabel(a.consultation_type)}
                        {a.pet ? ` · ${a.pet.name} (${speciesLabel(a.pet.species)})` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-foreground">{a.reason}</p>
                  {a.handoff_summary ? (
                    <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-secondary p-3 font-mono text-xs text-muted-foreground">
                      {a.handoff_summary}
                    </pre>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      Fee <span className="font-semibold text-foreground">{formatFee(a.price ?? 0)}</span>
                    </p>
                    <div className="flex gap-2">
                      {a.status === "PENDING" || a.status === "CONFIRMED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(a.id)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                      {a.status === "COMPLETED" && !a.review ? (
                        <ReviewForm appointmentId={a.id} />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="pets" className="mt-6 space-y-4">
          <PetForm />
          {(pets.data ?? []).map((p) => (
            <PetRow key={p.id} id={p.id} name={p.name} species={p.species} breed={p.breed} />
          ))}
          {!pets.isLoading && (pets.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No pets added yet.</p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PetRow({
  id,
  name,
  species,
  breed,
}: {
  id: string;
  name: string;
  species: string;
  breed: string | null;
}) {
  const qc = useQueryClient();
  const remove = useServerFn(deletePet);
  const mutation = useMutation({
    mutationFn: () => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Pet removed");
      qc.invalidateQueries({ queryKey: ["my-pets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="surface-panel flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary">
          <PawPrint className="size-4 text-muted-foreground" />
        </span>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">
            {speciesLabel(species)}
            {breed ? ` · ${breed}` : ""}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function PetForm() {
  const qc = useQueryClient();
  const add = useServerFn(createPet);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [breed, setBreed] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      add({
        data: {
          name: name.trim(),
          species: species as "dog" | "cat" | "rabbit" | "bird" | "other",
          ...(breed.trim() ? { breed: breed.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Pet added");
      setName("");
      setBreed("");
      setNotes("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-pets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add a pet
      </Button>
    );
  }

  return (
    <form
      className="surface-panel space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pet-name">Name</Label>
          <Input id="pet-name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Species</Label>
          <Select value={species} onValueChange={setSpecies}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPECIES_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="pet-breed">Breed (optional)</Label>
        <Input id="pet-breed" value={breed} onChange={(e) => setBreed(e.target.value)} className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="pet-notes">Notes (optional)</Label>
        <Textarea id="pet-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save pet"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

const REVIEW_TAGS = [
  "On time",
  "Gentle with pet",
  "Explained clearly",
  "Fair pricing",
  "Quick response",
  "Would visit again",
];

function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const qc = useQueryClient();
  const submit = useServerFn(createReview);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          appointmentId,
          rating,
          tags,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Thanks for your review");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Star className="size-4" />
        Leave a review
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            className="p-1"
          >
            <Star className={n <= rating ? "size-5 fill-primary text-primary" : "size-5 text-muted-foreground"} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {REVIEW_TAGS.map((t) => {
          const active = tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setTags((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
      <Textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was the consultation?"
      />

      <div className="flex gap-2">
        <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          Submit review
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
