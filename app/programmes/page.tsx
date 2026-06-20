// ============================================================================
//  /programmes — Dance programmes listing stub.
// ============================================================================

import { headers } from "next/headers";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n/server";
import { resolveStudio } from "@/lib/tenant";
import { PoweredByOlune } from "@/components/brand/PoweredByOlune";

export default async function ProgrammesPage() {
  const t = await getTranslations("programmes");
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);

  return (
    <div className="grid min-h-screen place-items-center bg-base p-8 text-ink">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs uppercase tracking-widest text-muted">
          {t("eyebrow", { studioName: studio?.name ?? "Olune" })}
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-muted leading-relaxed max-w-[38ch] mx-auto">
          {t("body")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/enrol" className="btn-glow btn-glow--solid px-6 py-3 text-sm">
            {t("bookTrial")}
          </Link>
          <Link href="/" className="btn-glow px-6 py-3 text-sm">
            {t("backHome")}
          </Link>
        </div>
        <div className="mt-12 flex justify-center">
          <PoweredByOlune />
        </div>
      </div>
    </div>
  );
}
