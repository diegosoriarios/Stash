import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  Divider,
  List,
  Portal,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';

import { clearAllItems } from '@/db/items';
import { addOption, getOptions, isOptionInUse, removeOption } from '@/db/options';
import { DEFAULT_NOTIFICATION_PREFS, getNotificationPrefs, setNotificationPrefs } from '@/db/settings';
import type { NotificationPrefs, OptionType } from '@/lib/types';
import { rescheduleAllNotifications } from '@/notifications/notifications';

function parseTime(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h ?? 9, m ?? 0, 0, 0);
  return date;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Add/remove list for a category or location option type. */
function ManageOptionsSection({
  title,
  singular,
  type,
}: {
  title: string;
  singular: string;
  type: OptionType;
}) {
  const db = useSQLiteContext();
  const [options, setOptions] = useState<string[]>([]);
  const [inUse, setInUse] = useState<Record<string, boolean>>({});
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const rows = await getOptions(db, type);
    setOptions(rows);
    const usage: Record<string, boolean> = {};
    for (const name of rows) {
      usage[name] = await isOptionInUse(db, type, name);
    }
    setInUse(usage);
  }, [db, type]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await addOption(db, type, trimmed);
    setNewName('');
    setAddVisible(false);
    reload();
  };

  const handleRemove = async (name: string) => {
    if (inUse[name]) {
      setSnackbar(`"${name}" is used by active items and can't be removed.`);
      return;
    }
    await removeOption(db, type, name);
    reload();
  };

  return (
    <>
      <List.Subheader>{title}</List.Subheader>
      <View style={styles.chipWrap}>
        {options.map((name) => (
          <Chip
            key={name}
            style={styles.chip}
            onClose={inUse[name] ? undefined : () => handleRemove(name)}
            onPress={inUse[name] ? () => handleRemove(name) : undefined}>
            {name}
          </Chip>
        ))}
        <Chip icon="plus" mode="outlined" style={styles.chip} onPress={() => setAddVisible(true)}>
          Add
        </Chip>
      </View>

      <Portal>
        <Dialog visible={addVisible} onDismiss={() => setAddVisible(false)}>
          <Dialog.Title>Add {singular}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Name"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleAdd}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddVisible(false)}>Cancel</Button>
            <Button onPress={handleAdd}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={3000}>
        {snackbar ?? ''}
      </Snackbar>
    </>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [clearVisible, setClearVisible] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getNotificationPrefs(db).then((loaded) => {
        if (active) setPrefs(loaded);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const updatePrefs = async (next: NotificationPrefs) => {
    setPrefs(next);
    await setNotificationPrefs(db, next);
    await rescheduleAllNotifications(db);
  };

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseTime(prefs.summaryTime),
        mode: 'time',
        is24Hour: true,
        onValueChange: (_event, date) => {
          if (date) updatePrefs({ ...prefs, summaryTime: formatTime(date) });
        },
      });
    } else {
      setTimePickerOpen((wasOpen) => !wasOpen);
    }
  };

  const handleClearAll = async () => {
    setClearVisible(false);
    await clearAllItems(db);
    await rescheduleAllNotifications(db);
    setSnackbar('All data has been cleared.');
  };

  return (
    <View style={styles.screen}>
      <ScrollView>
        <List.Section>
          <List.Subheader>Notifications</List.Subheader>
          <List.Item
            title="Remind 7 days before expiry"
            right={() => (
              <Switch value={prefs.remind7d} onValueChange={(v) => updatePrefs({ ...prefs, remind7d: v })} />
            )}
          />
          <List.Item
            title="Remind 3 days before expiry"
            right={() => (
              <Switch value={prefs.remind3d} onValueChange={(v) => updatePrefs({ ...prefs, remind3d: v })} />
            )}
          />
          <List.Item
            title="Remind 1 day before expiry"
            right={() => (
              <Switch value={prefs.remind1d} onValueChange={(v) => updatePrefs({ ...prefs, remind1d: v })} />
            )}
          />
          <Divider />
          <List.Item
            title="Daily summary"
            description='One notification per day: "You have X items expiring soon"'
            right={() => (
              <Switch
                value={prefs.summaryEnabled}
                onValueChange={(v) => updatePrefs({ ...prefs, summaryEnabled: v })}
              />
            )}
          />
          <Pressable onPress={openTimePicker} disabled={!prefs.summaryEnabled}>
            <List.Item
              title="Summary time"
              description={prefs.summaryTime}
              left={(props) => <List.Icon {...props} icon="clock-outline" />}
            />
          </Pressable>
          {timePickerOpen && Platform.OS === 'ios' ? (
            <DateTimePicker
              value={parseTime(prefs.summaryTime)}
              mode="time"
              display="spinner"
              is24Hour
              onValueChange={(_event, date) => {
                if (date) updatePrefs({ ...prefs, summaryTime: formatTime(date) });
              }}
            />
          ) : null}
        </List.Section>

        <Divider />

        <List.Section>
          <ManageOptionsSection title="Categories" singular="category" type="category" />
        </List.Section>

        <Divider />

        <List.Section>
          <ManageOptionsSection
            title="Storage locations"
            singular="storage location"
            type="location"
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Danger zone</List.Subheader>
          <View style={styles.dangerZone}>
            <Button mode="outlined" icon="delete-forever-outline" onPress={() => setClearVisible(true)}>
              Clear all data
            </Button>
            <Text variant="bodySmall" style={styles.dangerHint}>
              Deletes every food item. This cannot be undone.
            </Text>
          </View>
        </List.Section>
      </ScrollView>

      <Portal>
        <Dialog visible={clearVisible} onDismiss={() => setClearVisible(false)}>
          <Dialog.Title>Clear all data?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This permanently deletes all tracked food items and cancels their notifications.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearVisible(false)}>Cancel</Button>
            <Button onPress={handleClearAll}>Delete everything</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={3000}>
        {snackbar ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    alignSelf: 'flex-start',
  },
  dangerZone: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 8,
  },
  dangerHint: {
    opacity: 0.6,
  },
});
