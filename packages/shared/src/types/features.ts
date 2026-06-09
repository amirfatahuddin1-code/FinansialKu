export type FeatureType =
  | 'dashboard_widget'
  | 'smart_filter'
  | 'notification_trigger'
  | 'auto_rule'
  | 'report_template'
  | 'budget_strategy'
  | 'custom_calc';

export interface BaseFeatureDefinition {
  version: number;
  name: string;
  description?: string;
}

export interface WidgetDefinition extends BaseFeatureDefinition {
  type: 'dashboard_widget';
  placement: 'dashboard' | 'analysis' | 'planning';
  refresh: 'on_focus' | 'realtime' | 'manual';
  query: DSLQuery;
  display: WidgetDisplayConfig;
}

export interface FilterDefinition extends BaseFeatureDefinition {
  type: 'smart_filter';
  query: DSLQuery;
  icon: string;
  color: string;
}

export interface NotificationDefinition extends BaseFeatureDefinition {
  type: 'notification_trigger';
  trigger: {
    event: 'on_transaction_added' | 'on_schedule' | 'on_percentage_reached';
    condition?: DSLCondition;
    schedule?: string;
  };
  action: {
    type: 'push_notification' | 'in_app_alert';
    title: string;
    body: string;
  };
  cooldown_hours?: number;
}

export interface AutoRuleDefinition extends BaseFeatureDefinition {
  type: 'auto_rule';
  trigger: 'on_transaction_created' | 'on_schedule_daily' | 'on_income_received';
  condition?: DSLCondition;
  actions: AutoAction[];
  max_daily_executions: number;
}

export interface ReportTemplateDefinition extends BaseFeatureDefinition {
  type: 'report_template';
  sections: ReportSection[];
}

export interface BudgetStrategyDefinition extends BaseFeatureDefinition {
  type: 'budget_strategy';
  allocation: AllocationRule[];
  period: 'monthly' | 'weekly' | 'biweekly';
}

export interface CustomCalcDefinition extends BaseFeatureDefinition {
  type: 'custom_calc';
  formula: DSLExpression;
  format: 'currency' | 'percentage' | 'number';
  dataSource: DSLQuery;
}

export interface DSLQuery {
  from: 'transactions' | 'budgets' | 'savings' | 'debts' | 'events' | 'categories' | 'accounts';
  filter?: DSLCondition;
  compute?: Record<string, DSLExpression>;
  aggregate?: DSLExpression;
  group_by?: string[];
  sort?: Record<string, 'asc' | 'desc'>;
  limit?: number;
}

export interface DSLCondition {
  [key: string]: unknown;
}

export interface DSLExpression {
  $operator: string;
  operands: unknown[];
}

export interface AutoAction {
  type: 'create_transaction' | 'update_savings_goal' | 'send_notification' | 'categorize_transaction';
  params: Record<string, unknown>;
}

export interface WidgetDisplayConfig {
  type: 'card' | 'progress_card' | 'list' | 'pie_chart' | 'bar_chart' | 'number_with_icon';
  icon: string;
  label: string;
  color: string;
  [key: string]: unknown;
}

export interface ReportSection {
  title: string;
  type: 'card' | 'card_highlight' | 'pie_chart' | 'bar_chart' | 'list' | 'table';
  data: DSLExpression | DSLQuery;
  format?: 'currency' | 'percentage' | 'number';
  color?: string;
}

export interface AllocationRule {
  category_name: string;
  type: 'percentage' | 'nominal';
  value: number;
  priority: number;
}

export interface UserFeature {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  feature_type: FeatureType;
  definition: BaseFeatureDefinition;
  version: number;
  is_enabled: boolean;
  error_count: number;
  last_error?: string;
  max_error_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeatureError {
  id: string;
  feature_id: string;
  error_message?: string;
  error_stack?: string;
  context?: Record<string, unknown>;
  created_at: string;
}

export type CreateFeatureInput = Pick<UserFeature, 'name' | 'description' | 'feature_type' | 'definition'> & {
  workspace_id?: string;
};

export type UpdateFeatureInput = Partial<Pick<UserFeature, 'name' | 'description' | 'definition' | 'is_enabled'>>;
