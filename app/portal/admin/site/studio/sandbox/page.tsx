// ============================================================================
//  /portal/admin/site/studio/sandbox — in-memory Studio sandbox (no DB).
//  Mounts the full editor with a starter template and a no-op save, so the
//  builder can be tried without the database / migration. Nothing persists.
//  (A literal segment, so it takes precedence over the [pageId] route.)
// ============================================================================

import { StudioSandbox } from "@/components/builder/StudioSandbox";

export default function StudioSandboxPage() {
  return <StudioSandbox backHref="/portal/admin/site/studio" />;
}
