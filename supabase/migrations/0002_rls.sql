-- ===========================================================================
-- MU Voice Studio — 0002_rls.sql
-- Row Level Security. Each user can only touch their own rows.
--
-- NOTE: The FastAPI backend uses the SERVICE ROLE key, which BYPASSES RLS.
-- The backend is responsible for scoping every query by the authenticated
-- user id (verified from the Supabase JWT). RLS below is the second line of
-- defense and protects any direct client (anon key) access.
-- ===========================================================================

alter table profiles              enable row level security;
alter table voice_profiles        enable row level security;
alter table projects              enable row level security;
alter table project_chunks        enable row level security;
alter table generation_jobs       enable row level security;
alter table pronunciation_entries enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- voice_profiles
-- ---------------------------------------------------------------------------
create policy "voices_select_own"
  on voice_profiles for select
  using (auth.uid() = user_id);

create policy "voices_insert_own"
  on voice_profiles for insert
  with check (auth.uid() = user_id);

create policy "voices_update_own"
  on voice_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "voices_delete_own"
  on voice_profiles for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create policy "projects_select_own"
  on projects for select
  using (auth.uid() = user_id);

create policy "projects_insert_own"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "projects_update_own"
  on projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_delete_own"
  on projects for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- project_chunks (ownership derived via parent project)
-- ---------------------------------------------------------------------------
create policy "chunks_select_own"
  on project_chunks for select
  using (exists (
    select 1 from projects p
    where p.id = project_chunks.project_id and p.user_id = auth.uid()
  ));

create policy "chunks_insert_own"
  on project_chunks for insert
  with check (exists (
    select 1 from projects p
    where p.id = project_chunks.project_id and p.user_id = auth.uid()
  ));

create policy "chunks_update_own"
  on project_chunks for update
  using (exists (
    select 1 from projects p
    where p.id = project_chunks.project_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from projects p
    where p.id = project_chunks.project_id and p.user_id = auth.uid()
  ));

create policy "chunks_delete_own"
  on project_chunks for delete
  using (exists (
    select 1 from projects p
    where p.id = project_chunks.project_id and p.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- generation_jobs
-- ---------------------------------------------------------------------------
create policy "jobs_select_own"
  on generation_jobs for select
  using (auth.uid() = user_id);

create policy "jobs_insert_own"
  on generation_jobs for insert
  with check (auth.uid() = user_id);

create policy "jobs_update_own"
  on generation_jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "jobs_delete_own"
  on generation_jobs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- pronunciation_entries
-- ---------------------------------------------------------------------------
create policy "pronunciations_select_own"
  on pronunciation_entries for select
  using (auth.uid() = user_id);

create policy "pronunciations_insert_own"
  on pronunciation_entries for insert
  with check (auth.uid() = user_id);

create policy "pronunciations_update_own"
  on pronunciation_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pronunciations_delete_own"
  on pronunciation_entries for delete
  using (auth.uid() = user_id);
