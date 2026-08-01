import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Divider, FAB, Menu, Searchbar } from 'react-native-paper';

import { EmptyState } from '@/components/empty-state';
import { ItemRow } from '@/components/item-row';
import { getActiveItems } from '@/db/items';
import { getOptions } from '@/db/options';
import { daysUntilExpiry } from '@/lib/dates';
import type { FoodItem, Urgency } from '@/lib/types';

type StatusFilter = 'all' | Urgency;
type SortKey = 'expiry' | 'name' | 'category';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All statuses',
  expired: 'Expired',
  soon: 'Expiring soon',
  ok: 'OK',
};

const SORT_LABELS: Record<SortKey, string> = {
  expiry: 'Expiry date',
  name: 'Name',
  category: 'Category',
};

function statusOf(item: FoodItem): Urgency {
  const days = daysUntilExpiry(item.expiry_date);
  if (days < 0) return 'expired';
  if (days <= 7) return 'soon';
  return 'ok';
}

interface FilterMenuProps {
  label: string;
  options: string[];
  onSelect: (value: string) => void;
}

function FilterMenu({ label, options, onSelect }: FilterMenuProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchorPosition="bottom"
      anchor={
        <Button
          mode="outlined"
          compact
          icon="menu-down"
          contentStyle={styles.filterButtonContent}
          onPress={() => setVisible(true)}>
          {label}
        </Button>
      }>
      {options.map((option) => (
        <Menu.Item
          key={option}
          title={option}
          onPress={() => {
            onSelect(option);
            setVisible(false);
          }}
        />
      ))}
    </Menu>
  );
}

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('expiry');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getActiveItems(db), getOptions(db, 'category'), getOptions(db, 'location')]).then(
        ([rows, cats, locs]) => {
          if (!active) return;
          setItems(rows);
          setCategories(cats);
          setLocations(locs);
        },
      );
      return () => {
        active = false;
      };
    }, [db]),
  );

  const visible = items
    .filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (locationFilter && item.storage_location !== locationFilter) return false;
      if (statusFilter !== 'all' && statusOf(item) !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'category') return (a.category ?? '').localeCompare(b.category ?? '');
      return a.expiry_date.localeCompare(b.expiry_date);
    });

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <Searchbar
          placeholder="Search by name"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        <View style={styles.filterRow}>
          <FilterMenu
            label={categoryFilter ?? 'Category'}
            options={['All categories', ...categories]}
            onSelect={(v) => setCategoryFilter(v === 'All categories' ? null : v)}
          />
          <FilterMenu
            label={locationFilter ?? 'Location'}
            options={['All locations', ...locations]}
            onSelect={(v) => setLocationFilter(v === 'All locations' ? null : v)}
          />
          <FilterMenu
            label={STATUS_LABELS[statusFilter]}
            options={Object.values(STATUS_LABELS)}
            onSelect={(v) => {
              const key = (Object.keys(STATUS_LABELS) as StatusFilter[]).find(
                (k) => STATUS_LABELS[k] === v,
              );
              setStatusFilter(key ?? 'all');
            }}
          />
          <FilterMenu
            label={`Sort: ${SORT_LABELS[sortKey]}`}
            options={Object.values(SORT_LABELS)}
            onSelect={(v) => {
              const key = (Object.keys(SORT_LABELS) as SortKey[]).find(
                (k) => SORT_LABELS[k] === v,
              );
              setSortKey(key ?? 'expiry');
            }}
          />
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          <EmptyState
            icon={items.length === 0 ? 'fridge-outline' : 'magnify'}
            title={items.length === 0 ? 'No food tracked yet' : 'No items match your filters'}
            subtitle={items.length === 0 ? 'Tap + to add your first item.' : undefined}
          />
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            onPress={() =>
              router.push({ pathname: '/item/[id]', params: { id: String(item.id) } })
            }
          />
        )}
      />

      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/item/form')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  controls: {
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  search: {
    elevation: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButtonContent: {
    flexDirection: 'row-reverse',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
