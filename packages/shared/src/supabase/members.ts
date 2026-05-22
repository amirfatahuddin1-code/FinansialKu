import type { SupabaseClient } from '@supabase/supabase-js';
import type { Member } from '../types';

export function createMembersAPI(supabase: SupabaseClient) {
  return {
    async getAll(userId: string) {
      const { data, error } = await supabase
        .from('account_members')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      return { data: (data || []) as Member[], error };
    },

    async create(userId: string, name: string) {
      const { data, error } = await supabase
        .from('account_members')
        .insert({ user_id: userId, name })
        .select()
        .single();
      return { data: data as Member | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('account_members')
        .delete()
        .eq('id', id);
      return { error };
    },
  };
}
