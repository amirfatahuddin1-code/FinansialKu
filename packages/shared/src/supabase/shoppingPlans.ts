import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShoppingPlan, CreateShoppingPlanInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createShoppingPlansAPI(supabase: SupabaseClient) {
  return {
    async getAll() {
      let query = supabase
        .from('shopping_plans')
        .select('*')
        .order('date', { ascending: false });

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as ShoppingPlan[] | null, error };
    },

    async create(userId: string, plan: CreateShoppingPlanInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const insertData = { ...plan, user_id: userId } as any;
      if (activeWsId) {
        insertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('shopping_plans')
        .insert(insertData)
        .select()
        .single();
      return { data: data as ShoppingPlan | null, error };
    },

    async update(id: string, updates: Partial<CreateShoppingPlanInput>) {
      const { data, error } = await supabase
        .from('shopping_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as ShoppingPlan | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('shopping_plans')
        .delete()
        .eq('id', id);
      return { data, error };
    },
  };
}
