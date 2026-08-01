# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Project: Stash — food storage tracker

Offline-first Expo (SDK 57, managed) app to track food at home: what you have, where it is, when it expires. No auth, no backend. Only network call: Open Food Facts barcode lookup (`src/lib/open-food-facts.ts`); every other feature must work offline.

## Stack decisions

- **Navigation:** expo-router (file-based, typed routes on). Root `Stack` in `src/app/_layout.tsx` → `(tabs)` group with JS `Tabs` (Home / My Food / Settings). `item/[id]`, `item/form` (modal), `scanner` (fullScreenModal) push over the tabs. Do NOT reintroduce `NativeTabs` (alpha; can't reliably push screens over the tab bar).
- **UI:** react-native-paper (MD3 light/dark, primary `#208AEF`). `PaperProvider` in root layout is configured with `settings.icon` mapped to `@expo/vector-icons` — keep this so Paper never requires `react-native-vector-icons`.
- **DB:** expo-sqlite via `SQLiteProvider` + `PRAGMA user_version` migrations in `src/db/database.ts`. Tables: `food_items` (`purchase_date` is NULLABLE by design), `options` (categories/locations, seeded with defaults), `settings` (key-value JSON prefs).
- **Dates:** stored as local-calendar `YYYY-MM-DD` strings; helpers in `src/lib/dates.ts` (`daysUntilExpiry`, `urgencyOf`: <0 expired, ≤7 soon, else ok). Never use `Date.toISOString()` for date-only values (UTC shift).
- **Notifications:** `src/notifications/notifications.ts`. Handler set at module scope (`shouldShowBanner`/`shouldShowList`; `shouldShowAlert` is deprecated). Per-item reminders = `DATE` triggers with identifiers `item-{id}-{7|3|1}d`; daily summary = `DAILY` trigger id `daily-summary`. A repeating trigger can't have dynamic content, so call `rescheduleAllNotifications(db)` after EVERY inventory/settings change (it cancels all and rebuilds with a fresh count).
- **Barcode:** `expo-camera` `CameraView` (expo-barcode-scanner is dead). Scanner → form hand-off uses `src/lib/scan-bus.ts` (module-level callback — the form stays mounted under the scanner; don't pass form state through router params).
- **Date/time pickers:** `@react-native-community/datetimepicker` v9 — use `onValueChange` (`onChange` is deprecated); Android via `DateTimePickerAndroid.open`, iOS inline spinner.

## Verify

- `npx tsc --noEmit`
- `CI=1 npx expo export --platform android --output-dir <tmp>` (full bundle check)
- Run on a physical device (`npx expo start`, Expo Go works): camera and notifications don't work in simulators.
