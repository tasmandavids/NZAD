-- ============================================================================
--  0010_products.sql
--  Merchandise POS — products catalogue, orders and order line items.
-- ============================================================================

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references public.studios(id) on delete cascade,
  name         text not null,
  description  text,
  price_cents  integer not null default 0 check (price_cents >= 0),
  stock_qty    integer not null default 0 check (stock_qty >= 0),
  sku          text,
  barcode      text,
  image_url    text,
  category     text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_studio_idx    on public.products(studio_id, active);
create index if not exists products_category_idx  on public.products(studio_id, category);

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references public.studios(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  total_cents  integer not null default 0,
  status       text not null default 'pending'
                 check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  stripe_payment_intent_id text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists orders_studio_idx on public.orders(studio_id, created_at desc);
create index if not exists orders_user_idx   on public.orders(user_id, created_at desc);

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete restrict,
  qty          integer not null default 1 check (qty > 0),
  unit_price   integer not null,   -- snapshot of price at time of purchase (cents)
  created_at   timestamptz not null default now()
);

create index if not exists order_items_order_idx   on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

-- Decrement stock when an order is paid
create or replace function public.decrement_stock_on_order()
returns trigger language plpgsql security definer as $$
begin
  if old.status <> 'paid' and new.status = 'paid' then
    update public.products p
    set stock_qty = p.stock_qty - oi.qty
    from public.order_items oi
    where oi.order_id = new.id
      and oi.product_id = p.id;
  end if;
  return new;
end;
$$;

drop trigger if exists order_paid_decrement_stock on public.orders;
create trigger order_paid_decrement_stock
  after update of status on public.orders
  for each row execute function public.decrement_stock_on_order();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.products enable row level security;

-- Admins manage products
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

-- Everyone in the studio can browse active products
drop policy if exists "products_studio_read" on public.products;
create policy "products_studio_read" on public.products
  for select using (
    studio_id = public.current_studio()
    and active = true
  );

alter table public.orders enable row level security;

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all using (
    studio_id = public.current_studio()
    and public.current_user_role() = 'admin'
  );

drop policy if exists "orders_own" on public.orders;
create policy "orders_own" on public.orders
  for all using (user_id = auth.uid());

alter table public.order_items enable row level security;

drop policy if exists "order_items_via_order" on public.order_items;
create policy "order_items_via_order" on public.order_items
  for all using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = auth.uid() or
             (o.studio_id = public.current_studio() and public.current_user_role() = 'admin'))
    )
  );

grant select, insert, update on public.products    to authenticated;
grant select, insert, update on public.orders      to authenticated;
grant select, insert         on public.order_items to authenticated;
