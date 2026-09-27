import type { RawLocation } from './visitProcessor';
import type { TrackingPreferences } from './locationStore';

// The browser preview is not a tracking target. Native history is never stored here.
export async function loadHistory(): Promise<{ preferences: TrackingPreferences; records: RawLocation[] }> {
  return { preferences: { mode: 'new', wantedActive: false, backgroundEnabled: false }, records: [] };
}
export async function savePreferences(_preferences: TrackingPreferences): Promise<void> {}
export async function insertLocation(_point: RawLocation): Promise<boolean> { return false; }
export async function deleteHistory(): Promise<void> {}