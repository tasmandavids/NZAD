// ============================================================================
//  components/builder/controls.tsx — small reusable inspector inputs.
// ============================================================================

"use client";

import type { ReactNode } from "react";

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="border-b border-neutral-100 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{title}</span>
        {right}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 focus:border-violet-400 focus:outline-none";

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function NumberInput({
  value,
  onChange,
  placeholder = "auto",
}: {
  value: number | "" ;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      className={`${inputCls} max-w-[84px] tabular-nums`}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
    />
  );
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select className={`${inputCls} max-w-[120px]`} value={value ?? ""} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SegMode<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex rounded-md bg-neutral-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded px-1.5 py-1 text-[11px] ${value === o.value ? "bg-white shadow-sm text-neutral-900" : "text-neutral-500"}`}
          title={o.label}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isToken = value.startsWith("{");
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={isToken ? "#6B66C9" : value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded border border-neutral-200"
      />
      <input className={`${inputCls} max-w-[96px]`} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
