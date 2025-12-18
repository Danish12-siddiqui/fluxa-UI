"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { motion, useSpring, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { useBehaviorProfile, Personality } from "@/hooks/useBehaviorProfile";

interface CognitiveButtonProps {
  children: React.ReactNode;
  id: string;
  onClick?: () => void;
  className?: string;
}

// Personality-driven visual configurations - NOW WITH 3D
const personalityConfig: Record<Personality, {
  baseHue: number;
  glowColor: string;
  particleColor: string;
  liquidSpeed: number;
  depthIntensity: number;
  noiseScale: number;
}> = {
  calm: {
    baseHue: 220,
    glowColor: "rgba(100, 150, 255, 0.4)",
    particleColor: "#64B5F6",
    liquidSpeed: 0.3,
    depthIntensity: 0.5,
    noiseScale: 0.02,
  },
  assertive: {
    baseHue: 0,
    glowColor: "rgba(255, 255, 255, 0.3)",
    particleColor: "#FFFFFF",
    liquidSpeed: 0.8,
    depthIntensity: 0.8,
    noiseScale: 0.01,
  },
  inviting: {
    baseHue: 270,
    glowColor: "rgba(180, 100, 255, 0.5)",
    particleColor: "#B388FF",
    liquidSpeed: 0.5,
    depthIntensity: 0.6,
    noiseScale: 0.03,
  },
  curious: {
    baseHue: 180,
    glowColor: "rgba(0, 230, 230, 0.4)",
    particleColor: "#00E5FF",
    liquidSpeed: 0.6,
    depthIntensity: 0.7,
    noiseScale: 0.025,
  },
  hesitant: {
    baseHue: 35,
    glowColor: "rgba(255, 180, 50, 0.4)",
    particleColor: "#FFB74D",
    liquidSpeed: 0.2,
    depthIntensity: 0.4,
    noiseScale: 0.035,
  },
};

