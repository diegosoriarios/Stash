import type { SQLiteDatabase } from 'expo-sqlite';

import type { NotificationPrefs } from '@/lib/types';

const PREFS_KEY = 'notification_prefs';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  remind7d: true,
  remind3d: true,
  remind1d: true,
  summaryEnabled: true,
  summaryTime: '09:00',
};

export async function getNotificationPrefs(db: SQLiteDatabase): Promise<NotificationPrefs> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    PREFS_KEY,
  );
  if (!row?.value) {
    return DEFAULT_NOTIFICATION_PREFS;
  }
  try {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...(JSON.parse(row.value) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export async function setNotificationPrefs(
  db: SQLiteDatabase,
  prefs: NotificationPrefs,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    PREFS_KEY,
    JSON.stringify(prefs),
  );
}
