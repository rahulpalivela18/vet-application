import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { Activity, Bot, MapPin, Siren, Stethoscope, Video } from "lucide-react";
import { getAvailabilityStats, listVets } from "@/lib/vets.functions";
import { VetCard } from "@/components/vetnow/vet-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const statsQuery = queryOptions({
  queryKey: ["availability-stats"],
  queryFn: () => getAvailabilityStats(),
  refetchInterval: 60_000,
});

const availableVetsQuery = queryOptions({
  queryKey: ["vets", "home"],
  queryFn: () => listVets({ data: {} }),
  refetchInterval: 60_000,
});

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(statsQuery),
      context.queryClient.ensureQueryData(availableVetsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "VetNow — See which vets are available right now" },
      {
        name: "description",
        content:
          "Live veterinarian availability across Visakhapatnam. AI-structured symptom handoffs, emergency routing, and clinic, video or home consultations.",
      },
      { property: "og:title", content: "VetNow — Live vet availability" },
      {
        property: "og:description",
        content:
          "Find an available veterinarian in minutes, not phone calls. Live status, AI triage and instant booking.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Activity className="size-3.5 text-primary" />
              Live availability · Visakhapatnam
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Your vet is busy.
              <br />
              <span className="text-primary">Someone nearby isn't.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              VetNow shows which veterinarians are actually available right now — not just who has
              a listing. Describe the problem once, and our assistant turns it into a clear clinical
              handoff before you even reach the clinic.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/find">
                  <Stethoscope className="size-4" />
                  Find an available vet
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-emergency/40 text-emergency hover:bg-emergency-soft hover:text-emergency">
                <Link to="/emergency">
                  <Siren className="size-4" />
                  Emergency now
                </Link>
              </Button>
            </div>
          </div>
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
            <LiveStats />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Activity,
              title: "Real-time status",
              body: "Every vet shows as Available, Busy, Emergency-only or Offline, updated by the vet themselves — so you stop guessing and stop calling.",
            },
            {
              icon: Bot,
              title: "AI mediator",
              body: "Describe symptoms in your own words. The assistant assesses urgency, asks what a vet would ask, and writes a structured handoff note.",
            },
            {
              icon: Video,
              title: "Consult your way",
              body: "Clinic visit, video consult or home visit — filtered by what each vet actually offers, with fees shown up front.",
            },
          ].map((f) => (
            <div key={f.title} className="surface-panel p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Vets ranked by availability</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Available first, then emergency-only, then busy. Never a static directory.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/find">
                <MapPin className="size-4" />
                Browse all vets
              </Link>
            </Button>
          </div>
          <Suspense fallback={<Skeleton className="mt-8 h-72 w-full rounded-2xl" />}>
            <TopVets />
          </Suspense>
        </div>
      </section>
    </>
  );
}

function LiveStats() {
  const { data } = useSuspenseQuery(statsQuery);
  const items = [
    { label: "Available now", value: data.available, tone: "text-available" },
    { label: "Emergency ready", value: data.emergencyOnly, tone: "text-emergency" },
    { label: "Busy", value: data.busy, tone: "text-busy-foreground" },
    { label: "Offline", value: data.offline, tone: "text-muted-foreground" },
  ];
  return (
    <div className="surface-panel self-start p-6">
      <p className="text-sm font-semibold">Right now in Visakhapatnam</p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl border border-border bg-background p-4">
            <p className={`font-display text-3xl font-extrabold ${i.tone}`}>{i.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{i.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        {data.total} registered veterinarians · {data.emergencyClinics} emergency / 24x7 clinics
      </p>
    </div>
  );
}

function TopVets() {
  const { data } = useSuspenseQuery(availableVetsQuery);
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {data.slice(0, 6).map((vet) => (
        <VetCard key={vet.id} vet={vet} />
      ))}
    </div>
  );
}
