import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Phone, Siren, MapPin, Clock } from "lucide-react";
import { listEmergencyOptions } from "@/lib/vets.functions";
import { VetCard } from "@/components/vetnow/vet-card";
import { Button } from "@/components/ui/button";

const emergencyQuery = queryOptions({
  queryKey: ["emergency-options"],
  queryFn: () => listEmergencyOptions(),
  refetchInterval: 30_000,
});

const RED_FLAGS = [
  "Difficulty breathing, blue or pale gums",
  "Seizures or collapse",
  "Bloated, hard abdomen with unproductive retching",
  "Suspected poisoning or toxin ingestion",
  "Road accident, fall or major bleeding",
  "Unable to urinate (especially male cats)",
  "Heatstroke or prolonged high temperature",
  "Difficult labour / whelping longer than an hour",
];

export const Route = createFileRoute("/emergency")({
  loader: ({ context }) => context.queryClient.ensureQueryData(emergencyQuery),
  head: () => ({
    meta: [
      { title: "Pet emergency help in Visakhapatnam | VetNow" },
      {
        name: "description",
        content:
          "Emergency-ready veterinarians and 24x7 animal hospitals in Visakhapatnam, with red-flag signs and what to do on the way.",
      },
      { property: "og:title", content: "Pet emergency help | VetNow" },
      {
        property: "og:description",
        content: "Emergency-ready vets and 24x7 clinics, listed live.",
      },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const { data } = useSuspenseQuery(emergencyQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-2xl border border-emergency/30 bg-emergency-soft p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emergency text-emergency-foreground">
            <Siren className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-emergency">
              Emergency veterinary care
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-foreground">
              If your pet shows any red-flag sign below, travel to the nearest emergency hospital
              now and call ahead while someone else drives. VetNow does not diagnose or prescribe —
              it only helps you reach care faster.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="font-display text-xl font-bold">Emergency-ready vets online now</h2>
          {data.vets.length === 0 ? (
            <p className="surface-panel mt-4 p-6 text-sm text-muted-foreground">
              No individual vet is flagged emergency-ready this minute. Go straight to a 24x7
              hospital listed on the right.
            </p>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {data.vets.map((vet) => (
                <VetCard key={vet.id} vet={vet} />
              ))}
            </div>
          )}

          <h2 className="mt-10 font-display text-xl font-bold">Red-flag signs</h2>
          <ul className="surface-panel mt-4 grid gap-2 p-6 sm:grid-cols-2">
            {RED_FLAGS.map((f) => (
              <li key={f} className="flex gap-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emergency" />
                {f}
              </li>
            ))}
          </ul>

          <div className="surface-panel mt-6 p-6">
            <h2 className="font-display text-lg font-bold">While you travel</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Keep the animal warm, quiet and restrained; avoid food and water.</li>
              <li>Do not give any human medicine — many are toxic to pets.</li>
              <li>Bring the packet or photo of anything they may have eaten.</li>
              <li>Call ahead so the clinic can prepare before you arrive.</li>
            </ul>
            <Button asChild variant="outline" className="mt-5">
              <Link to="/assistant">Use the assistant to prepare a handoff note</Link>
            </Button>
          </div>
        </div>

        <aside>
          <h2 className="font-display text-xl font-bold">24x7 &amp; emergency clinics</h2>
          <div className="mt-4 space-y-4">
            {data.clinics.map((c) => (
              <div key={c.id} className="surface-panel p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-bold">{c.name}</h3>
                  {c.is_24x7 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-available-soft px-2 py-0.5 text-xs font-semibold text-available-foreground">
                      <Clock className="size-3" />
                      24x7
                    </span>
                  )}
                </div>
                <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {c.address}, {c.area}
                  </span>
                </p>
                {c.phone && (
                  <Button asChild size="sm" className="mt-4 w-full">
                    <a href={`tel:${c.phone}`}>
                      <Phone className="size-4" />
                      {c.phone}
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
