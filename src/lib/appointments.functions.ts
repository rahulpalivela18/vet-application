import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type MyAppointment = Tables<"appointments"> & {
  vet: (Pick<Tables<"vets">, "id" | "full_name" | "qualification"> & {
    clinic: Pick<Tables<"clinics">, "name" | "area"> | null;
  }) | null;
  pet: Pick<Tables<"pets">, "id" | "name" | "species"> | null;
  review: Pick<Tables<"reviews">, "id"> | null;
};

export type VetAppointment = Tables<"appointments"> & {
  pet: Tables<"pets"> | null;
  ownerName: string | null;
};

export const createAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        vetId: z.string().uuid(),
        petId: z.string().uuid().optional(),
        scheduledAt: z.string().min(1),
        consultationType: z.enum(["clinic", "video", "home"]),
        reason: z.string().trim().min(5).max(2000),
        handoffSummary: z.string().trim().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: vet, error: vetError } = await context.supabase
      .from("vets")
      .select("id, consultation_fee, home_visit_fee, consultation_types, current_status")
      .eq("id", data.vetId)
      .single();
    if (vetError || !vet) throw new Error("Veterinarian not found");
    if (!vet.consultation_types.includes(data.consultationType)) {
      throw new Error("This consultation type is not offered by the selected vet");
    }
    if (vet.current_status === "OFFLINE") {
      throw new Error("This veterinarian is currently offline");
    }
    const scheduled = new Date(data.scheduledAt);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now() - 5 * 60 * 1000) {
      throw new Error("Please pick a valid future time");
    }
    const price =
      data.consultationType === "home"
        ? (vet.home_visit_fee ?? vet.consultation_fee)
        : vet.consultation_fee;

    const { data: appointment, error } = await context.supabase
      .from("appointments")
      .insert({
        owner_id: context.userId,
        vet_id: data.vetId,
        pet_id: data.petId ?? null,
        scheduled_at: scheduled.toISOString(),
        consultation_type: data.consultationType,
        reason: data.reason,
        handoff_summary: data.handoffSummary ?? null,
        price,
        status: "PENDING",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: appointment.id };
  });

export const listMyAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAppointment[]> => {
    const { data, error } = await context.supabase
      .from("appointments")
      .select(
        "*, vet:vets(id, full_name, qualification, clinic:clinics(name, area)), pet:pets(id, name, species), review:reviews(id)",
      )
      .eq("owner_id", context.userId)
      .order("scheduled_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as MyAppointment[];
  });

export const cancelMyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("appointments")
      .update({ status: "CANCELLED" })
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .in("status", ["PENDING", "CONFIRMED"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVetAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VetAppointment[]> => {
    const { data: vet } = await context.supabase
      .from("vets")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!vet) return [];

    const { data: appointments, error } = await context.supabase
      .from("appointments")
      .select("*, pet:pets(*)")
      .eq("vet_id", vet.id)
      .order("scheduled_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = appointments ?? [];
    const ownerIds = [...new Set(rows.map((a) => a.owner_id))];
    const nameById = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ownerIds);
      for (const p of profiles ?? []) {
        if (p.full_name) nameById.set(p.id, p.full_name);
      }
    }
    return rows.map((a) => ({
      ...a,
      ownerName: nameById.get(a.owner_id) ?? null,
    })) as VetAppointment[];
  });

export const setAppointmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["CONFIRMED", "DECLINED", "COMPLETED"]) as z.ZodType<
          Extract<Enums<"appointment_status">, "CONFIRMED" | "DECLINED" | "COMPLETED">
        >,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS restricts this update to the vet who owns the appointment.
    const { error } = await context.supabase
      .from("appointments")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        appointmentId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        tags: z.array(z.string().max(40)).max(6).default([]),
        comment: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: appointment, error: apptError } = await context.supabase
      .from("appointments")
      .select("id, vet_id, status")
      .eq("id", data.appointmentId)
      .eq("owner_id", context.userId)
      .single();
    if (apptError || !appointment) throw new Error("Appointment not found");
    if (appointment.status !== "COMPLETED") {
      throw new Error("You can review only after a completed consultation");
    }

    const { error } = await context.supabase.from("reviews").insert({
      appointment_id: data.appointmentId,
      author_id: context.userId,
      vet_id: appointment.vet_id,
      rating: data.rating,
      tags: data.tags,
      comment: data.comment || null,
    });
    if (error) throw new Error(error.message);

    // Recompute the vet's public rating aggregate (privileged maintenance write).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ratings } = await supabaseAdmin
      .from("reviews")
      .select("rating")
      .eq("vet_id", appointment.vet_id);
    const all = (ratings ?? []).map((r) => r.rating);
    const avg = all.length > 0 ? Math.round((all.reduce((s, r) => s + r, 0) / all.length) * 10) / 10 : null;
    await supabaseAdmin
      .from("vets")
      .update({ rating: avg, review_count: all.length })
      .eq("id", appointment.vet_id);

    return { ok: true };
  });
