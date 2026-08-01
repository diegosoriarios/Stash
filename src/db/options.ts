import type { SQLiteDatabase } from 'expo-sqlite';

import type { OptionType } from '@/lib/types';

export async function getOptions(db: SQLiteDatabase, type: OptionType): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    'SELECT name FROM options WHERE type = ? ORDER BY rowid',
    type,
  );
  return rows.map((r) => r.name);
}

export async function addOption(db: SQLiteDatabase, type: OptionType, name: string): Promise<void> {
  await db.runAsync('INSERT OR IGNORE INTO options (type, name) VALUES (?, ?)', type, name.trim());
}

export async function removeOption(
  db: SQLiteDatabase,
  type: OptionType,
  name: string,
): Promise<void> {
  await db.runAsync('DELETE FROM options WHERE type = ? AND name = ?', type, name);
}

/** True when at least one active item still references this option. */
export async function isOptionInUse(
  db: SQLiteDatabase,
  type: OptionType,
  name: string,
): Promise<boolean> {
  const column = type === 'category' ? 'category' : 'storage_location';
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM food_items WHERE status = 'active' AND ${column} = ?`,
    name,
  );
  return (row?.n ?? 0) > 0;
}
