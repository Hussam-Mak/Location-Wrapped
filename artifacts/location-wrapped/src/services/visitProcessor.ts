import type { LocationRecord } from './locationService';

// Wave 1 deliberately keeps raw readings distinct from inferred visits.
// Later processing can cluster dwell points into visits and known places.
export type Visit = {
  placeId: string;
  arrivedAt: number;
  departedAt: number;
};

export function formatCoordinates(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;
}

export function processVisits(_records: LocationRecord[]): Visit[] {
  return [];
}