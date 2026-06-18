"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/currency";
import type { SiteProduct } from "@/lib/site/queries";

export function ShopBlock({
  products,
  eyebrow,
  heading,
  subheading,
  showFilters,
  footnote,
}: {
  products: SiteProduct[];
  eyebrow: string;
  heading: string;
  subheading: string;
  showFilters: boolean;
  footnote: string;
}) {
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category || "General").filter(Boolean));
    return ["All", ...[...cats].sort()];
  }, [products]);

  const [filter, setFilter] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const shown =
    filter === "All"
      ? products
      : products.filter((p) => (p.category || "General") === filter);

  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);
  const cartTotal = cartItems.reduce((sum, [id, qty]) => {
    const p = products.find((x) => x.id === id);
    return sum + (p?.priceCents ?? 0) * qty;
  }, 0);

  function addToCart(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function checkout() {
    if (!cartItems.length) return;
    startTransition(async () => {
      setMsg(null);
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map(([productId, qty]) => ({ productId, qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Checkout failed. Sign in to purchase.");
        return;
      }
      if (data.clientSecret) {
        setMsg("Order created — complete payment in the member portal.");
      } else {
        setMsg("Order placed successfully!");
        setCart({});
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {eyebrow && (
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-brand-hot">
          {eyebrow}
        </p>
      )}
      <h2 className="text-center text-3xl font-bold text-ink sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
        {heading}
      </h2>
      {subheading && <p className="mt-2 text-center text-muted">{subheading}</p>}

      {showFilters && categories.length > 1 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                filter === cat ? "bg-ink text-base" : "border border-[--hair] text-muted hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.length === 0 ? (
          <p className="col-span-full text-center text-muted">No products available yet.</p>
        ) : (
          shown.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-[--hair] bg-surface p-5">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="mb-4 h-40 w-full rounded-lg object-cover" />
              )}
              <h3 className="font-semibold text-ink">{p.name}</h3>
              {p.description && <p className="mt-1 flex-1 text-sm text-muted">{p.description}</p>}
              <p className="mt-3 font-semibold text-brand">{formatMoney(p.priceCents)}</p>
              <button
                type="button"
                onClick={() => addToCart(p.id)}
                disabled={p.stockQty <= 0}
                className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {p.stockQty <= 0 ? "Out of stock" : "Add to cart"}
              </button>
            </div>
          ))
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="mt-8 rounded-2xl border border-[--hair] bg-base p-6">
          <h3 className="font-semibold text-ink">Cart ({cartItems.length} items)</h3>
          <p className="mt-1 text-lg font-bold text-brand">{formatMoney(cartTotal)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={checkout}
              disabled={pending}
              className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Processing…" : "Checkout"}
            </button>
            <Link href="/login" className="rounded-full border border-[--hair] px-6 py-2 text-sm text-ink">
              Sign in to purchase
            </Link>
          </div>
          {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
        </div>
      )}

      {footnote && <p className="mt-6 text-center text-xs text-muted">{footnote}</p>}
    </div>
  );
}
