import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { formatCurrency, formatCurrencyCompact } from '@karsafin/shared';
import type { Transaction, Savings, Debt } from '@karsafin/shared';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { SkeletonCard, CategoryIcon, AccountIcon } from '@/components';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

export default function AnalysisScreen() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [txRes, savRes, debtRes] = await Promise.all([
        api.transactions.getAll(),
        api.savings.getAll(),
        api.debts.getAll(user.id),
      ]);
      setTransactions(txRes.data || []);
      setSavings(savRes.data || []);
      setDebts(debtRes.data || []);
    } catch (err) {
      console.error('Load analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!selectedMonth && transactions.length > 0) {
      const months = Array.from(new Set(transactions.map((t) => t.date?.substring(0, 7)))).sort();
      setSelectedMonth(months[months.length - 1] || '');
    }
  }, [transactions, selectedMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const monthLabel = (ym: string) => {
    if (!ym) return 'Pilih Bulan';
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      if (t.date) months.add(t.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const [year, month] = selectedMonth ? selectedMonth.split('-').map(Number) : [0, 0];
  const startDate = year ? new Date(year, month - 1, 1).toISOString().split('T')[0] : '';
  const endDate = year ? new Date(year, month, 0).toISOString().split('T')[0] : '';

  const monthlyTx = useMemo(
    () => transactions.filter(t => t.date >= startDate && t.date <= endDate),
    [transactions, startDate, endDate]
  );
  const monthlyIncome = monthlyTx.filter(t => t.type === 'income' && t.type !== 'savings').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = monthlyTx.filter(t => t.type === 'expense' && t.type !== 'savings').reduce((s, t) => s + t.amount, 0);
  const monthlyBalance = monthlyIncome - monthlyExpense;

  const allIncome = transactions.filter(t => t.type === 'income' && t.type !== 'savings').reduce((s, t) => s + t.amount, 0);
  const allExpense = transactions.filter(t => t.type === 'expense' && t.type !== 'savings').reduce((s, t) => s + t.amount, 0);

  // Category Expenses
  const catExpenses = monthlyTx.filter(t => t.type === 'expense' && t.type !== 'savings').reduce((acc, t) => {
    const cat = t.category?.name || 'Lainnya';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartColors = ['#0062ff', '#fdc003', '#007c98', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#6366f1'];
  const pieData = Object.entries(catExpenses).length > 0 
    ? Object.entries(catExpenses)
        .sort((a,b) => b[1] - a[1])
        .map(([name, amount], index) => ({
          value: amount,
          color: chartColors[index % chartColors.length],
          text: name,
        }))
    : [{ value: 1, color: '#e5e7eb', text: 'Kosong' }];

  const totalCatExpense = Object.values(catExpenses).reduce((a, b) => a + b, 0);

  // Account Expenses
  const accountExpenses = useMemo(() => {
    return monthlyTx.filter(t => t.type === 'expense' && t.type !== 'savings').reduce((acc, t) => {
      const accountName = t.account?.name || 'Tunai/Lainnya';
      const accountIcon = t.account?.icon || '💵';
      const accountType = t.account?.type || 'other';
      const accountId = t.account_id || 'none';

      if (!acc[accountId]) {
        acc[accountId] = {
          id: accountId,
          name: accountName,
          icon: accountIcon,
          type: accountType,
          amount: 0,
        };
      }
      acc[accountId].amount += t.amount;
      return acc;
    }, {} as Record<string, { id: string; name: string; icon: string; type: string; amount: number }>);
  }, [monthlyTx]);

  const accountPieData = useMemo(() => {
    const list = Object.values(accountExpenses);
    if (list.length === 0) {
      return [{ value: 1, color: '#e5e7eb', text: 'Kosong', icon: '💵', type: 'other' }];
    }
    return list
      .sort((a, b) => b.amount - a.amount)
      .map((item, index) => ({
        value: item.amount,
        color: chartColors[index % chartColors.length],
        text: item.name,
        icon: item.icon,
        type: item.type,
      }));
  }, [accountExpenses]);

  const totalAccountExpense = Object.values(accountExpenses).reduce((a, b) => a + b.amount, 0);

  // Monthly trend (last 6 months)
  const sixMonths = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return list;
  }, []);

  const barData = useMemo(() => {
    return sixMonths.map((ym, i) => {
      const [y, m] = ym.split('-').map(Number);
      const s = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const e = new Date(y, m, 0).toISOString().split('T')[0];
      const expense = transactions
        .filter(t => t.date >= s && t.date <= e && t.type === 'expense' && t.type !== 'savings')
        .reduce((sum, t) => sum + t.amount, 0);
      const label = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][m - 1];
      const isCurrent = ym === selectedMonth;
      return { value: expense || 0, label, frontColor: isCurrent ? '#fdc003' : '#0062ff' };
    });
  }, [transactions, sixMonths, selectedMonth]);

  // Detailed Financial Health Score
  const healthScore = useMemo(() => {
    if (allIncome === 0 && allExpense === 0) {
      return { score: 50, label: 'Belum Ada Data', color: '#94a3b8', details: [] as { label: string; score: number; weight: number; desc: string }[] };
    }

    // 1. Pendapatan vs Pengeluaran (20%) — from ALL transactions
    const expenseRatio = allIncome > 0 ? allExpense / allIncome : 99;
    let pendapatanScore: number;
    let pendapatanDesc: string;
    if (allIncome === 0) { pendapatanScore = 0; pendapatanDesc = 'Tidak ada pemasukan'; }
    else if (expenseRatio <= 0.5) { pendapatanScore = 100; pendapatanDesc = 'Sangat baik'; }
    else if (expenseRatio <= 0.7) { pendapatanScore = 80; pendapatanDesc = 'Ideal'; }
    else if (expenseRatio <= 0.85) { pendapatanScore = 60; pendapatanDesc = 'Cukup'; }
    else if (expenseRatio <= 1) { pendapatanScore = 40; pendapatanDesc = 'Hati-hati'; }
    else { pendapatanScore = 20; pendapatanDesc = 'Melebihi pendapatan'; }

    // 2. Tabungan & Investasi (20%)
    const totalSavings = savings.reduce((s, sa) => s + sa.current, 0);
    const avgMonthlyIncome = allIncome / 5;
    const savingsRate = avgMonthlyIncome > 0 ? totalSavings / avgMonthlyIncome : 0;
    let tabunganScore: number;
    let tabunganDesc: string;
    if (totalSavings === 0) { tabunganScore = 0; tabunganDesc = 'Belum ada tabungan'; }
    else if (savingsRate >= 6) { tabunganScore = 100; tabunganDesc = 'Sangat baik'; }
    else if (savingsRate >= 3) { tabunganScore = 85; tabunganDesc = 'Baik'; }
    else if (savingsRate >= 1) { tabunganScore = 65; tabunganDesc = 'Cukup'; }
    else if (savingsRate >= 0.2) { tabunganScore = 50; tabunganDesc = 'Kurang'; }
    else { tabunganScore = 30; tabunganDesc = 'Perlu ditingkatkan'; }

    // 3. Dana Darurat (20%)
    const avgMonthlyExpense = allExpense / 5;
    const emergencyMonths = avgMonthlyExpense > 0 ? totalSavings / avgMonthlyExpense : 0;
    let daruratScore: number;
    let daruratDesc: string;
    if (emergencyMonths >= 6) { daruratScore = 100; daruratDesc = 'Sangat aman'; }
    else if (emergencyMonths >= 3) { daruratScore = 80; daruratDesc = 'Aman (3-6 bulan)'; }
    else if (emergencyMonths >= 1) { daruratScore = 50; daruratDesc = 'Kurang dari 3 bulan'; }
    else if (emergencyMonths > 0) { daruratScore = 30; daruratDesc = 'Kritis'; }
    else { daruratScore = 0; daruratDesc = 'Tidak ada'; }

    // 4. Utang & Cicilan (20%)
    const totalDebt = debts.filter(d => d.type === 'payable' && d.status === 'unpaid').reduce((s, d) => s + (d.amount - d.paid), 0);
    const dtiRatio = avgMonthlyIncome > 0 ? totalDebt / avgMonthlyIncome : 99;
    let utangScore: number;
    let utangDesc: string;
    if (totalDebt === 0) { utangScore = 100; utangDesc = 'Tidak ada utang'; }
    else if (dtiRatio <= 0.3) { utangScore = 80; utangDesc = 'Sehat'; }
    else if (dtiRatio <= 0.5) { utangScore = 60; utangDesc = 'Cukup'; }
    else if (dtiRatio <= 1) { utangScore = 40; utangDesc = 'Tinggi'; }
    else { utangScore = 20; utangDesc = 'Sangat tinggi'; }

    // 5. Aset vs Liabilitas (20%)
    const totalAsset = totalSavings;
    const totalLiability = debts.filter(d => d.type === 'payable').reduce((s, d) => s + (d.amount - d.paid), 0);
    const netWorth = totalAsset - totalLiability;
    let asetScore: number;
    let asetDesc: string;
    if (netWorth > avgMonthlyIncome * 12) { asetScore = 100; asetDesc = 'Sangat sehat'; }
    else if (netWorth > 0) { asetScore = 75; asetDesc = 'Positif'; }
    else if (netWorth === 0) { asetScore = 50; asetDesc = 'Netral'; }
    else { asetScore = 25; asetDesc = 'Negatif'; }

    const details = [
      { label: 'Pendapatan vs Pengeluaran', score: pendapatanScore, weight: 0.2, desc: pendapatanDesc },
      { label: 'Tabungan & Investasi', score: tabunganScore, weight: 0.2, desc: tabunganDesc },
      { label: 'Dana Darurat', score: daruratScore, weight: 0.2, desc: daruratDesc },
      { label: 'Utang & Cicilan', score: utangScore, weight: 0.2, desc: utangDesc },
      { label: 'Aset vs Liabilitas', score: asetScore, weight: 0.2, desc: asetDesc },
    ];

    const totalScore = Math.round(details.reduce((s, d) => s + d.score * d.weight, 0));

    let label: string;
    let color: string;
    if (totalScore >= 80) { label = 'Sangat Sehat'; color = '#10b981'; }
    else if (totalScore >= 60) { label = 'Cukup Sehat'; color = '#22c55e'; }
    else if (totalScore >= 40) { label = 'Rentan'; color = '#f59e0b'; }
    else { label = 'Tidak Sehat'; color = '#ef4444'; }

    return { score: totalScore, label, color, details };
  }, [allIncome, allExpense, savings, debts]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: Spacing.xl }]}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ paddingTop: Math.max(insets.top, 20), paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 20, alignItems: 'center', backgroundColor: colors.tint }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 10, textAlign: 'center' }}>Analisis Keuangan</Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>

        {/* Month Filter - Dropdown */}
        <TouchableOpacity
          style={[styles.monthDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowMonthPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16 }}>📅</Text>
          <Text style={[styles.monthDropdownText, { color: colors.text }]}>{monthLabel(selectedMonth)}</Text>
          <Text style={[styles.monthDropdownArrow, { color: colors.textMuted }]}>⌵</Text>
        </TouchableOpacity>

        <Modal visible={showMonthPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMonthPicker(false)}
          >
            <View style={[styles.monthPickerContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.monthPickerTitle, { color: colors.text }]}>Pilih Bulan</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {monthOptions.map((ym) => (
                  <TouchableOpacity
                    key={ym}
                    style={[
                      styles.monthOption,
                      {
                        backgroundColor: ym === selectedMonth ? Colors.primary + '20' : 'transparent',
                        borderBottomColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedMonth(ym);
                      setShowMonthPicker(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        { color: ym === selectedMonth ? Colors.primary : colors.text, fontWeight: ym === selectedMonth ? '700' : '500' },
                      ]}
                    >
                      {monthLabel(ym)}
                    </Text>
                    {ym === selectedMonth && <Text style={{ color: Colors.primary, fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Financial Health Score */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Skor Kesehatan Finansial</Text>
          <View style={styles.healthHeader}>
            <View style={[styles.healthCircle, { borderColor: healthScore.color, borderWidth: 6 }]}>
              <Text style={[styles.healthScoreText, { color: healthScore.color }]}>{healthScore.score}</Text>
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={[styles.healthLabel, { color: healthScore.color, fontSize: 18 }]}>{healthScore.label}</Text>
              <Text style={[styles.healthItemLabel, { color: colors.textMuted, marginTop: 4 }]}>
                Pemasukan: Rp {formatCurrencyCompact(monthlyIncome)} · Pengeluaran: Rp {formatCurrencyCompact(monthlyExpense)}
              </Text>
            </View>
          </View>

          <View style={[styles.healthDivider, { backgroundColor: colors.border }]} />

          {healthScore.details.map((item, idx) => (
            <View key={idx} style={styles.healthParamRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.healthParamLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.healthParamWeight, { color: colors.textMuted }]}>({Math.round(item.weight * 100)}%)</Text>
                </View>
                <Text style={[styles.healthParamDesc, { color: colors.textMuted }]}>{item.desc}</Text>
              </View>
              <View style={[styles.healthParamScore, { backgroundColor: `rgba(${item.score >= 60 ? '16,185,129' : item.score >= 40 ? '245,158,11' : '239,68,68'},0.15)` }]}>
                <Text style={[styles.healthParamScoreText, { color: item.score >= 60 ? '#10b981' : item.score >= 40 ? '#f59e0b' : '#ef4444' }]}>
                  {item.score}
                </Text>
              </View>
            </View>
          ))}

          <View style={[styles.healthLegend, { borderTopColor: colors.border }]}>
            <Text style={[styles.healthLegendText, { color: colors.textMuted }]}>
              80-100: Sangat Sehat · 60-79: Cukup Sehat · 40-59: Rentan · {'<'}40: Tidak Sehat
            </Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <CategoryIcon emoji="💰" size={16} color="#10b981" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pemasukan</Text>
            <Text style={[styles.summaryValue, { color: '#10b981' }]}>+ Rp {formatCurrencyCompact(monthlyIncome)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <CategoryIcon emoji="💸" size={16} color="#ef4444" />
            </View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pengeluaran</Text>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>- Rp {formatCurrencyCompact(monthlyExpense)}</Text>
          </View>
        </View>

        {/* Expense Trend Bar Chart */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Tren Pengeluaran (6 Bulan)</Text>
          <View style={styles.chartWrap}>
            <BarChart key={`bar-${selectedMonth || 'empty'}`}
              data={barData}
              barWidth={24}
              spacing={20}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              noOfSections={4}
              maxValue={Math.max(...barData.map(d => d.value), 1) * 1.2}
              formatYLabel={(label) => formatCurrencyCompact(Number(label))}
              width={screenWidth - 80}
            />
          </View>
        </View>

        {/* Top Categories Pie Chart */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Pengeluaran per Kategori</Text>
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <PieChart key={`pie-${selectedMonth || 'empty'}`}
              data={pieData}
              donut
              innerRadius={50}
              radius={80}
              centerLabelComponent={() => (
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Total</Text>
                  <Text style={{ fontSize: 18, color: colors.text, fontWeight: 'bold' }}>
                    {totalCatExpense > 0 ? formatCurrencyCompact(totalCatExpense) : '0'}
                  </Text>
                </View>
              )}
            />
          </View>
          
          <View style={styles.legendContainer}>
            {pieData.map((item, idx) => {
              if (item.text === 'Kosong') return null;
              const pct = totalCatExpense > 0 ? Math.round((item.value / totalCatExpense) * 100) : 0;
              return (
                <View key={idx} style={styles.legendRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>{item.text}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.legendAmount, { color: colors.text }]}>Rp {formatCurrency(item.value)}</Text>
                    <Text style={[styles.legendPct, { color: colors.textMuted }]}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Accounts Pie Chart */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Pengeluaran per Akun</Text>
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <PieChart key={`account-pie-${selectedMonth || 'empty'}`}
              data={accountPieData}
              donut
              innerRadius={50}
              radius={80}
              centerLabelComponent={() => (
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Total</Text>
                  <Text style={{ fontSize: 18, color: colors.text, fontWeight: 'bold' }}>
                    {totalAccountExpense > 0 ? formatCurrencyCompact(totalAccountExpense) : '0'}
                  </Text>
                </View>
              )}
            />
          </View>
          
          <View style={styles.legendContainer}>
            {accountPieData.map((item, idx) => {
              if (item.text === 'Kosong') return null;
              const pct = totalAccountExpense > 0 ? Math.round((item.value / totalAccountExpense) * 100) : 0;
              return (
                <View key={idx} style={styles.legendRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <AccountIcon icon={item.icon} type={item.type as any} size={16} />
                    <Text style={[styles.legendText, { color: colors.text }]} numberOfLines={1}>{item.text}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.legendAmount, { color: colors.text }]}>Rp {formatCurrency(item.value)}</Text>
                    <Text style={[styles.legendPct, { color: colors.textMuted }]}>{pct}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    marginTop: 10,
  },
  monthDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  monthDropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  monthDropdownArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  monthPickerContent: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    maxHeight: 360,
  },
  monthPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  monthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monthOptionText: {
    fontSize: 15,
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreText: {
    fontSize: 22,
    fontWeight: '800',
  },
  healthLabel: {
    fontWeight: '700',
  },
  healthItemLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  healthDivider: {
    height: 1,
    marginBottom: 12,
  },
  healthParamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  healthParamLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  healthParamWeight: {
    fontSize: 11,
  },
  healthParamDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  healthParamScore: {
    width: 36,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  healthParamScoreText: {
    fontSize: 13,
    fontWeight: '800',
  },
  healthLegend: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 4,
  },
  healthLegendText: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    padding: 20,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  chartWrap: {
    alignItems: 'center',
    marginLeft: -10,
  },
  legendContainer: {
    marginTop: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  legendPct: {
    fontSize: 12,
  },
});
