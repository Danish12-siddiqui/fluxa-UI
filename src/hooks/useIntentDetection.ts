"use client";

import { useCallback, useRef, useState, useEffect } from "react";

export type Intent =
  | "browsing"     // Casual scrolling, no specific goal
  | "searching"    // Quick movements, looking for something
  | "reading"      // Slow scroll, focused attention
  | "comparing"    // Back and forth movements
  | "deciding"     // Hovering over specific areas, pauses
  | "leaving";     // Fast scroll towards edge, attention waning

interface ScrollPattern {
  timestamp: number;
  position: number;
  velocity: number;
  direction: "up" | "down" | "none";
}

interface FocusEvent {
  timestamp: number;
  element: string | null;
  duration: number;
}

interface IntentSignals {
  scrollPatterns: ScrollPattern[];
  focusEvents: FocusEvent[];
  pauseCount: number;
  directionChanges: number;
  averageVelocity: number;
  timeOnSurface: number;
  lastActivity: number;
}

interface IntentProfile {
  currentIntent: Intent;
  confidence: number; // 0-1, how confident in the detected intent
  attention: number; // 0-1, user's attention level
  urgency: number; // 0-1, how urgent the user's behavior seems
  suggestedLayout: "expanded" | "compact" | "focused" | "minimal";
}

