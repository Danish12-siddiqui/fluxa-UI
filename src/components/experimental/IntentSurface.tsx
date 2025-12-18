"use client";

import React, { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useIntentDetection, Intent } from "@/hooks/useIntentDetection";

interface IntentSurfaceItem {
  id: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  detail?: React.ReactNode;
  highlight?: boolean;
}

interface IntentSurfaceProps {
  id: string;
  items: IntentSurfaceItem[];
  className?: string;
}

// Intent visual configurations - ENHANCED
const intentConfig: Record<Intent, {
  hue: number;
  saturation: number;
  particleSpeed: number;
  warpIntensity: number;
  gridDistortion: number;
  ambientPulse: number;
}> = {
  browsing: { hue: 220, saturation: 30, particleSpeed: 0.5, warpIntensity: 0.2, gridDistortion: 0, ambientPulse: 0.3 },
  searching: { hue: 190, saturation: 70, particleSpeed: 2, warpIntensity: 0.8, gridDistortion: 0.5, ambientPulse: 0.8 },
  reading: { hue: 40, saturation: 50, particleSpeed: 0.2, warpIntensity: 0.1, gridDistortion: 0, ambientPulse: 0.2 },
  comparing: { hue: 270, saturation: 60, particleSpeed: 1, warpIntensity: 0.5, gridDistortion: 0.3, ambientPulse: 0.6 },
  deciding: { hue: 150, saturation: 65, particleSpeed: 0.8, warpIntensity: 0.6, gridDistortion: 0.2, ambientPulse: 0.9 },
  leaving: { hue: 0, saturation: 10, particleSpeed: 0.1, warpIntensity: 0, gridDistortion: 0, ambientPulse: 0.1 },
};

// Dimensional grid background particle
interface GridParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

