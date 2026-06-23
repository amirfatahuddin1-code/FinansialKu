// ========== Common Types ==========
export interface ApiResponse<T> {
  data: T | null;
  error: Error | string | null;
}

// ========== Auth ==========
export interface SignUpOptions {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

// ========== Workspace ==========
export interface Workspace {
  id: string;
  name: string;
  type: 'personal' | 'family';
  owner_id: string;
  invite_code?: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

// ========== Profile ==========
export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  ai_quota: number;
  last_ai_reset?: string;
  telegram_quota?: number;
  last_telegram_reset?: string;
  whatsapp_quota?: number;
  last_whatsapp_reset?: string;
  created_at: string;
  updated_at?: string;
}

// ========== Category ==========
export interface Category {
  id: string;
  user_id: string | null;
  workspace_id?: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'savings' | 'investment';
  is_default: boolean;
  created_at: string;
}

export type CreateCategoryInput = Pick<Category, 'name' | 'icon' | 'color' | 'type'>;

// ========== Transaction ==========
export interface Transaction {
  id: string;
  user_id: string;
  workspace_id?: string;
  type: 'income' | 'expense' | 'savings' | 'investment';
  amount: number;
  description: string;
  date: string;
  category_id: string;
   account_id?: string;
   sender_name?: string;
   source?: string;
   savings_id?: string;
   destination_account_id?: string;
   debt_id?: string;
   created_at: string;
  // Joined
  category?: Category;
  account?: FinancialAccount;
  savings?: Savings;
  creator?: {
    id: string;
    name: string;
  };
  recorderName?: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense' | 'savings' | 'investment';
  categoryId?: string;
}

export type CreateTransactionInput = Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'category' | 'account'>;

// ========== Budget ==========
export interface Budget {
  id: string;
  user_id: string;
  workspace_id?: string;
  category_id: string;
  amount: number;
  mode: 'nominal' | 'percentage';
  percentage?: number;
  month: number;
  year: number;
  created_at: string;
  // Joined
  category?: Category;
}

export interface UpsertBudgetInput {
  category_id: string;
  amount: number;
  mode: 'nominal' | 'percentage';
  percentage?: number;
  month: number;
  year: number;
}

export interface BudgetWithRealization extends Budget {
  spent: number;
  percentage: number;
}

// ========== Savings ==========
export interface Savings {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  target: number;
  current: number;
  deadline?: string;
  color?: string;
  created_at: string;
}

export type CreateSavingsInput = Omit<Savings, 'id' | 'user_id' | 'created_at'>;

// ========== Event ==========
export interface Event {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  date: string;
  category?: string;
  budget: number;
  notes?: string;
  archived: boolean;
  created_at: string;
  // Joined
  items?: EventItem[];
  incomes?: EventIncome[];
}

export type CreateEventInput = Omit<Event, 'id' | 'user_id' | 'created_at' | 'items' | 'incomes'>;

export interface EventItem {
  id: string;
  event_id: string;
  name: string;
  category?: string;
  unit_price: number;
  qty: number;
  budget: number;
  actual: number;
  is_paid: boolean;
  notes?: string;
  created_at: string;
}

export type CreateEventItemInput = Omit<EventItem, 'id' | 'event_id' | 'created_at'>;

export interface EventIncome {
  id: string;
  event_id: string;
  source: string;
  amount: number;
  notes?: string;
  created_at: string;
}

export type CreateEventIncomeInput = Omit<EventIncome, 'id' | 'event_id' | 'created_at'>;

// ========== Debt ==========
export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Debt {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  type: 'payable' | 'receivable';
  amount: number;
  paid: number;
  counterpart: string;
  due_date?: string;
  notes?: string;
  status: 'unpaid' | 'paid';
  account_id?: string;
  payments?: DebtPayment[];
  created_at: string;
  // Joined
  account?: FinancialAccount;
}

export type CreateDebtInput = Omit<Debt, 'id' | 'user_id' | 'created_at' | 'account'>;

// ========== Financial Account ==========
export interface FinancialAccount {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  type: 'bank' | 'ewallet' | 'investment' | 'other';
  icon?: string;
  color?: string;
  is_default: boolean;
  balance: number;
  created_at: string;
}

export type CreateAccountInput = Omit<FinancialAccount, 'id' | 'user_id' | 'created_at'>;

// ========== Member ==========
export interface Member {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

// ========== Telegram ==========
export interface TelegramLink {
  id: string;
  user_id: string;
  telegram_user_id: string;
  telegram_username: string;
  created_at: string;
}

export interface TelegramLinkCode {
  id: string;
  user_id: string;
  code: string;
  used: boolean;
  expires_at: string;
  created_at: string;
}

export interface TelegramGroupLink {
  id: string;
  user_id: string;
  telegram_group_id: string;
  group_name: string;
  linked_at: string;
}

export interface TelegramTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_name?: string;
  synced: boolean;
  created_at: string;
}

// ========== WhatsApp ==========
export interface WhatsAppLink {
  id: string;
  user_id: string;
  phone_number: string;
  display_name?: string;
  created_at: string;
}

export interface WhatsAppGroupLink {
  id: string;
  user_id: string;
  group_id: string;
  group_name?: string;
  linked_at: string;
}

export interface WhatsAppTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_name?: string;
  synced: boolean;
  created_at: string;
}

// ========== Subscription ==========
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features?: string[];
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled';
  starts_at: string;
  expires_at: string;
  created_at: string;
  // Joined
  subscription_plans?: Pick<SubscriptionPlan, 'name' | 'price' | 'features'>;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  midtrans_order_id?: string;
  midtrans_token?: string;
  created_at: string;
  // Joined
  subscription_plans?: Pick<SubscriptionPlan, 'name'>;
}

export interface MessagingUsage {
  wa_count: number;
  telegram_count: number;
  total_count: number;
}

// ========== User Features (Kreasi User) ==========
export type {
  FeatureType,
  BaseFeatureDefinition,
  WidgetDefinition,
  FilterDefinition,
  NotificationDefinition,
  AutoRuleDefinition,
  ReportTemplateDefinition,
  BudgetStrategyDefinition,
  CustomCalcDefinition,
  DSLQuery,
  DSLCondition,
  DSLExpression,
  AutoAction,
  WidgetDisplayConfig,
  ReportSection,
  AllocationRule,
  UserFeature,
  FeatureError,
  CreateFeatureInput,
  UpdateFeatureInput,
} from './features';

// ========== Shopping Plan ==========
export interface ShoppingItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  isRealized: boolean;
  realizedAmount?: number;
  plannedName?: string;
  plannedQty?: number;
  plannedUnitPrice?: number;
  plannedTotal?: number;
}

export interface ShoppingPlan {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  date: string;
  type: 'daily' | 'monthly';
  items: ShoppingItem[];
  total_planned: number;
  total_realized: number;
  is_realized: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateShoppingPlanInput = Omit<ShoppingPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
