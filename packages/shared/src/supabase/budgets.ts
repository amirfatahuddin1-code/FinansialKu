import type { SupabaseClient } from '@supabase/supabase-js';
import type { Budget, BudgetWithRealization, UpsertBudgetInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createBudgetsAPI(supabase: SupabaseClient) {
  return {
    async getByMonth(year: number, month: number) {
      let query = supabase
        .from('budgets')
        .select(`*, category:categories(id, name, icon, color)`)
        .eq('year', year)
        .eq('month', month);

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as Budget[] | null, error };
    },

    async upsert(userId: string, budget: UpsertBudgetInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const upsertData = { ...budget, user_id: userId } as any;
      if (activeWsId) {
        upsertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          upsertData,
          { onConflict: 'user_id,category_id,month,year' }
        )
        .select()
        .single();
      return { data: data as Budget | null, error };
    },

    async upsertBatch(userId: string, items: UpsertBudgetInput[]) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const upsertData = items.map((b) => {
        const row: any = { ...b, user_id: userId };
        if (activeWsId) row.workspace_id = activeWsId;
        return row;
      });

      const { data, error } = await supabase
        .from('budgets')
        .upsert(upsertData, { onConflict: 'user_id,category_id,month,year' })
        .select();
      return { data: data as Budget[] | null, error };
    },

    async getByMonthWithRealization(year: number, month: number) {
      let query = supabase
        .from('budgets')
        .select(`*, category:categories(id, name, icon, color)`)
        .eq('year', year)
        .eq('month', month);

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data: budgetsData, error } = await query;
      if (error) return { data: null as BudgetWithRealization[] | null, error };
      if (!budgetsData || budgetsData.length === 0) return { data: [], error: null };

      const budgets = budgetsData as Budget[];

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Fetch all transaction types for realization (no type filter)
      let txQuery = supabase
        .from('transactions')
        .select('category_id, amount')
        .gte('date', startDate)
        .lte('date', endDate);

      if (activeWsId) {
        txQuery = txQuery.eq('workspace_id', activeWsId);
      }

      const { data: txs } = await txQuery;

      const spentByCategory: Record<string, number> = {};
      if (txs) {
        for (const tx of txs as { category_id: string; amount: number }[]) {
          spentByCategory[tx.category_id] = (spentByCategory[tx.category_id] || 0) + tx.amount;
        }
      }

      const result: BudgetWithRealization[] = budgets.map((b) => {
        const spent = spentByCategory[b.category_id] || 0;
        return {
          ...b,
          spent,
          percentage: b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0,
        };
      });

      return { data: result, error: null };
    },

    async getAllHistory() {
      let query = supabase
        .from('budgets')
        .select('year, month')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      if (error) return { data: [] as { year: number; month: number }[], error };

      const uniqueMonths = Array.from(
        new Map((data || []).map((d) => [`${d.year}-${d.month}`, d])).values()
      );
      return { data: uniqueMonths as { year: number; month: number }[], error: null };
    },

  };
}
