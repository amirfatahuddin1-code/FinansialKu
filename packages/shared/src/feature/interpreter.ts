import type { DSLQuery, DSLCondition, DSLExpression } from '../types';

const MAX_EXECUTION_MS = 500;
const MAX_RECORDS = 1000;

function withTimeout<T>(fn: () => T, timeoutMs: number): T {
  const start = Date.now();
  const result = fn();
  if (Date.now() - start > timeoutMs) {
    throw new Error(`Execution timed out after ${timeoutMs}ms`);
  }
  return result;
}

function matchesCondition(item: Record<string, unknown>, condition: DSLCondition): boolean {
  for (const [key, value] of Object.entries(condition)) {
    if (key === '$and') {
      if (!Array.isArray(value)) return false;
      if (!(value as unknown[]).every((cond) => matchesCondition(item, cond as DSLCondition))) return false;
      continue;
    }

    if (key === '$or') {
      if (!Array.isArray(value)) return false;
      if (!(value as unknown[]).some((cond) => matchesCondition(item, cond as DSLCondition))) return false;
      continue;
    }

    if (key === '$not') {
      if (matchesCondition(item, value as DSLCondition)) return false;
      continue;
    }

    if (key.startsWith('$')) continue;

    const itemValue = getNestedValue(item, key);

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const operators = value as Record<string, unknown>;
      for (const [op, opVal] of Object.entries(operators)) {
        if (op === '$eq') { if (itemValue !== opVal) return false; continue; }
        if (op === '$ne') { if (itemValue === opVal) return false; continue; }
        if (op === '$contains') {
          if (typeof itemValue !== 'string' || !itemValue.toLowerCase().includes(String(opVal).toLowerCase())) return false;
          continue;
        }
        if (op === '$in') {
          if (!Array.isArray(opVal) || !(opVal as unknown[]).includes(itemValue)) return false;
          continue;
        }
        if (op === '$nin') {
          if (Array.isArray(opVal) && (opVal as unknown[]).includes(itemValue)) return false;
          continue;
        }

        if (typeof itemValue === 'string' && typeof opVal === 'string') {
          if (op === '$gte') { if (!(itemValue >= opVal)) return false; }
          else if (op === '$lte') { if (!(itemValue <= opVal)) return false; }
          else if (op === '$gt') { if (!(itemValue > opVal)) return false; }
          else if (op === '$lt') { if (!(itemValue < opVal)) return false; }
        } else {
          const iv = Number(itemValue) || 0;
          const ov = Number(opVal) || 0;
          if (op === '$gte') { if (!(iv >= ov)) return false; }
          else if (op === '$lte') { if (!(iv <= ov)) return false; }
          else if (op === '$gt') { if (!(iv > ov)) return false; }
          else if (op === '$lt') { if (!(iv < ov)) return false; }
        }
      }
    } else {
      if (itemValue !== value) return false;
    }
  }
  return true;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function applyAggregation(data: Record<string, unknown>[], expr: DSLExpression): number {
  const items = expr.operands || [];
  if (expr.$operator === '$sum') {
    if (typeof items[0] === 'string') {
      return data.reduce((sum, item) => sum + (Number(getNestedValue(item, items[0] as string)) || 0), 0);
    }
    return data.reduce((sum, item) => sum + (Number(item[items[0] as string]) || 0), 0);
  }
  if (expr.$operator === '$avg') {
    const values = data.map((item) => Number(getNestedValue(item, items[0] as string)) || 0);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }
  if (expr.$operator === '$count') {
    return data.length;
  }
  if (expr.$operator === '$min') {
    return Math.min(...data.map((item) => Number(getNestedValue(item, items[0] as string)) || 0));
  }
  if (expr.$operator === '$max') {
    return Math.max(...data.map((item) => Number(getNestedValue(item, items[0] as string)) || 0));
  }
  return 0;
}

