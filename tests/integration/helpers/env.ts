/** True when integration tests should run against a live Supabase project. */
export function integrationEnabled(): boolean {
  return (
    process.env.INTEGRATION_TEST === "1" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function integrationSkipReason(): string {
  if (process.env.INTEGRATION_TEST !== "1") {
    return "Set INTEGRATION_TEST=1 to run integration tests.";
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return "NEXT_PUBLIC_SUPABASE_URL is not set.";
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return "SUPABASE_SERVICE_ROLE_KEY is not set.";
  return "";
}
