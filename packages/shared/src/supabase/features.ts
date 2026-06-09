import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserFeature, FeatureError, CreateFeatureInput, UpdateFeatureInput, FeatureType } from '../types';
import { workspaceContext } from './workspaceContext';

export function createFeaturesAPI(supabase: SupabaseClient) {
  return {
    async getAll(workspaceId?: string): Promise<{ data: UserFeature[] | null; error: any }> {
      const activeWsId = workspaceId || workspaceContext.getActiveWorkspaceId();
      let query = supabase
        .from('user_features')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as UserFeature[] | null, error };
    },

    async getByType(featureType: FeatureType, workspaceId?: string): Promise<{ data: UserFeature[] | null; error: any }> {
      const activeWsId = workspaceId || workspaceContext.getActiveWorkspaceId();
      let query = supabase
        .from('user_features')
        .select('*')
        .eq('feature_type', featureType)
        .order('created_at', { ascending: false });

      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as UserFeature[] | null, error };
    },

    async getById(id: string): Promise<{ data: UserFeature | null; error: any }> {
      const { data, error } = await supabase
        .from('user_features')
        .select('*')
        .eq('id', id)
        .single();
      return { data: data as UserFeature | null, error };
    },

    async create(input: CreateFeatureInput): Promise<{ data: UserFeature | null; error: any }> {
      const activeWsId = input.workspace_id || workspaceContext.getActiveWorkspaceId();
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const insertData = {
        ...input,
        user_id: userId,
        workspace_id: activeWsId,
        version: 1,
        is_enabled: true,
        error_count: 0,
        max_error_count: 3,
      } as any;

      const { data, error } = await supabase
        .from('user_features')
        .insert(insertData)
        .select()
        .single();

      return { data: data as UserFeature | null, error };
    },

    async update(id: string, updates: UpdateFeatureInput): Promise<{ data: UserFeature | null; error: any }> {
      const updateData: any = { ...updates, version: supabase.rpc('increment_version', { row_id: id }) };
      const { data, error } = await supabase
        .from('user_features')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as UserFeature | null, error };
    },

    async delete(id: string): Promise<{ data: any; error: any }> {
      const { data, error } = await supabase
        .from('user_features')
        .delete()
        .eq('id', id);
      return { data, error };
    },

    async toggle(id: string, enabled: boolean): Promise<{ data: UserFeature | null; error: any }> {
      const { data, error } = await supabase
        .from('user_features')
        .update({ is_enabled: enabled })
        .eq('id', id)
        .select()
        .single();
      return { data: data as UserFeature | null, error };
    },

    async getErrors(featureId: string): Promise<{ data: FeatureError[] | null; error: any }> {
      const { data, error } = await supabase
        .from('feature_errors')
        .select('*')
        .eq('feature_id', featureId)
        .order('created_at', { ascending: false })
        .limit(50);
      return { data: data as FeatureError[] | null, error };
    },

    async logError(featureId: string, errorMessage: string, context?: Record<string, unknown>): Promise<{ data: any; error: any }> {
      const { data: feature } = await supabase
        .from('user_features')
        .select('error_count, max_error_count')
        .eq('id', featureId)
        .single();

      const newErrorCount = (feature?.error_count || 0) + 1;
      const maxErrors = feature?.max_error_count || 3;

      const updateData: any = {
        error_count: newErrorCount,
        last_error: errorMessage,
      };

      if (newErrorCount >= maxErrors) {
        updateData.is_enabled = false;
      }

      await supabase
        .from('user_features')
        .update(updateData)
        .eq('id', featureId);

      const { data, error } = await supabase
        .from('feature_errors')
        .insert({
          feature_id: featureId,
          error_message: errorMessage,
          context: context || null,
        })
        .select();

      return { data, error };
    },

    async clearErrors(featureId: string): Promise<{ data: any; error: any }> {
      await supabase
        .from('user_features')
        .update({ error_count: 0, last_error: null })
        .eq('id', featureId);

      const { data, error } = await supabase
        .from('feature_errors')
        .delete()
        .eq('feature_id', featureId);
      return { data, error };
    },

    async getActiveWidgets(workspaceId?: string): Promise<{ data: UserFeature[] | null; error: any }> {
      const activeWsId = workspaceId || workspaceContext.getActiveWorkspaceId();
      let query = supabase
        .from('user_features')
        .select('*')
        .eq('feature_type', 'dashboard_widget')
        .eq('is_enabled', true);

      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      const { data, error } = await query;
      return { data: data as UserFeature[] | null, error };
    },
  };
}
