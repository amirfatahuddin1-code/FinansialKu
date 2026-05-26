import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Keyboard,
  Image,
  BackHandler,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import type { Category, Transaction, Budget, FinancialAccount } from '@karsafin/shared';
import { getLocalToday } from '@karsafin/shared';
import { formatCurrency } from '@karsafin/shared';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from '@/utils/mobile-ads-wrapper';
import { ADS } from '@/constants/Ads';
import AdBanner from '@/components/AdBanner';
import * as ImagePicker from 'expo-image-picker';

type ChatMode = 'normal' | 'catalog_transaction' | 'financial_simulation' | 'set_budget' | 'apply_budget_reco';

interface SavedTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryName: string;
  accountName: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
  type?: 'text' | 'insight';
  savedTransactions?: SavedTransaction[];
  insightData?: {
    label: string;
    percent: number;
    current: string;
    total: string;
    color: string;
  };
}

const SUGGESTED_QUESTIONS = [
  'Bagaimana status budget saya bulan ini?',
  'Beri saran investasi untuk pemula',
  'Analisis pengeluaran makanan saya',
];

const QUICK_REPLIES = [
  { icon: '📷', text: 'Scan struk' },
  { icon: '📒', text: 'Catat transaksi' },
  { icon: '🧶', text: 'Cek riwayat transaksi' },
  { icon: '📊', text: 'Bandingkan keuangan per periode' },
  { icon: '💵', text: 'Cek keuangan per kategori' },
  { icon: '❓', text: 'Simulasi rencana keuangan' },
  { icon: '🤖', text: 'Atur budget bulan ini' },
  { icon: '💰', text: 'Minta rekomendasi budget' },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      'Halo! Saya Karsafin AI, asisten keuangan Anda. Ada yang bisa saya bantu hari ini? Anda bisa menanyakan tentang analisis pengeluaran, rencana tabungan, atau sekadar tips menghemat uang.',
  },
];

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const opacity = (dot: Animated.Value) =>
    dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 4 }}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#94a3b8',
            opacity: opacity(d),
          }}
        />
      ))}
    </View>
  );
}

