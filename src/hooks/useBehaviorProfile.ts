"use client";

import { useCallback, useRef, useState, useEffect } from "react";

export type Personality = "calm" | "assertive" | "inviting" | "curious" | "hesitant";

interface BehaviorMetrics {
  // Hover patterns
  hoverCount: number;
  totalHoverDuration: number;
  averageHoverDuration: number;
  hoverVelocity: number[]; // Speed of mouse movement during hover

  // Click patterns
  clickCount: number;
  clickSpeed: number[]; // Time between hover start and click
  doubleClickCount: number;

  // Hesitation signals
  hoverWithoutClick: number;
  approachRetreatCount: number; // Times user approached then left

  // Confidence signals
  directApproaches: number; // Fast, direct movements to button
  lastInteractionTime: number;
}

interface BehaviorProfile {
  personality: Personality;
  confidence: number; // 0-1, how confident is the user
  engagement: number; // 0-1, how engaged is the user
  familiarity: number; // 0-1, how familiar is the user with this button
}

const STORAGE_KEY_PREFIX = "cognitive_btn_";

export function useBehaviorProfile(componentId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${componentId}`;

  const [metrics, setMetrics] = useState<BehaviorMetrics>(() => {
    if (typeof window === "undefined") {
      return getDefaultMetrics();
    }
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : getDefaultMetrics();
  });

  const [profile, setProfile] = useState<BehaviorProfile>({
    personality: "calm",
    confidence: 0.5,
    engagement: 0.5,
    familiarity: 0,
  });

  const hoverStartTime = useRef<number>(0);
  const lastMousePosition = useRef<{ x: number; y: number } | null>(null);
  const isHovering = useRef(false);
  const approachStartDistance = useRef<number | null>(null);

  // Persist metrics to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(metrics));
  }, [metrics, storageKey]);

  // Calculate personality from metrics
  useEffect(() => {
    const newProfile = calculateProfile(metrics);
    setProfile(newProfile);
  }, [metrics]);

  const onHoverStart = useCallback((e: React.MouseEvent) => {
    hoverStartTime.current = Date.now();
    isHovering.current = true;
    lastMousePosition.current = { x: e.clientX, y: e.clientY };

    setMetrics((prev) => ({
      ...prev,
      hoverCount: prev.hoverCount + 1,
      lastInteractionTime: Date.now(),
    }));
  }, []);

  const onHoverEnd = useCallback(() => {
    if (!isHovering.current) return;

    const duration = Date.now() - hoverStartTime.current;
    isHovering.current = false;

    setMetrics((prev) => {
      const newTotalDuration = prev.totalHoverDuration + duration;
      const newHoverCount = prev.hoverCount;

      return {
        ...prev,
        totalHoverDuration: newTotalDuration,
        averageHoverDuration: newTotalDuration / newHoverCount,
        hoverWithoutClick: prev.hoverWithoutClick + 1,
      };
    });
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent, buttonRect: DOMRect) => {
    if (!lastMousePosition.current) {
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const dx = e.clientX - lastMousePosition.current.x;
    const dy = e.clientY - lastMousePosition.current.y;
    const velocity = Math.sqrt(dx * dx + dy * dy);

    // Track approach/retreat behavior
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;
    const currentDistance = Math.sqrt(
      Math.pow(e.clientX - buttonCenterX, 2) +
      Math.pow(e.clientY - buttonCenterY, 2)
    );

    if (approachStartDistance.current === null) {
      approachStartDistance.current = currentDistance;
    }

    // Detect fast, direct approach (confidence signal)
    if (velocity > 15 && currentDistance < approachStartDistance.current * 0.5) {
      setMetrics((prev) => ({
        ...prev,
        directApproaches: prev.directApproaches + 1,
      }));
    }

    if (isHovering.current) {
      setMetrics((prev) => ({
        ...prev,
        hoverVelocity: [...prev.hoverVelocity.slice(-20), velocity],
      }));
    }

    lastMousePosition.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onClick = useCallback(() => {
    const clickTime = Date.now() - hoverStartTime.current;

    setMetrics((prev) => {
      // Detect double click
      const isDoubleClick = prev.clickSpeed.length > 0 &&
        Date.now() - prev.lastInteractionTime < 400;

      return {
        ...prev,
        clickCount: prev.clickCount + 1,
        clickSpeed: [...prev.clickSpeed.slice(-10), clickTime],
        doubleClickCount: isDoubleClick ? prev.doubleClickCount + 1 : prev.doubleClickCount,
        hoverWithoutClick: Math.max(0, prev.hoverWithoutClick - 1),
        lastInteractionTime: Date.now(),
      };
    });
  }, []);

  const onApproachRetreat = useCallback(() => {
    setMetrics((prev) => ({
      ...prev,
      approachRetreatCount: prev.approachRetreatCount + 1,
    }));
    approachStartDistance.current = null;
  }, []);

  const resetProfile = useCallback(() => {
    const defaultMetrics = getDefaultMetrics();
    setMetrics(defaultMetrics);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    metrics,
    profile,
    handlers: {
      onHoverStart,
      onHoverEnd,
      onMouseMove,
      onClick,
      onApproachRetreat,
    },
    resetProfile,
  };
}

function getDefaultMetrics(): BehaviorMetrics {
  return {
    hoverCount: 0,
    totalHoverDuration: 0,
    averageHoverDuration: 0,
    hoverVelocity: [],
    clickCount: 0,
    clickSpeed: [],
    doubleClickCount: 0,
    hoverWithoutClick: 0,
    approachRetreatCount: 0,
    directApproaches: 0,
    lastInteractionTime: 0,
  };
}

function calculateProfile(metrics: BehaviorMetrics): BehaviorProfile {
  // Calculate familiarity based on total interactions
  const totalInteractions = metrics.clickCount + metrics.hoverCount;
  const familiarity = Math.min(1, totalInteractions / 50);

  // Calculate confidence based on click speed and direct approaches
  const avgClickSpeed = metrics.clickSpeed.length > 0
    ? metrics.clickSpeed.reduce((a, b) => a + b, 0) / metrics.clickSpeed.length
    : 1000;
  const clickSpeedConfidence = Math.max(0, 1 - avgClickSpeed / 2000);
  const directApproachRatio = metrics.hoverCount > 0
    ? metrics.directApproaches / metrics.hoverCount
    : 0;
  const confidence = (clickSpeedConfidence * 0.6 + directApproachRatio * 0.4);

  // Calculate engagement based on hover patterns
  const hoverEngagement = Math.min(1, metrics.averageHoverDuration / 1500);
  const retreatPenalty = Math.min(0.5, metrics.approachRetreatCount * 0.1);
  const engagement = Math.max(0, hoverEngagement - retreatPenalty);

  // Determine personality
  let personality: Personality;

  if (familiarity > 0.7 && confidence > 0.6) {
    personality = "calm"; // User knows what they're doing
  } else if (confidence > 0.7 && metrics.directApproaches > 3) {
    personality = "assertive"; // Match user's directness
  } else if (metrics.hoverWithoutClick > 5 || metrics.approachRetreatCount > 3) {
    personality = "inviting"; // User seems hesitant, be welcoming
  } else if (engagement > 0.6 && metrics.averageHoverDuration > 800) {
    personality = "curious"; // User is exploring
  } else if (metrics.approachRetreatCount > 1 || avgClickSpeed > 1500) {
    personality = "hesitant"; // User might be unsure
  } else {
    personality = "calm"; // Default
  }

  return {
    personality,
    confidence: Math.min(1, Math.max(0, confidence)),
    engagement: Math.min(1, Math.max(0, engagement)),
    familiarity,
  };
}
