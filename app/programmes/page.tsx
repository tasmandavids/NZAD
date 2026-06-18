// ============================================================================
//  /programmes — Dance programmes listing stub.
//  Will show the studio's class catalogue once the public class-browser
//  is built (RLS makes active classes readable by anyone).
// ============================================================================

import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";
import { PoweredByOlune } from "@/components/brand/PoweredByOlune";

export default async function ProgrammesPage() {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  return (
    <div className="grid min-h-screen place-items-center bg-base p-8 text-ink">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs uppercase tracking-widest text-muted">
          {studio?.name ?? "Olune"} · Programmes
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight">
          Our classes
        </h1>
        <p className="mt-3 text-sm text-muted leading-relaxed max-w-[38ch] mx-auto">
          Ballet · Contemporary · Jazz · Hip-Hop · Tap · Lyrical · Acro · Pointe.
          The full class catalogue is coming soon — in the meantime, book a free
          trial and we'll match you to the right class.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/enrol" className="btn-glow btn-glow--solid px-6 py-3 text-sm">
            Book a free trial →
          </a>
          <a href="/" className="btn-glow px-6 py-3 text-sm">
            Back to home
          </a>
        </div>
        <div className="mt-12 flex justify-center">
          <PoweredByOlune />
        </div>
      </div>
    </div>
  );
}
