import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PawPrint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) =>
    search["mode"] === "signup" ? { mode: "signup" as const } : {},
  head: () => ({
    meta: [
      { title: "Sign in to VetNow" },
      {
        name: "description",
        content:
          "Sign in or create a VetNow account to save pet profiles, book veterinary consultations and track appointments.",
      },
      { property: "og:title", content: "Sign in to VetNow" },
      { property: "og:description", content: "Access your pets, bookings and vet console." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"owner" | "vet">("owner");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    void (async () => {
      const { data: vet } = await supabase
        .from("vets")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (vet) {
        navigate({ to: "/vet-console", replace: true });
        return;
      }
      const isVet = (user.user_metadata as Record<string, unknown> | undefined)?.["role"] === "vet";
      navigate({ to: isVet ? "/for-vets" : "/dashboard", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="surface-panel p-7">
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <PawPrint className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold">
          {mode === "signin" ? "Sign in to VetNow" : "Create your VetNow account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save pet profiles, book consultations and keep every handoff in one place.
        </p>

        <Button variant="outline" className="mt-6 w-full" onClick={google} type="button">
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or use email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <div>
              <Label>I am a…</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "owner", label: "Pet owner" },
                    { value: "vet", label: "Veterinarian" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      role === option.value
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {role === "vet" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  After creating your account you'll set up your vet profile and availability.
                </p>
              )}
            </div>
          )}
          {mode === "signup" && (
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to VetNow?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Are you a veterinarian?{" "}
        <Link to="/for-vets" className="font-semibold text-primary hover:underline">
          Join VetNow as a vet
        </Link>
      </p>
    </div>
  );
}
