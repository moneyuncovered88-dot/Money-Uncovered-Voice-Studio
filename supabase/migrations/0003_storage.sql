-- ===========================================================================
-- MU Voice Studio — 0003_storage.sql
-- Private storage buckets + object-level RLS.
--
-- Convention: every object is stored under a top-level folder named after the
-- owning user's id, e.g.  <user_id>/<voice_id>.wav
-- so ownership can be derived from the path.
--
-- The backend (service role) does the real uploads and issues signed URLs.
-- These policies guard any direct client (anon key) access.
-- ===========================================================================

insert into storage.buckets (id, name, public)
values
  ('voice-references',  'voice-references',  false),
  ('generated-chunks',  'generated-chunks',  false),
  ('final-audio',       'final-audio',       false)
on conflict (id) do nothing;

-- Helper predicate: the first path segment equals the caller's uid.
-- (storage.foldername(name))[1] -> first folder in the object path.

-- voice-references -----------------------------------------------------------
create policy "voice_refs_rw_own"
  on storage.objects for all
  using (
    bucket_id = 'voice-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'voice-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- generated-chunks -----------------------------------------------------------
create policy "chunks_rw_own"
  on storage.objects for all
  using (
    bucket_id = 'generated-chunks'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'generated-chunks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- final-audio ----------------------------------------------------------------
create policy "final_audio_rw_own"
  on storage.objects for all
  using (
    bucket_id = 'final-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'final-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
