# Simplify vet onboarding

## Goal
Make joining as a vet take under 60 seconds: one-tap Google sign-in, role asked once, details filled later.

## Flow

1. **Auth page (both roles)**
   - "Continue with Google" button (already exists).
   - Email signup stays as fallback with minimal fields: name, email, password, role choice (owner / vet).

2. **Role question for Google sign-ins**
   - After Google sign-in, if the account has no role yet, show a one-tap screen: "I'm a pet owner / I'm a veterinarian".
   - Owners → dashboard. Vets → quick setup.
   - New route `/choose-role`, public but requires signed-in session.

3. **Quick vet setup (replaces the long form)**
   - Only 4 fields: full name, qualification, city/area (text), phone.
   - Everything else (fees, specialties, pet types, bio, hours, verification) gets sensible defaults and is filled in later from the **Vet Console** ("Complete your profile" checklist card).
   - `/for-vets` becomes this short form; the marketing copy stays at top, shortened.

4. **Vet console improvements**
   - If profile is incomplete, show a checklist: add fees → add pet types → set working hours → submit verification. Each links to the existing editors.

## Technical notes
- Keep existing `createVetProfile` server function; add a `quickCreateVetProfile` with the reduced schema (defaults: consultationFee 0, petTypes [dog, cat], consultationTypes [clinic], verification PENDING).
- Role stored in `user_metadata.role`; Google flow sets it via a server function on `/choose-role` submit.
- No database schema changes needed.
