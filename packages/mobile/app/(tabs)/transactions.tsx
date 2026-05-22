import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { formatCurrency, parseAmount, getLocalToday } from '@karsafin/shared';
import type { Transaction, Category, FinancialAccount } from '@karsafin/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TransactionRow, CategoryIcon, EmptyState, FAB, BottomSheet, AccountIcon, AddCategoryModal } from '@/components';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TxType = 'income' | 'expense' | 'savings';

const formatInputAmount = (val: string) => {
  const numericVal = val.replace(/[^0-9]/g, '');
  if (!numericVal) return '';
  return parseInt(numericVal, 10).toLocaleString('id-ID');
};

export default function TransactionsScreen() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategoryIds, setFilterCategoryIds] = useState<Set<string>>(new Set());
  const [filterAccountIds, setFilterAccountIds] = useState<Set<string>>(new Set());
  const [filterRecorderNames, setFilterRecorderNames] = useState<Set<string>>(new Set());
  const [filterSource, setFilterSource] = useState<string | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilterCategoryIds, setTempFilterCategoryIds] = useState<Set<string>>(new Set());
  const [tempFilterAccountIds, setTempFilterAccountIds] = useState<Set<string>>(new Set());
  const [tempFilterRecorderNames, setTempFilterRecorderNames] = useState<Set<string>>(new Set());
  const [tempFilterSource, setTempFilterSource] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangePickerTarget, setRangePickerTarget] = useState<'start' | 'end' | null>(null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<TxType>('expense');
  const [editId, setEditId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [date, setDate] = useState(getLocalToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'savings'>('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [txRes, catRes, accRes] = await Promise.all([
        api.transactions.getAll(),
        api.categories.getAll(),
        api.accounts.getAll(),
      ]);
      setTransactions(txRes.data || []);
      setCategories(catRes.data || []);
      setAccounts(accRes.data || []);
    } catch (err) {
      console.error('Load transactions error:', err);
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

  const filtered = transactions.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchCat = t.category?.name?.toLowerCase().includes(q);
      const matchAmount = t.amount.toString().includes(q);
      if (!matchDesc && !matchCat && !matchAmount) return false;
    }

    if (filterCategoryIds.size > 0 && !filterCategoryIds.has(t.category_id)) return false;
    if (filterAccountIds.size > 0 && (!t.account_id || !filterAccountIds.has(t.account_id))) return false;
    if (filterRecorderNames.size > 0 && (!t.sender_name || !filterRecorderNames.has(t.sender_name))) return false;
    if (filterSource !== 'all') {
      const src = (t.source || 'manual').toLowerCase();
      if (src !== filterSource.toLowerCase()) return false;
    }

    if (timeFilter === 'today') {
      const now = new Date();
      const txDate = new Date(t.date);
      if (
        txDate.getDate() !== now.getDate() ||
        txDate.getMonth() !== now.getMonth() ||
        txDate.getFullYear() !== now.getFullYear()
      ) {
        return false;
      }
    } else if (timeFilter === 'month') {
      const now = new Date();
      const txDate = new Date(t.date);
      if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
        return false;
      }
    } else if (timeFilter === 'custom') {
      const txDate = new Date(t.date);
      txDate.setHours(0, 0, 0, 0);

      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (txDate < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }
    }

    if (typeFilter !== 'all' && t.type !== typeFilter) return false;

    return true;
  });

  const recorders = [...new Set(transactions.map(t => t.sender_name).filter(Boolean))].sort() as string[];

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const dateKey = t.date.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {});

  const dateKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const openAddModal = (type: TxType) => {
    setModalType(type);
    setEditId(null);
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
    setSelectedAccount(defaultAcc?.id || null);
    setDate(getLocalToday());
    setShowModal(true);
  };

  const openEditModal = (tx: Transaction) => {
    setModalType(tx.type);
    setEditId(tx.id);
    setAmount(tx.amount.toLocaleString('id-ID'));
    setDescription(tx.description);
    setSelectedCategory(tx.category_id);
    setSelectedAccount(tx.account_id || null);
    setDate(tx.date.split('T')[0]);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      Alert.alert('Error', 'Jumlah harus lebih dari 0');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Pilih kategori');
      return;
    }

    setSaving(true);
    try {
      const txData = {
        type: modalType,
        amount: parsedAmount,
        description,
        date,
        category_id: selectedCategory,
        account_id: selectedAccount || undefined,
        source: 'manual',
      };

      if (editId) {
        const { error } = await api.transactions.update(editId, txData);
        if (error) throw error;
      } else {
        const { error } = await api.transactions.create(user.id, txData as any);
        if (error) throw error;
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Hapus Transaksi', 'Yakin ingin menghapus?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          await api.transactions.delete(id);
          await loadData();
        }
      },
    ]);
  };

  const filteredCategories = categories.filter(c => c.type === modalType);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalSavings = filtered.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0);

  const modalTitle = `${editId ? 'Edit' : 'Tambah'} ${modalType === 'income' ? 'Pemasukan' : modalType === 'expense' ? 'Pengeluaran' : 'Tabungan'}`;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 16, color: colors.tint }}>Memuat Transaksi...</Text>
      </View>
    );
  }

  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerSection, { backgroundColor: colors.tint }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
            <FontAwesome name="chevron-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.headerTitleText}>Transaksi Anda</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Cari transaksi..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 3 }}>
          {(['all', 'income', 'expense', 'savings'] as const).map((type) => {
            const active = typeFilter === type;
            const label = type === 'all' ? 'Semua' : type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Tabungan';
            return (
              <TouchableOpacity
                key={type}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 11,
                  backgroundColor: active ? '#fff' : 'transparent',
                  alignItems: 'center',
                }}
                onPress={() => setTypeFilter(type)}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: active ? '#333' : 'rgba(255,255,255,0.7)',
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
          <TouchableOpacity 
            style={timeFilter === 'all' ? styles.chipActive : styles.chipInactive}
            onPress={() => setTimeFilter('all')}
          >
            <Text style={timeFilter === 'all' ? styles.chipTextActive : styles.chipTextInactive}>Semua</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={timeFilter === 'today' ? styles.chipActive : styles.chipInactive}
            onPress={() => setTimeFilter('today')}
          >
            <Text style={timeFilter === 'today' ? styles.chipTextActive : styles.chipTextInactive}>Hari Ini</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={timeFilter === 'month' ? styles.chipActive : styles.chipInactive}
            onPress={() => setTimeFilter('month')}
          >
            <Text style={timeFilter === 'month' ? styles.chipTextActive : styles.chipTextInactive}>Bulan Ini</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={timeFilter === 'custom' ? styles.chipActive : styles.chipInactive}
            onPress={() => {
              setTempStartDate(customStartDate);
              setTempEndDate(customEndDate);
              setShowRangeModal(true);
            }}
          >
            <Text style={timeFilter === 'custom' ? styles.chipTextActive : styles.chipTextInactive}>
              {timeFilter === 'custom' && (customStartDate || customEndDate)
                ? `📅 ${customStartDate ? customStartDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '...'} - ${customEndDate ? customEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '...'}` 
                : '📅 Pilih Tanggal'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, { backgroundColor: filterCategoryIds.size > 0 || filterAccountIds.size > 0 || filterRecorderNames.size > 0 || filterSource !== 'all' ? colors.tint : colors.card }]} onPress={() => { setTempFilterCategoryIds(new Set(filterCategoryIds)); setTempFilterAccountIds(new Set(filterAccountIds)); setTempFilterRecorderNames(new Set(filterRecorderNames)); setTempFilterSource(filterSource); setShowFilterModal(true); }} activeOpacity={0.7}>
            <Text style={{ fontSize: 12 }}>🔍</Text>
            <Text style={[styles.filterBtnText, { color: filterCategoryIds.size > 0 || filterAccountIds.size > 0 || filterRecorderNames.size > 0 || filterSource !== 'all' ? '#fff' : colors.text }]}>
              Filter{(filterCategoryIds.size > 0 || filterAccountIds.size > 0 || filterRecorderNames.size > 0 || filterSource !== 'all') ? ' ✓' : ''}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={{ alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 16, alignSelf: 'center' }} onPress={() => router.push('/buku-transaksi')} activeOpacity={0.7}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>📒 Lihat Buku Transaksi</Text>
        </TouchableOpacity>

      </View>

      <BottomSheet visible={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter Transaksi">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Kategori */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Kategori</Text>

          {/* Pemasukan */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.success, marginBottom: 6 }}>Pemasukan</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <TouchableOpacity
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => {
                const incomeIds = categories.filter(c => c.type === 'income').map(c => c.id);
                const allSelected = incomeIds.every(id => tempFilterCategoryIds.has(id));
                const next = new Set(tempFilterCategoryIds);
                if (allSelected) incomeIds.forEach(id => next.delete(id));
                else incomeIds.forEach(id => next.add(id));
                setTempFilterCategoryIds(next);
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: categories.filter(c => c.type === 'income').every(cat => tempFilterCategoryIds.has(cat.id)) ? Colors.success : colors.border, backgroundColor: categories.filter(c => c.type === 'income').every(cat => tempFilterCategoryIds.has(cat.id)) ? Colors.success : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                {categories.filter(c => c.type === 'income').every(cat => tempFilterCategoryIds.has(cat.id)) && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
              </View>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Semua Pemasukan</Text>
            </TouchableOpacity>
            {categories.filter(c => c.type === 'income').map((cat) => {
              const checked = tempFilterCategoryIds.has(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={{ backgroundColor: checked ? (cat.color || colors.tint) + '25' : colors.inputBg, borderWidth: 1, borderColor: checked ? cat.color || colors.tint : colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => {
                    const next = new Set(tempFilterCategoryIds);
                    if (checked) next.delete(cat.id); else next.add(cat.id);
                    setTempFilterCategoryIds(next);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
                  <Text style={{ color: checked ? cat.color || colors.tint : colors.text, fontWeight: '600', fontSize: 12 }}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Pengeluaran */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.danger, marginBottom: 6 }}>Pengeluaran</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            <TouchableOpacity
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => {
                const expenseIds = categories.filter(c => c.type === 'expense').map(c => c.id);
                const allSelected = expenseIds.every(id => tempFilterCategoryIds.has(id));
                const next = new Set(tempFilterCategoryIds);
                if (allSelected) expenseIds.forEach(id => next.delete(id));
                else expenseIds.forEach(id => next.add(id));
                setTempFilterCategoryIds(next);
              }}
              activeOpacity={0.7}
            >
              <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: categories.filter(c => c.type === 'expense').every(cat => tempFilterCategoryIds.has(cat.id)) ? Colors.danger : colors.border, backgroundColor: categories.filter(c => c.type === 'expense').every(cat => tempFilterCategoryIds.has(cat.id)) ? Colors.danger : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                {categories.filter(c => c.type === 'expense').every(cat => tempFilterCategoryIds.has(cat.id)) && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
              </View>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Semua Pengeluaran</Text>
            </TouchableOpacity>
            {categories.filter(c => c.type === 'expense').map((cat) => {
              const checked = tempFilterCategoryIds.has(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={{ backgroundColor: checked ? (cat.color || colors.tint) + '25' : colors.inputBg, borderWidth: 1, borderColor: checked ? cat.color || colors.tint : colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => {
                    const next = new Set(tempFilterCategoryIds);
                    if (checked) next.delete(cat.id); else next.add(cat.id);
                    setTempFilterCategoryIds(next);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
                  <Text style={{ color: checked ? cat.color || colors.tint : colors.text, fontWeight: '600', fontSize: 12 }}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Akun Keuangan */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Akun Keuangan</Text>
          {(['bank', 'ewallet', 'investment', 'other'] as const).map((accType) => {
            const typeAccounts = accounts.filter(a => a.type === accType);
            if (typeAccounts.length === 0) return null;
            const typeLabel = accType === 'bank' ? '🏦 Bank' : accType === 'ewallet' ? '📱 E-Wallet' : accType === 'investment' ? '📈 Investasi' : '💵 Cash';
            const typeIds = typeAccounts.map(a => a.id);
            const allSelected = typeIds.every(id => tempFilterAccountIds.has(id));
            return (
              <View key={accType} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 }}>{typeLabel}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => {
                      const next = new Set(tempFilterAccountIds);
                      if (allSelected) typeIds.forEach(id => next.delete(id));
                      else typeIds.forEach(id => next.add(id));
                      setTempFilterAccountIds(next);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: allSelected ? colors.tint : colors.border, backgroundColor: allSelected ? colors.tint : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      {allSelected && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Semua</Text>
                  </TouchableOpacity>
                  {typeAccounts.map((acc) => {
                    const checked = tempFilterAccountIds.has(acc.id);
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={{ backgroundColor: checked ? (acc.color || colors.tint) + '25' : colors.inputBg, borderWidth: 1, borderColor: checked ? acc.color || colors.tint : colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                        onPress={() => {
                          const next = new Set(tempFilterAccountIds);
                          if (checked) next.delete(acc.id); else next.add(acc.id);
                          setTempFilterAccountIds(next);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: checked ? acc.color || colors.tint : colors.text, fontWeight: '600', fontSize: 12 }}>{acc.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Dicatat Oleh */}
          {activeWorkspace?.type === 'family' && recorders.length > 0 && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Dicatat Oleh</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => {
                    const allSelected = recorders.every(n => tempFilterRecorderNames.has(n));
                    const next = new Set(tempFilterRecorderNames);
                    if (allSelected) recorders.forEach(n => next.delete(n));
                    else recorders.forEach(n => next.add(n));
                    setTempFilterRecorderNames(next);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: recorders.every(n => tempFilterRecorderNames.has(n)) ? colors.tint : colors.border, backgroundColor: recorders.every(n => tempFilterRecorderNames.has(n)) ? colors.tint : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                    {recorders.every(n => tempFilterRecorderNames.has(n)) && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Semua</Text>
                </TouchableOpacity>
                {recorders.map((name) => {
                  const checked = tempFilterRecorderNames.has(name);
                  return (
                    <TouchableOpacity
                      key={name}
                      style={{ backgroundColor: checked ? colors.tint + '25' : colors.inputBg, borderWidth: 1, borderColor: checked ? colors.tint : colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                      onPress={() => {
                        const next = new Set(tempFilterRecorderNames);
                        if (checked) next.delete(name); else next.add(name);
                        setTempFilterRecorderNames(next);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: checked ? colors.tint : colors.text, fontWeight: '600', fontSize: 12 }}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Dicatat Dari */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Dicatat Dari</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <TouchableOpacity
              style={tempFilterSource === 'all' ? { backgroundColor: colors.tint, borderWidth: 1, borderColor: colors.tint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 } : { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
              onPress={() => setTempFilterSource('all')}
            >
              <Text style={tempFilterSource === 'all' ? { color: '#fff', fontWeight: '600', fontSize: 12 } : { color: colors.text, fontWeight: '600', fontSize: 12 }}>Semua</Text>
            </TouchableOpacity>
            {[{ label: 'Manual', value: 'manual' }, { label: 'AI Asisten', value: 'ai' }, { label: 'Telegram', value: 'telegram' }, { label: 'WhatsApp', value: 'whatsapp' }].map(({ label, value }) => (
              <TouchableOpacity
                key={value}
                style={tempFilterSource === value ? { backgroundColor: colors.tint, borderWidth: 1, borderColor: colors.tint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 } : { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                onPress={() => setTempFilterSource(tempFilterSource === value ? 'all' : value)}
              >
                <Text style={tempFilterSource === value ? { color: '#fff', fontWeight: '600', fontSize: 12 } : { color: colors.text, fontWeight: '600', fontSize: 12 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={{ backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}
            onPress={() => {
              setFilterCategoryIds(new Set(tempFilterCategoryIds));
              setFilterAccountIds(new Set(tempFilterAccountIds));
              setFilterRecorderNames(new Set(tempFilterRecorderNames));
              setFilterSource(tempFilterSource);
              setShowFilterModal(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Terapkan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 12, marginBottom: 16 }}
            onPress={() => {
              setTempFilterCategoryIds(new Set());
              setTempFilterAccountIds(new Set());
              setTempFilterRecorderNames(new Set());
              setTempFilterSource('all');
            }}
            activeOpacity={0.6}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Reset Filter</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={showRangeModal} onClose={() => setShowRangeModal(false)} title="Pilih Rentang Waktu">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Dari Tanggal</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}
          onPress={() => setRangePickerTarget('start')}
          activeOpacity={0.7}
        >
          <Text style={{ color: tempStartDate ? colors.text : colors.textMuted, fontSize: 16 }}>
            {tempStartDate 
              ? tempStartDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : 'Pilih tanggal mulai'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sampai Tanggal</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}
          onPress={() => setRangePickerTarget('end')}
          activeOpacity={0.7}
        >
          <Text style={{ color: tempEndDate ? colors.text : colors.textMuted, fontSize: 16 }}>
            {tempEndDate 
              ? tempEndDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              : 'Pilih tanggal selesai'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: '#1a56db' }]}
          onPress={() => {
            setCustomStartDate(tempStartDate);
            setCustomEndDate(tempEndDate);
            setTimeFilter('custom');
            setShowRangeModal(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>Terapkan</Text>
        </TouchableOpacity>
      </BottomSheet>

      {rangePickerTarget && (
        <DateTimePicker
          value={rangePickerTarget === 'start' ? (tempStartDate || new Date()) : (tempEndDate || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            const target = rangePickerTarget;
            setRangePickerTarget(null);
            
            if (selectedDate && event.type !== 'dismissed') {
              const offset = selectedDate.getTimezoneOffset();
              const fixedDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
              
              if (target === 'start') {
                setTempStartDate(fixedDate);
              } else {
                setTempEndDate(fixedDate);
              }
            }
          }}
        />
      )}

      <FlatList
        data={dateKeys}
        keyExtractor={(item) => item}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        ListEmptyComponent={
          <EmptyState
            icon="📭"
            title="Belum ada transaksi"
            subtitle="Mulai catat pemasukan dan pengeluaran pertama Anda"
            actionLabel="Buat Transaksi"
            onAction={() => openAddModal('expense')}
          />
        }
        renderItem={({ item: dateKey }) => {
          const txs = grouped[dateKey];
          const dateLabel = new Date(dateKey).toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long',
          });
          return (
            <View style={styles.dateGroup}>
              <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>{dateLabel}</Text>
              {txs.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onPress={() => openEditModal(t)}
                  onLongPress={() => handleDelete(t.id)}
                  workspaceType={activeWorkspace?.type}
                />
              ))}
            </View>
          );
        }}
      />

      <View style={styles.fabRow}>
        <FAB label="+ Masuk" onPress={() => openAddModal('income')} color={Colors.success} />
        <FAB label="+ Keluar" onPress={() => openAddModal('expense')} color={Colors.danger} />
        <FAB label="+ Tabung" onPress={() => openAddModal('savings')} color={Colors.warning} />
      </View>

      <BottomSheet visible={showModal} onClose={() => setShowModal(false)} title={modalTitle}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Jumlah (Rp)</Text>
        <TextInput
          style={[styles.amountInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          value={amount}
          onChangeText={(val) => setAmount(formatInputAmount(val))}
          keyboardType="numeric"
        />

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Keterangan</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Deskripsi transaksi"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tanggal</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>
            {new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                const offset = selectedDate.getTimezoneOffset();
                const fixedDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
                setDate(fixedDate.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Kategori</Text>
        <View style={styles.categoryGrid}>
          {filteredCategories.map((c) => {
            const active = selectedCategory === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: active ? (c.color || colors.tint) + '25' : colors.inputBg,
                    borderColor: active ? c.color || colors.tint : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(c.id)}
                activeOpacity={0.7}
              >
                <CategoryIcon emoji={c.icon} size={18} color={c.color || colors.tint} />
                <Text
                  style={[styles.categoryName, { color: active ? c.color || colors.tint : colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[
              styles.categoryItem,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                borderStyle: 'dashed',
                borderWidth: 1.5,
              },
            ]}
            onPress={() => setShowAddCategory(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, color: colors.textMuted }}>+</Text>
            <Text
              style={[styles.categoryName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Baru
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Akun Keuangan</Text>
        {accounts.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Belum ada akun keuangan. Atur di Pengaturan.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {accounts.map(acc => {
              const active = selectedAccount === acc.id;
              let icon = '💵';
              if (acc.type === 'bank') icon = '💳';
              else if (acc.type === 'ewallet') icon = '📱';
              else if (acc.type === 'investment') icon = '📈';

              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: active ? (acc.color || colors.tint) + '25' : colors.inputBg,
                      borderColor: active ? acc.color || colors.tint : colors.border,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                    },
                  ]}
                  onPress={() => setSelectedAccount(acc.id)}
                  activeOpacity={0.7}
                >
                  <AccountIcon icon={acc.icon} type={acc.type} size={15} />
                  <Text
                    style={[styles.categoryName, { color: active ? colors.text : colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {editId && (
          <TouchableOpacity
            style={[styles.deleteBtn]}
            onPress={() => {
              setShowModal(false);
              handleDelete(editId);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteBtnText}>Hapus Transaksi</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: modalType === 'income' ? Colors.success : modalType === 'expense' ? Colors.danger : Colors.warning,
              opacity: saving ? 0.7 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {editId ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </Text>
          )}
        </TouchableOpacity>
      </BottomSheet>

      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSave={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
          setSelectedCategory(newCat.id);
          setShowAddCategory(false);
        }}
        initialType={modalType}
      />
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 8,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  searchWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: 10,
    fontSize: 14,
    zIndex: 2,
    opacity: 0.5,
  },
  searchInput: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingLeft: 40,
    paddingRight: 14,
    fontSize: 13,
  },
  filterScroll: {
    flexGrow: 0,
  },
  chipActive: {
    backgroundColor: '#785900',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  chipTextInactive: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterBtnText: {
    fontWeight: '600',
    fontSize: 11,
  },

  dateGroup: { marginBottom: 12, paddingHorizontal: 16 },
  dateHeader: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'capitalize' },

  fabRow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  amountInput: {
    borderRadius: BorderRadius.lg - 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '800',
    borderWidth: 1,
    textAlign: 'center',
  },
  input: {
    borderRadius: BorderRadius.lg - 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  categoryName: { fontSize: 13, fontWeight: '600', maxWidth: 80 },

  deleteBtn: {
    borderRadius: BorderRadius.lg - 2,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    borderRadius: BorderRadius.lg - 2,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
