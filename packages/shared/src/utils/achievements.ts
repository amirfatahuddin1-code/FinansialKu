/**
 * Achievements (Pencapaian) — Shared Logic
 * 
 * Computes user achievements from transaction and budget data.
 * All 12 achievements are calculated on-the-fly without additional database tables.
 */

// ========== Types ==========

export type AchievementCategory = 'streak' | 'savings' | 'budget' | 'milestone';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  target: number;
}

export interface AchievementResult {
  definition: AchievementDefinition;
  current: number;
  unlocked: boolean;
}

export interface StreakInfo {
  current: number;
  best: number;
}

export interface AchievementsSummary {
  totalAchievements: number;
  unlockedCount: number;
  percentage: number;
  recordingStreak: StreakInfo;
  noSpendStreak: StreakInfo;
  totalTransactions: number;
  achievements: AchievementResult[];
}

// ========== Achievement Definitions ==========

export const ACHIEVEMENT_CATEGORIES: { key: AchievementCategory; label: string; icon: string }[] = [
  { key: 'streak', label: 'Streak Pencatatan', icon: '📅' },
  { key: 'savings', label: 'Tantangan Hemat', icon: '💰' },
  { key: 'budget', label: 'Master Anggaran', icon: '📊' },
  { key: 'milestone', label: 'Milestone Transaksi', icon: '📝' },
];

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Streak Pencatatan (4)
  { id: 'streak_3', name: 'Streak 3 Hari', description: 'Mencatat transaksi 3 hari berturut-turut', category: 'streak', icon: '🔥', target: 3 },
  { id: 'streak_7', name: 'Pejuang Mingguan', description: 'Mencatat transaksi 7 hari berturut-turut', category: 'streak', icon: '⚡', target: 7 },
  { id: 'streak_14', name: 'Juara Dua Minggu', description: 'Mencatat transaksi 14 hari berturut-turut', category: 'streak', icon: '🏅', target: 14 },
  { id: 'streak_30', name: 'Master Bulanan', description: 'Mencatat transaksi 30 hari berturut-turut', category: 'streak', icon: '🏆', target: 30 },

  // Tantangan Hemat (3)
  { id: 'nospend_1', name: 'Hari Tanpa Belanja', description: 'Sehari penuh tanpa pengeluaran', category: 'savings', icon: '💚', target: 1 },
  { id: 'nospend_3', name: 'Trio Hemat', description: '3 hari berturut-turut tanpa pengeluaran', category: 'savings', icon: '💪', target: 3 },
  { id: 'nospend_7', name: 'Seminggu Hemat', description: '7 hari berturut-turut tanpa pengeluaran', category: 'savings', icon: '🌟', target: 7 },

  // Master Anggaran (3)
  { id: 'budget_1', name: 'Disiplin Pertama', description: 'Tidak melebihi anggaran selama 1 bulan', category: 'budget', icon: '📋', target: 1 },
  { id: 'budget_3', name: 'Disiplin Konsisten', description: 'Tidak melebihi anggaran 3 bulan berturut-turut', category: 'budget', icon: '🎯', target: 3 },
  { id: 'budget_6', name: 'Pengelola Ulung', description: 'Tidak melebihi anggaran 6 bulan berturut-turut', category: 'budget', icon: '👑', target: 6 },

  // Milestone Transaksi (2)
  { id: 'txn_50', name: 'Pencatat Pemula', description: 'Mencatat 50 transaksi', category: 'milestone', icon: '📖', target: 50 },
  { id: 'txn_200', name: 'Pencatat Aktif', description: 'Mencatat 200 transaksi', category: 'milestone', icon: '🚀', target: 200 },
];

// ========== Computation Functions ==========

interface SimpleTransaction {
  date: string;
  type: string;
}

interface SimpleBudget {
  category_id: string;
  amount: number;
  month: number;
  year: number;
}

/**
 * Compute the recording streak (consecutive days with at least one transaction).
 * Returns current streak and best streak.
 */
