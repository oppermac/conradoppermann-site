"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

export default function Landing() {
  const buttonRef = useRef<HTMLAnchorElement>(null);

  // Cursor position over the contact pill, normalized to -0.5..0.5
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const smx = useSpring(mx, { stiffness: 200, damping: 25, mass: 0.4 });
  const smy = useSpring(my, { stiffness: 200, damping: 25, mass: 0.4 });

  const tiltX = useTransform(smy, [-0.5, 0.5], [6, -6]);
  const tiltY = useTransform(smx, [-0.5, 0.5], [-8, 8]);

  const highlightX = useTransform(smx, [-0.5, 0.5], [20, 80]);
  const highlightY = useTransform(smy, [-0.5, 0.5], [20, 80]);
  const highlightBg = useMotionTemplate`radial-gradient(140px circle at ${highlightX}% ${highlightY}%, rgba(255,255,255,0.22), transparent 60%)`;

  const handleMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const node = buttonRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(nx);
    my.set(ny);
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#070710] text-white">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          aria-hidden
          className="absolute top-[5%] left-[5%] h-[55vmax] w-[55vmax] rounded-full opacity-95 blur-[80px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(140,100,255,1), rgba(70,40,200,0) 65%)",
          }}
          animate={{ x: [0, 60, -40, 0], y: [0, 40, -30, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-[10%] -right-[5%] h-[60vmax] w-[60vmax] rounded-full opacity-90 blur-[90px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,110,180,0.95), rgba(255,60,120,0) 65%)",
          }}
          animate={{ x: [0, -50, 30, 0], y: [0, -40, 50, 0] }}
          transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute top-[40%] left-[55%] h-[45vmax] w-[45vmax] -translate-x-1/2 rounded-full opacity-80 blur-[80px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(60,180,255,0.85), rgba(40,120,200,0) 70%)",
          }}
          animate={{ x: [-40, 40, -20, -40], y: [20, -30, 40, 20] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute top-[15%] right-[10%] h-[35vmax] w-[35vmax] rounded-full opacity-70 blur-[70px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255,180,90,0.7), rgba(220,120,40,0) 65%)",
          }}
          animate={{ x: [30, -30, 20, 30], y: [-20, 30, -10, -20] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Vignette to keep edges dark */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(7,7,16,0.6) 90%)",
          }}
        />
      </div>

      {/* Subtle film grain / noise (CSS only, via SVG inline) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-[clamp(2.5rem,8vw,7rem)] font-light leading-[0.95] tracking-[-0.04em] text-white"
          style={{ fontVariationSettings: "'wght' 300" }}
        >
          Conrad Oppermann
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10"
          style={{ perspective: 800 }}
        >
          <motion.a
            ref={buttonRef}
            href="https://mavericksocial.com"
            target="_blank"
            rel="noopener noreferrer"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{
              rotateX: tiltX,
              rotateY: tiltY,
              transformStyle: "preserve-3d",
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/25 bg-white/[0.08] px-8 py-3.5 text-sm tracking-wide text-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl backdrop-saturate-200 transition-colors"
          >
            {/* Specular highlight that follows cursor */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: highlightBg }}
            />
            {/* Top edge sheen */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
            <span className="relative">Contact</span>
            <svg
              className="relative h-3.5 w-3.5 -mr-0.5 transition-transform duration-300 group-hover:translate-x-0.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3.5 8h9" />
              <path d="M9 4.5 12.5 8 9 11.5" />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </main>
  );
}
