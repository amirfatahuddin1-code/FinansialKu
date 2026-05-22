import React, { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { createKarsafinAPI, getSupabaseClient, KarsafinAPI } from '@karsafin/shared';
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com';

interface User {
  id: string;
  email?: string;
  user_metadata?: { name?: string; phone?: string };
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  api: KarsafinAPI;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = getSupabaseClient(undefined, undefined, { storage: AsyncStorage });
const api = createKarsafinAPI(supabase);

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  api,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await api.auth.getUser();
        setUser(data?.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();

    const { data: listener } = api.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;
        if (url.includes('access_token=') && url.includes('refresh_token=')) {
          const fragment = url.split('#')[1] || url.split('?')[1] || '';
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            WebBrowser.dismissAuthSession();
          }
        }
      } catch (err) {
        console.error('Failed to parse deep link auth session:', err);
      }
    };

    // Get initial URL if the app was closed and opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listen for incoming deep links while the app is active/backgrounded
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      listener?.subscription?.unsubscribe?.();
      subscription.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await api.auth.signIn(email, password);
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    const { error } = await api.auth.signUp(email, password, name, phone);
    return { error };
  };

  const signInWithGoogleWebBrowser = async () => {
    try {
      const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
      
      let redirectTo = isExpoGo 
        ? Linking.createURL('') 
        : makeRedirectUri({
            scheme: 'karsafin',
            path: 'auth/callback',
          });

      if (isExpoGo) {
        redirectTo = redirectTo.replace(/\/--\/?$/, '').replace(/\/$/, '');
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error };
      if (!data?.url) return { error: 'Tidak dapat memulai login Google' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const url = result.url;
        const fragment = url.split('#')[1] || '';
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          return { error: null };
        }
      }

      if (result.type === 'cancel') {
        return { error: 'Login Google dibatalkan' };
      }

      return { error: 'Gagal login dengan Google' };
    } catch (err: any) {
      return { error: err.message || 'Gagal login dengan Google' };
    }
  };

  const signInWithGoogle = async () => {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
      return await signInWithGoogleWebBrowser();
    }

    try {
      if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID === 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com') {
        return { 
          error: new Error('Google Web Client ID belum dikonfigurasi. Harap tentukan EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID di file .env Anda.') 
        };
      }

      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
      });

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
      if (!idToken) {
        return { error: new Error('ID Token tidak ditemukan dari Google Sign-In') };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) return { error };
      return { error: null };
    } catch (err: any) {
      console.error('Native Google Sign-In Error:', err);
      if (err.code === '12501' || err.message?.includes('SIGN_IN_CANCELLED') || err.code === 'SIGN_IN_CANCELLED') {
        return { error: new Error('Login Google dibatalkan') };
      }
      return { error: err };
    }
  };

  const signOut = async () => {
    await api.auth.signOut();
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (!isExpoGo) {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
      } catch (err) {
        // Abaikan error saat Google Sign-Out
      }
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, api, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export { api as karsafinAPI };
