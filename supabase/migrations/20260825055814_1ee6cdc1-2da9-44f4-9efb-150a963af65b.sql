CREATE TYPE public.app_role AS ENUM ('owner','vet','admin');
CREATE TYPE public.vet_status AS ENUM ('AVAILABLE','BUSY','OFFLINE','EMERGENCY_ONLY');
CREATE TYPE public.verification_state AS ENUM ('PENDING','VERIFIED','REJECTED');
CREATE TYPE public.appointment_status AS ENUM ('PENDING','CONFIRMED','COMPLETED','CANCELLED','DECLINED');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  city text,
  area text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'owner'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text NOT NULL,
  city text NOT NULL DEFAULT 'Visakhapatnam',
  address text NOT NULL,
  phone text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  is_emergency boolean NOT NULL DEFAULT false,
  is_24x7 boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinics TO anon, authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinics public read" ON public.clinics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage clinics" ON public.clinics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.vets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  qualification text NOT NULL,
  registration_number text,
  experience_years int NOT NULL DEFAULT 0,
  bio text,
  languages text[] NOT NULL DEFAULT '{English}',
  pet_types text[] NOT NULL DEFAULT '{dog,cat}',
  specialties text[] NOT NULL DEFAULT '{}',
  consultation_types text[] NOT NULL DEFAULT '{clinic}',
  consultation_fee int NOT NULL DEFAULT 400,
  home_visit_fee int,
  rating numeric(2,1),
  review_count int NOT NULL DEFAULT 0,
  completed_consultations int NOT NULL DEFAULT 0,
  avg_response_minutes int,
  current_status public.vet_status NOT NULL DEFAULT 'OFFLINE',
  status_updated_at timestamptz NOT NULL DEFAULT now(),
  accepts_emergency boolean NOT NULL DEFAULT false,
  verification public.verification_state NOT NULL DEFAULT 'PENDING',
  phone text,
  whatsapp text,
  photo_url text,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vets TO authenticated;
GRANT SELECT ON public.vets TO anon;
GRANT ALL ON public.vets TO service_role;
ALTER TABLE public.vets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vets public read" ON public.vets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "vet creates own record" ON public.vets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vet updates own record" ON public.vets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage vets" ON public.vets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.vet_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vet_id uuid NOT NULL REFERENCES public.vets(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens time NOT NULL,
  closes time NOT NULL
);
GRANT SELECT ON public.vet_working_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vet_working_hours TO authenticated;
GRANT ALL ON public.vet_working_hours TO service_role;
ALTER TABLE public.vet_working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hours public read" ON public.vet_working_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "vet manages own hours" ON public.vet_working_hours FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vets v WHERE v.id = vet_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vets v WHERE v.id = vet_id AND v.user_id = auth.uid()));

CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL DEFAULT 'dog',
  breed text,
  sex text,
  birth_date date,
  weight_kg numeric(5,2),
  allergies text,
  conditions text,
  medications text,
  previous_vet text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pets" ON public.pets FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vet_id uuid NOT NULL REFERENCES public.vets(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  consultation_type text NOT NULL DEFAULT 'clinic',
  scheduled_at timestamptz NOT NULL,
  reason text,
  handoff_summary text,
  price int NOT NULL DEFAULT 0,
  status public.appointment_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages own appointments" ON public.appointments FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "vet reads their appointments" ON public.appointments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vets v WHERE v.id = vet_id AND v.user_id = auth.uid()));
CREATE POLICY "vet updates their appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vets v WHERE v.id = vet_id AND v.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vets v WHERE v.id = vet_id AND v.user_id = auth.uid()));

CREATE POLICY "vet reads pets of their appointments" ON public.pets FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.appointments a JOIN public.vets v ON v.id = a.vet_id
          WHERE a.pet_id = pets.id AND v.user_id = auth.uid())
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  vet_id uuid NOT NULL REFERENCES public.vets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "review after completed appointment" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.owner_id = auth.uid()
      AND a.vet_id = reviews.vet_id AND a.status = 'COMPLETED'));

