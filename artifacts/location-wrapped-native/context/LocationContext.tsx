import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppState, Linking, Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type LocationRecord = { lat: number; lng: number; accuracy: number; timestamp: number };
type Mode = 'new' | 'demo' | 'real';
type Status = 'inactive' | 'requesting' | 'active' | 'paused' | 'denied' | 'unavailable';
export type TrackingState = {
  mode: Mode;
  status: Status;
  records: LocationRecord[];
  lastUpdate: number | null;
  error: string | null;
  canAskAgain: boolean;
  ready: boolean;
};

type LocationContextValue = {
  state: TrackingState;
  requestAccess: () => Promise<boolean>;
  pause: () => void;
  resume: () => Promise<boolean>;
  clearHistory: () => Promise<void>;
  startDemo: () => void;
  openSettings: () => Promise<void>;
};

const STORAGE_KEY = 'location-wrapped-native:v1';
const initialState: TrackingState = {
  mode: 'new', status: 'inactive', records: [], lastUpdate: null,
  error: null, canAskAgain: true, ready: false,
};
const LocationContext = createContext<LocationContextValue | null>(null);

function readableError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('service') || message.includes('disabled')) return 'Location services are off. Turn them on in your device settings and try again.';
  return 'We could not read your location right now. Please check your device settings and try again.';
}

function sanitizeRecords(value: unknown): LocationRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is LocationRecord =>
    !!item && typeof item === 'object' &&
    Number.isFinite(item.lat) && Math.abs(item.lat) <= 90 &&
    Number.isFinite(item.lng) && Math.abs(item.lng) <= 180 &&
    Number.isFinite(item.timestamp) && Number.isFinite(item.accuracy)).slice(-1000);
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [permission, requestPermission, getPermission] = Location.useForegroundPermissions();
  const [state, setState] = useState<TrackingState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const generation = useRef(0);
  const appState = useRef(AppState.currentState);
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());

  const stopWatch = useCallback(() => {
    generation.current += 1;
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const record = useCallback((position: Location.LocationObject) => {
    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setState(previous => {
      if (previous.mode !== 'real' || previous.status === 'paused') return previous;
      if (previous.records.at(-1)?.timestamp === position.timestamp) return previous;
      const records = [...previous.records, { lat, lng, accuracy: accuracy ?? 0, timestamp: position.timestamp }].slice(-1000);
      return { ...previous, status: 'active', records, lastUpdate: position.timestamp, error: null };
    });
  }, []);

  const beginWatch = useCallback(async () => {
    stopWatch();
    if (Platform.OS === 'web' || appState.current !== 'active') return;
    const current = generation.current;
    try {
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 30_000, distanceInterval: 25 },
        position => { if (generation.current === current) record(position); },
        error => {
          if (generation.current !== current) return;
          stopWatch();
          setState(previous => ({ ...previous, status: 'inactive', error: readableError(error) }));
        },
      );
      if (generation.current !== current) watcher.remove();
      else watchRef.current = watcher;
    } catch (error) {
      if (generation.current !== current) return;
      setState(previous => ({ ...previous, status: 'inactive', error: readableError(error) }));
    }
  }, [record, stopWatch]);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!live) return;
      if (!raw) { setState(previous => ({ ...previous, ready: true })); return; }
      const saved: unknown = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') throw new Error('Invalid saved history');
      const item = saved as Partial<TrackingState>;
      const records = sanitizeRecords(item.records);
      setState({
        mode: item.mode === 'demo' || item.mode === 'real' ? item.mode : 'new',
        status: item.status === 'active' || item.status === 'paused' ? item.status : 'inactive',
        records,
        lastUpdate: records.at(-1)?.timestamp ?? null,
        error: null, canAskAgain: true, ready: true,
      });
    }).catch(() => {
      if (live) setState(previous => ({ ...previous, ready: true, error: 'Saved history could not be loaded on this device.' }));
    });
    return () => { live = false; stopWatch(); };
  }, [stopWatch]);

  useEffect(() => {
    if (!state.ready) return;
    const payload = JSON.stringify({ mode: state.mode, status: state.status === 'requesting' ? 'inactive' : state.status, records: state.records });
    writeQueue.current = writeQueue.current.catch(() => {}).then(() =>
      state.mode === 'new' && state.records.length === 0
        ? AsyncStorage.removeItem(STORAGE_KEY)
        : AsyncStorage.setItem(STORAGE_KEY, payload),
    ).catch(() => {
      setState(previous => previous.error === 'Could not save location history on this device.'
        ? previous : { ...previous, error: 'Could not save location history on this device.' });
    });
  }, [state.ready, state.mode, state.status, state.records]);

  useEffect(() => {
    if (!state.ready || state.mode !== 'real' || state.status !== 'active' || permission?.granted !== true) return;
    void beginWatch();
    return stopWatch;
  }, [state.ready, state.mode, state.status, permission?.granted, beginWatch, stopWatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      appState.current = next;
      if (next !== 'active') {
        stopWatch();
      } else if (stateRef.current.mode === 'real' && stateRef.current.status === 'active' && permission?.granted) {
        void beginWatch();
      }
    });
    return () => subscription.remove();
  }, [permission?.granted, beginWatch, stopWatch]);

  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setState(previous => ({ ...previous, status: 'unavailable', error: 'Location tracking is available in the iOS and Android app.' }));
      return false;
    }
    stopWatch();
    const current = generation.current;
    setState(previous => ({ ...previous, status: 'requesting', error: null }));
    try {
      const result = await requestPermission();
      if (generation.current !== current) return false;
      if (!result.granted) {
        setState(previous => ({
          ...previous, status: 'denied', canAskAgain: result.canAskAgain,
          error: result.canAskAgain
            ? 'Location access was not allowed. You can try again or explore the demo.'
            : 'Location access is off. Enable it in your device settings to begin.',
        }));
        return false;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setState(previous => ({ ...previous, status: 'unavailable', error: 'Location services are off. Turn them on in your device settings and try again.' }));
        return false;
      }
      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (generation.current !== current) return false;
      setState(previous => ({ ...previous, mode: 'real', status: 'active', canAskAgain: true, error: null }));
      record(first);
      return true;
    } catch (error) {
      if (generation.current === current) setState(previous => ({ ...previous, status: 'inactive', error: readableError(error) }));
      return false;
    }
  }, [record, requestPermission, stopWatch]);

  const pause = useCallback(() => {
    stopWatch();
    setState(previous => ({ ...previous, status: 'paused', error: null }));
  }, [stopWatch]);

  const resume = useCallback(async (): Promise<boolean> => {
    const latest = await getPermission();
    if (!latest.granted) return requestAccess();
    return requestAccess();
  }, [getPermission, requestAccess]);

  const startDemo = useCallback(() => {
    stopWatch();
    setState(previous => ({ ...previous, mode: 'demo', status: 'inactive', error: null }));
  }, [stopWatch]);

  const clearHistory = useCallback(async () => {
    stopWatch();
    writeQueue.current = writeQueue.current.catch(() => {}).then(() => AsyncStorage.removeItem(STORAGE_KEY));
    await writeQueue.current;
    setState({ ...initialState, ready: true });
  }, [stopWatch]);

  const openSettings = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Linking.openSettings(); }
      catch { setState(previous => ({ ...previous, error: 'Could not open settings. Open your device Settings and allow location for Location Wrapped.' })); }
    }
  }, []);

  return <LocationContext.Provider value={{ state, requestAccess, pause, resume, clearHistory, startDemo, openSettings }}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within LocationProvider');
  return context;
}