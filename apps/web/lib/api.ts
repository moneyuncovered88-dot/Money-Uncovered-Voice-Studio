/**
 * Authenticated client for the FastAPI backend.
 *
 * Every call attaches the current Supabase access token as a Bearer header.
 * Backend base URL comes from NEXT_PUBLIC_API_URL; endpoints live under /api.
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AudioUrls,
  Chunk,
  GenerationStatusResponse,
  Job,
  Preset,
  PreviewResponse,
  Project,
  ProjectListItem,
  Pronunciation,
  ScriptAnalysis,
  Voice,
  VoiceControlsResponse,
} from "@/types/api";

// Trim any trailing slash so we never build a double-slash path
// (e.g. "https://api.example.com/" + "/api/projects" -> "...//api/projects" -> 404).
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiRequestError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "error") {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code = "error";
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
      code = body?.error?.code ?? code;
    } catch {
      // non-JSON error body
    }
    throw new ApiRequestError(message, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  projects: {
    list: () => apiFetch<ProjectListItem[]>("/projects"),
    get: (id: string) => apiFetch<Project>(`/projects/${id}`),
    create: (body: Record<string, unknown>) =>
      apiFetch<Project>("/projects", { method: "POST", body: json(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      apiFetch<Project>(`/projects/${id}`, { method: "PATCH", body: json(body) }),
    remove: (id: string) =>
      apiFetch<{ id: string; deleted: boolean }>(`/projects/${id}`, { method: "DELETE" }),
    duplicate: (id: string) =>
      apiFetch<Project>(`/projects/${id}/duplicate`, { method: "POST" }),
    analyze: (body: { script: string; narration_preset?: string; speak_headings?: boolean }) =>
      apiFetch<ScriptAnalysis>("/projects/analyze", { method: "POST", body: json(body) }),
  },
  voices: {
    list: () => apiFetch<Voice[]>("/voices"),
    get: (id: string) => apiFetch<Voice>(`/voices/${id}`),
    create: (body: Record<string, unknown>) =>
      apiFetch<Voice>("/voices", { method: "POST", body: json(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      apiFetch<Voice>(`/voices/${id}`, { method: "PATCH", body: json(body) }),
    remove: (id: string) =>
      apiFetch<{ id: string; deleted: boolean }>(`/voices/${id}`, { method: "DELETE" }),
    uploadReference: async (id: string, file: File): Promise<Voice> => {
      const token = await getAccessToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/voices/${id}/reference`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
        cache: "no-store",
      });
      if (!res.ok) {
        let message = `Upload failed (${res.status})`;
        try {
          const body = await res.json();
          message = body?.error?.message ?? message;
        } catch {
          // non-JSON
        }
        throw new ApiRequestError(message, res.status);
      }
      return (await res.json()) as Voice;
    },
    referenceUrl: (id: string) => apiFetch<{ url: string }>(`/voices/${id}/reference-url`),
  },
  pronunciations: {
    list: () => apiFetch<Pronunciation[]>("/pronunciations"),
    create: (body: Record<string, unknown>) =>
      apiFetch<Pronunciation>("/pronunciations", { method: "POST", body: json(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      apiFetch<Pronunciation>(`/pronunciations/${id}`, { method: "PATCH", body: json(body) }),
    remove: (id: string) =>
      apiFetch<{ id: string; deleted: boolean }>(`/pronunciations/${id}`, { method: "DELETE" }),
    preview: (text: string) =>
      apiFetch<{ original: string; processed: string }>("/pronunciations/preview", {
        method: "POST",
        body: json({ text }),
      }),
  },
  generation: {
    preview: (id: string) =>
      apiFetch<PreviewResponse>(`/projects/${id}/preview`, { method: "POST" }),
    generate: (id: string) => apiFetch<Job>(`/projects/${id}/generate`, { method: "POST" }),
    status: (id: string) => apiFetch<GenerationStatusResponse>(`/projects/${id}/status`),
    chunks: (id: string) => apiFetch<Chunk[]>(`/projects/${id}/chunks`),
    assemble: (id: string) => apiFetch<Project>(`/projects/${id}/assemble`, { method: "POST" }),
    audio: (id: string) => apiFetch<AudioUrls>(`/projects/${id}/audio`),
    regenerateChunk: (chunkId: string, text?: string | null) =>
      apiFetch<Chunk>(`/chunks/${chunkId}/regenerate`, {
        method: "POST",
        body: json({ text: text ?? null }),
      }),
    chunkAudioUrl: (chunkId: string) =>
      apiFetch<{ url: string }>(`/chunks/${chunkId}/audio-url`),
    history: () => apiFetch<Job[]>("/jobs"),
  },
  config: {
    presets: () => apiFetch<Preset[]>("/config/presets"),
    voiceControls: () => apiFetch<VoiceControlsResponse>("/config/voice-controls"),
    defaults: () =>
      apiFetch<{
        default_output_format: string;
        default_words_per_minute: number;
        tts_max_chunk_chars: number;
        gpu_cost_per_hour: number;
      }>("/config/defaults"),
  },
};