INSERT INTO public.clinics (id, name, area, address, phone, lat, lng, is_emergency, is_24x7, is_verified) VALUES
 ('11111111-1111-4111-8111-000000000001','[DEMO] Seaside Pet Hospital','MVP Colony','Sector 4, MVP Colony, Visakhapatnam','+919000000001',17.7420,83.3320,true,true,true),
 ('11111111-1111-4111-8111-000000000002','[DEMO] Dwaraka Animal Care','Dwaraka Nagar','Main Road, Dwaraka Nagar, Visakhapatnam','+919000000002',17.7280,83.3050,false,false,true),
 ('11111111-1111-4111-8111-000000000003','[DEMO] Siripuram Vet Clinic','Siripuram','Beach Road Junction, Siripuram, Visakhapatnam','+919000000003',17.7180,83.3160,false,false,true),
 ('11111111-1111-4111-8111-000000000004','[DEMO] Seethammadhara Pet Point','Seethammadhara','NH Road, Seethammadhara, Visakhapatnam','+919000000004',17.7500,83.3130,false,false,true),
 ('11111111-1111-4111-8111-000000000005','[DEMO] Maddilapalem Animal Hospital','Maddilapalem','Near Junction, Maddilapalem, Visakhapatnam','+919000000005',17.7390,83.3230,true,false,true),
 ('11111111-1111-4111-8111-000000000006','[DEMO] Gajuwaka Pet Care Centre','Gajuwaka','Old Gajuwaka, Visakhapatnam','+919000000006',17.6830,83.2100,false,false,true),
 ('11111111-1111-4111-8111-000000000007','[DEMO] Vizag 24x7 Emergency Vet','MVP Colony','Sector 8, MVP Colony, Visakhapatnam','+919000000007',17.7460,83.3400,true,true,true),
 ('11111111-1111-4111-8111-000000000008','[DEMO] Coastal Companion Clinic','Siripuram','Waltair Uplands, Siripuram, Visakhapatnam','+919000000008',17.7135,83.3105,false,false,false);

