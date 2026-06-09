import type { BaseFeatureDefinition, DSLQuery, DSLCondition, FeatureType } from '../types';

const ALLOWED_DATA_SOURCES = ['transactions', 'budgets', 'savings', 'debts', 'events', 'categories', 'accounts'];
const ALLOWED_OPERATORS = ['$and', '$or', '$not', '$gte', '$lte', '$gt', '$lt', '$eq', '$ne', '$contains', '$in', '$nin', '$sum', '$avg', '$count', '$min', '$max'];
const ALLOWED_DISPLAY_TYPES = ['card', 'progress_card', 'list', 'pie_chart', 'bar_chart', 'number_with_icon'];
const ALLOWED_FEATURE_TYPES: FeatureType[] = ['dashboard_widget', 'smart_filter', 'notification_trigger', 'auto_rule', 'report_template', 'budget_strategy', 'custom_calc'];
const MAX_DEPTH = 8;
const MAX_QUERY_LIMIT = 1000;

function getDepth(obj: unknown, currentDepth = 0): number {
  if (currentDepth > MAX_DEPTH) return currentDepth;
  if (typeof obj !== 'object' || obj === null) return currentDepth;
  let maxDepth = currentDepth;
  for (const value of Object.values(obj as Record<string, unknown>)) {
    const d = getDepth(value, currentDepth + 1);
    if (d > maxDepth) maxDepth = d;
  }
  return maxDepth;
}

function validateDSLQuery(query: unknown, path: string): string[] {
  const errors: string[] = [];
  if (!query || typeof query !== 'object') {
    errors.push(`${path}: must be an object`);
    return errors;
  }

  const q = query as Record<string, unknown>;

  if (typeof q.from !== 'string' || !ALLOWED_DATA_SOURCES.includes(q.from as string)) {
    errors.push(`${path}.from: must be one of ${ALLOWED_DATA_SOURCES.join(', ')}`);
  }

  if (q.filter !== undefined) {
    errors.push(...validateDSLCondition(q.filter, `${path}.filter`));
  }

  if (q.limit !== undefined) {
    if (typeof q.limit !== 'number' || q.limit < 1 || q.limit > MAX_QUERY_LIMIT) {
      errors.push(`${path}.limit: must be between 1 and ${MAX_QUERY_LIMIT}`);
    }
  }

  if (q.sort !== undefined) {
    if (typeof q.sort !== 'object' || q.sort === null) {
      errors.push(`${path}.sort: must be an object`);
    } else {
      for (const [key, val] of Object.entries(q.sort)) {
        if (val !== 'asc' && val !== 'desc') {
          errors.push(`${path}.sort.${key}: must be 'asc' or 'desc'`);
        }
      }
    }
  }

  return errors;
}

function validateDSLCondition(condition: unknown, path: string): string[] {
  const errors: string[] = [];
  if (!condition || typeof condition !== 'object') {
    errors.push(`${path}: must be an object`);
    return errors;
  }

  const cond = condition as Record<string, unknown>;

  for (const [key, value] of Object.entries(cond)) {
    if (key.startsWith('$')) {
      if (!ALLOWED_OPERATORS.includes(key)) {
        errors.push(`${path}.${key}: operator not allowed`);
        continue;
      }
      if (key === '$and' || key === '$or') {
        if (!Array.isArray(value)) {
          errors.push(`${path}.${key}: must be an array of conditions`);
        } else {
          (value as unknown[]).forEach((item, i) => {
            errors.push(...validateDSLCondition(item, `${path}.${key}[${i}]`));
          });
        }
      }
    }
  }

  return errors;
}

function validateDisplayConfig(display: unknown, path: string): string[] {
  const errors: string[] = [];
  if (!display || typeof display !== 'object') {
    errors.push(`${path}: must be an object`);
    return errors;
  }

  const d = display as Record<string, unknown>;

  if (typeof d.type !== 'string' || !ALLOWED_DISPLAY_TYPES.includes(d.type as string)) {
    errors.push(`${path}.type: must be one of ${ALLOWED_DISPLAY_TYPES.join(', ')}`);
  }

  if (d.icon !== undefined && typeof d.icon !== 'string') {
    errors.push(`${path}.icon: must be a string`);
  }

  if (d.label !== undefined && typeof d.label !== 'string') {
    errors.push(`${path}.label: must be a string`);
  }

  if (d.color !== undefined && typeof d.color !== 'string') {
    errors.push(`${path}.color: must be a string`);
  }

  return errors;
}

export function validateFeatureDefinition(def: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!def || typeof def !== 'object') {
    return { valid: false, errors: ['Definition must be an object'] };
  }

  const d = def as Record<string, unknown>;

  if (typeof d.version !== 'number' || d.version < 1) {
    errors.push('version: must be a positive number');
  }

  if (typeof d.type !== 'string' || !ALLOWED_FEATURE_TYPES.includes(d.type as FeatureType)) {
    errors.push(`type: must be one of ${ALLOWED_FEATURE_TYPES.join(', ')}`);
  }

  if (typeof d.name !== 'string' || d.name.trim().length === 0) {
    errors.push('name: must be a non-empty string');
  }

  if (typeof d.name === 'string' && d.name.length > 100) {
    errors.push('name: must be 100 characters or less');
  }

  const depth = getDepth(def);
  if (depth > MAX_DEPTH) {
    errors.push(`definition depth exceeds maximum of ${MAX_DEPTH}`);
  }

  const featureType = d.type as string;

  if (featureType === 'dashboard_widget') {
    const widget = def as any;
    if (!['dashboard', 'analysis', 'planning'].includes(widget.placement)) {
      errors.push('placement: must be dashboard, analysis, or planning');
    }
    if (!['on_focus', 'realtime', 'manual'].includes(widget.refresh)) {
      errors.push('refresh: must be on_focus, realtime, or manual');
    }
    errors.push(...validateDSLQuery(widget.query, 'query'));
    errors.push(...validateDisplayConfig(widget.display, 'display'));
  }

  if (featureType === 'smart_filter') {
    const filter = def as any;
    errors.push(...validateDSLQuery(filter.query, 'query'));
    if (filter.icon && typeof filter.icon !== 'string') errors.push('icon: must be a string');
    if (filter.color && typeof filter.color !== 'string') errors.push('color: must be a string');
  }

  if (featureType === 'auto_rule') {
    const rule = def as any;
    if (!['on_transaction_created', 'on_schedule_daily', 'on_income_received'].includes(rule.trigger)) {
      errors.push('trigger: invalid value');
    }
    if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
      errors.push('actions: must be a non-empty array');
    }
    if (typeof rule.max_daily_executions !== 'number' || rule.max_daily_executions < 1 || rule.max_daily_executions > 100) {
      errors.push('max_daily_executions: must be between 1 and 100');
    }
  }

  if (featureType === 'report_template') {
    const report = def as any;
    if (!Array.isArray(report.sections) || report.sections.length === 0) {
      errors.push('sections: must be a non-empty array');
    }
  }

  return { valid: errors.length === 0, errors };
}
