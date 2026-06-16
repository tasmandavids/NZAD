// app/template.tsx
// Unlike layout.tsx, a template re-mounts on every navigation — which is
// exactly what replays the curtain wipe. Place this at app/ for site-wide
// transitions, or inside a route group (e.g. app/(marketing)/template.tsx)
// to scope it to just those routes.

import { PageTransition } from "@/components/transitions/PageTransition";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
