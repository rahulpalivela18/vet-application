import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const hoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opens: z.string().regex(timeRe, "Invalid time"),
  closes: z.string().regex(timeRe, "Invalid time"),
});

export const listMyWorkingHours = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: vet } = await context.supabase
      .from("vets")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!vet) return [];
    const { data, error } = await context.supabase
      .from("vet_working_hours")
      .select("id, day_of_week, opens, closes")
      .eq("vet_id", vet.id)
      .order("day_of_week");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveMyWorkingHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ hours: z.array(hoursSchema).max(7) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: vet } = await context.supabase
      .from("vets")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!vet) throw new Error("Create your veterinarian profile first");

    for (const h of data.hours) {
      if (h.opens >= h.closes) throw new Error("Closing time must be after opening time");
    }

    const { error: delError } = await context.supabase
      .from("vet_working_hours")
      .delete()
      .eq("vet_id", vet.id);
    if (delError) throw new Error(delError.message);

    if (data.hours.length > 0) {
      const { error } = await context.supabase.from("vet_working_hours").insert(
        data.hours.map((h) => ({
          vet_id: vet.id,
          day_of_week: h.dayOfWeek,
          opens: h.opens,
          closes: h.closes,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
