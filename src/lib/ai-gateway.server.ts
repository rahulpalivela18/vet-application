// Server-only OpenAI-compatible gateway provider helper.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiGatewayProvider() {
  const apiKey = process.env["AI_GATEWAY_API_KEY"];
  const baseURL = process.env["AI_GATEWAY_BASE_URL"] || "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("AI_GATEWAY_API_KEY is not configured.");
  }

  return createOpenAICompatible({
    name: "ai-gateway",
    baseURL,
    apiKey,
  });
}

export function aiGatewayModel() {
  return process.env["AI_GATEWAY_MODEL"] || "google/gemini-2.5-flash";
}
