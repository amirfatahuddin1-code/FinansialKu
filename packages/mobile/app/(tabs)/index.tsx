import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';
import { formatCurrency, formatCurrencyCompact, parseAmount, getMonthlyRange } from '@karsafin/shared';
import type { Transaction, Savings, Debt, Event as KafEvent } from '@karsafin/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TransactionRow, SavingsCard, CategoryIcon, SkeletonCard, AnimatedPressable, BottomSheet } from '@/components';
import AdBanner from '@/components/AdBanner';
import { useRouter, useFocusEffect } from 'expo-router';
import { useWorkspace } from '@/providers/WorkspaceProvider';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, api, signOut } = useAuth();
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [events, setEvents] = useState<KafEvent[]>([]);
  const [profileName, setProfileName] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [saldoView, setSaldoView] = useState<'bulan' | 'total'>('bulan');
  const [payday, setPayday] = useState(1);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!nameInput.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await api.profiles.update(user.id, { name: nameInput });
      if (error) throw error;
      if (data) setProfileName(data.name || '');
      setShowProfileModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenProfile = () => {
    setNameInput(profileName);
    setShowProfileModal(true);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    if (!activeWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const savedPayday = await AsyncStorage.getItem('@karsafin_income_date');
      if (savedPayday) {
        setPayday(parseInt(savedPayday, 10));
      } else {
        setPayday(1);
      }

      const [txRes, savRes, debtRes, evRes, profileRes] = await Promise.all([
        api.transactions.getAll(),
        api.savings.getAll(),
        api.debts.getAll(user.id),
        api.events.getAll(),
        api.profiles.get(user.id),
      ]);
      setTransactions(txRes.data || []);
      setSavings(savRes.data || []);
      setDebts(debtRes.data || []);
      setEvents(evRes.data || []);
      setProfileName(profileRes.data?.name || user.user_metadata?.name || 'User');
    } catch (err) {
      console.error('Load dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace]);


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

  const now = new Date();
  const { startDate: startOfMonth, endDate: endOfMonth } = getMonthlyRange(payday, now);

  const monthlyTx = transactions.filter(t => t.date >= startOfMonth && t.date <= endOfMonth);
  const monthlyIncome = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = monthlyIncome - monthlyExpense;

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const akumulasiSaldo = totalIncome - totalExpense;

  const recentTx = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const unpaidDebts = debts.filter(d => d.status === 'unpaid');
  const totalPayable = unpaidDebts.filter(d => d.type === 'payable').reduce((s, d) => s + (d.amount - (d.paid || 0)), 0);
  const totalReceivable = unpaidDebts.filter(d => d.type === 'receivable').reduce((s, d) => s + (d.amount - (d.paid || 0)), 0);

  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const upcomingEvents = events
    .filter(e => !e.archived && e.date >= startOfMonth)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return { month: monthsShort[d.getMonth()], day: String(d.getDate()) };
  };
  const eventBudgetTotal = (ev: KafEvent) => {
    if (ev.items && ev.items.length > 0) {
      return ev.items.reduce((s, i) => s + i.budget, 0);
    }
    return ev.budget || 0;
  };
  const eventActualTotal = (ev: KafEvent) => {
    if (ev.items && ev.items.length > 0) {
      return ev.items.reduce((s, i) => s + i.actual, 0);
    }
    return 0;
  };

  let catExpenses = monthlyTx.filter(t => t.type === 'expense').reduce((acc, t) => {
    const cat = t.category?.name || 'Lainnya';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const hasExpenses = Object.keys(catExpenses).length > 0;

  const chartColors = ['#0062ff', '#fdc003', '#007c98', '#ef4444', '#10b981'];
  const pieData = hasExpenses
    ? Object.entries(catExpenses).map(([name, amount], index) => ({
        value: amount,
        color: chartColors[index % chartColors.length],
        text: name,
      }))
    : [];
  const totalCatExpense = Object.values(catExpenses).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: Spacing.xl, gap: Spacing.lg }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        bounces={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.blueBanner, { paddingTop: Math.max(insets.top, 20), backgroundColor: colors.tint }]}
        >
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: Spacing.sm }}>👋</Text>
              <View>
                <Text style={styles.headerTitle}>Hai {profileName.split(' ')[0]}!</Text>
                <TouchableOpacity onPress={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <FontAwesome name="briefcase" size={12} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{activeWorkspace?.name || 'Catatan Pribadi'}</Text>
                  <FontAwesome name="chevron-down" size={10} color="#fff" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
            <AnimatedPressable 
              style={styles.avatarWrap}
              onPress={() => {
                router.push('/settings');
              }}
            >
              <Text style={[styles.avatarText, { color: colors.tint }]}>{profileName.charAt(0).toUpperCase()}</Text>
              <View style={[styles.avatarDot, { backgroundColor: colors.tint, borderColor: colors.tint }]} />
            </AnimatedPressable>
          </View>

          <View style={styles.dateWrap}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.viewToggle, saldoView === 'bulan' ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }]}
                onPress={() => setSaldoView('bulan')}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewToggleText, { fontWeight: saldoView === 'bulan' ? '700' : '400' }]}>📅 Bulan Ini</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggle, saldoView === 'total' ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }]}
                onPress={() => setSaldoView('total')}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewToggleText, { fontWeight: saldoView === 'total' ? '700' : '400' }]}>🏦 Total Saldo</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.mainBalanceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {(saldoView === 'bulan' ? balance : akumulasiSaldo) < 0 && (
                <Text style={[styles.currencySymbol, { marginRight: 4 }]}>-</Text>
              )}
              <Text style={styles.currencySymbol}>Rp</Text>
              <Text style={styles.balanceBig}>{formatCurrency(saldoView === 'bulan' ? balance : akumulasiSaldo)}</Text>
            </View>
          </View>

          {saldoView === 'bulan' ? (
            <View style={styles.incExpGrid}>
              <View style={[styles.incExpCard, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
                <View style={[styles.incExpIcon, { backgroundColor: '#10b981' }]}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>↓</Text>
                </View>
                <Text style={styles.incExpValue}>Rp {formatCurrencyCompact(monthlyIncome)}</Text>
              </View>
              <View style={[styles.incExpCard, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                <View style={[styles.incExpIcon, { backgroundColor: '#ef4444' }]}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>↑</Text>
                </View>
                <Text style={styles.incExpValue}>Rp {formatCurrencyCompact(monthlyExpense)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.incExpGrid}>
              <View style={[styles.incExpCard, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
                <View style={[styles.incExpIcon, { backgroundColor: '#10b981' }]}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>💰</Text>
                </View>
                <Text style={styles.incExpValue}>Rp {formatCurrencyCompact(totalIncome)}</Text>
              </View>
              <View style={[styles.incExpCard, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                <View style={[styles.incExpIcon, { backgroundColor: '#ef4444' }]}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>💳</Text>
                </View>
                <Text style={styles.incExpValue}>Rp {formatCurrencyCompact(totalExpense)}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.overlapContainer}>
          <AnimatedPressable>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 4, paddingVertical: 4, paddingRight: 16, justifyContent: 'space-between' }}
              style={[{ padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 8, borderWidth: 1 }, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {[
                { icon: 'pie-chart' as const, label: 'Atur\nAnggaran', bg: '#eff6ff', color: '#3b82f6', route: '/planning?tab=anggaran' },
                { icon: 'bullseye' as const, label: 'Target\nTabungan', bg: '#f0fdf4', color: '#10b981', route: '/planning?tab=tabungan' },
                { icon: 'calculator' as const, label: 'Kalkulator\nFinansial', bg: '#f3e8ff', color: '#7c3aed', route: '/calculator' },
                { icon: 'handshake-o' as const, label: 'Hutang\nPiutang', bg: '#f5f3ff', color: '#8b5cf6', route: '/hutang-piutang' },
                { icon: 'calendar-plus-o' as const, label: 'Acara\nBaru', bg: '#fff7ed', color: '#f97316', route: '/planning?tab=acara' },
                { icon: 'credit-card' as const, label: 'Catat\nHutang', bg: '#fef2f2', color: '#ef4444', route: '/add-debt?type=payable' },
                { icon: 'handshake-o' as const, label: 'Catat\nPiutang', bg: '#f5f3ff', color: '#8b5cf6', route: '/add-debt?type=receivable' },
                { icon: 'bar-chart' as const, label: 'Laporan\nKeuangan', bg: '#f3f4f6', color: '#6b7280', route: '/analysis' },
              ].map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.actionItem} onPress={() => router.push(item.route as never)} activeOpacity={0.6}>
                  <View style={[styles.actionIconBg, { backgroundColor: item.bg }]}>
                    <FontAwesome name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={[styles.actionText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </AnimatedPressable>

          <TouchableOpacity
            style={[styles.insightBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push('/telegram' as never)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={[styles.insightIcon, { backgroundColor: colors.inputBg }]}>
                <CategoryIcon emoji="✈️" size={18} color={colors.tint} />
              </View>
              <Text style={[styles.insightText, { color: colors.text }]}>
                Catat transaksi lebih mudah melalui telegram
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>

          <View style={[styles.widgetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.widgetHeader}>
              <Text style={[styles.widgetTitle, { color: colors.text }]}>Transaksi Terakhir</Text>
              <TouchableOpacity onPress={() => router.push('/transactions' as never)}>
                <Text style={{ color: colors.tint, fontSize: 14, fontWeight: '600' }}>Lihat semua</Text>
              </TouchableOpacity>
            </View>

            {recentTx.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
                <CategoryIcon emoji="📭" size={36} color={colors.textMuted} />
                <Text style={{ marginTop: Spacing.sm, color: colors.textMuted, fontSize: 14 }}>
                  Belum ada transaksi
                </Text>
              </View>
            ) : (
              recentTx.map((t) => (
                <TransactionRow key={t.id} transaction={t} compact workspaceType={activeWorkspace?.type} />
              ))
            )}
          </View>

          {hasExpenses && (
            <View style={[styles.widgetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.widgetHeader}>
                <Text style={[styles.widgetTitle, { color: colors.text }]}>Realisasi Anggaran</Text>
              </View>
              <View style={styles.chartContainer}>
                <PieChart
                  key={`pie-${monthlyExpense}`}
                  data={pieData}
                  donut
                  innerRadius={45}
                  radius={65}
                  centerLabelComponent={() => (
                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>Total</Text>
                      <Text style={{ fontSize: 16, color: colors.text, fontWeight: 'bold' }}>
                        Rp {formatCurrencyCompact(monthlyExpense)}
                      </Text>
                    </View>
                  )}
                />
                <View style={styles.legendContainer}>
                  {pieData.slice(0, 4).map((item, idx) => {
                    const pct = totalCatExpense > 0 ? Math.round((item.value / totalCatExpense) * 100) : 0;
                    return (
                      <View key={idx} style={styles.legendRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                          <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.text}
                          </Text>
                        </View>
                        <Text style={[styles.legendPct, { color: colors.text }]}>{pct}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {savings.length > 0 && (
            <View style={[styles.widgetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.widgetHeader}>
                <Text style={[styles.widgetTitle, { color: colors.text }]}>Progres Tabungan</Text>
                <TouchableOpacity style={styles.addBtnSmall} onPress={() => router.push('/planning?tab=tabungan' as never)}>
                  <Text style={{ color: colors.tint, fontWeight: 'bold', fontSize: 18 }}>+</Text>
                </TouchableOpacity>
              </View>
              {savings.slice(0, 2).map((g) => (
                <SavingsCard key={g.id} goal={g} />
              ))}
            </View>
          )}

          <View style={[styles.widgetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.widgetHeader}>
              <Text style={[styles.widgetTitle, { color: colors.text }]}>Acara Mendatang</Text>
              <TouchableOpacity style={styles.addBtnSmall} onPress={() => router.push('/planning?tab=acara' as never)}>
                <Text style={{ color: colors.tint, fontWeight: 'bold', fontSize: 18 }}>+</Text>
              </TouchableOpacity>
            </View>
            {upcomingEvents.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
                <CategoryIcon emoji="📅" size={36} color={colors.textMuted} />
                <Text style={{ marginTop: Spacing.sm, color: colors.textMuted, fontSize: 14 }}>
                  Belum ada acara
                </Text>
              </View>
            ) : (
              upcomingEvents.map((ev) => {
                const fd = formatEventDate(ev.date);
                const budget = eventBudgetTotal(ev);
                const actual = eventActualTotal(ev);
                const remaining = budget - actual;
                const urgent = remaining > 0 && new Date(ev.date) <= new Date(now.getTime() + 14 * 86400000);
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={styles.eventRow}
                    activeOpacity={0.6}
                    onPress={() => router.push(`/event/${ev.id}` as never)}
                  >
                    <View style={[
                      styles.eventDateBox,
                      urgent
                        ? { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }
                        : { backgroundColor: colors.inputBg, borderColor: colors.border }
                    ]}>
                      <Text style={[styles.eventMonth, urgent && { color: '#ef4444' }]}>{fd.month}</Text>
                      <Text style={[styles.eventDay, { color: urgent ? '#ef4444' : colors.tint }]}>{fd.day}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{ev.name}</Text>
                      <Text style={[styles.eventSub, { color: actual > 0 ? '#10b981' : colors.textMuted }]}>
                        {actual > 0
                          ? `Terkumpul: Rp ${formatCurrencyCompact(actual)}${remaining > 0 ? ` · Kurang: Rp ${formatCurrencyCompact(remaining)}` : ''}`
                          : `Target: Rp ${formatCurrencyCompact(budget)}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {debts.length > 0 && (
            <View style={[styles.widgetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.widgetHeader}>
                <Text style={[styles.widgetTitle, { color: colors.text }]}>Hutang & Piutang</Text>
                <TouchableOpacity onPress={() => router.push('/hutang-piutang')}>
                  <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>Lihat Semua</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: Spacing.lg - 4 }}>
                <View style={[styles.debtSummaryCard, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}>
                  <Text style={[styles.debtSummaryLabel, { color: '#ef4444' }]}>Total Hutang</Text>
                  <Text style={[styles.debtSummaryValue, { color: '#ef4444' }]}>
                    Rp {formatCurrencyCompact(totalPayable)}
                  </Text>
                </View>
                <View style={[styles.debtSummaryCard, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                  <Text style={[styles.debtSummaryLabel, { color: '#10b981' }]}>Total Piutang</Text>
                  <Text style={[styles.debtSummaryValue, { color: '#10b981' }]}>
                    Rp {formatCurrencyCompact(totalReceivable)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <AdBanner />
      </ScrollView>

      {showWorkspaceDropdown && (
        <>
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setShowWorkspaceDropdown(false)}
          />
          <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border, top: Math.max(insets.top, 20) + 72 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={[styles.dropdownTitle, { color: colors.text }]}>Pilih Workspace</Text>
              <TouchableOpacity onPress={() => { setShowWorkspaceDropdown(false); router.push('/settings'); }}>
                <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>Kelola</Text>
              </TouchableOpacity>
            </View>
            {workspaces.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Belum ada workspace</Text>
                <TouchableOpacity onPress={() => { setShowWorkspaceDropdown(false); router.push('/settings'); }} style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.tint, fontWeight: '600' }}>Buat workspace baru</Text>
                </TouchableOpacity>
              </View>
            ) : (
              workspaces.map((ws) => (
                <TouchableOpacity
                  key={ws.id}
                  style={styles.dropdownItem}
                  onPress={async () => {
                    await switchWorkspace(ws.id);
                    setShowWorkspaceDropdown(false);
                  }}
                  activeOpacity={0.6}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownItemName, { color: colors.text }]}>{ws.name}</Text>
                    <Text style={[styles.dropdownItemType, { color: colors.textMuted }]}>{ws.type === 'personal' ? 'Pribadi' : 'Keluarga'}</Text>
                  </View>
                  {activeWorkspace?.id === ws.id && (
                    <FontAwesome name="check-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </>
      )}

      <BottomSheet visible={showProfileModal} onClose={() => setShowProfileModal(false)} title="Profil & Pengaturan">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Lengkap</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Masukkan nama Anda"
          placeholderTextColor={colors.textMuted}
          value={nameInput}
          onChangeText={setNameInput}
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSaveProfile}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Perubahan</Text>}
        </TouchableOpacity>

      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blueBanner: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
  },
  avatarDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    backgroundColor: '#ef4444',
    borderRadius: 7,
    borderWidth: 2,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  datePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  viewToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewToggleText: {
    color: '#ffffff',
    fontSize: 12,
  },
  mainBalanceRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  currencySymbol: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '500',
    marginRight: 8,
    marginTop: 6,
  },
  balanceBig: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  incExpGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  incExpCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  incExpIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incExpValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  overlapContainer: {
    marginTop: -32,
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
  },
  actionItem: {
    width: 76,
    alignItems: 'center',
    gap: 8,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    width: 76,
  },
  insightBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  widgetBox: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 4,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 20,
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  legendPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  addBtnSmall: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(79,70,229,0.12)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  eventDateBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventMonth: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  eventDay: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4F46E5',
    lineHeight: 24,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  debtSummaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  debtSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  debtSummaryValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg - 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  dropdownMenu: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 101,
  },
  dropdownTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownItemType: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
