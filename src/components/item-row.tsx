import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { URGENCY_COLORS } from '@/constants/urgency';
import { expiryLabel, urgencyOf } from '@/lib/dates';
import type { FoodItem } from '@/lib/types';

interface Props {
  item: FoodItem;
  onPress?: () => void;
}

export function ItemRow({ item, onPress }: Props) {
  const urgency = urgencyOf(item.expiry_date);
  const color = URGENCY_COLORS[urgency];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.body}>
        <Text variant="titleMedium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>
          {item.quantity} {item.unit ?? 'units'}
          {item.storage_location ? ` · ${item.storage_location}` : ''}
          {item.category ? ` · ${item.category}` : ''}
        </Text>
      </View>
      <Text variant="bodySmall" style={[styles.expiry, { color }]}>
        {expiryLabel(item.expiry_date)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 12,
    gap: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  stripe: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  meta: {
    opacity: 0.6,
  },
  expiry: {
    fontWeight: '600',
  },
});
