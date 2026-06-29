"use client";

import { useState, useTransition } from "react";
import type { PrivateClient } from "@/app/portal/teacher/clients/page";
import {
  createPrivateClient,
  updatePrivateClient,
  deletePrivateClient,
} from "@/app/portal/teacher/clients/actions";

const EMPTY = { full_name: "", email: "", phone: "", notes: "" };

export function PrivateClientsManager({ clients: initial }: { clients: PrivateClient[] }) {
  const [clients, setClients] = useState(initial);
  const [slide, setSlide] = useState<"create" | PrivateClient | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setForm(EMPTY);
    setError(null);
    setSlide("create");
  }

  function openEdit(c: PrivateClient) {
    setForm({ full_name: c.fullName, email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "" });
    setError(null);
    setSlide(c);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      if (slide === "create") {
        const res = await createPrivateClient(form);
        if (res?.error) { setError(res.error); return; }
        location.reload();
      } else if (slide) {
        const res = await updatePrivateClient(slide.id, form);
        if (res?.error) { setError(res.error); return; }
        setClients((prev) =>
          prev.map((c) =>
            c.id === slide.id
              ? { ...c, fullName: form.full_name, email: form.email || null, phone: form.phone || null, notes: form.notes || null }
              : c
          )
        );
        setSlide(null);
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deletePrivateClient(deleteId);
      if (res?.error) { setError(res.error); return; }
      setClients((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Private Clients</h1>
          <p className="text-sm text-base-content/60 mt-0.5">1-on-1 clients outside studio bookings</p>
        </div>
        <button onClick={openCreate} className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">
          + Add client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="border-2 border-dashed border-base-300 rounded-xl p-12 text-center">
          <p className="text-base-content/50 text-sm">No private clients yet. Add your first one.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <div key={c.id} className="bg-surface rounded-xl p-4 flex justify-between items-start gap-3 shadow-sm">
              <div className="min-w-0">
                <p className="font-semibold text-base-content truncate">{c.fullName}</p>
                {c.email && <p className="text-sm text-base-content/60 truncate">{c.email}</p>}
                {c.phone && <p className="text-sm text-base-content/60">{c.phone}</p>}
                {c.notes && <p className="text-xs text-base-content/50 mt-1 line-clamp-2">{c.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(c)} className="text-xs text-brand hover:underline">Edit</button>
                <button onClick={() => setDeleteId(c.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over */}
      {slide !== null && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSlide(null)} />
          <div className="w-full max-w-md bg-surface shadow-xl flex flex-col">
            <div className="p-5 border-b border-base-200 flex items-center justify-between">
              <h2 className="font-semibold text-base-content">
                {slide === "create" ? "New private client" : "Edit client"}
              </h2>
              <button onClick={() => setSlide(null)} className="text-base-content/40 hover:text-base-content text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}
              {(["full_name", "email", "phone"] as const).map((field) => (
                <label key={field} className="block space-y-1">
                  <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">
                    {field === "full_name" ? "Name *" : field === "email" ? "Email" : "Phone"}
                  </span>
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
              ))}
              <label className="block space-y-1">
                <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Notes</span>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                />
              </label>
            </div>
            <div className="p-5 border-t border-base-200 flex gap-3">
              <button onClick={() => setSlide(null)} className="flex-1 border border-base-300 rounded-lg py-2 text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={pending || !form.full_name.trim()}
                className="flex-1 btn-brand rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-base-content">Delete client?</h3>
            <p className="text-sm text-base-content/60">This will also delete any invoices linked to this client.</p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-base-300 rounded-lg py-2 text-sm">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={pending}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
