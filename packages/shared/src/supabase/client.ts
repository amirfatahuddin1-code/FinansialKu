import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/constants';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Create or return the Supabase client singleton.
 * Works in both browser (Next.js) and React Native (Expo) environments.
 *
 * @param url - Override Supabase URL (optional, defaults to constant)
 * @param anonKey - Override Supabase Anon Key (optional, defaults to constant)
 */
export function getSupabaseClient(
  url: string = SUPABASE_URL,
  anonKey: string = SUPABASE_ANON_KEY,
  options?: { storage?: any }
): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined',
        ...(options?.storage ? { storage: options.storage } : {}),
      },
      global: {
        headers: {
          'X-Client-Info': 'karsafin-app',
        },
        fetch: async (input, init) => {
          try {
            return await fetch(input, init);
          } catch (err: any) {
            console.warn('Supabase fetch failed (network offline):', err.message || err);
            const errorBody = JSON.stringify({
              error: 'Failed to fetch',
              message: err.message || 'Network request failed',
            });
            if (typeof Response !== 'undefined') {
              return new Response(errorBody, {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              });
            }
            return {
              ok: false,
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null,
              } as any,
              text: async () => errorBody,
              json: async () => JSON.parse(errorBody),
            } as unknown as Response;
          }
        },
      },
    });
  }
  return supabaseInstance;
}

/**
 * Reset the Supabase client (for testing or re-init).
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}

export type { SupabaseClient };
