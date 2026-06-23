import type { SupabaseClient } from '@supabase/supabase-js';
import type { InvestmentAsset, CreateInvestmentAssetInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createInvestmentAssetsAPI(supabase: SupabaseClient) {
  return {
    async getAll() {
      let query = supabase
        .from('investment_assets')
        .select('*')
        .order('createdAt', { ascending: false });

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as InvestmentAsset[] | null, error };
    },

    async create(userId: string, asset: CreateInvestmentAssetInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const insertData = { ...asset, user_id: userId } as any;
      if (activeWsId) {
        insertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('investment_assets')
        .insert(insertData)
        .select()
        .single();
      return { data: data as InvestmentAsset | null, error };
    },

    async update(id: string, updates: Partial<CreateInvestmentAssetInput>) {
      const { data, error } = await supabase
        .from('investment_assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as InvestmentAsset | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('investment_assets')
        .delete()
        .eq('id', id);
      return { data, error };
    },
  };
}
