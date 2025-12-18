"use client";

import { useState } from "react";
import {
  CognitiveButton,
  CognitiveButtonDebug,
  MemoryCard,
  MemoryCardDebug,
  IntentSurface,
  IntentSurfaceDebug,
} from "@/components/experimental";
import { AmbientBackground } from "@/components/experimental/AmbientBackground";

export default function Home() {
  const [showDebug, setShowDebug] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Sample data for Memory Card
  const memoryCardLayers = [
    {
      level: 0,
      content: (
        <p className="text-sm">
          This card remembers you. The more you interact, the more it reveals.
        </p>
      ),
    },
    {
      level: 0.2,
      content: (
        <p className="text-sm text-slate-400">
          You&apos;ve been here before. I can tell by how you move.
        </p>
      ),
    },
    {
      level: 0.4,
      content: (
        <div className="bg-slate-800/50 p-2 sm:p-3 rounded-lg text-sm">
          <span className="text-indigo-400">Secret:</span> Each visit builds our connection.
        </div>
      ),
    },
    {
      level: 0.6,
      content: (
        <p className="text-sm text-violet-400">
          You&apos;re becoming familiar. The card adapts to your pace.
        </p>
      ),
    },
    {
      level: 0.8,
      content: (
        <div className="border border-violet-500/30 p-2 sm:p-3 rounded-lg text-sm">
          <span className="text-violet-300">Deep Memory:</span> You&apos;ve unlocked the inner layer.
        </div>
      ),
    },
    {
      level: 1,
      content: (
        <p className="text-sm text-emerald-400 font-medium">
          Full recognition achieved. We know each other now.
        </p>
      ),
    },
  ];

  // Sample data for Intent Surface
  const intentSurfaceItems = [
    {
      id: "item-1",
      primary: "Adaptive Interfaces",
      secondary: "UI that responds to behavioral patterns, not just clicks.",
      detail: "Built on real-time intent detection algorithms that analyze scroll patterns, pauses, and focus shifts.",
      highlight: true,
    },
    {
      id: "item-2",
      primary: "Cognitive Components",
      secondary: "Elements that learn and remember user behavior over time.",
      detail: "Local storage persistence with decay functions for natural memory simulation.",
    },
    {
      id: "item-3",
      primary: "Motion Psychology",
      secondary: "Animations that communicate intention and emotional state.",
      detail: "Framer Motion powered with personality-driven configurations.",
      highlight: true,
    },
    {
      id: "item-4",
      primary: "Dark-First Design",
      secondary: "Optimized for focus and reduced cognitive load.",
      detail: "Subtle depth, soft light, and intelligent motion principles.",
    },
    {
      id: "item-5",
      primary: "Intent Detection",
      secondary: "Inferring user goals from micro-behaviors.",
      detail: "Scroll rhythm, pauses, focus changes all contribute to intent classification.",
    },
    {
      id: "item-6",
      primary: "Memory Layers",
      secondary: "Progressive content reveal based on relationship depth.",
      detail: "Each interaction adds to the memory profile, unlocking new experiences.",
    },
  ];

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden">
      {/* Ambient Background with particles and cursor effects */}
      <AmbientBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight">
            Fluxa
          </h1>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-colors ${
              showDebug
                ? "border-cyan-500/50 text-cyan-400 bg-cyan-500/10"
                : "border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            {showDebug ? "Hide Debug" : "Debug"}
          </button>
        </div>
      </header>

      <main className="pt-20 sm:pt-24 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12 sm:space-y-24">
          {/* Intro */}
          <section className="text-center space-y-3 sm:space-y-4 py-6 sm:py-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent px-2">
              UI That Feels Alive
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base md:text-lg px-2">
              Three experimental components that observe, remember, and adapt to how you behave—not just what you click.
            </p>
          </section>

          {/* Component 1: Cognitive Button */}
          <section className="space-y-4 sm:space-y-8">
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-white">
                01. Cognitive Button
              </h3>
              <p className="text-slate-400 max-w-2xl text-sm sm:text-base">
                A button that observes your behavior over time. It learns your hover patterns, click speed, and hesitation signals—then shifts its visual personality to match your interaction style.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:gap-8">
              <div className="w-full bg-slate-900/50 border border-slate-800/50 rounded-xl sm:rounded-2xl p-6 sm:p-12 flex flex-col items-center justify-center gap-4 sm:gap-8">
                <CognitiveButton
                  id="demo-cognitive-btn"
                  onClick={() => setClickCount((c) => c + 1)}
                  className="scale-90 sm:scale-100"
                >
                  Experience Me
                </CognitiveButton>

                <p className="text-xs sm:text-sm text-slate-500 text-center">
                  Clicked {clickCount} times. Try different speeds and patterns.
                </p>
              </div>

              {showDebug && (
                <div className="w-full lg:w-72">
                  <CognitiveButtonDebug id="demo-cognitive-btn" />
                </div>
              )}
            </div>

            <div className="bg-slate-800/30 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-700/30">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2 sm:mb-3">
                Why it&apos;s psychologically surprising:
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Traditional buttons are static—they look the same for everyone. The Cognitive Button breaks this by creating a unique visual fingerprint for each user. It detects hesitation, confidence, and familiarity. The button then shifts between personalities: calm for power users, inviting for hesitant users, assertive for confident ones.
              </p>
            </div>
          </section>

          {/* Component 2: Memory Card */}
          <section className="space-y-4 sm:space-y-8">
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-white">
                02. Memory Card
              </h3>
              <p className="text-slate-400 max-w-2xl text-sm sm:text-base">
                A card that remembers how you interacted with it. On each return visit, it reveals content differently—using motion to suggest memory and recognition.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:gap-8">
              <div className="w-full">
                <MemoryCard
                  id="demo-memory-card"
                  title="I Remember You"
                  layers={memoryCardLayers}
                  className="w-full"
                />
              </div>

              {showDebug && (
                <div className="w-full lg:w-72">
                  <MemoryCardDebug id="demo-memory-card" />
                </div>
              )}
            </div>

            <div className="bg-slate-800/30 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-700/30">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2 sm:mb-3">
                Why it&apos;s psychologically surprising:
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                The Memory Card challenges the assumption that UI is stateless. It tracks interaction layers—glances, studies, and returns—building a recognition level over time. Content progressively reveals based on relationship depth. It feels like the UI remembers you personally.
              </p>
            </div>
          </section>

          {/* Component 3: Intent Surface */}
          <section className="space-y-4 sm:space-y-8">
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold text-white">
                03. Intent Surface
              </h3>
              <p className="text-slate-400 max-w-2xl text-sm sm:text-base">
                A layout that morphs based on inferred user intent. It analyzes scroll rhythm, pauses, and focus patterns to determine if you&apos;re browsing, searching, reading, comparing, or deciding.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:gap-8">
              <div className="w-full overflow-hidden rounded-xl sm:rounded-2xl">
                <IntentSurface
                  id="demo-intent-surface"
                  items={intentSurfaceItems}
                  className="w-full"
                />
              </div>

              {showDebug && (
                <div className="w-full lg:w-72">
                  <IntentSurfaceDebug id="demo-intent-surface" />
                </div>
              )}
            </div>

            <div className="bg-slate-800/30 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-slate-700/30">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2 sm:mb-3">
                Why it&apos;s psychologically surprising:
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Most layouts are fixed—designed for one use case. The Intent Surface detects five distinct behavioral modes and silently adapts. Users don&apos;t notice the change, but the UI always feels right for their current goal.
              </p>
            </div>
          </section>

          {/* Footer philosophy */}
          <section className="text-center space-y-4 sm:space-y-6 py-8 sm:py-12 border-t border-slate-800/50">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-300">
              Design Philosophy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-xs sm:text-sm text-slate-400">
              <div className="space-y-1 sm:space-y-2 p-4 bg-slate-900/30 rounded-lg">
                <div className="text-base sm:text-lg text-white">Aware</div>
                <p>UI should feel aware, not static. It observes how users behave.</p>
              </div>
              <div className="space-y-1 sm:space-y-2 p-4 bg-slate-900/30 rounded-lg">
                <div className="text-base sm:text-lg text-white">Adaptive</div>
                <p>Motion communicates intention. Components feel alive but never annoying.</p>
              </div>
              <div className="space-y-1 sm:space-y-2 p-4 bg-slate-900/30 rounded-lg">
                <div className="text-base sm:text-lg text-white">Memorable</div>
                <p>UI builds relationships over time. Each interaction adds depth.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
