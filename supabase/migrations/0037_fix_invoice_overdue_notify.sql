-- Fix invoice overdue notifications: invoices use payer_id, not user_id.
create or replace function public.notify_invoice_overdue()
returns trigger language plpgsql security definer as $$
begin
  if old.status <> 'overdue' and new.status = 'overdue' then
    insert into public.notifications(studio_id, user_id, type, title, body, link, payload)
    values (
      new.studio_id,
      new.payer_id,
      'invoice_overdue',
      'Payment overdue',
      'An invoice of $' || (new.amount_cents / 100.0)::numeric(10,2) || ' is overdue.',
      '/portal/parent',
      jsonb_build_object('invoice_id', new.id, 'amount_cents', new.amount_cents)
    );
  end if;
  return new;
end;
$$;
