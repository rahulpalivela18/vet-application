import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getMyAccount, updateMyProfile, type MyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Your profile | VetNow" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const fetchAccount = useServerFn(getMyAccount);
  const account = useQuery({ queryKey: ["my-account"], queryFn: () => fetchAccount() });

  if (account.isLoading) {
    return (
      <p className="mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">Loading profile…</p>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold">Your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">{account.data?.email}</p>
      <ProfileForm account={account.data} />
    </div>
  );
}

function ProfileForm({ account }: { account: MyAccount | undefined }) {
  const qc = useQueryClient();
  const save = useServerFn(updateMyProfile);
  const profile = account?.profile ?? null;

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [area, setArea] = useState(profile?.area ?? "");
  const [city, setCity] = useState(profile?.city ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          area: area.trim() || undefined,
          city: city.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roles = account?.roles ?? [];

  return (
    <>
      {roles.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <span
              key={r}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
            >
              {r}
            </span>
          ))}
        </div>
      ) : null}

      <form
        className="surface-panel mt-6 grid gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            placeholder="+91 90000 00000"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="area">Area</Label>
            <Input
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              maxLength={80}
              placeholder="MVP Colony"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
              placeholder="Visakhapatnam"
            />
          </div>
        </div>
        <div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </>
  );
}
