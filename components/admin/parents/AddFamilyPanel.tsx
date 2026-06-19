"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { addFamily } from "@/app/portal/admin/parents/actions";
import type { GuardianRelationship, StudentOption } from "@/lib/parents/types";
import { RELATIONSHIP_LABELS } from "@/lib/parents/types";

const RELATIONSHIPS: GuardianRelationship[] = ["mother", "father", "guardian", "other"];

type GuardianForm = {
  fullName: string;
  email: string;
  phone: string;
  relationship: GuardianRelationship;
};

const emptyGuardian = (): GuardianForm => ({
  fullName: "",
  email: "",
  phone: "",
  relationship: "guardian",
});

function GuardianFields({
  label,
  form,
  onChange,
}: {
  label: string;
  form: GuardianForm;
  onChange: (k: keyof GuardianForm, v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-[--hair] bg-base/50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <div>
        <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
          Full name *
        </label>
        <input
          value={form.fullName}
          onChange={(e) => onChange("fullName", e.target.value)}
          placeholder="e.g. Sarah Johnson"
          className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="sarah@example.com"
            className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
            Phone
          </label>
          <input
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+64 21 234 567"
            className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[--brand]"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider text-muted">
          Relationship
        </label>
        <select
          value={form.relationship}
          onChange={(e) => onChange("relationship", e.target.value)}
          className="w-full rounded-lg border border-[--hair] bg-base px-3 py-2 text-sm text-ink"
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {RELATIONSHIP_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function AddFamilyPanel({
  students,
  onClose,
}: {
  students: StudentOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [together, setTogether] = useState(false);
  const [primary, setPrimary] = useState<GuardianForm>({ ...emptyGuardian(), relationship: "mother" });
  const [coParent, setCoParent] = useState<GuardianForm>({ ...emptyGuardian(), relationship: "father" });
  const [primaryContact, setPrimaryContact] = useState<"primary" | "coParent">("primary");
  const [childIds, setChildIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggleChild = (id: string) => {
    setChildIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addFamily({
        primary,
        coParent: together ? coParent : undefined,
        primaryContactId: primaryContact,
        childIds,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      if (result.id) {
        router.push(`/portal/admin/parents/${result.id}`);
      } else {
        onClose();
      }
    });
  };

  const canSubmit = primary.fullName.trim() && (!together || coParent.fullName.trim());

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[--hair] bg-surface shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
          <h2 className="font-black text-ink">Add family</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={together}
              onChange={(e) => setTogether(e.target.checked)}
            />
            Parents together (add a co-parent)
          </label>

          <GuardianFields
            label={together ? "Guardian 1" : "Primary contact"}
            form={primary}
            onChange={(k, v) => setPrimary((f) => ({ ...f, [k]: v }))}
          />

          {together && (
            <>
              <GuardianFields
                label="Guardian 2"
                form={coParent}
                onChange={(k, v) => setCoParent((f) => ({ ...f, [k]: v }))}
              />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Primary contact for billing
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="primaryContact"
                    checked={primaryContact === "primary"}
                    onChange={() => setPrimaryContact("primary")}
                  />
                  {primary.fullName || "Guardian 1"}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="primaryContact"
                    checked={primaryContact === "coParent"}
                    onChange={() => setPrimaryContact("coParent")}
                  />
                  {coParent.fullName || "Guardian 2"}
                </label>
              </div>
            </>
          )}

          {students.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Link children (optional)
              </p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[--hair] p-2">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-base"
                  >
                    <input
                      type="checkbox"
                      checked={childIds.includes(s.id)}
                      onChange={() => toggleChild(s.id)}
                    />
                    {s.name ?? "Student"}
                  </label>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted">
            Parents can sign in with their email once you send them an invite or magic link from
            Supabase Auth.
          </p>

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t border-[--hair] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[--hair] py-2.5 text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !canSubmit}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {pending ? "Adding…" : "Add family"}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