export function computeRecordingStreak(transactions: SimpleTransaction[]): StreakInfo {
  if (!transactions || transactions.length === 0) return { current: 0, best: 0 };

  // Get unique dates with transactions, sorted descending
  const datesSet = new Set<string>();
  for (const tx of transactions) {
    const d = tx.date?.substring(0, 10);
    if (d) datesSet.add(d);
  }
  const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  if (sortedDates.length === 0) return { current: 0, best: 0 };

  // Check if today or yesterday is in the set (for current streak)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateISO(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateISO(yesterday);

  // Compute current streak (must include today or yesterday)
  let currentStreak = 0;
  if (datesSet.has(todayStr) || datesSet.has(yesterdayStr)) {
    const startDate = datesSet.has(todayStr) ? today : yesterday;
    let checkDate = new Date(startDate);
    while (datesSet.has(formatDateISO(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Compute best streak ever
  let bestStreak = 0;
  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currDate = new Date(sortedDates[i]);
    const nextDate = new Date(sortedDates[i + 1]);
    const diffMs = currDate.getTime() - nextDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
    } else {
      bestStreak = Math.max(bestStreak, streak);
      streak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, streak);

  return { current: Math.max(currentStreak, 0), best: Math.max(bestStreak, currentStreak) };
}

/**
 * Compute the no-spend streak (consecutive days without any expense transaction).
 * We look at days between the user's first transaction date and today.
 */
export function computeNoSpendStreak(transactions: SimpleTransaction[]): StreakInfo {
  if (!transactions || transactions.length === 0) return { current: 0, best: 0 };

  // Get dates with expense transactions
  const expenseDates = new Set<string>();
  for (const tx of transactions) {
    if (tx.type === 'expense') {
      const d = tx.date?.substring(0, 10);
      if (d) expenseDates.add(d);
    }
  }

  // Get the earliest transaction date and today
  const allDates = transactions.map(tx => tx.date?.substring(0, 10)).filter(Boolean).sort();
  if (allDates.length === 0) return { current: 0, best: 0 };
  const startDateStr = allDates[0]!;
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk from start to today, counting consecutive no-expense days
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;
  const checkDate = new Date(startDate);

  while (checkDate <= today) {
    const dateStr = formatDateISO(checkDate);
    if (!expenseDates.has(dateStr)) {
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  // Current streak: count back from today
  currentStreak = 0;
  const walkBack = new Date(today);
  while (!expenseDates.has(formatDateISO(walkBack)) && walkBack >= startDate) {
    currentStreak++;
    walkBack.setDate(walkBack.getDate() - 1);
  }

  return { current: currentStreak, best: Math.max(bestStreak, currentStreak) };
}

/**
 * Compute budget discipline: how many consecutive months the user stayed within budget.
 * A month is "within budget" if total expense spending <= total budget amounts for that month.
 */
export function computeBudgetDiscipline(
  transactions: (SimpleTransaction & { amount?: number })[],
  budgets: SimpleBudget[]
): number {
  if (!budgets || budgets.length === 0) return 0;

  // Group budgets by year-month
  const budgetByMonth = new Map<string, number>();
  for (const b of budgets) {
    const key = `${b.year}-${String(b.month).padStart(2, '0')}`;
    budgetByMonth.set(key, (budgetByMonth.get(key) || 0) + b.amount);
  }

  // Group expense transactions by year-month
  const expenseByMonth = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type === 'expense' && (tx as any).amount) {
      const d = tx.date?.substring(0, 7); // YYYY-MM
      if (d) expenseByMonth.set(d, (expenseByMonth.get(d) || 0) + (tx as any).amount);
    }
  }

  // Check consecutive months (from most recent backwards)
  const sortedMonths = Array.from(budgetByMonth.keys()).sort((a, b) => b.localeCompare(a));
  let consecutiveWithin = 0;
  for (const month of sortedMonths) {
    const budgetTotal = budgetByMonth.get(month) || 0;
    const spentTotal = expenseByMonth.get(month) || 0;
    if (spentTotal <= budgetTotal) {
      consecutiveWithin++;
    } else {
      break;
    }
  }

  return consecutiveWithin;
}

/**
 * Compute all achievements and return a full summary.
 */
export function computeAllAchievements(
  transactions: (SimpleTransaction & { amount?: number })[],
  budgets: SimpleBudget[]
): AchievementsSummary {
  const recordingStreak = computeRecordingStreak(transactions);
  const noSpendStreak = computeNoSpendStreak(transactions);
  const budgetDiscipline = computeBudgetDiscipline(transactions, budgets);
  const totalTransactions = transactions?.length || 0;

  const achievements: AchievementResult[] = ACHIEVEMENT_DEFINITIONS.map(def => {
    let current = 0;

    switch (def.category) {
      case 'streak':
        current = recordingStreak.best;
        break;
      case 'savings':
        current = noSpendStreak.best;
        break;
      case 'budget':
        current = budgetDiscipline;
        break;
      case 'milestone':
        current = totalTransactions;
        break;
    }

    return {
      definition: def,
      current: Math.min(current, def.target),
      unlocked: current >= def.target,
    };
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return {
    totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
    unlockedCount,
    percentage: ACHIEVEMENT_DEFINITIONS.length > 0
      ? Math.round((unlockedCount / ACHIEVEMENT_DEFINITIONS.length) * 100)
      : 0,
    recordingStreak,
    noSpendStreak,
    totalTransactions,
    achievements,
  };
}

// ========== Helpers ==========

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
