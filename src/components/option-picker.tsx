import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu, TextInput } from 'react-native-paper';

interface Props {
  label: string;
  value: string | null;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

/** Read-only outlined field that opens a dropdown Menu of string options. */
export function OptionPicker({ label, value, options, onSelect, placeholder }: Props) {
  const [visible, setVisible] = useState(false);
  const open = () => setVisible(true);
  const close = () => setVisible(false);

  return (
    <Menu
      visible={visible}
      onDismiss={close}
      anchorPosition="bottom"
      anchor={
        <Pressable onPress={open}>
          <View pointerEvents="none">
            <TextInput
              mode="outlined"
              label={label}
              value={value ?? ''}
              placeholder={placeholder}
              editable={false}
              right={<TextInput.Icon icon="menu-down" />}
            />
          </View>
        </Pressable>
      }>
      {options.map((option) => (
        <Menu.Item
          key={option}
          title={option}
          onPress={() => {
            onSelect(option);
            close();
          }}
        />
      ))}
    </Menu>
  );
}

export function PickerSpacer() {
  return <View style={styles.spacer} />;
}

const styles = StyleSheet.create({
  spacer: {
    height: 12,
  },
});
