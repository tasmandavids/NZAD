-- Sequential invoice numbers per studio (INV-0001, INV-0002, …).

create table if not exists public.studio_invoice_counters (
  studio_id   uuid primary key references public.studios(id) on delete cascade,
  last_number int  not null default 0
);

alter table public.invoices
  add column if not exists invoice_number int;

-- Backfill existing invoices in creation order per studio.
with numbered as (
  select
    id,
    row_number() over (partition by studio_id order by created_at, id) as rn
  from public.invoices
  where invoice_number is null
)
update public.invoices i
set invoice_number = n.rn
from numbered n
where i.id = n.id;

insert into public.studio_invoice_counters (studio_id, last_number)
select studio_id, coalesce(max(invoice_number), 0)
from public.invoices
group by studio_id
on conflict (studio_id) do update
  set last_number = greatest(
    studio_invoice_counters.last_number,
    excluded.last_number
  );

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num int;
begin
  if new.invoice_number is not null then
    return new;
  end if;

  insert into public.studio_invoice_counters (studio_id, last_number)
  values (new.studio_id, 1)
  on conflict (studio_id) do update
    set last_number = studio_invoice_counters.last_number + 1
  returning last_number into next_num;

  new.invoice_number := next_num;
  return new;
end;
$$;

drop trigger if exists invoices_assign_number on public.invoices;
create trigger invoices_assign_number
  before insert on public.invoices
  for each row
  execute function public.assign_invoice_number();

alter table public.invoices
  alter column invoice_number set not null;

create unique index if not exists invoices_studio_number_idx
  on public.invoices (studio_id, invoice_number);
