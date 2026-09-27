export type Place = {
  id: string;
  name: string;
  visits: number;
  timeSpent: string;
  lastVisited: string;
  lat: number;
  lng: number;
  category: string;
};

// Illustrative Chicago history, deliberately separate from device records.
export const demoPlaces: Place[] = [
  { id: 'lakefront', name: 'Lakefront Trail', visits: 18, timeSpent: '23h 40m', lastVisited: 'Sep 21', lat: 41.9187, lng: -87.6297, category: 'Outdoors' },
  { id: 'coffee', name: 'Sawada Coffee', visits: 14, timeSpent: '11h 15m', lastVisited: 'Sep 17', lat: 41.8831, lng: -87.6489, category: 'Coffee' },
  { id: 'art', name: 'Art Institute of Chicago', visits: 5, timeSpent: '12h 10m', lastVisited: 'Aug 30', lat: 41.8796, lng: -87.6237, category: 'Culture' },
  { id: 'park', name: 'Humboldt Park', visits: 8, timeSpent: '15h 35m', lastVisited: 'Sep 12', lat: 41.9052, lng: -87.7011, category: 'Outdoors' },
  { id: 'bookshop', name: 'Myopic Books', visits: 6, timeSpent: '5h 20m', lastVisited: 'Aug 25', lat: 41.9097, lng: -87.6771, category: 'Shops' },
];

export const demoStatistics = {
  placesVisited: 23,
  daysTracked: 86,
  distanceKm: 318,
  mostVisitedPlace: 'Lakefront Trail',
  mostActiveDay: 'Saturday',
};

export const demoWrappedCards = [
  { id: 'places', kicker: 'YOUR YEAR IN PLACES', title: 'A whole lot of somewhere.', caption: 'Every little detour added up.', metric: '23 places', theme: 'purple' },
  { id: 'favorite', kicker: 'YOUR MOST-LOVED SPOT', title: 'The lake kept calling.', caption: 'Lakefront Trail was your favorite place to return to.', metric: '18 visits', theme: 'orange' },
  { id: 'day', kicker: 'YOUR KIND OF DAY', title: 'Saturdays, out there.', caption: 'Your most active day was made for going places.', metric: 'Saturday', theme: 'blue' },
] as const;