import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { formatCurrency, getLocalToday } from '@karsafin/shared';
import type { FinancialAccount } from '@karsafin/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calculator, AccountIcon } from '@/components';

export default function AddDebtScreen() {
  const router = useRouter();
  const { user, api } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const params = useLocalSearchParams<{ type?: 'payable' | 'receivable' }>();
  const [type, setType] = useState<'payable' | 'receivable'>(params.type || 'payable');
  const [amount, setAmount] = useState<number>(0);
  const [showCalc, setShowCalc] = useState(false);
  
  const [counterpart, setCounterpart] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(getLocalToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user) return;
      try {
        const { data } = await api.accounts.getAll();
        if (data) {
          setAccounts(data);
          const defaultAcc = data.find(a => a.is_default) || data[0];
          if (defaultAcc) {
            setSelectedAccountId(defaultAcc.id);
          }
        }
      } catch (err) {
        console.error('Failed to load accounts', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (amount <= 0) {
      Alert.alert('Error', 'Nominal harus lebih dari 0');
      return;
    }
    if (!counterpart.trim()) {
      Alert.alert('Error', 'Nama pihak terkait tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: `${type === 'payable' ? 'Hutang ke' : 'Piutang dari'} ${counterpart.trim()}`,
        type,
        amount,
        paid: 0,
        counterpart: counterpart.trim(),
        due_date: dueDate,
        notes: notes.trim(),
        status: 'unpaid' as const,
        account_id: selectedAccountId || undefined,
      };
      const { error } = await api.debts.create(user.id, payload as any);
      if (error) throw error;
      
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan catatan');
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tambah Hutang Piutang</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        
        {/* Segmented Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'payable' && { backgroundColor: '#ef4444' }]}
            onPress={() => setType('payable')}
          >
            <Text style={[styles.segmentText, type === 'payable' && { color: '#fff' }]}>Saya Berhutang</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'receivable' && { backgroundColor: '#10b981' }]}
            onPress={() => setType('receivable')}
          >
            <Text style={[styles.segmentText, type === 'receivable' && { color: '#fff' }]}>Orang Berhutang</Text>
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

        {/* Pihak Terkait */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Pihak Terkait (Nama Orang/Lembaga)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Mis: Budi, Bank XYZ"
          placeholderTextColor={colors.textMuted}
          value={counterpart}
          onChangeText={setCounterpart}
        />

        {/* Tanggal Jatuh Tempo */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Jatuh Tempo</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: colors.text, fontSize: 16 }}>
            {new Date(dueDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(dueDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                const offset = selectedDate.getTimezoneOffset();
                const fixedDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
                setDueDate(fixedDate.toISOString().split('T')[0]);
              }
            }}
          />
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

        {/* Catatan */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Catatan Tambahan (Opsional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, minHeight: 80 }]}
          placeholder="Tulis keterangan tambahan..."
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Catatan</Text>}
        </TouchableOpacity>

      </ScrollView>

      <Calculator
        visible={showCalc}
        onClose={() => setShowCalc(false)}
        initialValue={amount}
        onConfirm={setAmount}
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
