import type { SQLiteDatabase } from 'expo-sqlite';

import type { DiscardReason, FoodItem, FoodItemInput, ItemStatus } from '@/lib/types';

export async function getActiveItems(db: SQLiteDatabase): Promise<FoodItem[]> {
  return db.getAllAsync<FoodItem>("SELECT * FROM food_items WHERE status = 'active'");
}

export async function getItem(db: SQLiteDatabase, id: number): Promise<FoodItem | null> {
  return db.getFirstAsync<FoodItem>('SELECT * FROM food_items WHERE id = ?', id);
}

export async function createItem(db: SQLiteDatabase, input: FoodItemInput): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO food_items
       (name, category, quantity, unit, storage_location, purchase_date, expiry_date, expiry_type, barcode, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.name,
    input.category,
    input.quantity,
    input.unit,
    input.storage_location,
    input.purchase_date,
    input.expiry_date,
    input.expiry_type,
    input.barcode,
    input.notes,
    now,
    now,
  );
  return result.lastInsertRowId;
}

export async function updateItem(
  db: SQLiteDatabase,
  id: number,
  input: FoodItemInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE food_items SET
       name = ?, category = ?, quantity = ?, unit = ?, storage_location = ?,
       purchase_date = ?, expiry_date = ?, expiry_type = ?, barcode = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    input.name,
    input.category,
    input.quantity,
    input.unit,
    input.storage_location,
    input.purchase_date,
    input.expiry_date,
    input.expiry_type,
    input.barcode,
    input.notes,
    new Date().toISOString(),
    id,
  );
}

export async function setItemStatus(
  db: SQLiteDatabase,
  id: number,
  status: ItemStatus,
  discardReason: DiscardReason | null = null,
): Promise<void> {
  await db.runAsync(
    'UPDATE food_items SET status = ?, discard_reason = ?, updated_at = ? WHERE id = ?',
    status,
    discardReason,
    new Date().toISOString(),
    id,
  );
}

/** Decrements quantity by 1 (floored at 0). Returns the new quantity. */
export async function decrementQuantity(db: SQLiteDatabase, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ quantity: number }>(
    'SELECT quantity FROM food_items WHERE id = ?',
    id,
  );
  const next = Math.max(0, (row?.quantity ?? 1) - 1);
  await db.runAsync(
    'UPDATE food_items SET quantity = ?, updated_at = ? WHERE id = ?',
    next,
    new Date().toISOString(),
    id,
  );
  return next;
}

export async function clearAllItems(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM food_items');
}
