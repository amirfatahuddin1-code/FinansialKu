import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, RefreshControl, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { formatCurrency, formatCurrencyCompact, getLocalToday } from '@karsafin/shared';
import type { Debt, DebtPayment, FinancialAccount } from '@karsafin/shared';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { FAB, EmptyState, BottomSheet, Calculator, AccountIcon } from '@/components';
import { useFocusEffect } from '@react-navigation/native';

type FilterType = 'all' | 'payable' | 'receivable' | 'paid';

const formatInputAmount = (val: string) => {
  const numericVal = val.replace(/[^0-9]/g, '');
  if (!numericVal) return '';
  return parseInt(numericVal, 10).toLocaleString('id-ID');
};

export default function HutangPiutangScreen() {
  const router = useRouter();
  const { user, api } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [paySelectedAccountId, setPaySelectedAccountId] = useState('');

  // Bayar modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCounterpart, setEditCounterpart] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editSelectedAccountId, setEditSelectedAccountId] = useState('');
  const [showEditCalc, setShowEditCalc] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [paySaving, setPaySaving] = useState(false);

  // Riwayat modal
  const [showRiwayatModal, setShowRiwayatModal] = useState(false);
  const [riwayatDebt, setRiwayatDebt] = useState<Debt | null>(null);

  // Edit payment modal
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editPayment, setEditPayment] = useState<DebtPayment | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [debtRes, accRes] = await Promise.all([
        api.debts.getAll(user.id),
        api.accounts.getAll()
      ]);
      if (debtRes.data) setDebts(debtRes.data);
      if (accRes.data) setAccounts(accRes.data);
      return debtRes.data;
    } catch (err) {
      console.error('Failed to load debts or accounts', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredDebts = debts.filter(d => {
    if (filter === 'payable') return d.type === 'payable' && d.status === 'unpaid';
    if (filter === 'receivable') return d.type === 'receivable' && d.status === 'unpaid';
    if (filter === 'paid') return d.status === 'paid';
    return true;
  });

  const totalPayable = debts.filter(d => d.type === 'payable' && d.status === 'unpaid').reduce((s, d) => s + (d.amount - (d.paid || 0)), 0);
  const totalReceivable = debts.filter(d => d.type === 'receivable' && d.status === 'unpaid').reduce((s, d) => s + (d.amount - (d.paid || 0)), 0);
  const netBalance = totalReceivable - totalPayable;

  const openPayModal = (debt: Debt) => {
    setPayDebt(debt);
    setPayAmount('');
    setPaySelectedAccountId(debt.account_id || (accounts.find(a => a.is_default)?.id || accounts[0]?.id || ''));
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!payDebt || !user) return;
    const amount = parseInt(payAmount.replace(/\./g, ''), 10);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Nominal harus lebih dari 0');
      return;
    }
    const newPaid = (payDebt.paid || 0) + amount;
    if (newPaid > payDebt.amount) {
      Alert.alert('Error', 'Nominal pembayaran melebihi sisa tagihan');
      return;
    }
    setPaySaving(true);
    try {
      const payment: DebtPayment = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        amount,
        date: getLocalToday(),
        notes: '',
      };
      const existingPayments = payDebt.payments || [];
      const updates: any = {
        paid: newPaid,
        payments: [...existingPayments, payment],
      };
      if (newPaid >= payDebt.amount) updates.status = 'paid';
      const { error } = await api.debts.update(payDebt.id, updates);
      if (error) throw error;

      // Create transaction automatically
      const catConfig = payDebt.type === 'payable'
        ? { name: 'Bayar Hutang', type: 'expense' as const, icon: '📤', color: '#ef4444' }
        : { name: 'Terima Bayar Piutang', type: 'income' as const, icon: '💰', color: '#10b981' };

      const { data: catData, error: catError } = await api.categories.getOrCreateByName(user.id, catConfig);
      if (catError) {
        console.error('Failed to resolve category for installment transaction:', catError);
      } else if (catData) {
        const txPayload = {
          type: catConfig.type,
          amount,
          category_id: catData.id,
          description: payDebt.type === 'payable'
            ? `Bayar cicilan hutang ke ${payDebt.counterpart}`
            : `Terima bayar piutang dari ${payDebt.counterpart}`,
          date: getLocalToday(),
          account_id: paySelectedAccountId || undefined,
          debt_id: payDebt.id,
        };
        const { error: txError } = await api.transactions.create(user.id, txPayload);
        if (txError) {
          console.error('Failed to create automatic transaction for debt payment:', txError);
        }
      }

      setShowPayModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan pembayaran');
    } finally {
      setPaySaving(false);
    }
  };

  const openEditModal = (debt: Debt) => {
    setEditDebt(debt);
    setEditAmount(String(debt.amount));
    setEditCounterpart(debt.counterpart);
    setEditNotes(debt.notes || '');
    setEditDueDate(debt.due_date || '');
    setEditSelectedAccountId(debt.account_id || '');
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editDebt || !user) return;
    const amount = parseInt(editAmount.replace(/\./g, ''), 10);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Nominal harus lebih dari 0');
      return;
    }
    if (!editCounterpart.trim()) {
      Alert.alert('Error', 'Nama pihak terkait tidak boleh kosong');
      return;
    }
    setEditSaving(true);
    try {
      const updates: any = {
        amount,
        counterpart: editCounterpart.trim(),
        notes: editNotes.trim(),
        due_date: editDueDate || undefined,
        account_id: editSelectedAccountId || undefined,
        name: `${editDebt.type === 'payable' ? 'Hutang ke' : 'Piutang dari'} ${editCounterpart.trim()}`,
      };
      const { error } = await api.debts.update(editDebt.id, updates);
      if (error) throw error;
      setShowEditModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengubah catatan');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = (debt: Debt) => {
    Alert.alert(
      'Hapus Catatan',
      `Yakin ingin menghapus ${debt.type === 'payable' ? 'hutang' : 'piutang'} dengan ${debt.counterpart}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive', onPress: async () => {
            try {
              await api.debts.delete(debt.id);
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal menghapus');
            }
          },
        },
      ],
    );
  };

  const openRiwayatModal = (debt: Debt) => {
    setRiwayatDebt(debt);
    setShowRiwayatModal(true);
  };

  const openEditPaymentModal = (payment: DebtPayment) => {
    setEditPayment(payment);
    setEditPaymentAmount(String(payment.amount));
    setEditPaymentNotes(payment.notes || '');
    setShowEditPaymentModal(true);
  };

  const handleEditPayment = async () => {
    if (!editPayment || !riwayatDebt || !user) return;
    const amount = parseInt(editPaymentAmount.replace(/\./g, ''), 10);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Nominal harus lebih dari 0');
      return;
    }
    const otherPaymentsSum = (riwayatDebt.payments || [])
      .filter(p => p.id !== editPayment.id)
      .reduce((sum, p) => sum + p.amount, 0);
    if (otherPaymentsSum + amount > riwayatDebt.amount) {
      Alert.alert('Error', 'Total pembayaran melebihi nominal hutang/piutang');
      return;
    }
    setEditPaymentSaving(true);
    try {
      const updatedPayments = (riwayatDebt.payments || []).map(p =>
        p.id === editPayment.id ? { ...p, amount, notes: editPaymentNotes.trim() } : p
      );
      const newPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const updates: any = {
        payments: updatedPayments,
        paid: newPaid,
      };
      if (newPaid >= riwayatDebt.amount) updates.status = 'paid';
      else if (riwayatDebt.status === 'paid') updates.status = 'unpaid';
      const { error } = await api.debts.update(riwayatDebt.id, updates);
      if (error) throw error;
      setShowEditPaymentModal(false);
      const freshDebts = await loadData();
      if (freshDebts) {
        const updated = freshDebts.find(d => d.id === riwayatDebt.id);
        if (updated) setRiwayatDebt(updated);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengubah pembayaran');
    } finally {
      setEditPaymentSaving(false);
    }
  };

  const handleDeletePayment = (payment: DebtPayment, debt: Debt) => {
    Alert.alert(
      'Hapus Pembayaran',
      `Yakin ingin menghapus pembayaran Rp ${formatCurrencyCompact(payment.amount)} ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive', onPress: async () => {
            if (!user) return;
            try {
              const updatedPayments = (debt.payments || []).filter(p => p.id !== payment.id);
              const newPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
              const updates: any = {
                payments: updatedPayments,
                paid: newPaid,
              };
              if (newPaid >= debt.amount) updates.status = 'paid';
              else if (debt.status === 'paid') updates.status = 'unpaid';
              const { error } = await api.debts.update(debt.id, updates);
              if (error) throw error;
              setShowRiwayatModal(false);
              await loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal menghapus pembayaran');
            }
          },
        },
      ],
    );
  };

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const renderDebtCard = ({ item }: { item: Debt }) => {
    const remaining = item.amount - (item.paid || 0);
    const progress = item.amount > 0 ? ((item.paid || 0) / item.amount) * 100 : 0;
    const daysLeft = getDaysUntilDue(item.due_date);
    const isLate = daysLeft !== null && daysLeft < 0 && item.status === 'unpaid';

    return (
      <View style={[styles.debtCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.debtCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={[styles.typeBadge, { backgroundColor: item.type === 'payable' ? '#fef2f2' : '#f0fdf4' }]}>
              <FontAwesome name={item.type === 'payable' ? 'credit-card' : 'handshake-o'} size={14} color={item.type === 'payable' ? '#ef4444' : '#10b981'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.counterpartName, { color: colors.text }]} numberOfLines={1}>{item.counterpart}</Text>
              {item.account && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AccountIcon icon={item.account.icon} type={item.account.type} size={10} />
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{item.account.name}</Text>
                </View>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'paid' ? '#f0fdf4' : isLate ? '#fef2f2' : '#fefce8' }]}>
              <Text style={[styles.statusText, { color: item.status === 'paid' ? '#10b981' : isLate ? '#ef4444' : '#ca8a04' }]}>
                {item.status === 'paid' ? 'Lunas' : isLate ? 'Telat' : 'Belum'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <View>
            <Text style={[styles.debtAmount, { color: item.type === 'payable' ? '#ef4444' : '#10b981' }]}>
              Rp {formatCurrencyCompact(item.amount)}
            </Text>
            {item.status !== 'paid' && (
              <Text style={[styles.remainingText, { color: colors.textMuted }]}>
                Sisa: Rp {formatCurrencyCompact(remaining)}
              </Text>
            )}
          </View>
          {item.due_date && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.dueLabel, { color: colors.textMuted }]}>Jatuh Tempo</Text>
              <Text style={[styles.dueDate, { color: isLate ? '#ef4444' : colors.textSecondary }]}>
                {new Date(item.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              {daysLeft !== null && item.status !== 'paid' && (
                <Text style={[styles.daysLeft, { color: isLate ? '#ef4444' : colors.textMuted }]}>
                  {isLate ? `${Math.abs(daysLeft)} hari lewat` : `${daysLeft} hari lagi`}
                </Text>
              )}
            </View>
          )}
        </View>

        {item.status !== 'paid' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { backgroundColor: colors.inputBg }]}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: item.type === 'payable' ? '#ef4444' : '#10b981' }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {formatCurrencyCompact(item.paid || 0)} / {formatCurrencyCompact(item.amount)}
            </Text>
          </View>
        )}

        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          {item.status !== 'paid' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => openPayModal(item)} activeOpacity={0.7}>
              <FontAwesome name="plus-circle" size={14} color={colors.tint} />
              <Text style={[styles.actionBtnText, { color: colors.tint }]}>Bayar / Cicil</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => openRiwayatModal(item)} activeOpacity={0.7}>
            <FontAwesome name="history" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Riwayat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)} activeOpacity={0.7}>
            <FontAwesome name="pencil" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)} activeOpacity={0.7}>
            <FontAwesome name="trash" size={14} color="#ef4444" />
            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Hapus</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint, paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <FontAwesome name="chevron-left" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hutang & Piutang</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Hutang</Text>
            <Text style={styles.summaryValue}>Rp {formatCurrencyCompact(totalPayable)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Piutang</Text>
            <Text style={styles.summaryValue}>Rp {formatCurrencyCompact(totalReceivable)}</Text>
          </View>
        </View>
        <View style={[styles.netCard, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={styles.netLabel}>Net Balance</Text>
          <Text style={[styles.netValue, { color: netBalance >= 0 ? '#86efac' : '#fca5a5' }]}>
            {netBalance >= 0 ? '+' : '-'}Rp {formatCurrencyCompact(Math.abs(netBalance))}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterRow, { backgroundColor: colors.background }]}>
        {([
          { key: 'all' as FilterType, label: 'Semua' },
          { key: 'payable' as FilterType, label: 'Hutang' },
          { key: 'receivable' as FilterType, label: 'Piutang' },
          { key: 'paid' as FilterType, label: 'Lunas' },
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && { backgroundColor: colors.tint }]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, { color: filter === tab.key ? '#fff' : colors.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Debt List */}
      <View style={{ flex: 1 }}>
        {filteredDebts.length === 0 ? (
          <EmptyState
            icon="🤝"
            title={filter === 'all' ? 'Belum ada catatan hutang piutang' : 'Tidak ada data'}
            subtitle={filter === 'all' ? 'Mulai catat hutang atau piutang kamu' : 'Tidak ada yang cocok dengan filter ini'}
          />
        ) : (
          <FlatList
            data={filteredDebts}
            keyExtractor={item => item.id}
            renderItem={renderDebtCard}
            contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 + insets.bottom }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <View style={[styles.fabContainer, { bottom: 16 + insets.bottom }]} pointerEvents="box-none">
        <FAB label="+ Hutang Piutang" onPress={() => router.push('/add-debt')} color={Colors.primary} />
      </View>

      {/* Pay Modal */}
      <BottomSheet visible={showPayModal} onClose={() => setShowPayModal(false)} title="Bayar / Cicil">
        {payDebt && (
          <>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{payDebt.counterpart}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                Sisa tagihan: Rp {formatCurrencyCompact(payDebt.amount - (payDebt.paid || 0))}
              </Text>
            </View>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nominal Pembayaran (Rp)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={(val) => setPayAmount(formatInputAmount(val))}
            />

            {accounts.length > 0 && (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Akun Keuangan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {accounts.map(acc => {
                    const isSelected = paySelectedAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: isSelected ? acc.color || colors.tint : colors.border,
                          backgroundColor: isSelected ? (acc.color || colors.tint) + '20' : colors.inputBg,
                        }}
                        onPress={() => setPaySelectedAccountId(acc.id)}
                        activeOpacity={0.7}
                      >
                        <AccountIcon icon={acc.icon} type={acc.type} size={14} />
                        <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '400', color: colors.text }}>{acc.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.tint, opacity: paySaving ? 0.7 : 1 }]}
              onPress={handlePay}
              disabled={paySaving}
              activeOpacity={0.8}
            >
              {paySaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Simpan Pembayaran</Text>}
            </TouchableOpacity>
          </>
        )}
      </BottomSheet>

      {/* Edit Modal */}
      <BottomSheet visible={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Catatan">
        {editDebt && (
          <>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Pihak Terkait</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={editCounterpart}
              onChangeText={setEditCounterpart}
              placeholder="Nama orang/lembaga"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nominal (Rp)</Text>
            <TouchableOpacity
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setShowEditCalc(true)}
              activeOpacity={0.8}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                Rp {editAmount ? formatCurrency(parseInt(editAmount.replace(/\./g, ''), 10)) : '0'}
              </Text>
              <FontAwesome name="calculator" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Catatan Tambahan</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, minHeight: 60 }]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Keterangan"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            {accounts.length > 0 && (
              <>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Akun Keuangan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {accounts.map(acc => {
                    const isSelected = editSelectedAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: isSelected ? acc.color || colors.tint : colors.border,
                          backgroundColor: isSelected ? (acc.color || colors.tint) + '20' : colors.inputBg,
                        }}
                        onPress={() => setEditSelectedAccountId(acc.id)}
                        activeOpacity={0.7}
                      >
                        <AccountIcon icon={acc.icon} type={acc.type} size={14} />
                        <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '400', color: colors.text }}>{acc.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.tint, opacity: editSaving ? 0.7 : 1, marginTop: 24 }]}
              onPress={handleEdit}
              disabled={editSaving}
              activeOpacity={0.8}
            >
              {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Simpan Perubahan</Text>}
            </TouchableOpacity>
          </>
        )}
      </BottomSheet>

      {/* Riwayat Pembayaran Modal */}
      <BottomSheet visible={showRiwayatModal} onClose={() => setShowRiwayatModal(false)} title="Riwayat Pembayaran">
        {riwayatDebt && (
          <>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{riwayatDebt.counterpart}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                Total dibayar: Rp {formatCurrencyCompact(riwayatDebt.paid || 0)} / Rp {formatCurrencyCompact(riwayatDebt.amount)}
              </Text>
            </View>
            {(riwayatDebt.payments || []).length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <FontAwesome name="history" size={32} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>Belum ada riwayat pembayaran</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
                {[...(riwayatDebt.payments || [])].reverse().map((p, idx) => (
                  <View key={p.id} style={[styles.paymentItem, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                        Rp {formatCurrencyCompact(p.amount)}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {p.notes ? ` · ${p.notes}` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => openEditPaymentModal(p)}
                        activeOpacity={0.7}
                        style={{ backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                      >
                        <FontAwesome name="pencil" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeletePayment(p, riwayatDebt)}
                        activeOpacity={0.7}
                        style={{ backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                      >
                        <FontAwesome name="trash" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </BottomSheet>

      {/* Edit Payment Modal */}
      <BottomSheet visible={showEditPaymentModal} onClose={() => setShowEditPaymentModal(false)} title="Edit Pembayaran">
        {editPayment && (
          <>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nominal (Rp)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={editPaymentAmount}
              onChangeText={(val) => setEditPaymentAmount(formatInputAmount(val))}
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Catatan</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Keterangan (opsional)"
              placeholderTextColor={colors.textMuted}
              value={editPaymentNotes}
              onChangeText={setEditPaymentNotes}
            />
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.tint, opacity: editPaymentSaving ? 0.7 : 1 }]}
              onPress={handleEditPayment}
              disabled={editPaymentSaving}
              activeOpacity={0.8}
            >
              {editPaymentSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Simpan Perubahan</Text>}
            </TouchableOpacity>
          </>
        )}
      </BottomSheet>

      <Calculator
        visible={showEditCalc}
        onClose={() => setShowEditCalc(false)}
        initialValue={parseInt(editAmount.replace(/\./g, ''), 10) || 0}
        onConfirm={(val) => setEditAmount(String(val))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.lg,
    padding: 14,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
  netCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  netLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  netValue: { fontSize: 16, fontWeight: '700' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
  },
  filterTabText: { fontSize: 13, fontWeight: '600' },
  debtCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  debtCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterpartName: { fontSize: 15, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  debtAmount: { fontSize: 18, fontWeight: '800' },
  remainingText: { fontSize: 12, marginTop: 2 },
  dueLabel: { fontSize: 11 },
  dueDate: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  daysLeft: { fontSize: 11, marginTop: 1 },
  progressContainer: { marginTop: 12 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  modalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 14,
    fontSize: 16,
  },
  modalBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  fabContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
});
