"use client";

export default function Landing() {
  return (
    <section
      className="relative h-dvh w-full overflow-hidden bg-[#0a0a0a] text-[#f5f2ec]"
      style={{ isolation: "isolate" }}
    >
      {/* Background video */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/Splash.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      />

      {/* Legibility gradient over the video */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/70" />

      {/* Frame hairlines — full perimeter */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[clamp(0.75rem,1.5vw,1.5rem)] border border-[color:var(--rule)]"
      />
      {/* Inner offset hairline rectangle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[clamp(1.25rem,2.5vw,2.5rem)] border border-[color:var(--rule)]/60"
      />

      {/* Corner tick marks */}
      <CornerTicks />

      {/* Top hairline marque */}
      <div className="absolute left-1/2 top-[clamp(2rem,5vw,3.25rem)] -translate-x-1/2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.5em] text-[#f5f2ec]/55">
        <span className="h-px w-10 bg-[color:var(--rule)]" />
        <span>C · O</span>
        <span className="h-px w-10 bg-[color:var(--rule)]" />
      </div>

      {/* Vertical center hairline (very subtle, optional cinematic line) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[clamp(4rem,8vw,6rem)] bottom-[clamp(4rem,8vw,6rem)] w-px bg-[color:var(--rule)]/30"
      />

      {/* Wordmark + contact */}
      <div className="absolute inset-0 flex h-full flex-col items-start justify-center px-[clamp(1.5rem,6vw,6rem)] text-left">
        <h1
          className="font-extrabold tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.4)] leading-[0.88]"
          style={{ fontSize: "clamp(2.75rem, 10.5vw, 10rem)" }}
        >
          Conrad
          <br />
          Oppermann<span className="opacity-75">.</span>
        </h1>

        <div className="mt-[clamp(1.5rem,3vw,2.5rem)] flex items-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-[0.32em] md:tracking-[0.4em]">
          <span className="h-px w-8 bg-[color:var(--rule)]" />
          <a
            href="https://mavericksocial.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 py-2 text-[#f5f2ec]/85 hover:text-[#f5f2ec] transition-colors"
          >
            <span>Contact</span>
            <svg
              className="h-3 w-3 transition-transform duration-500 ease-out group-hover:translate-x-1"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8h10" />
              <path d="M9 4 13 8 9 12" />
            </svg>
            <span
              aria-hidden
              className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[#f5f2ec]/70 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
            />
          </a>
        </div>
      </div>

      {/* Bottom centered tagline between arrows */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[clamp(2rem,5vw,3.25rem)] flex items-center justify-center gap-4 text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase text-[#f5f2ec]/65">
        <span aria-hidden>←</span>
        <span>Independent · MMXXVI</span>
        <span aria-hidden>→</span>
      </div>

      {/* Side wordmarks (vertical hairline labels) */}
      <div className="pointer-events-none absolute left-[clamp(1.5rem,3vw,2.75rem)] top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] font-bold tracking-[0.5em] uppercase text-[#f5f2ec]/40 whitespace-nowrap">
        Dublin
      </div>
      <div className="pointer-events-none absolute right-[clamp(1.5rem,3vw,2.75rem)] top-1/2 -translate-y-1/2 rotate-90 origin-center text-[10px] font-bold tracking-[0.5em] uppercase text-[#f5f2ec]/40 whitespace-nowrap">
        Worldwide
      </div>
    </section>
  );
}

function CornerTicks() {
  const corner = "absolute h-3 w-3";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-[clamp(0.75rem,1.5vw,1.5rem)]">
      {/* top-left */}
      <div className={`${corner} -top-px -left-px`}>
        <span className="absolute top-0 left-0 h-3 w-px bg-[#f5f2ec]/80" />
        <span className="absolute top-0 left-0 h-px w-3 bg-[#f5f2ec]/80" />
      </div>
      {/* top-right */}
      <div className={`${corner} -top-px -right-px`}>
        <span className="absolute top-0 right-0 h-3 w-px bg-[#f5f2ec]/80" />
        <span className="absolute top-0 right-0 h-px w-3 bg-[#f5f2ec]/80" />
      </div>
      {/* bottom-left */}
      <div className={`${corner} -bottom-px -left-px`}>
        <span className="absolute bottom-0 left-0 h-3 w-px bg-[#f5f2ec]/80" />
        <span className="absolute bottom-0 left-0 h-px w-3 bg-[#f5f2ec]/80" />
      </div>
      {/* bottom-right */}
      <div className={`${corner} -bottom-px -right-px`}>
        <span className="absolute bottom-0 right-0 h-3 w-px bg-[#f5f2ec]/80" />
        <span className="absolute bottom-0 right-0 h-px w-3 bg-[#f5f2ec]/80" />
      </div>
    </div>
  );
}
