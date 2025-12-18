"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";
import { useInteractionMemory } from "@/hooks/useInteractionMemory";

interface MemoryCardProps {
  id: string;
  title: string;
  layers: {
    level: number;
    content: React.ReactNode;
  }[];
  className?: string;
}

// Glitch text component
function GlitchText({ children, intensity = 0.5 }: { children: string; intensity?: number }) {
  const [glitchState, setGlitchState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < intensity * 0.3) {
        setGlitchState(Math.random());
        setTimeout(() => setGlitchState(0), 50 + Math.random() * 100);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [intensity]);

  const glitchOffset = glitchState > 0 ? Math.random() * 4 - 2 : 0;

  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      {glitchState > 0 && (
        <>
          <span
            className="absolute inset-0 text-cyan-400 opacity-70"
            style={{ transform: `translateX(${glitchOffset}px)`, clipPath: "inset(10% 0 60% 0)" }}
          >
            {children}
          </span>
          <span
            className="absolute inset-0 text-red-400 opacity-70"
            style={{ transform: `translateX(${-glitchOffset}px)`, clipPath: "inset(50% 0 20% 0)" }}
          >
            {children}
          </span>
        </>
      )}
    </span>
  );
}

export function MemoryCard({ id, title, layers, className = "" }: MemoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { memory, currentMood, isReturningUser, handlers } = useInteractionMemory(id);
  const [isHovered, setIsHovered] = useState(false);
  const [scanlineOffset, setScanlineOffset] = useState(0);
  const [dataStreamLines, setDataStreamLines] = useState<string[]>([]);

  // 3D transform values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8]);

  const springConfig = { damping: 30, stiffness: 300 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  // Holographic color shift based on mouse position
  const holographicHue = useTransform(mouseX, [-0.5, 0.5], [200, 280]);

  // Scanline animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScanlineOffset((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Data stream effect - simulates "downloading" memories
  useEffect(() => {
    if (!isHovered || memory.recognitionLevel < 0.3) return;

    const generateLine = () => {
      const chars = "01アイウエオカキクケコサシスセソ█▓▒░";
      return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    };

    const interval = setInterval(() => {
      setDataStreamLines((prev) => [...prev.slice(-5), generateLine()]);
    }, 200);

    return () => clearInterval(interval);
  }, [isHovered, memory.recognitionLevel]);

  // Mouse tracking for 3D effect
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
      handlers.onMouseMove(x + 0.5, y + 0.5);
    },
    [mouseX, mouseY, handlers]
  );

  const handleMouseEnter = () => {
    setIsHovered(true);
    handlers.onEnter();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
    handlers.onLeave();
  };

  // Reveal speed based on user's preferred pace
  const revealDuration = useMemo(() => {
    switch (memory.preferredRevealSpeed) {
      case "slow": return 1.2;
      case "fast": return 0.4;
      default: return 0.7;
    }
  }, [memory.preferredRevealSpeed]);

  // Filter layers based on reveal progress
  const visibleLayers = useMemo(() => {
    return layers.filter((layer) => layer.level <= memory.revealProgress);
  }, [layers, memory.revealProgress]);

  // Recognition message
  const recognitionMessage = useMemo(() => {
    if (memory.visitCount === 0) return "NEW_CONNECTION";
    if (isReturningUser && memory.visitCount > 3) return "IDENTITY_VERIFIED";
    if (memory.recognitionLevel > 0.7) return "FULL_SYNC";
    if (memory.visitCount === 1) return "PARTIAL_MATCH";
    return "ANALYZING...";
  }, [memory.visitCount, memory.recognitionLevel, isReturningUser]);

  // Memory fragments - visual representation of past interactions
  const memoryFragments = useMemo(() => {
    return memory.layers.slice(-8).map((layer, i) => ({
      id: i,
      x: layer.focusPoints[0]?.x || Math.random(),
      y: layer.focusPoints[0]?.y || Math.random(),
      type: layer.interactionType,
      emotion: layer.emotionalSignature,
      age: i / 8,
    }));
  }, [memory.layers]);

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden cursor-default ${className}`}
      style={{
        perspective: "1200px",
        transformStyle: "preserve-3d",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="relative min-h-[300px] sm:min-h-[400px] rounded-xl sm:rounded-2xl"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Deep shadow layer */}
        <motion.div
          className="absolute inset-0 rounded-2xl -z-20"
          style={{
            transform: "translateZ(-60px) scale(1.05)",
            background: `radial-gradient(ellipse at 50% 50%,
              rgba(99, 102, 241, 0.3),
              rgba(0, 0, 0, 0.8)
            )`,
            filter: "blur(30px)",
          }}
          animate={{
            opacity: isHovered ? 0.8 : 0.4,
          }}
        />

        {/* Holographic base layer */}
        <motion.div
          className="absolute inset-0 rounded-2xl -z-10"
          style={{
            transform: "translateZ(-30px)",
            background: `linear-gradient(
              135deg,
              hsla(${memory.recognitionLevel * 60 + 220}, 70%, 10%, 0.95),
              hsla(${memory.recognitionLevel * 60 + 250}, 60%, 5%, 0.98)
            )`,
          }}
        />

        {/* Main card surface */}
        <motion.div
          className="relative h-full p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border"
          style={{
            background: `linear-gradient(
              170deg,
              rgba(15, 15, 35, 0.95) 0%,
              rgba(10, 10, 25, 0.98) 100%
            )`,
            borderColor: `hsla(${memory.recognitionLevel * 60 + 240}, 70%, 50%, ${0.2 + memory.recognitionLevel * 0.3})`,
            boxShadow: `
              0 0 ${60 * memory.recognitionLevel}px hsla(${memory.recognitionLevel * 60 + 240}, 70%, 50%, 0.2),
              inset 0 0 60px rgba(99, 102, 241, ${memory.recognitionLevel * 0.1}),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
          }}
        >
          {/* Scanlines overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-2xl overflow-hidden"
            style={{
              background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 255, 255, 0.5) 2px,
                rgba(255, 255, 255, 0.5) 4px
              )`,
              transform: `translateY(${scanlineOffset}%)`,
            }}
          />

          {/* Holographic rainbow sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
            style={{ transform: "translateZ(5px)" }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(
                  ${(scanlineOffset * 3.6)}deg,
                  transparent 0%,
                  rgba(255, 0, 128, 0.03) 25%,
                  rgba(0, 255, 255, 0.03) 50%,
                  rgba(255, 255, 0, 0.03) 75%,
                  transparent 100%
                )`,
              }}
              animate={{
                opacity: isHovered ? 1 : 0.3,
              }}
            />
          </motion.div>

          {/* Data stream background - hidden on mobile */}
          <AnimatePresence>
            {isHovered && memory.recognitionLevel > 0.3 && (
              <motion.div
                className="hidden sm:block absolute right-4 top-20 bottom-4 w-32 overflow-hidden pointer-events-none font-mono text-[8px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                exit={{ opacity: 0 }}
                style={{ transform: "translateZ(2px)" }}
              >
                {dataStreamLines.map((line, i) => (
                  <motion.div
                    key={i}
                    className="text-cyan-400 whitespace-nowrap"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ fontFamily: "monospace" }}
                  >
                    {line}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Memory fragments - floating particles representing past interactions */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {memoryFragments.map((fragment) => (
              <motion.div
                key={fragment.id}
                className="absolute"
                style={{
                  left: `${fragment.x * 100}%`,
                  top: `${fragment.y * 100}%`,
                  transform: `translateZ(${10 + fragment.age * 20}px)`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: isHovered ? 0.6 * fragment.age : 0.2 * fragment.age,
                  scale: 1,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      fragment.emotion === "curious" ? "#00E5FF" :
                      fragment.emotion === "thorough" ? "#B388FF" :
                      fragment.emotion === "impatient" ? "#FF5252" : "#FFB74D",
                    boxShadow: `0 0 10px currentColor`,
                  }}
                />
                {/* Connection lines between fragments */}
                {fragment.id > 0 && (
                  <svg
                    className="absolute top-1/2 left-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ opacity: 0.1 }}
                  >
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`${50 + (Math.random() - 0.5) * 100}%`}
                      y2={`${50 + (Math.random() - 0.5) * 100}%`}
                      stroke="currentColor"
                      strokeWidth="0.5"
                    />
                  </svg>
                )}
              </motion.div>
            ))}
          </div>

          {/* Recognition status bar */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-6 sm:h-8 flex items-center justify-between px-2 sm:px-4 border-b border-white/5"
            style={{ transform: "translateZ(15px)" }}
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <motion.div
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                style={{
                  backgroundColor:
                    memory.recognitionLevel > 0.7 ? "#4ADE80" :
                    memory.recognitionLevel > 0.3 ? "#FBBF24" : "#6366F1",
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[7px] sm:text-[9px] font-mono text-white/40 tracking-wider">
                <GlitchText intensity={memory.recognitionLevel}>{recognitionMessage}</GlitchText>
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-[6px] sm:text-[8px] font-mono text-white/30">
              <span>MEM: {(memory.recognitionLevel * 100).toFixed(0)}%</span>
              <span className="hidden sm:inline">VIS: {memory.visitCount}</span>
            </div>
          </motion.div>

          {/* Progress bar - dimensional */}
          <motion.div
            className="absolute top-8 left-0 h-[1px] overflow-hidden"
            style={{
              transform: "translateZ(20px)",
              width: "100%",
            }}
          >
            <motion.div
              className="h-full"
              style={{
                background: `linear-gradient(90deg,
                  transparent,
                  rgba(99, 102, 241, 0.5),
                  rgba(168, 85, 247, 0.5),
                  transparent
                )`,
              }}
              initial={{ width: "0%" }}
              animate={{ width: `${memory.recognitionLevel * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </motion.div>

          {/* Title with glitch effect */}
          <motion.div
            className="mt-6 sm:mt-10 mb-4 sm:mb-6"
            style={{ transform: "translateZ(25px)" }}
          >
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
              <GlitchText intensity={isHovered ? 0.8 : 0.2}>{title}</GlitchText>
            </h3>
            <motion.div
              className="h-[2px] mt-2 rounded-full overflow-hidden"
              style={{ width: "60px" }}
            >
              <motion.div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(90deg, #6366F1, #A855F7, #6366F1)`,
                  backgroundSize: "200% 100%",
                }}
                animate={{
                  backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </motion.div>

          {/* Content layers with reveal animation */}
          <div className="space-y-4 relative" style={{ transform: "translateZ(30px)" }}>
            <AnimatePresence mode="popLayout">
              {visibleLayers.map((layer, index) => (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{
                    opacity: 0,
                    y: 30,
                    rotateX: -15,
                    filter: "blur(10px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    filter: "blur(0px)",
                  }}
                  exit={{
                    opacity: 0,
                    y: -20,
                    scale: 0.95,
                  }}
                  transition={{
                    duration: revealDuration,
                    delay: index * 0.15,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                >
                  {/* Layer glow */}
                  <motion.div
                    className="absolute -inset-2 rounded-lg opacity-0"
                    style={{
                      background: `radial-gradient(ellipse at center, rgba(99, 102, 241, 0.1), transparent)`,
                    }}
                    animate={{
                      opacity: isHovered ? 0.5 : 0,
                    }}
                  />
                  <div className="relative text-slate-300">{layer.content}</div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Hidden content hint */}
            {memory.revealProgress < 1 && visibleLayers.length < layers.length && (
              <motion.div
                className="flex items-center gap-2 text-xs font-mono mt-6"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 rounded-full bg-indigo-500"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
                <span className="text-white/30">
                  {Math.round((1 - memory.revealProgress) * 100)}% ENCRYPTED
                </span>
              </motion.div>
            )}
          </div>

          {/* Corner decorations */}
          <svg
            className="absolute top-1 left-1 sm:top-2 sm:left-2 w-4 h-4 sm:w-6 sm:h-6 text-white/10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            style={{ transform: "translateZ(35px)" }}
          >
            <path d="M2 8V2h6M2 16v6h6" strokeWidth="1" />
          </svg>
          <svg
            className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-4 h-4 sm:w-6 sm:h-6 text-white/10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            style={{ transform: "translateZ(35px)" }}
          >
            <path d="M22 8V2h-6M22 16v6h-6" strokeWidth="1" />
          </svg>

          {/* Mood indicator */}
          <motion.div
            className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex items-center gap-1 sm:gap-2"
            style={{ transform: "translateZ(40px)" }}
          >
            <div
              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
              style={{
                background:
                  currentMood === "curious" ? "linear-gradient(135deg, #00E5FF, #00B8D4)" :
                  currentMood === "thorough" ? "linear-gradient(135deg, #B388FF, #7C4DFF)" :
                  currentMood === "impatient" ? "linear-gradient(135deg, #FF5252, #FF1744)" :
                  "linear-gradient(135deg, #FFB74D, #FF9800)",
                boxShadow: `0 0 15px currentColor`,
              }}
            />
            <span className="text-[7px] sm:text-[9px] font-mono text-white/30 uppercase tracking-wider">
              {currentMood}
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Enhanced Debug component
export function MemoryCardDebug({ id }: { id: string }) {
  const { memory, currentMood, isReturningUser, resetMemory } = useInteractionMemory(id);

  return (
    <div className="p-4 bg-black/70 backdrop-blur-md rounded-xl text-xs text-white/70 font-mono space-y-3 border border-white/10">
      <div className="text-white/90 font-semibold mb-3 flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full bg-indigo-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        Memory: {id}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>Visits</div>
        <div className="text-cyan-400 text-right">{memory.visitCount}</div>
        <div>Recognition</div>
        <div className="text-green-400 text-right">{(memory.recognitionLevel * 100).toFixed(0)}%</div>
        <div>Reveal</div>
        <div className="text-yellow-400 text-right">{(memory.revealProgress * 100).toFixed(0)}%</div>
        <div>Mood</div>
        <div className="text-purple-400 text-right">{currentMood}</div>
        <div>Speed</div>
        <div className="text-orange-400 text-right">{memory.preferredRevealSpeed}</div>
        <div>Returning</div>
        <div className="text-pink-400 text-right">{isReturningUser ? "Yes" : "No"}</div>
      </div>
      <div className="border-t border-white/10 pt-2 text-white/50">
        Total Time: {(memory.totalTimeSpent / 1000).toFixed(1)}s
      </div>
      <button
        onClick={resetMemory}
        className="w-full mt-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors text-[10px] uppercase tracking-wider"
      >
        Reset Memory
      </button>
    </div>
  );
}
