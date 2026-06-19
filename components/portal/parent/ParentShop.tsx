"use client";

// ============================================================================
//  ParentShop — browse and purchase merchandise from the parent portal.
//  Cart lives in React state. Checkout calls /api/shop/checkout → Stripe intent.
// ============================================================================

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CheckoutForm from "@/components/payments/CheckoutForm";
import { OptimizableImage } from "@/components/ui/OptimizableImage";

interface Product {
  id:          string;
  name:        string;
  description: string | null;
  price_cents: number;
  stock_qty:   number;
  category:    string | null;
  image_url:   string | null;
}

interface CartItem {
  product: Product;
  qty:     number;
}

interface Props {
  products: Product[];
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(cents / 100);
}

export function ParentShop({ products }: Props) {
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("all");
  const [checkingOut,  setCheckingOut]  = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  // Set when a paid order's PaymentIntent is created — drives the card form.
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter((c): c is string => c != null)))];
  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!q || p.name.toLowerCase().includes(q)) &&
      (catFilter === "all" || p.category === catFilter)
    );
  });

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.product.price_cents, 0);

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === p.id);
      if (existing) {
        const newQty = existing.qty + 1;
        if (newQty > p.stock_qty) return prev;
        return prev.map((i) => i.product.id === p.id ? { ...i, qty: newQty } : i);
      }
      if (p.stock_qty < 1) return prev;
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, qty } : i));
  }

  async function checkout() {
    if (!cart.length) return;
    setCheckingOut(true);
    setError(null);

    try {
      const res = await fetch("/api/shop/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items: cart.map((i) => ({ productId: i.product.id, qty: i.qty })),
        }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? "Checkout failed"); return; }

      if (data.free) {
        // Order confirmed without payment
        setCart([]);
        setCartOpen(false);
        setCheckoutDone(true);
      } else if (data.clientSecret) {
        // Paid order — reveal the Stripe card form (cart stays for context).
        setClientSecret(data.clientSecret);
      } else {
        setError("Could not start payment. Please try again.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  if (checkoutDone) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-semibold text-ink">Order confirmed!</p>
          <p className="text-sm text-muted mt-1">Your items have been reserved. The studio will confirm shortly.</p>
          <button
            onClick={() => setCheckoutDone(false)}
            className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-black text-ink">Studio Shop</h2>
        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          🛒 Cart
          {cartCount > 0 && (
            <span className="rounded-full bg-white/30 px-1.5 text-xs font-bold">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Search + filter */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-48 rounded-xl border border-[--hair] bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                catFilter === c ? "bg-brand text-white" : "border border-[--hair] text-muted hover:text-ink"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No products available.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const inCart   = cart.find((i) => i.product.id === p.id);
            const soldOut  = p.stock_qty === 0;

            return (
              <div key={p.id} className="rounded-2xl border border-[--hair] bg-surface p-4">
                <div className="relative mb-3 h-28 overflow-hidden rounded-xl bg-base">
                  {p.image_url ? (
                    <OptimizableImage
                      src={p.image_url}
                      alt={p.name}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-3xl">📦</span>
                  )}
                </div>
                <p className="font-semibold text-ink text-sm truncate">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">{p.description}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-black text-brand">{formatPrice(p.price_cents)}</span>
                  {soldOut ? (
                    <span className="text-xs text-muted">Out of stock</span>
                  ) : inCart ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(p.id, inCart.qty - 1)}
                        className="h-6 w-6 rounded-md border border-[--hair] text-xs text-muted hover:text-ink"
                      >−</button>
                      <span className="text-xs font-semibold text-ink">{inCart.qty}</span>
                      <button
                        onClick={() => addToCart(p)}
                        disabled={inCart.qty >= p.stock_qty}
                        className="h-6 w-6 rounded-md border border-[--hair] text-xs text-muted hover:text-ink disabled:opacity-30"
                      >+</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(p)}
                      className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Cart slide-over ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-surface shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
                <h2 className="font-semibold text-ink">Your Cart ({cartCount})</h2>
                <button onClick={() => setCartOpen(false)} className="text-muted hover:text-ink text-lg">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {cart.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <p className="text-4xl mb-3">🛒</p>
                      <p className="text-sm text-muted">Your cart is empty.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-base">
                          {item.product.image_url ? (
                            <OptimizableImage
                              src={item.product.image_url}
                              alt={item.product.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="absolute inset-0 grid place-items-center text-xl">📦</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{item.product.name}</p>
                          <p className="text-xs text-muted">{formatPrice(item.product.price_cents)} each</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <button
                              onClick={() => updateQty(item.product.id, item.qty - 1)}
                              className="h-5 w-5 rounded border border-[--hair] text-[0.6rem] text-muted hover:text-ink"
                            >−</button>
                            <span className="text-xs font-medium text-ink">{item.qty}</span>
                            <button
                              onClick={() => addToCart(item.product)}
                              disabled={item.qty >= item.product.stock_qty}
                              className="h-5 w-5 rounded border border-[--hair] text-[0.6rem] text-muted hover:text-ink disabled:opacity-30"
                            >+</button>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-ink">
                            {formatPrice(item.qty * item.product.price_cents)}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-[0.65rem] text-muted hover:text-red-500 mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-[--hair] px-6 py-4 space-y-3">
                  {error && (
                    <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">Total</span>
                    <span className="text-lg font-black text-brand">{formatPrice(cartTotal)}</span>
                  </div>
                  {clientSecret ? (
                    <CheckoutForm
                      clientSecret={clientSecret}
                      submitLabel={`Pay ${formatPrice(cartTotal)}`}
                      onSuccess={() => {
                        setCart([]);
                        setClientSecret(null);
                        setCartOpen(false);
                        setCheckoutDone(true);
                      }}
                      onCancel={() => setClientSecret(null)}
                      cancelLabel="Cancel"
                    />
                  ) : (
                    <button
                      onClick={checkout}
                      disabled={checkingOut}
                      className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                    >
                      {checkingOut ? "Processing…" : "Checkout →"}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
