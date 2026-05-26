import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../types';

const DAILY_AI_QUOTA = 20;
const MAX_AI_QUOTA = 50;

function getDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function createProfilesAPI(supabase: SupabaseClient) {
  return {
    async get(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return { data: data as Profile | null, error };
    },

    async update(userId: string, updates: Partial<Profile>) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      return { data: data as Profile | null, error };
    },

    async getAiQuota(userId: string): Promise<{ data: { quota: number; max: number; rewardAmount: number } | null; error: any }> {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_quota, last_ai_reset')
        .eq('id', userId)
        .single();

      if (error) return { data: null, error };
      if (!data) return { data: null, error: 'Profile not found' };

      const today = getDateString();
      let quota = data.ai_quota ?? DAILY_AI_QUOTA;

      if (data.last_ai_reset !== today) {
        quota = DAILY_AI_QUOTA;
        await supabase
          .from('profiles')
          .update({ ai_quota: quota, last_ai_reset: today })
          .eq('id', userId);
      }

      return {
        data: { quota, max: MAX_AI_QUOTA, rewardAmount: 5 },
        error: null,
      };
    },

    async decrementAiQuota(userId: string): Promise<{ data: number | null; error: any }> {
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_quota')
        .eq('id', userId)
        .single();

      if (!profile) return { data: null, error: 'Profile not found' };

      const quota = profile.ai_quota ?? 0;
      if (quota <= 0) return { data: null, error: 'insufficient_quota' };

      const newQuota = quota - 1;
      const { error } = await supabase
        .from('profiles')
        .update({ ai_quota: newQuota })
        .eq('id', userId);

      return { data: newQuota, error };
    },

    async addAiQuota(userId: string, amount: number): Promise<{ data: { quota: number; applied: boolean } | null; error: any }> {
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_quota')
        .eq('id', userId)
        .single();

      if (!profile) return { data: null, error: 'Profile not found' };

      const current = profile.ai_quota ?? 0;
      const alreadyMax = current >= MAX_AI_QUOTA;
      const newQuota = alreadyMax ? current : Math.min(MAX_AI_QUOTA, current + amount);
      let error = null;
      if (!alreadyMax) {
        const res = await supabase
          .from('profiles')
          .update({ ai_quota: newQuota })
          .eq('id', userId);
        error = res.error;
        if (error) {
          return { data: null, error };
        }
      }

      return { data: { quota: newQuota, applied: !alreadyMax }, error };
    },

    async getTelegramQuota(userId: string): Promise<{ data: { quota: number; max: number; rewardAmount: number } | null; error: any }> {
      const { data, error } = await supabase
        .from('profiles')
        .select('telegram_quota, last_telegram_reset')
        .eq('id', userId)
        .single();

      if (error) return { data: null, error };
      if (!data) return { data: null, error: 'Profile not found' };

      const today = getDateString();
      let quota = data.telegram_quota ?? 20;

      if (data.last_telegram_reset !== today) {
        quota = 20;
        await supabase
          .from('profiles')
          .update({ telegram_quota: quota, last_telegram_reset: today })
          .eq('id', userId);
      }

      return {
        data: { quota, max: 50, rewardAmount: 5 },
        error: null,
      };
    },

    async addTelegramQuota(userId: string, amount: number): Promise<{ data: { quota: number; applied: boolean } | null; error: any }> {
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_quota')
        .eq('id', userId)
        .single();

      if (!profile) return { data: null, error: 'Profile not found' };

      const current = profile.telegram_quota ?? 20;
      const alreadyMax = current >= 50;
      const newQuota = alreadyMax ? current : Math.min(50, current + amount);
      let error = null;
      if (!alreadyMax) {
        const res = await supabase
          .from('profiles')
          .update({ telegram_quota: newQuota })
          .eq('id', userId);
        error = res.error;
        if (error) {
          return { data: null, error };
        }
      }

      return { data: { quota: newQuota, applied: !alreadyMax }, error };
    },

    async getWhatsappQuota(userId: string): Promise<{ data: { quota: number; max: number; rewardAmount: number } | null; error: any }> {
      const { data, error } = await supabase
        .from('profiles')
        .select('whatsapp_quota, last_whatsapp_reset')
        .eq('id', userId)
        .single();

      if (error) return { data: null, error };
      if (!data) return { data: null, error: 'Profile not found' };

      const today = getDateString();
      let quota = data.whatsapp_quota ?? 20;

      if (data.last_whatsapp_reset !== today) {
        quota = 20;
        await supabase
          .from('profiles')
          .update({ whatsapp_quota: quota, last_whatsapp_reset: today })
          .eq('id', userId);
      }

      return {
        data: { quota, max: 50, rewardAmount: 5 },
        error: null,
      };
    },

    async addWhatsappQuota(userId: string, amount: number): Promise<{ data: { quota: number; applied: boolean } | null; error: any }> {
      const { data: profile } = await supabase
        .from('profiles')
        .select('whatsapp_quota')
        .eq('id', userId)
        .single();

      if (!profile) return { data: null, error: 'Profile not found' };

      const current = profile.whatsapp_quota ?? 20;
      const alreadyMax = current >= 50;
      const newQuota = alreadyMax ? current : Math.min(50, current + amount);
      let error = null;
      if (!alreadyMax) {
        const res = await supabase
          .from('profiles')
          .update({ whatsapp_quota: newQuota })
          .eq('id', userId);
        error = res.error;
        if (error) {
          return { data: null, error };
        }
      }

      return { data: { quota: newQuota, applied: !alreadyMax }, error };
    },
  };
}
