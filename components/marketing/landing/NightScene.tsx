// ============================================================================
//  components/marketing/landing/NightScene.tsx
//  Decorative night-sky card — twinkling stars + eclipse moon. Used by the
//  "human bit" section (hills) and the "about" section (orbiting rings).
//  Pure CSS animation, no JS timers, so it's cheap to render.
// ============================================================================

import { OluneLogo } from "@/components/brand/OluneLogo";

// Fixed pseudo-random-looking positions so server and client markup match.
const STARS = Array.from({ length: 22 }, (_, i) => ({
  top: `${(i * 37) % 100}%`,
  left: `${(i * 53) % 100}%`,
  size: 1.5 + (i % 3),
  delay: `${(i % 7) * 0.35}s`,
  duration: `${2.4 + (i % 5) * 0.5}s`,
}));

type NightSceneProps = {
  caption: React.ReactNode;
  variant?: "hills" | "orbit";
  className?: string;
};

export function NightScene({ caption, variant = "hills", className = "" }: NightSceneProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[radial-gradient(circle_at_50%_42%,#221a4e_0%,#16112e_62%,#120e26_100%)] shadow-[0_50px_100px_-50px_rgba(26,21,53,0.8)] ${className}`}
    >
      {STARS.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-full bg-white motion-safe:animate-[twinkle_var(--dur)_ease-in-out_var(--delay)_infinite]"
          style={
            {
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              "--dur": s.duration,
              "--delay": s.delay,
            } as React.CSSProperties
          }
        />
      ))}

      {variant === "orbit" ? (
        <>
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 motion-safe:animate-[spin_20s_linear_infinite]"
          />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[285px] w-[285px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 motion-safe:animate-[spin_34s_linear_infinite_reverse]"
          />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 motion-safe:animate-[spin_48s_linear_infinite]"
          />
        </>
      ) : (
        <>
          <span
            aria-hidden
            className="absolute -bottom-[26%] -left-[24%] h-[46%] w-[110%] rounded-full bg-[#131028]"
          />
          <span
            aria-hidden
            className="absolute -bottom-[30%] -right-[30%] h-[44%] w-[120%] rounded-full bg-[#0e0b20]"
          />
          <span
            aria-hidden
            className="absolute bottom-[17%] left-[38%] h-3 w-2 rounded-sm bg-[#ffd9a0] shadow-[0_0_16px_rgba(255,217,160,0.9)] motion-safe:animate-[twinkle_4s_ease-in-out_infinite]"
          />
        </>
      )}

      <div className="absolute left-1/2 top-[13%] -translate-x-1/2 motion-safe:animate-[bobY_8s_ease-in-out_infinite]">
        <OluneLogo variant="mark" theme="dark" size="xl" className="drop-shadow-[0_0_30px_rgba(139,124,240,0.55)]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0e0b20] to-transparent px-6 py-5 text-sm leading-snug text-white/70">
        {caption}
      </div>
    </div>
  );
}
