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

export const VET_DOC_KINDS = ["degree", "registration", "gov_id", "selfie", "clinic"] as const;
export type VetDocKind = (typeof VET_DOC_KINDS)[number];

export type PendingVetVerification = {
  id: string;
  user_id: string | null;
  full_name: string;
  qualification: string;
  registration_number: string | null;
  verification_notes: string | null;
  verification_submitted_at: string | null;
  specialties: string[];
  experience_years: number;
  phone: string | null;
  created_at: string;
  documents: { kind: string; url: string | null }[];
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
        registrationNumber: z.string().trim().min(3).max(60),
        experienceYears: z.number().int().min(0).max(60),
        specialties: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
        petTypes: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
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
      registration_number: data.registrationNumber,
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
      .upsert(
        { user_id: context.userId, role: "vet" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

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
    if (data.status !== "OFFLINE") {
      const { data: vet, error: vetError } = await context.supabase
        .from("vets")
        .select("verification")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (vetError) throw new Error(vetError.message);
      if (!vet) throw new Error("Create your veterinarian profile first");
      if (vet.verification !== "VERIFIED") {
        throw new Error("Your profile must be verified before you can go live");
      }
    }

    const { error } = await context.supabase
      .from("vets")
      .update({ current_status: data.status, status_updated_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setVetAcceptsEmergency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accepts: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vets")
      .update({ accepts_emergency: data.accepts })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyVetDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Tables<"vet_documents">[]> => {
    const { data: vet, error: vetError } = await context.supabase
      .from("vets")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (vetError) throw new Error(vetError.message);
    if (!vet) return [];

    const { data, error } = await context.supabase
      .from("vet_documents")
      .select("*")
      .eq("vet_id", vet.id)
      .order("uploaded_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const REQUIRED_DOC_KINDS: VetDocKind[] = ["degree", "registration", "gov_id"];

export const submitVetVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        registrationNumber: z.string().trim().min(3).max(60),
        notes: z.string().trim().max(1000).optional(),
        documents: z
          .array(
            z.object({
              kind: z.enum(VET_DOC_KINDS),
              filePath: z.string().trim().min(1).max(400),
            }),
          )
          .min(1)
          .max(VET_DOC_KINDS.length),
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

    const kinds = new Set(data.documents.map((d) => d.kind));
    const missing = REQUIRED_DOC_KINDS.filter((k) => !kinds.has(k));
    if (missing.length > 0) {
      throw new Error(`Upload all required documents first: ${missing.join(", ")}`);
    }
    for (const doc of data.documents) {
      if (!doc.filePath.startsWith(`${context.userId}/`)) {
        throw new Error("Invalid document path");
      }
    }

    const { error: docError } = await context.supabase.from("vet_documents").upsert(
      data.documents.map((d) => ({
        vet_id: vet.id,
        kind: d.kind,
        file_path: d.filePath,
        uploaded_at: new Date().toISOString(),
      })),
      { onConflict: "vet_id,kind" },
    );
    if (docError) throw new Error(docError.message);

    const { error } = await context.supabase
      .from("vets")
      .update({
        registration_number: data.registrationNumber,
        verification_notes: data.notes || null,
        verification: "PENDING",
        verification_reason: null,
        verification_submitted_at: new Date().toISOString(),
      })
      .eq("id", vet.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPendingVetVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PendingVetVerification[]> => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Admin access required");

    const { data: vets, error } = await context.supabase
      .from("vets")
      .select(
        "id, user_id, full_name, qualification, registration_number, verification_notes, verification_submitted_at, specialties, experience_years, phone, created_at",
      )
      .eq("verification", "PENDING")
      .not("verification_submitted_at", "is", null)
      .order("verification_submitted_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = vets ?? [];
    const vetIds = rows.map((v) => v.id);
    let docs: Tables<"vet_documents">[] = [];
    if (vetIds.length > 0) {
      const { data: docRows } = await context.supabase
        .from("vet_documents")
        .select("*")
        .in("vet_id", vetIds);
      docs = docRows ?? [];
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const urlByPath = new Map<string, string | null>();
    for (const doc of docs) {
      if (urlByPath.has(doc.file_path)) continue;
      const { data: signed } = await supabaseAdmin.storage
        .from("vet-documents")
        .createSignedUrl(doc.file_path, 3600);
      urlByPath.set(doc.file_path, signed?.signedUrl ?? null);
    }

    return rows.map((v) => ({
      ...v,
      documents: docs
        .filter((d) => d.vet_id === v.id)
        .map((d) => ({ kind: d.kind, url: urlByPath.get(d.file_path) ?? null })),
    }));
  });

export const reviewVetVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        vetId: z.string().uuid(),
        decision: z.enum(["VERIFIED", "REJECTED"]),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Admin access required");
    if (data.decision === "REJECTED" && (!data.reason || data.reason.trim().length < 3)) {
      throw new Error("A rejection reason is required");
    }

    const { error } = await context.supabase
      .from("vets")
      .update({
        verification: data.decision,
        verification_reason: data.decision === "REJECTED" ? (data.reason ?? null) : null,
        verification_reviewed_at: new Date().toISOString(),
        verification_reviewed_by: context.userId,
      })
      .eq("id", data.vetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
