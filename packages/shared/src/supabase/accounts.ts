import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinancialAccount, CreateAccountInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createAccountsAPI(supabase: SupabaseClient) {
  return {
    async getAll() {
      let query = supabase
        .from('financial_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('type')
        .order('name');

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as FinancialAccount[] | null, error };
    },

    async getAllForWorkspace(workspaceId: string) {
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('is_default', { ascending: false })
        .order('type')
        .order('name');
      return { data: data as FinancialAccount[] | null, error };
    },

    async create(userId: string, account: CreateAccountInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const insertData = { ...account, user_id: userId } as any;
      if (activeWsId) {
        insertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('financial_accounts')
        .insert(insertData)
        .select()
        .single();
      return { data: data as FinancialAccount | null, error };
    },


    async update(id: string, updates: Partial<CreateAccountInput>) {
      const { data, error } = await supabase
        .from('financial_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as FinancialAccount | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('financial_accounts')
        .delete()
        .eq('id', id);
      return { data, error };
    },
  };
}
