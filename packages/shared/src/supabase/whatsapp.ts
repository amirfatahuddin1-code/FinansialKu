import type { SupabaseClient } from '@supabase/supabase-js';
import type { WhatsAppLink, WhatsAppGroupLink, WhatsAppTransaction } from '../types';

export function createWhatsAppAPI(supabase: SupabaseClient) {
  return {
    async getPending(userId: string) {
      const { data, error } = await supabase
        .from('whatsapp_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('synced', false)
        .order('created_at', { ascending: true });
      return { data: data as WhatsAppTransaction[] | null, error };
    },

    async markSynced(ids: string[]) {
      const { data, error } = await supabase
        .from('whatsapp_transactions')
        .update({ synced: true })
        .in('id', ids);
      return { data, error };
    },

    async linkPhone(userId: string, phoneNumber: string, displayName?: string) {
      const normalizedPhone = phoneNumber.replace(/[\s\-\+]/g, '');
      const { data, error } = await supabase
        .from('whatsapp_user_links')
        .upsert(
          { user_id: userId, phone_number: normalizedPhone, display_name: displayName || null },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      return { data: data as WhatsAppLink | null, error };
    },

    async getLinkedAccount(userId: string) {
      const { data, error } = await supabase
        .from('whatsapp_user_links')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return { data: data as WhatsAppLink | null, error };
    },

    async unlinkPhone(userId: string) {
      const { data, error } = await supabase
        .from('whatsapp_user_links')
        .delete()
        .eq('user_id', userId);
      return { data, error };
    },

    async linkGroup(userId: string, groupId: string, groupName?: string) {
      const { data, error } = await supabase
        .from('whatsapp_group_links')
        .upsert(
          { user_id: userId, group_id: groupId, group_name: groupName || null },
          { onConflict: 'user_id,group_id' }
        )
        .select()
        .single();
      return { data: data as WhatsAppGroupLink | null, error };
    },

    async getLinkedGroups(userId: string) {
      const { data, error } = await supabase
        .from('whatsapp_group_links')
        .select('*')
        .eq('user_id', userId)
        .order('linked_at', { ascending: false });
      return { data: data as WhatsAppGroupLink[] | null, error };
    },

    async unlinkGroup(userId: string, groupId: string) {
      const { data, error } = await supabase
        .from('whatsapp_group_links')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId);
      return { data, error };
    },
  };
}
