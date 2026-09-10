import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TriageResult = {
  urgency: "EMERGENCY" | "URGENT" | "ROUTINE";
  urgencyReason: string;
  summary: string;
  redFlags: string[];
  followUpQuestions: string[];
  suggestedSpecialties: string[];
  suggestedConsultationType: "clinic" | "video" | "home";
  homeCareAdvice: string[];
  handoffSummary: string;
};

const TriageSchema = z.object({
  urgency: z.enum(["EMERGENCY", "URGENT", "ROUTINE"]),
  urgencyReason: z.string(),
  summary: z.string(),
  redFlags: z.array(z.string()).max(6),
  followUpQuestions: z.array(z.string()).max(5),
  suggestedSpecialties: z.array(z.string()).max(4),
  suggestedConsultationType: z.enum(["clinic", "video", "home"]),
  homeCareAdvice: z.array(z.string()).max(5),
  handoffSummary: z.string(),
});

const SYSTEM_PROMPT = `You are the VetNow Assistant, an AI mediator between pet owners in Visakhapatnam, India and veterinarians.

Your job is NOT to diagnose or prescribe. Your job is to:
1. Assess urgency so the owner reaches the right level of care fast.
2. Turn a worried owner's messy description into a clear, structured clinical handoff a vet can read in 15 seconds.
3. Suggest what kind of vet and consultation format fits.

Rules:
- Never name specific drugs or dosages. Never give a definitive diagnosis.
- Classify urgency as EMERGENCY (needs care within the hour: breathing trouble, seizures, collapse, bloat, poisoning, trauma, unproductive retching, pale gums, uncontrolled bleeding, inability to urinate, heatstroke, whelping trouble), URGENT (should be seen within 24 hours), or ROUTINE.
- suggestedConsultationType: "video" for mild/visual issues and follow-ups, "clinic" when hands-on exam or diagnostics are needed, "home" when the animal is hard to transport or very stressed.
- suggestedSpecialties must be drawn from: Internal medicine, Preventive care, Surgery, Orthopaedics, Dermatology, Emergency care, Critical care, Feline medicine, Exotic pets, Endocrinology.
- followUpQuestions: what the vet would want answered that the owner has not said yet.
- homeCareAdvice: safe, non-pharmaceutical holding measures only. For EMERGENCY, this must focus on safe transport and not delaying care.
- handoffSummary: a compact clinical note for the vet, in plain text. Format as short labelled lines: Patient, Presenting complaint, Duration, Relevant history, Owner concern, Suggested focus. Use only facts the owner gave; write "not reported" where unknown.
- Write in clear, calm English. Do not use markdown formatting or emojis.`;

function gatewayError(status: number, message: string): Error {
  if (status === 429) {
    return new Error("The assistant is busy right now. Please try again in a moment.");
  }
  if (status === 402) {
    return new Error(
      "AI credits for this workspace have run out. The app owner needs to add credits to re-enable the assistant.",
    );
  }
  if (status === 403) {
    return new Error("The AI assistant is currently disabled for this workspace.");
  }
  return new Error(message || "The assistant could not process that request.");
}

export const triageCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        description: z.string().trim().min(10).max(4000),
        petName: z.string().trim().max(80).optional(),
        species: z.string().trim().max(40).optional(),
        breed: z.string().trim().max(80).optional(),
        ageText: z.string().trim().max(60).optional(),
        weightKg: z.number().positive().max(500).optional(),
        allergies: z.string().trim().max(500).optional(),
        conditions: z.string().trim().max(500).optional(),
        medications: z.string().trim().max(500).optional(),
        durationText: z.string().trim().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<TriageResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The AI assistant is not configured.");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { streamText, Output } = await import("ai");

    const facts = [
      `Pet name: ${data.petName || "not reported"}`,
      `Species: ${data.species || "not reported"}`,
      `Breed: ${data.breed || "not reported"}`,
      `Age: ${data.ageText || "not reported"}`,
      `Weight: ${data.weightKg ? `${data.weightKg} kg` : "not reported"}`,
      `Known allergies: ${data.allergies || "none reported"}`,
      `Ongoing conditions: ${data.conditions || "none reported"}`,
      `Current medications: ${data.medications || "none reported"}`,
      `Duration of the problem: ${data.durationText || "not reported"}`,
    ].join("\n");

    const gateway = createLovableAiGatewayProvider(apiKey);

    try {
      const result = streamText({
        model: gateway("google/gemini-3.7-flash"),
        system: SYSTEM_PROMPT,
        output: Output.object({ schema: TriageSchema }),
        prompt: `Pet record:\n${facts}\n\nOwner's description of the problem:\n"""${data.description}"""`,
      });
      return (await result.output) as TriageResult;
    } catch (error) {
      const status =
        error != null && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode: unknown }).statusCode)
          : 500;
      console.error("[VetNow Assistant] triage failed", error);
      throw gatewayError(status, "The assistant could not process that request.");
    }
  });
