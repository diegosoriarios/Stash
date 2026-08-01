import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, List, Portal, RadioButton, Snackbar, Text } from 'react-native-paper';

import { EmptyState } from '@/components/empty-state';
import { UrgencyBadge } from '@/components/urgency-badge';
import { decrementQuantity, getItem, setItemStatus } from '@/db/items';
import { expiryLabel, formatDate, urgencyOf } from '@/lib/dates';
import type { DiscardReason, FoodItem } from '@/lib/types';
import { rescheduleAllNotifications } from '@/notifications/notifications';

const DISCARD_REASONS: Array<{ value: DiscardReason; label: string }> = [
  { value: 'expired', label: 'Expired' },
  { value: 'spoiled', label: 'Spoiled' },
  { value: 'other', label: 'Other' },
];

export default function ItemDetailScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);

  const [item, setItem] = useState<FoodItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  const [discardReason, setDiscardReason] = useState<DiscardReason>('expired');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getItem(db, id).then((row) => {
        if (!active) return;
        setItem(row);
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  const removeAndExit = async (action: () => Promise<void>) => {
    await action();
    await rescheduleAllNotifications(db);
    router.back();
  };

  const handleDecrement = async () => {
    if (!item) return;
    const next = await decrementQuantity(db, item.id);
    setItem({ ...item, quantity: next });
    if (next === 0) {
      setSnackbar('Quantity is 0 — mark as consumed when finished.');
    }
  };

  if (!loaded) {
    return <View style={styles.screen} />;
  }

  if (!item || item.status !== 'active') {
    return (
      <View style={styles.screen}>
        <EmptyState icon="food-off-outline" title="This item is no longer in your stash" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.name}>
            {item.name}
          </Text>
          <UrgencyBadge urgency={urgencyOf(item.expiry_date)} />
        </View>

        <List.Item
          title={`${item.quantity} ${item.unit ?? 'units'}`}
          description="Quantity"
          left={(props) => <List.Icon {...props} icon="counter" />}
        />
        <Divider />
        <List.Item
          title={item.category ?? 'Not set'}
          description="Category"
          left={(props) => <List.Icon {...props} icon="tag-outline" />}
        />
        <Divider />
        <List.Item
          title={item.storage_location ?? 'Not set'}
          description="Storage location"
          left={(props) => <List.Icon {...props} icon="fridge-outline" />}
        />
        <Divider />
        <List.Item
          title={formatDate(item.purchase_date)}
          description="Purchase date"
          left={(props) => <List.Icon {...props} icon="cart-outline" />}
        />
        <Divider />
        <List.Item
          title={`${formatDate(item.expiry_date)} · ${expiryLabel(item.expiry_date)}`}
          description={item.expiry_type === 'use_by' ? 'Use by' : 'Best before'}
          left={(props) => <List.Icon {...props} icon="calendar-clock-outline" />}
        />
        <Divider />
        {item.barcode ? (
          <>
            <List.Item
              title={item.barcode}
              description="Barcode"
              left={(props) => <List.Icon {...props} icon="barcode" />}
            />
            <Divider />
          </>
        ) : null}
        {item.notes ? (
          <>
            <List.Item
              title={item.notes}
              description="Notes"
              titleNumberOfLines={5}
              left={(props) => <List.Icon {...props} icon="note-text-outline" />}
            />
            <Divider />
          </>
        ) : null}

        <View style={styles.actions}>
          <Button
            mode="outlined"
            icon="minus"
            onPress={handleDecrement}
            disabled={item.quantity <= 0}>
            Use one
          </Button>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => router.push({ pathname: '/item/form', params: { id: String(item.id) } })}>
            Edit
          </Button>
          <Button
            mode="contained"
            icon="check"
            onPress={() => removeAndExit(() => setItemStatus(db, item.id, 'consumed'))}>
            Consumed
          </Button>
          <Button
            mode="contained-tonal"
            icon="delete-outline"
            onPress={() => setDiscardVisible(true)}>
            Discard
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={discardVisible} onDismiss={() => setDiscardVisible(false)}>
          <Dialog.Title>Discard item</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Why are you discarding {item.name}?</Text>
            <RadioButton.Group
              value={discardReason}
              onValueChange={(value) => setDiscardReason(value as DiscardReason)}>
              {DISCARD_REASONS.map((reason) => (
                <RadioButton.Item
                  key={reason.value}
                  label={reason.label}
                  value={reason.value}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDiscardVisible(false)}>Cancel</Button>
            <Button
              onPress={() => {
                setDiscardVisible(false);
                removeAndExit(() => setItemStatus(db, item.id, 'discarded', discardReason));
              }}>
              Discard
            </Button>
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
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
  },
  name: {
    flex: 1,
    fontWeight: '700',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
});
