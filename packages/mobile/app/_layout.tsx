import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { WorkspaceProvider } from '@/providers/WorkspaceProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAppPrimaryColor } from '@/constants/Colors';
import { MobileAds } from 'react-native-google-mobile-ads';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      // Not logged in, redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Logged in, redirect to dashboard
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  // Fallback: if fonts don't load within 5s, proceed anyway
  const [timedOut, setTimedOut] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@karsafin_theme_color');
        if (savedTheme) {
          setAppPrimaryColor(savedTheme);
        }
      } catch (err) {
        console.warn('Failed to load theme:', err);
      } finally {
        setThemeLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const loaded = (fontsLoaded || timedOut) && themeLoaded;

  useEffect(() => {
    if (fontError) console.warn('Font load error (non-fatal):', fontError);
  }, [fontError]);

  useEffect(() => {
    MobileAds().initialize().catch(() => console.warn('AdMob init error'));
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  const theme = colorScheme === 'dark'
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#0f172a', card: '#1e293b' } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#f8fafc' } };

  return (
    <ThemeProvider value={theme}>
      <WorkspaceProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="kuota-ai" options={{ presentation: 'modal' }} />
            <Stack.Screen name="workspace-members" options={{ presentation: 'modal' }} />
          </Stack>
        </AuthGate>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}
