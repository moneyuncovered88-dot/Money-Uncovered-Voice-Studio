"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Loader2, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { api } from "@/lib/api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { THEME_KEY, type ThemeChoice } from "@/lib/theme";
import { usePersistentValue } from "@/lib/use-persistent-value";
import { cn } from "@/lib/utils";
import type { Preset, VoiceControlsResponse } from "@/types/api";

interface Defaults {
  default_output_format: string;
  default_words_per_minute: number;
  tts_max_chunk_chars: number;
  gpu_cost_per_hour: number;
}

const NAV = [
  ["profile", "Profile"],
  ["security", "Security"],
  ["preferences", "Preferences"],
  ["appearance", "Appearance"],
  ["engine", "Engine"],
  ["account", "Account"],
] as const;

function readLocal(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { data, loading } = useApiData<{
    defaults: Defaults;
    controls: VoiceControlsResponse;
    presets: Preset[];
    email: string | null;
    displayName: string;
  }>(async () => {
    const supabase = createSupabaseBrowserClient();
    const [defaults, controls, presets, userRes] = await Promise.all([
      api.config.defaults(),
      api.config.voiceControls(),
      api.config.presets(),
      supabase.auth.getUser(),
    ]);
    const user = userRes.data.user;
    return {
      defaults,
      controls,
      presets,
      email: user?.email ?? null,
      displayName: (user?.user_metadata?.display_name as string) ?? "",
    };
  }, []);

  // Profile — edit overlays the loaded value (no setState-in-effect needed).
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const displayName = nameEdit ?? data?.displayName ?? "";
  const [savingName, setSavingName] = useState(false);

  // Security
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // Preferences (per-device, used to prefill New Narration)
  const [format, setFormat] = usePersistentValue("mus-default-format", readLocal("mus-default-format", "mp3"));
  const [defPreset, setDefPreset] = usePersistentValue("mus-default-preset", readLocal("mus-default-preset", "mu_storyteller"));

  // Appearance
  const [theme, setTheme] = usePersistentValue(THEME_KEY, "dark");

  async function saveName() {
    setSavingName(true);
    try {
      const { error } = await createSupabaseBrowserClient().auth.updateUser({
        data: { display_name: displayName },
      });
      if (error) throw error;
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update your profile.");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword() {
    if (pw1.length < 8) return toast.error("Password must be at least 8 characters.");
    if (pw1 !== pw2) return toast.error("Passwords don't match.");
    setSavingPw(true);
    try {
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ password: pw1 });
      if (error) throw error;
      toast.success("Password changed");
      setPw1("");
      setPw2("");
    } catch {
      toast.error("Could not change your password.");
    } finally {
      setSavingPw(false);
    }
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function requestDeletion() {
    try {
      await api.account.createTicket({
        topic: "Account deletion",
        message: "Please delete my account and all associated data.",
      });
      toast.success("Deletion request submitted. We'll follow up by email.");
    } catch {
      toast.error("Could not submit the request. Try again later.");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your profile, preferences, and appearance." />

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        {/* Section nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-8 space-y-1">
            {NAV.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-10">
          {/* Profile */}
          <Section id="profile" eyebrow="Account" title="Profile" desc="How you appear in MUS Voices.">
            {loading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-5">
                <Field label="Display name" htmlFor="dn">
                  <Input
                    id="dn"
                    value={displayName}
                    onChange={(e) => setNameEdit(e.target.value)}
                    placeholder="Your name"
                    className="max-w-sm"
                  />
                </Field>
                <Field label="Email" htmlFor="em" hint="Contact support to change your email.">
                  <Input id="em" value={data?.email ?? ""} disabled className="max-w-sm" />
                </Field>
                <div>
                  <Button onClick={saveName} disabled={savingName}>
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save profile
                  </Button>
                </div>
              </div>
            )}
          </Section>

          {/* Security */}
          <Section id="security" eyebrow="Account" title="Security" desc="Change your password.">
            <div className="max-w-sm space-y-5">
              <Field label="New password" htmlFor="pw1">
                <Input id="pw1" type="password" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
              </Field>
              <Field label="Confirm new password" htmlFor="pw2">
                <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </Field>
              <Button onClick={savePassword} disabled={savingPw || !pw1}>
                {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Update password
              </Button>
            </div>
          </Section>

          {/* Preferences */}
          <Section id="preferences" eyebrow="Studio" title="Preferences" desc="Defaults used when you start a new narration.">
            {loading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="grid max-w-md gap-5 sm:grid-cols-2">
                <Field label="Default export format" htmlFor="fmt">
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger id="fmt">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Default narration style" htmlFor="pst">
                  <Select value={defPreset} onValueChange={setDefPreset}>
                    <SelectTrigger id="pst">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.presets ?? []).map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </Section>

          {/* Appearance */}
          <Section id="appearance" eyebrow="Interface" title="Appearance" desc="Choose how MUS Voices looks.">
            <div className="grid max-w-md grid-cols-3 gap-3">
              {(
                [
                  ["dark", "Dark", Moon],
                  ["light", "Light", Sun],
                  ["system", "System", Monitor],
                ] as [ThemeChoice, string, typeof Moon][]
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors",
                    theme === value
                      ? "border-primary/60 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </Section>

          {/* Engine */}
          <Section id="engine" eyebrow="System" title="Engine" desc="The generation backend powering your narrations.">
            {loading || !data ? (
              <Skeleton className="h-28" />
            ) : (
              <dl className="max-w-md divide-y divide-border rounded-xl border border-border">
                <RowDL label="Provider" value={<Badge variant={data.controls.provider === "mock" ? "gold" : "default"}>{data.controls.provider}</Badge>} />
                <RowDL label="Model" value={data.controls.model_name} />
                <RowDL label="Output format" value={data.defaults.default_output_format.toUpperCase()} />
                <RowDL label="Max chunk characters" value={String(data.defaults.tts_max_chunk_chars)} />
                <RowDL label="GPU cost / hour" value={`$${data.defaults.gpu_cost_per_hour.toFixed(2)}`} />
              </dl>
            )}
          </Section>

          {/* Account / danger */}
          <Section id="account" eyebrow="Account" title="Account" desc="Session and account actions.">
            <div className="space-y-4">
              <Button variant="outline" onClick={signOut}>
                Sign out
              </Button>
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
                <h4 className="text-sm font-semibold text-destructive">Delete account</h4>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  This submits a deletion request for your account and all associated projects,
                  voices, and audio. This can&apos;t be undone once processed.
                </p>
                <Button variant="outline" className="mt-4 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={requestDeletion}>
                  Request account deletion
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  desc,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-b border-border pb-10 last:border-0 last:pb-0">
      <div className="mb-5">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RowDL({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
