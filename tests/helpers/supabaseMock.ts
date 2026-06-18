import type { SupabaseClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------------------
// Minimal chainable Supabase mock for unit tests.
//
// Register a per-table response. The builder returned by `.from(table)` is
// chainable (every filter returns `this`), awaitable (resolves to the table's
// `list` response — used by `.in()/.eq()` count queries and plain selects), and
// exposes `.single()` (resolves to the table's `single` response).
//
// This mirrors how lib/discounts.ts consumes the client and lets us drive every
// branch without a live database.
// ----------------------------------------------------------------------------

export type TableResponse = {
  single?: { data?: unknown; error?: unknown };
  list?: { data?: unknown; error?: unknown; count?: number };
};

export function makeSupabaseMock(
  responses: Record<string, TableResponse>,
): SupabaseClient {
  const client = {
    from(table: string) {
      const r = responses[table] ?? {};
      const listResult = r.list ?? { data: [], count: 0, error: null };
      const singleResult = r.single ?? { data: null, error: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        neq: () => builder,
        in: () => builder,
        lt: () => builder,
        gte: () => builder,
        not: () => builder,
        single: () => Promise.resolve(singleResult),
        // Make the builder awaitable.
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(listResult).then(resolve, reject),
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient;
}