export function useIntentDetection(surfaceId: string) {
  const [signals, setSignals] = useState<IntentSignals>({
    scrollPatterns: [],
    focusEvents: [],
    pauseCount: 0,
    directionChanges: 0,
    averageVelocity: 0,
    timeOnSurface: 0,
    lastActivity: Date.now(),
  });

  const [profile, setProfile] = useState<IntentProfile>({
    currentIntent: "browsing",
    confidence: 0.5,
    attention: 0.5,
    urgency: 0.3,
    suggestedLayout: "expanded",
  });

  const lastScrollPosition = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const lastDirection = useRef<"up" | "down" | "none">("none");
  const pauseTimer = useRef<NodeJS.Timeout | null>(null);
  const surfaceEntryTime = useRef(Date.now());
  const currentFocusElement = useRef<string | null>(null);
  const focusStartTime = useRef(Date.now());

  // Calculate intent from signals
  useEffect(() => {
    const newProfile = calculateIntent(signals);
    setProfile(newProfile);
  }, [signals]);

  // Track time on surface
  useEffect(() => {
    const interval = setInterval(() => {
      setSignals((prev) => ({
        ...prev,
        timeOnSurface: Date.now() - surfaceEntryTime.current,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const onScroll = useCallback((scrollY: number, containerHeight: number) => {
    const now = Date.now();
    const timeDelta = now - lastScrollTime.current;
    const positionDelta = scrollY - lastScrollPosition.current;
    const velocity = timeDelta > 0 ? Math.abs(positionDelta) / timeDelta * 1000 : 0;

    // Determine direction
    const direction: "up" | "down" | "none" =
      positionDelta > 5 ? "down" : positionDelta < -5 ? "up" : "none";

    // Count direction changes (comparing behavior signal)
    const isDirectionChange =
      direction !== "none" &&
      lastDirection.current !== "none" &&
      direction !== lastDirection.current;

    // Clear pause timer on scroll
    if (pauseTimer.current) {
      clearTimeout(pauseTimer.current);
    }

    // Set new pause timer
    pauseTimer.current = setTimeout(() => {
      setSignals((prev) => ({
        ...prev,
        pauseCount: prev.pauseCount + 1,
        lastActivity: Date.now(),
      }));
    }, 800); // Pause detected after 800ms of no scroll

    const newPattern: ScrollPattern = {
      timestamp: now,
      position: scrollY / containerHeight, // Normalized
      velocity,
      direction,
    };

    setSignals((prev) => {
      const patterns = [...prev.scrollPatterns.slice(-30), newPattern];
      const avgVelocity = patterns.reduce((a, b) => a + b.velocity, 0) / patterns.length;

      return {
        ...prev,
        scrollPatterns: patterns,
        directionChanges: isDirectionChange ? prev.directionChanges + 1 : prev.directionChanges,
        averageVelocity: avgVelocity,
        lastActivity: now,
      };
    });

    lastScrollPosition.current = scrollY;
    lastScrollTime.current = now;
    if (direction !== "none") {
      lastDirection.current = direction;
    }
  }, []);

  const onFocusChange = useCallback((elementId: string | null) => {
    const now = Date.now();

    // Record previous focus duration
    if (currentFocusElement.current) {
      const duration = now - focusStartTime.current;
      const newEvent: FocusEvent = {
        timestamp: now,
        element: currentFocusElement.current,
        duration,
      };

      setSignals((prev) => ({
        ...prev,
        focusEvents: [...prev.focusEvents.slice(-20), newEvent],
        lastActivity: now,
      }));
    }

    currentFocusElement.current = elementId;
    focusStartTime.current = now;
  }, []);

  const onMouseMove = useCallback((x: number, y: number, containerRect: DOMRect) => {
    // Detect if user is moving towards edge (leaving signal)
    const edgeThreshold = 50;
    const nearEdge =
      x < edgeThreshold ||
      x > containerRect.width - edgeThreshold ||
      y < edgeThreshold ||
      y > containerRect.height - edgeThreshold;

    if (nearEdge) {
      setSignals((prev) => ({
        ...prev,
        lastActivity: Date.now(),
      }));
    }
  }, []);

  const resetSignals = useCallback(() => {
    surfaceEntryTime.current = Date.now();
    setSignals({
      scrollPatterns: [],
      focusEvents: [],
      pauseCount: 0,
      directionChanges: 0,
      averageVelocity: 0,
      timeOnSurface: 0,
      lastActivity: Date.now(),
    });
  }, []);

  return {
    signals,
    profile,
    handlers: {
      onScroll,
      onFocusChange,
      onMouseMove,
    },
    resetSignals,
  };
}

function calculateIntent(signals: IntentSignals): IntentProfile {
  const { scrollPatterns, focusEvents, pauseCount, directionChanges, averageVelocity, timeOnSurface } = signals;

  // Calculate base metrics
  const recentVelocity = scrollPatterns.slice(-5).reduce((a, b) => a + b.velocity, 0) / 5 || 0;
  const recentPauses = pauseCount;
  const recentDirectionChanges = directionChanges;
  const avgFocusDuration = focusEvents.length > 0
    ? focusEvents.reduce((a, b) => a + b.duration, 0) / focusEvents.length
    : 0;

  // Determine intent based on behavior patterns
  let currentIntent: Intent = "browsing";
  let confidence = 0.5;
  let attention = 0.5;
  let urgency = 0.3;

  // Searching: High velocity, few pauses, minimal direction changes
  if (recentVelocity > 300 && recentPauses < 2 && recentDirectionChanges < 3) {
    currentIntent = "searching";
    confidence = Math.min(0.9, recentVelocity / 500);
    attention = 0.4;
    urgency = 0.8;
  }
  // Reading: Low velocity, regular pauses, minimal direction changes
  else if (recentVelocity < 100 && recentPauses > 3 && avgFocusDuration > 1000) {
    currentIntent = "reading";
    confidence = Math.min(0.9, avgFocusDuration / 3000);
    attention = 0.9;
    urgency = 0.1;
  }
  // Comparing: Many direction changes, moderate velocity
  else if (recentDirectionChanges > 5 && recentVelocity > 50 && recentVelocity < 300) {
    currentIntent = "comparing";
    confidence = Math.min(0.85, recentDirectionChanges / 10);
    attention = 0.7;
    urgency = 0.5;
  }
  // Deciding: Pauses on specific elements, low velocity, moderate focus time
  else if (recentPauses > 5 && recentVelocity < 50 && avgFocusDuration > 500) {
    currentIntent = "deciding";
    confidence = Math.min(0.85, recentPauses / 8);
    attention = 0.85;
    urgency = 0.6;
  }
  // Leaving: Very low activity, edge proximity would be detected separately
  else if (Date.now() - signals.lastActivity > 5000 || recentVelocity > 500) {
    currentIntent = "leaving";
    confidence = 0.6;
    attention = 0.2;
    urgency = 0.9;
  }
  // Default: Browsing
  else {
    currentIntent = "browsing";
    confidence = 0.5;
    attention = 0.5;
    urgency = 0.3;
  }

  // Determine suggested layout based on intent
  let suggestedLayout: IntentProfile["suggestedLayout"];
  switch (currentIntent) {
    case "searching":
      suggestedLayout = "compact"; // Show more items quickly
      break;
    case "reading":
      suggestedLayout = "focused"; // Maximize readability
      break;
    case "comparing":
      suggestedLayout = "expanded"; // Show side by side
      break;
    case "deciding":
      suggestedLayout = "focused"; // Highlight decision points
      break;
    case "leaving":
      suggestedLayout = "minimal"; // Reduce cognitive load
      break;
    default:
      suggestedLayout = "expanded";
  }

  return {
    currentIntent,
    confidence,
    attention,
    urgency,
    suggestedLayout,
  };
}