export default function AIScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [pendingBudgetRecos, setPendingBudgetRecos] = useState<Array<{category_id: string; name: string; amount: number}>>([]); 
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [aiQuota, setAiQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [receiptScanning, setReceiptScanning] = useState(false);
  const rewardedAdRef = useRef<RewardedAd | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  // Auto-scroll when keyboard opens
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => scrollToBottom());
    return () => sub.remove();
  }, []);

  // Track keyboard height for Android
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const loadQuota = useCallback(async () => {
    if (!user) return;
    const { data } = await api.profiles.getAiQuota(user.id);
    if (data) setAiQuota(data);
  }, [user, api]);

  useEffect(() => { loadQuota(); }, [loadQuota]);

  // Refresh quota when screen gains focus
  useFocusEffect(useCallback(() => {
    loadQuota();
    return undefined;
  }, [loadQuota]));

  const loadRewardedAd = useCallback(() => {
    try {
      const unsubs: (() => void)[] = [];
      const ad = RewardedAd.createForAdRequest(
        __DEV__ ? TestIds.REWARDED : ADS.rewardedAdUnitId
      );
      unsubs.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          setAdLoading(false);
          ad.show();
        })
      );
      unsubs.push(
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
          if (!user) return;
          const reward = aiQuota?.rewardAmount ?? 5;
          const { data } = await api.profiles.addAiQuota(user.id, reward);
          await loadQuota();
          if (data && data.applied) {
            Alert.alert('🎉 Selamat!', `Anda mendapat ${reward} kuota AI gratis!`);
          } else {
            Alert.alert('Mohon Maaf', 'Kamu sudah melampaui batas reward kuota transaksi AI untuk hari ini, silahkan ulangi besok lagi');
          }
          setShowQuotaModal(false);
        })
      );
      unsubs.push(
        ad.addAdEventListener(AdEventType.ERROR, () => {
          setAdLoading(false);
          Alert.alert('Gagal', 'Iklan gagal dimuat. Coba lagi nanti.');
        })
      );
      unsubs.push(
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          setAdLoading(false);
        })
      );
      ad.load();
      rewardedAdRef.current = ad;
      return () => unsubs.forEach((fn) => fn());
    } catch {
      setAdLoading(false);
      Alert.alert('Gagal', 'Iklan tidak tersedia saat ini.');
    }
  }, [user, api, aiQuota, loadQuota]);

  const handleWatchAd = () => {
    if (aiQuota && aiQuota.quota >= aiQuota.max) {
      Alert.alert('Mohon Maaf', 'Kamu sudah melampaui batas reward kuota transaksi AI untuk hari ini, silahkan ulangi besok lagi');
      return;
    }
    setAdLoading(true);
    loadRewardedAd();
  };

  // Handle hardware back button (Android)
  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate('/');
      }
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  const loadAllData = useCallback(async () => {
    if (!user) return;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const [catRes, txRes, budgetRes, accRes] = await Promise.all([
        api.categories.getAll(),
        api.transactions.getAll(),
        api.budgets.getByMonth(y, m),
        api.accounts.getAll(),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (txRes.data) setAllTransactions(txRes.data);
      if (budgetRes.data) setBudgets(budgetRes.data);
      if (accRes.data) setAccounts(accRes.data);
    } catch (e) {
      console.error('AI load data error:', e);
    }
  }, [user, activeWorkspace]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  function matchCategory(text: string, txType: 'income' | 'expense'): Category | null {
    const lower = text.toLowerCase();
    const cats = categories.filter((c) => c.type === txType);
    const keywords: Record<string, string[]> = {
      Makanan: ['makan', 'sepatu', 'baju', 'jajan', 'beras', 'minyak', 'goreng', 'nasi', 'ayam', 'soto', 'bakso', 'mi', 'mie', 'kopi', 'roti', 'kue', 'camilan', 'snack', 'susu', 'telur', 'ikan', 'daging', 'sayur', 'buah', 'sate', 'gado', 'sop', 'lontong', 'ketoprak'],
      Transport: ['bensin', 'bbm', 'transport', 'bahan bakar'],
      Belanja: ['belanja', 'baju'],
      Tagihan: ['listrik', 'air', 'pdam', 'pln', 'pulsa', 'tagihan'],
      Hiburan: ['nonton', 'film', 'game', 'hiburan'],
      Kesehatan: ['obat', 'klinik', 'rumah sakit'],
      Gaji: ['gaji', 'bulanan'],
      Freelance: ['proyek', 'freelance', 'kerja lepas'],
    };
    for (const cat of cats) {
      if (lower.includes(cat.name.toLowerCase())) return cat;
    }
    for (const cat of cats) {
      const kws = keywords[cat.name];
      if (kws?.some((kw) => typeof kw === 'string' && lower.includes(kw))) return cat;
    }
    return null;
  }

  function parseAmountFromText(text: string): { amount: number; rest: string } {
    const patterns = [
      // 1. With suffix: "250rb", "3jt", "2,5jt"
      /(?:Rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu)/i,
      // 2. With thousand separators: "219,750", "1.234.567"
      /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)\s*(jt|juta|rb|ribu)?/i,
      // 3. Plain digits: "2740000", "219750", "250"
      /(?:Rp\.?\s*)?(\d+)/i,
    ];
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        const raw = m[1].replace(/\./g, '').replace(/,/g, '');
        const num = parseFloat(raw);
        const multiplier = m[2]?.toLowerCase();
        let amount = num;
        if (multiplier === 'jt' || multiplier === 'juta') amount = num * 1000000;
        else if (multiplier === 'rb' || multiplier === 'ribu') amount = num * 1000;
        const rest = text.replace(m[0], '').trim();
        return { amount, rest };
      }
    }
    return { amount: 0, rest: text };
  }

  function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDateFromText(text: string): { date: string; rest: string } {
    const lower = text.toLowerCase().trim();
    let date = getLocalToday();
    let rest = text.trim();

    if (lower.startsWith('kemarin')) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = toLocalDateStr(d);
      rest = text.replace(/^kemarin\s*/i, '').trim();
      return { date, rest };
    }

    if (lower.startsWith('hari ini')) {
      rest = text.replace(/^hari ini\s*/i, '').trim();
      return { date, rest };
    }

    const monthMap: Record<string, number> = {
      januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
      juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
      jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, agt: 8,
      sep: 9, okt: 10, nov: 11, des: 12,
    };

    const datePatterns = [
      /^(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|aug|agt|sep|okt|nov|des)\s+(\d{4})\b/i,
      /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/,
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/,
    ];

    for (const pattern of datePatterns) {
      const m = lower.match(pattern);
      if (m) {
        if (pattern === datePatterns[0]) {
          const day = parseInt(m[1], 10);
          const month = monthMap[m[2].toLowerCase()] || 1;
          const year = parseInt(m[3], 10);
          const d = new Date(year, month - 1, day);
          if (d.getDate() === day && d.getMonth() === month - 1) {
            date = toLocalDateStr(d);
            rest = text.replace(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
            return { date, rest };
          }
        } else if (pattern === datePatterns[1]) {
          let day = parseInt(m[1], 10);
          let month = parseInt(m[2], 10);
          let year = parseInt(m[3], 10);
          if (day > 12 && month <= 12) {
            [day, month] = [month, day];
          }
          const d = new Date(year, month - 1, day);
          if (d.getDate() === day && d.getMonth() === month - 1) {
            date = toLocalDateStr(d);
            rest = text.replace(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
            return { date, rest };
          }
        } else {
          const year = parseInt(m[1], 10);
          const month = parseInt(m[2], 10);
          const day = parseInt(m[3], 10);
          const d = new Date(year, month - 1, day);
          if (d.getDate() === day && d.getMonth() === month - 1) {
            date = toLocalDateStr(d);
            rest = text.replace(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
            return { date, rest };
          }
        }
      }
    }

    return { date, rest };
  }

  function parseSingleTransaction(text: string): {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    categoryName: string;
    accountName: string;
  } | null {
    let rest = text;

    const { date, rest: afterDate } = parseDateFromText(rest);
    rest = afterDate;

    const incomeKw = ['terima', 'gaji', 'dapat', 'jual', 'hasil', 'masuk', 'pendapatan'];
    const isIncome = incomeKw.some((kw) => rest.toLowerCase().includes(kw));
    const type = isIncome ? 'income' : 'expense';

    const { amount, rest: afterAmount } = parseAmountFromText(rest);
    if (amount === 0) return null;
    rest = afterAmount;

    let accountName = '';
    const accountKw = ['cash', 'tunai', 'bri', 'bca', 'mandiri', 'bni', 'gojek', 'gopay', 'ovo'];
    const prepKw = ['lewat', 'via', 'transfer', 'pakai', 'pake', 'dengan', 'menggunakan'];
    for (const kw of accountKw) {
      const idx = rest.toLowerCase().indexOf(kw);
      if (idx >= 0) {
        accountName = kw.toUpperCase();
        rest = rest.slice(0, idx).trim();
        break;
      }
    }
    if (!accountName) {
      for (const kw of prepKw) {
        const idx = rest.toLowerCase().indexOf(kw);
        if (idx >= 0) {
          const after = rest.slice(idx + kw.length).trim();
          const nextWord = after.split(/\s+/)[0];
          accountName = nextWord ? nextWord.toUpperCase() : '';
          rest = rest.slice(0, idx).trim();
          break;
        }
      }
    }
    rest = rest.replace(/^beli\s*/i, '').replace(/^bayar\s*/i, '').replace(/^terima\s*/i, '').trim();
    rest = rest.replace(/\b(pakai|pake|dengan|menggunakan|melalui|lewat|via|transfer)\s+\S+/gi, '').trim();
    rest = rest.replace(/\b(pakai|pake|dengan|menggunakan|melalui|lewat|via|transfer)\b\s*$/gi, '').trim();
    rest = rest.replace(/\b(pakai|pake|dengan|menggunakan|melalui|lewat|via|transfer)\b/gi, '').trim();
    const category = matchCategory(rest, type);
    const monthNames = /^(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4}\b/i;
    rest = rest.replace(monthNames, '').replace(/\b\d{1,2}\s+(jan|feb|mar|apr|mei|jun|jul|aug|agt|sep|okt|nov|des)\s+\d{4}\b/gi, '').trim();
    rest = rest.replace(/\s{2,}/g, ' ').trim();
    return { type, amount, description: rest || 'Tanpa keterangan', date, categoryName: category?.name || 'Lainnya', accountName };
  }

  function parseTransactions(text: string): Array<{
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string;
    categoryName: string;
    accountName: string;
  }> {
    const parts = text.split(/\bdan\b|\blalu\b|\bterus\b/i).map((s) => s.trim()).filter(Boolean);
    const results: Array<any> = [];
    for (const part of parts) {
      const parsed = parseSingleTransaction(part);
      if (parsed) results.push(parsed);
    }
    return results;
  }

  // Helper: get month name in Indonesian
  const getMonthName = (m: number) => {
    const names = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return names[m] || '';
  };

  // Helper: filter transactions by month/year
  const getTxByMonth = (txs: Transaction[], year: number, month: number) =>
    txs.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

  const addAiMessage = (content: string) => {
    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content };
    setMessages((prev) => [...prev, aiMsg]);
  };

const handleQuickReply = async (text: string) => {
  // Ensure we have the latest quota from server
  await loadQuota();
  if (!aiQuota || aiQuota.quota <= 0) {
    setShowQuotaModal(true);
    return;
  }
  setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    if (user && aiQuota && aiQuota.quota > 0) {
      const { data: newQuota, error: decError } = await api.profiles.decrementAiQuota(user.id);
      if (decError || newQuota === null) {
        setAiQuota((prev) => prev ? { ...prev, quota: 0 } : prev);
        setIsTyping(false);
        setShowQuotaModal(true);
        return;
      }
      setAiQuota((prev) => prev ? { ...prev, quota: newQuota } : prev);
    }

    // Refresh data
    await loadAllData();

    if (text === 'Scan struk') {
      setIsTyping(false);
      showImagePickerOptions(handleReceiptScan);
      return;
    }

    if (text === 'Catat transaksi') {
      setIsTyping(false);
      setChatMode('catalog_transaction');
      addAiMessage('Silakan ketik transaksi yang ingin dicatat.\n\nContoh:\n• "Hari ini beli sepatu Rp250rb cash"\n• "Kemarin terima gaji 3jt lewat BRI dan beli beras 75rb cash"');
      return;
    }

    if (text === 'Cek riwayat transaksi') {
      setIsTyping(false);
      const recent = allTransactions.slice(0, 10);
      if (recent.length === 0) {
        addAiMessage('📭 Belum ada transaksi yang tercatat. Mulai catat transaksi pertama Anda!');
        return;
      }
      let detail = '📋 Berikut 10 transaksi terakhir Anda:\n';
      for (const tx of recent) {
        const icon = tx.type === 'income' ? '💰' : '💳';
        const dateStr = new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const catName = tx.category?.name || 'Tanpa Kategori';
        detail += `\n${icon} ${dateStr} — ${tx.description || 'Tanpa keterangan'} Rp ${formatCurrency(tx.amount)} (${catName})`;
      }
      const totalIn = recent.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const totalOut = recent.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      detail += `\n\n💰 Total Pemasukan: Rp ${formatCurrency(totalIn)}`;
      detail += `\n💳 Total Pengeluaran: Rp ${formatCurrency(totalOut)}`;
      addAiMessage(detail);
      return;
    }

    if (text === 'Bandingkan keuangan per periode') {
      setIsTyping(false);
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const prevM = curM === 1 ? 12 : curM - 1;
      const prevY = curM === 1 ? curY - 1 : curY;

      const curTx = getTxByMonth(allTransactions, curY, curM);
      const prevTx = getTxByMonth(allTransactions, prevY, prevM);

      const curIn = curTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const curOut = curTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const prevIn = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const prevOut = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      let msg = `📊 Perbandingan Keuangan\n\n`;
      msg += `📅 ${getMonthName(prevM)} ${prevY}:\n`;
      msg += `  💰 Pemasukan: Rp ${formatCurrency(prevIn)}\n`;
      msg += `  💳 Pengeluaran: Rp ${formatCurrency(prevOut)}\n`;
      msg += `  📈 Selisih: ${prevIn >= prevOut ? '+' : '-'}Rp ${formatCurrency(Math.abs(prevIn - prevOut))}\n\n`;
      msg += `📅 ${getMonthName(curM)} ${curY}:\n`;
      msg += `  💰 Pemasukan: Rp ${formatCurrency(curIn)}\n`;
      msg += `  💳 Pengeluaran: Rp ${formatCurrency(curOut)}\n`;
      msg += `  📈 Selisih: ${curIn >= curOut ? '+' : '-'}Rp ${formatCurrency(Math.abs(curIn - curOut))}`;

      if (prevOut > 0) {
        const pctChange = ((curOut - prevOut) / prevOut * 100).toFixed(0);
        const direction = curOut > prevOut ? 'lebih tinggi' : 'lebih rendah';
        msg += `\n\n💡 Insight: Pengeluaran bulan ini ${Math.abs(Number(pctChange))}% ${direction} dari bulan lalu.`;
      }
      if (curTx.length === 0 && prevTx.length === 0) {
        msg = '📭 Belum ada data transaksi untuk dibandingkan. Mulai catat transaksi Anda!';
      }
      addAiMessage(msg);
      return;
    }

    if (text === 'Cek keuangan per kategori') {
      setIsTyping(false);
      const now = new Date();
      const curM = now.getMonth() + 1;
      const curY = now.getFullYear();
      const curTx = getTxByMonth(allTransactions, curY, curM).filter(t => t.type === 'expense');

      if (curTx.length === 0) {
        addAiMessage(`📭 Belum ada pengeluaran di bulan ${getMonthName(curM)} ${curY}.`);
        return;
      }

      const byCategory: Record<string, { name: string; icon: string; total: number }> = {};
      for (const tx of curTx) {
        const catName = tx.category?.name || 'Lainnya';
        const catIcon = tx.category?.icon || '📦';
        if (!byCategory[catName]) byCategory[catName] = { name: catName, icon: catIcon, total: 0 };
        byCategory[catName].total += tx.amount;
      }
      const sorted = Object.values(byCategory).sort((a, b) => b.total - a.total);
      const totalExpense = sorted.reduce((s, c) => s + c.total, 0);

      let msg = `💵 Pengeluaran Per Kategori (${getMonthName(curM)} ${curY}):\n`;
      for (const c of sorted) {
        const pct = totalExpense > 0 ? ((c.total / totalExpense) * 100).toFixed(0) : '0';
        msg += `\n${c.icon} ${c.name}: Rp ${formatCurrency(c.total)} (${pct}%)`;
      }
      msg += `\n\n📊 Total Pengeluaran: Rp ${formatCurrency(totalExpense)}`;
      msg += `\n🏆 Kategori terbesar: ${sorted[0].icon} ${sorted[0].name} (${((sorted[0].total / totalExpense) * 100).toFixed(0)}%)`;
      addAiMessage(msg);
      return;
    }

    if (text === 'Simulasi rencana keuangan') {
      setIsTyping(false);
      setChatMode('financial_simulation');
      addAiMessage('🎯 Simulasi Rencana Keuangan\n\nBerapa target tabungan yang ingin Anda capai?\n\nContoh:\n• "10jt"\n• "50000000"\n• "100 juta"');
      return;
    }

    if (text === 'Atur budget bulan ini') {
      setIsTyping(false);
      const now = new Date();
      const curM = now.getMonth() + 1;
      const curY = now.getFullYear();

      const expenseCats = categories.filter(c => c.type === 'expense');
      if (expenseCats.length === 0) {
        addAiMessage('⚠️ Belum ada kategori pengeluaran. Tambahkan kategori terlebih dahulu.');
        return;
      }

      let msg = `🤖 Atur Budget ${getMonthName(curM)} ${curY}\n\nBerikut kategori pengeluaran Anda:\n`;
      expenseCats.forEach((c, i) => {
        const existing = budgets.find(b => b.category_id === c.id);
        const budgetStr = existing ? `Rp ${formatCurrency(existing.amount)}` : 'Belum ada budget';
        msg += `\n${i + 1}. ${c.icon} ${c.name} — ${budgetStr}`;
      });
      msg += '\n\nKetik nama/nomor kategori dan jumlah budget.\nContoh: "Makanan 500rb" atau "1 1jt"\nKetik "selesai" untuk kembali.';
      setChatMode('set_budget');
      addAiMessage(msg);
      return;
    }

    if (text === 'Minta rekomendasi budget') {
      setIsTyping(false);
      const now = new Date();

      // Analyze last 3 months
      const months: Array<{y: number; m: number}> = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
      }

      const catSpending: Record<string, { name: string; icon: string; totals: number[] }> = {};
      for (const period of months) {
        const txs = getTxByMonth(allTransactions, period.y, period.m).filter(t => t.type === 'expense');
        const periodCats: Record<string, number> = {};
        for (const tx of txs) {
          const catName = tx.category?.name || 'Lainnya';
          periodCats[catName] = (periodCats[catName] || 0) + tx.amount;
          if (!catSpending[catName]) {
            catSpending[catName] = { name: catName, icon: tx.category?.icon || '📦', totals: [] };
          }
        }
        for (const [name, entry] of Object.entries(catSpending)) {
          entry.totals.push(periodCats[name] || 0);
        }
      }

      const recos: Array<{ name: string; icon: string; avg: number; reco: number }> = [];
      for (const [, entry] of Object.entries(catSpending)) {
        const validTotals = entry.totals.filter(t => t > 0);
        if (validTotals.length === 0) continue;
        const avg = validTotals.reduce((s, t) => s + t, 0) / validTotals.length;
        const reco = Math.ceil(avg * 1.1 / 1000) * 1000; // round up to nearest 1000
        recos.push({ name: entry.name, icon: entry.icon, avg: Math.round(avg), reco });
      }

      if (recos.length === 0) {
        addAiMessage('📭 Belum cukup data transaksi untuk memberikan rekomendasi. Catat transaksi minimal 1 bulan terlebih dahulu.');
        return;
      }

      recos.sort((a, b) => b.reco - a.reco);
      const totalReco = recos.reduce((s, r) => s + r.reco, 0);
      const monthRange = months.map(p => getMonthName(p.m)).reverse().join(', ');

      let msg = `💰 Rekomendasi Budget\nBerdasarkan analisis ${monthRange}:\n`;
      for (const r of recos) {
        msg += `\n${r.icon} ${r.name}: Rata-rata Rp ${formatCurrency(r.avg)} → Rekomendasi: Rp ${formatCurrency(r.reco)}`;
      }
      msg += `\n\n📊 Total rekomendasi: Rp ${formatCurrency(totalReco)}/bulan`;
      msg += '\n\nPilihan Anda:';
      msg += '\n• Ketik "Ya" untuk menyimpan semua rekomendasi';
      msg += '\n• Ketik nama kategori dan jumlah untuk menyesuaikan (contoh: "Makanan 500rb")';
      msg += '\n• Ketik "selesai" jika sudah selesai';

      // Store recommendations for potential apply
      const expenseCats = categories.filter(c => c.type === 'expense');
      const recosToSave = recos.map(r => {
        const cat = expenseCats.find(c => c.name === r.name);
        return { category_id: cat?.id || '', name: r.name, amount: r.reco };
      }).filter(r => r.category_id);
      setPendingBudgetRecos(recosToSave);
      setChatMode('apply_budget_reco');
      addAiMessage(msg);
      return;
    }

    // Fallback for unknown quick replies
    setIsTyping(false);
    addAiMessage('Maaf, fitur ini sedang dalam pengembangan. Silakan coba quick action lainnya!');
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');

    if (!aiQuota || aiQuota.quota <= 0) {
      setShowQuotaModal(true);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    if (user && aiQuota && aiQuota.quota > 0) {
      const { data: newQuota, error: decError } = await api.profiles.decrementAiQuota(user.id);
      if (decError || newQuota === null) {
        setAiQuota((prev) => prev ? { ...prev, quota: 0 } : prev);
        setIsTyping(false);
        setShowQuotaModal(true);
        return;
      }
      setAiQuota((prev) => prev ? { ...prev, quota: newQuota } : prev);
    }

    if (chatMode === 'catalog_transaction') {
      setChatMode('normal');
      setIsTyping(true);

      try {
        const parsed = parseTransactions(text);
        if (parsed.length === 0) {
          setIsTyping(false);
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'Maaf, saya tidak bisa mengenali format transaksi Anda. Silakan coba lagi dengan format seperti:\n• "Hari ini beli sepatu Rp250rb cash"\n• "Kemarin terima gaji 3jt lewat BRI"',
          };
          setMessages((prev) => [...prev, aiMsg]);
          return;
        }

        const savedTxs: SavedTransaction[] = [];
        let savedCount = 0;
        let details = '';

        for (const tx of parsed) {
          if (!user) continue;

          const matchedCat = categories.find(
            (c) => c.name === tx.categoryName && c.type === tx.type
          );
          if (!matchedCat) continue;

          const matchedAcc = tx.accountName
            ? accounts.find((a) => a.name.toUpperCase() === tx.accountName)
            : undefined;

          const { data: txData, error: txError } = await api.transactions.create(user.id, {
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            date: tx.date,
            category_id: matchedCat.id,
            account_id: matchedAcc?.id,
            source: 'ai',
          });

          if (txData) {
            savedCount++;
            savedTxs.push({ id: txData.id, type: tx.type, amount: tx.amount, description: tx.description, date: tx.date, categoryName: tx.categoryName, accountName: tx.accountName });
            const [y, m, d] = tx.date.split('-').map(Number);
            const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const dateStr = `${d} ${monthNames[m - 1]} ${y}`;
            const icon = tx.type === 'income' ? '💰' : '💳';
            details += `\n${icon} ${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} Rp ${formatCurrency(tx.amount)}`;
            details += `\n   📅 ${dateStr}`;
            details += `\n   🏷️ ${tx.categoryName}`;
            if (tx.accountName) details += `\n   🏦 ${tx.accountName}`;
            details += `\n   📝 ${tx.description}\n`;
          } else {
            console.error('Failed to save transaction:', txError);
          }
        }

        setIsTyping(false);

        if (savedCount > 0) {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `✅ ${savedCount} transaksi berhasil dicatat:${details}\n\nKetik "Catat transaksi" lagi jika ingin menambahkan transaksi lainnya.`,
            savedTransactions: savedTxs,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content:
              'Maaf, terjadi kesalahan saat menyimpan transaksi. Silakan coba lagi.',
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
      } catch {
        setIsTyping(false);
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
      return;
    }

    // Handle financial simulation mode
    if (chatMode === 'financial_simulation') {
      setChatMode('normal');
      setIsTyping(true);

      try {
        const { amount: targetAmount } = parseAmountFromText(text);
        if (targetAmount <= 0) {
          setIsTyping(false);
          addAiMessage('Maaf, saya tidak mengenali jumlah target Anda. Coba ketik seperti "10jt" atau "50000000".');
          return;
        }

        // Calculate averages from last 3 months
        const now = new Date();
        let totalIncome = 0, totalExpense = 0, monthCount = 0;
        for (let i = 1; i <= 3; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const txs = getTxByMonth(allTransactions, d.getFullYear(), d.getMonth() + 1);
          if (txs.length > 0) {
            totalIncome += txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            totalExpense += txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            monthCount++;
          }
        }

        setIsTyping(false);

        if (monthCount === 0) {
          addAiMessage(`🎯 Target tabungan: Rp ${formatCurrency(targetAmount)}\n\n⚠️ Belum ada data transaksi yang cukup untuk simulasi. Catat transaksi selama minimal 1 bulan agar simulasi lebih akurat.`);
          return;
        }

        const avgIn = Math.round(totalIncome / monthCount);
        const avgOut = Math.round(totalExpense / monthCount);
        const avgSaving = avgIn - avgOut;

        let msg = `🎯 Simulasi Rencana Keuangan\n\nTarget: Rp ${formatCurrency(targetAmount)}\n\n`;
        msg += `📊 Berdasarkan data ${monthCount} bulan terakhir:\n`;
        msg += `• Rata-rata pemasukan/bulan: Rp ${formatCurrency(avgIn)}\n`;
        msg += `• Rata-rata pengeluaran/bulan: Rp ${formatCurrency(avgOut)}\n`;
        msg += `• Sisa rata-rata/bulan: ${avgSaving >= 0 ? '' : '-'}Rp ${formatCurrency(Math.abs(avgSaving))}`;

        if (avgSaving <= 0) {
          msg += '\n\n⚠️ Pengeluaran Anda melebihi pemasukan. Anda perlu mengurangi pengeluaran atau menambah pemasukan sebelum bisa menabung.';
        } else {
          const months = Math.ceil(targetAmount / avgSaving);
          const years = Math.floor(months / 12);
          const remMonths = months % 12;
          const timeStr = years > 0 ? `${years} tahun ${remMonths > 0 ? `${remMonths} bulan` : ''}` : `${months} bulan`;
          msg += `\n\n⏰ Waktu yang dibutuhkan: ${timeStr} (${months} bulan)`;

          // Tip: if reduce 10% expense
          const reduced = Math.round(avgOut * 0.9);
          const newSaving = avgIn - reduced;
          if (newSaving > avgSaving) {
            const newMonths = Math.ceil(targetAmount / newSaving);
            msg += `\n\n💡 Tips: Jika mengurangi pengeluaran 10%, waktu bisa dipersingkat menjadi ${newMonths} bulan.`;
          }
        }

        addAiMessage(msg);
      } catch {
        setIsTyping(false);
        addAiMessage('Maaf, terjadi kesalahan saat simulasi. Silakan coba lagi.');
      }
      return;
    }

    // Handle set budget mode
    if (chatMode === 'set_budget') {
      if (text.toLowerCase() === 'selesai') {
        setChatMode('normal');
        addAiMessage('✅ Selesai mengatur budget. Gunakan quick action lainnya jika diperlukan!');
        return;
      }

      setIsTyping(true);
      try {
        const expenseCats = categories.filter(c => c.type === 'expense');
        let matchedCat: Category | null = null;

        // Try match by number
        const numMatch = text.match(/^(\d+)\s+/);
        if (numMatch) {
          const idx = parseInt(numMatch[1], 10) - 1;
          if (idx >= 0 && idx < expenseCats.length) {
            matchedCat = expenseCats[idx];
          }
        }

        // Try match by name
        if (!matchedCat) {
          const lower = text.toLowerCase();
          matchedCat = expenseCats.find(c => lower.includes(c.name.toLowerCase())) || null;
        }

        const { amount: budgetAmount } = parseAmountFromText(text);

        if (!matchedCat || budgetAmount <= 0) {
          setIsTyping(false);
          addAiMessage('⚠️ Format tidak dikenali. Contoh: "Makanan 500rb" atau "1 1jt"\nKetik "selesai" untuk kembali.');
          return;
        }

        const now = new Date();
        if (!user) {
          setIsTyping(false);
          addAiMessage('⚠️ Silakan login terlebih dahulu.');
          return;
        }

        const { error } = await api.budgets.upsert(user.id, {
          category_id: matchedCat.id,
          amount: budgetAmount,
          mode: 'nominal',
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });

        setIsTyping(false);

        if (error) {
          addAiMessage('❌ Gagal menyimpan budget. Silakan coba lagi.');
        } else {
          await loadAllData(); // Refresh budgets
          addAiMessage(`✅ Budget berhasil diatur:\n${matchedCat.icon} ${matchedCat.name}: Rp ${formatCurrency(budgetAmount)}/bulan\n\nKetik kategori lain atau "selesai" untuk kembali.`);
        }
      } catch {
        setIsTyping(false);
        addAiMessage('Maaf, terjadi kesalahan. Silakan coba lagi.');
      }
      return;
    }

    // Handle apply budget recommendations
    if (chatMode === 'apply_budget_reco') {
      const lower = text.toLowerCase();

      // "selesai" → exit mode
      if (lower === 'selesai') {
        setChatMode('normal');
        setPendingBudgetRecos([]);
        addAiMessage('✅ Selesai mengatur budget. Gunakan quick action lainnya jika diperlukan!');
        return;
      }

      // "ya"/"iya" → apply all pending recommendations
      if (lower === 'ya' || lower === 'iya') {
        setChatMode('normal');
        setIsTyping(true);
        try {
          if (!user) throw new Error('No user');
          const now = new Date();
          let savedCount = 0;
          for (const reco of pendingBudgetRecos) {
            const { error } = await api.budgets.upsert(user.id, {
              category_id: reco.category_id,
              amount: reco.amount,
              mode: 'nominal',
              month: now.getMonth() + 1,
              year: now.getFullYear(),
            });
            if (!error) savedCount++;
          }
          setIsTyping(false);
          await loadAllData();
          addAiMessage(`✅ ${savedCount} budget berhasil diterapkan!\n\nSemua rekomendasi budget sudah disimpan untuk bulan ${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}.`);
        } catch {
          setIsTyping(false);
          addAiMessage('❌ Gagal menerapkan rekomendasi budget. Silakan coba lagi.');
        }
        setPendingBudgetRecos([]);
        return;
      }

      // Per-category custom input (e.g. "Makanan 500rb" or "1 300rb")
      setIsTyping(true);
      try {
        const expenseCats = categories.filter(c => c.type === 'expense');
        let matchedCat: Category | null = null;

        // Try match by number
        const numMatch = text.match(/^(\d+)\s+/);
        if (numMatch) {
          const idx = parseInt(numMatch[1], 10) - 1;
          if (idx >= 0 && idx < expenseCats.length) {
            matchedCat = expenseCats[idx];
          }
        }

        // Try match by name
        if (!matchedCat) {
          matchedCat = expenseCats.find(c => text.toLowerCase().includes(c.name.toLowerCase())) || null;
        }

        // Also try matching from pending reco names
        if (!matchedCat) {
          const recoMatch = pendingBudgetRecos.find(r => text.toLowerCase().includes(r.name.toLowerCase()));
          if (recoMatch) {
            matchedCat = expenseCats.find(c => c.id === recoMatch.category_id) || null;
          }
        }

        const { amount: budgetAmount } = parseAmountFromText(text);

        if (!matchedCat || budgetAmount <= 0) {
          setIsTyping(false);
          addAiMessage('⚠️ Format tidak dikenali. Contoh: "Makanan 500rb" atau "Transport 300rb"\n\nKetik "Ya" untuk simpan semua, atau "selesai" untuk keluar.');
          return;
        }

        if (!user) {
          setIsTyping(false);
          addAiMessage('⚠️ Silakan login terlebih dahulu.');
          return;
        }

        const now = new Date();
        const { error } = await api.budgets.upsert(user.id, {
          category_id: matchedCat.id,
          amount: budgetAmount,
          mode: 'nominal',
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });

        setIsTyping(false);

        if (error) {
          addAiMessage('❌ Gagal menyimpan budget. Silakan coba lagi.');
        } else {
          // Update pending recos to reflect the custom value
          setPendingBudgetRecos(prev =>
            prev.map(r => r.category_id === matchedCat!.id ? { ...r, amount: budgetAmount } : r)
          );
          await loadAllData();
          addAiMessage(`✅ Budget disesuaikan:\n${matchedCat.icon} ${matchedCat.name}: Rp ${formatCurrency(budgetAmount)}/bulan\n\nKetik kategori lain, "Ya" untuk simpan sisanya, atau "selesai".`);
        }
      } catch {
        setIsTyping(false);
        addAiMessage('Maaf, terjadi kesalahan. Silakan coba lagi.');
      }
      return;
    }

    // Normal mode: smart response based on keywords
    setIsTyping(true);
    await loadAllData();

    const lower = text.toLowerCase();
    // Check if user is asking about budget status
    if (lower.includes('budget') || lower.includes('anggaran')) {
      setIsTyping(false);
      await handleSuggested('Bagaimana status budget saya bulan ini?');
      return;
    }
    // Check if asking about spending/expenses
    if (lower.includes('pengeluaran') || lower.includes('belanja') || lower.includes('habis')) {
      setIsTyping(false);
      handleQuickReply('Cek keuangan per kategori');
      return;
    }
    // Check if asking about history
    if (lower.includes('riwayat') || lower.includes('histori') || lower.includes('terakhir')) {
      setIsTyping(false);
      handleQuickReply('Cek riwayat transaksi');
      return;
    }

    setIsTyping(false);
    addAiMessage('Terima kasih atas pertanyaannya! Untuk membantu Anda dengan lebih baik, silakan gunakan quick action di bawah atau coba tanyakan tentang:\n\n• Budget dan anggaran\n• Pengeluaran per kategori\n• Riwayat transaksi\n• Simulasi keuangan\n• Rekomendasi budget');
  };

  const handleSuggested = async (q: string) => {
    if (!aiQuota || aiQuota.quota <= 0) {
      setShowQuotaModal(true);
      return;
    }
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    if (user && aiQuota && aiQuota.quota > 0) {
      api.profiles.decrementAiQuota(user.id).then(({ data }) => {
        if (data !== null) setAiQuota((prev) => prev ? { ...prev, quota: data } : prev);
      });
    }

    await loadAllData();

    if (q === 'Bagaimana status budget saya bulan ini?') {
      setIsTyping(false);
      const now = new Date();
      const curM = now.getMonth() + 1;
      const curY = now.getFullYear();
      const curTx = getTxByMonth(allTransactions, curY, curM).filter(t => t.type === 'expense');

      if (budgets.length === 0) {
        addAiMessage(`📭 Anda belum mengatur budget untuk ${getMonthName(curM)} ${curY}.\n\nGunakan "Atur budget bulan ini" atau "Minta rekomendasi budget" untuk mulai.`);
        return;
      }

      // Calculate spending per budget category
      const spendingByCat: Record<string, number> = {};
      for (const tx of curTx) {
        spendingByCat[tx.category_id] = (spendingByCat[tx.category_id] || 0) + tx.amount;
      }

      const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
      const totalSpent = budgets.reduce((s, b) => s + (spendingByCat[b.category_id] || 0), 0);
      const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

      let msg = `📊 Status Budget ${getMonthName(curM)} ${curY}\n\nAnda telah menggunakan ${overallPct}% dari total budget.\n`;

      // Find the most critical budget (highest percentage used)
      let maxPct = 0;
      let criticalBudget: { catName: string; spent: number; budget: number; pct: number } | null = null;

      for (const b of budgets) {
        const spent = spendingByCat[b.category_id] || 0;
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        const catName = b.category?.name || 'Tanpa Kategori';
        const catIcon = b.category?.icon || '📦';
        const status = pct >= 90 ? '🔴' : pct >= 70 ? '🟡' : '🟢';
        msg += `\n${status} ${catIcon} ${catName}: Rp ${formatCurrency(spent)} / Rp ${formatCurrency(b.amount)} (${pct}%)`;

        if (pct > maxPct) {
          maxPct = pct;
          criticalBudget = { catName, spent, budget: b.amount, pct };
        }
      }

      if (criticalBudget && criticalBudget.pct >= 70) {
        msg += `\n\n⚠️ Perhatian: Kategori "${criticalBudget.catName}" sudah mencapai ${criticalBudget.pct}%!`;
      }

      // Also create an insight message with the most critical budget
      if (criticalBudget) {
        const color = criticalBudget.pct >= 90 ? '#ef4444' : criticalBudget.pct >= 70 ? '#f59e0b' : '#22c55e';
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          type: 'insight',
          content: msg,
          insightData: {
            label: `${criticalBudget.pct >= 90 ? 'Peringatan' : 'Status'}: ${criticalBudget.catName}`,
            percent: Math.min(criticalBudget.pct, 100),
            current: `Rp ${formatCurrency(criticalBudget.spent)}`,
            total: `Rp ${formatCurrency(criticalBudget.budget)}`,
            color,
          },
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        addAiMessage(msg);
      }
      return;
    }

    if (q === 'Beri saran investasi untuk pemula') {
      setIsTyping(false);
      let msg = '💡 Saran Investasi untuk Pemula\n\n';
      msg += '1. 🏦 Deposito Bank — Risiko rendah, cocok untuk dana darurat\n';
      msg += '2. 📈 Reksa Dana Pasar Uang — Lebih fleksibel dari deposito, risiko rendah\n';
      msg += '3. 🏛️ Obligasi Negara (SBN) — Dijamin pemerintah, return tetap\n';
      msg += '4. 📊 Reksa Dana Indeks — Diversifikasi otomatis, biaya rendah\n';
      msg += '5. 🥇 Emas Digital — Lindung nilai inflasi\n\n';
      msg += '📌 Tips Penting:\n';
      msg += '• Sisihkan dana darurat 3-6 bulan pengeluaran sebelum investasi\n';
      msg += '• Mulai dari yang risiko rendah\n';
      msg += '• Jangan investasi uang yang Anda butuhkan dalam waktu dekat\n';
      msg += '• Diversifikasi portfolio Anda';

      // Add personal context if available
      const now = new Date();
      const curTx = getTxByMonth(allTransactions, now.getFullYear(), now.getMonth() + 1);
      const monthlyIncome = curTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const monthlyExpense = curTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      if (monthlyIncome > 0) {
        const surplus = monthlyIncome - monthlyExpense;
        if (surplus > 0) {
          msg += `\n\n💰 Berdasarkan data bulan ini, Anda punya surplus Rp ${formatCurrency(surplus)} yang bisa dialokasikan untuk investasi.`;
        }
      }
      addAiMessage(msg);
      return;
    }

    if (q === 'Analisis pengeluaran makanan saya') {
      setIsTyping(false);
      const now = new Date();
      const curM = now.getMonth() + 1;
      const curY = now.getFullYear();
      const curTx = getTxByMonth(allTransactions, curY, curM).filter(t => t.type === 'expense');
      const foodTx = curTx.filter(t => {
        const catName = (t.category?.name || '').toLowerCase();
        return catName.includes('makanan') || catName.includes('makan') || catName.includes('food');
      });

      if (foodTx.length === 0) {
        addAiMessage(`🍔 Belum ada pengeluaran makanan tercatat di bulan ${getMonthName(curM)} ${curY}.\n\nMulai catat pengeluaran makanan Anda untuk mendapat analisis!`);
        return;
      }

      const totalFood = foodTx.reduce((s, t) => s + t.amount, 0);
      const totalAllExpense = curTx.reduce((s, t) => s + t.amount, 0);
      const foodPct = totalAllExpense > 0 ? ((totalFood / totalAllExpense) * 100).toFixed(0) : '0';
      const avgPerDay = Math.round(totalFood / now.getDate());

      let msg = `🍔 Analisis Pengeluaran Makanan (${getMonthName(curM)} ${curY})\n\n`;
      msg += `📊 Total: Rp ${formatCurrency(totalFood)} (${foodPct}% dari total pengeluaran)\n`;
      msg += `📝 Jumlah transaksi: ${foodTx.length}x\n`;
      msg += `📅 Rata-rata per hari: Rp ${formatCurrency(avgPerDay)}\n\n`;

      msg += 'Rincian transaksi:\n';
      for (const tx of foodTx.slice(0, 5)) {
        const dateStr = new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        msg += `• ${dateStr} — ${tx.description || 'Makanan'} Rp ${formatCurrency(tx.amount)}\n`;
      }
      if (foodTx.length > 5) {
        msg += `... dan ${foodTx.length - 5} transaksi lainnya`;
      }

      if (Number(foodPct) > 40) {
        msg += '\n\n⚠️ Pengeluaran makanan melebihi 40% total pengeluaran. Pertimbangkan untuk masak di rumah lebih sering!';
      } else if (Number(foodPct) > 25) {
        msg += '\n\n💡 Pengeluaran makanan Anda cukup moderat. Pertahankan!';
      } else {
        msg += '\n\n✅ Pengeluaran makanan Anda tergolong hemat. Bagus!';
      }

      addAiMessage(msg);
      return;
    }

    // Fallback
    setIsTyping(false);
    addAiMessage('Maaf, saya belum bisa menjawab pertanyaan ini. Coba gunakan quick action di bawah!');
  };

  const handleTransactionTap = (tx: SavedTransaction) => {
    router.push({
      pathname: '/add-transaction',
      params: {
        editId: tx.id,
        editType: tx.type,
        editAmount: String(tx.amount),
        editDescription: tx.description,
        editDate: tx.date,
        editCategoryName: tx.categoryName,
        editAccountName: tx.accountName,
      },
    });
  };

  const pickReceiptImage = async (source: 'camera' | 'gallery'): Promise<{ uri: string; base64: string; mimeType: string | null } | null> => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Izin Diperlukan', 'Izinkan akses kamera untuk foto struk.');
          return null;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.3, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.3, base64: true });
      if (result.canceled || !result.assets?.[0]) return null;
      const asset = result.assets[0];
      if (!asset.base64) return null;
      return { uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType || 'image/jpeg' };
    } catch {
      return null;
    }
  };

  const handleReceiptScan = async (imageData: { uri: string; base64: string; mimeType: string | null }) => {
    if (!user || !api) return;

    // Check quota
    if (!aiQuota || aiQuota.quota <= 0) {
      setShowQuotaModal(true);
      return;
    }

    // Show user message with image thumbnail
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: '📷 Scan struk',
      imageUri: imageData.uri,
    };
    setMessages((prev) => [...prev, userMsg]);
    setReceiptScanning(true);
    setIsTyping(true);

    try {
      // Decrement quota first
      const { data: newQuota, error: decError } = await api.profiles.decrementAiQuota(user.id);
      if (decError || newQuota === null) {
        setAiQuota((prev) => prev ? { ...prev, quota: 0 } : prev);
        setIsTyping(false);
        setReceiptScanning(false);
        setShowQuotaModal(true);
        return;
      }
      setAiQuota((prev) => prev ? { ...prev, quota: newQuota } : prev);

      // Call scan-receipt edge function
      const { data: scanResult, error: scanError } = await api.supabase.functions.invoke('scan-receipt', {
        body: { image: imageData.base64, mimeType: imageData.mimeType },
      });

      if (scanError || !scanResult?.transactions || scanResult.transactions.length === 0) {
        setIsTyping(false);
        setReceiptScanning(false);
        addAiMessage('❌ Maaf, tidak bisa membaca struk ini. Pastikan foto struk jelas dan coba lagi.');
        return;
      }

      // Refresh data
      await loadAllData();

      // Save transactions
      const savedTxs: SavedTransaction[] = [];
      let details = '';
      const today = getLocalToday();

      for (const item of scanResult.transactions) {
        const txType = item.type === 'income' ? 'income' : 'expense';
        const matchedCat = categories.find(
          (c) => c.name.toLowerCase() === (item.category || '').toLowerCase() && c.type === txType
        ) || categories.find((c) => c.name === 'Lainnya' && c.type === txType);
        if (!matchedCat) continue;

        const matchedAcc = item.account
          ? accounts.find((a) => a.name.toUpperCase().includes(item.account.toUpperCase()))
          : undefined;

        const txDate = item.date || today;
        const { data: txData } = await api.transactions.create(user.id, {
          type: txType,
          amount: item.amount,
          description: item.description || 'Tanpa keterangan',
          date: txDate,
          category_id: matchedCat.id,
          account_id: matchedAcc?.id,
          source: 'ai',
        });

        if (txData) {
          savedTxs.push({
            id: txData.id,
            type: txType,
            amount: item.amount,
            description: item.description || 'Tanpa keterangan',
            date: txDate,
            categoryName: matchedCat.name,
            accountName: matchedAcc?.name || '',
          });
          const icon = txType === 'income' ? '💰' : '💳';
          const dateParts = txDate.split('-');
          const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : txDate;
          const accountStr = matchedAcc?.name ? ` | ${matchedAcc.name}` : '';
          details += `\n${icon} ${item.description || 'Item'} — Rp ${formatCurrency(item.amount)} (${categories.find(c => c.id === matchedCat.id)?.name || matchedCat.name}${accountStr} | ${formattedDate})`;
        }
      }

      setIsTyping(false);
      setReceiptScanning(false);

      if (savedTxs.length > 0) {
        const storeName = scanResult.store ? `\n🏪 Toko: ${scanResult.store}` : '';
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ ${savedTxs.length} transaksi berhasil dicatat dari struk:${storeName}${details}\n\nKetuk item untuk edit.`,
          savedTransactions: savedTxs,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        addAiMessage('⚠️ Struk berhasil dibaca tapi tidak ada transaksi yang bisa disimpan. Periksa kategori Anda.');
      }
    } catch (err) {
      setIsTyping(false);
      setReceiptScanning(false);
      addAiMessage('❌ Terjadi kesalahan saat memproses struk. Silakan coba lagi.');
    }
  };

  const showImagePickerOptions = (onPick: (data: { uri: string; base64: string; mimeType: string | null }) => void) => {
    Alert.alert(
      '📷 Pilih Sumber Gambar',
      'Ambil foto struk dari:',
      [
        {
          text: '📸 Kamera',
          onPress: async () => {
            const data = await pickReceiptImage('camera');
            if (data) onPick(data);
          },
        },
        {
          text: '🖼️ Galeri',
          onPress: async () => {
            const data = await pickReceiptImage('gallery');
            if (data) onPick(data);
          },
        },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const renderMessage = (msg: Message) => {
    const isUser = msg.role === 'user';

    if (isUser) {
      return (
        <View key={msg.id} style={styles.messageRowReverse}>
          <View style={[styles.avatarSmall, { backgroundColor: colors.inputBg }]}>
            <FontAwesome name="user" size={14} color={colors.textSecondary} />
          </View>
          <View style={[styles.userBubble, { backgroundColor: colors.tint }]}>
            <Text style={styles.userBubbleText}>{msg.content}</Text>
            {msg.imageUri && (
              <Image
                source={{ uri: msg.imageUri }}
                style={{ width: 200, height: 150, borderRadius: 12, marginTop: 8 }}
                resizeMode="cover"
              />
            )}
          </View>
        </View>
      );
    }

    return (
      <View key={msg.id} style={styles.messageRow}>
        <View style={[styles.avatarSmall, { backgroundColor: colors.tint }]}>
          <FontAwesome name="magic" size={14} color="#fff" />
        </View>
        <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aiBubbleText, { color: colors.text }]}>{msg.content}</Text>
          {msg.type === 'insight' && msg.insightData && (
            <View style={[styles.insightCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <View style={styles.insightHeader}>
                <FontAwesome name={msg.insightData.percent >= 90 ? 'warning' : 'info-circle'} size={14} color={msg.insightData.color} />
                <Text style={[styles.insightLabel, { color: colors.text }]}>{msg.insightData.label}</Text>
              </View>
              <Text style={[styles.insightDesc, { color: colors.textSecondary }]}>
                {msg.insightData.percent >= 90
                  ? `Pengeluaran sudah mencapai ${msg.insightData.percent}% dari batas. Sebaiknya kurangi pengeluaran untuk kategori ini.`
                  : msg.insightData.percent >= 70
                  ? `Pengeluaran sudah mencapai ${msg.insightData.percent}%. Perhatikan pengeluaran agar tidak melebihi budget.`
                  : `Pengeluaran masih dalam batas aman (${msg.insightData.percent}%). Pertahankan!`}
              </Text>
              <View style={styles.progressSection}>
                <View style={styles.progressLabelRow}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{msg.insightData.label.replace(/^(Peringatan|Status): /, '')}</Text>
                  <Text style={[styles.progressValue, { color: colors.textSecondary }]}>
                    {msg.insightData.current} / {msg.insightData.total}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${msg.insightData.percent}%`,
                        backgroundColor: msg.insightData.color,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}
          {msg.savedTransactions && msg.savedTransactions.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              {msg.savedTransactions.map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={[styles.insightCard, { backgroundColor: colors.inputBg, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                  onPress={() => handleTransactionTap(tx)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 20 }}>{tx.type === 'income' ? '💰' : '💳'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} — Rp {formatCurrency(tx.amount)}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                      {tx.categoryName}{tx.accountName ? ` • ${tx.accountName}` : ''}
                    </Text>
                  </View>
                  <FontAwesome name="pencil" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.tint }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.navigate('/');
              }
            }} 
            activeOpacity={0.7}
          >
            <FontAwesome name="chevron-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FontAwesome name="magic" size={22} color="#fff" />
              <Text style={styles.aiName}>Karsafin AI</Text>
            </View>
            <Text style={styles.aiSubtitle}>Asisten Keuangan Pribadi Anda</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.chatArea}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 + keyboardHeight }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length <= 1 && (
              <View style={styles.suggestionsSection}>
                <Text style={[styles.suggestionsLabel, { color: colors.textSecondary }]}>
                  Coba tanyakan:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestionChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                      onPress={() => handleSuggested(q)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.suggestionText, { color: colors.text }]}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.messagesContainer}>
              {messages.map(renderMessage)}

              {isTyping && (
                <View style={styles.messageRow}>
                  <View style={[styles.avatarSmall, { backgroundColor: colors.tint }]}>
                    <FontAwesome name="magic" size={14} color="#fff" />
                  </View>
                  <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 16 }]}>
                    <TypingDots />
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.quickReplySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickReplyContent}
          >
            {QUICK_REPLIES.map((qr, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickReplyChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => handleQuickReply(qr.text)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickReplyIcon}>{qr.icon}</Text>
                <Text style={[styles.quickReplyText, { color: colors.textSecondary }]}>{qr.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View
          style={[
            styles.inputArea,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12) + keyboardHeight,
            },
          ]}
        >
          <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cameraBtn, { opacity: receiptScanning ? 0.5 : 1 }]}
              onPress={() => showImagePickerOptions(handleReceiptScan)}
              disabled={receiptScanning}
              activeOpacity={0.7}
            >
              {receiptScanning ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <FontAwesome name="camera" size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={
                chatMode === 'catalog_transaction' ? 'Ketik transaksi...' :
                chatMode === 'financial_simulation' ? 'Ketik target tabungan...' :
                chatMode === 'set_budget' ? 'Ketik kategori dan jumlah...' :
                chatMode === 'apply_budget_reco' ? 'Ketik "Ya", kategori, atau "selesai"...' :
                'Tanya Karsafin AI...'
              }
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.tint, opacity: input.trim() ? 1 : 0.5 }]}
              onPress={handleSend}
              disabled={!input.trim()}
              activeOpacity={0.8}
            >
              <FontAwesome name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {aiQuota && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 4 }}>
            <TouchableOpacity onPress={() => setShowQuotaModal(true)} activeOpacity={0.7}>
              <Text style={{ fontSize: 11, color: aiQuota.quota <= 5 ? '#ef4444' : colors.textMuted }}>
                🎯 Sisa kuota AI: {aiQuota.quota}/{aiQuota.max}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={showQuotaModal} transparent animationType="fade" onRequestClose={() => setShowQuotaModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎯</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
              Kuota AI {aiQuota && aiQuota.quota > 0 ? 'Hampir Habis' : 'Habis!'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
              {aiQuota && aiQuota.quota > 0
                ? `Kamu punya ${aiQuota.quota} dari ${aiQuota.max} kuota tersisa hari ini.`
                : 'Kamu sudah menggunakan semua kuota AI gratis hari ini.'}
            </Text>
            {aiQuota && aiQuota.quota > 0 && (
              <View style={{ width: '100%', height: 8, backgroundColor: colors.inputBg, borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
                <View style={{ width: `${(aiQuota.quota / aiQuota.max) * 100}%`, height: '100%', backgroundColor: aiQuota.quota <= 5 ? '#ef4444' : colors.tint, borderRadius: 4 }} />
              </View>
            )}
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20 }}>
              Tonton iklan singkat untuk dapat {aiQuota?.rewardAmount ?? 5} kuota gratis tambahan!
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.tint, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center', opacity: adLoading ? 0.6 : 1 }}
              onPress={handleWatchAd}
              disabled={adLoading}
              activeOpacity={0.8}
            >
              {adLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>🎬 Tonton Iklan (+{aiQuota?.rewardAmount ?? 5} Kuota)</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12, paddingVertical: 8 }}
              onPress={() => setShowQuotaModal(false)}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>Nanti Saja</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  aiName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  aiSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  chatArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },

  suggestionsSection: {
    marginBottom: 16,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  suggestionsScroll: {
    flexDirection: 'row',
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },

  messagesContainer: {
    gap: 16,
  },

  messageRow: {
    flexDirection: 'row',
    gap: 10,
    maxWidth: '88%',
  },
  messageRowReverse: {
    flexDirection: 'row-reverse',
    gap: 10,
    maxWidth: '88%',
    alignSelf: 'flex-end',
  },

  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  userBubble: {
    padding: 14,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  userBubbleText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },

  aiBubble: {
    padding: 14,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    flex: 1,
  },
  aiBubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },

  insightCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  insightDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  progressSection: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },

  quickReplySection: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  quickReplyContent: {
    gap: 8,
    paddingRight: 16,
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickReplyIcon: {
    fontSize: 14,
  },
  quickReplyText: {
    fontSize: 12,
    fontWeight: '600',
  },

  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingRight: 4,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  cameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
