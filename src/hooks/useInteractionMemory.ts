"use client";

import { useCallback, useState, useEffect, useRef } from "react";

export interface MemoryLayer {
  timestamp: number;
  interactionType: "glance" | "study" | "engage" | "return";
  duration: number;
  focusPoints: { x: number; y: number }[]; // Where user looked/hovered
  scrollDepth: number; // How far they scrolled within card
  emotionalSignature: "curious" | "impatient" | "thorough" | "distracted";
}

interface InteractionMemory {
  visitCount: number;
  totalTimeSpent: number;
  layers: MemoryLayer[];
  lastVisit: number;
  recognitionLevel: number; // 0-1, how well the card "knows" the user
  revealProgress: number; // 0-1, how much content has been revealed
  preferredRevealSpeed: "slow" | "medium" | "fast";
}

const STORAGE_KEY_PREFIX = "memory_card_";

export function useInteractionMemory(cardId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${cardId}`;

  const [memory, setMemory] = useState<InteractionMemory>(() => {
    if (typeof window === "undefined") return getDefaultMemory();
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : getDefaultMemory();
  });

  const [currentSession, setCurrentSession] = useState({
    startTime: 0,
    focusPoints: [] as { x: number; y: number }[],
    isActive: false,
    scrollDepth: 0,
  });

  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const studyTimeout = useRef<NodeJS.Timeout | null>(null);

  // Persist memory
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(memory));
  }, [memory, storageKey]);

  // Calculate time since last visit for "recognition" behavior
  const timeSinceLastVisit = memory.lastVisit
    ? Date.now() - memory.lastVisit
    : Infinity;

  // Determine if this is a "return" visit (came back after being away)
  const isReturningUser = timeSinceLastVisit > 60000 && memory.visitCount > 0; // 1 minute

  const onEnter = useCallback(() => {
    setCurrentSession({
      startTime: Date.now(),
      focusPoints: [],
      isActive: true,
      scrollDepth: 0,
    });

    // Start tracking for "glance" vs "study" detection
    hoverTimeout.current = setTimeout(() => {
      // User stayed more than 500ms = not just a glance
    }, 500);

    studyTimeout.current = setTimeout(() => {
      // User stayed more than 2s = studying
    }, 2000);
  }, []);

  const onLeave = useCallback(() => {
    if (!currentSession.isActive) return;

    const duration = Date.now() - currentSession.startTime;

    // Clear timeouts
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (studyTimeout.current) clearTimeout(studyTimeout.current);

    // Determine interaction type
    let interactionType: MemoryLayer["interactionType"];
    if (isReturningUser) {
      interactionType = "return";
    } else if (duration < 500) {
      interactionType = "glance";
    } else if (duration < 2000) {
      interactionType = "engage";
    } else {
      interactionType = "study";
    }

    // Determine emotional signature based on behavior
    let emotionalSignature: MemoryLayer["emotionalSignature"];
    const avgMovement = calculateAverageMovement(currentSession.focusPoints);

    if (avgMovement > 50 && duration < 1000) {
      emotionalSignature = "impatient";
    } else if (duration > 3000 && currentSession.scrollDepth > 0.5) {
      emotionalSignature = "thorough";
    } else if (avgMovement > 30) {
      emotionalSignature = "distracted";
    } else {
      emotionalSignature = "curious";
    }

    const newLayer: MemoryLayer = {
      timestamp: Date.now(),
      interactionType,
      duration,
      focusPoints: currentSession.focusPoints.slice(-20),
      scrollDepth: currentSession.scrollDepth,
      emotionalSignature,
    };

    setMemory((prev) => {
      const newVisitCount = prev.visitCount + 1;
      const newTotalTime = prev.totalTimeSpent + duration;

      // Recognition grows with visits but decays with time
      const decayFactor = Math.max(0.5, 1 - timeSinceLastVisit / (7 * 24 * 60 * 60 * 1000));
      const recognitionGrowth = 0.1 * (interactionType === "study" ? 2 : 1);
      const newRecognition = Math.min(1, prev.recognitionLevel * decayFactor + recognitionGrowth);

      // Reveal progress increases based on interaction quality
      const revealIncrease = interactionType === "study" ? 0.15 :
        interactionType === "engage" ? 0.08 :
        interactionType === "return" ? 0.1 : 0.02;
      const newRevealProgress = Math.min(1, prev.revealProgress + revealIncrease);

      // Determine preferred reveal speed based on behavior patterns
      const recentLayers = [...prev.layers.slice(-5), newLayer];
      const avgDuration = recentLayers.reduce((a, b) => a + b.duration, 0) / recentLayers.length;
      const preferredRevealSpeed: "slow" | "medium" | "fast" =
        avgDuration > 3000 ? "slow" : avgDuration > 1500 ? "medium" : "fast";

      return {
        visitCount: newVisitCount,
        totalTimeSpent: newTotalTime,
        layers: [...prev.layers.slice(-50), newLayer],
        lastVisit: Date.now(),
        recognitionLevel: newRecognition,
        revealProgress: newRevealProgress,
        preferredRevealSpeed,
      };
    });

    setCurrentSession((prev) => ({ ...prev, isActive: false }));
  }, [currentSession, isReturningUser, timeSinceLastVisit]);

  const onMouseMove = useCallback((x: number, y: number) => {
    if (!currentSession.isActive) return;

    setCurrentSession((prev) => ({
      ...prev,
      focusPoints: [...prev.focusPoints.slice(-50), { x, y }],
    }));
  }, [currentSession.isActive]);

  const onScroll = useCallback((depth: number) => {
    setCurrentSession((prev) => ({
      ...prev,
      scrollDepth: Math.max(prev.scrollDepth, depth),
    }));
  }, []);

  const resetMemory = useCallback(() => {
    const defaultMemory = getDefaultMemory();
    setMemory(defaultMemory);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Get the most recent emotional signature for UI adaptation
  const currentMood = memory.layers.length > 0
    ? memory.layers[memory.layers.length - 1].emotionalSignature
    : "curious";

  return {
    memory,
    currentMood,
    isReturningUser,
    timeSinceLastVisit,
    handlers: {
      onEnter,
      onLeave,
      onMouseMove,
      onScroll,
    },
    resetMemory,
  };
}

function getDefaultMemory(): InteractionMemory {
  return {
    visitCount: 0,
    totalTimeSpent: 0,
    layers: [],
    lastVisit: 0,
    recognitionLevel: 0,
    revealProgress: 0,
    preferredRevealSpeed: "medium",
  };
}

function calculateAverageMovement(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0;

  let totalMovement = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalMovement += Math.sqrt(dx * dx + dy * dy);
  }

  return totalMovement / (points.length - 1);
}
