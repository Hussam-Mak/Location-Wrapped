export type LocationRecord = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

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

// A self-contained sample year around Chicago. These are illustrative places,
// never mixed with the visitor's recorded coordinates.
export const demoPlaces: Place[] = [
  { id: 'lakefront', name: 'Lakefront Trail', visits: 18, timeSpent: '23h 40m', lastVisited: 'Sep 21', lat: 41.9187, lng: -87.6297, category: 'Outdoors' },
  { id: 'coffee', name: 'Sawada Coffee', visits: 14, timeSpent: '11h 15m', lastVisited: 'Sep 17', lat: 41.8831, lng: -87.6489, category: 'Coffee' },
  { id: 'art', name: 'Art Institute of Chicago', visits: 5, timeSpent: '12h 10m', lastVisited: 'Aug 30', lat: 41.8796, lng: -87.6237, category: 'Culture' },
  { id: 'park', name: 'Humboldt Park', visits: 8, timeSpent: '15h 35m', lastVisited: 'Sep 12', lat: 41.9052, lng: -87.7011, category: 'Outdoors' },
  { id: 'bookshop', name: 'Myopic Books', visits: 6, timeSpent: '5h 20m', lastVisited: 'Aug 25', lat: 41.9097, lng: -87.6771, category: 'Shops' },
];

const STORAGE_KEY = 'location-wrapped:v1';
export type StoredLocationState = {
  mode: 'new' | 'demo' | 'real';
  status: 'inactive' | 'requesting' | 'active' | 'paused' | 'denied' | 'unavailable';
  records: LocationRecord[];
  lastUpdate: number | null;
  error: string | null;
};

export const initialLocationState: StoredLocationState = {
  mode: 'new',
  status: 'inactive',
  records: [],
  lastUpdate: null,
  error: null,
};

export function loadLocationState(): StoredLocationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialLocationState;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return initialLocationState;
    const value = parsed as Partial<StoredLocationState>;
    if (!['new', 'demo', 'real'].includes(value.mode ?? '') ||
      !['inactive', 'active', 'paused', 'denied', 'unavailable'].includes(value.status ?? '') ||
      !Array.isArray(value.records)) return initialLocationState;
    const records = value.records.filter((r): r is LocationRecord =>
      r !== null && typeof r === 'object' &&
      typeof r.lat === 'number' && Number.isFinite(r.lat) && Math.abs(r.lat) <= 90 &&
      typeof r.lng === 'number' && Number.isFinite(r.lng) && Math.abs(r.lng) <= 180 &&
      typeof r.timestamp === 'number' && Number.isFinite(r.timestamp) &&
      typeof r.accuracy === 'number' && Number.isFinite(r.accuracy));
    return {
      mode: value.mode!,
      status: value.status!,
      records,
      lastUpdate: records.at(-1)?.timestamp ?? null,
      error: null,
    };
  } catch {
    return initialLocationState;
  }
}

export function saveLocationState(state: StoredLocationState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      status: state.status === 'requesting' ? 'inactive' : state.status,
      records: state.records,
    }));
  } catch {
    // Storage may be unavailable in private browsing; in-session state still works.
  }
}

export function deleteLocationState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // An inaccessible storage area cannot retain records from this session.
  }
}