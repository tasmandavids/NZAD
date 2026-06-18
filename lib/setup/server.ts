// ============================================================================
//  Server-side setup state — resilient when migration columns are missing.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportSource, SetupPath, SetupStepId } from "@/lib/setup/constants";
import { SETUP_STEPS } from "@/lib/setup/constants";

export type StudioSetupState = {
  name: string;
  setupCompletedAt: string | null;
  setupSnoozedAt: string | null;
  setupStep: SetupStepId | null;
  setupPath: SetupPath | null;
  importSource: ImportSource | null;
  locationCity: string | null;
  locationRegion: string | null;
  locationCountry: string | null;
  about: string | null;
  danceStyles: string[];
  /** False when 0031 columns are not applied yet */
  schemaReady: boolean;
};

const BASE_SELECT =
  "name, setup_completed_at, setup_path, import_source, location_city, location_region, location_country, about, dance_styles";

const EXTENDED_SELECT = `${BASE_SELECT}, setup_snoozed_at, setup_step`;

const LEGACY_SELECT = "name, created_at";

function isMissingColumnError(message: string): boolean {
  return /column .* does not exist/i.test(message);
}

function parseStep(raw: string | null | undefined): SetupStepId | null {
  if (!raw) return null;
  return SETUP_STEPS.some((s) => s.id === raw) ? (raw as SetupStepId) : null;
}

function mapStudioRow(
  d: Record<string, unknown>,
  schemaReady: boolean,
): StudioSetupState {
  return {
    name: d.name as string,
    setupCompletedAt: (d.setup_completed_at as string | null) ?? null,
    setupSnoozedAt: (d.setup_snoozed_at as string | null | undefined) ?? null,
    setupStep: parseStep(d.setup_step as string | null | undefined),
    setupPath: (d.setup_path as SetupPath | null) ?? null,
    importSource: (d.import_source as ImportSource | null) ?? null,
    locationCity: (d.location_city as string | null) ?? null,
    locationRegion: (d.location_region as string | null) ?? null,
    locationCountry: (d.location_country as string | null) ?? "New Zealand",
    about: (d.about as string | null) ?? null,
    danceStyles: Array.isArray(d.dance_styles) ? (d.dance_styles as string[]) : [],
    schemaReady,
  };
}

export async function fetchStudioSetupState(
  supabase: SupabaseClient,
  studioId: string,
): Promise<{ state: StudioSetupState | null; error: string | null }> {
  for (const select of [EXTENDED_SELECT, BASE_SELECT]) {
    const res = await supabase.from("studios").select(select).eq("id", studioId).single();
    if (!res.error && res.data) {
      return {
        state: mapStudioRow(res.data as unknown as Record<string, unknown>, true),
        error: null,
      };
    }
    if (res.error && !isMissingColumnError(res.error.message)) {
      return { state: null, error: res.error.message };
    }
  }

  const legacy = await supabase.from("studios").select(LEGACY_SELECT).eq("id", studioId).single();
  if (legacy.error || !legacy.data) {
    return { state: null, error: legacy.error?.message ?? "Studio not found" };
  }
  return {
    state: {
      name: legacy.data.name,
      setupCompletedAt: legacy.data.created_at ?? null,
      setupSnoozedAt: null,
      setupStep: null,
      setupPath: null,
      importSource: null,
      locationCity: null,
      locationRegion: null,
      locationCountry: "New Zealand",
      about: null,
      danceStyles: [],
      schemaReady: false,
    },
    error: null,
  };
}

export function setupBlocksPortal(state: StudioSetupState): boolean {
  if (!state.schemaReady) return false;
  if (state.setupCompletedAt) return false;
  if (state.setupSnoozedAt) return false;
  return true;
}

export function setupNeedsBanner(state: StudioSetupState): boolean {
  if (!state.schemaReady) return false;
  return !state.setupCompletedAt;
}
