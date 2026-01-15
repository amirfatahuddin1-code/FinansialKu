// FinansialKu - Supabase Client & API
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials

const SUPABASE_URL = 'https://neeawjydtdcubwrklnua.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xc0jvwbvtWCubCGUtnJkwg_EdHTVO3S';

// Initialize Supabase client (using different name to avoid conflict with global)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== AUTH FUNCTIONS ==========

const auth = {
    // Get current user
    async getUser() {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        return { user, error };
    },

    // Get current session
    async getSession() {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        return { session, error };
    },

    // Sign up with email/password
    async signUp(email, password, name) {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });
        return { data, error };
    },

    // Sign in with email/password
    async signIn(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    // Sign in with Google
    async signInWithGoogle() {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });
        return { data, error };
    },

    // Sign out
    async signOut() {
        const { error } = await supabaseClient.auth.signOut();
        return { error };
    },

    // Listen to auth state changes
    onAuthStateChange(callback) {
        return supabaseClient.auth.onAuthStateChange(callback);
    }
};

// ========== PROFILE FUNCTIONS ==========

const profilesAPI = {
    async get() {
        const { user } = await auth.getUser();
        if (!user) return { data: null, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        return { data, error };
    },

    async update(updates) {
        const { user } = await auth.getUser();
        if (!user) return { data: null, error: 'Not authenticated' };

        const { data, error } = await supabase
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
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('is_default', { ascending: false })
            .order('name');
        return { data, error };
    },

    async create(category) {
        const { user } = await auth.getUser();
        if (!user) return { data: null, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('categories')
            .insert({ ...category, user_id: user.id })
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { data, error } = await supabase
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
            .select(`
                *,
                category:categories(id, name, icon, color)
            `)
            .order('date', { ascending: false });

        if (filters.startDate) {
            query = query.gte('date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('date', filters.endDate);
        }
        if (filters.type) {
            query = query.eq('type', filters.type);
        }
        if (filters.categoryId) {
            query = query.eq('category_id', filters.categoryId);
        }

        const { data, error } = await query;
        return { data, error };
    },

    async create(transaction) {
        const { user } = await auth.getUser();
        if (!user) return { data: null, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('transactions')
            .insert({ ...transaction, user_id: user.id })
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { data, error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);
        return { data, error };
    }
};

// ========== BUDGETS API ==========

const budgetsAPI = {
    async getByMonth(year, month) {
        const { data, error } = await supabase
            .from('budgets')
            .select(`
                *,
                category:categories(id, name, icon, color)
            `)
            .eq('year', year)
            .eq('month', month);
        return { data, error };
    },

    async upsert(budget) {
        const { user } = await auth.getUser();
        if (!user) return { data: null, error: 'Not authenticated' };

        const { data, error } = await supabase
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
        const { data, error } = await supabase
            .from('savings')
            .select('*')
            .order('deadline');
        return { data, error };
    },

    async create(savings) {
        const { user } = await auth.getUser();
        if (!user) return { data: null, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('savings')
            .insert({ ...savings, user_id: user.id })
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('savings')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { data, error } = await supabase
            .from('savings')
            .delete()
            .eq('id', id);
        return { data, error };
    },

    async addAmount(id, amount) {
        const { data: current } = await supabase
            .from('savings')
            .select('current')
            .eq('id', id)
            .single();

        if (!current) return { data: null, error: 'Savings not found' };

        const { data, error } = await supabase
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
            .select(`
                *,
                items:event_items(*)
            `)
            .order('date');

        if (!includeArchived) {
            query = query.eq('archived', false);
        }

        const { data, error } = await query;
        return { data, error };
    },

    async create(event) {
        const { user } = await auth.getUser();
        if (!user) return { data: null, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('events')
            .insert({ ...event, user_id: user.id })
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('events')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { data, error } = await supabase
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
        const { data, error } = await supabase
            .from('event_items')
            .insert({ ...item, event_id: eventId })
            .select()
            .single();
        return { data, error };
    },

    async update(id, updates) {
        const { data, error } = await supabase
            .from('event_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    },

    async delete(id) {
        const { data, error } = await supabase
            .from('event_items')
            .delete()
            .eq('id', id);
        return { data, error };
    },

    async togglePaid(id, isPaid) {
        return await this.update(id, { is_paid: isPaid });
    }
};

// ========== EXPORT ==========

window.FinansialKuAPI = {
    supabase: supabaseClient,
    auth,
    profiles: profilesAPI,
    categories: categoriesAPI,
    transactions: transactionsAPI,
    budgets: budgetsAPI,
    savings: savingsAPI,
    events: eventsAPI,
    eventItems: eventItemsAPI
};

console.log('FinansialKu Supabase API loaded');
