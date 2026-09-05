/** API response/request shapes — mirror the FastAPI schemas. */

import type { ChunkStatus, GenerationStatus } from "./domain";

export interface Project {
  id: string;
  title: string;
  video_title: string | null;
  slug: string | null;
  status: GenerationStatus;
  voice_profile_id: string | null;
  narration_preset: string;
  speak_headings: boolean;
  notes: string | null;
  script_original: string;
  script_processed: string | null;
  word_count: number;
  character_count: number;
  estimated_duration_seconds: number | null;
  final_duration_seconds: number | null;
  final_audio_mp3_path: string | null;
  final_audio_wav_path: string | null;
  settings: Record<string, unknown>;
  model_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  video_title: string | null;
  slug: string | null;
  status: GenerationStatus;
  voice_profile_id: string | null;
  word_count: number;
  estimated_duration_seconds: number | null;
  final_duration_seconds: number | null;
  updated_at: string;
  created_at: string;
}

export interface Voice {
  id: string;
  name: string;
  description: string | null;
  language: string;
  accent: string | null;
  style: string | null;
  use_case: string | null;
  notes: string | null;
  reference_audio_path: string | null;
  reference_duration_seconds: number | null;
  reference_sample_rate: number | null;
  authorization_confirmed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pronunciation {
  id: string;
  term: string;
  spoken_form: string;
  case_sensitive: boolean;
  whole_word: boolean;
  enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Preset {
  key: string;
  label: string;
  description: string;
  settings: Record<string, unknown>;
  sentence_pause_ms: number;
  paragraph_pause_ms: number;
  words_per_minute: number;
}

export interface VoiceControl {
  name: string;
  label: string;
  type: "float" | "int" | "bool" | "enum" | "seed";
  default: unknown;
  minimum: number | null;
  maximum: number | null;
  step: number | null;
  options: string[] | null;
  description: string;
}

export interface VoiceControlsResponse {
  provider: string;
  model_name: string;
  controls: VoiceControl[];
}

export interface ScriptAnalysis {
  word_count: number;
  character_count: number;
  estimated_duration_seconds: number;
  chunk_count: number;
}

export interface Chunk {
  id: string;
  chunk_index: number;
  processed_text: string;
  status: ChunkStatus;
  duration_seconds: number | null;
  start_time_seconds: number | null;
  end_time_seconds: number | null;
  generation_attempt: number;
  error_message: string | null;
}

export interface Job {
  id: string;
  project_id: string;
  type: string;
  status: GenerationStatus;
  total_chunks: number;
  completed_chunks: number;
  failed_chunks: number;
  progress_percentage: number;
  error_message: string | null;
  model_name: string | null;
  generation_ms: number | null;
  gpu_seconds: number | null;
  estimated_cost: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface GenerationStatusResponse {
  job: Job | null;
  total_chunks: number;
  generated_chunks: number;
  failed_chunks: number;
}

export interface PreviewResponse {
  url: string;
  duration_seconds: number;
}

export interface AudioUrls {
  mp3_url?: string | null;
  wav_url?: string | null;
  duration_seconds?: number | null;
}

export interface ApiError {
  error: { code: string; message: string };
}
