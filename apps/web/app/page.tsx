"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Check,
  Gauge,
  Layers,
  Menu,
  Mic2,
  Repeat,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

const FEATURES = [
  { icon: Mic2, title: "Voice profiles", desc: "Use a natural default voice or add a reference clip to match a narrator you own." },
  { icon: Layers, title: "Smart chunking", desc: "Long scripts split on sentence and paragraph boundaries — consistent across the whole piece." },
  { icon: Repeat, title: "Regenerate one chunk", desc: "Fix a single line without re-rendering the entire narration. Then rebuild in a click." },
  { icon: Gauge, title: "Pacing & speed", desc: "Pitch-preserving speed control and storyteller presets tuned for long-form narration." },
  { icon: Wand2, title: "Preview first", desc: "Hear a short preview before committing GPU time to the full generation." },
  { icon: ShieldCheck, title: "Private & secure", desc: "Row-level security, private storage, signed links. Your scripts and audio stay yours." },
];

const STEPS = [
  { n: "01", title: "Paste your script", desc: "Drop in a long-form script — documentary, explainer, or podcast." },
  { n: "02", title: "Pick a voice & style", desc: "Choose a voice profile and a narration preset, then preview." },
  { n: "03", title: "Generate & export", desc: "Render the full narration, fix any chunk, and export MP3 or WAV." },
];

const PLANS = [
  { name: "Free", price: "$0", features: ["10k characters / mo", "1 voice profile", "Ads supported"], cta: "Start free", highlight: false },
  { name: "Starter", price: "$9", features: ["150k characters / mo", "3 voices", "No ads"], cta: "Get Starter", highlight: false },
  { name: "Pro", price: "$29", features: ["750k characters / mo", "10 voices", "Priority queue"], cta: "Go Pro", highlight: true },
  { name: "Business", price: "$79", features: ["3M characters / mo", "Unlimited voices", "Commercial use"], cta: "Contact us", highlight: false },
];

function Waveform() {
  const bars = Array.from({ length: 44 });
  return (
    <div className="flex h-40 items-end justify-center gap-[3px]" aria-hidden>
      {bars.map((_, i) => {
        const h = 20 + Math.abs(Math.sin(i * 0.5)) * 80;
        return (
          <span
            key={i}
            className="mus-bar-anim w-[4px] rounded-full"
            style={{
              height: `${h}%`,
              transformOrigin: "bottom",
              background:
                "linear-gradient(180deg, rgba(52,211,153,0.95), rgba(212,175,110,0.7))",
              animation: `mus-bar ${0.9 + (i % 7) * 0.12}s ease-in-out ${i * 0.045}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0f0d] text-[#e8f0ec]">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="mus-float-slow absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="mus-float absolute right-0 top-40 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="mus-float-slow absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-700/20 blur-3xl" />
      </div>

      {/* Nav */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/40">
            <span className="h-3.5 w-3.5 rounded-sm bg-emerald-400" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-300" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">MUS Voices</span>
            <span className="text-[11px] text-emerald-300/70">AI narration studio</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-[#b9c8c0] md:flex">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#how" className="transition-colors hover:text-white">How it works</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm text-[#b9c8c0] transition-colors hover:text-white">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-400"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-md p-2 text-[#b9c8c0] md:hidden"
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {menuOpen ? (
        <div className="relative z-20 mx-5 mb-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur md:hidden">
          <a href="#features" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm">Features</a>
          <a href="#how" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm">How it works</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="block py-1.5 text-sm">Pricing</a>
          <div className="flex gap-2 pt-2">
            <Link href="/login" className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-center text-sm">Sign in</Link>
            <Link href="/signup" className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-emerald-950">Get started</Link>
          </div>
        </div>
      ) : null}

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-2 lg:pt-20">
        <div className="mus-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Long-form AI narration, done right
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Turn scripts into
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent"> studio-grade </span>
            narration
          </h1>
          <p className="mt-5 max-w-lg text-lg text-[#b9c8c0]">
            MUS Voices is a creator-first voice studio for documentaries, explainers, shorts, and
            YouTube automation — smart chunking, per-chunk regeneration, and voices you control.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30"
            >
              Start narrating free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#how" className="rounded-xl border border-white/15 px-6 py-3 font-medium text-white transition-colors hover:bg-white/5">
              See how it works
            </a>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-[#8ba296]">
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> No card required</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> MP3 & WAV export</span>
          </div>
        </div>

        {/* 3D hero visual */}
        <div className="mus-3d relative">
          <div className="mus-float mus-tilt relative mx-auto max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 shadow-2xl shadow-emerald-900/40 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <AudioLines className="h-4 w-4 text-emerald-400" /> Generating narration
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">Live</span>
            </div>
            <div className="mt-5 rounded-2xl bg-black/30 p-4">
              <Waveform />
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-2 w-3/4 rounded-full bg-white/10" />
              <div className="h-2 w-full rounded-full bg-white/10" />
              <div className="h-2 w-2/3 rounded-full bg-white/10" />
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-[#8ba296]">
              <span>chunk 7 / 12</span>
              <span>American · Storyteller · 0.85×</span>
            </div>
          </div>

          {/* Floating accent cards */}
          <div className="mus-float-slow absolute -left-6 top-8 hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md sm:block">
            <div className="text-xs text-[#8ba296]">Export</div>
            <div className="text-sm font-semibold text-white">MP3 · WAV</div>
          </div>
          <div className="mus-float absolute -right-4 bottom-6 hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md sm:block">
            <div className="text-xs text-[#8ba296]">Regenerate</div>
            <div className="text-sm font-semibold text-emerald-300">1 chunk</div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-6 text-sm text-[#7d938a]">
          <span>Built for YouTube automation</span>
          <span className="text-white/20">•</span>
          <span>Faceless documentary channels</span>
          <span className="text-white/20">•</span>
          <span>Explainers & podcasts</span>
          <span className="text-white/20">•</span>
          <span>Educators & agencies</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything a narrator needs</h2>
          <p className="mt-3 text-[#b9c8c0]">A real production workflow, not a text box with a play button.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="mus-tilt group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-[#9fb3a9]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 border-y border-white/5 bg-white/[0.02] py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Three steps to finished audio</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-black/20 p-7">
                <div className="text-5xl font-bold text-emerald-500/25">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-[#9fb3a9]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 mx-auto max-w-7xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, creator-friendly pricing</h2>
          <p className="mt-3 text-[#b9c8c0]">Start free. Upgrade when your channel grows.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`mus-tilt flex flex-col rounded-2xl border p-6 ${
                p.highlight
                  ? "border-emerald-400/50 bg-emerald-500/[0.07] ring-1 ring-emerald-400/30"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {p.highlight ? (
                <span className="mb-3 w-fit rounded-full bg-amber-300/20 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                  Most popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-white">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-sm text-[#8ba296]">/mo</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-[#9fb3a9]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-6 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  p.highlight
                    ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                    : "border border-white/15 text-white hover:bg-white/5"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24">
        <div className="mus-gradient-anim overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-400 p-10 text-center sm:p-16">
          <h2 className="text-3xl font-bold text-emerald-950 sm:text-4xl">Give your channel a voice</h2>
          <p className="mx-auto mt-3 max-w-xl text-emerald-950/80">
            Create your first narration in minutes — no card, no setup headaches.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-[#7d938a] sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            <span>MUS Voices · Money Uncovered Studio</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white">Sign in</Link>
            <Link href="/signup" className="hover:text-white">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
