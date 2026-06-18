-- ============================================================================
--  0024_notification_delivery.sql
--  Outbound delivery tracking for the notification queue (Session 16).
--
--  In-app notifications already exist as `notifications` rows the moment the
--  DB triggers / cron create them. This adds the bookkeeping for EXTERNAL
--  delivery (email via Resend, SMS via Twilio) handled by the new
--  /api/cron/deliver-notifications route:
--
--    • delivered_at      — set once the deliver cron has processed the row
--                          (success OR terminal failure). NULL = still queued.
--    • email_sent_at     — timestamp of a successful email send (audit).
--    • sms_sent_at       — timestamp of a successful SMS send (audit).
--    • delivery_attempts — incremented on every cron pass that touches the row.
--    • delivery_error    — last error string (for the most recent failed pass).
--
--  No RLS change: the deliver cron uses the service-role client (bypasses RLS),
--  and these columns are internal bookkeeping not surfaced to the portal UI.
-- ============================================================================

alter table public.notifications
  add column if not exists delivered_at      timestamptz,
  add column if not exists email_sent_at     timestamptz,
  add column if not exists sms_sent_at        timestamptz,
  add column if not exists delivery_attempts  int not null default 0,
  add column if not exists delivery_error     text;

-- Partial index over the delivery queue: only un-delivered rows, newest first.
create index if not exists notifications_delivery_queue_idx
  on public.notifications(sent_at)
  where delivered_at is null;
