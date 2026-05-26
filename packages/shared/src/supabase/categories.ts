import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category, CreateCategoryInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createCategoriesAPI(supabase: SupabaseClient) {
  const api = {
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

    async getOrCreateByName(userId: string, categoryInput: { name: string; type: 'income' | 'expense'; icon: string; color: string }) {
      const { data: existingCats, error: getError } = await api.getAll();
      if (getError) return { data: null, error: getError };

      const found = existingCats?.find(
        (c) => c.name.toLowerCase() === categoryInput.name.toLowerCase() && c.type === categoryInput.type
      );

      if (found) {
        return { data: found, error: null };
      }

      return api.create(userId, categoryInput);
    }
  };
  return api;
}
