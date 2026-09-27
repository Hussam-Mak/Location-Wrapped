import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { filterLocationPoint, type RawLocation } from './visitProcessor';

export type TrackingPreferences = {
  mode: 'new' | 'demo' | 'real';
  wantedActive: boolean;
  backgroundEnabled: boolean;
};

const previousStorageKey = 'location-wrapped-native:v1';
const initialPreferences: TrackingPreferences = { mode: 'new', wantedActive: false, backgroundEnabled: false };
type PointRow = { latitude: number; longitude: number; timestamp: number; accuracy: number };
type PreferenceRow = { mode: string; wanted_active: number; background_enabled: number };

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

async function database(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync('location-wrapped.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS raw_points (
          timestamp INTEGER PRIMARY KEY NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          accuracy REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tracking_preferences (
          id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
          mode TEXT NOT NULL,
          wanted_active INTEGER NOT NULL,
          background_enabled INTEGER NOT NULL
        );
      `);
      return db;
    })().catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function validPoint(item: unknown): item is RawLocation {
  if (!item || typeof item !== 'object') return false;
  const point = item as Partial<RawLocation>;
  return typeof point.lat === 'number' && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90
    && typeof point.lng === 'number' && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180
    && typeof point.timestamp === 'number' && Number.isFinite(point.timestamp)
    && typeof point.accuracy === 'number' && Number.isFinite(point.accuracy);
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.catch(() => {}).then(operation);
  writeQueue = next;
  return next;
}

async function migrateEarlierStorage(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<PreferenceRow>('SELECT mode, wanted_active, background_enabled FROM tracking_preferences WHERE id = 1');
  if (existing) return;
  const old = await AsyncStorage.getItem(previousStorageKey);
  let preferences = initialPreferences;
  let points: RawLocation[] = [];
  if (old) {
    try {
      const parsed = JSON.parse(old) as { mode?: string; status?: string; records?: unknown };
      preferences = {
        mode: parsed.mode === 'real' || parsed.mode === 'demo' ? parsed.mode : 'new',
        wantedActive: parsed.mode === 'real' && parsed.status === 'active',
        backgroundEnabled: false,
      };
      points = Array.isArray(parsed.records) ? parsed.records.filter(validPoint) : [];
    } catch {
      // Malformed old preferences cannot be trusted; the new database remains intact.
    }
  }
  await db.withExclusiveTransactionAsync(async transaction => {
    for (const point of points) {
      await transaction.runAsync(
        'INSERT OR IGNORE INTO raw_points (latitude, longitude, timestamp, accuracy) VALUES (?, ?, ?, ?)',
        point.lat, point.lng, point.timestamp, point.accuracy,
      );
    }
    await transaction.runAsync(
      'INSERT OR IGNORE INTO tracking_preferences (id, mode, wanted_active, background_enabled) VALUES (1, ?, ?, ?)',
      preferences.mode, Number(preferences.wantedActive), Number(preferences.backgroundEnabled),
    );
  });
  if (old) await AsyncStorage.removeItem(previousStorageKey);
}

export async function loadHistory(): Promise<{ preferences: TrackingPreferences; records: RawLocation[] }> {
  await writeQueue.catch(() => {});
  const db = await database();
  await migrateEarlierStorage(db);
  const [row, points] = await Promise.all([
    db.getFirstAsync<PreferenceRow>('SELECT mode, wanted_active, background_enabled FROM tracking_preferences WHERE id = 1'),
    db.getAllAsync<PointRow>('SELECT latitude, longitude, timestamp, accuracy FROM raw_points ORDER BY timestamp ASC'),
  ]);
  return {
    preferences: {
      mode: row?.mode === 'real' || row?.mode === 'demo' ? row.mode : 'new',
      wantedActive: row?.wanted_active === 1,
      backgroundEnabled: row?.background_enabled === 1,
    },
    records: points.map(point => ({
      lat: point.latitude, lng: point.longitude, timestamp: point.timestamp, accuracy: point.accuracy,
    })),
  };
}

export function savePreferences(preferences: TrackingPreferences): Promise<void> {
  return serialize(async () => {
    const db = await database();
    await db.runAsync(
      `INSERT INTO tracking_preferences (id, mode, wanted_active, background_enabled)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET mode=excluded.mode, wanted_active=excluded.wanted_active, background_enabled=excluded.background_enabled`,
      preferences.mode, Number(preferences.wantedActive), Number(preferences.backgroundEnabled),
    );
  });
}

export function insertLocation(point: RawLocation): Promise<boolean> {
  return serialize(async () => {
    const db = await database();
    let inserted = false;
    await db.withExclusiveTransactionAsync(async transaction => {
      const tracking = await transaction.getFirstAsync<PreferenceRow>(
        'SELECT mode, wanted_active, background_enabled FROM tracking_preferences WHERE id = 1',
      );
      if (tracking?.mode !== 'real' || tracking.wanted_active !== 1) return;
      const row = await transaction.getFirstAsync<PointRow>(
        'SELECT latitude, longitude, timestamp, accuracy FROM raw_points ORDER BY timestamp DESC LIMIT 1',
      );
      const previous = row ? { lat: row.latitude, lng: row.longitude, timestamp: row.timestamp, accuracy: row.accuracy } : null;
      if (!filterLocationPoint(previous, point)) return;
      const result = await transaction.runAsync(
        'INSERT OR IGNORE INTO raw_points (latitude, longitude, timestamp, accuracy) VALUES (?, ?, ?, ?)',
        point.lat, point.lng, point.timestamp, point.accuracy,
      );
      inserted = result.changes > 0;
    });
    return inserted;
  });
}

export function deleteHistory(): Promise<void> {
  return serialize(async () => {
    const db = await database();
    await AsyncStorage.removeItem(previousStorageKey);
    await db.withExclusiveTransactionAsync(async transaction => {
      await transaction.runAsync('DELETE FROM raw_points');
      await transaction.runAsync('DELETE FROM tracking_preferences');
    });
  });
}