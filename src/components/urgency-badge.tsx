import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { URGENCY_COLORS } from '@/constants/urgency';
import type { Urgency } from '@/lib/types';

const LABELS: Record<Urgency, string> = {
  expired: 'Expired',
  soon: 'Expiring soon',
  ok: 'OK',
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <View style={[styles.badge, { backgroundColor: URGENCY_COLORS[urgency] }]}>
      <Text variant="labelMedium" style={styles.text}>
        {LABELS[urgency]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
