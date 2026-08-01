import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import { scanBus } from '@/lib/scan-bus';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] as const;

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  if (!permission) {
    // Permission status still loading.
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text variant="titleMedium" style={styles.permissionText}>
          Camera access is needed to scan barcodes.
        </Text>
        <Button mode="contained" onPress={requestPermission}>
          Grant camera permission
        </Button>
        <Button mode="text" onPress={() => router.back()}>
          Enter manually instead
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                scanBus.emit(data);
                router.back();
              }
        }
      />

      <View style={styles.topBar}>
        <IconButton icon="close" iconColor="#FFFFFF" onPress={() => router.back()} />
        <IconButton
          icon={torch ? 'flashlight' : 'flashlight-off'}
          iconColor="#FFFFFF"
          onPress={() => setTorch((t) => !t)}
        />
      </View>

      <View style={styles.bottomBar}>
        <Text variant="bodyMedium" style={styles.hint}>
          Point the camera at a product barcode
        </Text>
        <Button mode="contained-tonal" onPress={() => router.back()}>
          Enter manually
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  permissionText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  hint: {
    color: '#FFFFFF',
  },
});
