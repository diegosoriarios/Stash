export type ExpiryType = 'best_before' | 'use_by';
export type ItemStatus = 'active' | 'consumed' | 'discarded';
export type DiscardReason = 'expired' | 'spoiled' | 'other';
export type Urgency = 'expired' | 'soon' | 'ok';

export interface FoodItem {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  storage_location: string | null;
  purchase_date: string | null;
  expiry_date: string;
  expiry_type: ExpiryType;
  status: ItemStatus;
  discard_reason: string | null;
  barcode: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodItemInput {
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  storage_location: string | null;
  purchase_date: string | null;
  expiry_date: string;
  expiry_type: ExpiryType;
  barcode: string | null;
  notes: string | null;
}

export type OptionType = 'category' | 'location';

export interface NotificationPrefs {
  remind7d: boolean;
  remind3d: boolean;
  remind1d: boolean;
  summaryEnabled: boolean;
  /** "HH:MM" 24h */
  summaryTime: string;
}
