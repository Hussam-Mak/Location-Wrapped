import type { LocationRecord } from '@/context/LocationContext';

// Processing boundaries for the next wave; no place inference is claimed in Wave 1.
export type Visit = { placeId: string; arrivedAt: number; departedAt: number };

export function formatCoordinates(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;
}

export function processVisits(_records: LocationRecord[]): Visit[] {
  return [];
}