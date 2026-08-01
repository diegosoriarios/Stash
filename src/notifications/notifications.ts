import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getActiveItems } from '@/db/items';
import { getNotificationPrefs } from '@/db/settings';
import { daysUntilExpiry, EXPIRING_SOON_DAYS, formatDate, parseISODate } from '@/lib/dates';
import type { FoodItem, NotificationPrefs } from '@/lib/types';

const CHANNEL_ID = 'expiry-reminders';
const SUMMARY_IDENTIFIER = 'daily-summary';

// Required so notifications are presented while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Creates the Android channel (also what triggers the Android 13+ permission
 * prompt to appear) and requests notification permission. Safe to call on
 * every launch — both calls are idempotent.
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Expiry reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  await Notifications.requestPermissionsAsync();
}

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h ?? 9, minute: m ?? 0 };
}

/** Fire date for a "N days before expiry" reminder, at the user's summary time. Null if already past. */
function reminderDate(expiryISO: string, daysBefore: number, time: string): Date | null {
  const { hour, minute } = parseTime(time);
  const date = parseISODate(expiryISO);
  date.setDate(date.getDate() - daysBefore);
  date.setHours(hour, minute, 0, 0);
  return date.getTime() > Date.now() ? date : null;
}

async function scheduleItemReminders(item: FoodItem, prefs: NotificationPrefs): Promise<void> {
  const reminders: Array<{ days: number; enabled: boolean }> = [
    { days: 7, enabled: prefs.remind7d },
    { days: 3, enabled: prefs.remind3d },
    { days: 1, enabled: prefs.remind1d },
  ];
  for (const { days, enabled } of reminders) {
    if (!enabled) continue;
    const date = reminderDate(item.expiry_date, days, prefs.summaryTime);
    if (!date) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `item-${item.id}-${days}d`,
      content: {
        title: days === 1 ? 'Expiring tomorrow' : `Expiring in ${days} days`,
        body: `${item.name}${item.storage_location ? ` (${item.storage_location})` : ''} ${
          item.expiry_type === 'use_by' ? 'should be used by' : 'is best before'
        } ${formatDate(item.expiry_date)}.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: CHANNEL_ID,
      },
    });
  }
}

async function scheduleDailySummary(db: SQLiteDatabase, prefs: NotificationPrefs): Promise<void> {
  if (!prefs.summaryEnabled) return;
  const items = await getActiveItems(db);
  const count = items.filter((item) => {
    const days = daysUntilExpiry(item.expiry_date);
    return days >= 0 && days <= EXPIRING_SOON_DAYS;
  }).length;
  const { hour, minute } = parseTime(prefs.summaryTime);
  await Notifications.scheduleNotificationAsync({
    identifier: SUMMARY_IDENTIFIER,
    content: {
      title: 'Stash daily summary',
      body:
        count === 0
          ? 'Nothing is expiring in the next 7 days.'
          : `You have ${count} item${count === 1 ? '' : 's'} expiring in the next 7 days.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * Full rebuild of every scheduled notification from current DB state.
 * A repeating DAILY trigger can't have dynamic content, so the summary is
 * re-scheduled with a fresh count each time — call this after any inventory
 * or settings change, and when the app returns to the foreground.
 */
export async function rescheduleAllNotifications(db: SQLiteDatabase): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const prefs = await getNotificationPrefs(db);
    const items = await getActiveItems(db);
    for (const item of items) {
      await scheduleItemReminders(item, prefs);
    }
    await scheduleDailySummary(db, prefs);
  } catch (error) {
    console.warn('Failed to reschedule notifications', error);
  }
}
