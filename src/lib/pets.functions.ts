import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Tables } from "@/integrations/supabase/types";

export type Pet = Tables<"pets">;

const petInput = {
  name: z.string().trim().min(1).max(80),
  species: z.enum(["dog", "cat", "rabbit", "bird", "other"]),
  breed: z.string().trim().max(80).optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  birthDate: z.string().optional(),
  weightKg: z.number().positive().max(500).optional(),
  allergies: z.string().trim().max(500).optional(),
  conditions: z.string().trim().max(500).optional(),
  medications: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  previousVet: z.string().trim().max(120).optional(),
};

export const listMyPets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Pet[]> => {
    const { data, error } = await context.supabase
      .from("pets")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object(petInput).parse(input))
  .handler(async ({ data, context }): Promise<Pet> => {
    const { data: pet, error } = await context.supabase
      .from("pets")
      .insert({
        owner_id: context.userId,
        name: data.name,
        species: data.species,
        breed: data.breed || null,
        sex: data.sex ?? null,
        birth_date: data.birthDate || null,
        weight_kg: data.weightKg ?? null,
        allergies: data.allergies || null,
        conditions: data.conditions || null,
        medications: data.medications || null,
        notes: data.notes || null,
        previous_vet: data.previousVet || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return pet;
  });

export const updatePet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), ...petInput }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Pet> => {
    const { data: pet, error } = await context.supabase
      .from("pets")
      .update({
        name: data.name,
        species: data.species,
        breed: data.breed || null,
        sex: data.sex ?? null,
        birth_date: data.birthDate || null,
        weight_kg: data.weightKg ?? null,
        allergies: data.allergies || null,
        conditions: data.conditions || null,
        medications: data.medications || null,
        notes: data.notes || null,
        previous_vet: data.previousVet || null,
      })
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return pet;
  });

export const deletePet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pets")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
