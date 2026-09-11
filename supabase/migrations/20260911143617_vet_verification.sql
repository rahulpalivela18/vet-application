-- Vet verification workflow: review fields, document evidence, storage, and public visibility gate.

alter table public.vets
  add column if not exists verification_reason text,
  add column if not exists verification_submitted_at timestamptz,
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists verification_reviewed_by uuid references auth.users(id) on delete set null;

create table if not exists public.vet_documents (
  id uuid primary key default gen_random_uuid(),
  vet_id uuid not null references public.vets(id) on delete cascade,
  kind text not null check (kind in ('degree','registration','gov_id','selfie','clinic')),
  file_path text not null,
  uploaded_at timestamptz not null default now(),
  unique (vet_id, kind)
);
grant select, insert, update, delete on public.vet_documents to authenticated;
grant all on public.vet_documents to service_role;
alter table public.vet_documents enable row level security;

drop policy if exists "vet manages own docs" on public.vet_documents;
create policy "vet manages own docs" on public.vet_documents for all to authenticated
  using (exists (select 1 from public.vets v where v.id = vet_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vets v where v.id = vet_id and v.user_id = auth.uid()));

drop policy if exists "admins read docs" on public.vet_documents;
create policy "admins read docs" on public.vet_documents for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Public and non-owner authenticated users see only verified vets. Owners always see their own row.
drop policy if exists "vets public read" on public.vets;
drop policy if exists "vets public read verified" on public.vets;
create policy "vets public read verified" on public.vets for select to anon, authenticated
  using (verification = 'VERIFIED');

drop policy if exists "vets owner read own" on public.vets;
create policy "vets owner read own" on public.vets for select to authenticated
  using (auth.uid() = user_id);

-- Private storage bucket for verification documents. Object path prefix = owner uid.
insert into storage.buckets (id, name, public)
values ('vet-documents', 'vet-documents', false)
on conflict (id) do nothing;

drop policy if exists "vet docs upload own" on storage.objects;
create policy "vet docs upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'vet-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vet docs update own" on storage.objects;
create policy "vet docs update own" on storage.objects for update to authenticated
  using (bucket_id = 'vet-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'vet-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "vet docs read own" on storage.objects;
create policy "vet docs read own" on storage.objects for select to authenticated
  using (bucket_id = 'vet-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "admins read vet docs" on storage.objects;
create policy "admins read vet docs" on storage.objects for select to authenticated
  using (bucket_id = 'vet-documents' and public.has_role(auth.uid(), 'admin'));
