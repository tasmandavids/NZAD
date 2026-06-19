# Xero accounting integration

Connect each studio's Xero organisation to Olune for P&L reporting and automatic invoice sync when parents pay through Stripe.

## 1. Create a Xero app

1. Sign in at [developer.xero.com](https://developer.xero.com/app/manage).
2. Create a **Web app** (OAuth 2.0).
3. Add a redirect URI:
   - Local: `http://localhost:3000/api/xero/oauth/callback`
   - Production: `https://www.olune.co.nz/api/xero/oauth/callback`
4. Enable scopes (granular — required for apps created after March 2026):
   - `openid`, `profile`, `email`, `offline_access`
   - `accounting.contacts`
   - `accounting.invoices`, `accounting.invoices.read`
   - `accounting.payments`
   - `accounting.reports.profitandloss.read`
   - `accounting.settings.read`

   Do **not** use deprecated broad scopes (`accounting.transactions`, `accounting.reports.read`) — new apps return "Invalid scope".

Copy the **Client ID** and **Client secret**.

## 2. Environment variables

Add to `.env.local` (see `.env.local.example`):

```bash
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=https://www.olune.co.nz
NEXT_PUBLIC_ROOT_DOMAIN=olune.co.nz
# Optional override — must match the redirect URI registered in Xero exactly
# XERO_REDIRECT_URI=https://www.olune.co.nz/api/xero/oauth/callback
# XERO_TOKEN_ENCRYPTION_KEY=generate-a-long-random-string
# XERO_OAUTH_STATE_SECRET=generate-a-long-random-string
```

`NEXT_PUBLIC_APP_URL` drives the OAuth callback in production (even when you open the admin portal from a studio subdomain like `nzad.olune.co.nz`).

## 3. Database migration

```bash
npm run db:push
```

This applies `0036_xero_integration.sql` (`xero_connections`, `xero_sync_log`, and `xero_invoice_id` columns).

## 4. Connect in the admin portal

1. Open **Finance → Accounting** in the admin portal.
2. Click **Connect Xero** and authorise your organisation.
3. Use **Open in Xero** to jump to your live Xero dashboard.

## What syncs to Xero

When Xero is connected and sync is enabled:

| Olune event | Xero result |
|-------------|-------------|
| Invoice paid (tuition / auto-pay) | Paid ACCREC invoice + contact |
| Shop order paid | Paid invoice with line items |
| Event ticket paid | Paid invoice |
| Refund | Credit note |

Olune stores only `xero_invoice_id` / `xero_contact_id` references. Full line-item and P&L detail is read from Xero on demand.

## Default account codes

Studios can adjust settings in the connection row (`settings` jsonb):

- `sales_account_code` — default `200`
- `payment_account_code` — default `090`

Ensure these codes exist in your Xero chart of accounts (NZ demo orgs often use similar codes).

## Troubleshooting

- **Connect button errors** — check `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` and redirect URI match.
- **Sync failures** — see the connection banner on Accounting; details are logged in `xero_sync_log`.
- **Empty P&L** — new Xero orgs may have no transactions yet; data appears once Xero has activity.
