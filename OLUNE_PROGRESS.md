# Olune — Build Progress

## Stack Decision Log
The starter codebase uses **Supabase** (not Prisma) as the ORM/database layer, with PostgreSQL RLS for multi-tenancy. Next-Auth was replaced by Supabase Auth. All architecture decisions follow this pattern.

---

## ✅ PHASE 1 — COMPLETE (pre-existing)

### 1.1 Database Schema (Supabase migrations)
- `0001_tenant_branding.sql` — `studios` table, `studio_branding` table, custom domain support
- `0002_core_tables_and_rls.sql` — `profiles`, `classes`, `enrollments`, `guardianships`, `invoices`, full RLS policies + helper functions (`current_studio()`, `current_user_role()`, `is_my_child()`, `teaches_class()`, `teaches_student()`), JWT hook
- `0003_attendance_and_capacity_view.sql` — `attendance` table + `class_capacity` view (live enrolled counts)

### 1.2 Auth + Middleware
- `middleware.ts` — Supabase session refresh + role-based portal routing (`/portal/admin`, `/portal/teacher`, `/portal/parent`, `/portal/student`)
- `lib/tenant.ts` — resolves studio from subdomain (`slug.olune.app`) or custom domain

### 1.3 Branding System
- `lib/branding.ts` — `derivePalette()`, `brandingToCssVars()`, `getBranding()`
- Root layout injects CSS custom properties (`--brand`, `--brand-hot`, `--brand-deep`, `--base`, `--surface`, etc.) server-side per tenant

### 1.4 Portal Pages (pre-existing)
- `/portal/admin` — Dashboard: stats cards, capacity heatmap, drag-and-drop schedule builder (mock data)
- `/portal/admin/branding` — Live branding editor with colour picker + font selector
- `/portal/admin/settings` — Studio identity editor (name/slug)
- `/portal/teacher` — Schedule view + interactive roll-call with optimistic attendance marking
- `/portal/parent` — Family hub: children cards + invoice table
- `/portal/student` — Timetable: today's classes + weekly grid + all classes list

---

## ✅ SESSION 1 — COMPLETE (2026-06-15)

### Admin Classes Management
**Files created:**
- `app/portal/admin/classes/page.tsx` — Server component: fetches `class_capacity` view + price data + teacher names
- `app/portal/admin/classes/actions.ts` — `createClass`, `updateClass`, `deleteClass` server actions with Zod validation + admin guard
- `components/admin/classes/ClassesManager.tsx` — Full client UI: searchable table, slide-over create/edit form (name, discipline, level, day, time, capacity, price, teacher), delete confirm dialog

### Admin Students Management + Enrollment
**Files created:**
- `app/portal/admin/students/page.tsx` — Server component: all studio students with their active enrollments + class options dropdown data
- `app/portal/admin/students/actions.ts` — `enrollStudent` (with capacity check), `unenrollStudent`, `addStudent` server actions
- `components/admin/students/StudentsManager.tsx` — Student grid with search, detail slide-over showing enrolled classes + enroll/unenroll controls

### Portal Navigation Update
- `components/portal/PortalShell.tsx` — Added **Classes** and **Students** nav items to admin sidebar

### TypeScript
- Clean build (`tsc --noEmit` → no errors)

---

## ✅ SESSION 2 — COMPLETE (2026-06-15)

### ScheduleBuilder — Wired to Real DB (Phase 2.1)
**Files created/updated:**
- `app/portal/admin/classes/schedule-actions.ts` — `rescheduleClass(classId, dayOfWeek, startTime)` server action
- `components/admin/dashboard/types.ts` — Updated `ClassBlock` interface; added `SCHEDULE_DAYS` + `SCHEDULE_SLOTS`
- `components/admin/dashboard/ScheduleBuilder.tsx` — Rewritten to accept real `ClassBlock[]` prop; Day×Time grid; calls `rescheduleClass` on drop
- `components/admin/dashboard/AdminDashboard.tsx` — Added `scheduleClasses` prop
- `app/portal/admin/page.tsx` — Added 5th parallel query for classes → maps to `ClassBlock[]`

### Enrollment Flow — Parent Portal (Phase 2.2)
**Files created:**
- `supabase/migrations/0004_waivers.sql` — `waivers` + `waiver_signatures` tables with RLS
- `app/portal/parent/enroll/actions.ts` — `getAvailableClasses()`, `getActiveWaivers()`, `signWaiver()`, `enrollChildInClass()`
- `components/portal/parent/EnrollModal.tsx` — 4-step modal (class → waivers → payment → confirmation)
- `components/portal/parent/ParentHub.tsx` — Added `+ Enroll` button

