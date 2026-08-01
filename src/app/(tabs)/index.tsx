import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Divider, FAB, Text } from 'react-native-paper';

import { EmptyState } from '@/components/empty-state';
import { ItemRow } from '@/components/item-row';
import { URGENCY_COLORS } from '@/constants/urgency';
import { getActiveItems } from '@/db/items';
import { daysUntilExpiry, EXPIRING_SOON_DAYS } from '@/lib/dates';
import type { FoodItem } from '@/lib/types';

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <Card style={styles.statCard} mode="outlined">
      <Card.Content style={styles.statContent}>
        <Text variant="headlineMedium" style={[styles.statCount, { color }]}>
          {count}
        </Text>
        <Text variant="labelMedium" style={styles.statLabel}>
          {label}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<FoodItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getActiveItems(db).then((rows) => {
        if (active) setItems(rows);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const expiredCount = items.filter((i) => daysUntilExpiry(i.expiry_date) < 0).length;
  const in3DaysCount = items.filter((i) => {
    const d = daysUntilExpiry(i.expiry_date);
    return d >= 0 && d <= 3;
  }).length;
  const in7DaysCount = items.filter((i) => {
    const d = daysUntilExpiry(i.expiry_date);
    return d > 3 && d <= EXPIRING_SOON_DAYS;
  }).length;

  const urgent = items
    .filter((i) => daysUntilExpiry(i.expiry_date) <= EXPIRING_SOON_DAYS)
    .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))
    .slice(0, 10);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Expired" count={expiredCount} color={URGENCY_COLORS.expired} />
          <StatCard label="≤ 3 days" count={in3DaysCount} color={URGENCY_COLORS.soon} />
          <StatCard label="≤ 7 days" count={in7DaysCount} color={URGENCY_COLORS.ok} />
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Use these first
        </Text>

        {items.length === 0 ? (
          <EmptyState
            icon="fridge-outline"
            title="Your stash is empty"
            subtitle="Tap + to add your first item while unpacking groceries."
          />
        ) : urgent.length === 0 ? (
          <EmptyState icon="check-circle-outline" title="Nothing expiring in the next 7 days" />
        ) : (
          <Card mode="outlined">
            <Card.Content style={styles.listContent}>
              {urgent.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <ItemRow
                    item={item}
                    onPress={() =>
                      router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })
                    }
                  />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        label="Add item"
        style={styles.fab}
        onPress={() => router.push('/item/form')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 96,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    gap: 2,
  },
  statCount: {
    fontWeight: '700',
  },
  statLabel: {
    opacity: 0.7,
    textAlign: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
