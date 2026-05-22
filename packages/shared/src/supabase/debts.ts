import type { SupabaseClient } from '@supabase/supabase-js';
import type { Debt, CreateDebtInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createDebtsAPI(supabase: SupabaseClient) {
  return {
    async getAll(userId: string) {
      let query = supabase
        .from('debts')
        .select(`*, account:financial_accounts(id, name, type, icon, color)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as Debt[] | null, error };
    },

    async create(userId: string, debt: CreateDebtInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const insertData = { ...debt, user_id: userId } as any;
      if (activeWsId) {
        insertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('debts')
        .insert([insertData])
        .select()
        .single();
      return { data: data as Debt | null, error };
    },


    async update(id: string, updates: Partial<CreateDebtInput>) {
      const { data, error } = await supabase
        .from('debts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Debt | null, error };
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);
      return { error };
    },
  };
}
