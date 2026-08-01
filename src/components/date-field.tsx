import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  clearable?: boolean;
}

/**
 * Cross-platform date field: system dialog on Android, inline spinner on iOS.
 * `null` value renders as "Not set" (used for the nullable purchase date).
 */
export function DateField({ label, value, onChange, clearable = false }: Props) {
  const [iosOpen, setIosOpen] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode: 'date',
        onValueChange: (_event, date) => {
          if (date) onChange(date);
        },
      });
    } else {
      setIosOpen((wasOpen) => !wasOpen);
    }
  };

  return (
    <View>
      <Pressable onPress={open}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={
              value
                ? value.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : ''
            }
            placeholder="Not set"
            editable={false}
            right={<TextInput.Icon icon="calendar" />}
          />
        </View>
      </Pressable>
      {clearable && value ? (
        <Button compact mode="text" onPress={() => onChange(null)} style={styles.clear}>
          Clear date
        </Button>
      ) : null}
      {iosOpen && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="spinner"
          onValueChange={(_event, date) => {
            if (date) onChange(date);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clear: {
    alignSelf: 'flex-start',
  },
});
