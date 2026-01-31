// FinansialKu - Supabase Client & API
// IIFE to avoid global scope pollution

(function () {
    'use strict';

    const SUPABASE_URL = 'https://neeawjydtdcubwrklnua.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZWF3anlkdGRjdWJ3cmtsbnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDcxODMsImV4cCI6MjA4NDAyMzE4M30._XeWSMSZvTH2Q6Tr7Or8kBaKtkXsV35TfljLfUnZfhA';

    // Initialize Supabase client with custom options
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        },
        global: {
            headers: {
                'X-Client-Info': 'finansialku-web'
            }
        }
    });

    // ========== AUTH FUNCTIONS ==========

    const authAPI = {
        async getUser() {
            try {
                const { data: { user }, error } = await supabaseClient.auth.getUser();
                return { data: { user }, error };
            } catch (err) {
                console.warn('Auth getUser failed:', err.message);
                return { data: { user: null }, error: err };
            }
        },

        async getSession() {
            try {
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                return { data: { session }, error };
            } catch (err) {
                console.warn('Auth getSession failed:', err.message);
                return { data: { session: null }, error: err };
            }
        },

        async signUp(email, password, name, phone) {
            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name,
                            phone
                        }
                    }
                });

                if (error) {
                    console.error('Registration error detail:', error);
                }

                return { data, error };
            } catch (err) {
                console.error('Registration exception:', err);
                return { data: null, error: err };
            }
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

        async updateUser(attributes) {
            const { data, error } = await supabaseClient.auth.updateUser(attributes);
            return { data, error };
        },

        onAuthStateChange(callback) {
            return supabaseClient.auth.onAuthStateChange(callback);
        }
    };

    // ========== PROFILE FUNCTIONS ==========

    const profilesAPI = {
        async get() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            return { data, error };
        },

        async update(updates) {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

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
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

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
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (filters.startDate) query = query.gte('date', filters.startDate);
            if (filters.endDate) query = query.lte('date', filters.endDate);
            if (filters.type) query = query.eq('type', filters.type);
            if (filters.categoryId) query = query.eq('category_id', filters.categoryId);

            const { data, error } = await query;
            return { data, error };
        },

        async create(transaction) {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

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
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

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
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

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
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

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
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

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
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

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
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_user_links')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle(); // Changed from .single() to handle no data gracefully
            return { data, error };
        },

        // Unlink Telegram account
        async unlinkTelegram() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_user_links')
                .delete()
                .eq('user_id', user.id);
            return { data, error };
        },

        // Generate verification code for Telegram linking
        async generateLinkCode() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            // Generate random 6-char code
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

            const { data, error } = await supabaseClient
                .from('telegram_link_codes')
                .insert({
                    user_id: user.id,
                    code: code,
                    expires_at: expiresAt
                })
                .select()
                .single();

            return { data, error };
        },

        // Get active link code (for display)
        async getActiveLinkCode() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_link_codes')
                .select('*')
                .eq('user_id', user.id)
                .eq('used', false)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(); // Changed from .single()

            return { data, error };
        }
    };

    // ========== TELEGRAM GROUP SYNC API ==========

    const telegramGroupAPI = {
        // Link a Telegram group to user account
        async linkGroup(telegramGroupId, groupName) {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_group_links')
                .upsert({
                    user_id: user.id,
                    telegram_group_id: telegramGroupId,
                    group_name: groupName
                }, { onConflict: 'telegram_group_id' })
                .select()
                .single();
            return { data, error };
        },

        // Get all linked Telegram groups for current user
        async getLinkedGroups() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_group_links')
                .select('*')
                .eq('user_id', user.id)
                .order('linked_at', { ascending: false });
            return { data, error };
        },

        // Unlink a Telegram group
        async unlinkGroup(telegramGroupId) {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('telegram_group_links')
                .delete()
                .eq('user_id', user.id)
                .eq('telegram_group_id', telegramGroupId);
            return { data, error };
        },

        // Check if a group is linked (used by sync server)
        async getGroupOwner(telegramGroupId) {
            const { data, error } = await supabaseClient
                .from('telegram_group_links')
                .select('user_id, group_name')
                .eq('telegram_group_id', telegramGroupId)
                .single();
            return { data, error };
        }
    };

    // ========== WHATSAPP SYNC API ==========

    const whatsappAPI = {
        // Get pending (unsynced) transactions from WhatsApp
        async getPending() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('whatsapp_transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('synced', false)
                .order('created_at', { ascending: true });
            return { data, error };
        },

        // Mark transactions as synced
        async markSynced(ids) {
            const { data, error } = await supabaseClient
                .from('whatsapp_transactions')
                .update({ synced: true })
                .in('id', ids);
            return { data, error };
        },

        // Link WhatsApp phone number
        async linkPhone(phoneNumber, displayName) {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            // Normalize phone number (remove + and spaces)
            const normalizedPhone = phoneNumber.replace(/[\s\-\+]/g, '');

            const { data, error } = await supabaseClient
                .from('whatsapp_user_links')
                .upsert({
                    user_id: user.id,
                    phone_number: normalizedPhone,
                    display_name: displayName || null
                }, { onConflict: 'user_id' })
                .select()
                .single();
            return { data, error };
        },

        // Get linked WhatsApp account
        async getLinkedAccount() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('whatsapp_user_links')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
            return { data, error };
        },

        // Unlink WhatsApp account
        async unlinkPhone() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('whatsapp_user_links')
                .delete()
                .eq('user_id', user.id);
            return { data, error };
        },

        // Link a WhatsApp group to user account
        async linkGroup(groupId, groupName) {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('whatsapp_group_links')
                .upsert({
                    user_id: user.id,
                    group_id: groupId,
                    group_name: groupName || null
                }, { onConflict: 'user_id,group_id' })
                .select()
                .single();
            return { data, error };
        },

        // Get all linked WhatsApp groups for current user
        async getLinkedGroups() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('whatsapp_group_links')
                .select('*')
                .eq('user_id', user.id)
                .order('linked_at', { ascending: false });
            return { data, error };
        },

        // Unlink a WhatsApp group
        async unlinkGroup(groupId) {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('whatsapp_group_links')
                .delete()
                .eq('user_id', user.id)
                .eq('group_id', groupId);
            return { data, error };
        }
    };


    const debtsAPI = {
        async getAll() {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('debts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            return { data, error };
        },

        async create(debt) {
            const { data: authData, error: authError } = await authAPI.getUser();
            const user = authData?.user;
            if (authError || !user) return { data: null, error: authError || 'Not authenticated' };

            const { data, error } = await supabaseClient
                .from('debts')
                .insert([{ ...debt, user_id: user.id }])
                .select()
                .single();
            return { data, error };
        },

        async update(id, updates) {
            const { data, error } = await supabaseClient
                .from('debts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            return { data, error };
        },

        async delete(id) {
            const { error } = await supabaseClient
                .from('debts')
                .delete()
                .eq('id', id);
            return { error };
        }
    };

    // ========== SUBSCRIPTION API ==========

    const subscriptionAPI = {
        // Get all subscription plans
        async getPlans() {
            const { data, error } = await supabaseClient
                .from('subscription_plans')
                .select('*')
                .order('price', { ascending: true });
            return { data, error };
        },

        // Check current subscription status
        async checkStatus() {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    return {
                        data: null,
                        error: new Error('Not authenticated')
                    };
                }

                const response = await fetch(
                    `${supabaseClient.supabaseUrl}/functions/v1/check-subscription`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    return { data: null, error: new Error(data.error || 'Failed to check subscription') };
                }

                return { data, error: null };
            } catch (error) {
                return { data: null, error };
            }
        },

        // Create payment for a plan (returns Midtrans token)
        async createPayment(planId) {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    return { data: null, error: new Error('Not authenticated') };
                }

                const user = session.user;

                const response = await fetch(
                    `${supabaseClient.supabaseUrl}/functions/v1/create-payment`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            plan_id: planId,
                            user_id: user.id,
                            user_email: user.email,
                            user_name: user.user_metadata?.name || user.email?.split('@')[0],
                        }),
                    }
                );

                const data = await response.json();

                if (!data.success) {
                    return { data: null, error: new Error(data.error || 'Failed to create payment') };
                }

                return { data, error: null };
            } catch (error) {
                return { data: null, error };
            }
        },

        // Get messaging usage for current month
        async getMessagingUsage() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return { data: null, error: new Error('Not authenticated') };

            const { data, error } = await supabaseClient
                .rpc('get_messaging_usage', { p_user_id: user.id });

            return { data: data?.[0] || { wa_count: 0, telegram_count: 0, total_count: 0 }, error };
        },

        // Increment messaging count (called after WA/Telegram transaction)
        async incrementMessagingCount(type) { // 'wa' or 'telegram'
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return { data: null, error: new Error('Not authenticated') };

            const { data, error } = await supabaseClient
                .rpc('increment_messaging_count', {
                    p_user_id: user.id,
                    p_type: type
                });

            return { data, error };
        },

        // Get payment history
        async getPaymentHistory() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return { data: null, error: new Error('Not authenticated') };

            const { data, error } = await supabaseClient
                .from('payment_transactions')
                .select('*, subscription_plans(name)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            return { data, error };
        },

        // Get user's subscription history
        async getSubscriptionHistory() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return { data: null, error: new Error('Not authenticated') };

            const { data, error } = await supabaseClient
                .from('subscriptions')
                .select('*, subscription_plans(name, price)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

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
        telegram: telegramAPI,
        telegramGroup: telegramGroupAPI,
        whatsapp: whatsappAPI,
        debts: debtsAPI,
        subscription: subscriptionAPI
    };

    console.log('FinansialKu Supabase API loaded');
})();
