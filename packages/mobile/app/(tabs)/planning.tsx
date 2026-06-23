import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { useColors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { formatCurrencyCompact, parseAmount, getLocalToday } from '@karsafin/shared';
import type { Savings, Budget, Event, Category, Transaction, FinancialAccount } from '@karsafin/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SavingsCard, EmptyState, FAB, BottomSheet, CategoryIcon, AccountIcon, ShoppingTab, InvestmentTab } from '@/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

const formatInputAmount = (val: string) => {
  const numericVal = val.replace(/[^0-9]/g, '');
  if (!numericVal) return '';
  return parseInt(numericVal, 10).toLocaleString('id-ID');
};

export default function PlanningScreen() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const colorScheme = useColorScheme() ?? 'dark';
  useColors();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Tabungan Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState(getLocalToday());
  const [color, setColor] = useState(Colors.primary);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const now = new Date();
      const [savRes, budRes, evRes, catRes, txRes, accRes] = await Promise.all([
        api.savings.getAll(),
        api.budgets.getByMonth(now.getFullYear(), now.getMonth() + 1),
        api.events.getAll(),
        api.categories.getAll(),
        api.transactions.getAll(),
        api.accounts.getAll()
      ]);
      setSavings(savRes.data || []);
      setBudgets(budRes.data || []);
      setEvents(evRes.data || []);
      setCategories(catRes.data || []);
      setTransactions(txRes.data || []);
      setAccounts(accRes.data || []);
    } catch (err) {
      console.error('Load planning data error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace]);

  // Budget Modal State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, string>>({});
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');
  const [newCategoryColor, setNewCategoryColor] = useState('#1a56db');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Budget History State
  const [showBudgetHistory, setShowBudgetHistory] = useState(false);
  const [budgetHistoryMonths, setBudgetHistoryMonths] = useState<{ year: number; month: number }[]>([]);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<{ year: number; month: number } | null>(null);
  const [historyBudgets, setHistoryBudgets] = useState<Budget[]>([]);
  const [applyingBudget, setApplyingBudget] = useState(false);

  // Event Modal State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(getLocalToday());
  const [eventBudget, setEventBudget] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);

  // Tabungan Add Balance Modal State
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [addBalanceTargetId, setAddBalanceTargetId] = useState<string | null>(null);
  const [addBalanceAmount, setAddBalanceAmount] = useState('');
  const [lockedAccountId, setLockedAccountId] = useState<string>('');
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');

  // Tabungan Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferSourceAccountId, setTransferSourceAccountId] = useState<string>('');
  const [transferDestinationAccountId, setTransferDestinationAccountId] = useState<string>('');
  const [transferSaving, setTransferSaving] = useState(false);

  // Savings History State
  const [showSavingsHistory, setShowSavingsHistory] = useState(false);

  // Budget History - Selected categories to apply
  const [selectedHistoryApplyIds, setSelectedHistoryApplyIds] = useState<Set<string>>(new Set());

  // Realisasi History State
  const [showRealizationHistory, setShowRealizationHistory] = useState(false);
  const [realizationHistoryMonths, setRealizationHistoryMonths] = useState<{ year: number; month: number }[]>([]);
  const [selectedRealizationMonth, setSelectedRealizationMonth] = useState<{ year: number; month: number } | null>(null);
  const [realizationBudgets, setRealizationBudgets] = useState<any[]>([]);
  const [selectedRealizationApplyIds, setSelectedRealizationApplyIds] = useState<Set<string>>(new Set());
  const [applyingRealization, setApplyingRealization] = useState(false);

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

  const openAddModal = () => {
    setEditId(null);
    setName('');
    setTarget('');
    setCurrent('');
    setDeadline(getLocalToday());
    setColor(Colors.primary);
    setSelectedAccountId('');
    setShowModal(true);
  };

  const openEditModal = (g: Savings) => {
    setEditId(g.id);
    setName(g.name);
    setTarget(g.target.toLocaleString('id-ID'));
    setCurrent(g.current.toLocaleString('id-ID'));
    setDeadline(g.deadline ? g.deadline.split('T')[0] : getLocalToday());
    setColor(g.color || Colors.primary);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const pTarget = parseAmount(target);
    const pCurrent = parseAmount(current);

    if (!name.trim()) {
      Alert.alert('Error', 'Nama target tidak boleh kosong');
      return;
    }
    if (pTarget <= 0) {
      Alert.alert('Error', 'Target tabungan harus lebih dari 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        target: pTarget,
        current: pCurrent,
        deadline,
        color,
      };

      if (editId) {
        const { error } = await api.savings.update(editId, payload);
        if (error) throw error;
      } else {
        const { data: newSavings, error } = await api.savings.create(user.id, payload);
        if (error) throw error;

        if (pCurrent > 0 && selectedAccountId && newSavings) {
          // Create category with target name
          const { data: newCat, error: catErr } = await api.categories.create(user.id, {
            name: name.trim(),
            icon: '🏦',
            color: color,
            type: 'savings',
          });
          if (catErr) throw catErr;

          await api.transactions.create(user.id, {
            type: 'savings',
            amount: pCurrent,
            savings_id: newSavings.id,
            account_id: selectedAccountId,
            category_id: newCat?.id || undefined,
            date: new Date().toISOString().split('T')[0],
            description: `Saldo awal tabungan ${name}`,
            source: 'manual',
          } as any);
        }
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan target');
    } finally {
      setSaving(false);
    }
  };

  const openAddBalanceModal = (g: Savings) => {
    setAddBalanceTargetId(g.id);
    setAddBalanceAmount('');
    setLockedAccountId('');
    setSelectedAccountId(accounts.find(a => a.is_default)?.id || accounts[0]?.id || '');
    setShowDestinationPicker(false);
    setSelectedDestinationId('');
    setShowAddBalanceModal(true);
  };

  const handleSaveBalance = async () => {
    if (!addBalanceTargetId) return;
    const amount = parseAmount(addBalanceAmount);
    if (amount <= 0) {
      Alert.alert('Error', 'Nominal harus lebih dari 0');
      return;
    }
    
    setSaving(true);
    try {
      const target = savings.find(s => s.id === addBalanceTargetId);
      if (!target) return;
      
      const newCurrent = target.current + amount;
      const { error } = await api.savings.update(target.id, { current: newCurrent });
      if (error) throw error;
      
      if (user) {
        const payload: any = {
          type: 'savings',
          amount: amount,
          savings_id: target.id,
          date: new Date().toISOString(),
          description: `Menabung untuk: ${target.name}`,
          source: 'manual',
          account_id: selectedAccountId || undefined,
        };
        await api.transactions.create(user.id, payload);
      }
      
      setShowAddBalanceModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menambah saldo');
    } finally {
      setSaving(false);
    }
  };

  const openTransferModal = (g: Savings) => {
    setTransferTargetId(g.id);
    setTransferAmount('');
    
    let defaultSourceId = accounts.find(a => a.is_default)?.id || accounts[0]?.id || '';
    const firstTx = transactions
      .filter(t => t.type === 'savings' && t.savings_id === g.id && t.account_id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    
    if (firstTx && firstTx.account_id) {
      defaultSourceId = firstTx.account_id;
    }
    
    setTransferSourceAccountId(defaultSourceId);
    
    const destAcc = accounts.find(a => a.id !== defaultSourceId);
    setTransferDestinationAccountId(destAcc?.id || '');
    setShowTransferModal(true);
  };

  const handleSaveTransfer = async () => {
    if (!transferTargetId) return;
    const amount = parseAmount(transferAmount);
    if (amount <= 0) {
      Alert.alert('Error', 'Nominal harus lebih dari 0');
      return;
    }
    if (!transferSourceAccountId) {
      Alert.alert('Error', 'Pilih akun keuangan asal terlebih dahulu');
      return;
    }
    if (!transferDestinationAccountId) {
      Alert.alert('Error', 'Pilih akun keuangan tujuan terlebih dahulu');
      return;
    }
    if (transferSourceAccountId === transferDestinationAccountId) {
      Alert.alert('Error', 'Akun asal dan akun tujuan tidak boleh sama');
      return;
    }

    setTransferSaving(true);
    try {
      const target = savings.find(s => s.id === transferTargetId);
      if (!target) return;

      const newCurrent = target.current + amount;
      const { error } = await api.savings.update(target.id, { current: newCurrent });
      if (error) throw error;

      if (user) {
        const payload: any = {
          type: 'savings',
          amount: amount,
          savings_id: target.id,
          date: new Date().toISOString(),
          description: `Transfer menabung: ${target.name}`,
          source: 'manual',
          account_id: transferSourceAccountId,
          destination_account_id: transferDestinationAccountId,
        };
        await api.transactions.create(user.id, payload);
      }

      setShowTransferModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal melakukan transfer tabungan');
    } finally {
      setTransferSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    const relatedCount = transactions.filter(t => t.type === 'savings' && t.savings_id === id).length;
    const msg = relatedCount > 0
      ? `Yakin ingin menghapus target tabungan ini?\n\n${relatedCount} transaksi tabungan terkait juga akan dihapus.`
      : 'Yakin ingin menghapus target tabungan ini?';
    Alert.alert('Hapus Target', msg, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          const target = savings.find(s => s.id === id);
          const targetName = target?.name || '';

          // Delete all related transactions first
          const related = transactions.filter(t => t.type === 'savings' && t.savings_id === id);
          for (const tx of related) {
            await api.transactions.delete(tx.id);
          }

          // Delete the associated category (type: savings, name matches target)
          if (targetName) {
            const cat = categories.find(c => c.type === 'savings' && c.name === targetName);
            if (cat) {
              await api.categories.delete(cat.id);
            }
          }

          await api.savings.delete(id);
          await loadData();
        }
      },
    ]);
  };

  const openBudgetModal = () => {
    const initial: Record<string, string> = {};
    categories.filter(c => c.type === 'expense').forEach(c => {
      const existing = budgets.find(b => b.category_id === c.id);
      initial[c.id] = existing ? existing.amount.toLocaleString('id-ID') : '';
    });
    setBudgetAmounts(initial);
    setShowNewCategoryForm(false);
    setNewCategoryName('');
    setNewCategoryIcon('📦');
    setNewCategoryColor('#1a56db');
    setShowBudgetModal(true);
  };

  const handleSaveBudget = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const promises = [];
      for (const catId of Object.keys(budgetAmounts)) {
        const amtStr = budgetAmounts[catId];
        const pAmount = parseAmount(amtStr);
        if (pAmount > 0) {
          const cat = categories.find(c => c.id === catId);
          promises.push(api.budgets.upsert(user.id, {
            category_id: catId,
            amount: pAmount,
            mode: 'nominal',
            month,
            year
          }));
        }
      }

      await Promise.all(promises);
      setShowBudgetModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan anggaran');
    } finally {
      setSaving(false);
    }
  };

  const openBudgetHistory = async () => {
    try {
      const { data } = await api.budgets.getAllHistory();
      setBudgetHistoryMonths(data || []);
      setSelectedHistoryMonth(null);
      setHistoryBudgets([]);
      setSelectedHistoryApplyIds(new Set());
      setShowBudgetHistory(true);
    } catch (err) {
      console.error('Fetch budget history error:', err);
    }
  };

  const loadHistoryBudgets = async (year: number, month: number) => {
    try {
      const { data } = await api.budgets.getByMonth(year, month);
      setHistoryBudgets(data || []);
      setSelectedHistoryApplyIds(new Set((data || []).map(b => b.category_id)));
    } catch (err) {
      console.error('Load history budgets error:', err);
      setHistoryBudgets([]);
    }
  };

  const handleApplyBudget = async () => {
    if (!user || !selectedHistoryMonth || selectedHistoryApplyIds.size === 0) return;
    setApplyingBudget(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const budgetsToApply = historyBudgets.filter(b => selectedHistoryApplyIds.has(b.category_id));
      const promises = budgetsToApply.map((b) =>
        api.budgets.upsert(user.id, {
          category_id: b.category_id,
          amount: b.amount,
          mode: 'nominal',
          month: currentMonth,
          year: currentYear,
        })
      );

      await Promise.all(promises);
      Alert.alert('Berhasil', `${budgetsToApply.length} anggaran berhasil diterapkan ke bulan ini`);
      setShowBudgetHistory(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menerapkan anggaran');
    } finally {
      setApplyingBudget(false);
    }
  };

  const openRealizationHistory = async () => {
    try {
      const { data } = await api.budgets.getAllHistory();
      setRealizationHistoryMonths(data || []);
      setSelectedRealizationMonth(null);
      setRealizationBudgets([]);
      setSelectedRealizationApplyIds(new Set());
      setShowRealizationHistory(true);
    } catch (err) {
      console.error('Fetch realization history error:', err);
    }
  };

  const loadRealizationBudgets = async (year: number, month: number) => {
    try {
      const { data } = await api.budgets.getByMonthWithRealization(year, month);
      setRealizationBudgets(data || []);
      setSelectedRealizationApplyIds(new Set((data || []).map((b: any) => b.category_id)));
    } catch (err) {
      console.error('Load realization budgets error:', err);
      setRealizationBudgets([]);
    }
  };

  const handleApplyRealization = async () => {
    if (!user || !selectedRealizationMonth || selectedRealizationApplyIds.size === 0) return;
    setApplyingRealization(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const budgetsToApply = realizationBudgets.filter((b: any) => selectedRealizationApplyIds.has(b.category_id));
      const promises = budgetsToApply.map((b: any) =>
        api.budgets.upsert(user.id, {
          category_id: b.category_id,
          amount: b.amount,
          mode: 'nominal',
          month: currentMonth,
          year: currentYear,
        })
      );

      await Promise.all(promises);
      Alert.alert('Berhasil', `${budgetsToApply.length} realisasi anggaran berhasil diterapkan ke bulan ini`);
      setShowRealizationHistory(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menerapkan realisasi');
    } finally {
      setApplyingRealization(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!user) return;
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Nama kategori tidak boleh kosong');
      return;
    }
    setCreatingCategory(true);
    try {
      const { data, error } = await api.categories.create(user.id, {
        name: newCategoryName.trim(),
        icon: newCategoryIcon.trim() || '📦',
        color: newCategoryColor,
        type: 'expense'
      });
      if (error) throw error;
      if (data) {
        // Refresh categories
        const catRes = await api.categories.getAll();
        setCategories(catRes.data || []);
        
        // Add to budgetAmounts record
        setBudgetAmounts(prev => ({
          ...prev,
          [data.id]: ''
        }));
        
        // Clear state
        setNewCategoryName('');
        setNewCategoryIcon('📦');
        setNewCategoryColor('#1a56db');
        setShowNewCategoryForm(false);
        Alert.alert('Berhasil', 'Kategori baru berhasil ditambahkan!');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menambahkan kategori');
    } finally {
      setCreatingCategory(false);
    }
  };

  const openAddEventModal = () => {
    setEditEventId(null);
    setEventName('');
    setEventBudget('');
    setEventDate(getLocalToday());
    setEventNotes('');
    setShowEventModal(true);
  };

  const openEditEventModal = (e: Event) => {
    setEditEventId(e.id);
    setEventName(e.name);
    setEventBudget(e.budget.toLocaleString('id-ID'));
    setEventDate(e.date ? e.date.split('T')[0] : getLocalToday());
    setEventNotes(e.notes || '');
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!user) return;
    const pBudget = parseAmount(eventBudget);
    if (!eventName.trim()) {
      Alert.alert('Error', 'Nama acara tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: eventName,
        date: eventDate,
        budget: pBudget,
        notes: eventNotes,
        archived: false,
      };

      if (editEventId) {
        const { error } = await api.events.update(editEventId, payload);
        if (error) throw error;
      } else {
        const { error } = await api.events.create(user.id, payload);
        if (error) throw error;
      }
      setShowEventModal(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan acara');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = (id: string) => {
    Alert.alert('Hapus Acara', 'Yakin ingin menghapus acara ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          await api.events.delete(id);
          await loadData();
        }
      },
    ]);
  };

  const COLOR_OPTIONS = [Colors.primary, Colors.success, Colors.danger, '#F59E0B', '#8B5CF6', '#EC4899'];

  const params = useLocalSearchParams<{ tab?: 'anggaran' | 'acara' | 'tabungan' | 'investasi' | 'belanja' }>();
  const [activeTab, setActiveTab] = useState<'anggaran' | 'acara' | 'tabungan' | 'investasi' | 'belanja'>(params.tab || 'anggaran');

  useEffect(() => {
    if (params.tab) {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 16, color: colors.tint }}>Memuat Rencana...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={{ paddingTop: Math.max(insets.top, 20) + 32, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 20, backgroundColor: colors.tint }}>
          <View style={[styles.segmentContainer, { marginBottom: 0, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 2, paddingVertical: 2 }]}>
            {(['anggaran', 'acara', 'tabungan', 'investasi', 'belanja'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.segmentBtn,
                  { paddingVertical: 8, borderRadius: 8 },
                  activeTab === tab && { backgroundColor: '#fff' }
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.segmentText,
                    { color: activeTab === tab ? colors.tint : 'rgba(255,255,255,0.8)' },
                    activeTab === tab && { fontWeight: '700' },
                    { fontSize: 10.5 }
                  ]}
                >
                  {tab === 'anggaran' ? 'Anggaran' : tab === 'acara' ? 'Acara' : tab === 'tabungan' ? 'Tabungan' : tab === 'investasi' ? 'Investasi' : 'Belanja'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>

        {activeTab === 'tabungan' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Daftar Tabungan</Text>
              <TouchableOpacity onPress={openAddModal} style={{ backgroundColor: colors.tint + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>+ Tambah Tabungan</Text>
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                <Text style={{ fontSize: 14 }}>💡</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Tips Menabung:</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 }}>
                Setelah membuat target tabungan, kamu bisa mulai menabung dengan 2 cara:
              </Text>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>1. Tombol + Saldo:</Text> Jika kamu memiliki uang di akun A dan ingin disisihkan khusus untuk target ini.
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>2. Tombol Transfer:</Text> Jika kamu mentransfer uang dari akun A ke akun keuangan yang lain.
                </Text>
              </View>
            </View>
            {savings.length === 0 ? (
              <EmptyState
                icon="🎯"
                title="Target Tabungan"
                subtitle="Tekan tombol di atas untuk membuat target pertama Anda"
                actionLabel="Buat Target"
                onAction={openAddModal}
              />
            ) : (
              savings.map((g) => (
                <SavingsCard
                  key={g.id}
                  goal={g}
                  onPress={() => openEditModal(g)}
                  onLongPress={() => handleDelete(g.id)}
                  onAddBalance={() => openAddBalanceModal(g)}
                  onTransfer={() => openTransferModal(g)}
                  onDelete={() => handleDelete(g.id)}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'anggaran' && (
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 12 }}>Anggaran Bulanan</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <TouchableOpacity onPress={openBudgetHistory} style={{ flex: 1, backgroundColor: colors.tint + '20', paddingVertical: 8, borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 12 }}>📅 Histori</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openRealizationHistory} style={{ flex: 1, backgroundColor: colors.tint + '20', paddingVertical: 8, borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 12 }}>📊 Realisasi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openBudgetModal} style={{ flex: 1, backgroundColor: colors.tint + '20', paddingVertical: 8, borderRadius: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 12 }}>+ Anggaran</Text>
              </TouchableOpacity>
            </View>
            {budgets.length === 0 ? (
              <EmptyState
                icon="📊"
                title="Atur Anggaran"
                subtitle="Fitur untuk membatasi pengeluaran bulanan"
                actionLabel="+ Anggaran Baru"
                onAction={openBudgetModal}
              />
            ) : (
              <>
                {budgets.filter(b => {
                  const cat = categories.find(c => c.id === b.category_id);
                  return cat?.type === 'expense';
                }).map(b => {
                  const cat = categories.find(c => c.id === b.category_id) || b.category;
                  const spent = transactions
                    .filter(t => t.type === 'expense' && t.category_id === b.category_id)
                    .filter(t => {
                      const txDate = new Date(t.date);
                      return txDate.getMonth() + 1 === b.month && txDate.getFullYear() === b.year;
                    })
                    .reduce((sum, t) => sum + t.amount, 0);
                  const percentage = Math.min(100, Math.round((spent / b.amount) * 100));

                  return (
                    <TouchableOpacity key={b.id} style={[styles.card, { backgroundColor: colors.card }]} onPress={openBudgetModal}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                          <CategoryIcon emoji={cat?.icon || '📦'} size={20} color={cat?.color || colors.tint} />
                          <Text style={[styles.cardTitle, { color: colors.text }]}>{cat?.name || 'Kategori'}</Text>
                        </View>
                        <Text style={[styles.cardTarget, { color: colors.textSecondary }]}>
                          Rp {b.amount.toLocaleString('id-ID')}
                        </Text>
                      </View>
                      <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: percentage >= 90 ? Colors.danger : percentage >= 75 ? '#F59E0B' : Colors.success }]} />
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={[styles.cardCurrent, { color: colors.textSecondary }]}>Terpakai: Rp {spent.toLocaleString('id-ID')}</Text>
                        <Text style={[styles.cardCurrent, { color: percentage >= 90 ? Colors.danger : colors.textSecondary, fontWeight: '600' }]}>{percentage}%</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}

        {activeTab === 'acara' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Daftar Acara</Text>
              <TouchableOpacity onPress={openAddEventModal} style={{ backgroundColor: colors.tint + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
                <Text style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>+ Tambah Acara</Text>
              </TouchableOpacity>
            </View>
            {events.length === 0 ? (
              <EmptyState
                icon="🎉"
                title="Rencana Acara"
                subtitle="Fitur untuk merencanakan pendanaan acara khusus"
                actionLabel="+ Acara Baru"
                onAction={openAddEventModal}
              />
            ) : (
              events.map(e => {
                const totalDynamicBudget = e.items && e.items.length > 0 
                  ? e.items.reduce((sum, item) => sum + (item.budget || 0), 0)
                  : e.budget || 0;
                  
                return (
                  <TouchableOpacity key={e.id} style={[styles.card, { backgroundColor: colors.card }]} onPress={() => router.push(`/event/${e.id}` as never)} onLongPress={() => openEditEventModal(e)}>
                    <View style={styles.cardHeader}>
                       <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]}>{e.name}</Text>
                       <Text style={[styles.cardTarget, { color: colors.textSecondary }]}>
                         Rp {totalDynamicBudget.toLocaleString('id-ID')}
                       </Text>
                    </View>
                    <Text style={[styles.cardCurrent, { color: colors.textSecondary, marginBottom: 8 }]}>
                       Tanggal: {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}
                    </Text>
                    {e.notes ? <Text style={[styles.cardCurrent, { color: colors.textMuted }]}>{e.notes}</Text> : null}
                    
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                      <TouchableOpacity onPress={() => router.push(`/event/${e.id}` as never)} style={{ flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                        <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 13 }}>+ Tambah Item</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteEvent(e.id)} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}>
                        <Text style={{ color: Colors.danger, fontWeight: '700', fontSize: 13 }}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'investasi' && (
          <InvestmentTab colors={colors} insets={insets} />
        )}

        {activeTab === 'belanja' && (
          <ShoppingTab colors={colors} insets={insets} />
        )}

        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {activeTab !== 'investasi' && activeTab !== 'belanja' && (
        <View style={styles.fabContainer} pointerEvents="box-none">
          <FAB 
            label={activeTab === 'anggaran' ? '+ Anggaran' : activeTab === 'acara' ? '+ Acara' : '+ Target'} 
            onPress={activeTab === 'anggaran' ? openBudgetModal : activeTab === 'acara' ? openAddEventModal : openAddModal} 
            color={Colors.primary} 
          />
        </View>
      )}

      <BottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Target' : 'Target Baru'}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Target</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Mis. Dana Darurat, Liburan"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Nominal (Rp)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={target}
          onChangeText={(val) => setTarget(formatInputAmount(val))}
        />

        {!editId && (
          <>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Saldo Saat Ini (Rp)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={current}
              onChangeText={(val) => setCurrent(formatInputAmount(val))}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Akun Keuangan</Text>
            {accounts.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Belum ada akun keuangan. Atur di Pengaturan.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {accounts.map(acc => {
                  const active = selectedAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: active ? (acc.color || colors.tint) : 'transparent',
                        backgroundColor: active ? (acc.color || colors.tint) + '15' : colors.inputBg,
                        gap: 8,
                      }}
                      onPress={() => setSelectedAccountId(acc.id)}
                      activeOpacity={0.7}
                    >
                      <AccountIcon icon={acc.icon} type={acc.type} size={16} />
                      <Text style={{ color: colors.text, fontWeight: active ? '700' : '400', fontSize: 13 }}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Deadline</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>
            {new Date(deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(deadline)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                const offset = selectedDate.getTimezoneOffset();
                const fixedDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
                setDeadline(fixedDate.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Warna Label</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: colors.text },
              ]}
              onPress={() => setColor(c)}
              activeOpacity={0.7}
            />
          ))}
        </View>

        {editId && (
          <>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}
              onPress={() => setShowSavingsHistory(!showSavingsHistory)}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 }}>
                Riwayat Tambah Saldo
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 16, transform: [{ rotate: showSavingsHistory ? '180deg' : '0deg' }] }}>
                ▼
              </Text>
            </TouchableOpacity>

            {showSavingsHistory && (
              <View style={{ marginTop: 8 }}>
                {transactions.filter(t => t.type === 'savings' && t.savings_id === editId).length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
                    Belum ada riwayat tambah saldo
                  </Text>
                ) : (
                  transactions
                    .filter(t => t.type === 'savings' && t.savings_id === editId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(tx => {
                      const acc = accounts.find(a => a.id === tx.account_id);
                      return (
                        <View key={tx.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                              Rp {tx.amount.toLocaleString('id-ID')}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Text>
                              {acc && (
                                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                  · {acc.name}
                                </Text>
                              )}
                            </View>
                          </View>
                          <TouchableOpacity
                            style={{ padding: 6 }}
                            onPress={() => {
                              const targetAcc = accounts.find(a => a.id === tx.account_id);
                              setShowModal(false);
                              router.push({
                                pathname: '/add-transaction',
                                params: {
                                  editId: tx.id,
                                  editType: 'savings',
                                  editAmount: tx.amount.toString(),
                                  editDescription: tx.description,
                                  editDate: tx.date,
                                  editSavingsId: tx.savings_id,
                                  editAccountName: targetAcc?.name || '',
                                  editDestinationAccountId: tx.destination_account_id || '',
                                },
                              } as never);
                            }}
                            activeOpacity={0.6}
                          >
                            <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ padding: 6 }}
                            onPress={() => {
                              Alert.alert('Hapus Transaksi', 'Yakin ingin menghapus transaksi ini?', [
                                { text: 'Batal', style: 'cancel' },
                                {
                                  text: 'Hapus', style: 'destructive', onPress: async () => {
                                    await api.transactions.delete(tx.id);
                                    const sav = savings.find(s => s.id === editId);
                                    if (sav) {
                                      const newCurrent = Math.max(0, sav.current - tx.amount);
                                      await api.savings.update(editId, { current: newCurrent });
                                    }
                                    await loadData();
                                  }
                                },
                              ]);
                            }}
                            activeOpacity={0.6}
                          >
                            <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: '600' }}>Hapus</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                )}
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Target</Text>}
        </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* Budget Modal */}
      <BottomSheet visible={showBudgetModal} onClose={() => { setShowBudgetModal(false); setShowNewCategoryForm(false); }} title="Atur Anggaran Bulanan">
        <ScrollView style={{ maxHeight: 400, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
          {categories.filter(c => c.type === 'expense').map((c) => {
            return (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: (c.color || colors.tint) + '20', justifyContent: 'center', alignItems: 'center' }}>
                  <CategoryIcon emoji={c.icon} size={20} color={c.color || colors.tint} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{c.name}</Text>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12 }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={budgetAmounts[c.id] || ''}
                  onChangeText={(val) => setBudgetAmounts(prev => ({ ...prev, [c.id]: formatInputAmount(val) }))}
                />
              </View>
            );
          })}

          {/* Add Category Section */}
          {!showNewCategoryForm ? (
            <TouchableOpacity 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingVertical: 12, 
                borderWidth: 1, 
                borderRadius: 12, 
                borderStyle: 'dashed', 
                borderColor: colors.border, 
                marginTop: 8, 
                marginBottom: 16 
              }}
              onPress={() => setShowNewCategoryForm(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 14 }}>+ Tambah Kategori Baru</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, borderColor: colors.border, backgroundColor: colors.inputBg, marginTop: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Kategori Baru</Text>
              
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>NAMA KATEGORI</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, fontSize: 14, marginBottom: 12 }]}
                placeholder="Mis. Transportasi, Belanja"
                placeholderTextColor={colors.textMuted}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>ICON EMOJI</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, fontSize: 14, textAlign: 'center' }]}
                    placeholder="📦"
                    placeholderTextColor={colors.textMuted}
                    maxLength={2}
                    value={newCategoryIcon}
                    onChangeText={setNewCategoryIcon}
                  />
                </View>
                <View style={{ flex: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>WARNA LABEL</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {COLOR_OPTIONS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: c,
                          borderWidth: newCategoryColor === c ? 2 : 0,
                          borderColor: colors.text,
                        }}
                        onPress={() => setNewCategoryColor(c)}
                        activeOpacity={0.7}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.border, alignItems: 'center' }}
                  onPress={() => setShowNewCategoryForm(false)}
                  disabled={creatingCategory}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.tint, alignItems: 'center' }}
                  onPress={handleCreateCategory}
                  disabled={creatingCategory}
                  activeOpacity={0.7}
                >
                  {creatingCategory ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Tambah</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1, marginTop: 0 }]}
          onPress={handleSaveBudget}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Anggaran</Text>}
        </TouchableOpacity>
      </BottomSheet>

      {/* Budget History Modal */}
      <BottomSheet visible={showBudgetHistory} onClose={() => setShowBudgetHistory(false)} title="Histori Anggaran Bulanan">
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
          {!selectedHistoryMonth ? (
            <View>
              {budgetHistoryMonths.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada histori anggaran</Text>
              ) : (
                budgetHistoryMonths.map((m) => {
                  const monthName = new Date(m.year, m.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                  return (
                    <TouchableOpacity
                      key={`${m.year}-${m.month}`}
                      style={[styles.listItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedHistoryMonth(m);
                        loadHistoryBudgets(m.year, m.month);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listItemTitle, { color: colors.text }]}>{monthName}</Text>
                      </View>
                      <Text style={{ color: Colors.primary, fontSize: 16 }}>→</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={{ marginBottom: 12 }}
                onPress={() => { setSelectedHistoryMonth(null); setHistoryBudgets([]); }}
                activeOpacity={0.7}
              >
                <Text style={{ color: Colors.primary, fontWeight: '600' }}>← Kembali ke daftar bulan</Text>
              </TouchableOpacity>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Anggaran {new Date(selectedHistoryMonth.year, selectedHistoryMonth.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </Text>
              {historyBudgets.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tidak ada anggaran di bulan ini</Text>
              ) : (
                <View>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                    onPress={() => {
                      if (selectedHistoryApplyIds.size === historyBudgets.length) {
                        setSelectedHistoryApplyIds(new Set());
                      } else {
                        setSelectedHistoryApplyIds(new Set(historyBudgets.map(b => b.category_id)));
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: selectedHistoryApplyIds.size === historyBudgets.length ? Colors.primary : colors.border, backgroundColor: selectedHistoryApplyIds.size === historyBudgets.length ? Colors.primary : 'transparent', marginRight: 8, justifyContent: 'center', alignItems: 'center' }}>
                      {selectedHistoryApplyIds.size === historyBudgets.length && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 13, color: colors.tint, fontWeight: '600' }}>Pilih semua</Text>
                  </TouchableOpacity>
                  {historyBudgets.filter(b => {
                    const cat = categories.find(c => c.id === b.category_id);
                    return cat?.type === 'expense';
                  }).map((b) => {
                    const cat = categories.find((c) => c.id === b.category_id) || b.category;
                    const isChecked = selectedHistoryApplyIds.has(b.category_id);
                    return (
                      <TouchableOpacity key={b.id} style={[styles.listItem, { borderBottomColor: colors.border }]} onPress={() => {
                        const next = new Set(selectedHistoryApplyIds);
                        if (isChecked) next.delete(b.category_id); else next.add(b.category_id);
                        setSelectedHistoryApplyIds(next);
                      }} activeOpacity={0.7}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                          <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: isChecked ? Colors.primary : colors.border, backgroundColor: isChecked ? Colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                            {isChecked && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                          </View>
                          <Text style={[styles.listItemTitle, { color: colors.text }]}>{cat?.name || 'Kategori'}</Text>
                        </View>
                        <Text style={[styles.listItemSub, { color: colors.textSecondary, fontWeight: '600' }]}>
                          Rp {b.amount.toLocaleString('id-ID')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: applyingBudget || selectedHistoryApplyIds.size === 0 ? 0.7 : 1, marginTop: 16 }]}
                onPress={handleApplyBudget}
                disabled={applyingBudget || selectedHistoryApplyIds.size === 0}
                activeOpacity={0.8}
              >
                {applyingBudget ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Terapkan {selectedHistoryApplyIds.size} Anggaran ke Bulan Ini</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* Realisasi History Modal */}
      <BottomSheet visible={showRealizationHistory} onClose={() => setShowRealizationHistory(false)} title="Histori Realisasi Anggaran">
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
          {!selectedRealizationMonth ? (
            <View>
              {realizationHistoryMonths.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada histori realisasi</Text>
              ) : (
                realizationHistoryMonths.map((m) => {
                  const monthName = new Date(m.year, m.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                  return (
                    <TouchableOpacity
                      key={`real-${m.year}-${m.month}`}
                      style={[styles.listItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedRealizationMonth(m);
                        loadRealizationBudgets(m.year, m.month);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listItemTitle, { color: colors.text }]}>{monthName}</Text>
                      </View>
                      <Text style={{ color: '#10b981', fontSize: 16 }}>→</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={{ marginBottom: 12 }}
                onPress={() => { setSelectedRealizationMonth(null); setRealizationBudgets([]); }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#10b981', fontWeight: '600' }}>← Kembali ke daftar bulan</Text>
              </TouchableOpacity>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Realisasi {new Date(selectedRealizationMonth.year, selectedRealizationMonth.month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </Text>
              {realizationBudgets.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tidak ada anggaran di bulan ini</Text>
              ) : (
                <View>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                    onPress={() => {
                      if (selectedRealizationApplyIds.size === realizationBudgets.length) {
                        setSelectedRealizationApplyIds(new Set());
                      } else {
                        setSelectedRealizationApplyIds(new Set(realizationBudgets.map((b: any) => b.category_id)));
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: selectedRealizationApplyIds.size === realizationBudgets.length ? '#10b981' : colors.border, backgroundColor: selectedRealizationApplyIds.size === realizationBudgets.length ? '#10b981' : 'transparent', marginRight: 8, justifyContent: 'center', alignItems: 'center' }}>
                      {selectedRealizationApplyIds.size === realizationBudgets.length && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 13, color: '#10b981', fontWeight: '600' }}>Pilih semua</Text>
                  </TouchableOpacity>
                  {realizationBudgets.filter((b: any) => {
                    const cat = categories.find(c => c.id === b.category_id);
                    return cat?.type === 'expense';
                  }).map((b: any) => {
                    const cat = categories.find((c) => c.id === b.category_id) || b.category;
                    const isChecked = selectedRealizationApplyIds.has(b.category_id);
                    const pct = b.percentage || 0;
                    return (
                      <TouchableOpacity key={b.id} style={[styles.listItem, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]} onPress={() => {
                        const next = new Set(selectedRealizationApplyIds);
                        if (isChecked) next.delete(b.category_id); else next.add(b.category_id);
                        setSelectedRealizationApplyIds(next);
                      }} activeOpacity={0.7}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                            <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: isChecked ? '#10b981' : colors.border, backgroundColor: isChecked ? '#10b981' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                              {isChecked && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                            </View>
                            <CategoryIcon emoji={cat?.icon || '📦'} size={16} color={cat?.color || colors.tint} />
                            <Text style={[styles.listItemTitle, { color: colors.text }]}>{cat?.name || 'Kategori'}</Text>
                          </View>
                          <Text style={[styles.listItemSub, { color: pct >= 90 ? Colors.danger : pct >= 75 ? '#F59E0B' : colors.textSecondary, fontWeight: '700' }]}>
                            {pct}%
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 30 }}>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Anggaran: Rp {b.amount.toLocaleString('id-ID')}</Text>
                          <Text style={{ fontSize: 12, color: b.spent > b.amount ? Colors.danger : colors.textSecondary }}>Realisasi: Rp {b.spent.toLocaleString('id-ID')}</Text>
                        </View>
                        <View style={[styles.progressContainer, { backgroundColor: colors.border, marginTop: 6, marginBottom: 0, paddingLeft: 30 }]}>
                          <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: pct >= 90 ? Colors.danger : pct >= 75 ? '#F59E0B' : '#10b981' }]} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#10b981', opacity: applyingRealization || selectedRealizationApplyIds.size === 0 ? 0.7 : 1, marginTop: 16 }]}
                onPress={handleApplyRealization}
                disabled={applyingRealization || selectedRealizationApplyIds.size === 0}
                activeOpacity={0.8}
              >
                {applyingRealization ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Terapkan {selectedRealizationApplyIds.size} Realisasi ke Bulan Ini</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* Event Modal */}
      <BottomSheet visible={showEventModal} onClose={() => setShowEventModal(false)} title={editEventId ? "Edit Acara" : "Rencana Acara"}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Acara</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Mis. Nikahan, Liburan"
          placeholderTextColor={colors.textMuted}
          value={eventName}
          onChangeText={setEventName}
        />

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tanggal Acara</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}
          onPress={() => setShowEventDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>
            {new Date(eventDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </TouchableOpacity>

        {showEventDatePicker && (
          <DateTimePicker
            value={new Date(eventDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEventDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                const offset = selectedDate.getTimezoneOffset();
                const fixedDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
                setEventDate(fixedDate.toISOString().split('T')[0]);
              }
            }}
          />
        )}

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Catatan Tambahan</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top' }]}
          placeholder="Keterangan acara..."
          placeholderTextColor={colors.textMuted}
          value={eventNotes}
          onChangeText={setEventNotes}
          multiline
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSaveEvent}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Acara</Text>}
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={showAddBalanceModal} onClose={() => setShowAddBalanceModal(false)} title="Tambah Saldo">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nominal Tambahan (Rp)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={addBalanceAmount}
          onChangeText={(val) => setAddBalanceAmount(formatInputAmount(val))}
        />

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Akun Keuangan</Text>
        {accounts.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Belum ada akun keuangan. Atur di Pengaturan.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {accounts.map(acc => {
              const active = selectedAccountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: active ? (acc.color || colors.tint) + '25' : colors.inputBg,
                      borderColor: active ? acc.color || colors.tint : colors.border,
                      borderWidth: 1.5,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                      gap: 6,
                    },
                  ]}
                  onPress={() => setSelectedAccountId(acc.id)}
                  activeOpacity={0.7}
                >
                  <AccountIcon icon={acc.icon} type={acc.type} size={15} />
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: active ? colors.text : colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}



        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.success, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSaveBalance}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Saldo</Text>}
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Tabungan">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nominal Transfer (Rp)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={transferAmount}
          onChangeText={(val) => setTransferAmount(formatInputAmount(val))}
        />

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Akun Keuangan Asal</Text>
        {accounts.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Belum ada akun keuangan. Atur di Pengaturan.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {accounts.map(acc => {
              const active = transferSourceAccountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: active ? (acc.color || colors.tint) + '25' : colors.inputBg,
                      borderColor: active ? acc.color || colors.tint : colors.border,
                      borderWidth: 1.5,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                      gap: 6,
                    },
                  ]}
                  onPress={() => {
                    setTransferSourceAccountId(acc.id);
                    if (transferDestinationAccountId === acc.id) {
                      const otherAcc = accounts.find(a => a.id !== acc.id);
                      setTransferDestinationAccountId(otherAcc?.id || '');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <AccountIcon icon={acc.icon} type={acc.type} size={15} />
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: active ? colors.text : colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Akun Keuangan Tujuan</Text>
        {accounts.filter(a => a.id !== transferSourceAccountId).length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Belum ada akun keuangan tujuan lain.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {accounts.filter(a => a.id !== transferSourceAccountId).map(acc => {
              const active = transferDestinationAccountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: active ? (acc.color || colors.tint) + '25' : colors.inputBg,
                      borderColor: active ? acc.color || colors.tint : colors.border,
                      borderWidth: 1.5,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 20,
                      gap: 6,
                    },
                  ]}
                  onPress={() => setTransferDestinationAccountId(acc.id)}
                  activeOpacity={0.7}
                >
                  <AccountIcon icon={acc.icon} type={acc.type} size={15} />
                  <Text
                    style={{ fontSize: 13, fontWeight: '600', color: active ? colors.text : colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: '#8b5cf6', opacity: transferSaving ? 0.7 : 1 }]}
          onPress={handleSaveTransfer}
          disabled={transferSaving}
          activeOpacity={0.8}
        >
          {transferSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Transfer</Text>}
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '800', marginBottom: 16 },

  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 20,
    right: 20,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderRadius: BorderRadius.lg - 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },

  colorRow: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },

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

  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  
  card: {
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardTarget: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCurrent: {
    fontSize: 13,
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  listItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
