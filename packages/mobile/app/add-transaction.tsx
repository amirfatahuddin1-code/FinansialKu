import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { formatCurrency, getLocalToday } from '@karsafin/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calculator, CategoryIcon, AccountIcon, AddCategoryModal } from '@/components';
import type { Category, FinancialAccount, Savings } from '@karsafin/shared';

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editId?: string;
    editType?: string;
    editAmount?: string;
    editDescription?: string;
    editDate?: string;
    editCategoryName?: string;
    editAccountName?: string;
    editSavingsId?: string;
    editDestinationAccountId?: string;
  }>();
  const isEdit = !!params.editId;
  const { user, api } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [type, setType] = useState<'income' | 'expense' | 'savings'>(
    params.editType === 'income' ? 'income' : params.editType === 'savings' ? 'savings' : 'expense'
  );
  const [amount, setAmount] = useState<number>(
    params.editAmount ? parseInt(params.editAmount, 10) : 0
  );
  const [showCalc, setShowCalc] = useState(false);
  
  const [description, setDescription] = useState(params.editDescription || '');
  const [date, setDate] = useState(params.editDate || getLocalToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('');
  const [savingsData, setSavingsData] = useState<Savings[]>([]);
  const [selectedSavingsId, setSelectedSavingsId] = useState<string>('');
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      try {
        const [catRes, accRes, savRes] = await Promise.all([
          api.categories.getAll(),
          api.accounts.getAll(),
          api.savings.getAll(),
        ]);
        if (catRes.data) {
          setCategories(catRes.data);
          // Auto-select category if editCategoryName matches
          if (params.editCategoryName) {
            const matched = catRes.data.find(
              (c) => c.name.toLowerCase() === params.editCategoryName!.toLowerCase()
            );
            if (matched) setSelectedCategoryId(matched.id);
          }
        }
        if (accRes.data) {
          setAccounts(accRes.data);
          if (params.editAccountName) {
            const matched = accRes.data.find(
              (a) => a.name.toUpperCase() === params.editAccountName!.toUpperCase()
            );
            if (matched) {
              setSelectedAccountId(matched.id);
            } else {
              const defaultAcc = accRes.data.find(a => a.is_default) || accRes.data[0];
              if (defaultAcc) setSelectedAccountId(defaultAcc.id);
            }
          } else {
            const defaultAcc = accRes.data.find(a => a.is_default) || accRes.data[0];
            if (defaultAcc) setSelectedAccountId(defaultAcc.id);
          }
        }
        if (savRes.data) {
          setSavingsData(savRes.data);
          if (params.editSavingsId) {
            const matched = savRes.data.find(s => s.id === params.editSavingsId);
            if (matched) setSelectedSavingsId(matched.id);
          } else if (isEdit && type === 'savings' && savRes.data.length > 0) {
            setSelectedSavingsId(savRes.data[0].id);
          }
        }
        if (params.editDestinationAccountId) {
          setSelectedDestinationId(params.editDestinationAccountId);
          setShowDestinationPicker(true);
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [user]);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSave = async () => {
    if (!user) return;
    if (amount <= 0) {
      Alert.alert('Error', 'Nominal harus lebih dari 0');
      return;
    }
    if (!selectedCategoryId && type !== 'savings') {
      Alert.alert('Error', 'Pilih kategori terlebih dahulu');
      return;
    }
    if (type === 'savings' && !selectedSavingsId && !isEdit) {
      Alert.alert('Error', 'Pilih target tabungan terlebih dahulu');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        type,
        amount,
        description: description.trim() || 'Tanpa keterangan',
        date,
        category_id: selectedCategoryId || undefined,
        account_id: selectedAccountId || undefined,
        source: isEdit ? undefined : 'manual',
      };
      if (type === 'savings') {
        payload.savings_id = selectedSavingsId;
        payload.destination_account_id = (showDestinationPicker && selectedDestinationId) ? selectedDestinationId : null;
        delete payload.category_id;
      }
      if (isEdit && params.editId) {
        const { error } = await api.transactions.update(params.editId, payload as any);
        if (error) throw error;
      } else {
        const { error } = await api.transactions.create(user.id, payload as any);
        if (error) throw error;

        if (type === 'savings' && selectedSavingsId) {
          const target = savingsData.find(s => s.id === selectedSavingsId);
          if (target) {
            await api.savings.update(selectedSavingsId, { current: target.current + amount });
          }
        }
      }
      
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan transaksi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Text style={{ fontSize: 28, color: colors.text, fontWeight: '300' }}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        
        {/* Segmented Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'income' && { backgroundColor: '#10b981' }]}
            onPress={() => { setType('income'); setSelectedCategoryId(''); setSelectedSavingsId(''); setSelectedDestinationId(''); setShowDestinationPicker(false); }}
          >
            <Text style={[styles.segmentText, type === 'income' && { color: '#fff' }]}>Pemasukan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'expense' && { backgroundColor: '#ef4444' }]}
            onPress={() => { setType('expense'); setSelectedCategoryId(''); setSelectedSavingsId(''); setSelectedDestinationId(''); setShowDestinationPicker(false); }}
          >
            <Text style={[styles.segmentText, type === 'expense' && { color: '#fff' }]}>Pengeluaran</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'savings' && { backgroundColor: '#8b5cf6' }]}
            onPress={() => { setType('savings'); setSelectedCategoryId(''); setSelectedSavingsId(''); }}
          >
            <Text style={[styles.segmentText, type === 'savings' && { color: '#fff' }]}>Tabungan</Text>
          </TouchableOpacity>
        </View>

        {/* Nominal Input */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Nominal</Text>
        <TouchableOpacity
          style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={() => setShowCalc(true)}
          activeOpacity={0.8}
        >
          <Text style={{ color: colors.textMuted, fontSize: 18, fontWeight: '500', marginRight: 8 }}>Rp</Text>
          <Text style={{ color: amount > 0 ? colors.text : colors.textMuted, fontSize: 24, fontWeight: '700' }}>
            {amount > 0 ? formatCurrency(amount) : '0'}
          </Text>
        </TouchableOpacity>

        {/* Kategori / Target Tabungan */}
        {type === 'savings' ? (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Target Tabungan</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.tint} style={{ alignSelf: 'flex-start', marginVertical: 10 }} />
            ) : (
              <View style={styles.categoryGrid}>
                {savingsData.length === 0 ? (
                  <Text style={{ color: colors.textMuted }}>Belum ada target tabungan</Text>
                ) : (
                  savingsData.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.categoryBtn,
                        { backgroundColor: colors.inputBg, borderColor: selectedSavingsId === s.id ? '#8b5cf6' : 'transparent' }
                      ]}
                      onPress={() => setSelectedSavingsId(s.id)}
                    >
                      <Text style={{ fontSize: 22 }}>🏦</Text>
                      <Text style={{ fontSize: 12, color: colors.text, textAlign: 'center' }} numberOfLines={1}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Kategori</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.tint} style={{ alignSelf: 'flex-start', marginVertical: 10 }} />
            ) : (
              <View style={styles.categoryGrid}>
                {filteredCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryBtn,
                      { backgroundColor: colors.inputBg, borderColor: selectedCategoryId === cat.id ? cat.color || colors.tint : 'transparent' }
                    ]}
                    onPress={() => setSelectedCategoryId(cat.id)}
                  >
                    <CategoryIcon emoji={cat.icon} size={22} color={cat.color || colors.tint} />
                    <Text style={{ fontSize: 12, color: colors.text, textAlign: 'center' }} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.categoryBtn,
                    { backgroundColor: colors.inputBg, borderColor: colors.border, borderStyle: 'dashed' }
                  ]}
                  onPress={() => setShowAddCategory(true)}
                >
                  <Text style={{ fontSize: 22, color: colors.textMuted }}>+</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
                    Baru
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Akun Keuangan */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Akun Keuangan</Text>
        {accounts.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>Belum ada akun keuangan. Atur di Pengaturan.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {accounts.map(acc => {
              const isSelected = selectedAccountId === acc.id;
              let icon = '💵';
              if (acc.type === 'bank') icon = '💳';
              else if (acc.type === 'ewallet') icon = '📱';
              else if (acc.type === 'investment') icon = '📈';

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
                    borderColor: isSelected ? acc.color || '#0062ff' : 'transparent',
                    backgroundColor: isSelected ? (acc.color || '#0062ff') + '15' : colors.inputBg,
                    gap: 8,
                  }}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <AccountIcon icon={acc.icon} type={acc.type} size={16} />
                  <Text style={{ color: colors.text, fontWeight: isSelected ? '700' : '400', fontSize: 13 }}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {type === 'savings' && (
          <>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}
              onPress={() => setShowDestinationPicker(!showDestinationPicker)}
              activeOpacity={0.7}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: showDestinationPicker ? '#8b5cf6' : colors.border, backgroundColor: showDestinationPicker ? '#8b5cf6' : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                {showDestinationPicker && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
              </View>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Pindahkan ke rekening lain</Text>
            </TouchableOpacity>

            {showDestinationPicker && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Akun Tujuan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {accounts.filter(a => a.id !== selectedAccountId).map(acc => {
                    const isSelected = selectedDestinationId === acc.id;
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
                          borderColor: isSelected ? '#8b5cf6' : 'transparent',
                          backgroundColor: isSelected ? '#8b5cf6' + '15' : colors.inputBg,
                          gap: 8,
                        }}
                        onPress={() => setSelectedDestinationId(acc.id)}
                      >
                        <AccountIcon icon={acc.icon} type={acc.type} size={16} />
                        <Text style={{ color: colors.text, fontWeight: isSelected ? '700' : '400', fontSize: 13 }}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </>
        )}

        {/* Tanggal */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Tanggal</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
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

        {/* Catatan */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Catatan (Opsional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Tulis keterangan transaksi"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Update Transaksi' : 'Simpan Transaksi'}</Text>}
        </TouchableOpacity>

      </ScrollView>

      <Calculator
        visible={showCalc}
        onClose={() => setShowCalc(false)}
        initialValue={amount}
        onConfirm={setAmount}
      />

      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSave={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
          setSelectedCategoryId(newCat.id);
          setShowAddCategory(false);
        }}
        initialType={type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 16,
    fontSize: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryBtn: {
    width: '22%',
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  saveBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
