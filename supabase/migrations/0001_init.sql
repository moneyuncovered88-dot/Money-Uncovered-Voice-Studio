-- ===========================================================================
-- MU Voice Studio — 0001_init.sql
-- Core schema: profiles, voices, projects, chunks, jobs, pronunciations.
-- Run order: 0001 -> 0002 -> 0003 -> 0004.
-- ===========================================================================

-- gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Lifecycle shared by projects and generation jobs.
create type generation_status as enum (
  'draft',
  'queued',
  'preprocessing',
  'generating',
  'assembling',
  'normalizing',
  'uploading',
  'completed',
  'failed',
  'cancelled'
);

-- Per-chunk lifecycle.
create type chunk_status as enum (
  'waiting',
  'queued',
  'generating',
  'generated',
  'failed'
);

-- What a generation job is doing.
create type job_type as enum (
  'preview',
  'full',
  'regenerate',
  'assemble'
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- voice_profiles
-- ---------------------------------------------------------------------------
create table voice_profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users (id) on delete cascade,
  name                        text not null,
  description                 text,
  language                    text not null default 'en',
  accent                      text,
  style                       text,
  use_case                    text,
  reference_audio_path        text,               -- path in `voice-references` bucket
  reference_duration_seconds  numeric,
  reference_sample_rate       integer,
  authorization_confirmed     boolean not null default false,
  authorization_confirmed_at  timestamptz,
  notes                       text,
  is_active                   boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index idx_voice_profiles_user on voice_profiles (user_id);

create trigger trg_voice_profiles_updated_at
  before update on voice_profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table projects (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users (id) on delete cascade,
  title                       text not null,
  slug                        text,
  video_title                 text,
  script_original             text not null default '',
  script_processed            text,
  voice_profile_id            uuid references voice_profiles (id) on delete set null,
  narration_preset            text not null default 'money_uncovered_documentary',
  status                      generation_status not null default 'draft',
  word_count                  integer not null default 0,
  character_count             integer not null default 0,
  estimated_duration_seconds  numeric,
  final_duration_seconds      numeric,
  final_audio_mp3_path        text,               -- path in `final-audio` bucket
  final_audio_wav_path        text,               -- path in `final-audio` bucket
  -- Generation settings snapshot for this project (temperature, pace, pauses...).
  settings                    jsonb not null default '{}'::jsonb,
  speak_headings              boolean not null default false,
  model_name                  text,
  notes                       text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index idx_projects_user on projects (user_id);
create index idx_projects_status on projects (status);
create index idx_projects_voice on projects (voice_profile_id);

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- project_chunks
-- ---------------------------------------------------------------------------
create table project_chunks (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects (id) on delete cascade,
  chunk_index           integer not null,
  original_text         text not null,
  processed_text        text not null default '',
  status                chunk_status not null default 'waiting',
  audio_path            text,                     -- path in `generated-chunks` bucket
  duration_seconds      numeric,
  -- Timeline metadata (fuels future subtitle / scene-timestamp generation).
  start_time_seconds    numeric,
  end_time_seconds      numeric,
  sample_rate           integer,
  generation_attempt    integer not null default 0,
  error_message         text,
  settings              jsonb,                    -- exact settings used for this chunk
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (project_id, chunk_index)
);

create index idx_chunks_project on project_chunks (project_id);
create index idx_chunks_status on project_chunks (status);

create trigger trg_chunks_updated_at
  before update on project_chunks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- generation_jobs
-- ---------------------------------------------------------------------------
create table generation_jobs (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects (id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  type                  job_type not null,
  status                generation_status not null default 'queued',
  total_chunks          integer not null default 0,
  completed_chunks      integer not null default 0,
  failed_chunks         integer not null default 0,
  progress_percentage   numeric not null default 0,
  settings              jsonb,                    -- generation settings snapshot
  model_name            text,
  preprocessing_ms      integer,
  generation_ms         integer,
  assembly_ms           integer,
  gpu_seconds           numeric,
  estimated_cost        numeric,
  error_message         text,
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now()
);

create index idx_jobs_project on generation_jobs (project_id);
create index idx_jobs_user on generation_jobs (user_id);
create index idx_jobs_status on generation_jobs (status);

-- ---------------------------------------------------------------------------
-- pronunciation_entries
-- ---------------------------------------------------------------------------
create table pronunciation_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  term            text not null,
  spoken_form     text not null,
  case_sensitive  boolean not null default false,
  whole_word      boolean not null default true,
  enabled         boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_pronunciations_user on pronunciation_entries (user_id);

create trigger trg_pronunciations_updated_at
  before update on pronunciation_entries
  for each row execute function set_updated_at();
