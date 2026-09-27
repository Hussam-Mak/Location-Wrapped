import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteLocationState,
  initialLocationState,
  loadLocationState,
  saveLocationState,
  type StoredLocationState,
} from './locationService';

export type TrackingState = StoredLocationState;

const options: PositionOptions = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 };

function friendlyError(error: GeolocationPositionError): string {
  if (error.code === 1) return 'Location access is off. You can enable it in your browser’s site settings, then try again.';
  if (error.code === 2) return 'Your location isn’t available right now. Check your device’s location settings and try again.';
  return 'Finding your location took too long. Please try again.';
}

export function useLocationTracker() {
  const [state, setState] = useState<TrackingState>(loadLocationState);
  const watchId = useRef<number | null>(null);
  const generation = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const stopWatch = useCallback(() => {
    generation.current++;
    if (watchId.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const record = useCallback((position: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, accuracy } = position.coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setState(previous => {
      if (previous.mode !== 'real' || previous.status === 'paused') return previous;
      if (previous.records.at(-1)?.timestamp === position.timestamp) return previous;
      const records = [...previous.records, { lat, lng, accuracy, timestamp: position.timestamp }].slice(-1000);
      return { ...previous, status: 'active', error: null, records, lastUpdate: position.timestamp };
    });
  }, []);

  const beginWatch = useCallback(() => {
    stopWatch();
    if (!('geolocation' in navigator)) {
      setState(previous => ({ ...previous, status: 'unavailable', error: 'This browser does not support location access.' }));
      return;
    }
    const currentGeneration = generation.current;
    watchId.current = navigator.geolocation.watchPosition(
      position => {
        if (generation.current === currentGeneration) record(position);
      },
      error => {
        if (generation.current !== currentGeneration) return;
        stopWatch();
        setState(previous => ({ ...previous, status: error.code === 1 ? 'denied' : 'inactive', error: friendlyError(error) }));
      },
      options,
    );
  }, [record, stopWatch]);

  useEffect(() => {
    if (stateRef.current.mode === 'real' && stateRef.current.status === 'active') beginWatch();
    return () => stopWatch();
  }, [beginWatch, stopWatch]);

  useEffect(() => {
    if (state.mode === 'new' && state.records.length === 0 && state.status === 'inactive') {
      deleteLocationState();
    } else {
      saveLocationState(state);
    }
  }, [state]);

  const requestAccess = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState(previous => ({ ...previous, status: 'unavailable', error: 'This browser does not support location access.' }));
      return;
    }
    stopWatch();
    setState(previous => ({ ...previous, status: 'requesting', error: null }));
    const currentGeneration = generation.current;
    navigator.geolocation.getCurrentPosition(
      position => {
        if (generation.current !== currentGeneration) return;
        setState(previous => ({ ...previous, mode: 'real', status: 'active', error: null }));
        record(position);
        beginWatch();
      },
      error => {
        if (generation.current !== currentGeneration) return;
        setState(previous => ({ ...previous, status: error.code === 1 ? 'denied' : 'inactive', error: friendlyError(error) }));
      },
      options,
    );
  }, [beginWatch, record, stopWatch]);

  const pause = useCallback(() => {
    stopWatch();
    setState(previous => ({ ...previous, status: 'paused', error: null }));
  }, [stopWatch]);
  const resume = useCallback(() => {
    if (stateRef.current.mode === 'real') {
      setState(previous => ({ ...previous, status: 'requesting', error: null }));
      requestAccess();
    } else {
      setState(previous => ({ ...previous, status: 'inactive', error: null }));
    }
  }, [requestAccess]);
  const startDemo = useCallback(() => {
    stopWatch();
    setState(previous => ({ ...previous, mode: 'demo', status: 'inactive', error: null }));
  }, [stopWatch]);
  const clearHistory = useCallback(() => {
    stopWatch();
    deleteLocationState();
    setState(initialLocationState);
  }, [stopWatch]);
  return { state, requestAccess, pause, resume, clearHistory, startDemo };
}