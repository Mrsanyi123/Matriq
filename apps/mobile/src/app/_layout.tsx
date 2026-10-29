import NetInfo from '@react-native-community/netinfo';
import { isMatriqApiError } from '@matriq/api-client';
import { palette } from '@matriq/ui';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppGate } from '../components/AppGate';
import { LanguageSheet } from '../components/LanguageSheet';
import { I18nProvider } from '../i18n/I18nProvider';
import { SessionProvider } from '../lib/session';
import { getSupabaseClient } from '../lib/supabase';
import { fontAssets } from '../theme/fonts';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// TanStack Query: refetch on reconnect and when the app returns to the foreground.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (s) => setFocused(s === 'active'));
    return () => sub.remove();
  });
}

const NO_RETRY = new Set(['not_configured', 'unauthorized', 'forbidden', 'not_found', 'validation']);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) => !(isMatriqApiError(error) && NO_RETRY.has(error.code)) && count < 2,
      },
    },
  });
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fontsReady = fontsLoaded || fontError !== null;

  return (
    <SafeAreaProvider style={{ backgroundColor: palette.bg }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider supabase={getSupabaseClient()}>
          <I18nProvider>
            <StatusBar style="dark" />
            {fontsReady ? <AppGate /> : null}
            {fontsReady ? <LanguageSheet /> : null}
          </I18nProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