### Stripe Integration (Phase 3)
**Files created:**
- `lib/stripe.ts` — Singleton Stripe client
- `supabase/migrations/0005_stripe_fields.sql` — `stripe_payment_intent_id`, `stripe_customer_id` on profiles/invoices; new `payments` table
- `app/api/payments/create-intent/route.ts` — POST endpoint
- `app/api/webhooks/stripe/route.ts` — Handles `payment_intent.succeeded`, `invoice.paid`, `customer.subscription.deleted`
- `app/portal/admin/billing/page.tsx` + `components/admin/billing/BillingDashboard.tsx` — Invoice table + monthly Recharts bar chart

### Leads CRM (Phase 4.1)
**Files created:**
- `supabase/migrations/0006_leads.sql` — `leads` table with RLS
- `app/portal/admin/leads/actions.ts` — `createLead`, `updateLeadStatus`, `updateLeadNotes`, `deleteLead`
- `app/portal/admin/leads/page.tsx` + `components/admin/leads/LeadsBoard.tsx` — Kanban board with `@hello-pangea/dnd`

### Navigation
- Added **Billing** + **Leads** nav items to admin sidebar

### Packages installed: `stripe@22.2.1`, `recharts@3.8.1`
### TypeScript: Clean build

---

## ✅ SESSION 3 — COMPLETE (2026-06-15)

### Phase 4.2 — Internal Messaging (SSE)
**Files created:**
- `supabase/migrations/0007_messages.sql` — `messages` table with RLS (participant read, admin all, insert with studio check, update for mark-read)
- `app/api/messages/route.ts` — GET (fetch thread + auto-mark-read) + POST (send message)
- `app/api/messages/stream/route.ts` — SSE endpoint using Supabase Realtime `postgres_changes`; heartbeat every 25s; cleans up on client disconnect
- `app/portal/admin/messages/page.tsx` — Server shell: fetches contacts + recent messages
- `components/admin/messages/MessagesPanel.tsx` — Two-pane chat UI: contact list (sorted by unread then recency) + thread view with SSE auto-append; optimistic send; Enter to send/Shift+Enter new line

### Phase 4.3 — Automated Notifications
**Files created:**
- `supabase/migrations/0008_notifications.sql` — `notifications` table + 3 DB triggers: enrollment_confirmed (insert on enrollments), invoice_overdue (update status on invoices), message_received (insert on messages)
- `app/api/notifications/route.ts` — GET (recent 30, includes unread count) + POST (mark read — specific ids or all)
- `components/admin/notifications/NotificationBell.tsx` — Bell icon with unread badge; polls every 60s; dropdown list; marks all read on open; navigates to link on item click
- `components/portal/PortalShell.tsx` — Added notification bell in top bar (admin-only); added **Messages** nav item

### Phase 5.1 — Event & Recital Wizard
**Files created:**
- `supabase/migrations/0009_events.sql` — `events` + `event_tickets` tables; trigger to auto-sync `sold_tickets`; RLS (admin all, public published-only read)
- `app/portal/admin/events/actions.ts` — `createEvent`, `updateEvent`, `publishEvent`, `cancelEvent`, `deleteEvent`
- `app/portal/admin/events/page.tsx` — Server shell
- `components/admin/events/EventsManager.tsx` — Event list (upcoming/past), 4-step creation wizard (Basic Info → Venue → Tickets & Pricing → Review & Publish), inline publish/cancel/delete actions
- `app/api/events/purchase/route.ts` — POST ticket purchase: free = reserve immediately with QR; paid = Stripe PaymentIntent + reserved row; QR code is base64 PNG via `qrcode` npm
- Added **Events** nav item

### Phase 5.2 — Merchandise POS
**Files created:**
- `supabase/migrations/0010_products.sql` — `products`, `orders`, `order_items` tables; trigger to decrement stock on order paid; RLS (admin all, studio members browse active products)
- `app/portal/admin/shop/actions.ts` — `createProduct`, `updateProduct`, `adjustStock`, `toggleProductActive`, `deleteProduct`
- `app/portal/admin/shop/page.tsx` — Server shell
- `components/admin/shop/ShopManager.tsx` — Product grid (search + category filter) + stock ±1 controls + slide-over create/edit form; recent orders table
- `components/portal/parent/ParentShop.tsx` — Parent-facing product grid with cart (React state), add/remove/qty controls, slide-over cart, calls `/api/shop/checkout`
- `app/api/shop/checkout/route.ts` — Creates order + line items; free = paid immediately; paid = Stripe PaymentIntent returned
- Added **Shop** + **Events** nav items

### Packages installed: `qrcode`, `@types/qrcode`
### TypeScript: Clean build (`tsc --noEmit` → no errors)

---

## ✅ SESSION 4 — COMPLETE (2026-06-15)

### Priority 1 — ParentShop mounted in Parent Portal
- `app/portal/parent/page.tsx` — Resolves the parent's `studio_id`, then fetches active `products` (studio-scoped) and renders `<ParentShop products={products} />` in a new section below `ParentHub`. Added `ShopProduct` export type.

