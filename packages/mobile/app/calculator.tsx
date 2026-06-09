import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors, { useColors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { formatCurrencyCompact } from '@karsafin/shared';

type Tab = 'pinjaman' | 'tabungan' | 'investasi';

export default function FinancialCalculatorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  useColors();
  const colors = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<Tab>('pinjaman');

  // Pinjaman
  const [loanAmount, setLoanAmount] = useState('');
  const [loanRate, setLoanRate] = useState('');
  const [loanTenure, setLoanTenure] = useState('');
  const [loanResult, setLoanResult] = useState<{ monthly: number; total: number; interest: number } | null>(null);

  // Tabungan
  const [savingsTarget, setSavingsTarget] = useState('');
  const [savingsMonths, setSavingsMonths] = useState('');
  const [savingsRate, setSavingsRate] = useState('');
  const [savingsResult, setSavingsResult] = useState<{ monthly: number; total: number; interest: number } | null>(null);

  // Investasi
  const [invAmount, setInvAmount] = useState('');
  const [invMonthly, setInvMonthly] = useState('');
  const [invRate, setInvRate] = useState('');
  const [invYears, setInvYears] = useState('');
  const [invResult, setInvResult] = useState<{ futureValue: number; totalContrib: number; earnings: number } | null>(null);

  const parseNum = (v: string) => parseInt(v.replace(/\D/g, ''), 10) || 0;

  const fmt = (v: number) => v.toLocaleString('id-ID');

  const calcLoan = () => {
    const p = parseNum(loanAmount);
    const r = parseFloat(loanRate) / 100 / 12;
    const n = parseNum(loanTenure);
    if (!p || !r || !n) { Alert.alert('Error', 'Isi semua bidang'); return; }
    const monthly = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    const interest = total - p;
    setLoanResult({ monthly: Math.round(monthly), total: Math.round(total), interest: Math.round(interest) });
  };

  const calcSavings = () => {
    const target = parseNum(savingsTarget);
    const n = parseNum(savingsMonths);
    const r = parseFloat(savingsRate) / 100 / 12;
    if (!target || !n) { Alert.alert('Error', 'Isi target dan durasi'); return; }
    if (r > 0) {
      const monthly = target * r / (Math.pow(1 + r, n) - 1);
      const total = monthly * n;
      const interest = target - total;
      setSavingsResult({ monthly: Math.round(monthly), total: Math.round(total), interest: Math.round(interest) });
    } else {
      const monthly = target / n;
      setSavingsResult({ monthly: Math.round(monthly), total: target, interest: 0 });
    }
  };

  const calcInvestment = () => {
    const p = parseNum(invAmount);
    const m = parseNum(invMonthly);
    const r = parseFloat(invRate) / 100 / 12;
    const years = parseFloat(invYears);
    const n = Math.round(years * 12);
    if (!n) { Alert.alert('Error', 'Isi durasi investasi'); return; }

    let futureValue = p * Math.pow(1 + r, n);
    if (m > 0) {
      futureValue += r > 0 ? m * (Math.pow(1 + r, n) - 1) / r : m * n;
    }
    const totalContrib = p + m * n;
    setInvResult({
      futureValue: Math.round(futureValue),
      totalContrib,
      earnings: Math.round(futureValue - totalContrib),
    });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pinjaman', label: 'Pinjaman' },
    { key: 'tabungan', label: 'Tabungan' },
    { key: 'investasi', label: 'Investasi' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Text style={{ fontSize: 28, color: colors.text, fontWeight: '300' }}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kalkulator Finansial</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && { borderBottomColor: Colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.6}
          >
            <Text style={[styles.tabText, { color: activeTab === t.key ? Colors.primary : colors.textMuted, fontWeight: activeTab === t.key ? '700' : '500' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 16 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {/* PINJAMAN */}
        {activeTab === 'pinjaman' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Kalkulator Pinjaman</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>Jumlah Pinjaman</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Rp 0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={loanAmount}
              onChangeText={setLoanAmount}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Suku Bunga (% per tahun)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Contoh: 12"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={loanRate}
              onChangeText={setLoanRate}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Tenor (bulan)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Contoh: 12"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={loanTenure}
              onChangeText={setLoanTenure}
            />
            <TouchableOpacity style={[styles.calcBtn, { backgroundColor: Colors.primary }]} onPress={calcLoan} activeOpacity={0.8}>
              <Text style={styles.calcBtnText}>Hitung</Text>
            </TouchableOpacity>

            {loanResult && (
              <View style={[styles.resultBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <ResultRow label="Cicilan per Bulan" value={`Rp ${fmt(loanResult.monthly)}`} color="#10b981" />
                <ResultRow label="Total Pembayaran" value={`Rp ${fmt(loanResult.total)}`} color={colors.text} />
                <ResultRow label="Total Bunga" value={`Rp ${fmt(loanResult.interest)}`} color="#ef4444" />
              </View>
            )}
          </View>
        )}

        {/* TABUNGAN */}
        {activeTab === 'tabungan' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Kalkulator Tabungan</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>Target Dana</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Rp 0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={savingsTarget}
              onChangeText={setSavingsTarget}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Durasi (bulan)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Contoh: 12"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={savingsMonths}
              onChangeText={setSavingsMonths}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Bunga (% per tahun) — opsional</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={savingsRate}
              onChangeText={setSavingsRate}
            />
            <TouchableOpacity style={[styles.calcBtn, { backgroundColor: Colors.primary }]} onPress={calcSavings} activeOpacity={0.8}>
              <Text style={styles.calcBtnText}>Hitung</Text>
            </TouchableOpacity>

            {savingsResult && (
              <View style={[styles.resultBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <ResultRow label="Tabungan per Bulan" value={`Rp ${fmt(savingsResult.monthly)}`} color="#10b981" />
                <ResultRow label="Total Setoran" value={`Rp ${fmt(savingsResult.total)}`} color={colors.text} />
                {savingsResult.interest > 0 && (
                  <ResultRow label="Hasil Bunga" value={`Rp ${fmt(savingsResult.interest)}`} color="#0062ff" />
                )}
              </View>
            )}
          </View>
        )}

        {/* INVESTASI */}
        {activeTab === 'investasi' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Kalkulator Investasi</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>Dana Awal</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Rp 0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={invAmount}
              onChangeText={setInvAmount}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Investasi Rutin per Bulan</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Rp 0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={invMonthly}
              onChangeText={setInvMonthly}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Imbal Hasil (% per tahun)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Contoh: 10"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={invRate}
              onChangeText={setInvRate}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>Lama Investasi (tahun)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Contoh: 5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={invYears}
              onChangeText={setInvYears}
            />
            <TouchableOpacity style={[styles.calcBtn, { backgroundColor: Colors.primary }]} onPress={calcInvestment} activeOpacity={0.8}>
              <Text style={styles.calcBtnText}>Hitung</Text>
            </TouchableOpacity>

            {invResult && (
              <View style={[styles.resultBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <ResultRow label="Nilai Masa Depan" value={`Rp ${fmt(invResult.futureValue)}`} color="#10b981" />
                <ResultRow label="Total Modal" value={`Rp ${fmt(invResult.totalContrib)}`} color={colors.text} />
                <ResultRow label="Keuntungan" value={`Rp ${fmt(invResult.earnings)}`} color="#0062ff" />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ResultRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={[styles.resultLabel, { color: '#6b7280' }]}>{label}</Text>
      <Text style={[styles.resultValue, { color }]}>{value}</Text>
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: { fontSize: 15 },
  content: { padding: Spacing.xl, gap: 16 },
  card: {
    borderRadius: BorderRadius.xl,
    padding: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
  },
  calcBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  calcBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: { fontSize: 13, fontWeight: '500' },
  resultValue: { fontSize: 16, fontWeight: '800' },
});
