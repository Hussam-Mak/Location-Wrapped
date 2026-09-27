import type { Visit } from './visitProcessor';

export const demoStatistics = {
  placesVisited: 23,
  daysTracked: 86,
  distanceKm: 318,
  mostVisitedPlace: 'Lakefront Trail',
  mostActiveDay: 'Saturday',
};

export type Statistics = typeof demoStatistics;

// No real statistics are claimed until visits have been inferred in a later wave.
export function calculateStatistics(_visits: Visit[]): Statistics | null {
  return null;
}