import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Menu, PawPrint, Siren, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMyAccount } from "@/lib/account.functions";

const NAV = [
  { to: "/find", label: "Find a vet" },
  { to: "/assistant", label: "AI Assistant" },
  { to: "/emergency", label: "Emergency" },
] as const;

export function SiteHeader() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const fetchAccount = useServerFn(getMyAccount);
  const account = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: Boolean(user),
  });
  const isVet = Boolean(account.data?.vet);
  const isAdmin = account.data?.roles.includes("admin") ?? false;

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <PawPrint className="size-4" />
          </span>
          VetNow
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-emergency hover:bg-emergency-soft hover:text-emergency"
          >
            <Link to="/emergency">
              <Siren className="size-4" />
              Emergency
            </Link>
          </Button>
          {!loading && user ? (
            <>
              {isVet ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/vet-console">Vet console</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/profile">Profile</Link>
              </Button>
              {isAdmin ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/verifications">Admin</Link>
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto grid size-9 place-items-center rounded-lg border border-border md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
          {!loading && user ? (
            <>
              {isVet ? (
                <Link
                  to="/vet-console"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Vet console
                </Link>
              ) : null}
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Profile
              </Link>
              {isAdmin ? (
                <Link
                  to="/admin/verifications"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Admin
                </Link>
              ) : null}
              <Button variant="outline" size="sm" className="mt-1" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="mt-1">
              <Link to="/auth" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
