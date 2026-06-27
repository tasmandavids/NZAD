import type { Role } from "@/lib/types";
import { PortalShellClient } from "./PortalShellClient";
import type { ThemeBase } from "@/lib/types";

export function PortalShell({
  role,
  studioName,
  logoUrl = null,
  userName,
  showAffiliations = false,
  selfManagedStudent = false,
  portalTheme = "light",
  children,
}: {
  role: Role;
  studioName: string;
  logoUrl?: string | null;
  userName: string | null;
  showAffiliations?: boolean;
  selfManagedStudent?: boolean;
  portalTheme?: ThemeBase;
  children: React.ReactNode;
}) {
  return (
    <PortalShellClient
      role={role}
      studioName={studioName}
      logoUrl={logoUrl}
      userName={userName}
      showAffiliations={showAffiliations}
      selfManagedStudent={selfManagedStudent}
      portalTheme={portalTheme}
    >
      {children}
    </PortalShellClient>
  );
}
