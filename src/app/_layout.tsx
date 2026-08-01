import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/database';
import { initNotifications, rescheduleAllNotifications } from '@/notifications/notifications';

SplashScreen.preventAutoHideAsync();

const lightTheme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: '#208AEF' },
};
const darkTheme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, primary: '#208AEF' },
};

/**
 * Registers notification permissions/channels and keeps scheduled
 * notifications in sync with the DB on launch and every foregrounding.
 */
function NotificationBootstrap() {
  const db = useSQLiteContext();
  useEffect(() => {
    initNotifications()
      .then(() => rescheduleAllNotifications(db))
      .catch((error) => console.warn('Notification setup failed', error));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        rescheduleAllNotifications(db);
      }
    });
    return () => subscription.remove();
  }, [db]);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <PaperProvider
        theme={paperTheme}
        settings={{
          // Use the bundled Expo vector icons so Paper never depends on react-native-vector-icons.
          icon: ({ name, color, size }) => (
            <MaterialCommunityIcons
              name={name as keyof typeof MaterialCommunityIcons.glyphMap}
              color={color}
              size={size}
            />
          ),
        }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <NotificationBootstrap />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
            <Stack.Screen
              name="item/form"
              options={{ title: 'Add item', presentation: 'modal' }}
            />
            <Stack.Screen
              name="scanner"
              options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </SQLiteProvider>
  );
}