export function evaluateCondition(item: Record<string, unknown>, condition: DSLCondition): boolean {
  return withTimeout(() => matchesCondition(item, condition), MAX_EXECUTION_MS);
}

export function computeExpression(context: Record<string, unknown>, expr: DSLExpression): unknown {
  return withTimeout(() => {
    const { $operator, operands } = expr;
    const values = operands.map((op: unknown) => {
      if (typeof op === 'string' && op.startsWith('$')) {
        const resolved = context[op.slice(1)];
        return resolved !== undefined ? resolved : op;
      }
      if (typeof op === 'object' && op !== null && '$operator' in (op as Record<string, unknown>)) {
        return computeExpression(context, op as DSLExpression);
      }
      return op;
    });

    switch ($operator) {
      case '$add': return (values as number[]).reduce((a: number, b: number) => a + b, 0);
      case '$subtract': return (values[0] as number) - (values[1] as number);
      case '$multiply': return (values as number[]).reduce((a: number, b: number) => a * b, 1);
      case '$divide': return values[1] !== 0 ? (values[0] as number) / (values[1] as number) : 0;
      case '$percent': return (values[0] as number) / (values[1] as number) * 100;
      case '$concat': return (values as string[]).join('');
      default: return null;
    }
  }, MAX_EXECUTION_MS);
}

export function executeQuery(data: Record<string, unknown>[], query: DSLQuery): { result: unknown[]; error: string | null } {
  try {
    return withTimeout(() => {
      let result = [...data];

      if (result.length > MAX_RECORDS) {
        result = result.slice(0, MAX_RECORDS);
      }

      if (query.filter) {
        result = result.filter((item) => matchesCondition(item, query.filter!));
      }

      if (query.sort) {
        const [key, order] = Object.entries(query.sort!)[0];
        result.sort((a, b) => {
          const va = Number(getNestedValue(a, key)) || 0;
          const vb = Number(getNestedValue(b, key)) || 0;
          return order === 'desc' ? vb - va : va - vb;
        });
      }

      if (query.limit && query.limit > 0) {
        result = result.slice(0, query.limit);
      }

      if (query.aggregate) {
        const aggResult = applyAggregation(result, query.aggregate);
        return { result: [{ _aggregate: aggResult }], error: null };
      }

      if (query.compute) {
        result = result.map((item) => {
          const computed: Record<string, unknown> = {};
          for (const [key, expr] of Object.entries(query.compute!)) {
            const e = expr as unknown as Record<string, unknown>;
            if (e.$operator) {
              computed[key] = computeExpression(item, e as any);
            } else {
              const op = Object.keys(e)[0];
              const operand = e[op];
              if (op === '$sum' && typeof operand === 'string') {
                computed[key] = item[operand] || 0;
              } else if (op === '$count') {
                computed[key] = 1;
              } else {
                computed[key] = typeof operand === 'number' ? operand : (item[operand as string] || 0);
              }
            }
          }
          return { ...item, ...computed };
        });
      }

      if (query.group_by && query.group_by.length > 0) {
        const groups: Record<string, { key: string; items: Record<string, unknown>[] }> = {};
        for (const item of result) {
          const groupKey = query.group_by.map((g) => String(getNestedValue(item, g))).join('|');
          if (!groups[groupKey]) {
            groups[groupKey] = { key: groupKey, items: [] };
          }
          groups[groupKey].items.push(item);
        }
        result = Object.values(groups).map((group) => {
          const groupItem: Record<string, unknown> = { _groupKey: group.key };
          for (const g of query.group_by!) {
            const val = getNestedValue(group.items[0], g);
            groupItem[g] = val;
          }
          if (query.aggregate) {
            groupItem._aggregate = applyAggregation(group.items, query.aggregate);
          }
          return groupItem;
        });
      }

      return { result, error: null };
    }, MAX_EXECUTION_MS);
  } catch (err: any) {
    return { result: [], error: err.message || 'Unknown error during query execution' };
  }
}
