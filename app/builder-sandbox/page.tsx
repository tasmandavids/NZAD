// ============================================================================
//  /builder-sandbox — public, in-memory Studio preview (no auth, no DB).
//  A convenience entry for previewing the rebuilt builder. Nothing persists.
// ============================================================================

import { StudioSandbox } from "@/components/builder/StudioSandbox";

export default function BuilderSandboxPage() {
  return <StudioSandbox />;
}
