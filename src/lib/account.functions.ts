import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type MyAccount = {
  profile: Tables<"profiles"> | null;
  roles: Enums<"app_role">[];
  vet: Tables<"vets"> | null;
  email: string | null;
};

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAccount> => {
    const [{ data: profile }, { data: roles }, { data: vet }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("vets").select("*").eq("user_id", context.userId).maybeSingle(),
    ]);
    return {
      profile: profile ?? null,
      roles: (roles ?? []).map((r) => r.role),
      vet: vet ?? null,
      email: (context.claims["email"] as string | undefined) ?? null,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(1).max(120),
        phone: z.string().trim().max(20).optional(),
        area: z.string().trim().max(80).optional(),
        city: z.string().trim().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone || null,
        area: data.area || null,
        city: data.city || null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createVetProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(3).max(120),
        qualification: z.string().trim().min(2).max(160),
        registrationNumber: z.string().trim().max(60).optional(),
        experienceYears: z.number().int().min(0).max(60),
        specialties: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
        petTypes: z.array(z.enum(["dog", "cat", "rabbit", "bird", "other"])).min(1),
        consultationTypes: z.array(z.enum(["clinic", "video", "home"])).min(1),
        consultationFee: z.number().int().min(0).max(100000),
        homeVisitFee: z.number().int().min(0).max(100000).optional(),
        phone: z.string().trim().max(20).optional(),
        bio: z.string().trim().max(1000).optional(),
        acceptsEmergency: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("vets")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) throw new Error("You already have a veterinarian profile");

    const { error } = await context.supabase.from("vets").insert({
      user_id: context.userId,
      full_name: data.fullName,
      qualification: data.qualification,
      registration_number: data.registrationNumber || null,
      experience_years: data.experienceYears,
      specialties: data.specialties,
      pet_types: data.petTypes,
      consultation_types: data.consultationTypes,
      consultation_fee: data.consultationFee,
      home_visit_fee: data.homeVisitFee ?? null,
      phone: data.phone || null,
      bio: data.bio || null,
      accepts_emergency: data.acceptsEmergency,
      current_status: "OFFLINE",
      verification: "PENDING",
      is_demo: false,
    });
    if (error) throw new Error(error.message);

    // Grant the vet role (privileged write; self-service vet onboarding only).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "vet" }, { onConflict: "user_id,role", ignoreDuplicates: true });

    return { ok: true };
  });

export const updateVetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(["AVAILABLE", "BUSY", "OFFLINE", "EMERGENCY_ONLY"]) as z.ZodType<
          Enums<"vet_status">
        >,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vets")
      .update({ current_status: data.status, status_updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitVetVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        registrationNumber: z.string().trim().min(3).max(60),
        notes: z.string().trim().min(10).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: vet, error: fetchError } = await context.supabase
      .from("vets")
      .select("id, verification")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!vet) throw new Error("Create your veterinarian profile first");
    if (vet.verification === "VERIFIED") throw new Error("Your profile is already verified");

    const { error } = await context.supabase
      .from("vets")
      .update({
        registration_number: data.registrationNumber,
        verification_notes: data.notes,
        verification: "PENDING",
      })
      .eq("id", vet.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
