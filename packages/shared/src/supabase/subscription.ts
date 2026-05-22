import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionPlan, Subscription, PaymentTransaction, MessagingUsage } from '../types';
import { SUPABASE_ANON_KEY } from '../utils/constants';

export function createSubscriptionAPI(supabase: SupabaseClient) {
  return {
    async getPlans() {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });
      return { data: data as SubscriptionPlan[] | null, error };
    },

    async checkStatus(accessToken: string) {
      try {
        const response = await fetch(
          `${(supabase as any).supabaseUrl}/functions/v1/check-subscription`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const data = (await response.json()) as Record<string, any>;
        if (!response.ok) {
          return { data: null, error: new Error(data.error || 'Failed to check subscription') };
        }
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },

    async createPayment(
      planId: string,
      user: { id: string; email: string; user_metadata?: { name?: string } },
      accessToken?: string
    ) {
      try {
        const token = accessToken || SUPABASE_ANON_KEY;
        const response = await fetch(
          `${(supabase as any).supabaseUrl}/functions/v1/create-payment`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              plan_id: planId,
              user_id: user.id,
              user_email: user.email,
              user_name: user.user_metadata?.name || user.email?.split('@')[0],
            }),
          }
        );
        const data = (await response.json()) as Record<string, any>;
        if (!data.success) {
          return { data: null, error: new Error(data.error || 'Failed to create payment') };
        }
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },

    async getMessagingUsage(userId: string) {
      const { data, error } = await supabase.rpc('get_messaging_usage', {
        p_user_id: userId,
      });
      const defaultUsage: MessagingUsage = { wa_count: 0, telegram_count: 0, total_count: 0 };
      return { data: data?.[0] || defaultUsage, error };
    },

    async incrementMessagingCount(userId: string, type: 'wa' | 'telegram') {
      const { data, error } = await supabase.rpc('increment_messaging_count', {
        p_user_id: userId,
        p_type: type,
      });
      return { data, error };
    },

    async getPaymentHistory(userId: string) {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*, subscription_plans(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return { data: data as PaymentTransaction[] | null, error };
    },

    async getSubscriptionHistory(userId: string) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(name, price, features)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return { data: data as Subscription[] | null, error };
    },
  };
}
