import type { Role } from "@/lib/types";
import { PortalShellClient } from "./PortalShellClient";

export function PortalShell({
  role,
  studioName,
  logoUrl = null,
  userName,
  showAffiliations = false,
  children,
}: {
  role: Role;
  studioName: string;
  logoUrl?: string | null;
  userName: string | null;
  showAffiliations?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PortalShellClient
      role={role}
      studioName={studioName}
      logoUrl={logoUrl}
      userName={userName}
      showAffiliations={showAffiliations}
    >
      {children}
    </PortalShellClient>
  );
}
