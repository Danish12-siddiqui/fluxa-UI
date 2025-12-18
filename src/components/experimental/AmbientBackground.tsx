"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AmbientParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  life: number;
  maxLife: number;
}

interface NeuralConnection {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

interface CursorTrailPoint {
  id: number;
  x: number;
  y: number;
  age: number;
}

export function AmbientBackground() {
  const [particles, setParticles] = useState<AmbientParticle[]>([]);
  const [connections, setConnections] = useState<NeuralConnection[]>([]);
  const [cursorTrail, setCursorTrail] = useState<CursorTrailPoint[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const moveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSpawn = useRef(0);

  // Initialize dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Mouse tracking
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setIsMoving(true);

    // Add to cursor trail
    const now = Date.now();
    if (now - lastSpawn.current > 30) {
      setCursorTrail((prev) => [
        ...prev.slice(-15),
        { id: now, x: e.clientX, y: e.clientY, age: 0 },
      ]);
      lastSpawn.current = now;
    }

    // Spawn particles near cursor
    if (Math.random() < 0.3) {
      const newParticle: AmbientParticle = {
        id: Date.now() + Math.random(),
        x: e.clientX + (Math.random() - 0.5) * 50,
        y: e.clientY + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1,
        size: 2 + Math.random() * 3,
        hue: 220 + Math.random() * 60,
        life: 1,
        maxLife: 60 + Math.random() * 60,
      };
      setParticles((prev) => [...prev.slice(-50), newParticle]);
    }

    if (moveTimeout.current) clearTimeout(moveTimeout.current);
    moveTimeout.current = setTimeout(() => setIsMoving(false), 150);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Spawn ambient particles
  useEffect(() => {
    const interval = setInterval(() => {
      if (dimensions.width === 0) return;

      const newParticle: AmbientParticle = {
        id: Date.now() + Math.random(),
        x: Math.random() * dimensions.width,
        y: dimensions.height + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 1,
        size: 1 + Math.random() * 2,
        hue: 200 + Math.random() * 80,
        life: 1,
        maxLife: 200 + Math.random() * 200,
      };
      setParticles((prev) => [...prev.slice(-80), newParticle]);
    }, 300);
    return () => clearInterval(interval);
  }, [dimensions]);

  // Update particles and calculate connections
  useEffect(() => {
    const interval = setInterval(() => {
      // Update particles
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx + (mousePos.x - p.x) * 0.001 * (isMoving ? 5 : 1),
            y: p.y + p.vy,
            vy: p.vy - 0.01, // Slight upward drift
            life: p.life - 1 / p.maxLife,
          }))
          .filter((p) => p.life > 0 && p.y > -50);

        // Calculate connections between nearby particles
        const newConnections: NeuralConnection[] = [];
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const dx = updated[i].x - updated[j].x;
            const dy = updated[i].y - updated[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
              newConnections.push({
                id: `${i}-${j}`,
                x1: updated[i].x,
                y1: updated[i].y,
                x2: updated[j].x,
                y2: updated[j].y,
                opacity: (1 - dist / 100) * 0.2 * Math.min(updated[i].life, updated[j].life),
              });
            }
          }
        }
        setConnections(newConnections.slice(0, 50));

        return updated;
      });

      // Age cursor trail
      setCursorTrail((prev) =>
        prev
          .map((p) => ({ ...p, age: p.age + 1 }))
          .filter((p) => p.age < 20)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [mousePos, isMoving]);

  // Gradient orbs positions
  const orbs = useMemo(() => [
    { x: 20, y: 30, size: 600, hue: 230, delay: 0 },
    { x: 80, y: 70, size: 500, hue: 270, delay: 2 },
    { x: 50, y: 50, size: 700, hue: 200, delay: 4 },
  ], []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Deep gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 50%,
              rgba(10, 10, 20, 1) 0%,
              rgba(5, 5, 15, 1) 100%
            )
          `,
        }}
      />

      {/* Floating gradient orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: orb.size,
            height: orb.size,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle at 50% 50%,
              hsla(${orb.hue}, 70%, 20%, 0.15),
              transparent 70%
            )`,
            filter: "blur(60px)",
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 20 + i * 5,
            repeat: Infinity,
            delay: orb.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Neural connections */}
      <svg className="absolute inset-0 w-full h-full">
        {connections.map((conn) => (
          <line
            key={conn.id}
            x1={conn.x1}
            y1={conn.y1}
            x2={conn.x2}
            y2={conn.y2}
            stroke={`rgba(100, 150, 255, ${conn.opacity})`}
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* Ambient particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            transform: "translate(-50%, -50%)",
            background: `hsla(${particle.hue}, 70%, 60%, ${particle.life * 0.6})`,
            boxShadow: `0 0 ${particle.size * 3}px hsla(${particle.hue}, 70%, 60%, ${particle.life * 0.3})`,
          }}
        />
      ))}

      {/* Cursor trail */}
      {cursorTrail.map((point, index) => (
        <motion.div
          key={point.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: point.x,
            top: point.y,
            width: 8 - point.age * 0.3,
            height: 8 - point.age * 0.3,
            transform: "translate(-50%, -50%)",
            background: `rgba(150, 180, 255, ${0.3 - point.age * 0.015})`,
            boxShadow: `0 0 ${15 - point.age * 0.5}px rgba(150, 180, 255, ${0.2 - point.age * 0.01})`,
          }}
        />
      ))}

      {/* Cursor glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: mousePos.x,
          top: mousePos.y,
          width: 300,
          height: 300,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle at 50% 50%,
            rgba(100, 150, 255, ${isMoving ? 0.15 : 0.08}),
            rgba(150, 100, 255, ${isMoving ? 0.08 : 0.04}),
            transparent 70%
          )`,
          filter: "blur(30px)",
        }}
        animate={{
          scale: isMoving ? 1.2 : 1,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)`,
        }}
      />

      {/* Noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// Cursor spotlight component - follows cursor with magnetic effect
export function CursorSpotlight() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
      animate={{
        opacity: isVisible ? 1 : 0,
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Inner glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 20,
          height: 20,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(255,255,255,0.8), transparent 70%)",
          filter: "blur(2px)",
        }}
      />
      {/* Outer ring */}
      <motion.div
        className="absolute rounded-full border border-white/20"
        style={{
          width: 40,
          height: 40,
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
}
