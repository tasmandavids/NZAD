import type { PageBackground } from "@/lib/site/background";
import { backgroundShellStyle } from "@/lib/site/background";

export function BackgroundShell({
  background,
  className = "",
}: {
  background: PageBackground;
  className?: string;
}) {
  const showVideo = background.kind === "video" && background.videoUrl;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
      style={{ zIndex: 0 }}
    >
      {showVideo ? (
        <>
          <video
            src={background.videoUrl}
            autoPlay={background.videoAutoplay ?? false}
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: (background.opacity ?? 100) / 100 }}
          />
          <div className="absolute inset-0 bg-base/20" />
        </>
      ) : (
        <div className="absolute inset-0" style={backgroundShellStyle(background)} />
      )}
    </div>
  );
}
