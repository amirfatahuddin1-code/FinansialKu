import React, { useState, useRef, useEffect, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { Platform, StyleSheet, View, TouchableOpacity, Text, Modal, Pressable, TextInput, ScrollView, Animated, Keyboard, ActivityIndicator, Image, Alert } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { getLocalToday, formatCurrency } from '@karsafin/shared';
import type { Category, FinancialAccount } from '@karsafin/shared';
import * as ImagePicker from 'expo-image-picker';

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

function CustomTabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user, api } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  interface AiMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    imageUri?: string;
    savedTransactions?: Array<{
      id: string;
      type: 'income' | 'expense';
      amount: number;
      description: string;
      date: string;
      categoryName: string;
      accountName: string;
    }>;
  }

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiCategories, setAiCategories] = useState<Category[]>([]);
  const [aiAccounts, setAiAccounts] = useState<FinancialAccount[]>([]);
  const aiScrollRef = useRef<ScrollView>(null);
  const [aiKeyboardHeight, setAiKeyboardHeight] = useState(0);
  const [receiptScanning, setReceiptScanning] = useState(false);

  useEffect(() => {
    setTimeout(() => aiScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [aiMessages, aiTyping]);

  // Track keyboard height for AI modal
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setAiKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setAiKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const loadAiData = useCallback(async () => {
    if (!user) return;
    const [catRes, accRes] = await Promise.all([
      api.categories.getAll(),
      api.accounts.getAll(),
    ]);
    if (catRes.data) setAiCategories(catRes.data);
    if (accRes.data) setAiAccounts(accRes.data);
  }, [user]);

  useEffect(() => {
    if (showAiModal) {
      loadAiData();
      setAiMessages([
        {
          id: '1',
          role: 'assistant',
          content:
            'Halo! Saya asisten catat transaksi cepat. Ketik transaksi Anda seperti:\n\n• "Hari ini beli sepatu Rp250rb cash"\n• "Kemarin terima gaji 3jt lewat BRI"\n• "Beli beras 75rb dan minyak goreng 30rb"',
        },
      ]);
    }
  }, [showAiModal]);

  function matchCategory(text: string, txType: 'income' | 'expense'): Category | null {
    const lower = text.toLowerCase();
    const cats = aiCategories.filter((c) => c.type === txType);
    for (const cat of cats) {
      if (lower.includes(cat.name.toLowerCase())) return cat;
    }
    const keywords: Record<string, string[]> = {
      Makanan: ['makan', 'sepatu', 'baju', 'jajan', 'beras', 'minyak', 'goreng', 'nasi', 'ayam', 'soto', 'bakso', 'mi', 'mie', 'kopi', 'roti', 'kue', 'camilan', 'snack', 'susu', 'telur', 'ikan', 'daging', 'sayur', 'buah', 'sate', 'gado', 'sop', 'lontong', 'ketoprak'],
      Transport: ['bensin', 'bbm', 'transport', 'bahan bakar', 'bengkel', 'ojol', 'grab'],
      Belanja: ['belanja', 'baju', 'celana', 'tas', 'sepatu'],
      Tagihan: ['listrik', 'air', 'pdam', 'pln', 'pulsa', 'tagihan', 'internet', 'wifi'],
      Hiburan: ['nonton', 'film', 'game', 'hiburan', 'netflix', 'spotify'],
      Kesehatan: ['obat', 'klinik', 'rumah sakit', 'dokter'],
      Gaji: ['gaji', 'bulanan', 'honor'],
      Freelance: ['proyek', 'freelance', 'kerja lepas', 'jual'],
    };
    for (const cat of cats) {
      const kws = keywords[cat.name];
      if (kws?.some((kw) => lower.includes(kw))) return cat;
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

  function parseTransaction(text: string): {
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

    // strip remaining connector words from description
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
      const parsed = parseTransaction(part);
      if (parsed) results.push(parsed);
    }
    return results;
  }

  const handleAiTransactionTap = (tx: NonNullable<AiMessage['savedTransactions']>[number]) => {
    if (!tx) return;
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

  const handleAiSend = async () => {
    const text = aiInput.trim();
    if (!text) return;

    // Check quota
    if (!user || !api) return;
    const { data: quotaData } = await api.profiles.getAiQuota(user.id);
    if (!quotaData || quotaData.quota <= 0) {
      setShowQuotaModal(true);
      return;
    }

    setAiInput('');
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: text };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiTyping(true);

    try {
      const parsed = parseTransactions(text);
      if (parsed.length === 0) {
        setAiTyping(false);
        setAiMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Maaf, saya tidak bisa mengenali format transaksi Anda. Silakan coba lagi dengan format seperti:\n• "Hari ini beli sepatu Rp250rb cash"\n• "Kemarin terima gaji 3jt lewat BRI"',
        }]);
        return;
      }

      const savedTxs: Array<{ id: string; type: 'income' | 'expense'; amount: number; description: string; date: string; categoryName: string; accountName: string }> = [];
      let savedCount = 0;
      let details = '';
      for (const tx of parsed) {
        if (!user) continue;
        const matchedCat = aiCategories.find((c) => c.name === tx.categoryName && c.type === tx.type);
        if (!matchedCat) continue;
        const matchedAcc = tx.accountName
          ? aiAccounts.find((a) => a.name.toUpperCase() === tx.accountName)
          : undefined;
        const { data: txData, error } = await api.transactions.create(user.id, {
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
        }
      }

      setAiTyping(false);
      if (savedCount > 0) {
        // Decrement quota for successful save
        await api.profiles.decrementAiQuota(user.id);
        setAiMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ ${savedCount} transaksi berhasil dicatat:${details}\n\nKetik lagi jika ingin menambahkan transaksi lainnya.`,
          savedTransactions: savedTxs,
        }]);
      } else {
        setAiMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Maaf, terjadi kesalahan saat menyimpan. Silakan coba lagi.',
        }]);
      }
    } catch {
      setAiTyping(false);
      setAiMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
      }]);
    }
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
    const { data: quotaData } = await api.profiles.getAiQuota(user.id);
    if (!quotaData || quotaData.quota <= 0) {
      setShowQuotaModal(true);
      return;
    }

    // Show user message with image thumbnail
    const userMsg: AiMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: '📷 Scan struk',
      imageUri: imageData.uri,
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setReceiptScanning(true);
    setAiTyping(true);

    try {
      // Call scan-receipt edge function
      const { data: scanResult, error: scanError } = await api.supabase.functions.invoke('scan-receipt', {
        body: { image: imageData.base64, mimeType: imageData.mimeType },
      });

      if (scanError || !scanResult?.transactions || scanResult.transactions.length === 0) {
        setAiTyping(false);
        setReceiptScanning(false);
        setAiMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ Maaf, tidak bisa membaca struk ini. Pastikan foto struk jelas dan coba lagi.',
        }]);
        return;
      }

      // Decrement quota
      await api.profiles.decrementAiQuota(user.id);

      // Save transactions
      const savedTxs: Array<{ id: string; type: 'income' | 'expense'; amount: number; description: string; date: string; categoryName: string; accountName: string }> = [];
      let details = '';
      const today = getLocalToday();

      for (const item of scanResult.transactions) {
        const txType = item.type === 'income' ? 'income' : 'expense';
        const matchedCat = aiCategories.find(
          (c) => c.name.toLowerCase() === (item.category || '').toLowerCase() && c.type === txType
        ) || aiCategories.find((c) => c.name === 'Lainnya' && c.type === txType);
        if (!matchedCat) continue;

        const matchedAcc = item.account
          ? aiAccounts.find((a) => a.name.toUpperCase().includes(item.account.toUpperCase()))
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
          details += `\n${icon} ${item.description || 'Item'} — Rp ${formatCurrency(item.amount)} (${matchedCat.name}${accountStr} | ${formattedDate})`;
        }
      }

      setAiTyping(false);
      setReceiptScanning(false);

      if (savedTxs.length > 0) {
        const storeName = scanResult.store ? `\n🏪 Toko: ${scanResult.store}` : '';
        setAiMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ ${savedTxs.length} transaksi berhasil dicatat dari struk:${storeName}${details}\n\nKetuk item untuk edit.`,
          savedTransactions: savedTxs,
        }]);
      } else {
        setAiMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ Struk berhasil dibaca tapi tidak ada transaksi yang bisa disimpan. Periksa kategori Anda.',
        }]);
      }
    } catch (err) {
      setAiTyping(false);
      setReceiptScanning(false);
      setAiMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Terjadi kesalahan saat memproses struk. Silakan coba lagi.',
      }]);
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

  const currentRoute = state.routes[state.index];
  const isAiRoute = currentRoute?.name === 'ai';

  if (isAiRoute) return null;

  return (
    <>
      <View style={[styles.tabBarContainer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom, height: 70 + insets.bottom }]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          
          if (route.name === 'add') {
            return (
              <View key={route.key} style={styles.tabItem}>
                <TouchableOpacity 
                  style={styles.fabContainer} 
                  activeOpacity={0.8}
                  onPress={() => setShowAddModal(true)}
                >
                  <View style={[styles.fabGradient, { backgroundColor: colors.tint }]}>
                    <Text style={styles.fabIcon}>+</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }

          if (route.name === 'transactions') return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          let iconName: any = 'home';
          let label = 'Dashboard';
          if (route.name === 'index') { iconName = 'home'; label = 'Dashboard'; }
          if (route.name === 'analysis') { iconName = 'bar-chart'; label = 'Analisis'; }
          if (route.name === 'planning') { iconName = 'calendar'; label = 'Rencana'; }
          if (route.name === 'ai') { iconName = 'magic'; label = 'AI Asisten'; }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
            >
              <View style={styles.iconContainer}>
                <FontAwesome name={iconName} size={22} color={isFocused ? colors.tint : colors.tabIconDefault} />
              </View>
              <Text style={[styles.tabLabel, { color: isFocused ? colors.tint : colors.tabIconDefault }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add Modal Popup */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -5 }, elevation: 15 }]}>
            <View style={styles.modalDragIndicator} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tambah Baru</Text>
            </View>
            
            <View style={{ width: '100%', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.modalListItem, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}
                onPress={() => { setShowAddModal(false); navigation.navigate('add-transaction' as never); }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalIconCircle, { backgroundColor: '#0284c7' }]}>
                  <Text style={{ fontSize: 20 }}>📝</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0369a1', marginBottom: 2 }}>Transaksi</Text>
                  <Text style={{ fontSize: 12, color: '#0ea5e9' }}>Tambah catatan pemasukan & pengeluaran</Text>
                </View>
                <Text style={{ fontSize: 22, color: '#38bdf8', fontWeight: '300' }}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalListItem, { backgroundColor: '#f3e8ff', borderColor: '#e9d5ff' }]}
                onPress={async () => {
                  setShowAddModal(false);
                  if (!user || !api) {
                    setShowAiModal(true);
                    return;
                  }
                  try {
                    const { data } = await api.profiles.getAiQuota(user.id);
                    if (!data || data.quota <= 0) {
                      setShowQuotaModal(true);
                      return;
                    }
                  } catch {
                    // If quota check fails, allow modal anyway
                  }
                  setShowAiModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalIconCircle, { backgroundColor: '#7c3aed' }]}>
                  <Text style={{ fontSize: 20 }}>🤖</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#6d28d9', marginBottom: 2 }}>Catat dengan AI</Text>
                  <Text style={{ fontSize: 12, color: '#8b5cf6' }}>Catat transaksi cepat pakai teks</Text>
                </View>
                <Text style={{ fontSize: 22, color: '#a78bfa', fontWeight: '300' }}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalListItem, { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }]}
                onPress={async () => {
                  setShowAddModal(false);
                  if (!user || !api) {
                    setShowAiModal(true);
                    return;
                  }
                  try {
                    const { data } = await api.profiles.getAiQuota(user.id);
                    if (!data || data.quota <= 0) {
                      setShowQuotaModal(true);
                      return;
                    }
                  } catch {}
                  showImagePickerOptions(async (data) => {
                    await loadAiData();
                    setShowAiModal(true);
                    setAiMessages([{
                      id: '1',
                      role: 'assistant',
                      content: 'Halo! Saya asisten catat transaksi cepat. Ketik transaksi Anda seperti:\n\n• "Hari ini beli sepatu Rp250rb cash"\n• "Kemarin terima gaji 3jt lewat BRI"\n• "Beli beras 75rb dan minyak goreng 30rb"',
                    }]);
                    setTimeout(() => handleReceiptScan(data), 300);
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalIconCircle, { backgroundColor: '#059669' }]}>
                  <Text style={{ fontSize: 20 }}>📷</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#047857', marginBottom: 2 }}>Scan Struk</Text>
                  <Text style={{ fontSize: 12, color: '#10b981' }}>Foto struk & catat otomatis dengan AI</Text>
                </View>
                <Text style={{ fontSize: 22, color: '#34d399', fontWeight: '300' }}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalListItem, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}
                onPress={() => { setShowAddModal(false); navigation.navigate('add-debt' as never); }}
                activeOpacity={0.7}
              >
                <View style={[styles.modalIconCircle, { backgroundColor: '#ea580c' }]}>
                  <Text style={{ fontSize: 20 }}>🤝</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#c2410c', marginBottom: 2 }}>Hutang Piutang</Text>
                  <Text style={{ fontSize: 12, color: '#f97316' }}>Catat pinjaman atau tagihan baru</Text>
                </View>
                <Text style={{ fontSize: 22, color: '#fb923c', fontWeight: '300' }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Quota Habis Modal */}
      <Modal visible={showQuotaModal} transparent animationType="fade" onRequestClose={() => setShowQuotaModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowQuotaModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Kuota AI Habis</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              Kamu sudah menghabiskan kuota AI hari ini. Silakan tunggu reset esok hari atau dapatkan kuota tambahan dengan menonton iklan.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowQuotaModal(false);
                  router.push('/kuota-ai');
                }}
                style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#7c3aed' }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>🎬 Lihat Iklan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowQuotaModal(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.tint }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* AI Chat Modal */}
      <Modal visible={showAiModal} transparent animationType="slide" onRequestClose={() => { setShowAiModal(false); setAiMessages([]); }}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: 24, backgroundColor: colors.tint }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity 
                style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => { setShowAiModal(false); setAiMessages([]); }}
                activeOpacity={0.7}
              >
                <FontAwesome name="arrow-left" size={18} color="#fff" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FontAwesome name="magic" size={22} color="#fff" />
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>Catat dengan AI</Text>
                </View>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Asisten catat transaksi cepat</Text>
              </View>
              <View style={{ width: 36 }} />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <ScrollView
              ref={aiScrollRef}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 + aiKeyboardHeight, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {aiMessages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    { flexDirection: 'row', gap: 10, maxWidth: '88%', marginBottom: 16 },
                    msg.role === 'user' ? { flexDirection: 'row-reverse', alignSelf: 'flex-end' } : {},
                  ]}
                >
                  {msg.role === 'assistant' && (
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                      <FontAwesome name="magic" size={14} color="#fff" />
                    </View>
                  )}
                  <View
                    style={[
                      {
                        padding: 14,
                        borderRadius: 16,
                        borderWidth: 1,
                      },
                      msg.role === 'user'
                        ? { backgroundColor: '#1a56db', borderBottomRightRadius: 4, borderColor: 'transparent' }
                        : { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: 4, flex: 1 },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: msg.role === 'user' ? '#fff' : colors.text,
                      }}
                    >
                      {msg.content}
                    </Text>
                    {msg.role === 'user' && msg.imageUri && (
                      <Image
                        source={{ uri: msg.imageUri }}
                        style={{ width: 200, height: 150, borderRadius: 12, marginTop: 8 }}
                        resizeMode="cover"
                      />
                    )}
                    {msg.role === 'assistant' && msg.savedTransactions && msg.savedTransactions.length > 0 && (
                      <View style={{ marginTop: 12, gap: 8 }}>
                        {msg.savedTransactions.map((tx: any) => (
                          <TouchableOpacity
                            key={tx.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              padding: 12,
                              borderRadius: 12,
                              backgroundColor: colors.inputBg,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                            onPress={() => handleAiTransactionTap(tx)}
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
              ))}

              {aiTyping && (
                <View style={{ flexDirection: 'row', gap: 10, maxWidth: '88%', marginBottom: 16 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
                    <FontAwesome name="magic" size={14} color="#fff" />
                  </View>
                  <View style={{ padding: 14, borderRadius: 16, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: 4 }}>
                    <TypingDots />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{ paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12) + aiKeyboardHeight }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 28, borderWidth: 1, borderColor: colors.border, paddingRight: 4, paddingVertical: 4, paddingLeft: 8, backgroundColor: colors.inputBg }}>
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', opacity: receiptScanning ? 0.5 : 1 }}
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
                  style={{ flex: 1, fontSize: 15, paddingVertical: 8, paddingHorizontal: 8, color: colors.text }}
                  placeholder="Ketik transaksi..."
                  placeholderTextColor={colors.textMuted}
                  value={aiInput}
                  onChangeText={setAiInput}
                  returnKeyType="send"
                  onSubmitEditing={handleAiSend}
                />
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center', opacity: aiInput.trim() ? 1 : 0.5 }}
                  onPress={handleAiSend}
                  disabled={!aiInput.trim()}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="send" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 20 },
      }}
    >
      <Tabs.Screen name="index" options={{ headerShown: false }} />
      <Tabs.Screen name="analysis" options={{ title: 'Analisis', headerShown: false }} />
      <Tabs.Screen name="add" options={{ title: 'Tambah' }} />
      <Tabs.Screen name="planning" options={{ title: 'Rencana', headerShown: false }} />
      <Tabs.Screen name="ai" options={{ title: 'AI Asisten', headerShown: false }} />
      <Tabs.Screen name="transactions" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 44,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  fabContainer: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff', // outer white border
    padding: 6,
    shadowColor: '#0062ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 34,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  modalContent: {
    width: '100%',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(150,150,150,0.3)',
    borderRadius: 2,
    marginBottom: 20,
    marginTop: -8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
});
