import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, resetSupabaseClient } from './client';
import { createAuthAPI } from './auth';
import { createProfilesAPI } from './profiles';
import { createCategoriesAPI } from './categories';
import { createTransactionsAPI } from './transactions';
import { createBudgetsAPI } from './budgets';
import { createSavingsAPI } from './savings';
import { createEventsAPI, createEventItemsAPI, createEventIncomesAPI } from './events';
import { createDebtsAPI } from './debts';
import { createAccountsAPI } from './accounts';
import { createMembersAPI } from './members';
import { createTelegramAPI, createTelegramGroupAPI } from './telegram';
import { createWhatsAppAPI } from './whatsapp';
import { createSubscriptionAPI } from './subscription';
import { createWorkspacesAPI } from './workspaces';
import { createFeaturesAPI } from './features';
import { createShoppingPlansAPI } from './shoppingPlans';
import { createInvestmentAssetsAPI } from './investmentAssets';

/**
 * Create the full Karsafin API object.
 * This is the main entry point for all Supabase operations.
 *
 * @example
 * ```ts
 * import { createKarsafinAPI } from '@karsafin/shared';
 *
 * const api = createKarsafinAPI();
 * const { data, error } = await api.transactions.getAll();
 * ```
 */
export function createKarsafinAPI(supabase?: SupabaseClient) {
  const client = supabase || getSupabaseClient();

  return {
    /** The underlying Supabase client */
    supabase: client,
    /** Authentication operations */
    auth: createAuthAPI(client),
    /** User profile operations */
    profiles: createProfilesAPI(client),
    /** Category management */
    categories: createCategoriesAPI(client),
    /** Transaction CRUD with filters */
    transactions: createTransactionsAPI(client),
    /** Budget management by month */
    budgets: createBudgetsAPI(client),
    /** Savings goals management */
    savings: createSavingsAPI(client),
    /** Event planning */
    events: createEventsAPI(client),
    /** Event items (costs) */
    eventItems: createEventItemsAPI(client),
    /** Event income sources */
    eventIncomes: createEventIncomesAPI(client),
    /** Debt tracking */
    debts: createDebtsAPI(client),
    /** Financial account management */
    accounts: createAccountsAPI(client),
    /** Account members (family) */
    members: createMembersAPI(client),
    /** WhatsApp integration */
    whatsapp: createWhatsAppAPI(client),
    /** Telegram integration */
    telegram: createTelegramAPI(client),
    /** Telegram group integration */
    telegramGroup: createTelegramGroupAPI(client),
    /** Messaging Usage */
    messaging: {
      getUsage: async () => ({ data: { wa_count: 0, telegram_count: 0, total_count: 0 }, error: null })
    },
    /** Subscriptions */
    subscription: createSubscriptionAPI(client),
    /** Workspaces */
    workspaces: createWorkspacesAPI(client),
    /** User-created features (Kreasi User) */
    features: createFeaturesAPI(client),
    /** Shopping plans planning module */
    shoppingPlans: createShoppingPlansAPI(client),
    /** Investment assets portfolio module */
    investmentAssets: createInvestmentAssetsAPI(client),
  };
}

export type KarsafinAPI = ReturnType<typeof createKarsafinAPI>;

// Re-export individual API creators for granular usage
export { getSupabaseClient, resetSupabaseClient } from './client';
export { createAuthAPI } from './auth';
export { createProfilesAPI } from './profiles';
export { createCategoriesAPI } from './categories';
export { createTransactionsAPI } from './transactions';
export { createBudgetsAPI } from './budgets';
export { createSavingsAPI } from './savings';
export { createEventsAPI, createEventItemsAPI, createEventIncomesAPI } from './events';
export { createShoppingPlansAPI } from './shoppingPlans';
export { createDebtsAPI } from './debts';
export { createAccountsAPI } from './accounts';
export { createMembersAPI } from './members';
export { createTelegramAPI, createTelegramGroupAPI } from './telegram';
export { createWhatsAppAPI } from './whatsapp';
export { createSubscriptionAPI } from './subscription';
export { workspaceContext } from './workspaceContext';