export function IntentSurface({ id, items, className = "" }: IntentSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { profile, handlers } = useIntentDetection(id);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [particles, setParticles] = useState<GridParticle[]>([]);
  const [warpOffset, setWarpOffset] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  const config = intentConfig[profile.currentIntent];

  // 3D mouse tracking
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { damping: 50, stiffness: 200 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Perspective transforms based on mouse
  const perspectiveX = useTransform(smoothMouseX, [0, 1], [-5, 5]);
  const perspectiveY = useTransform(smoothMouseY, [0, 1], [5, -5]);

  // Warp animation
  useEffect(() => {
    const interval = setInterval(() => {
      setWarpOffset((prev) => (prev + config.particleSpeed) % 1000);
    }, 16);
    return () => clearInterval(interval);
  }, [config.particleSpeed]);

  // Particle system for dimensional effect
  useEffect(() => {
    if (profile.currentIntent === "leaving") return;

    const spawnParticle = () => {
      const newParticle: GridParticle = {
        id: Date.now() + Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 100,
        vx: (Math.random() - 0.5) * config.particleSpeed,
        vy: (Math.random() - 0.5) * config.particleSpeed,
        size: 1 + Math.random() * 2,
        life: 1,
      };
      setParticles((prev) => [...prev.slice(-40), newParticle]);
    };

    const interval = setInterval(spawnParticle, 200 / config.particleSpeed);
    return () => clearInterval(interval);
  }, [config.particleSpeed, profile.currentIntent]);

  // Update particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx + (mousePos.x - 0.5) * 0.5,
            y: p.y + p.vy + (mousePos.y - 0.5) * 0.5,
            z: (p.z + 0.5) % 100,
            life: p.life - 0.01,
          }))
          .filter((p) => p.life > 0 && p.x > -10 && p.x < 110 && p.y > -10 && p.y < 110)
      );
    }, 16);
    return () => clearInterval(interval);
  }, [mousePos]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseX.set(x);
      mouseY.set(y);
      setMousePos({ x, y });
      handlers.onMouseMove(e.clientX - rect.left, e.clientY - rect.top, rect);
    },
    [mouseX, mouseY, handlers]
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      handlers.onScroll(target.scrollTop, target.scrollHeight);
    },
    [handlers]
  );

  const handleItemHover = useCallback(
    (itemId: string | null) => {
      setHoveredItem(itemId);
      handlers.onFocusChange(itemId);
    },
    [handlers]
  );

  // Layout based on intent - responsive columns
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const layoutStyle = useMemo(() => {
    // Mobile: always 1 column
    if (isMobile) {
      return { columns: 1, gap: 12, padding: 12 };
    }

    switch (profile.suggestedLayout) {
      case "compact":
        return { columns: 3, gap: 12, padding: 16 };
      case "focused":
        return { columns: 1, gap: 24, padding: 32 };
      case "minimal":
        return { columns: 4, gap: 8, padding: 12 };
      default:
        return { columns: 2, gap: 20, padding: 24 };
    }
  }, [profile.suggestedLayout, isMobile]);

  // Generate grid lines that warp based on intent
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
    const gridSize = 50;
    const distortion = config.gridDistortion;

    for (let i = 0; i <= 100; i += gridSize / 5) {
      const waveOffset = Math.sin((i + warpOffset) * 0.02) * distortion * 20;
      lines.push({
        x1: 0,
        y1: i + waveOffset,
        x2: 100,
        y2: i + Math.sin((i + warpOffset + 50) * 0.02) * distortion * 20,
        opacity: 0.05 + distortion * 0.1,
      });
      lines.push({
        x1: i + waveOffset,
        y1: 0,
        x2: i + Math.sin((i + warpOffset + 50) * 0.02) * distortion * 20,
        y2: 100,
        opacity: 0.05 + distortion * 0.1,
      });
    }
    return lines;
  }, [warpOffset, config.gridDistortion]);

  // Intent icon
  const IntentIcon = useMemo(() => {
    const icons: Record<Intent, React.ReactElement> = {
      browsing: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      searching: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      reading: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
      comparing: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      deciding: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      leaving: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
    };
    return icons[profile.currentIntent];
  }, [profile.currentIntent]);

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        perspective: "1500px",
        transformStyle: "preserve-3d",
      }}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="relative min-h-[400px] sm:min-h-[600px] max-h-[600px] sm:max-h-[800px] overflow-auto"
        style={{
          rotateX: perspectiveY,
          rotateY: perspectiveX,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Deep dimensional background */}
        <div
          className="absolute inset-0 -z-30"
          style={{
            background: `
              radial-gradient(ellipse at ${mousePos.x * 100}% ${mousePos.y * 100}%,
                hsla(${config.hue}, ${config.saturation}%, 15%, 1),
                hsla(${config.hue}, ${config.saturation - 10}%, 5%, 1)
              )
            `,
            transform: "translateZ(-100px) scale(1.2)",
          }}
        />

        {/* Animated grid overlay */}
        <svg
          className="absolute inset-0 w-full h-full -z-20 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ transform: "translateZ(-50px)" }}
        >
          {gridLines.map((line, i) => (
            <line
              key={i}
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke={`hsla(${config.hue}, ${config.saturation}%, 50%, ${line.opacity})`}
              strokeWidth="0.2"
            />
          ))}
        </svg>

        {/* Floating particles */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
          style={{ transform: "translateZ(-30px)" }}
        >
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size * (1 + particle.z / 100),
                height: particle.size * (1 + particle.z / 100),
                background: `hsla(${config.hue}, ${config.saturation}%, 60%, ${particle.life * 0.5})`,
                boxShadow: `0 0 ${particle.size * 4}px hsla(${config.hue}, ${config.saturation}%, 60%, ${particle.life * 0.3})`,
                transform: `translateZ(${particle.z}px)`,
              }}
            />
          ))}
        </div>

        {/* Ambient pulse overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none -z-5"
          style={{
            background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%,
              hsla(${config.hue}, ${config.saturation}%, 50%, ${config.ambientPulse * 0.1}),
              transparent 50%
            )`,
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Main content area */}
        <div className="relative z-10">
          {/* Header with intent status */}
          <motion.div
            className="sticky top-0 z-20 backdrop-blur-md border-b"
            style={{
              background: `linear-gradient(180deg,
                hsla(${config.hue}, ${config.saturation}%, 8%, 0.95),
                hsla(${config.hue}, ${config.saturation}%, 5%, 0.9)
              )`,
              borderColor: `hsla(${config.hue}, ${config.saturation}%, 30%, 0.3)`,
              transform: "translateZ(50px)",
            }}
          >
            <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Intent icon */}
                <motion.div
                  className="w-6 h-6 sm:w-8 sm:h-8"
                  style={{ color: `hsla(${config.hue}, ${config.saturation}%, 60%, 0.8)` }}
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: profile.currentIntent === "searching" ? [0, 10, -10, 0] : 0,
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {IntentIcon}
                </motion.div>

                <div>
                  <div className="text-xs sm:text-sm font-medium text-white/90 uppercase tracking-wider">
                    {profile.currentIntent}
                  </div>
                  <div className="text-[8px] sm:text-[10px] text-white/40 font-mono">
                    CONF: {(profile.confidence * 100).toFixed(0)}% | ATT: {(profile.attention * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Layout indicator */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex gap-1">
                  {["expanded", "compact", "focused", "minimal"].map((layout) => (
                    <motion.div
                      key={layout}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          profile.suggestedLayout === layout
                            ? `hsla(${config.hue}, ${config.saturation}%, 60%, 1)`
                            : "rgba(255,255,255,0.1)",
                      }}
                      animate={
                        profile.suggestedLayout === layout
                          ? { scale: [1, 1.3, 1] }
                          : {}
                      }
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-white/30 uppercase">
                  {profile.suggestedLayout}
                </span>
              </div>
            </div>

            {/* Urgency bar */}
            <div className="h-[2px] w-full overflow-hidden">
              <motion.div
                className="h-full"
                style={{
                  background: `linear-gradient(90deg,
                    transparent,
                    hsla(${config.hue}, ${config.saturation}%, 50%, 0.5),
                    hsla(${config.hue + 30}, ${config.saturation}%, 50%, 0.5),
                    transparent
                  )`,
                }}
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 3 - profile.urgency * 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>
          </motion.div>

          {/* Items grid */}
          <div
            className="p-3 sm:p-6"
            style={{ transform: "translateZ(30px)" }}
            onScroll={handleScroll}
          >
            <LayoutGroup>
              <motion.div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${layoutStyle.columns}, 1fr)`,
                  gap: layoutStyle.gap,
                }}
                layout
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => (
                    <IntentSurfaceCard
                      key={item.id}
                      item={item}
                      config={config}
                      layoutStyle={layoutStyle}
                      profile={profile}
                      isHovered={hoveredItem === item.id}
                      onHover={() => handleItemHover(item.id)}
                      onLeave={() => handleItemHover(null)}
                      index={index}
                      mousePos={mousePos}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          </div>
        </div>

        {/* Edge glow based on intent */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            boxShadow: `
              inset 0 0 100px hsla(${config.hue}, ${config.saturation}%, 20%, 0.3),
              0 0 80px hsla(${config.hue}, ${config.saturation}%, 40%, 0.15)
            `,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// Enhanced card component with gravitational effects
function IntentSurfaceCard({
  item,
  config,
  layoutStyle,
  profile,
  isHovered,
  onHover,
  onLeave,
  index,
  mousePos,
}: {
  item: IntentSurfaceItem;
  config: typeof intentConfig[Intent];
  layoutStyle: { columns: number; gap: number; padding: number };
  profile: { suggestedLayout: string; currentIntent: Intent; attention: number; urgency: number };
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  index: number;
  mousePos: { x: number; y: number };
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [localMouse, setLocalMouse] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setLocalMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  const isHighlighted = item.highlight && profile.currentIntent === "deciding";
  const showSecondary = profile.suggestedLayout !== "compact" && profile.suggestedLayout !== "minimal";
  const showDetail = profile.suggestedLayout === "focused";

  return (
    <motion.div
      ref={cardRef}
      layout
      layoutId={item.id}
      className="relative group cursor-default"
      style={{
        transformStyle: "preserve-3d",
        perspective: "800px",
      }}
      initial={{ opacity: 0, y: 30, rotateX: -10 }}
      animate={{
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: isHovered ? 1.02 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
        layout: { duration: 0.5 },
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="relative rounded-xl overflow-hidden"
        style={{
          padding: layoutStyle.padding,
          background: `linear-gradient(
            ${135 + (localMouse.x - 0.5) * 30}deg,
            hsla(${config.hue}, ${config.saturation - 10}%, 12%, 0.9),
            hsla(${config.hue}, ${config.saturation - 20}%, 8%, 0.95)
          )`,
          border: `1px solid hsla(${config.hue}, ${config.saturation}%, ${isHighlighted ? 50 : 30}%, ${isHovered ? 0.5 : 0.2})`,
          boxShadow: isHovered
            ? `0 0 40px hsla(${config.hue}, ${config.saturation}%, 50%, 0.2),
               inset 0 0 30px hsla(${config.hue}, ${config.saturation}%, 50%, 0.05)`
            : "none",
          transform: isHovered
            ? `rotateX(${(localMouse.y - 0.5) * -5}deg) rotateY(${(localMouse.x - 0.5) * 5}deg) translateZ(10px)`
            : "translateZ(0)",
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Highlight glow for decision items */}
        {isHighlighted && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${localMouse.x * 100}% ${localMouse.y * 100}%,
                hsla(${config.hue}, ${config.saturation}%, 50%, 0.15),
                transparent 50%
              )`,
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(
              ${90 + (localMouse.x - 0.5) * 180}deg,
              transparent 0%,
              rgba(255, 255, 255, ${isHovered ? 0.05 : 0}) 50%,
              transparent 100%
            )`,
          }}
        />

        {/* Primary content */}
        <motion.div
          className="text-white font-medium text-sm sm:text-base"
          layout
          style={{
            textShadow: isHovered
              ? `0 0 20px hsla(${config.hue}, ${config.saturation}%, 60%, 0.5)`
              : "none",
          }}
        >
          {item.primary}
        </motion.div>

        {/* Secondary content */}
        <AnimatePresence>
          {showSecondary && item.secondary && (
            <motion.div
              className="text-white/60 text-xs sm:text-sm mt-2 sm:mt-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {item.secondary}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detail content */}
        <AnimatePresence>
          {showDetail && item.detail && (
            <motion.div
              className="text-white/40 text-[10px] sm:text-xs mt-3 sm:mt-4 pt-3 sm:pt-4 border-t"
              style={{ borderColor: `hsla(${config.hue}, ${config.saturation}%, 30%, 0.3)` }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {item.detail}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom accent line */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg,
              transparent,
              hsla(${config.hue}, ${config.saturation}%, 50%, 0.5),
              transparent
            )`,
          }}
          initial={{ width: 0 }}
          animate={{ width: isHovered ? "100%" : "0%" }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </motion.div>
  );
}

