import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors, { useColors } from '@/constants/Colors';
import { Spacing, BorderRadius, Typography, Shadows } from '@/constants/DesignSystem';
import {
  computeAllAchievements,
  ACHIEVEMENT_CATEGORIES,
  type AchievementsSummary,
  type AchievementResult,
} from '@karsafin/shared';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';

export default function PencapaianScreen() {
  const router = useRouter();
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const colorScheme = useColorScheme() ?? 'dark';
  useColors();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<AchievementsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch transactions
      const txRes = await api.transactions.getAll();
      const transactions = txRes.data || [];

      // Fetch budgets from last 12 months
      const now = new Date();
      const budgetPromises = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        budgetPromises.push(api.budgets.getByMonth(d.getFullYear(), d.getMonth() + 1));
      }
      const budgetResults = await Promise.all(budgetPromises);
      const allBudgets = budgetResults.flatMap(r => r.data || []);

      const result = computeAllAchievements(transactions, allBudgets);
      setSummary(result);
    } catch (err) {
      console.error('Gagal memuat data pencapaian:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <FontAwesome name="chevron-left" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pencapaian</Text>
            <View style={{ width: 28 }} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Memuat pencapaian...
          </Text>
        </View>
      </View>
    );
  }

  const s = summary!;
  const percentage = s.percentage;

  const getAchievementsByCategory = (categoryKey: string): AchievementResult[] => {
    return s.achievements.filter(a => a.definition.category === categoryKey);
  };

  const getCategoryCount = (categoryKey: string) => {
    const items = getAchievementsByCategory(categoryKey);
    const unlocked = items.filter(a => a.unlocked).length;
    return { unlocked, total: items.length };
  };

  const getProgressColor = (achievement: AchievementResult) => {
    if (achievement.unlocked) return '#10b981';
    const ratio = achievement.current / achievement.definition.target;
    if (ratio >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <FontAwesome name="chevron-left" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pencapaian</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🏆</Text>
          <Text style={styles.heroCount}>
            {s.unlockedCount} / {s.totalAchievements}
          </Text>
          <Text style={styles.heroSubtitle}>Pencapaian Terbuka</Text>

          {/* Progress bar */}
          <View style={styles.heroProgressContainer}>
            <View style={styles.heroProgressBg}>
              <View style={[styles.heroProgressFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.heroPercentText}>{percentage}%</Text>
          </View>

          {/* Chips */}
          <View style={styles.heroChipsRow}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>
                🔥 {s.recordingStreak.current}h streak
              </Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>
                📝 {s.totalTransactions} txns
              </Text>
            </View>
          </View>
        </View>

        {/* Streak Saat Ini Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🔥 Streak Saat Ini
          </Text>
          <View style={styles.streakRow}>
            {/* Recording streak */}
            <View style={[styles.streakCard, styles.streakCardWarm]}>
              <Text style={styles.streakCardEmoji}>📅</Text>
              <Text style={styles.streakCardLabel}>Pencatatan</Text>
              <Text style={styles.streakCardValue}>
                {s.recordingStreak.current} <Text style={styles.streakCardUnit}>hari</Text>
              </Text>
              <Text style={styles.streakCardBest}>
                Terbaik: {s.recordingStreak.best} hari
              </Text>
            </View>

            {/* No-spend streak */}
            <View style={[styles.streakCard, styles.streakCardCool]}>
              <Text style={styles.streakCardEmoji}>💚</Text>
              <Text style={styles.streakCardLabel}>Tanpa Belanja</Text>
              <Text style={styles.streakCardValue}>
                {s.noSpendStreak.current} <Text style={styles.streakCardUnit}>hari</Text>
              </Text>
              <Text style={styles.streakCardBest}>
                Terbaik: {s.noSpendStreak.best} hari
              </Text>
            </View>
          </View>
        </View>

        {/* Achievement Categories */}
        {ACHIEVEMENT_CATEGORIES.map(category => {
          const items = getAchievementsByCategory(category.key);
          const count = getCategoryCount(category.key);
          return (
            <View key={category.key} style={styles.sectionContainer}>
              {/* Category header */}
              <View style={styles.categoryHeader}>
                <View style={styles.categoryHeaderLeft}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {category.label}
                  </Text>
                </View>
                <View style={[
                  styles.categoryBadge,
                  count.unlocked === count.total && count.total > 0
                    ? styles.categoryBadgeComplete
                    : { backgroundColor: colors.inputBg },
                ]}>
                  <Text style={[
                    styles.categoryBadgeText,
                    count.unlocked === count.total && count.total > 0
                      ? styles.categoryBadgeTextComplete
                      : { color: colors.textSecondary },
                  ]}>
                    {count.unlocked}/{count.total}
                  </Text>
                </View>
              </View>

              {/* Achievement cards */}
              {items.map(achievement => {
                const { definition, current, unlocked } = achievement;
                const progressRatio = definition.target > 0
                  ? Math.min(current / definition.target, 1)
                  : 0;

                return (
                  <View
                    key={definition.id}
                    style={[
                      styles.achievementCard,
                      {
                        backgroundColor: unlocked ? '#ecfdf5' : colors.card,
                        borderColor: unlocked ? '#a7f3d0' : colors.border,
                      },
                    ]}
                  >
                    {/* Icon */}
                    <View style={[
                      styles.achievementIconCircle,
                      {
                        backgroundColor: unlocked ? '#d1fae5' : colors.inputBg,
                      },
                    ]}>
                      <Text style={styles.achievementIconText}>
                        {definition.icon}
                      </Text>
                      {!unlocked && (
                        <View style={styles.lockOverlay}>
                          <Text style={styles.lockIcon}>🔒</Text>
                        </View>
                      )}
                    </View>

                    {/* Content */}
                    <View style={styles.achievementContent}>
                      <View style={styles.achievementTopRow}>
                        <Text
                          style={[
                            styles.achievementName,
                            { color: unlocked ? '#065f46' : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {definition.name}
                        </Text>
                        {unlocked && (
                          <View style={styles.unlockedBadge}>
                            <Text style={styles.unlockedBadgeText}>✅ Terbuka</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.achievementDesc,
                          { color: unlocked ? '#047857' : colors.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {definition.description}
                      </Text>

                      {/* Progress bar */}
                      <View style={styles.achievementProgressRow}>
                        <View style={[
                          styles.achievementProgressBg,
                          { backgroundColor: unlocked ? '#a7f3d0' : colors.inputBg },
                        ]}>
                          <View
                            style={[
                              styles.achievementProgressFill,
                              {
                                width: `${progressRatio * 100}%`,
                                backgroundColor: getProgressColor(achievement),
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.achievementProgressText,
                            { color: unlocked ? '#065f46' : colors.textMuted },
                          ]}
                        >
                          {current}/{definition.target}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: '#2d7a4f',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#2d7a4f',
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  heroEmoji: {
    fontSize: 48,
  },
  heroCount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginTop: Spacing.sm,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  heroProgressBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: BorderRadius.full,
  },
  heroPercentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fbbf24',
    minWidth: 36,
    textAlign: 'right',
  },
  heroChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Streak Section
  sectionContainer: {
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  streakRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  streakCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  streakCardWarm: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  streakCardCool: {
    backgroundColor: '#ccfbf1',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  streakCardEmoji: {
    fontSize: 28,
  },
  streakCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  streakCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: Spacing.xs,
  },
  streakCardUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  streakCardBest: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: Spacing.xs,
  },

  // Category header
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeComplete: {
    backgroundColor: '#d1fae5',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBadgeTextComplete: {
    color: '#065f46',
  },

  // Achievement card
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  achievementIconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  achievementIconText: {
    fontSize: 22,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  lockIcon: {
    fontSize: 10,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  achievementDesc: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    lineHeight: 16,
  },
  unlockedBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  unlockedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  achievementProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  achievementProgressBg: {
    flex: 1,
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  achievementProgressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
});
