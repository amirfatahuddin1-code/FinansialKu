import type { SupabaseClient } from '@supabase/supabase-js';
import type { Event, CreateEventInput, EventItem, CreateEventItemInput, EventIncome, CreateEventIncomeInput } from '../types';
import { workspaceContext } from './workspaceContext';

export function createEventsAPI(supabase: SupabaseClient) {
  return {
    async getAll(includeArchived = false) {
      let query = supabase
        .from('events')
        .select(`*, items:event_items(*), incomes:event_incomes(*)`)
        .order('date');

      const activeWsId = workspaceContext.getActiveWorkspaceId();
      if (activeWsId) {
        query = query.eq('workspace_id', activeWsId);
      }

      if (!includeArchived) {
        query = query.eq('archived', false);
      }

      const { data, error } = await query;
      return { data: data as Event[] | null, error };
    },

    async create(userId: string, event: CreateEventInput) {
      const activeWsId = workspaceContext.getActiveWorkspaceId();
      const insertData = { ...event, user_id: userId } as any;
      if (activeWsId) {
        insertData.workspace_id = activeWsId;
      }

      const { data, error } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single();
      return { data: data as Event | null, error };
    },


    async update(id: string, updates: Partial<CreateEventInput>) {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as Event | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      return { data, error };
    },

    async archive(id: string) {
      const { data, error } = await supabase
        .from('events')
        .update({ archived: true })
        .eq('id', id)
        .select()
        .single();
      return { data: data as Event | null, error };
    },
  };
}

export function createEventItemsAPI(supabase: SupabaseClient) {
  return {
    async create(eventId: string, item: CreateEventItemInput) {
      const { data, error } = await supabase
        .from('event_items')
        .insert({ ...item, event_id: eventId })
        .select()
        .single();
      return { data: data as EventItem | null, error };
    },

    async update(id: string, updates: Partial<CreateEventItemInput>) {
      const { data, error } = await supabase
        .from('event_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      return { data: data as EventItem | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('event_items')
        .delete()
        .eq('id', id);
      return { data, error };
    },

    async togglePaid(id: string, isPaid: boolean) {
      const { data, error } = await supabase
        .from('event_items')
        .update({ is_paid: isPaid })
        .eq('id', id)
        .select()
        .single();
      return { data: data as EventItem | null, error };
    },
  };
}

export function createEventIncomesAPI(supabase: SupabaseClient) {
  return {
    async create(eventId: string, income: CreateEventIncomeInput) {
      const { data, error } = await supabase
        .from('event_incomes')
        .insert({ ...income, event_id: eventId })
        .select()
        .single();
      return { data: data as EventIncome | null, error };
    },

    async delete(id: string) {
      const { data, error } = await supabase
        .from('event_incomes')
        .delete()
        .eq('id', id);
      return { data, error };
    },
  };
}