### Priority 2 — Event ticket purchase in Parent Portal
- `components/portal/parent/EventsTickets.tsx` (new) — Grid of published events; detail/purchase modal with qty stepper; calls `/api/events/purchase`; renders the returned QR-code PNG on success. Shows "Ticket held" + existing QR for events the parent already has.
- `app/portal/parent/page.tsx` — Fetches published events + the parent's existing `event_tickets`, maps to `ParentEvent[]` (with `ticketsRemaining` and `myTicket`), renders `<EventsTickets>`.

### Priority 3 — Stripe webhook order + ticket confirmation
- `app/api/webhooks/stripe/route.ts` — `payment_intent.succeeded` now branches on metadata: `invoice_id` (existing), `order_id` → marks `orders.status = 'paid'` (fires stock-decrement trigger), `event_id` → promotes the reserved `event_tickets` row (matched by intent id + user) to `'paid'` (fires sold_tickets sync trigger).

### Priority 4 — Student Progress Tracker (Phase 5.3)
- `supabase/migrations/0011_student_progress.sql` (new) — `student_progress` table (studio_id, student_id, instructor_id, notes, level, certifications jsonb, logged_at) + RLS: admin all, teacher read/insert via `teaches_student()`, student self-read, parent `is_my_child()` read.
- `app/portal/admin/students/[id]/actions.ts` (new) — `logProgress` (admin or teacher; stamps instructor_id + studio_id so both RLS policies pass) + `deleteProgress`, Zod-validated.
- `app/portal/admin/students/[id]/page.tsx` (new) — Student detail header + progress timeline.
- `components/admin/students/ProgressTracker.tsx` (new) — Log form (notes, level select, cert badge input) + reverse-chronological timeline.
- `components/admin/students/StudentsManager.tsx` — Added "View progress & profile" link in the detail slide-over.

### Priority 5 — Teacher progress access
- `app/portal/teacher/students/[id]/page.tsx` (new) — Reuses `ProgressTracker` (delete hidden via `readOnlyDelete`); RLS scopes data to the teacher's own students, so no extra guard needed.
- `components/portal/teacher/TeacherSchedule.tsx` — Student names in roll-call now link to the teacher progress page.

### Also fixed
- `app/api/events/purchase/route.ts` — Stripe customer name now reads `full_name` (the real `profiles` column) instead of the non-existent `first_name`/`last_name`.

### TypeScript: Clean build (`tsc --noEmit` → no errors)

---

## ✅ SESSION 5 — COMPLETE (2026-06-15)

### Priority 1 — Real card capture (Stripe PaymentElement) ✅
**Packages installed:** `@stripe/react-stripe-js@^6.6.0` (v6 is the first line whose peer range allows the already-installed `@stripe/stripe-js@9`; v3 caps at `<8` → ERESOLVE).

**Files created:**
- `lib/stripe-client.ts` — browser-side `getStripe()` singleton (memoised `loadStripe`). Resolves to `null` when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unset so callers degrade gracefully.
- `components/payments/CheckoutForm.tsx` — shared client component. Wraps `<Elements>` (PaymentIntent-first / clientSecret mode) around `<PaymentElement>` + submit button; calls `stripe.confirmPayment({ elements, redirect: "if_required" })` so card payments stay inline and only redirect when the method requires it. Fires `onSuccess()` on `succeeded`/`processing`. NOTE: deliberately does **not** call `elements.submit()` — that is only valid in the deferred-intent flow and errors in clientSecret mode.

