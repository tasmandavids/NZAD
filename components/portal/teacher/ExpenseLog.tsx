"use client";

import { useState, useTransition } from "react";
import type { Expense, StudioOption } from "@/app/portal/teacher/expenses/page";
import { createExpense, updateExpense, markExpenseReimbursed, deleteExpense } from "@/app/portal/teacher/expenses/actions";
import { formatMoney } from "@/lib/currency";

const CATEGORIES: Record<string, string> = {
  travel: "Travel", equipment: "Equipment", uniform: "Uniform",
  training: "Training", software: "Software", marketing: "Marketing",
  insurance: "Insurance", other: "Other",
};

const EMPTY = {
  description: "", category: "other" as string, amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  studio_id: "", receipt_url: "", reimbursable: false, reimbursed: false, notes: "",
};

export function ExpenseLog({ expenses: initial, studioOptions }: { expenses: Expense[]; studioOptions: StudioOption[] }) {
  const [expenses, setExpenses] = useState(initial);
  const [slide, setSlide] = useState<"create" | Expense | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [filterCat, setFilterCat] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = filterCat === "all" ? expenses : expenses.filter(e => e.category === filterCat);

  const totalCents = visible.reduce((s, e) => s + e.amountCents, 0);
  const pendingReimbursement = expenses.filter(e => e.reimbursable && !e.reimbursed).reduce((s, e) => s + e.amountCents, 0);

  function openCreate() { setForm(EMPTY); setError(null); setSlide("create"); }
  function openEdit(e: Expense) {
    setForm({ description: e.description, category: e.category, amount: (e.amountCents / 100).toFixed(2), expense_date: e.expenseDate, studio_id: e.studioId ?? "", receipt_url: e.receiptUrl ?? "", reimbursable: e.reimbursable, reimbursed: e.reimbursed, notes: e.notes ?? "" });
    setError(null); setSlide(e);
  }

  function buildPayload() {
    return {
      description: form.description,
      category: form.category as Parameters<typeof createExpense>[0]["category"],
      amount_cents: Math.round(parseFloat(form.amount || "0") * 100),
      expense_date: form.expense_date,
      studio_id: form.studio_id || null,
      receipt_url: form.receipt_url || null,
      reimbursable: form.reimbursable,
      reimbursed: form.reimbursed,
      notes: form.notes || null,
    };
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      if (slide === "create") {
        const res = await createExpense(buildPayload());
        if (res?.error) { setError(res.error); return; }
        location.reload();
      } else if (slide) {
        const res = await updateExpense(slide.id, buildPayload());
        if (res?.error) { setError(res.error); return; }
        const p = buildPayload();
        setExpenses(prev => prev.map(e => e.id === (slide as Expense).id ? { ...e, ...p, amountCents: p.amount_cents, expenseDate: p.expense_date, studioId: p.studio_id, receiptUrl: p.receipt_url } : e));
        setSlide(null);
      }
    });
  }

  function handleReimburse(id: string) {
    startTransition(async () => {
      const res = await markExpenseReimbursed(id);
      if (res?.error) { setError(res.error); return; }
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, reimbursed: true } : e));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (res?.error) { setError(res.error); return; }
      setExpenses(prev => prev.filter(e => e.id !== id));
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Expenses</h1>
          <p className="text-sm text-base-content/60 mt-0.5">Track business expenses and reimbursement claims</p>
        </div>
        <button onClick={openCreate} className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">+ Log expense</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl p-4 shadow-sm">
          <p className="text-xs text-base-content/50 uppercase tracking-wide">
            {filterCat === "all" ? "Total logged" : CATEGORIES[filterCat]}
          </p>
          <p className="text-2xl font-bold text-base-content mt-1">{formatMoney(totalCents)}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 shadow-sm">
          <p className="text-xs text-base-content/50 uppercase tracking-wide">Pending reimbursement</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{formatMoney(pendingReimbursement)}</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...Object.keys(CATEGORIES)].map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === c ? "bg-brand text-white" : "bg-base-200 text-base-content/70 hover:bg-base-300"}`}>
            {c === "all" ? "All" : CATEGORIES[c]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

      {visible.length === 0 ? (
        <div className="border-2 border-dashed border-base-300 rounded-xl p-12 text-center">
          <p className="text-sm text-base-content/40">No expenses here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(e => (
            <div key={e.id} className="bg-surface rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-base-200 text-base-content/60 rounded-full px-2 py-0.5">{CATEGORIES[e.category]}</span>
                  {e.reimbursable && !e.reimbursed && <span className="text-xs bg-amber-100 text-amber-600 rounded-full px-2 py-0.5">Awaiting reimbursement</span>}
                  {e.reimbursed && <span className="text-xs bg-green-100 text-green-600 rounded-full px-2 py-0.5">Reimbursed</span>}
                </div>
                <p className="font-semibold text-base-content">{e.description}</p>
                <p className="text-xs text-base-content/50">
                  {e.expenseDate}{e.studioName ? ` · ${e.studioName}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="font-semibold text-base-content">{formatMoney(e.amountCents)}</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => openEdit(e)} className="text-xs text-brand hover:underline">Edit</button>
                  {e.reimbursable && !e.reimbursed && (
                    <button onClick={() => handleReimburse(e.id)} disabled={pending} className="text-xs text-green-600 hover:underline">Mark reimbursed</button>
                  )}
                  <button onClick={() => handleDelete(e.id)} disabled={pending} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
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
              <h2 className="font-semibold text-base-content">{slide === "create" ? "Log expense" : "Edit expense"}</h2>
              <button onClick={() => setSlide(null)} className="text-base-content/40 hover:text-base-content text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Description *</span>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Category</span>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30">
                    {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Amount ($) *</span>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Date *</span>
                  <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                    className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30" />
                </label>
                {studioOptions.length > 0 && (
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Studio</span>
                    <select value={form.studio_id} onChange={e => setForm(f => ({ ...f, studio_id: e.target.value }))}
                      className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30">
                      <option value="">Personal</option>
                      {studioOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Receipt URL</span>
                <input type="url" value={form.receipt_url} placeholder="https://…" onChange={e => setForm(f => ({ ...f, receipt_url: e.target.value }))}
                  className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </label>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.reimbursable} onChange={e => setForm(f => ({ ...f, reimbursable: e.target.checked }))}
                    className="rounded border-base-300 text-brand focus:ring-brand/30" />
                  <span className="text-sm text-base-content">Reimbursable</span>
                </label>
                {form.reimbursable && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.reimbursed} onChange={e => setForm(f => ({ ...f, reimbursed: e.target.checked }))}
                      className="rounded border-base-300 text-brand focus:ring-brand/30" />
                    <span className="text-sm text-base-content">Reimbursed</span>
                  </label>
                )}
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-base-content/70 uppercase tracking-wide">Notes</span>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-base-300 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none" />
              </label>
            </div>
            <div className="p-5 border-t border-base-200 flex gap-3">
              <button onClick={() => setSlide(null)} className="flex-1 border border-base-300 rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={pending || !form.description.trim() || !form.amount || !form.expense_date}
                className="flex-1 btn-brand rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
