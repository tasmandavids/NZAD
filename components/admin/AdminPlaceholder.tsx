"use client";

import { motion } from "framer-motion";

export function AdminPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl p-6"
    >
      <div className="rounded-2xl border border-[--hair] bg-surface px-8 py-14 text-center">
        <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-widest text-muted">
          Coming soon
        </p>
        <h1 className="mb-3 text-2xl font-black text-ink">{title}</h1>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </motion.div>
  );
}
