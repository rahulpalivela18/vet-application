import { createFileRoute } from "@tanstack/react-router";
import { useQuery, queryOptions, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { listAreas, listVets, type VetFilters } from "@/lib/vets.functions";
import { VetCard } from "@/components/vetnow/vet-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONSULTATION_TYPES, SPECIES_OPTIONS, VET_STATUS_META, type VetStatus } from "@/lib/format";

const SPECIALTIES = [
  "Internal medicine",
  "Preventive care",
  "Surgery",
  "Orthopaedics",
  "Dermatology",
  "Emergency care",
  "Critical care",
  "Feline medicine",
  "Exotic pets",
  "Endocrinology",
];

const ANY = "any";

const areasQuery = queryOptions({
  queryKey: ["areas"],
  queryFn: () => listAreas(),
  staleTime: 10 * 60_000,
});

export const Route = createFileRoute("/find")({
  loader: ({ context }) => context.queryClient.ensureQueryData(areasQuery),
  head: () => ({
    meta: [
      { title: "Find an available vet in Visakhapatnam | VetNow" },
      {
        name: "description",
        content:
          "Filter veterinarians by live availability, area, species, specialty, consultation type and fee. Book clinic, video or home consults instantly.",
      },
      { property: "og:title", content: "Find an available vet | VetNow" },
      {
        property: "og:description",
        content: "Live availability-first veterinarian search across Visakhapatnam.",
      },
    ],
  }),
  component: FindPage,
});

function FindPage() {
  const [filters, setFilters] = useState<VetFilters>({});
  const [queryText, setQueryText] = useState("");
  const { data: areas = [] } = useQuery(areasQuery);

  const vets = useQuery({
    queryKey: ["vets", filters],
    queryFn: () => listVets({ data: filters }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  function set<K extends keyof VetFilters>(key: K, value: VetFilters[K]) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  const rows = vets.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold">Find a vet</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Results are ordered by live availability — available vets first.
      </p>

      <form
        className="surface-panel mt-6 flex flex-col gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          set("query", queryText.trim() || undefined);
        }}
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search by vet name or keyword"
              className="pl-9"
              aria-label="Search veterinarians"
            />
          </div>
          <Button type="submit">Search</Button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <SlidersHorizontal className="size-3.5" />
          Filters
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterSelect
            label="Availability"
            value={filters.status ?? ANY}
            onChange={(v) => set("status", v === ANY ? undefined : (v as VetStatus))}
            options={[
              { value: ANY, label: "Any status" },
              ...(Object.keys(VET_STATUS_META) as VetStatus[]).map((s) => ({
                value: s,
                label: VET_STATUS_META[s].short,
              })),
            ]}
          />
          <FilterSelect
            label="Area"
            value={filters.area ?? ANY}
            onChange={(v) => set("area", v === ANY ? undefined : v)}
            options={[{ value: ANY, label: "All areas" }, ...areas.map((a) => ({ value: a, label: a }))]}
          />
          <FilterSelect
            label="Pet type"
            value={filters.petType ?? ANY}
            onChange={(v) => set("petType", v === ANY ? undefined : v)}
            options={[
              { value: ANY, label: "Any pet" },
              ...SPECIES_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
          <FilterSelect
            label="Consultation"
            value={filters.consultationType ?? ANY}
            onChange={(v) => set("consultationType", v === ANY ? undefined : v)}
            options={[
              { value: ANY, label: "Any format" },
              ...CONSULTATION_TYPES.map((c) => ({ value: c.value, label: c.label })),
            ]}
          />
          <FilterSelect
            label="Specialty"
            value={filters.specialty ?? ANY}
            onChange={(v) => set("specialty", v === ANY ? undefined : v)}
            options={[
              { value: ANY, label: "Any specialty" },
              ...SPECIALTIES.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-primary)]"
              checked={Boolean(filters.emergency)}
              onChange={(e) => set("emergency", e.target.checked ? true : undefined)}
            />
            Emergency-ready only
          </label>
          <FilterSelect
            label="Max fee"
            value={filters.maxFee ? String(filters.maxFee) : ANY}
            onChange={(v) => set("maxFee", v === ANY ? undefined : Number(v))}
            options={[
              { value: ANY, label: "Any fee" },
              { value: "400", label: "Under ₹400" },
              { value: "600", label: "Under ₹600" },
              { value: "900", label: "Under ₹900" },
            ]}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setFilters({});
              setQueryText("");
            }}
          >
            Reset
          </Button>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {vets.isPending ? "Searching…" : `${rows.length} vet${rows.length === 1 ? "" : "s"} match`}
      </p>

      {vets.isPending ? (
        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="surface-panel mt-4 p-10 text-center">
          <p className="font-display text-lg font-bold">No vets match those filters</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try widening the area or removing the availability filter.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((vet) => (
            <VetCard key={vet.id} vet={vet} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
