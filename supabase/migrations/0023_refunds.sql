-- ============================================================================
--  0023_refunds.sql
--  Admin-initiated refunds for invoices, shop orders and event tickets.
--
--  Adds refund bookkeeping columns to the three "sale" tables, lets the
--  shop-order restock happen automatically when an order is refunded (mirror
--  of the existing decrement-on-paid trigger), and adds 'refunded' as a valid
--  invoices status (it was previously free-text draft|sent|paid|overdue|void).
--
--  Event-ticket capacity is already freed by the 0009 sync trigger: it only
--  counts tickets whose status is in ('reserved','paid'), so flipping a ticket
--  to 'refunded' automatically decrements events.sold_tickets.
-- ============================================================================

-- ─── Refund bookkeeping columns ──────────────────────────────────────────────
alter table public.invoices
  add column if not exists refunded_at         timestamptz,
  add column if not exists refund_amount_cents int,
  add column if not exists stripe_refund_id    text;

alter table public.orders
  add column if not exists refunded_at         timestamptz,
  add column if not exists refund_amount_cents int,
  add column if not exists stripe_refund_id    text;

alter table public.event_tickets
  add column if not exists refunded_at         timestamptz,
  add column if not exists refund_amount_cents int,
  add column if not exists stripe_refund_id    text;

-- The payments table tracks the original charge; record refunds as their own
-- ledger rows (negative amount, status='refunded') so revenue nets correctly.
alter table public.payments
  add column if not exists stripe_refund_id text;

-- ─── Restock a shop order when it is refunded ────────────────────────────────
--  Mirrors decrement_stock_on_order(): when an order moves *into* 'refunded'
--  from a state that had already decremented stock ('paid'), put the qty back.
create or replace function public.restock_on_order_refund()
returns trigger language plpgsql security definer as $$
begin
  if old.status = 'paid' and new.status = 'refunded' then
    update public.products p
    set stock_qty = p.stock_qty + oi.qty
    from public.order_items oi
    where oi.order_id = new.id
      and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

drop trigger if exists order_refunded_restock on public.orders;
create trigger order_refunded_restock
  after update of status on public.orders
  for each row execute function public.restock_on_order_refund();
