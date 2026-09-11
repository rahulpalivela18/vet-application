import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Clock, Users } from "lucide-react";
import { createVetProfile, getMyAccount } from "@/lib/account.functions";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CONSULTATION_TYPES, SPECIES_OPTIONS } from "@/lib/format";

type Species = "dog" | "cat" | "rabbit" | "bird" | "other";
type Consultation = "clinic" | "video" | "home";

export const Route = createFileRoute("/for-vets")({
  head: () => ({
    meta: [
      { title: "Join VetNow as a veterinarian" },
      {
        name: "description",
        content:
          "List your practice on VetNow, broadcast live availability and receive AI-structured consultation requests from pet owners in Visakhapatnam.",
      },
      { property: "og:title", content: "Join VetNow as a veterinarian" },
      {
        property: "og:description",
        content: "Broadcast live availability and receive structured consultation requests.",
      },
    ],
  }),
  component: ForVetsPage,
});

function ForVetsPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const fetchAccount = useServerFn(getMyAccount);
  const create = useServerFn(createVetProfile);

  const account = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: Boolean(user),
  });

  const [fullName, setFullName] = useState("");
  const [qualification, setQualification] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [experienceYears, setExperienceYears] = useState("3");
  const [specialties, setSpecialties] = useState("General practice");
  const [petTypes, setPetTypes] = useState<Species[]>(["dog", "cat"]);
  const [consultationTypes, setConsultationTypes] = useState<Consultation[]>(["clinic"]);
  const [consultationFee, setConsultationFee] = useState("500");
  const [homeVisitFee, setHomeVisitFee] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [acceptsEmergency, setAcceptsEmergency] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          fullName: fullName.trim(),
          qualification: qualification.trim(),
          experienceYears: Number(experienceYears) || 0,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          petTypes,
          consultationTypes,
          consultationFee: Number(consultationFee) || 0,
          acceptsEmergency,
          ...(registrationNumber.trim() ? { registrationNumber: registrationNumber.trim() } : {}),
          ...(homeVisitFee.trim() ? { homeVisitFee: Number(homeVisitFee) } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(bio.trim() ? { bio: bio.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Profile created — welcome to VetNow");
      navigate({ to: "/vet-console" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Practice on VetNow</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Show pet owners when you're actually available, and receive requests that already contain
        the history, symptoms and duration you need.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Clock,
            title: "Live status control",
            body: "Switch between Available, Busy, Emergency-only and Offline in one tap.",
          },
          {
            icon: Users,
            title: "Qualified requests",
            body: "Every request arrives with a structured clinical handoff note.",
          },
          {
            icon: BadgeCheck,
            title: "Verified profile",
            body: "Qualification, registration and reviews build owner trust.",
          },
        ].map((f) => (
          <div key={f.title} className="surface-panel p-5">
            <f.icon className="size-5 text-primary" />
            <p className="mt-3 font-display font-bold">{f.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>

      {!loading && !user ? (
        <div className="surface-panel mt-8 p-8 text-center">
          <p className="font-display text-lg font-bold">Create an account to set up your profile</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You'll be brought back here to complete your vet profile right after.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup" }}>
                Create account
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </div>
      ) : account.data?.vet ? (
        <div className="surface-panel mt-8 p-8 text-center">
          <p className="font-display text-lg font-bold">You already have a vet profile</p>
          <Button asChild className="mt-4">
            <Link to="/vet-console">Open vet console</Link>
          </Button>
        </div>
      ) : (
        <form
          className="surface-panel mt-8 space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (petTypes.length === 0) {
              toast.error("Select at least one pet type");
              return;
            }
            if (consultationTypes.length === 0) {
              toast.error("Select at least one consultation type");
              return;
            }
            mutation.mutate();
          }}
        >
          <h2 className="font-display text-xl font-bold">Veterinarian details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Ananya Rao"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="qual">Qualification</Label>
              <Input
                id="qual"
                required
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="BVSc &amp; AH, MVSc"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="reg">Registration number (optional)</Label>
              <Input
                id="reg"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="exp">Years of experience</Label>
              <Input
                id="exp"
                type="number"
                min={0}
                max={60}
                required
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="spec">Specialties (comma separated)</Label>
            <Input
              id="spec"
              required
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Pet types treated</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {SPECIES_OPTIONS.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={petTypes.includes(s.value)}
                    onCheckedChange={() => toggle(petTypes, s.value, setPetTypes)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Consultation formats</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {CONSULTATION_TYPES.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={consultationTypes.includes(c.value)}
                    onCheckedChange={() => toggle(consultationTypes, c.value, setConsultationTypes)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="fee">Consultation fee (₹)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                required
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="hfee">Home visit fee (₹)</Label>
              <Input
                id="hfee"
                type="number"
                min={0}
                value={homeVisitFee}
                onChange={(e) => setHomeVisitFee(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">About your practice (optional)</Label>
            <Textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={acceptsEmergency}
              onCheckedChange={(v) => setAcceptsEmergency(v === true)}
            />
            I accept emergency cases
          </label>

          <Button type="submit" size="lg" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create vet profile"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Profiles are reviewed before going live. Add your council registration and ID proof from
            the vet console; an admin approves them.
          </p>
        </form>
      )}
    </div>
  );
}