INSERT INTO public.vets (clinic_id, full_name, qualification, registration_number, experience_years, bio, languages, pet_types, specialties, consultation_types, consultation_fee, home_visit_fee, rating, review_count, completed_consultations, avg_response_minutes, current_status, accepts_emergency, verification, phone, whatsapp) VALUES
 ('11111111-1111-4111-8111-000000000001','[DEMO] Dr. Ananya Rao','BVSc & AH','AP/VET/10231',9,'Small animal practice with a focus on internal medicine.','{English,Telugu,Hindi}','{dog,cat}','{Internal medicine,Preventive care}','{clinic,video}',400,NULL,4.8,124,860,5,'AVAILABLE',true,'VERIFIED','+919000001001','+919000001001'),
 ('11111111-1111-4111-8111-000000000001','[DEMO] Dr. Karthik Menon','BVSc, MVSc (Surgery)','AP/VET/10455',12,'Soft tissue and orthopaedic surgery.','{English,Malayalam,Hindi}','{dog,cat}','{Surgery,Orthopaedics}','{clinic}',600,NULL,4.7,96,1120,12,'BUSY',true,'VERIFIED','+919000001002','+919000001002'),
 ('11111111-1111-4111-8111-000000000002','[DEMO] Dr. Sneha Patnaik','BVSc & AH','AP/VET/11002',6,'General practice and vaccinations.','{English,Telugu}','{dog,cat,rabbit}','{Preventive care,Dermatology}','{clinic,video,home}',350,700,4.6,58,410,8,'AVAILABLE',false,'VERIFIED','+919000001003','+919000001003'),
 ('11111111-1111-4111-8111-000000000002','[DEMO] Dr. Ravi Teja','BVSc & AH','AP/VET/10877',4,'Puppy and kitten wellness.','{English,Telugu}','{dog,cat}','{Preventive care}','{clinic,video}',300,NULL,4.4,31,190,15,'OFFLINE',false,'VERIFIED','+919000001004','+919000001004'),
 ('11111111-1111-4111-8111-000000000003','[DEMO] Dr. Meera Iyer','BVSc, MVSc (Medicine)','AP/VET/10119',14,'Chronic disease management.','{English,Tamil,Hindi}','{dog,cat}','{Internal medicine,Endocrinology}','{clinic,video}',700,NULL,4.9,203,1980,4,'AVAILABLE',false,'VERIFIED','+919000001005','+919000001005'),
 ('11111111-1111-4111-8111-000000000003','[DEMO] Dr. Suresh Babu','BVSc & AH','AP/VET/10990',8,'General practice, home visits across Siripuram.','{English,Telugu}','{dog,cat,bird}','{Preventive care}','{clinic,home}',400,800,4.3,44,520,20,'EMERGENCY_ONLY',true,'VERIFIED','+919000001006','+919000001006'),
 ('11111111-1111-4111-8111-000000000004','[DEMO] Dr. Priya Sharma','BVSc & AH','AP/VET/11210',5,'Feline-focused practice.','{English,Hindi}','{cat}','{Feline medicine}','{clinic,video}',450,NULL,4.8,77,430,6,'AVAILABLE',false,'VERIFIED','+919000001007','+919000001007'),
 ('11111111-1111-4111-8111-000000000004','[DEMO] Dr. Naveen Kumar','BVSc & AH','AP/VET/10650',10,'Emergency and critical care.','{English,Telugu,Hindi}','{dog,cat}','{Emergency care,Critical care}','{clinic}',800,NULL,4.7,141,1640,3,'AVAILABLE',true,'VERIFIED','+919000001008','+919000001008'),
 ('11111111-1111-4111-8111-000000000005','[DEMO] Dr. Lakshmi Devi','BVSc & AH','AP/VET/10333',11,'Dermatology and allergies.','{English,Telugu}','{dog,cat}','{Dermatology}','{clinic,video}',500,NULL,4.5,89,910,10,'BUSY',false,'VERIFIED','+919000001009','+919000001009'),
 ('11111111-1111-4111-8111-000000000005','[DEMO] Dr. Arjun Reddy','BVSc & AH','AP/VET/11444',3,'General practice.','{English,Telugu}','{dog,cat,rabbit,bird}','{Preventive care}','{clinic,video,home}',300,600,4.2,19,120,18,'AVAILABLE',false,'VERIFIED','+919000001010','+919000001010'),
 ('11111111-1111-4111-8111-000000000006','[DEMO] Dr. Fatima Begum','BVSc & AH','AP/VET/10788',7,'Exotics and small mammals.','{English,Hindi,Urdu}','{rabbit,bird,other}','{Exotic pets}','{clinic,video}',450,NULL,4.6,36,300,14,'OFFLINE',false,'VERIFIED','+919000001011','+919000001011'),
 ('11111111-1111-4111-8111-000000000006','[DEMO] Dr. Vikram Singh','BVSc, MVSc','AP/VET/10222',15,'Orthopaedics and rehabilitation.','{English,Hindi}','{dog}','{Orthopaedics,Surgery}','{clinic}',900,NULL,4.9,168,2100,9,'BUSY',false,'VERIFIED','+919000001012','+919000001012'),
 ('11111111-1111-4111-8111-000000000007','[DEMO] Dr. Anil Varma','BVSc & AH','AP/VET/10501',13,'24x7 emergency veterinarian.','{English,Telugu,Hindi}','{dog,cat,rabbit,bird,other}','{Emergency care}','{clinic}',1000,NULL,4.8,212,2600,2,'AVAILABLE',true,'VERIFIED','+919000001013','+919000001013'),
 ('11111111-1111-4111-8111-000000000007','[DEMO] Dr. Kavya Nair','BVSc & AH','AP/VET/11311',6,'Emergency triage and video triage consults.','{English,Malayalam}','{dog,cat}','{Emergency care,Internal medicine}','{clinic,video}',650,NULL,4.7,64,540,4,'EMERGENCY_ONLY',true,'VERIFIED','+919000001014','+919000001014'),
 ('11111111-1111-4111-8111-000000000008','[DEMO] Dr. Rohit Das','BVSc & AH','AP/VET/11555',2,'Recently joined the platform.','{English,Bengali}','{dog,cat}','{Preventive care}','{clinic,video}',250,NULL,NULL,0,0,NULL,'OFFLINE',false,'PENDING','+919000001015','+919000001015');

INSERT INTO public.vet_working_hours (vet_id, day_of_week, opens, closes)
SELECT v.id, d.day, '10:00'::time, '13:00'::time FROM public.vets v CROSS JOIN generate_series(0,6) AS d(day) WHERE v.is_demo;
INSERT INTO public.vet_working_hours (vet_id, day_of_week, opens, closes)
SELECT v.id, d.day, '16:00'::time, '20:00'::time FROM public.vets v CROSS JOIN generate_series(0,6) AS d(day) WHERE v.is_demo;