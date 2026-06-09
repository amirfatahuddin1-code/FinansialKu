import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { useColors } from '@/constants/Colors';
import { formatCurrency } from '@karsafin/shared';
import type { Transaction, FinancialAccount } from '@karsafin/shared';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useFocusEffect } from '@react-navigation/native';

export default function BukuTransaksiScreen() {
  const { api } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  useColors();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, accRes] = await Promise.all([
        api.transactions.getAll(),
        api.accounts.getAll(),
      ]);
      setTransactions(txRes.data || []);
      setAccounts(accRes.data || []);
    } catch (err) {
      console.error('Load buku transaksi error:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData])
  );

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isCurrentMonth = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();

  const monthStart = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(viewYear, viewMonth, 0).getDate();
  const monthEnd = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const isAccountSelected = selectedAccountIds.size > 0;

  const getTxImpact = (t: Transaction) => {
    if (isAccountSelected) {
      const isSource = t.account_id && selectedAccountIds.has(t.account_id);
      const isDest = t.destination_account_id && selectedAccountIds.has(t.destination_account_id);
      
      let diff = 0;
      if (isSource) {
        diff += (t.type === 'income' ? t.amount : -t.amount);
      }
      if (isDest) {
        diff += t.amount;
      }
      return diff;
    }
    
    if (t.type === 'savings' && t.destination_account_id) {
      return 0;
    }
    return t.type === 'income' ? t.amount : -t.amount;
  };

  const openingBalance = transactions
    .filter(t => {
      const txStr = t.date.split('T')[0];
      if (txStr >= monthStart) return false;
      if (isAccountSelected) {
        const matchesSource = t.account_id && selectedAccountIds.has(t.account_id);
        const matchesDest = t.destination_account_id && selectedAccountIds.has(t.destination_account_id);
        if (!matchesSource && !matchesDest) return false;
      }
      return true;
    })
    .reduce((sum, t) => sum + getTxImpact(t), 0);

  const monthTx = transactions
    .filter(t => {
      const txStr = t.date.split('T')[0];
      if (txStr < monthStart || txStr > monthEnd) return false;
      if (isAccountSelected) {
        const matchesSource = t.account_id && selectedAccountIds.has(t.account_id);
        const matchesDest = t.destination_account_id && selectedAccountIds.has(t.destination_account_id);
        if (!matchesSource && !matchesDest) return false;
      }
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthIncome = monthTx.reduce((sum, t) => {
    const impact = getTxImpact(t);
    return sum + (impact > 0 ? impact : 0);
  }, 0);

  const monthExpense = monthTx.reduce((sum, t) => {
    const impact = getTxImpact(t);
    return sum + (impact < 0 ? -impact : 0);
  }, 0);

  const closingBalance = openingBalance + monthIncome - monthExpense;

  const monthName = new Date(viewYear, viewMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const toggleAccount = (id: string) => {
    const next = new Set(selectedAccountIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAccountIds(next);
  };

  const accountTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return '🏦';
      case 'ewallet': return '📱';
      case 'investment': return '📈';
      default: return '💵';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.tint }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="chevron-left" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buku Transaksi</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={[styles.monthNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
            <FontAwesome name="chevron-left" size={16} color={colors.tint} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text }]}>{monthName}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
            <FontAwesome name="chevron-right" size={16} color={colors.tint} />
          </TouchableOpacity>
        </View>

        {/* Account Filter */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Filter Akun Keuangan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            <TouchableOpacity
              style={[styles.accChip, { backgroundColor: selectedAccountIds.size === 0 ? colors.tint : colors.inputBg, borderColor: selectedAccountIds.size === 0 ? colors.tint : colors.border }]}
              onPress={() => setSelectedAccountIds(new Set())}
              activeOpacity={0.7}
            >
              <Text style={[styles.accChipText, { color: selectedAccountIds.size === 0 ? '#fff' : colors.text }]}>Semua Akun</Text>
            </TouchableOpacity>
            {accounts.map(acc => {
              const checked = selectedAccountIds.has(acc.id);
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accChip, { backgroundColor: checked ? (acc.color || colors.tint) + '25' : colors.inputBg, borderColor: checked ? acc.color || colors.tint : colors.border }]}
                  onPress={() => toggleAccount(acc.id)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12 }}>{accountTypeLabel(acc.type)}</Text>
                  <Text style={[styles.accChipText, { color: checked ? acc.color || colors.tint : colors.text }]}>{acc.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Summary */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Saldo Awal</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{openingBalance < 0 ? '- ' : ''}Rp {formatCurrency(openingBalance)}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: Colors.success }]}>Pemasukan</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>+Rp {formatCurrency(monthIncome)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: Colors.danger }]}>Pengeluaran</Text>
              <Text style={[styles.summaryValue, { color: Colors.danger }]}>-Rp {formatCurrency(monthExpense)}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Saldo Akhir</Text>
              <Text style={[styles.summaryValue, { color: closingBalance >= 0 ? Colors.success : Colors.danger, fontSize: 20 }]}>{closingBalance < 0 ? '- ' : ''}Rp {formatCurrency(closingBalance)}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 8 }]}>DAFTAR TRANSAKSI</Text>

          {/* Table Header */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.colDate, { color: colors.textMuted }]}>Tgl</Text>
            <Text style={[styles.colDesc, { color: colors.textMuted }]}>Keterangan</Text>
            <Text style={[styles.colDebit, { color: colors.textMuted }]}>Debit</Text>
            <Text style={[styles.colCredit, { color: colors.textMuted }]}>Kredit</Text>
            <Text style={[styles.colBalance, { color: colors.textMuted }]}>Saldo</Text>
          </View>

          {monthTx.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Tidak ada transaksi bulan ini</Text>
            </View>
          ) : (
            monthTx.map((t, idx) => {
              const runningBalance = monthTx.slice(0, idx + 1).reduce((sum, tx) => sum + getTxImpact(tx), openingBalance);
              const sourceAcc = t.account?.name || (t.account_id ? accounts.find(a => a.id === t.account_id)?.name : '');
              const destAcc = t.destination_account_id ? accounts.find(a => a.id === t.destination_account_id)?.name : '';
              
              const isDebit = isAccountSelected 
                ? getTxImpact(t) > 0 
                : (t.type === 'income' || !!t.destination_account_id);
              const isCredit = isAccountSelected 
                ? getTxImpact(t) < 0 
                : (t.type === 'expense' || t.type === 'savings');

              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tableRow, idx < monthTx.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.colDate, { color: colors.text }]}>{formatDate(t.date)}</Text>
                  <View style={styles.colDesc}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>{t.description || t.category?.name || '-'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                      {t.category && <Text style={{ fontSize: 10, color: colors.textMuted }}>{t.category.icon} {t.category.name}</Text>}
                      {t.category && (sourceAcc || destAcc) && <Text style={{ fontSize: 10, color: colors.textMuted }}>•</Text>}
                      {(sourceAcc || destAcc) && (
                        <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '500' }}>
                          {sourceAcc || '-'}{destAcc ? ` ➔ ${destAcc}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.colDebit, { color: isDebit ? Colors.success : colors.textMuted }]}>
                    {isDebit ? `Rp ${formatCurrency(t.amount)}` : '-'}
                  </Text>
                  <Text style={[styles.colCredit, { color: isCredit ? Colors.danger : colors.textMuted }]}>
                    {isCredit ? `Rp ${formatCurrency(t.amount)}` : '-'}
                  </Text>
                  <Text style={[styles.colBalance, { color: colors.text, fontWeight: '700' }]}>
                    {runningBalance < 0 ? '- ' : ''}Rp {formatCurrency(runningBalance)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  accChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  accChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.1)',
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
  },
  colDate: {
    width: 44,
    fontSize: 11,
    fontWeight: '600',
  },
  colDesc: {
    flex: 1,
    paddingHorizontal: 4,
  },
  colDebit: {
    width: 72,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  colCredit: {
    width: 72,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  colBalance: {
    width: 76,
    fontSize: 11,
    textAlign: 'right',
  },
});
