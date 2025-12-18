"use client";

import { useRef, useCallback, useState } from "react";
import { useMotionValue, useSpring, frame } from "framer-motion";

interface MagneticConfig {
  strength?: number;
  radius?: number;
  smoothing?: number;
}

export function useMagneticEffect(config: MagneticConfig = {}) {
  const { strength = 0.4, radius = 150, smoothing = 0.15 } = config;

  const elementRef = useRef<HTMLElement | null>(null);
  const [isInRange, setIsInRange] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const scale = useMotionValue(1);

  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);
  const springScale = useSpring(scale, springConfig);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!elementRef.current) return;

      const rect = elementRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      if (distance < radius) {
        setIsInRange(true);
        const pullStrength = 1 - distance / radius;

        frame.read(() => {
          x.set(distanceX * strength * pullStrength);
          y.set(distanceY * strength * pullStrength);
          rotateX.set((-distanceY / rect.height) * 20 * pullStrength);
          rotateY.set((distanceX / rect.width) * 20 * pullStrength);
          scale.set(1 + pullStrength * 0.08);
        });
      } else {
        setIsInRange(false);
        frame.read(() => {
          x.set(0);
          y.set(0);
          rotateX.set(0);
          rotateY.set(0);
          scale.set(1);
        });
      }
    },
    [strength, radius, x, y, rotateX, rotateY, scale]
  );

  const handleMouseLeave = useCallback(() => {
    setIsInRange(false);
    x.set(0);
    y.set(0);
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  }, [x, y, rotateX, rotateY, scale]);

  const bind = useCallback(
    (ref: HTMLElement | null) => {
      elementRef.current = ref;

      if (ref) {
        window.addEventListener("mousemove", handleMouseMove);
        ref.addEventListener("mouseleave", handleMouseLeave);
      }

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        if (ref) {
          ref.removeEventListener("mouseleave", handleMouseLeave);
        }
      };
    },
    [handleMouseMove, handleMouseLeave]
  );

  return {
    bind,
    isInRange,
    style: {
      x: springX,
      y: springY,
      rotateX: springRotateX,
      rotateY: springRotateY,
      scale: springScale,
    },
  };
}
