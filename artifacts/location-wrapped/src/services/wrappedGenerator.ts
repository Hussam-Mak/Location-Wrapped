import type { Statistics } from './statisticsService';

export const demoWrappedCards = [
  { id: 'places', kicker: 'YOUR YEAR IN PLACES', title: 'A whole lot of somewhere.', caption: 'Every little detour added up.', metric: '23 places', theme: 'purple' },
  { id: 'favorite', kicker: 'YOUR MOST-LOVED SPOT', title: 'The lake kept calling.', caption: 'Lakefront Trail was your favorite place to return to.', metric: '18 visits', theme: 'orange' },
  { id: 'day', kicker: 'YOUR KIND OF DAY', title: 'Saturdays, out there.', caption: 'Your most active day was made for going places.', metric: 'Saturday', theme: 'blue' },
] as const;

export function generateWrapped(_statistics: Statistics | null) {
  return [];
}