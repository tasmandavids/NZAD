/** True when integration tests should run against a live Supabase project. */
export function integrationEnabled(): boolean {
  return (
    process.env.INTEGRATION_TEST === "1" &&
    isConfiguredEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isConfiguredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function isConfiguredEnv(value: string | undefined): boolean {
  if (!value || value.trim().length < 8) return false;
  return !/YOUR|^\.\.\.$|sk_test_\.\.\.|pk_test_\.\.\.|whsec_\.\.\./i.test(value.trim());
}

export function integrationSkipReason(): string {
  if (process.env.INTEGRATION_TEST !== "1") {
    return "Set INTEGRATION_TEST=1 to run integration tests.";
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return "NEXT_PUBLIC_SUPABASE_URL is not set.";
  if (!isConfiguredEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return "SUPABASE_SERVICE_ROLE_KEY is not set or is still a placeholder.";
  }
  return "";
}
