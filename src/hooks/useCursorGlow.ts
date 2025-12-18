"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface GlowPoint {
  x: number;
  y: number;
  intensity: number;
  timestamp: number;
}

interface CursorGlowConfig {
  color?: string;
  size?: number;
  trailLength?: number;
  decay?: number;
}

export function useCursorGlow(config: CursorGlowConfig = {}) {
  const {
    color = "rgba(99, 102, 241, 0.5)",
    size = 300,
    trailLength = 8,
    decay = 0.92,
  } = config;

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<GlowPoint[]>([]);
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const lastTime = useRef(Date.now());
  const moveTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const now = Date.now();
      const dt = now - lastTime.current;

      if (dt > 0) {
        const vx = (e.clientX - lastPosition.current.x) / dt;
        const vy = (e.clientY - lastPosition.current.y) / dt;
        setVelocity({ x: vx * 100, y: vy * 100 });
      }

      lastPosition.current = { x: e.clientX, y: e.clientY };
      lastTime.current = now;

      setPosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);

      // Add to trail
      setTrail((prev) => {
        const newTrail = [
          ...prev,
          {
            x: e.clientX,
            y: e.clientY,
            intensity: 1,
            timestamp: now,
          },
        ].slice(-trailLength);
        return newTrail;
      });

      // Reset moving state after delay
      if (moveTimeout.current) {
        clearTimeout(moveTimeout.current);
      }
      moveTimeout.current = setTimeout(() => {
        setIsMoving(false);
      }, 100);
    },
    [trailLength]
  );

  // Decay trail intensity
  useEffect(() => {
    const interval = setInterval(() => {
      setTrail((prev) =>
        prev
          .map((point) => ({
            ...point,
            intensity: point.intensity * decay,
          }))
          .filter((point) => point.intensity > 0.01)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [decay]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

  return {
    position,
    velocity,
    speed,
    isMoving,
    trail,
    glowStyle: {
      background: `radial-gradient(circle at center, ${color}, transparent 70%)`,
      width: size + speed * 0.5,
      height: size + speed * 0.5,
      left: position.x - (size + speed * 0.5) / 2,
      top: position.y - (size + speed * 0.5) / 2,
    },
  };
}
