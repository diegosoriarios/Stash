import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, SegmentedButtons, Snackbar, Text, TextInput } from 'react-native-paper';

import { DateField } from '@/components/date-field';
import { OptionPicker, PickerSpacer } from '@/components/option-picker';
import { createItem, getItem, updateItem } from '@/db/items';
import { getOptions } from '@/db/options';
import { toISODate } from '@/lib/dates';
import { lookupBarcode } from '@/lib/open-food-facts';
import { scanBus } from '@/lib/scan-bus';
import type { ExpiryType, FoodItemInput } from '@/lib/types';
import { rescheduleAllNotifications } from '@/notifications/notifications';

const UNITS = ['units', 'g', 'kg', 'ml', 'L', 'cups', 'slices', 'portions'];

export default function ItemFormScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('units');
  const [location, setLocation] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(new Date());
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [expiryType, setExpiryType] = useState<ExpiryType>('best_before');
  const [notes, setNotes] = useState('');
  const [barcode, setBarcode] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingItem, setLoadingItem] = useState(editId !== null);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Load dropdown options, and the existing item when editing.
  useEffect(() => {
    let active = true;
    getOptions(db, 'category').then((rows) => {
      if (active) setCategories(rows);
    });
    getOptions(db, 'location').then((rows) => {
      if (active) setLocations(rows);
    });
    if (editId !== null) {
      getItem(db, editId).then((item) => {
        if (!active) return;
        setLoadingItem(false);
        if (!item) return;
        setName(item.name);
        setCategory(item.category);
        setQuantity(String(item.quantity));
        setUnit(item.unit ?? 'units');
        setLocation(item.storage_location);
        setPurchaseDate(item.purchase_date ? new Date(`${item.purchase_date}T00:00:00`) : null);
        setExpiryDate(new Date(`${item.expiry_date}T00:00:00`));
        setExpiryType(item.expiry_type);
        setNotes(item.notes ?? '');
        setBarcode(item.barcode);
      });
    }
    return () => {
      active = false;
    };
  }, [db, editId]);

  // Receive barcodes from the scanner screen pushed on top of this form.
  useEffect(() => {
    scanBus.subscribe((scanned: string) => {
      setBarcode(scanned);
      setLookingUp(true);
      lookupBarcode(scanned).then((product) => {
        setLookingUp(false);
        if (product) {
          setName(product.name);
          setCategory((current) =>
            current && current !== product.category ? current : product.category,
          );
          setSnackbar(`Found: ${product.name}`);
        } else {
          setSnackbar('Product not found (or offline) — please enter details manually.');
        }
      });
    });
    return () => scanBus.unsubscribe();
  }, []);

  const save = async () => {
    if (!name.trim()) {
      setSnackbar('Name is required.');
      return;
    }
    if (!expiryDate) {
      setSnackbar('Expiry date is required.');
      return;
    }
    const parsedQuantity = parseFloat(quantity);
    const input: FoodItemInput = {
      name: name.trim(),
      category,
      quantity: Number.isFinite(parsedQuantity) && parsedQuantity >= 0 ? parsedQuantity : 1,
      unit,
      storage_location: location,
      purchase_date: purchaseDate ? toISODate(purchaseDate) : null,
      expiry_date: toISODate(expiryDate),
      expiry_type: expiryType,
      barcode,
      notes: notes.trim() ? notes.trim() : null,
    };
    setSaving(true);
    try {
      if (editId !== null) {
        await updateItem(db, editId, input);
      } else {
        await createItem(db, input);
      }
      await rescheduleAllNotifications(db);
      router.back();
    } catch (error) {
      console.warn('Failed to save item', error);
      setSnackbar('Could not save the item. Please try again.');
      setSaving(false);
    }
  };

  if (loadingItem) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: editId !== null ? 'Edit item' : 'Add item' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Button
          mode="outlined"
          icon="barcode-scan"
          onPress={() => router.push('/scanner')}
          disabled={lookingUp}>
          Scan barcode
        </Button>
        {lookingUp ? (
          <View style={styles.lookupRow}>
            <ActivityIndicator size="small" />
            <Text variant="bodySmall">Looking up product…</Text>
          </View>
        ) : null}
        {barcode ? (
          <Text variant="bodySmall" style={styles.barcode}>
            Barcode: {barcode}
          </Text>
        ) : null}

        <PickerSpacer />
        <TextInput
          mode="outlined"
          label="Name *"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <PickerSpacer />
        <OptionPicker
          label="Category"
          value={category}
          options={categories}
          onSelect={setCategory}
          placeholder="Select category"
        />

        <PickerSpacer />
        <View style={styles.quantityRow}>
          <View style={styles.quantityField}>
            <TextInput
              mode="outlined"
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.unitField}>
            <OptionPicker label="Unit" value={unit} options={UNITS} onSelect={setUnit} />
          </View>
        </View>

        <PickerSpacer />
        <OptionPicker
          label="Storage location"
          value={location}
          options={locations}
          onSelect={setLocation}
          placeholder="Select location"
        />

        <PickerSpacer />
        <DateField label="Purchase date (optional)" value={purchaseDate} onChange={setPurchaseDate} clearable />

        <PickerSpacer />
        <DateField label="Expiry date *" value={expiryDate} onChange={setExpiryDate} />

        <PickerSpacer />
        <SegmentedButtons
          value={expiryType}
          onValueChange={(value) => setExpiryType(value as ExpiryType)}
          buttons={[
            { value: 'best_before', label: 'Best before' },
            { value: 'use_by', label: 'Use by' },
          ]}
        />

        <PickerSpacer />
        <TextInput
          mode="outlined"
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <PickerSpacer />
        <Button mode="contained" onPress={save} loading={saving} disabled={saving || lookingUp}>
          {editId !== null ? 'Save changes' : 'Add item'}
        </Button>
      </ScrollView>

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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  barcode: {
    marginTop: 8,
    opacity: 0.6,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityField: {
    flex: 1,
  },
  unitField: {
    flex: 1,
  },
});
