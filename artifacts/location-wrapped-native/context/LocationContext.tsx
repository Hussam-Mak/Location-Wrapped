import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, Linking, Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { BACKGROUND_LOCATION_TASK } from '@/services/backgroundLocationTask';
import { deleteHistory, insertLocation, loadHistory, savePreferences, type TrackingPreferences } from '@/services/locationStore';
import { processPlaces, processVisits, type ProcessedPlace, type RawLocation, type Visit } from '@/services/visitProcessor';
import { calculateStatistics, type Statistics } from '@/services/statisticsService';

export type LocationRecord = RawLocation;
type Mode = 'new' | 'demo' | 'real';
type Status = 'inactive' | 'requesting' | 'active' | 'paused' | 'denied' | 'unavailable';
export type TrackingState = {
  mode: Mode;
  status: Status;
  records: RawLocation[];
  visits: Visit[];
  places: ProcessedPlace[];
  statistics: Statistics;
  lastUpdate: number | null;
  error: string | null;
  canAskAgain: boolean;
  ready: boolean;
  backgroundEnabled: boolean;
  backgroundAvailable: boolean;
};

type LocationContextValue = {
  state: TrackingState;
  requestAccess: () => Promise<boolean>;
  pause: () => Promise<void>;
  resume: () => Promise<boolean>;
  clearHistory: () => Promise<void>;
  startDemo: () => void;
  openSettings: () => Promise<void>;
  enableBackground: () => Promise<boolean>;
  disableBackground: () => Promise<void>;
};

function derive(records: RawLocation[]) {
  const visits = processVisits(records);
  const places = processPlaces(visits);
  return { records, visits, places, statistics: calculateStatistics(records, visits, places), lastUpdate: records.at(-1)?.timestamp ?? null };
}

const emptyData = derive([]);
const initialState: TrackingState = {
  mode: 'new', status: 'inactive', ...emptyData, error: null,
  canAskAgain: true, ready: false, backgroundEnabled: false, backgroundAvailable: false,
};
const LocationContext = createContext<LocationContextValue | null>(null);

function readableError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('service') || message.includes('disabled')) return 'Location services are off. Turn them on in device Settings and try again.';
  return 'Location tracking could not start. Check device Settings and try again.';
}

const taskOptions: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 120_000,
  distanceInterval: 50,
  deferredUpdatesInterval: 120_000,
  deferredUpdatesDistance: 100,
  pausesUpdatesAutomatically: true,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Location Wrapped is tracking',
    notificationBody: 'Tracking your places in the background. Pause anytime in Profile.',
  },
};

