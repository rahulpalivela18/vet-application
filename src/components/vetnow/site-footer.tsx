import { Link } from "@tanstack/react-router";
import { PawPrint } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-display text-base font-bold">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <PawPrint className="size-3.5" />
            </span>
            VetNow
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Real-time veterinarian availability and AI-structured care requests for pet owners in
            Visakhapatnam.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">For pet owners</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/find" className="hover:text-foreground">Find a vet</Link></li>
            <li><Link to="/assistant" className="hover:text-foreground">AI Assistant</Link></li>
            <li><Link to="/emergency" className="hover:text-foreground">Emergency care</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">My dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">For veterinarians</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/for-vets" className="hover:text-foreground">Join VetNow</Link></li>
            <li><Link to="/vet-console" className="hover:text-foreground">Vet console</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Important</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            VetNow does not provide diagnoses or prescriptions. In a life-threatening emergency,
            contact a 24x7 veterinary hospital immediately.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} VetNow · Visakhapatnam, India
      </div>
    </footer>
  );
}
