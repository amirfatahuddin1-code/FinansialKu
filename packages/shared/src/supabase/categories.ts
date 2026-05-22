import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category, CreateCategoryInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createCategoriesAPI(supabase: SupabaseClient) {
  return {
    async getAll() {
      let query = supabase
        .from('categories')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.or(`workspace_id.eq.${activeWsId},is_default.eq.true`);
      }

      const { data, error } = await query;
      return { data: data as Category[] | null, error };
    },

    async create(userId: string, category: CreateCategoryInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const insertData = { ...category, user_id: userId } as any;
      if (activeWsId) {
        insertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert(insertData)
        .select()
        .single();
      return { data: data as Category | null, error };
    },

    async update(id: string, category: Partial<CreateCategoryInput>) {
      const { data, error } = await supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Category | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      return { data, error };
    },
  };
}
