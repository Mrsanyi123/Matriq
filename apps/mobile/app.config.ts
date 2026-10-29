import type { ConfigContext, ExpoConfig } from 'expo/config';
// The config runs in plain Node, whose TypeScript loader cannot follow the
// extensionless imports in `@matriq/ui`'s index; tokens.ts has no imports.
import { palette } from '../../packages/ui/src/tokens.ts';

/**
 * Expo app config. Values that need an owner decision before the first Play
 * release are marked DECISION.
 */

// DECISION: the Android application ID is permanent once published on Google
// Play. `com.matriq.app` is a placeholder until the owner confirms the domain.
const ANDROID_PACKAGE = process.env.MATRIQ_ANDROID_PACKAGE ?? 'com.matriq.app';

// Bump for every Play upload (EAS can manage this remotely; see eas.json).
const VERSION = '0.1.0';
const ANDROID_VERSION_CODE = 1;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Matriq',
  slug: 'matriq',
  scheme: 'matriq',
  version: VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: palette.bg,
  platforms: ['android', 'ios', 'web'],
  android: {
    package: ANDROID_PACKAGE,
    versionCode: ANDROID_VERSION_CODE,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
      backgroundColor: palette.green,
    },
    // Only what the app needs: network access (added by default) and network
    // state for the offline banner (added by NetInfo). Block legacy defaults.
    permissions: [],
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.VIBRATE',
    ],
    softwareKeyboardLayoutMode: 'resize',
    allowBackup: false,
  },
  ios: {
    bundleIdentifier: ANDROID_PACKAGE,
    supportsTablet: false,
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: palette.bg,
      },
    ],
    ['expo-secure-store', { configureAndroidBackup: true }],
    'expo-font',
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    // Set by `eas init`; left empty so no project is linked by accident.
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
