import type { Enums } from "@/integrations/supabase/types";

export type VetStatus = Enums<"vet_status">;
export type AppointmentStatus = Enums<"appointment_status">;

export const VET_STATUS_META: Record<
  VetStatus,
  { label: string; short: string; rank: number; dotClass: string; badgeClass: string; pulse: boolean }
> = {
  AVAILABLE: {
    label: "Available now",
    short: "Available",
    rank: 0,
    dotClass: "bg-available",
    badgeClass: "bg-available-soft text-available-foreground border border-available/30",
    pulse: true,
  },
  EMERGENCY_ONLY: {
    label: "Emergency cases only",
    short: "Emergency only",
    rank: 1,
    dotClass: "bg-emergency",
    badgeClass: "bg-emergency-soft text-emergency border border-emergency/30",
    pulse: true,
  },
  BUSY: {
    label: "Busy — expect delays",
    short: "Busy",
    rank: 2,
    dotClass: "bg-busy",
    badgeClass: "bg-busy-soft text-busy-foreground border border-busy/40",
    pulse: false,
  },
  OFFLINE: {
    label: "Offline",
    short: "Offline",
    rank: 3,
    dotClass: "bg-offline",
    badgeClass: "bg-offline-soft text-muted-foreground border border-offline/30",
    pulse: false,
  },
};

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; badgeClass: string }
> = {
  PENDING: { label: "Pending", badgeClass: "bg-busy-soft text-busy-foreground border border-busy/40" },
  CONFIRMED: { label: "Confirmed", badgeClass: "bg-available-soft text-available-foreground border border-available/30" },
  COMPLETED: { label: "Completed", badgeClass: "bg-secondary text-secondary-foreground border border-border" },
  CANCELLED: { label: "Cancelled", badgeClass: "bg-offline-soft text-muted-foreground border border-border" },
  DECLINED: { label: "Declined", badgeClass: "bg-emergency-soft text-emergency border border-emergency/30" },
};

export const SPECIES_OPTIONS = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "rabbit", label: "Rabbit" },
  { value: "bird", label: "Bird" },
  { value: "other", label: "Other" },
] as const;

export const CONSULTATION_TYPES = [
  { value: "clinic", label: "Clinic visit" },
  { value: "video", label: "Video consult" },
  { value: "home", label: "Home visit" },
] as const;

export function speciesLabel(value: string): string {
  return SPECIES_OPTIONS.find((s) => s.value === value)?.label ?? value;
}

export function consultationLabel(value: string): string {
  return CONSULTATION_TYPES.find((c) => c.value === value)?.label ?? value;
}

export function formatFee(inr: number): string {
  return `₹${inr.toLocaleString("en-IN")}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Haversine distance in km between two lat/lng points. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function initials(name: string): string {
  return name
    .replace(/^\[DEMO\]\s*/, "")
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Strip the demo marker for display. */
export function displayName(name: string): string {
  return name.replace(/^\[DEMO\]\s*/, "");
}
