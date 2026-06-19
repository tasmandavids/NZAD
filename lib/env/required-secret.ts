/** Resolve a required secret. In production, only the dedicated env var is accepted. */
export function requireSecret(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV !== "production" && devFallback) {
    return devFallback;
  }

  throw new Error(`${name} is required${devFallback ? ` (dev may set ${devFallback.split("=")[0]})` : ""}`);
}
