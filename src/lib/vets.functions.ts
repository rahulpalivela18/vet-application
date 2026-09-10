import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicSupabase } from "./supabase-public.server";
import { VET_STATUS_META, type VetStatus } from "./format";
import type { Tables } from "@/integrations/supabase/types";

export type VetWithClinic = Tables<"vets"> & { clinic: Tables<"clinics"> | null };
export type VetReview = Tables<"reviews">;
export type WorkingHours = Tables<"vet_working_hours">;

export type VetFilters = {
  query?: string;
  status?: VetStatus;
  petType?: string;
  consultationType?: string;
  specialty?: string;
  area?: string;
  maxFee?: number;
  emergency?: boolean;
};

function sortByAvailability<T extends { current_status: VetStatus; rating: number | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const rankDiff = VET_STATUS_META[a.current_status].rank - VET_STATUS_META[b.current_status].rank;
    if (rankDiff !== 0) return rankDiff;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}

export const listVets = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        query: z.string().trim().max(120).optional(),
        status: z.enum(["AVAILABLE", "BUSY", "OFFLINE", "EMERGENCY_ONLY"]).optional(),
        petType: z.string().optional(),
        consultationType: z.string().optional(),
        specialty: z.string().optional(),
        area: z.string().optional(),
        maxFee: z.number().int().positive().optional(),
        emergency: z.boolean().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<VetWithClinic[]> => {
    const supabase = createPublicSupabase();
    let query = supabase.from("vets").select("*, clinic:clinics(*)");

    if (data.status) query = query.eq("current_status", data.status);
    if (data.petType) query = query.contains("pet_types", [data.petType]);
    if (data.consultationType) query = query.contains("consultation_types", [data.consultationType]);
    if (data.specialty) query = query.contains("specialties", [data.specialty]);
    if (data.maxFee) query = query.lte("consultation_fee", data.maxFee);
    if (data.emergency) {
      query = query.or(
        "and(current_status.eq.AVAILABLE,accepts_emergency.eq.true),current_status.eq.EMERGENCY_ONLY",
      );
    }
    if (data.query) {
      const q = data.query.replace(/[%,.()]/g, "");
      if (q) query = query.or(`full_name.ilike.%${q}%,bio.ilike.%${q}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    let vets = (rows ?? []) as VetWithClinic[];
    if (data.area) {
      const area = data.area.toLowerCase();
      vets = vets.filter((v) => v.clinic?.area.toLowerCase() === area);
    }
    return sortByAvailability(vets);
  });

export const listAreas = createServerFn({ method: "GET" }).handler(async (): Promise<string[]> => {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase.from("clinics").select("area");
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((c) => c.area))].sort();
});

export const getVetById = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(
    async ({
      data,
    }): Promise<{
      vet: VetWithClinic | null;
      hours: WorkingHours[];
      reviews: VetReview[];
    }> => {
      const supabase = createPublicSupabase();
      const [{ data: vet, error }, { data: hours }, { data: reviews }] = await Promise.all([
        supabase.from("vets").select("*, clinic:clinics(*)").eq("id", data.id).maybeSingle(),
        supabase
          .from("vet_working_hours")
          .select("*")
          .eq("vet_id", data.id)
          .order("day_of_week"),
        supabase
          .from("reviews")
          .select("*")
          .eq("vet_id", data.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (error) throw new Error(error.message);
      return {
        vet: (vet as VetWithClinic | null) ?? null,
        hours: hours ?? [],
        reviews: reviews ?? [],
      };
    },
  );

export const getAvailabilityStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    total: number;
    available: number;
    emergencyOnly: number;
    busy: number;
    offline: number;
    emergencyClinics: number;
  }> => {
    const supabase = createPublicSupabase();
    const [{ data: vets }, { data: clinics }] = await Promise.all([
      supabase.from("vets").select("current_status"),
      supabase.from("clinics").select("is_24x7, is_emergency"),
    ]);
    const rows = vets ?? [];
    const count = (s: VetStatus) => rows.filter((v) => v.current_status === s).length;
    return {
      total: rows.length,
      available: count("AVAILABLE"),
      emergencyOnly: count("EMERGENCY_ONLY"),
      busy: count("BUSY"),
      offline: count("OFFLINE"),
      emergencyClinics: (clinics ?? []).filter((c) => c.is_24x7 || c.is_emergency).length,
    };
  },
);

export const listEmergencyOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ vets: VetWithClinic[]; clinics: Tables<"clinics">[] }> => {
    const supabase = createPublicSupabase();
    const [{ data: vets, error }, { data: clinics }] = await Promise.all([
      supabase
        .from("vets")
        .select("*, clinic:clinics(*)")
        .eq("accepts_emergency", true)
        .in("current_status", ["AVAILABLE", "EMERGENCY_ONLY"]),
      supabase
        .from("clinics")
        .select("*")
        .or("is_emergency.eq.true,is_24x7.eq.true")
        .order("name"),
    ]);
    if (error) throw new Error(error.message);
    return {
      vets: sortByAvailability((vets ?? []) as VetWithClinic[]),
      clinics: clinics ?? [],
    };
  },
);
