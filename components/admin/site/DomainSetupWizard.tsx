"use client";

// ============================================================================
//  DomainSetupWizard — plain-language guide to connect a custom domain.
//  Separate from the website content setup wizard.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  checkDomainDns,
  removeCustomDomain,
  saveCustomDomain,
} from "@/app/portal/admin/site/domain/actions";
import {
  DOMAIN_KIND_OPTIONS,
  DOMAIN_WIZARD_STEPS,
  buildDnsRecords,
  domainTargets,
  normalizeDomainInput,
  publicCustomDomainUrl,
  publicSubdomainUrl,
  validateCustomDomain,
  type DomainKind,
  type DomainWizardStep,
} from "@/lib/site/domain-setup";

type Props = {
  studioName: string;
  slug: string;
  customDomain: string | null;
  rootDomain: string;
};

export function DomainSetupWizard({ studioName, slug, customDomain, rootDomain }: Props) {
  const [step, setStep] = useState<DomainWizardStep>(customDomain ? "done" : "intro");
  const [wantsCustom, setWantsCustom] = useState<boolean | null>(customDomain ? true : null);
  const [kind, setKind] = useState<DomainKind>("www");
  const [domainInput, setDomainInput] = useState(customDomain ?? "");
  const [savedDomain, setSavedDomain] = useState<string | null>(customDomain);
  const [dnsMessage, setDnsMessage] = useState<string | null>(null);
  const [dnsOk, setDnsOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subdomainUrl = publicSubdomainUrl(slug, rootDomain);
  const targets = domainTargets();
  const normalizedDomain = normalizeDomainInput(domainInput);
  const domainError = domainInput.trim() ? validateCustomDomain(domainInput, rootDomain) : null;

  const dnsRecords = useMemo(() => {
    if (!normalizedDomain || domainError) return [];
    return buildDnsRecords(normalizedDomain, kind, targets);
  }, [normalizedDomain, kind, targets, domainError]);

  const stepIndex = DOMAIN_WIZARD_STEPS.indexOf(step);

  function go(next: DomainWizardStep) {
    setError(null);
    setStep(next);
  }

  function nextFromDecide(useCustom: boolean) {
    setWantsCustom(useCustom);
    go(useCustom ? "kind" : "done");
  }

  function saveAndConnect() {
    if (domainError) {
      setError(domainError);
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await saveCustomDomain({ domain: normalizedDomain, kind });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedDomain(res.data.domain);
      go("done");
    });
  }

  function runDnsCheck() {
    const d = savedDomain ?? normalizedDomain;
    if (!d) return;
    startTransition(async () => {
      setError(null);
      const res = await checkDomainDns({ domain: d, kind });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDnsOk(res.data.ok);
      setDnsMessage(res.data.message);
    });
  }

  function disconnect() {
    startTransition(async () => {
      setError(null);
      const res = await removeCustomDomain();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedDomain(null);
      setDomainInput("");
      setDnsOk(null);
      setDnsMessage(null);
      setWantsCustom(null);
      go("intro");
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Domain setup</p>
        <h1 className="text-2xl font-bold text-ink">Connect your website address</h1>
        <p className="text-sm text-muted">
          A simple step-by-step guide for {studioName}. No jargon — just copy, paste, and go live.
        </p>
      </header>

      <StepProgress current={step} />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {step === "intro" && (
        <StepCard
          title="Your site already has an address"
          subtitle="Every studio gets a free Olune address — it works right away."
        >
          <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Free address</p>
            <a
              href={subdomainUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-lg font-semibold text-brand underline"
            >
              {subdomainUrl.replace(/^https?:\/\//, "")}
            </a>
            <p className="mt-2 text-sm text-muted">
              Share this link today. Families can view your website and portal from this address.
            </p>
          </div>
          <p className="text-sm text-muted">
            Want your own domain instead — like{" "}
            <strong className="text-ink">www.{studioName.toLowerCase().replace(/\s+/g, "")}.co.nz</strong>?
            The next steps walk you through it.
          </p>
          <StepActions onNext={() => go("decide")} nextLabel="Continue" />
        </StepCard>
      )}

      {step === "decide" && (
        <StepCard
          title="Do you want your own domain?"
          subtitle="Optional — your free Olune address always works."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceButton
              selected={wantsCustom === true}
              title="Yes, use my domain"
              description="I'll connect www.mystudio.co.nz (or similar)"
              onClick={() => nextFromDecide(true)}
            />
            <ChoiceButton
              selected={wantsCustom === false}
              title="Not right now"
              description={`I'll keep using ${slug}.${rootDomain === "localhost" ? "localhost" : rootDomain}`}
              onClick={() => nextFromDecide(false)}
            />
          </div>
          <StepActions onBack={() => go("intro")} />
        </StepCard>
      )}

      {step === "kind" && (
        <StepCard
          title="Which address do you want?"
          subtitle="Pick the style that matches what you bought from your domain provider."
        >
          <div className="space-y-2">
            {DOMAIN_KIND_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setKind(opt.id);
                  if (!domainInput || domainInput === customDomain) {
                    const base = studioName.toLowerCase().replace(/[^a-z0-9]+/g, "");
                    if (opt.id === "www") setDomainInput(`www.${base}.co.nz`);
                    else if (opt.id === "apex") setDomainInput(`${base}.co.nz`);
                    else setDomainInput(`book.${base}.co.nz`);
                  }
                }}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  kind === opt.id ? "border-brand bg-brand/5" : "border-[--hair] hover:border-brand/50"
                }`}
              >
                <span className="font-semibold text-ink">{opt.label}</span>
                <p className="mt-0.5 font-mono text-sm text-brand">{opt.example}</p>
                <p className="mt-1 text-xs text-muted">{opt.hint}</p>
              </button>
            ))}
          </div>
          <StepActions onBack={() => go("decide")} onNext={() => go("domain")} nextLabel="Continue" />
        </StepCard>
      )}

      {step === "domain" && (
        <StepCard
          title="Enter your domain"
          subtitle="Type exactly what you want families to type in their browser."
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Your domain</span>
            <input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="www.mystudio.co.nz"
              className="field-premium font-mono"
              autoFocus
            />
            {domainError && <span className="mt-1 block text-xs text-red-500">{domainError}</span>}
            {!domainError && normalizedDomain && (
              <span className="mt-1 block text-xs text-muted">
                Families will visit{" "}
                <strong className="text-ink">{publicCustomDomainUrl(normalizedDomain)}</strong>
              </span>
            )}
          </label>
          <StepActions
            onBack={() => go("kind")}
            onNext={() => (domainError ? setError(domainError) : go("dns"))}
            nextLabel="Show DNS steps"
            nextDisabled={!domainInput.trim() || !!domainError}
          />
        </StepCard>
      )}

      {step === "dns" && (
        <StepCard
          title="Add one DNS record"
          subtitle="Log in where you bought your domain (GoDaddy, Cloudflare, Namecheap, etc.) and add this record."
        >
          <ol className="space-y-3 text-sm text-muted">
            <li>
              <strong className="text-ink">1.</strong> Open your domain provider&apos;s DNS settings.
            </li>
            <li>
              <strong className="text-ink">2.</strong> Add the record below (copy each value).
            </li>
            <li>
              <strong className="text-ink">3.</strong> Save — changes can take 15 minutes to 48 hours.
            </li>
          </ol>

          {dnsRecords.map((rec) => (
            <DnsRecordCard key={`${rec.type}-${rec.host}`} record={rec} />
          ))}

          <p className="rounded-lg bg-base px-3 py-2 text-xs text-muted">
            <strong className="text-ink">Tip:</strong> If your provider asks for a &quot;TTL&quot;, leave the default
            or choose 3600. The &quot;Host&quot; column might be labelled Name or Subdomain.
          </p>

          <StepActions
            onBack={() => go("domain")}
            onNext={() => go("connect")}
            nextLabel="I've added the record"
          />
        </StepCard>
      )}

      {step === "connect" && (
        <StepCard
          title="Connect to Olune"
          subtitle="Tell Olune your domain so we can show your website when someone visits it."
        >
          <div className="rounded-xl border border-[--hair] bg-base p-4 font-mono text-sm text-ink">
            {normalizedDomain}
          </div>
          <p className="text-sm text-muted">
            Click connect below. Then use &quot;Check DNS&quot; — if it&apos;s not ready yet, wait 30 minutes and try
            again.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveAndConnect}
              disabled={pending || !!domainError}
              className="btn-glow btn-glow--solid px-6 py-2.5 text-sm disabled:opacity-50"
            >
              {pending ? "Connecting…" : "Connect domain"}
            </button>
            <button
              type="button"
              onClick={runDnsCheck}
              disabled={pending}
              className="btn-glow px-6 py-2.5 text-sm disabled:opacity-50"
            >
              Check DNS
            </button>
          </div>
          {dnsMessage && (
            <p
              className={`text-sm ${dnsOk ? "text-green-600" : "text-muted"}`}
              role="status"
            >
              {dnsMessage}
            </p>
          )}
          <StepActions onBack={() => go("dns")} />
        </StepCard>
      )}

      {step === "done" && (
        <StepCard
          title={savedDomain ? "You're connected!" : "You're all set"}
          subtitle={
            savedDomain
              ? "Your custom domain is linked to Olune."
              : "Your free Olune address is ready to share."
          }
        >
          {savedDomain ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Custom domain</p>
                <a
                  href={publicCustomDomainUrl(savedDomain)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-lg font-semibold text-brand underline"
                >
                  {savedDomain}
                </a>
              </div>
              <button
                type="button"
                onClick={runDnsCheck}
                disabled={pending}
                className="btn-glow px-5 py-2 text-sm disabled:opacity-50"
              >
                {pending ? "Checking…" : "Check DNS again"}
              </button>
              {dnsMessage && (
                <p className={`text-sm ${dnsOk ? "text-green-600" : "text-muted"}`}>{dnsMessage}</p>
              )}
              <button
                type="button"
                onClick={disconnect}
                disabled={pending}
                className="text-xs text-red-500 underline disabled:opacity-50"
              >
                Remove custom domain
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Your address</p>
              <a
                href={subdomainUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all font-semibold text-brand underline"
              >
                {subdomainUrl.replace(/^https?:\/\//, "")}
              </a>
              <p className="mt-2 text-sm text-muted">
                You can connect a custom domain any time from Website → Domain setup.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/portal/admin/site" className="btn-glow btn-glow--solid px-6 py-2.5 text-sm">
              Back to website
            </Link>
            {!savedDomain && (
              <button
                type="button"
                onClick={() => go("decide")}
                className="btn-glow px-6 py-2.5 text-sm"
              >
                Connect a domain
              </button>
            )}
          </div>
        </StepCard>
      )}

      {stepIndex > 0 && step !== "done" && (
        <p className="text-center text-xs text-muted">
          Step {stepIndex + 1} of {DOMAIN_WIZARD_STEPS.length}
        </p>
      )}
    </div>
  );
}

function StepProgress({ current }: { current: DomainWizardStep }) {
  const labels: Partial<Record<DomainWizardStep, string>> = {
    intro: "Start",
    decide: "Choose",
    kind: "Type",
    domain: "Domain",
    dns: "DNS",
    connect: "Connect",
    done: "Done",
  };
  const visible = DOMAIN_WIZARD_STEPS.filter((s) => s !== "done" || current === "done");
  const idx = visible.indexOf(current);

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {visible.map((s, i) => (
        <div
          key={s}
          className={`shrink-0 rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider ${
            i <= idx ? "bg-brand/15 text-brand" : "bg-base text-muted"
          }`}
        >
          {labels[s]}
        </div>
      ))}
    </div>
  );
}

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 rounded-2xl border border-[--hair] bg-surface p-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function StepActions({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {onBack && (
        <button type="button" onClick={onBack} className="btn-glow px-5 py-2 text-sm">
          Back
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="btn-glow btn-glow--solid px-6 py-2 text-sm disabled:opacity-50"
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}

function ChoiceButton({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        selected ? "border-brand bg-brand/5" : "border-[--hair] hover:border-brand/50"
      }`}
    >
      <span className="font-semibold text-ink">{title}</span>
      <p className="mt-1 text-xs text-muted">{description}</p>
    </button>
  );
}

function DnsRecordCard({ record }: { record: { type: string; host: string; value: string; note: string } }) {
  return (
    <div className="space-y-2 rounded-xl border border-[--hair] bg-base p-4">
      <p className="text-xs text-muted">{record.note}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <CopyField label="Type" value={record.type} />
        <CopyField label="Host / Name" value={record.host} />
        <CopyField label="Points to / Value" value={record.value} />
      </div>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-w-0">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 text-xs text-ink">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg border border-[--hair] px-2 py-1.5 text-[0.65rem] font-medium text-ink hover:bg-surface"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
