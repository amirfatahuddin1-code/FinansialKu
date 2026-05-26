import type { SupabaseClient } from '@supabase/supabase-js';
import type { Transaction, TransactionFilters, CreateTransactionInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createTransactionsAPI(supabase: SupabaseClient) {
  return {
    async getAll(filters: TransactionFilters = {}) {
      let query = supabase
        .from('transactions')
        .select(`*, category:categories(id, name, icon, color), account:financial_accounts!transactions_account_id_fkey(id, name, type, icon, color), savings:savings(id, name), creator:profiles(id, name)`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      if (filters.startDate) query = query.gte('date', filters.startDate);
      if (filters.endDate) query = query.lte('date', filters.endDate);
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId);

      const { data, error } = await query;
      const mapped = data
        ? (data as any[]).map(t => ({
            ...t,
            recorderName: t.sender_name || t.creator?.name || 'User'
          })) as Transaction[]
        : null;
      return { data: mapped, error };
    },

    async create(userId: string, transaction: CreateTransactionInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const insertData = { ...transaction, user_id: userId } as any;
      if (activeWsId) {
        insertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert(insertData)
        .select()
        .single();
      return { data: data as Transaction | null, error };
    },


    async update(id: string, updates: Partial<CreateTransactionInput>) {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Transaction | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      return { data, error };
    },
  };
}
