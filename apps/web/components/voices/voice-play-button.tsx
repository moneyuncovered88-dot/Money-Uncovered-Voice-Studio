"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, ApiRequestError } from "@/lib/api";

/** Plays a voice's reference recording via a short-lived signed URL. */
export function VoicePlayButton({ voiceId, disabled }: { voiceId: string; disabled?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  async function toggle() {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      return;
    }
    setLoading(true);
    try {
      // Fetch a fresh signed URL each play so we never hit an expired one.
      const { url } = await api.voices.referenceUrl(voiceId);
      const audio = new Audio(url);
      audio.onended = () => setPlaying(false);
      audio.onpause = () => setPlaying(false);
      audio.onplay = () => setPlaying(true);
      audioRef.current = audio;
      await audio.play();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Could not play reference");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={disabled || loading}>
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {playing ? "Pause" : "Play"}
    </Button>
  );
}
