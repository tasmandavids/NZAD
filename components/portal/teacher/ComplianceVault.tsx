"use client";

import { useState, useTransition } from "react";
import type { InstructorDocument } from "@/app/portal/teacher/vault/page";
import { createDocument, updateDocument, deleteDocument } from "@/app/portal/teacher/vault/actions";

const DOC_TYPES: Record<string, string> = {
  certificate:           "Certificate",
  qualification:         "Qualification",
  insurance:             "Insurance",
  working_with_children: "Working With Children",
  first_aid:             "First Aid",
  other:                 "Other",
};

const EMPTY = {
  title: "", doc_type: "certificate" as string, issuer: "",
  issued_date: "", expiry_date: "", file_url: "", notes: "",
};

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  return diff;
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const days = daysUntil(date);
  if (days === null) return null;
  if (days < 0)  return <span className="text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-medium">Expired</span>;
  if (days <= 30) return <span className="text-xs bg-amber-100 text-amber-600 rounded-full px-2 py-0.5 font-medium">Expires in {days}d</span>;
  if (days <= 90) return <span className="text-xs bg-yellow-100 text-yellow-600 rounded-full px-2 py-0.5 font-medium">Expires in {days}d</span>;
  return <span className="text-xs bg-green-100 text-green-600 rounded-full px-2 py-0.5 font-medium">Valid</span>;
}

export function ComplianceVault({ documents: initial }: { documents: InstructorDocument[] }) {
  const [docs, setDocs] = useState(initial);
  const [slide, setSlide] = useState<"create" | InstructorDocument | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() { setForm(EMPTY); setError(null); setSlide("create"); }
  function openEdit(d: InstructorDocument) {
    setForm({ title: d.title, doc_type: d.docType, issuer: d.issuer ?? "", issued_date: d.issuedDate ?? "", expiry_date: d.expiryDate ?? "", file_url: d.fileUrl ?? "", notes: d.notes ?? "" });
    setError(null); setSlide(d);
  }

  function handleSave() {
    setError(null);
    const payload = { ...form, issuer: form.issuer || null, issued_date: form.issued_date || null, expiry_date: form.expiry_date || null, file_url: form.file_url || null, notes: form.notes || null } as Parameters<typeof createDocument>[0];
    startTransition(async () => {
      if (slide === "create") {
        const res = await createDocument(payload);
        if (res?.error) { setError(res.error); return; }
        location.reload();
      } else if (slide) {
        const res = await updateDocument(slide.id, payload);
        if (res?.error) { setError(res.error); return; }
        setDocs(prev => prev.map(d => d.id === slide.id ? { ...d, title: form.title, docType: form.doc_type, issuer: form.issuer || null, issuedDate: form.issued_date || null, expiryDate: form.expiry_date || null, fileUrl: form.file_url || null, notes: form.notes || null } : d));
        setSlide(null);
      }
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const res = await deleteDocument(deleteId);
      if (res?.error) { setError(res.error); return; }
      setDocs(prev => prev.filter(d => d.id !== deleteId));
      setDeleteId(null);
    });
  }

  const expiring = docs.filter(d => { const n = daysUntil(d.expiryDate); return n !== null && n <= 30; });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Compliance vault</h1>
          <p className="text-sm text-base-content/60 mt-0.5">Certificates, qualifications and insurance — visible to affiliated studios</p>
        </div>
        <button onClick={openCreate} className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">+ Add document</button>
      </div>

      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-700">Expiring soon</p>
          {expiring.map(d => (
            <p key={d.id} className="text-sm text-amber-600">{d.title} — expires {d.expiryDate}</p>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

      {docs.length === 0 ? (
        <div className="border-2 border-dashed border-base-300 rounded-xl p-12 text-center">
          <p className="text-base-content/50 text-sm">No documents yet. Add your first certificate or qualification.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(DOC_TYPES).map(([type, label]) => {
            const group = docs.filter(d => d.docType === type);
            if (group.length === 0) return null;
            return (
              <div key={type}>
                <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40 mb-2">{label}</p>
                <div className="space-y-2">
                  {group.map(d => (
                    <div key={d.id} className="bg-surface rounded-xl p-4 shadow-sm flex items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-base-content">{d.title}</p>
                          <ExpiryBadge date={d.expiryDate} />
                        </div>
                        {d.issuer && <p className="text-sm text-base-content/60">{d.issuer}</p>}
                        <p className="text-xs text-base-content/40">
                          {d.issuedDate && `Issued ${d.issuedDate}`}
                          {d.issuedDate && d.expiryDate && " · "}
                          {d.expiryDate && `Expires ${d.expiryDate}`}
                        </p>
                        {d.notes && <p className="text-xs text-base-content/50 mt-1">{d.notes}</p>}
                        {d.fileUrl && (
                          <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:underline">View document</a>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEdit(d)} className="text-xs text-brand hover:underline">Edit</button>
                        <button onClick={() => setDeleteId(d.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over */}
      {slide !== null && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSlide(null)} />
          <div className="w-full max-w-md bg-surface shadow-xl flex flex-col">
            <div className="p-5 border-b border-base-200 flex items-center justify-between">
              <h2 className="font-semibold text-base-content">{slide === "create" ? "Add document" : "Edit document"}</h2>
              <button onClick={() => setSlide(null)} className="text-base-content/40 hover:text-base-content text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Type</span>
                <select value={form.doc_type} onChange={e => setForm(f => ({ ...f, doc_type: e.target.value }))}
                  className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30">
                  {Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>

              {[
                { key: "title" as const, label: "Title *", type: "text", placeholder: "e.g. Royal Academy of Dance Grade 8" },
                { key: "issuer" as const, label: "Issuing body", type: "text", placeholder: "e.g. NZAMD" },
                { key: "issued_date" as const, label: "Issue date", type: "date", placeholder: "" },
                { key: "expiry_date" as const, label: "Expiry date", type: "date", placeholder: "" },
                { key: "file_url" as const, label: "Document URL", type: "url", placeholder: "https://…" },
              ].map(({ key, label, type, placeholder }) => (
                <label key={key} className="block space-y-1">
                  <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">{label}</span>
                  <input type={type} value={form[key]} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </label>
              ))}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Notes</span>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
              </label>
            </div>
            <div className="p-5 border-t border-base-200 flex gap-3">
              <button onClick={() => setSlide(null)} className="flex-1 border border-base-300 rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={pending || !form.title.trim()}
                className="flex-1 btn-brand rounded-lg py-2 text-sm font-medium disabled:opacity-50">
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
            <h3 className="font-semibold text-base-content">Delete document?</h3>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-base-300 rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={pending}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
