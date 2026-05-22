import type { SupabaseClient } from '@supabase/supabase-js';
import type { TelegramLink, TelegramLinkCode, TelegramGroupLink, TelegramTransaction } from '../types';

export function createTelegramAPI(supabase: SupabaseClient) {
  return {
    async getPending(userId: string) {
      const { data, error } = await supabase
        .from('telegram_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('synced', false)
        .order('created_at', { ascending: true });
      return { data: data as TelegramTransaction[] | null, error };
    },

    async markSynced(ids: string[]) {
      const { data, error } = await supabase
        .from('telegram_transactions')
        .update({ synced: true })
        .in('id', ids);
      return { data, error };
    },

    async linkTelegram(userId: string, telegramUserId: string, telegramUsername: string) {
      const { data, error } = await supabase
        .from('telegram_user_links')
        .upsert(
          { user_id: userId, telegram_user_id: telegramUserId, telegram_username: telegramUsername },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      return { data: data as TelegramLink | null, error };
    },

    async getLinkedAccount(userId: string) {
      const { data, error } = await supabase
        .from('telegram_user_links')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return { data: data as TelegramLink | null, error };
    },

    async unlinkTelegram(userId: string) {
      const { data, error } = await supabase
        .from('telegram_user_links')
        .delete()
        .eq('user_id', userId);
      return { data, error };
    },

    async generateLinkCode(userId: string) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('telegram_link_codes')
        .insert({ user_id: userId, code, expires_at: expiresAt })
        .select()
        .single();
      return { data: data as TelegramLinkCode | null, error };
    },

    async getActiveLinkCode(userId: string) {
      const { data, error } = await supabase
        .from('telegram_link_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return { data: data as TelegramLinkCode | null, error };
    },
  };
}

export function createTelegramGroupAPI(supabase: SupabaseClient) {
  return {
    async linkGroup(userId: string, telegramGroupId: string, groupName: string) {
      const { data, error } = await supabase
        .from('telegram_group_links')
        .upsert(
          { user_id: userId, telegram_group_id: telegramGroupId, group_name: groupName },
          { onConflict: 'telegram_group_id' }
        )
        .select()
        .single();
      return { data: data as TelegramGroupLink | null, error };
    },

    async getLinkedGroups(userId: string) {
      const { data, error } = await supabase
        .from('telegram_group_links')
        .select('*')
        .eq('user_id', userId)
        .order('linked_at', { ascending: false });
      return { data: data as TelegramGroupLink[] | null, error };
    },

    async unlinkGroup(userId: string, telegramGroupId: string) {
      const { data, error } = await supabase
        .from('telegram_group_links')
        .delete()
        .eq('user_id', userId)
        .eq('telegram_group_id', telegramGroupId);
      return { data, error };
    },

    async getGroupOwner(telegramGroupId: string) {
      const { data, error } = await supabase
        .from('telegram_group_links')
        .select('user_id, group_name')
        .eq('telegram_group_id', telegramGroupId)
        .single();
      return { data, error };
    },
  };
}
