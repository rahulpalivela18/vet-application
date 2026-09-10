import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clock, IndianRupee, MapPin, Phone, Star } from "lucide-react";
import { getVetById } from "@/lib/vets.functions";
import { StatusBadge } from "@/components/vetnow/status-badge";
import { Button } from "@/components/ui/button";
import {
  consultationLabel,
  displayName,
  formatFee,
  initials,
  speciesLabel,
  timeAgo,
} from "@/lib/format";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const vetQuery = (id: string) =>
  queryOptions({
    queryKey: ["vet", id],
    queryFn: () => getVetById({ data: { id } }),
    refetchInterval: 60_000,
  });

export const Route = createFileRoute("/vets/$vetId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(vetQuery(params.vetId));
    if (!data.vet) throw notFound();
    return { name: displayName(data.vet.full_name), area: data.vet.clinic?.area ?? "Visakhapatnam" };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Vet unavailable | VetNow" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} — Veterinarian in ${loaderData.area} | VetNow`;
    const description = `Live availability, specialties, fees and reviews for ${loaderData.name}, veterinarian in ${loaderData.area}. Book a clinic, video or home consultation.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: VetDetail,
});

function VetDetail() {
  const { vetId } = Route.useParams();
  const { data } = useSuspenseQuery(vetQuery(vetId));
  const vet = data.vet;
  if (!vet) return null;
  const name = displayName(vet.full_name);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="surface-panel p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent font-display text-xl font-bold text-accent-foreground">
            {initials(vet.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold">{name}</h1>
            <p className="text-sm text-muted-foreground">{vet.qualification}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <StatusBadge status={vet.current_status} long />
              <span className="text-xs">updated {timeAgo(vet.status_updated_at)}</span>
              {vet.rating !== null && (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-4 fill-busy text-busy" />
                  <span className="font-medium text-foreground">{vet.rating.toFixed(1)}</span>
                  <span>({vet.review_count} reviews)</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" />
                {vet.experience_years} years experience
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="inline-flex items-center font-display text-2xl font-extrabold">
              <IndianRupee className="size-5" />
              {vet.consultation_fee}
            </p>
            <Button asChild disabled={vet.current_status === "OFFLINE"}>
              <Link to="/book/$vetId" params={{ vetId: vet.id }}>
                Book consultation
              </Link>
            </Button>
          </div>
        </div>

        {vet.bio && <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{vet.bio}</p>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="surface-panel p-6">
            <h2 className="font-display text-lg font-bold">Practice details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Specialties</dt>
                <dd className="mt-1 font-medium">{vet.specialties.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Treats</dt>
                <dd className="mt-1 font-medium">{vet.pet_types.map(speciesLabel).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Consultation formats</dt>
                <dd className="mt-1 font-medium">
                  {vet.consultation_types.map(consultationLabel).join(", ")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fees</dt>
                <dd className="mt-1 font-medium">
                  {formatFee(vet.consultation_fee)} consultation
                  {vet.home_visit_fee ? ` · ${formatFee(vet.home_visit_fee)} home visit` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Emergency cases</dt>
                <dd className="mt-1 font-medium">{vet.accepts_emergency ? "Accepted" : "Not accepted"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Verification</dt>
                <dd className="mt-1 font-medium capitalize">{vet.verification.toLowerCase()}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-panel p-6">
            <h2 className="font-display text-lg font-bold">Reviews</h2>
            {data.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {data.reviews.map((r) => (
                  <li key={r.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold">
                        <Star className="size-3.5 fill-busy text-busy" />
                        {r.rating}.0
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                    {r.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.tags.map((t) => (
                          <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {vet.clinic && (
            <section className="surface-panel p-6">
              <h2 className="font-display text-lg font-bold">{vet.clinic.name}</h2>
              <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {vet.clinic.address}, {vet.clinic.area}
                </span>
              </p>
              {vet.clinic.phone && (
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <a href={`tel:${vet.clinic.phone}`}>
                    <Phone className="size-4" />
                    {vet.clinic.phone}
                  </a>
                </Button>
              )}
            </section>
          )}

          <section className="surface-panel p-6">
            <h2 className="font-display text-lg font-bold">Working hours</h2>
            {data.hours.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Hours not published.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {data.hours.map((h) => (
                  <li key={h.id} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{DAYS[h.day_of_week]}</span>
                    <span className="font-medium">
                      {h.opens.slice(0, 5)} – {h.closes.slice(0, 5)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