**Files updated:**
- `components/portal/parent/ParentShop.tsx` — paid checkout now stores `data.clientSecret` and renders `<CheckoutForm>` in the cart slide-over footer; `onSuccess` clears cart + shows "Order confirmed".
- `components/portal/parent/EventsTickets.tsx` — paid branch stores `clientSecret` + `pendingQr`; modal shows `<CheckoutForm>`; `onSuccess` reveals the QR (free branch still confirms immediately).
- `components/portal/parent/EnrollModal.tsx` — `Step3Payment` rewritten as a 2-phase ("summary" → "pay") self-contained step: enrolls first (to reserve the spot + learn waitlist status), then for paid + non-waitlisted enrollments creates an invoice + PaymentIntent and shows `<CheckoutForm>`. Free/waitlisted skip payment. Removed the old `doEnroll`/`submitError` path from the parent modal.
- `app/portal/parent/enroll/actions.ts` — new `createEnrollmentIntent(studentId, classId, className, priceCents)` server action: creates a `sent` invoice (7-day due date) + Stripe customer (if needed) + PaymentIntent with `metadata.invoice_id` (so the existing `payment_intent.succeeded` webhook marks it paid and records the payment row).
- `.env.local.example` — documented `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

**Decisions made autonomously:**
- Enrollment charges in `aud` to stay consistent with the existing shop/events PaymentIntents (whole Stripe integration is AUD). EnrollModal display still uses the `en-NZ`/NZD `Intl` formatter inherited from before — both render `$`, so no visible mismatch, but the display currency vs charge currency should be unified studio-wide (see notes).
- For paid enrollments the child is enrolled *before* payment (spot reserved); an unpaid enrollment leaves a `sent` invoice. Acceptable for a studio; revisit if you want pay-to-confirm semantics.

### TypeScript: Clean build (`tsc --noEmit` → no errors)

---

## ✅ SESSION 6 — COMPLETE (2026-06-16)

Closed out the remaining Phase 2.4 + Phase 3.2/3.3 priorities. Clean `tsc --noEmit`.

### Priority 1 — Waitlist auto-promotion (Phase 2.4) ✅
- `supabase/migrations/0012_waitlist_autopromote.sql` (new) — `promote_waitlist()` SECURITY DEFINER trigger fn + `waitlist_promote_trigger` on `enrollments` (AFTER UPDATE OR DELETE). When an `active` enrollment leaves (hard delete via admin unenroll, or status moves away from `active`), it promotes the oldest `waitlisted` student (by `enrolled_at`) to `active` — looping until the class is full or the waitlist empties — and inserts a `waitlist_promoted` notification for each promoted student. Recursion-safe (inner promotions see `old.status = 'waitlisted'` and early-return).
- No app code change needed: the existing admin `unenrollStudent` (hard DELETE) already fires the trigger.

### Priority 2 — Recurring class generation (Phase 2.4) ✅
- **Decision:** kept the weekly-recurring `classes` model (no `class_sessions` table) to avoid rewiring the capacity view / attendance / enrollments / ScheduleBuilder. Recurrence is expressed at the class level via a shared `recurring_group_id`.
- `supabase/migrations/0013_recurring_classes.sql` (new) — adds nullable `recurring_group_id uuid` + index to `classes`.
- `app/portal/admin/classes/actions.ts` — added `createRecurringClasses` (generates one weekly class row per selected weekday, all sharing a new `recurring_group_id`; de-dupes days) + `deleteRecurringGroup` (deletes the whole linked set).
- `components/admin/classes/ClassesManager.tsx` — create slide-over now uses a multi-select day-chip picker (edit mode keeps the single-day select). Selecting >1 day calls `createRecurringClasses`; 1 day falls back to `createClass`.

### Priority 3 — Auto-pay subscriptions (Phase 3.2) ✅
- `supabase/migrations/0014_subscriptions.sql` (new) — `subscriptions` table (studio_id, payer_id, student_id, class_id, stripe_subscription_id, plan_label, amount_cents, currency, interval, status, current_period_end, cancel_at_period_end) + RLS (admin all, payer read/insert).
- `app/portal/parent/subscriptions/actions.ts` (new) — `createEnrollmentSubscription` creates a Stripe **Product** + monthly inline-price **Subscription** (`payment_behavior: default_incomplete`, `save_default_payment_method: on_subscription`), returns the first-invoice clientSecret (read defensively from `confirmation_secret` or legacy `payment_intent`), and mirrors a `subscriptions` row. Plus `cancelSubscription` (sets `cancel_at_period_end`).
- `app/api/webhooks/stripe/route.ts` — now handles `customer.subscription.created/updated/deleted`, syncing `status` / `current_period_end` / `cancel_at_period_end` onto the `subscriptions` row.
- `components/portal/parent/AutoPaySetup.tsx` (new) + `app/portal/parent/page.tsx` — parent portal lists paid enrolled classes with "Set up monthly auto-pay" (card captured via the shared `CheckoutForm`) and a cancel action for active auto-pay. Page now fetches `subscriptions` + class `price_cents` and renders `<AutoPaySetup>`.

### Priority 4 — Sibling discount logic (Phase 3.3) ✅
- `supabase/migrations/0015_sibling_discount.sql` (new) — adds `sibling_discount_pct int (0–100, default 0)` to `studios`.
- `app/portal/parent/enroll/actions.ts` — `createEnrollmentIntent` now reads `studios.sibling_discount_pct`; if the family already has ≥1 OTHER student with an `active` enrollment, it applies the % discount to both the invoice `amount_cents` and the Stripe PaymentIntent `amount`.
- `app/portal/admin/settings/actions.ts` — added `updateSiblingDiscount` (admin-guarded, Zod 0–100).
- `components/admin/AdminSettings.tsx` + `app/portal/admin/settings/page.tsx` — new "Billing" section with the sibling-discount field; page now selects + passes `sibling_discount_pct`.

### Migrations to apply (in order): 0012, 0013, 0014, 0015
### TypeScript: Clean build (`tsc --noEmit` → no errors)

---

## ✅ SESSION 7 — COMPLETE (2026-06-16)

Closed out all four carried-over priorities from Session 6. Clean `tsc --noEmit`.

### New shared infrastructure
- `lib/supabase/admin.ts` (new) — `createAdminClient()` service-role client (bypasses RLS). For webhook + cron handlers only; requires `SUPABASE_SERVICE_ROLE_KEY`.
- `lib/currency.ts` (new) — single source of truth: `CURRENCY` (`nzd`), `CURRENCY_CODE`/`CURRENCY_LOCALE`, `GST_RATE` (0.15), `formatMoney(cents)`, `gstComponentCents(gross)`.
- `app/api/webhooks/stripe/route.ts` — `getServiceSupabase()` now uses `createAdminClient()` when `SUPABASE_SERVICE_ROLE_KEY` is set (falls back to anon in dev).

### Priority 1 — Time-based notifications (Phase 4.3) ✅
- `supabase/migrations/0016_cron_notifications.sql` (new) — adds `profiles.birthday`; **fixes the latent 0008 `notify_enrollment_confirmed` trigger** (was `new.user_id` + `status='enrolled'`; now `new.student_id` + `status='active'`, studio_id read off the enrollment row). Enrollment-confirmed notifications now actually fire.
- `app/api/cron/notifications/route.ts` (new) — GET, service-role. Generates `class_reminder` (active enrollees of classes scheduled tomorrow, deduped per user/class/day), sweeps `sent` invoices past due → `overdue` (fires the 0008 invoice trigger), and `birthday_greeting` (profiles whose birthday is today, deduped). Auth via `CRON_SECRET` Bearer token (or `?secret=`), fails closed in prod.
- `app/api/webhooks/stripe/route.ts` — added `invoice.payment_failed` → marks our matching invoice `overdue` + inserts a `payment_failed` notification (resolves recipient via `subscriptions` then `invoices`).
- `vercel.json` (new) — daily cron `0 8 * * *` → `/api/cron/notifications`.
- `.env.local.example` — documented `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET`.

### Priority 2 — Recurring groups in the UI ✅
- `app/portal/admin/classes/page.tsx` — `ClassRow` gains `recurringGroupId`; fetched alongside `price_cents` from the base `classes` table.
- `components/admin/classes/ClassesManager.tsx` — "↻ Series" badge on grouped classes; delete dialog offers "Delete the entire recurring series" (wired to `deleteRecurringGroup`); button label switches to "Delete series".

### Priority 3 — Admin subscription management ✅
- `app/portal/admin/subscriptions/page.tsx` + `components/admin/subscriptions/SubscriptionsManager.tsx` (new) — studio-wide subscriptions table (plan, payer, student, amount, status badge, next charge), active-count + monthly-recurring summary cards, status filter.
- `app/portal/admin/subscriptions/actions.ts` (new) — `adminCancelSubscription(stripeSubId, immediate)` (admin-guarded; cancel-at-period-end or immediate).
- `components/portal/PortalShell.tsx` — added **Subscriptions** nav item.

### Priority 4 — Currency / GST unification ✅
- Standardised studio-wide on **NZD** (matches NZ GST + `en-NZ` locale + `html lang`).
- All Stripe charges now use `CURRENCY` (`nzd`): enrollment intent, subscriptions price + row, shop checkout, events purchase, payments/create-intent.
- All display formatters now NZD: ParentShop, AutoPaySetup, EventsTickets, admin ShopManager, admin EventsManager (previously `en-AU`/AUD). ClassesManager price uses `formatMoney`.
- `createEnrollmentIntent` now stamps `invoices.gst_cents` via `gstComponentCents(chargeCents)` (15% inclusive).

### Migrations to apply: 0016
### Env to set: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
### TypeScript: Clean build (`tsc --noEmit` → no errors)

---

## ✅ SESSION 8 — COMPLETE (2026-06-16)

Closed out all four carried-over priorities from Session 7. Clean `tsc --noEmit`.

### Priority 1 — Per-studio timezone for the cron ✅
- `supabase/migrations/0017_studio_timezone.sql` (new) — adds `studios.timezone text not null default 'Pacific/Auckland'` (IANA name).
- `app/api/cron/notifications/route.ts` — rewritten to be timezone-aware. Fetches all studios + their timezone, computes each studio's local `today`/`tomorrow`/`mm-dd` via `Intl.DateTimeFormat` (`localDateInfo` helper, falls back to UTC for an invalid tz). Class reminders now match each class against its studio's local *tomorrow* weekday; the overdue sweep groups studios by their local date and runs one `<due_date` update per distinct date; birthdays match each profile against its studio's local *today*. Dedup floor stays UTC-midnight (cron runs once daily).
- `app/portal/admin/settings/actions.ts` — new `updateStudioTimezone` (admin-guarded; Zod validates the IANA name via `Intl.DateTimeFormat`).
- `components/admin/AdminSettings.tsx` + `app/portal/admin/settings/page.tsx` — new "Localization" section with a timezone `<select>` (common IANA list; keeps any current non-listed value). Page now selects + passes `timezone`.

### Priority 2 — Mirror subscription invoices into `invoices` ✅
- `app/api/webhooks/stripe/route.ts` — `invoice.paid` now: (1) tries to finalise an existing `invoices` row by `stripe_invoice_id` (one-off flow, unchanged); (2) if none matched AND the Stripe invoice has a `subscription`, looks up our `subscriptions` row and inserts a NEW per-charge `invoices` row (status `paid`, `gst_cents` via `gstComponentCents`, stamped with `stripe_invoice_id` + `stripe_payment_intent_id`) **plus** a `payments` row. Idempotent: skips if a row with that `stripe_invoice_id` already exists. (Subscription PaymentIntents carry no `invoice_id`/`order_id`/`event_id` metadata, so `payment_intent.succeeded` ignores them — no double-count.)

### Priority 3 — Reusable Stripe Product/Price per class ✅
- `supabase/migrations/0018_class_stripe_price.sql` (new) — adds `classes.stripe_product_id`, `stripe_price_id`, `stripe_price_cents`.
- `app/portal/parent/subscriptions/actions.ts` — new `getOrCreateClassPrice()` creates one reusable Stripe Product + monthly Price per class and caches the ids on the `classes` row; if the tuition changed since the cached Price was minted (`stripe_price_cents !== priceCents`) it mints a fresh (immutable) Price and updates the cache. `createEnrollmentSubscription` now subscribes with `items: [{ price: priceId }]` instead of inline `price_data` + throwaway Product.

### Priority 4 — Soft-cancel enrollments + sibling discount coverage ✅
- `lib/discounts.ts` (new) — single source of truth for the sibling discount: `siblingDiscountInfo()` (returns `{ applies, pct, discountedCents }`) + `siblingDiscountedCents()` wrapper.
- `app/portal/parent/enroll/actions.ts` — `createEnrollmentIntent` now calls `siblingDiscountedCents()` (inline block removed).
- `app/portal/parent/subscriptions/actions.ts` — sibling discount now also applies to **auto-pay subscriptions**. Reusable Prices are immutable, so the family discount is applied via a reusable forever percent-off Stripe **coupon** (`getOrCreatePercentCoupon`, stable id `olune-sibling-<pct>pct`) attached with `discounts: [{ coupon }]`. The mirrored `subscriptions.amount_cents` + `plan_label` reflect the discounted figure.
- `app/portal/admin/students/actions.ts` — new `dropEnrollment()` soft-cancel: sets `status='dropped'` (instead of hard delete), which fires the 0012 waitlist auto-promote trigger. Re-enrolling later goes through `enrollStudent`'s upsert (unique-constraint-safe).
- `components/admin/students/StudentsManager.tsx` — enrollment rows now show **Drop** (soft, amber) alongside **Remove** (hard delete, red), with tooltips.

### Migrations to apply (in order): 0017, 0018
### TypeScript: Clean build (`tsc --noEmit` → no errors)

---

## ✅ SESSION 9 — COMPLETE (2026-06-16)

Closed out all four carried-over priorities from Session 8. Clean `tsc --noEmit`.

### Priority 1 — Family discount for shop & events ✅
- **Decision:** extending the tuition sibling discount to merch/tickets is a separate business call, so it's **opt-in per studio** (off by default), not automatic. Shop orders and event tickets aren't tied to a specific student, so the new helper keys off "buyer has ≥1 active-enrolled student" instead of the sibling-exclusion rule.
- `supabase/migrations/0019_family_retail_discount.sql` (new) — adds `studios.family_discount_on_retail boolean not null default false`.
- `lib/discounts.ts` — new `familyDiscountInfo(supabase, studioId, buyerId, priceCents)`: applies `sibling_discount_pct` only when the studio opted in AND the buyer has an active enrollment. Same `SiblingDiscount` shape.
- `app/api/shop/checkout/route.ts` — applies `familyDiscountInfo` to the order total before creating the order + PaymentIntent.
- `app/api/events/purchase/route.ts` — applies `familyDiscountInfo` to the ticket charge (free-check + Stripe amount + reserved row all use the discounted `totalCents`).
- `app/portal/admin/settings/actions.ts` — new `updateFamilyRetailDiscount` (admin-guarded, Zod boolean).
- `components/admin/AdminSettings.tsx` + `app/portal/admin/settings/page.tsx` — new "Also apply to shop & event tickets" checkbox in the Billing section (optimistic toggle, reverts on failure); page selects + passes `family_discount_on_retail`.

### Priority 2 — Stripe Price/Product archival hygiene ✅
- `app/portal/parent/subscriptions/actions.ts` — `getOrCreateClassPrice` now archives the previous Price (`stripe.prices.update(old, { active: false })`) when minting a fresh one after a tuition change. Existing subscriptions keep billing on the old Price object. Non-fatal on failure.
- `app/portal/admin/classes/actions.ts` — new `archiveClassStripeProducts()` helper; `deleteClass` and `deleteRecurringGroup` capture `stripe_product_id`(s) before deletion and archive the Stripe Product(s) afterward (archiving a Product also deactivates its Prices). Non-fatal on failure.

### Priority 3 — Pay-to-confirm hygiene: sweep unpaid reservations ✅
- **Decision:** kept reserve-then-pay semantics but added an automated release sweep rather than switching to pay-to-confirm (less disruptive to existing flows).
- `app/api/cron/sweep-unpaid/route.ts` (new) — GET, service-role, `CRON_SECRET`-auth (fails closed in prod). Grace window default 2h (`?hours=N`, 1–168). For each stale reservation it re-checks the PaymentIntent (skips if `succeeded`/`processing`), then: `orders` `pending` → cancel PI + set `cancelled`; `event_tickets` `reserved` → cancel PI + delete row (frees `sold_tickets` via the 0009 sync trigger); `invoices` `sent` w/ a `stripe_payment_intent_id` → reads PI metadata (`student_id`+`class_id`, present only for enrollment reservations), cancels the PI, drops the held enrollment (`status='dropped'` → fires the 0012 waitlist auto-promote trigger), voids the invoice. Generic owed invoices (no enrollment metadata) are left untouched.
- `vercel.json` — added hourly cron `0 * * * *` → `/api/cron/sweep-unpaid`.

### Priority 4 — Webhook idempotency ledger ✅
- `supabase/migrations/0020_stripe_event_ledger.sql` (new) — `stripe_events` table (id text PK = Stripe `event.id`, type, received_at). RLS enabled, no policies → service-role only.
- `app/api/webhooks/stripe/route.ts` — after signature verification, inserts `event.id` into `stripe_events`. Unique-violation (`23505`) → replay: ack 200 and short-circuit. Any other ledger error (e.g. table not yet migrated) is logged and processing continues (fail-open so a missing migration doesn't drop events).

### Migrations to apply (in order): 0019, 0020
### Env (no new vars): the sweep cron reuses `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` + `STRIPE_SECRET_KEY`.
### TypeScript: Clean build (`tsc --noEmit` → no errors)

---

## 🔄 NEXT SESSION — Start here

### Priority 1: Tests / end-to-end verification of money flows
- The billing surface is now broad (enrollment intents, subscriptions, shop, events, sweeps, mirrored invoices, idempotency) with no automated tests. Add a minimal harness (Vitest + mocked Stripe + a Supabase test schema, or a `stripe listen` runbook) asserting: webhook idempotency short-circuits, the sweep releases the right rows, discounts compute correctly.

### Priority 2: Refund / cancellation flows
- No refund path exists. Cancelling a paid event ticket, order, or enrollment doesn't issue a Stripe refund or restock. Add admin-initiated refunds (`stripe.refunds.create`) that reverse `event_tickets`/`orders`/`invoices` state and restore stock/capacity.

### Priority 3: Reporting / revenue dashboard depth
- `invoices` + `payments` now capture one-off, enrollment, and subscription income uniformly. The admin billing chart could break revenue down by source (tuition vs merch vs tickets vs subscriptions) and surface MRR from the `subscriptions` table.

### Priority 4: Notification delivery channels
- Notifications are in-app only (the bell). The `Message.channel` enum and the spec call for EMAIL/SMS. Wire an email provider (Resend/Postmark) + SMS (Twilio) for `class_reminder`, `payment_failed`, `birthday_greeting`, driven off the existing `notifications` rows.

---

## ⚠️ Known Decisions / Notes
- `addStudent` in students/actions.ts inserts a `profiles` row without a linked `auth.users` row. Production should call Supabase Edge Function with service-role key → `supabase.auth.admin.inviteUserByEmail()`.
- ✅ Card capture is now wired (Session 5) — EnrollModal, ParentShop, and EventsTickets all use `components/payments/CheckoutForm.tsx`. Paid flows now actually charge the card via Stripe PaymentElement; the webhook finalises invoice/order/ticket on `payment_intent.succeeded`.
- Stripe webhook + the notifications cron now use `createAdminClient()` (`lib/supabase/admin.ts`) when `SUPABASE_SERVICE_ROLE_KEY` is set; the webhook falls back to the anon key in dev. **Set `SUPABASE_SERVICE_ROLE_KEY` in production** — the cron route requires it and will 500 without it.
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env vars must be set before billing/shop/events/enrollment-payment features work. The publishable key is required client-side for the PaymentElement to render.
- Currency inconsistency: shop/events/enrollment PaymentIntents all charge `aud`, but EnrollModal's summary uses the `en-NZ`/NZD `Intl` formatter and the invoices table comments mention NZ GST. Pick one currency studio-wide and align display + charge + GST before production.
- The ScheduleBuilder slots are hardcoded to 3:30–7:30pm. Update `SCHEDULE_SLOTS` in `types.ts` if Tasman's studio uses different hours.
- SSE stream in `/api/messages/stream` uses Supabase Realtime channel. Ensure Supabase Realtime is enabled on the `messages` table in the Supabase dashboard (Database → Replication → `messages`).
- Notification bell polling interval is 60s. For more real-time behaviour, wire it to the SSE stream too.
- Migration `0011_student_progress.sql` must be applied to Supabase before the progress tracker works.
- Paid event tickets / shop orders / enrollments are reserved on PaymentIntent creation and confirmed by the webhook on `payment_intent.succeeded`. With the PaymentElement now wired, the card is actually charged, so the webhook fires once Stripe CLI / endpoint is configured. To test locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use test card `4242 4242 4242 4242`.
- `EventsTickets`/`ParentShop`/`EnrollModal` reveal success (QR / "Order confirmed" / "Enrolled") on the client `confirmPayment` success. The DB row is promoted to `paid` asynchronously by the webhook — if the webhook is down the user still sees success but the row stays `reserved`/`sent`. Consider polling the row or showing "payment processing" until the webhook confirms for stricter UX.
- `CheckoutForm` uses `redirect: "if_required"`, so redirect-based payment methods (some 3DS / bank redirects) need a `return_url`. Currently none is set — if you enable such methods, add `confirmParams.return_url` in `components/payments/CheckoutForm.tsx`.
- **Session 6 — migrations 0012–0015 must be applied to Supabase** before waitlist auto-promotion, recurring classes, subscriptions, and sibling discounts work.
- Waitlist auto-promotion fires off the existing **hard-DELETE** unenroll path (and any status change away from `active`). ✅ **Session 8** added a soft-cancel `dropEnrollment` (`status='dropped'`) which also fires the trigger; re-enrolling a dropped row uses `enrollStudent`'s `upsert` (the `(student_id, class_id)` unique constraint blocks a plain re-insert).
- ✅ **Fixed (Session 8):** auto-pay subscriptions now reuse one Stripe Product + Price per class (cached on `classes.stripe_product_id`/`stripe_price_id`/`stripe_price_cents`, migration 0018) instead of minting a throwaway Product per subscription. A tuition change mints a fresh immutable Price; the old Price is left unreferenced but **not archived** (see next-session Priority 2).
- ✅ **Fixed (Session 8):** subscription recurring invoices ARE now mirrored — `invoice.paid` for subscription invoices inserts per-charge `invoices` + `payments` rows (idempotent on `stripe_invoice_id`).
- Sibling discount triggers when the paying guardian already has ≥1 OTHER child with an `active` enrollment. ✅ **Session 8** extracted it to `lib/discounts.ts` and extended it to auto-pay **subscriptions** (via a reusable percent-off coupon). It still does NOT apply to shop orders or event tickets.
- ✅ **Fixed (Session 7):** the latent `0008` `notify_enrollment_confirmed` trigger (referenced non-existent `new.user_id`, guarded by `status='enrolled'`) is rewritten in `0016` against `new.student_id` + `status='active'`; enrollment-confirmed notifications now fire.
- Currency is unified to **NZD** studio-wide (charges + display + GST). Migration `0016` must be applied (adds `profiles.birthday`, fixes the enrollment trigger).
- ✅ **Fixed (Session 8):** the cron (`/api/cron/notifications`) is now **per-studio timezone-aware** (migration 0017 adds `studios.timezone`; settable in admin Settings → Localization). The 08:00-UTC cron computes each studio's local today/tomorrow for reminders, birthdays and overdue sweeps.
- **Session 8 — migrations 0017 + 0018 must be applied to Supabase** before per-studio timezones and reusable class Prices work.
- ✅ **Session 9:** sibling/family discount now optionally extends to shop orders + event tickets via the per-studio opt-in `family_discount_on_retail` (migration 0019, toggle in admin Settings → Billing). Off by default. Uses `familyDiscountInfo` in `lib/discounts.ts` ("buyer has an active-enrolled student"), distinct from the enrollment-specific `siblingDiscountInfo`.
- ✅ **Session 9:** stale Stripe Prices are archived when tuition changes (`getOrCreateClassPrice`), and per-class Products are archived on class/series delete. All non-fatal — Stripe failures only `console.warn`.
- ✅ **Session 9:** new hourly sweep `/api/cron/sweep-unpaid` releases abandoned reservations (pending orders, reserved tickets, unpaid enrollment invoices) after a grace window (default 2h, `?hours=N`). It re-checks each PaymentIntent before acting so in-flight/succeeded payments are never released. **Reserve-then-pay is still the model** — this is cleanup, not pay-to-confirm.
- ✅ **Session 9:** Stripe webhook is now idempotent via the `stripe_events` ledger (migration 0020). Replays short-circuit with 200. **Fail-open:** if the ledger table is missing (un-migrated env), the handler logs and still processes — so apply 0020, but a missing migration won't silently drop events.
- **Session 9 — migrations 0019 + 0020 must be applied to Supabase** before the retail discount toggle and webhook idempotency ledger work.
