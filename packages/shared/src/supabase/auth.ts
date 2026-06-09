import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY } from '../utils/constants';

export function createAuthAPI(supabase: SupabaseClient) {
  return {
    async getUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { data: { user }, error };
      } catch (err: any) {
        console.warn('Auth getUser failed:', err.message);
        return { data: { user: null }, error: err };
      }
    },

    async getSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { data: { session }, error };
      } catch (err: any) {
        console.warn('Auth getSession failed:', err.message);
        return { data: { session: null }, error: err };
      }
    },

    async signUp(email: string, password: string, name: string, phone?: string, emailRedirectTo?: string) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone },
            emailRedirectTo,
          },
        });
        return { data, error };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async resendConfirmation(email: string, emailRedirectTo?: string) {
      try {
        const { data, error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo,
          },
        });
        return { data, error };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },

    async signIn(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    },

    async signInWithGoogle(redirectTo: string) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      return { data, error };
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      return { error };
    },

    async updateUser(attributes: Record<string, any>) {
      const { data, error } = await supabase.auth.updateUser(attributes);
      return { data, error };
    },

    async resetPassword(email: string, redirectTo: string) {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return { data, error };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      return supabase.auth.onAuthStateChange(callback);
    },

    /**
     * Get the ANON_KEY for edge function calls during registration flow.
     */
    getAnonKey() {
      return SUPABASE_ANON_KEY;
    },
  };
}
