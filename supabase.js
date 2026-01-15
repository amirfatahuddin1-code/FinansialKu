// FinansialKu - Supabase Client & API
// IIFE to avoid global scope pollution

(function () {
    'use strict';

    const SUPABASE_URL = 'https://neeawjydtdcubwrklnua.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_xc0jvwbvtWCubCGUtnJkwg_EdHTVO3S';

    // Initialize Supabase client
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ========== AUTH FUNCTIONS ==========

    const authAPI = {
        async getUser() {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            return { user, error };
        },

        async getSession() {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            return { session, error };
        },

        async signUp(email, password, name) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { name } }
            });
            return { data, error };
        },

        async signIn(email, password) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            return { data, error };
        },

        async signInWithGoogle() {
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/index.html'
                }
            });
            return { data, error };
        },

        async signOut() {
            const { error } = await supabaseClient.auth.signOut();
            return { error };
        },

        onAuthStateChange(callback) {
            return supabaseClient.auth.onAuthStateChange(callback);
        }
    };

    // ========== PROFILE FUNCTIONS ==========

    const profilesAPI = {
        async get() {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            return { data, error };
        },

        async update(updates) {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();
            return { data, error };
        }
    };

    // ========== CATEGORIES API ==========

    const categoriesAPI = {
        async getAll() {
            const { data, error } = await supabaseClient
                .from('categories')
                .select('*')
                .order('is_default', { ascending: false })
                .order('name');
            return { data, error };
        },

        async create(category) {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('categories')
                .insert({ ...category, user_id: user.id })
                .select()
                .single();
            return { data, error };
        },

        async delete(id) {
            const { data, error } = await supabaseClient
                .from('categories')
                .delete()
                .eq('id', id);
            return { data, error };
        }
    };

    // ========== TRANSACTIONS API ==========

    const transactionsAPI = {
        async getAll(filters = {}) {
            let query = supabaseClient
                .from('transactions')
                .select(`*, category:categories(id, name, icon, color)`)
                .order('date', { ascending: false });

            if (filters.startDate) query = query.gte('date', filters.startDate);
            if (filters.endDate) query = query.lte('date', filters.endDate);
            if (filters.type) query = query.eq('type', filters.type);
            if (filters.categoryId) query = query.eq('category_id', filters.categoryId);

            const { data, error } = await query;
            return { data, error };
        },

        async create(transaction) {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('transactions')
                .insert({ ...transaction, user_id: user.id })
                .select()
                .single();
            return { data, error };
        },

        async update(id, updates) {
            const { data, error } = await supabaseClient
                .from('transactions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            return { data, error };
        },

        async delete(id) {
            const { data, error } = await supabaseClient
                .from('transactions')
                .delete()
                .eq('id', id);
            return { data, error };
        }
    };

    // ========== BUDGETS API ==========

    const budgetsAPI = {
        async getByMonth(year, month) {
            const { data, error } = await supabaseClient
                .from('budgets')
                .select(`*, category:categories(id, name, icon, color)`)
                .eq('year', year)
                .eq('month', month);
            return { data, error };
        },

        async upsert(budget) {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('budgets')
                .upsert({ ...budget, user_id: user.id }, {
                    onConflict: 'user_id,category_id,month,year'
                })
                .select()
                .single();
            return { data, error };
        }
    };

    // ========== SAVINGS API ==========

    const savingsAPI = {
        async getAll() {
            const { data, error } = await supabaseClient
                .from('savings')
                .select('*')
                .order('deadline');
            return { data, error };
        },

        async create(savings) {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('savings')
                .insert({ ...savings, user_id: user.id })
                .select()
                .single();
            return { data, error };
        },

        async update(id, updates) {
            const { data, error } = await supabaseClient
                .from('savings')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            return { data, error };
        },

        async delete(id) {
            const { data, error } = await supabaseClient
                .from('savings')
                .delete()
                .eq('id', id);
            return { data, error };
        },

        async addAmount(id, amount) {
            const { data: current } = await supabaseClient
                .from('savings')
                .select('current')
                .eq('id', id)
                .single();

            if (!current) return { data: null, error: 'Savings not found' };

            const { data, error } = await supabaseClient
                .from('savings')
                .update({ current: current.current + amount })
                .eq('id', id)
                .select()
                .single();
            return { data, error };
        }
    };

    // ========== EVENTS API ==========

    const eventsAPI = {
        async getAll(includeArchived = false) {
            let query = supabaseClient
                .from('events')
                .select(`*, items:event_items(*)`)
                .order('date');

            if (!includeArchived) {
                query = query.eq('archived', false);
            }

            const { data, error } = await query;
            return { data, error };
        },

        async create(event) {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('events')
                .insert({ ...event, user_id: user.id })
                .select()
                .single();
            return { data, error };
        },

        async update(id, updates) {
            const { data, error } = await supabaseClient
                .from('events')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            return { data, error };
        },

        async delete(id) {
            const { data, error } = await supabaseClient
                .from('events')
                .delete()
                .eq('id', id);
            return { data, error };
        },

        async archive(id) {
            return await this.update(id, { archived: true });
        }
    };

    // ========== EVENT ITEMS API ==========

    const eventItemsAPI = {
        async create(eventId, item) {
            const { data, error } = await supabaseClient
                .from('event_items')
                .insert({ ...item, event_id: eventId })
                .select()
                .single();
            return { data, error };
        },

        async update(id, updates) {
            const { data, error } = await supabaseClient
                .from('event_items')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            return { data, error };
        },

        async delete(id) {
            const { data, error } = await supabaseClient
                .from('event_items')
                .delete()
                .eq('id', id);
            return { data, error };
        },

        async togglePaid(id, isPaid) {
            return await this.update(id, { is_paid: isPaid });
        }
    };

    // ========== TELEGRAM SYNC API ==========

    const telegramAPI = {
        // Get pending (unsynced) transactions from Telegram
        async getPending() {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('synced', false)
                .order('created_at', { ascending: true });
            return { data, error };
        },

        // Mark transactions as synced
        async markSynced(ids) {
            const { data, error } = await supabaseClient
                .from('telegram_transactions')
                .update({ synced: true })
                .in('id', ids);
            return { data, error };
        },

        // Link Telegram account
        async linkTelegram(telegramUserId, telegramUsername) {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_user_links')
                .upsert({
                    user_id: user.id,
                    telegram_user_id: telegramUserId,
                    telegram_username: telegramUsername
                }, { onConflict: 'user_id' })
                .select()
                .single();
            return { data, error };
        },

        // Get linked Telegram account
        async getLinkedAccount() {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_user_links')
                .select('*')
                .eq('user_id', user.id)
                .single();
            return { data, error };
        },

        // Unlink Telegram account
        async unlinkTelegram() {
            const { user } = await authAPI.getUser();
            if (!user) return { data: null, error: 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_user_links')
                .delete()
                .eq('user_id', user.id);
            return { data, error };
        }
    };

    // ========== EXPORT TO GLOBAL ==========

    window.FinansialKuAPI = {
        supabase: supabaseClient,
        auth: authAPI,
        profiles: profilesAPI,
        categories: categoriesAPI,
        transactions: transactionsAPI,
        budgets: budgetsAPI,
        savings: savingsAPI,
        events: eventsAPI,
        eventItems: eventItemsAPI,
        telegram: telegramAPI
    };

    console.log('FinansialKu Supabase API loaded');
})();
