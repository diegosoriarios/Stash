import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'stash.db';

export const DEFAULT_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Fish',
  'Frozen',
  'Bakery',
  'Pantry',
  'Beverages',
  'Snacks',
  'Other',
];

export const DEFAULT_LOCATIONS = ['Fridge', 'Freezer', 'Pantry', 'Cabinet', 'Counter', 'Other'];

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const DATABASE_VERSION = 1;
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentDbVersion = row?.user_version ?? 0;
  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';

      CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        quantity REAL DEFAULT 1,
        unit TEXT,
        storage_location TEXT,
        purchase_date TEXT,
        expiry_date TEXT NOT NULL,
        expiry_type TEXT DEFAULT 'best_before',
        status TEXT DEFAULT 'active',
        discard_reason TEXT,
        barcode TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS options (
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        PRIMARY KEY (type, name)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    const seed = await db.prepareAsync('INSERT OR IGNORE INTO options (type, name) VALUES (?, ?)');
    try {
      for (const name of DEFAULT_CATEGORIES) {
        await seed.executeAsync(['category', name]);
      }
      for (const name of DEFAULT_LOCATIONS) {
        await seed.executeAsync(['location', name]);
      }
    } finally {
      await seed.finalizeAsync();
    }
  }

  // if (currentDbVersion === 1) { ...future migrations... }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
