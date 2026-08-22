"use client";

import { useMemo, useState } from "react";

type Tone = "Warm" | "Formal" | "Direct" | "Calm";
type Length = "Short" | "Medium" | "Detailed";

type Brief = {
  audience: string;
  purpose: string;
  keyPoint: string;
  ask: string;
  tone: Tone;
  length: Length;
};

type OutputBlock = {
  id: string;
  title: string;
  eyebrow: string;
  script: string;
  cue: string;
  wpm: number;
};

const STORAGE_KEY = "spoken-pack-v1";

const defaultBrief: Brief = {
  audience: "Attendee group",
  purpose: "Share a short update before Event 1",
  keyPoint: "The plan is ready; the next useful step is for everyone to confirm availability and one constraint.",
  ask: "Please reply with availability and any hard constraint by end of day.",
  tone: "Warm",
  length: "Medium",
};

const toneOpeners: Record<Tone, string> = {
  Warm: "Hi everyone — quick note before we move ahead.",
  Formal: "Hello. I wanted to share a concise update before the next step.",
  Direct: "Quick update: here is what matters now.",
  Calm: "A short update, so the next step is clear and unhurried.",
};

const toneClosers: Record<Tone, string> = {
  Warm: "Thanks — this will help keep the plan smooth for everyone.",
  Formal: "Thank you. I will use those responses to finalize the next step.",
  Direct: "Reply with that, and I will close the loop.",
  Calm: "No need for a long reply — just the signal that helps us proceed cleanly.",
};

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sentenceCase(text: string): string {
  const clean = text.trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(text: string, wpm: number): string {
  const seconds = Math.max(8, Math.round((wordCount(text) / wpm) * 60));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function insertBreathMarks(text: string): string {
  return splitSentences(text)
    .map((sentence, index) => {
      const pause = index % 2 === 0 ? " [pause]" : " [breathe]";
      return `${sentence}${pause}`;
    })
    .join("\n");
}

function buildOutputs(brief: Brief): OutputBlock[] {
  const audience = sentenceCase(brief.audience) || "Attendee group";
  const purpose = sentenceCase(brief.purpose) || "Share a clear update";
  const keyPoint = sentenceCase(brief.keyPoint) || "The main point is ready.";
  const ask = sentenceCase(brief.ask) || "Please reply with the next useful signal.";
  const opener = toneOpeners[brief.tone];
  const closer = toneClosers[brief.tone];
  const detail = brief.length === "Detailed" ? ` One detail worth keeping in mind: ${keyPoint}` : "";
  const mediumBridge = brief.length === "Short" ? "" : ` ${keyPoint}`;

  const voiceNote = `${opener} This is for ${audience}. ${purpose}.${mediumBridge} ${ask} ${closer}`;
  const announcement = `For ${audience}: ${purpose}. ${keyPoint}${detail} The next step is simple: ${ask} ${closer}`;
  const warmFollowUp = `${opener} I am sending this so nothing gets lost. ${purpose}. ${keyPoint} ${ask} ${closer}`;
  const rehearsal = `${opener}\n\n${purpose}.\n\n${keyPoint}\n\n${ask}\n\n${closer}`;
  const cueSheet = `Opening: ${opener}\nCore point: ${keyPoint}\nAsk: ${ask}\nClose: ${closer}\nDelivery cues: slow the first sentence, pause after the core point, then make the ask in one breath.`;

  return [
    {
      id: "voice-note",
      title: "Voice note script",
      eyebrow: "45–75 second message",
      script: voiceNote,
      cue: "Use when sending a spoken update in chat.",
      wpm: 145,
    },
    {
      id: "announcement",
      title: "Announcement readout",
      eyebrow: "Clear spoken version",
      script: announcement,
      cue: "Use for a short live or recorded announcement.",
      wpm: 135,
    },
    {
      id: "follow-up",
      title: "Warm follow-up voice draft",
      eyebrow: "Nudge without overexplaining",
      script: warmFollowUp,
      cue: "Use when a written nudge would feel colder than a spoken one.",
      wpm: 140,
    },
    {
      id: "rehearsal",
      title: "Pause-marked rehearsal",
      eyebrow: "Practice-ready pacing",
      script: insertBreathMarks(rehearsal),
      cue: "Read this once before recording; the markers force useful pauses.",
      wpm: 125,
    },
    {
      id: "cue-sheet",
      title: "Delivery cue sheet",
      eyebrow: "Keep beside the recorder",
      script: cueSheet,
      cue: "The compact version when you do not want to read a full script.",
      wpm: 120,
    },
  ];
}

function copyText(text: string): void {
  void navigator.clipboard?.writeText(text);
}

function speak(text: string, rate: number): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\[(pause|breathe)\]/g, ""));
  utterance.rate = rate;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export default function Home() {
  const [brief, setBrief] = useState<Brief>(() => {
    if (typeof window === "undefined") return defaultBrief;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultBrief;
    try {
      return { ...defaultBrief, ...(JSON.parse(saved) as Partial<Brief>) };
    } catch {
      return defaultBrief;
    }
  });
  const [selectedId, setSelectedId] = useState("voice-note");
  const [rate, setRate] = useState(0.95);

  const outputs = useMemo(() => buildOutputs(brief), [brief]);
  const selected = outputs.find((output) => output.id === selectedId) ?? outputs[0];
  const fullPack = outputs.map((output) => `## ${output.title}\n${output.script}`).join("\n\n");
  const totalWords = outputs.reduce((sum, output) => sum + wordCount(output.script), 0);

  function updateBrief<K extends keyof Brief>(key: K, value: Brief[K]): void {
    const next = { ...brief, [key]: value };
    setBrief(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <header className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur md:grid-cols-[1.35fr_0.65fr] md:p-8">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">Spoken Pack</p>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              One brief into spoken scripts, rehearsal cues, and read-aloud checks.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Draft the message once. Reuse it as a voice note, announcement, warm follow-up, pause-marked rehearsal, and cue sheet without starting over.
            </p>
          </div>
        </div>
        <div className="grid content-between gap-4 rounded-3xl border border-cyan-300/20 bg-slate-950/70 p-5">
          <div>
            <p className="text-sm text-slate-400">Pack output</p>
            <p className="mt-2 text-4xl font-black text-cyan-200">5 formats</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-slate-400">Total words</p>
              <p className="text-2xl font-bold">{totalWords}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-slate-400">Selected</p>
              <p className="text-2xl font-bold">{readingTime(selected.script, selected.wpm)}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="no-print rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Brief</p>
              <h2 className="mt-1 text-2xl font-bold">Input once</h2>
            </div>
            <button
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              onClick={() => {
                setBrief(defaultBrief);
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBrief));
              }}
            >
              Reset sample
            </button>
          </div>

          <label className="block space-y-2 text-sm font-medium text-slate-300">
            Audience
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-300/40 transition focus:ring-4"
              value={brief.audience}
              onChange={(event) => updateBrief("audience", event.target.value)}
            />
          </label>

          <label className="mt-4 block space-y-2 text-sm font-medium text-slate-300">
            Purpose
            <textarea
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-300/40 transition focus:ring-4"
              value={brief.purpose}
              onChange={(event) => updateBrief("purpose", event.target.value)}
            />
          </label>

          <label className="mt-4 block space-y-2 text-sm font-medium text-slate-300">
            Core point
            <textarea
              className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-300/40 transition focus:ring-4"
              value={brief.keyPoint}
              onChange={(event) => updateBrief("keyPoint", event.target.value)}
            />
          </label>

          <label className="mt-4 block space-y-2 text-sm font-medium text-slate-300">
            Ask or close
            <textarea
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-300/40 transition focus:ring-4"
              value={brief.ask}
              onChange={(event) => updateBrief("ask", event.target.value)}
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-300">
              Tone
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-300/40 transition focus:ring-4"
                value={brief.tone}
                onChange={(event) => updateBrief("tone", event.target.value as Tone)}
              >
                <option>Warm</option>
                <option>Formal</option>
                <option>Direct</option>
                <option>Calm</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-300">
              Detail level
              <select
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-cyan-300/40 transition focus:ring-4"
                value={brief.length}
                onChange={(event) => updateBrief("length", event.target.value as Length)}
              >
                <option>Short</option>
                <option>Medium</option>
                <option>Detailed</option>
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-5">
          <div className="no-print flex flex-wrap gap-2">
            {outputs.map((output) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selected.id === output.id ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
                key={output.id}
                onClick={() => setSelectedId(output.id)}
              >
                {output.title}
              </button>
            ))}
          </div>

          <article className="print-card rounded-[1.5rem] border border-cyan-200/20 bg-white p-6 text-slate-950 shadow-2xl md:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-700">{selected.eyebrow}</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">{selected.title}</h2>
                <p className="mt-2 text-sm text-slate-500">{selected.cue}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                {wordCount(selected.script)} words · {readingTime(selected.script, selected.wpm)}
              </div>
            </div>
            <pre className="mt-6 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-lg leading-8 text-slate-800">{selected.script}</pre>
            <div className="no-print mt-5 flex flex-wrap items-center gap-3">
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white" onClick={() => copyText(selected.script)}>
                Copy selected
              </button>
              <button className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-bold text-white" onClick={() => speak(selected.script, rate)}>
                Read aloud
              </button>
              <button className="rounded-full border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700" onClick={() => window.speechSynthesis?.cancel()}>
                Stop voice
              </button>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                Speed
                <input
                  aria-label="Read aloud speed"
                  className="accent-cyan-600"
                  max="1.25"
                  min="0.75"
                  step="0.05"
                  type="range"
                  value={rate}
                  onChange={(event) => setRate(Number(event.target.value))}
                />
                {rate.toFixed(2)}×
              </label>
            </div>
          </article>

          <div className="no-print grid gap-4 md:grid-cols-2">
            <button className="rounded-3xl border border-white/15 bg-white/10 p-5 text-left transition hover:bg-white/15" onClick={() => copyText(fullPack)}>
              <p className="text-lg font-bold">Copy full spoken pack</p>
              <p className="mt-1 text-sm text-slate-300">All five formats as clean Markdown.</p>
            </button>
            <button className="rounded-3xl border border-white/15 bg-white/10 p-5 text-left transition hover:bg-white/15" onClick={() => window.print()}>
              <p className="text-lg font-bold">Print cue card</p>
              <p className="mt-1 text-sm text-slate-300">Use browser print or save as PDF.</p>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
