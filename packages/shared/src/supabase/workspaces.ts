import type { SupabaseClient } from '@supabase/supabase-js';
import type { Workspace, WorkspaceMember, ApiResponse } from '../types';

export function createWorkspacesAPI(supabase: SupabaseClient) {
  return {
    /**
     * Get all workspaces the current user is a member of.
     */
    async getAll(): Promise<ApiResponse<Workspace[]>> {
      try {
        const { data: memberData, error: memberError } = await supabase
          .from('workspace_members')
          .select('workspace_id');

        if (memberError) throw memberError;

        if (!memberData || memberData.length === 0) {
          return { data: [], error: null };
        }

        const workspaceIds = memberData.map(m => m.workspace_id);

        const { data, error } = await supabase
          .from('workspaces')
          .select('*')
          .in('id', workspaceIds)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return { data: data as Workspace[], error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },

    /**
     * Create a new workspace
     */
    async create(ownerId: string, name: string, type: 'personal' | 'family' = 'family'): Promise<ApiResponse<Workspace>> {
      try {
        const inviteCode = type === 'family' ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;
        
        const { data, error } = await supabase
          .from('workspaces')
          .insert({ name, type, owner_id: ownerId, invite_code: inviteCode })
          .select()
          .single();

        if (error) throw error;
        
        // Add owner as admin
        if (data) {
           await supabase.from('workspace_members').insert({
               workspace_id: data.id,
               user_id: ownerId,
               role: 'admin'
           });
        }

        return { data: data as Workspace, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },

    /**
     * Join a workspace by invite code
     */
    async join(userId: string, inviteCode: string): Promise<ApiResponse<Workspace>> {
      try {
        // Find workspace
        const { data: wsData, error: wsError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('invite_code', inviteCode.toUpperCase())
          .single();
          
        if (wsError || !wsData) throw new Error('Kode undangan tidak valid atau kadaluarsa');
        
        // Check if already a member
        const { data: existing } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', wsData.id)
          .eq('user_id', userId)
          .single();
          
        if (existing) throw new Error('Anda sudah bergabung di workspace ini');
        
        // Join
        const { error: joinError } = await supabase
          .from('workspace_members')
          .insert({
             workspace_id: wsData.id,
             user_id: userId,
             role: 'member'
          });
          
        if (joinError) throw joinError;
        
        return { data: wsData as Workspace, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },

    async getMembers(workspaceId: string): Promise<ApiResponse<any[]>> {
        try {
            // 1. Fetch workspace members
            const { data: members, error: membersError } = await supabase
                .from('workspace_members')
                .select('id, user_id, workspace_id, role, joined_at')
                .eq('workspace_id', workspaceId);
                
            if (membersError) throw membersError;
            if (!members || members.length === 0) {
                return { data: [], error: null };
            }

            // 2. Fetch profiles for all members
            const userIds = members.map(m => m.user_id);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, email')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            // 3. Map profiles to members in memory
            const profileMap = new Map(profiles?.map(p => [p.id, p]));
            const mappedMembers = members.map(m => ({
                ...m,
                profiles: profileMap.get(m.user_id) || null
            }));

            return { data: mappedMembers, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    },

    /**
     * Remove a member from workspace (admin only)
     */
    async removeMember(workspaceId: string, memberId: string): Promise<ApiResponse<null>> {
        try {
            const { error } = await supabase
                .from('workspace_members')
                .delete()
                .eq('id', memberId)
                .eq('workspace_id', workspaceId);

            if (error) throw error;
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    },

    /**
     * Change member role (admin only)
     */
    async updateMemberRole(workspaceId: string, memberId: string, role: 'admin' | 'member'): Promise<ApiResponse<null>> {
        try {
            const { error } = await supabase
                .from('workspace_members')
                .update({ role })
                .eq('id', memberId)
                .eq('workspace_id', workspaceId);

            if (error) throw error;
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    },

    /**
     * Regenerate invite code for a workspace
     */
    async regenerateInviteCode(workspaceId: string): Promise<ApiResponse<Workspace>> {
        try {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data, error } = await supabase
                .from('workspaces')
                .update({ invite_code: newCode })
                .eq('id', workspaceId)
                .select()
                .single();

            if (error) throw error;
            return { data: data as Workspace, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    },

    /**
     * Leave a workspace (members only)
     */
    async leave(workspaceId: string, userId: string): Promise<ApiResponse<null>> {
        try {
            const { error } = await supabase
                .from('workspace_members')
                .delete()
                .eq('workspace_id', workspaceId)
                .eq('user_id', userId);

            if (error) throw error;
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    },

    /**
     * Delete workspace and all its members (owner only)
     */
    async delete(workspaceId: string): Promise<ApiResponse<null>> {
        try {
            const { error: memberError } = await supabase
                .from('workspace_members')
                .delete()
                .eq('workspace_id', workspaceId);

            if (memberError) throw memberError;

            const { error } = await supabase
                .from('workspaces')
                .delete()
                .eq('id', workspaceId);

            if (error) throw error;
            return { data: null, error: null };
        } catch (error: any) {
            return { data: null, error };
        }
    }
  };
}