// Enhanced Debug component
export function IntentSurfaceDebug({ id }: { id: string }) {
  const { profile, signals, resetSignals } = useIntentDetection(id);
  const config = intentConfig[profile.currentIntent];

  return (
    <div className="p-4 bg-black/70 backdrop-blur-md rounded-xl text-xs text-white/70 font-mono space-y-3 border border-white/10">
      <div className="text-white/90 font-semibold mb-3 flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: `hsla(${config.hue}, ${config.saturation}%, 50%, 1)` }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        Intent: {id}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>Intent</div>
        <div className="text-cyan-400 text-right">{profile.currentIntent}</div>
        <div>Confidence</div>
        <div className="text-green-400 text-right">{(profile.confidence * 100).toFixed(0)}%</div>
        <div>Attention</div>
        <div className="text-yellow-400 text-right">{(profile.attention * 100).toFixed(0)}%</div>
        <div>Urgency</div>
        <div className="text-red-400 text-right">{(profile.urgency * 100).toFixed(0)}%</div>
        <div>Layout</div>
        <div className="text-purple-400 text-right">{profile.suggestedLayout}</div>
      </div>
      <div className="border-t border-white/10 pt-2 grid grid-cols-2 gap-1 text-white/50">
        <div>Scroll: {signals.scrollPatterns.length}</div>
        <div>Velocity: {signals.averageVelocity.toFixed(0)}</div>
        <div>Pauses: {signals.pauseCount}</div>
        <div>Dir Changes: {signals.directionChanges}</div>
      </div>
      <button
        onClick={resetSignals}
        className="w-full mt-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors text-[10px] uppercase tracking-wider"
      >
        Reset Signals
      </button>
    </div>
  );
}
