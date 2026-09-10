export const HANDOFF_KEY = "vetnow:handoff";

export type StoredHandoff = {
  summary: string;
  consultationType: "clinic" | "video" | "home";
};

export function readStoredHandoff(): StoredHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    return raw ? (JSON.parse(raw) as StoredHandoff) : null;
  } catch {
    return null;
  }
}

export function clearStoredHandoff() {
  if (typeof window !== "undefined") sessionStorage.removeItem(HANDOFF_KEY);
}
