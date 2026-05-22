import type { SupabaseClient } from '@supabase/supabase-js';
import type { Savings, CreateSavingsInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createSavingsAPI(supabase: SupabaseClient) {
  return {
    async getAll() {
      let query = supabase
        .from('savings')
        .select('*')
        .order('deadline');

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as Savings[] | null, error };
    },

    async create(userId: string, savings: CreateSavingsInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const insertData = { ...savings, user_id: userId } as any;
      if (activeWsId) {
        insertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('savings')
        .insert(insertData)
        .select()
        .single();
      return { data: data as Savings | null, error };
    },


    async update(id: string, updates: Partial<CreateSavingsInput>) {
      const { data, error } = await supabase
        .from('savings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Savings | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('savings')
        .delete()
        .eq('id', id);
      return { data, error };
    },

    async addAmount(id: string, amount: number) {
      const { data: current } = await supabase
        .from('savings')
        .select('current')
        .eq('id', id)
        .single();

      if (!current) return { data: null, error: 'Savings not found' };

      const { data, error } = await supabase
        .from('savings')
        .update({ current: current.current + amount })
        .eq('id', id)
        .select()
        .single();
      return { data: data as Savings | null, error };
    },
  };
}