// Particle type for the internal particle system
interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export function CognitiveButton({ children, id, onClick, className = "" }: CognitiveButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { profile, handlers, metrics } = useBehaviorProfile(id);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [liquidOffset, setLiquidOffset] = useState(0);

  const config = personalityConfig[profile.personality];

  // 3D transform values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  const springConfig = { damping: 25, stiffness: 400 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  // Liquid animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLiquidOffset((prev) => (prev + config.liquidSpeed) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, [config.liquidSpeed]);

  // Particle system
  useEffect(() => {
    if (!isHovered) return;

    const spawnParticle = () => {
      const newParticle: Particle = {
        id: Date.now() + Math.random(),
        x: Math.random() * 100,
        y: 100 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3 - 1,
        life: 1,
        maxLife: 60 + Math.random() * 40,
        size: 2 + Math.random() * 4,
      };
      setParticles((prev) => [...prev.slice(-30), newParticle]);
    };

    const interval = setInterval(spawnParticle, 100);
    return () => clearInterval(interval);
  }, [isHovered]);

  // Update particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.05, // gravity
            life: p.life - 1 / p.maxLife,
          }))
          .filter((p) => p.life > 0)
      );
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Mouse tracking for 3D effect
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
      handlers.onMouseMove(e, rect);
    },
    [mouseX, mouseY, handlers]
  );

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    handlers.onHoverStart(e);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
    handlers.onHoverEnd();
  };

  const handleClick = () => {
    handlers.onClick();
    onClick?.();
    // Burst particles on click
    const burst = Array.from({ length: 15 }, (_, i) => ({
      id: Date.now() + i,
      x: 50,
      y: 50,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1,
      maxLife: 30,
      size: 3 + Math.random() * 5,
    }));
    setParticles((prev) => [...prev, ...burst]);
  };

  // Generate liquid blob path
  const liquidPath = useMemo(() => {
    const points = 8;
    const radius = 45;
    const variation = 5 + profile.engagement * 10;

    let path = "";
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const offset = Math.sin(angle * 3 + liquidOffset * 0.05) * variation;
      const r = radius + offset;
      const x = 50 + Math.cos(angle) * r;
      const y = 50 + Math.sin(angle) * r;
      path += i === 0 ? `M ${x} ${y}` : ` Q ${x + 5} ${y + 5} ${x} ${y}`;
    }
    return path + " Z";
  }, [liquidOffset, profile.engagement]);

  // Personality hint
  const personalityHint = useMemo(() => {
    switch (profile.personality) {
      case "calm": return "Ready when you are";
      case "assertive": return "Let's go";
      case "inviting": return "Come closer";
      case "curious": return "Discover";
      case "hesitant": return "Take your time";
      default: return "";
    }
  }, [profile.personality]);

  // Visual fingerprint
  const fingerprint = useMemo(() => {
    const seed = metrics.clickCount * 7 + metrics.hoverCount * 3;
    return {
      hueShift: (seed % 30) - 15,
      morphFactor: 0.8 + (seed % 20) / 100,
    };
  }, [metrics.clickCount, metrics.hoverCount]);

  return (
    <motion.button
      ref={buttonRef}
      className={`
        relative
        px-6 py-4 sm:px-12 sm:py-6
        bg-transparent
        border-0
        text-white font-medium
        cursor-pointer
        outline-none
        touch-manipulation
        ${className}
      `}
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      <motion.div
        className="relative"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Deep background layer - 3D depth */}
        <motion.div
          className="absolute inset-0 -z-30"
          style={{
            transform: `translateZ(-40px) scale(1.1)`,
            background: `radial-gradient(ellipse at 50% 50%,
              hsla(${config.baseHue + fingerprint.hueShift}, 70%, 15%, 0.8),
              hsla(${config.baseHue + fingerprint.hueShift}, 80%, 5%, 0.9)
            )`,
            borderRadius: "24px",
            filter: "blur(20px)",
          }}
          animate={{
            opacity: isHovered ? 0.8 : 0.4,
          }}
        />

        {/* Liquid morphing layer */}
        <motion.div
          className="absolute inset-0 -z-20 overflow-hidden"
          style={{
            transform: `translateZ(-20px)`,
            borderRadius: "20px",
          }}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`liquid-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={`hsla(${config.baseHue}, 80%, 60%, 0.6)`} />
                <stop offset="50%" stopColor={`hsla(${config.baseHue + 30}, 70%, 50%, 0.4)`} />
                <stop offset="100%" stopColor={`hsla(${config.baseHue + 60}, 80%, 40%, 0.6)`} />
              </linearGradient>
              <filter id={`glow-${id}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.path
              d={liquidPath}
              fill={`url(#liquid-grad-${id})`}
              filter={`url(#glow-${id})`}
              animate={{
                scale: isPressed ? 0.95 : 1,
              }}
              transition={{ duration: 0.2 }}
            />
          </svg>
        </motion.div>

        {/* Glass surface layer */}
        <motion.div
          className="absolute inset-0 -z-10"
          style={{
            transform: `translateZ(-5px)`,
            background: `linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.1) 0%,
              rgba(255, 255, 255, 0.05) 50%,
              rgba(255, 255, 255, 0) 100%
            )`,
            borderRadius: "16px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
          animate={{
            boxShadow: isHovered
              ? `0 0 60px ${config.glowColor}, inset 0 0 30px rgba(255,255,255,0.1)`
              : `0 0 20px ${config.glowColor}`,
          }}
        />

        {/* Particle layer */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ transform: "translateZ(5px)", borderRadius: "16px" }}
        >
          <AnimatePresence>
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: config.particleColor,
                  boxShadow: `0 0 ${particle.size * 2}px ${config.particleColor}`,
                }}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: particle.life, scale: particle.life }}
                exit={{ opacity: 0 }}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Holographic shine */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ transform: "translateZ(10px)", borderRadius: "16px" }}
        >
          <motion.div
            className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2"
            style={{
              background: `conic-gradient(
                from ${liquidOffset}deg at 50% 50%,
                transparent 0deg,
                rgba(255,255,255,0.1) 60deg,
                transparent 120deg,
                rgba(255,255,255,0.05) 180deg,
                transparent 240deg,
                rgba(255,255,255,0.1) 300deg,
                transparent 360deg
              )`,
            }}
            animate={{
              rotate: liquidOffset,
            }}
            transition={{ duration: 0, ease: "linear" }}
          />
        </motion.div>

        {/* Content */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-2"
          style={{
            transform: "translateZ(20px)",
            textShadow: `0 0 30px ${config.glowColor}, 0 2px 10px rgba(0,0,0,0.5)`,
          }}
        >
          <span className="text-base sm:text-lg font-semibold tracking-wide">{children}</span>

          {/* Personality indicator */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 10,
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: config.particleColor }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white/60">
              {personalityHint}
            </span>
          </motion.div>
        </motion.div>

        {/* Confidence bar - 3D floating */}
        <motion.div
          className="absolute -bottom-3 left-1/2 h-1 rounded-full overflow-hidden"
          style={{
            transform: "translateX(-50%) translateZ(25px)",
            width: "60%",
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${config.particleColor}, ${config.glowColor})`,
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${profile.confidence * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </motion.div>

        {/* Click shockwave */}
        <AnimatePresence>
          {isPressed && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: "translateZ(30px)",
                borderRadius: "16px",
                border: `2px solid ${config.particleColor}`,
              }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.button>
  );
}

// Enhanced Debug component
export function CognitiveButtonDebug({ id }: { id: string }) {
  const { profile, metrics, resetProfile } = useBehaviorProfile(id);

  return (
    <div className="p-4 bg-black/70 backdrop-blur-md rounded-xl text-xs text-white/70 font-mono space-y-3 border border-white/10">
      <div className="text-white/90 font-semibold mb-3 flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{
            backgroundColor:
              profile.personality === "calm" ? "#64B5F6" :
              profile.personality === "assertive" ? "#FFFFFF" :
              profile.personality === "inviting" ? "#B388FF" :
              profile.personality === "curious" ? "#00E5FF" : "#FFB74D",
          }}
        />
        {id}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>Personality</div>
        <div className="text-cyan-400 text-right">{profile.personality}</div>
        <div>Confidence</div>
        <div className="text-green-400 text-right">{(profile.confidence * 100).toFixed(0)}%</div>
        <div>Engagement</div>
        <div className="text-yellow-400 text-right">{(profile.engagement * 100).toFixed(0)}%</div>
        <div>Familiarity</div>
        <div className="text-purple-400 text-right">{(profile.familiarity * 100).toFixed(0)}%</div>
      </div>
      <div className="border-t border-white/10 pt-2 grid grid-cols-2 gap-1 text-white/50">
        <div>Hovers: {metrics.hoverCount}</div>
        <div>Clicks: {metrics.clickCount}</div>
        <div>Hesitations: {metrics.hoverWithoutClick}</div>
        <div>Direct: {metrics.directApproaches}</div>
      </div>
      <button
        onClick={resetProfile}
        className="w-full mt-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors text-[10px] uppercase tracking-wider"
      >
        Reset Profile
      </button>
    </div>
  );
}
