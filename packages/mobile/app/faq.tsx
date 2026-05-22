import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

const faqs = [
  {
    question: 'Apa itu aplikasi Karsafin?',
    answer: 'Karsafin adalah aplikasi pencatat keuangan pintar yang membantu Anda melacak pendapatan, pengeluaran, dan merencanakan anggaran dengan mudah, dilengkapi asisten AI untuk menganalisa kondisi keuangan Anda.',
  },
  {
    question: 'Bagaimana cara mencatat transaksi via WhatsApp?',
    answer: 'Anda bisa menautkan nomor WhatsApp Anda di menu "Integrasi". Setelah terhubung, Anda cukup mengirim pesan pengeluaran (misal: "makan siang 50rb") ke nomor WhatsApp Karsafin, dan transaksi akan tercatat otomatis.',
  },
  {
    question: 'Apakah data keuangan saya aman?',
    answer: 'Tentu. Karsafin menggunakan enkripsi tingkat bank untuk melindungi data Anda. Data transaksi Anda tidak akan pernah dijual atau dibagikan ke pihak ketiga mana pun tanpa persetujuan Anda.',
  },
  {
    question: 'Bagaimana cara mengatur tanggal awal bulan keuangan saya?',
    answer: 'Anda bisa masuk ke menu Pengaturan > "Atur Tanggal Pemasukan" untuk menyetel tanggal siklus bulan keuangan Anda, misalnya setiap tanggal 25.',
  },
  {
    question: 'Apakah aplikasi Karsafin berbayar?',
    answer: 'Karsafin menyediakan fitur dasar secara gratis. Namun, untuk fitur premium seperti analisis AI tanpa batas dan integrasi tanpa batas, Anda dapat berlangganan Karsafin Premium melalui menu Langganan.',
  },
  {
    question: 'Bagaimana jika saya lupa kata sandi atau akun bermasalah?',
    answer: 'Silakan hubungi tim kami melalui menu "Kontak Kami" atau kirim email langsung ke admin@karsafin.biz.id. Tim kami siap membantu Anda 24/7.',
  },
];

const FAQItem = ({ item, colors }: { item: any, colors: any }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={[styles.faqItemContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity 
        style={styles.faqQuestionArea} 
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Text style={[styles.faqQuestionText, { color: colors.text }]}>{item.question}</Text>
        <FontAwesome 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={14} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={[styles.faqAnswerArea, { borderTopColor: colors.border }]}>
          <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
            {item.answer}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function FAQScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tanya Jawab (FAQ)</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
        <Text style={[styles.mainDescription, { color: colors.text }]}>
          Punya pertanyaan seputar Karsafin? Temukan jawabannya di sini!
        </Text>

        <View style={styles.faqList}>
          {faqs.map((item, index) => (
            <FAQItem key={index} item={item} colors={colors} />
          ))}
        </View>

        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Tidak menemukan jawaban yang Anda cari? Silakan hubungi kami via menu Kontak Kami.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  mainDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 24,
  },
  faqList: {
    gap: 16,
  },
  faqItemContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqQuestionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 16,
    lineHeight: 22,
  },
  faqAnswerArea: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.01)', // very subtle tint
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 20,
  },
});