export function LocationProvider({ children }: { children: ReactNode }) {
  const [, requestForeground] = Location.useForegroundPermissions();
  const [state, setState] = useState<TrackingState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const watch = useRef<Location.LocationSubscription | null>(null);
  const generation = useRef(0);
  const appState = useRef(AppState.currentState);

  const stopForeground = useCallback(() => {
    generation.current++;
    watch.current?.remove();
    watch.current = null;
  }, []);

  const stopBackground = useCallback(async () => {
    if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) return;
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  }, []);

  const refreshRecords = useCallback(async () => {
    const { records } = await loadHistory();
    setState(previous => ({ ...previous, ...derive(records) }));
  }, []);

  const startForeground = useCallback(async (): Promise<boolean> => {
    stopForeground();
    if (Platform.OS === 'web' || appState.current !== 'active') return false;
    const current = generation.current;
    try {
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 60_000, distanceInterval: 35 },
        position => {
          if (generation.current !== current) return;
          const point = {
            lat: position.coords.latitude, lng: position.coords.longitude,
            timestamp: position.timestamp, accuracy: position.coords.accuracy ?? Infinity,
          };
          void insertLocation(point).then(inserted => {
            if (inserted) return refreshRecords();
          }).catch(error => {
            stopForeground();
            void savePreferences({ mode: 'real', wantedActive: false, backgroundEnabled: false });
            setState(previous => ({ ...previous, status: 'inactive', error: `Location history could not be saved. ${readableError(error)}` }));
          });
        },
        error => {
          if (generation.current !== current) return;
          stopForeground();
          setState(previous => ({ ...previous, status: 'inactive', error: readableError(error) }));
        },
      );
      if (generation.current !== current) { subscription.remove(); return false; }
      watch.current = subscription;
      setState(previous => ({ ...previous, status: 'active', error: null }));
      return true;
    } catch (error) {
      if (generation.current === current) setState(previous => ({ ...previous, status: 'inactive', error: readableError(error) }));
      return false;
    }
  }, [refreshRecords, stopForeground]);

  const startBackground = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) return false;
    try {
      if (!(await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK))) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, taskOptions);
      }
      stopForeground();
      setState(previous => ({ ...previous, status: 'active', error: null, backgroundEnabled: true }));
      return true;
    } catch (error) {
      setState(previous => ({ ...previous, backgroundAvailable: false, error: `Background tracking could not start on this build. ${readableError(error)}` }));
      return false;
    }
  }, [stopForeground]);

  const reconcile = useCallback(async () => {
    if (Platform.OS === 'web') {
      const stored = await loadHistory();
      setState(previous => ({ ...previous, ...derive(stored.records), mode: stored.preferences.mode, ready: true, backgroundAvailable: false }));
      return;
    }
    const stored = await loadHistory();
    const available = await TaskManager.isAvailableAsync();
    const permission = await Location.getForegroundPermissionsAsync();
    const servicesOn = await Location.hasServicesEnabledAsync();
    const prefs = stored.preferences;
    const common = {
      ...derive(stored.records), mode: prefs.mode, ready: true,
      backgroundEnabled: prefs.backgroundEnabled, backgroundAvailable: available,
      canAskAgain: permission.canAskAgain,
    };
    if (!prefs.wantedActive || prefs.mode !== 'real') {
      stopForeground();
      await stopBackground();
      setState(previous => ({ ...previous, ...common, status: prefs.mode === 'real' && previous.status === 'paused' ? 'paused' : prefs.mode === 'real' ? 'paused' : 'inactive', error: null }));
      return;
    }
    if (!permission.granted || !servicesOn) {
      stopForeground();
      await stopBackground();
      await savePreferences({ ...prefs, wantedActive: false, backgroundEnabled: false });
      setState(previous => ({
        ...previous, ...common, backgroundEnabled: false, status: !permission.granted ? 'denied' : 'unavailable',
        error: !permission.granted ? 'Location permission was revoked. Enable it in Settings to resume.' : 'Location services are off. Turn them on in Settings to resume.',
      }));
      return;
    }
    setState(previous => ({ ...previous, ...common, status: 'requesting', error: null }));
    if (prefs.backgroundEnabled) {
      const backgroundPermission = await Location.getBackgroundPermissionsAsync();
      if (available && backgroundPermission.granted && await startBackground()) return;
      await stopBackground();
      await savePreferences({ ...prefs, backgroundEnabled: false });
      setState(previous => ({
        ...previous, backgroundEnabled: false,
        error: 'Background access is unavailable or was revoked. Foreground tracking can continue while the app is open.',
      }));
    }
    await startForeground();
  }, [startBackground, startForeground, stopBackground, stopForeground]);

  useEffect(() => {
    let alive = true;
    void reconcile().catch(() => {
      if (alive) setState(previous => ({ ...previous, ready: true, status: 'unavailable', error: 'Saved location history could not be opened.' }));
    });
    const listener = AppState.addEventListener('change', next => {
      appState.current = next;
      if (next !== 'active') {
        stopForeground();
        if (!stateRef.current.backgroundEnabled && stateRef.current.status === 'active') {
          setState(previous => ({ ...previous, status: 'inactive' }));
        }
      } else {
        void reconcile().catch(() => {
          setState(previous => ({ ...previous, status: 'unavailable', error: 'Location status could not be verified.' }));
        });
      }
    });
    return () => { alive = false; listener.remove(); stopForeground(); };
  }, [reconcile, stopForeground]);

  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setState(previous => ({ ...previous, status: 'unavailable', error: 'Tracking is available in the iOS and Android app.' }));
      return false;
    }
    stopForeground();
    setState(previous => ({ ...previous, status: 'requesting', error: null }));
    try {
      const permission = await requestForeground();
      if (!permission.granted) {
        setState(previous => ({
          ...previous, status: 'denied', canAskAgain: permission.canAskAgain,
          error: permission.canAskAgain ? 'Location access was denied. Try again or explore the demo.' : 'Enable location access in Settings to start tracking.',
        }));
        return false;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setState(previous => ({ ...previous, status: 'unavailable', error: 'Location services are off. Turn them on in Settings.' }));
        return false;
      }
      const backgroundEnabled = stateRef.current.backgroundEnabled;
      await savePreferences({ mode: 'real', wantedActive: true, backgroundEnabled });
      setState(previous => ({ ...previous, mode: 'real', canAskAgain: true }));
      if (backgroundEnabled && await startBackground()) return true;
      if (backgroundEnabled) {
        await savePreferences({ mode: 'real', wantedActive: true, backgroundEnabled: false });
        setState(previous => ({ ...previous, backgroundEnabled: false }));
      }
      return startForeground();
    } catch (error) {
      setState(previous => ({ ...previous, status: 'inactive', error: readableError(error) }));
      return false;
    }
  }, [requestForeground, startBackground, startForeground, stopForeground]);

  const pause = useCallback(async () => {
    stopForeground();
    setState(previous => ({ ...previous, status: 'paused', error: null }));
    try {
      await savePreferences({ mode: 'real', wantedActive: false, backgroundEnabled: stateRef.current.backgroundEnabled });
      await stopBackground();
    } catch {
      setState(previous => ({ ...previous, status: 'unavailable', error: 'Tracking could not be paused safely. Check device Settings.' }));
    }
  }, [stopBackground, stopForeground]);

  const resume = useCallback(async () => requestAccess(), [requestAccess]);

  const enableBackground = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) {
      setState(previous => ({ ...previous, backgroundAvailable: false, error: 'Background tracking needs a development build; Expo Go does not support it.' }));
      return false;
    }
    const foreground = await Location.getForegroundPermissionsAsync();
    if (!foreground.granted) {
      setState(previous => ({ ...previous, status: 'denied', canAskAgain: foreground.canAskAgain, error: 'Allow location access before enabling background tracking.' }));
      return false;
    }
    try {
      const background = await Location.requestBackgroundPermissionsAsync();
      if (!background.granted) {
        setState(previous => ({ ...previous, error: 'Background access was not allowed. Foreground tracking remains available; enable Always access in Settings to try again.' }));
        return false;
      }
      if (!(await startBackground())) return false;
      await savePreferences({ mode: 'real', wantedActive: true, backgroundEnabled: true });
      setState(previous => ({ ...previous, backgroundEnabled: true, status: 'active', error: null }));
      return true;
    } catch (error) {
      await stopBackground();
      setState(previous => ({ ...previous, backgroundEnabled: false, error: readableError(error) }));
      await startForeground();
      return false;
    }
  }, [startBackground, startForeground, stopBackground]);

  const disableBackground = useCallback(async () => {
    await stopBackground();
    await savePreferences({ mode: 'real', wantedActive: stateRef.current.status === 'active', backgroundEnabled: false });
    setState(previous => ({ ...previous, backgroundEnabled: false, error: null }));
    if (stateRef.current.status === 'active') await startForeground();
  }, [startForeground, stopBackground]);

  const startDemo = useCallback(() => {
    stopForeground();
    void stopBackground().then(() => savePreferences({ mode: 'demo', wantedActive: false, backgroundEnabled: false }))
      .then(() => setState(previous => ({ ...previous, mode: 'demo', status: 'inactive', backgroundEnabled: false, error: null })))
      .catch(() => setState(previous => ({ ...previous, status: 'unavailable', error: 'Demo preferences could not be saved.' })));
  }, [stopBackground, stopForeground]);

  const clearHistory = useCallback(async () => {
    stopForeground();
    setState(previous => ({ ...previous, status: 'paused' }));
    await savePreferences({ mode: stateRef.current.mode, wantedActive: false, backgroundEnabled: false });
    await stopBackground();
    await deleteHistory();
    setState({ ...initialState, ready: true, backgroundAvailable: Platform.OS !== 'web' && await TaskManager.isAvailableAsync() });
  }, [stopBackground, stopForeground]);

  const openSettings = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Linking.openSettings(); }
      catch { setState(previous => ({ ...previous, error: 'Open device Settings and allow location for Location Wrapped.' })); }
    }
  }, []);

  return <LocationContext.Provider value={{ state, requestAccess, pause, resume, clearHistory, startDemo, openSettings, enableBackground, disableBackground }}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) throw new Error('useLocation must be used within LocationProvider');
  return context;
}