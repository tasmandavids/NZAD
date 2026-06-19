/** Shared SVG defs for all Olune moon marks — one copy avoids duplicate ids and useId hydration drift. */
export const OLUNE_MOON_GRAD_ID = "olune-moon-grad";
export const OLUNE_MOON_GLOW_ID = "olune-moon-glow";
export const OLUNE_MOON_CLIP_ID = "olune-moon-clip";

export function OluneMoonDefs() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      focusable="false"
    >
      <defs>
        <linearGradient id={OLUNE_MOON_GRAD_ID} x1="0.28" y1="0.05" x2="0.72" y2="1">
          <stop offset="0" stopColor="#DCD9FA" />
          <stop offset="0.5" stopColor="#A6A2E8" />
          <stop offset="1" stopColor="#7A75D6" />
        </linearGradient>
        <radialGradient id={OLUNE_MOON_GLOW_ID} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7B77D6" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#7B77D6" stopOpacity="0.1" />
          <stop offset="1" stopColor="#7B77D6" stopOpacity="0" />
        </radialGradient>
        <clipPath id={OLUNE_MOON_CLIP_ID}>
          <circle cx="50" cy="50" r="33" />
        </clipPath>
      </defs>
    </svg>
  );
}
