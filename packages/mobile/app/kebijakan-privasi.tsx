import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

export default function KebijakanPrivasiScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const policies = [
    {
      title: '1. Pendahuluan',
      content: 'Karsafin ("Kami") menghormati privasi pengguna kami ("Pengguna" atau "Anda"). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, mengelola, menggunakan, mengungkapkan, dan melindungi informasi yang kami dapatkan dari Anda ketika Anda mengakses dan menggunakan layanan dalam aplikasi Karsafin (“Aplikasi Karsafin”), Kami mengharapkan Anda untuk membaca Kebijakan ini dengan cermat. Jika Anda tidak setuju dengan ketentuan Kebijakan Privasi ini, mohon untuk tidak mengakses dan menggunakan Aplikasi Karsafin.\n\nKami memiliki diskresi untuk melakukan perubahan pada Kebijakan Privasi ini yang dapat dilakukan sewaktu-waktu dan dengan alasan apa pun. Penggunaan Anda atas Aplikasi Karsafin merupakan bentuk persetujuan yang tegas dari Anda terhadap Kebijakan Privasi ini.',
    },
    {
      title: '2. Tentang Kami dan Layanan',
      content: 'Aplikasi Karsafin adalah sebuah aplikasi yang dirancang agar Anda dapat melacak dan menganalisa catatan finansial Anda secara otomatis maupun manual dengan memasukkan transaksi Anda ke dalam Aplikasi Karsafin. Anda juga dapat melakukan sinkronisasi otomatis dengan rekening bank dan/atau dengan dompet digital milik Anda. Berdasarkan catatan dan sinkronisasi tersebut, Aplikasi Karsafin menyediakan grafik, ikhtisar informasi, saran atas kondisi finansial Anda, serta tanggapan dan analisis otomatis yang dihasilkan melalui teknologi kecerdasan buatan yang dikenal sebagai Karsafin AI (selanjutnya secara bersama-sama disebut sebagai “Layanan”).',
    },
    {
      title: '3. Informasi yang Kami Kumpulkan',
      content: 'Kami dapat mengumpulkan informasi tentang Anda dengan berbagai cara:\n\n• Data Pribadi: Informasi yang dapat diidentifikasi secara pribadi, seperti nama, alamat email, nomor telepon, dan data keuangan pribadi yang Anda berikan secara sukarela.\n• Data Turunan: Informasi yang dikumpulkan otomatis ketika Anda mengakses Aplikasi, seperti alamat IP, jenis perangkat, dan waktu akses.\n• Data Perangkat Seluler: Informasi perangkat, koneksi, baterai, ID, model, dan lokasi. Kami dapat mengakses Kamera dan Audio untuk keperluan verifikasi.\n\nKetika Anda menggunakan Aplikasi Karsafin untuk menganalisa dan melacak keuangan Anda, data transaksi Anda akan disimpan dalam server Kami.\n\nSebagai bagian dari penyediaan Layanan, informasi finansial yang telah tercatat tersebut dapat digunakan untuk menghasilkan tanggapan, ringkasan, maupun analisis otomatis melalui fitur kecerdasan buatan dalam Aplikasi (Karsafin AI). Pemrosesan tersebut dilakukan semata-mata untuk memberikan tanggapan sesuai dengan permintaan Pengguna.',
    },
    {
      title: '4. Tempat Penyimpanan Informasi',
      content: 'Informasi yang kami kumpulkan dari Anda atau terkait Anda akan ditransfer, dan disimpan di dalam wilayah Republik Indonesia oleh kami dan/atau Pihak Ketiga yang bekerja berdasarkan instruksi dari kami.\n\nApabila kami memberikan Anda kata kunci atau password yang memungkinkan Anda untuk mengakses bagian-bagian tertentu dari Aplikasi Karsafin, Anda bertanggungjawab untuk menjaga kerahasiaan kata kunci tersebut.',
    },
    {
      title: '5. Penggunaan Informasi Anda',
      content: 'Kami akan menggunakan Data Pribadi yang kami peroleh untuk:\n• Membuat dan mengelola akun Anda.\n• Menyediakan Layanan kepada Anda.\n• Meningkatkan efisiensi dan pengoperasian Aplikasi Karsafin.\n• Memberitahu Anda tentang pembaruan.\n• Menjalankan fungsi bisnis dan/atau usaha Kami.\n• Mencegah transaksi penipuan dan memantau segala macam bentuk pencurian.\n• Membantu Anda pada saat berkomunikasi dengan layanan pelanggan Kami melalui Email, WhatsApp, atau Instagram.\n• Memvalidasi permintaan dan melakukan penyelidikan jika ada indikasi penipuan.',
    },
    {
      title: '6. Pembagian Informasi',
      content: 'Kami dapat membagikan informasi Anda dengan pihak ketiga yang melakukan layanan untuk kami (seperti layanan hosting, layanan pelanggan, analitik). \n\nDalam rangka penyediaan fitur analisis berbasis kecerdasan buatan dalam Aplikasi, Kami juga dapat membagikan data tertentu kepada penyedia teknologi kecerdasan buatan pihak ketiga (seperti OpenAI, Anthropic, Google). Data yang dibagikan terbatas pada riwayat transaksi, pendapatan, dan/atau anggaran yang telah dianonimkan serta pesan yang dikirimkan kepada Fitur AI.',
    },
    {
      title: '7. Hak Mengenai Data Pribadi Anda',
      content: 'Anda berhak untuk:\n• Mengakses Data Pribadi Anda dan memperoleh salinannya.\n• Memperbaiki Data Pribadi yang tidak akurat.\n• Meminta penghapusan Data Pribadi Anda tanpa penundaan yang tidak semestinya.\n• Menarik persetujuan yang telah Anda berikan terkait dengan pemrosesan Data.',
    },
    {
      title: '8. Keamanan, Penyimpanan, & Penghapusan',
      content: 'Kami melakukan perlindungan terhadap setiap Data Pribadi Pengguna yang disimpan dalam sistem kami melalui enkripsi, password, dan OTP (One Time Password). Meskipun kami telah mengambil langkah terbaik, pengiriman data melalui internet tidak dijamin sepenuhnya aman.\n\nKami akan menghapus atau mengubah Data Pribadi Anda jika tidak lagi diperlukan untuk tujuan pemrosesan data, atau jika Anda meminta penghapusan dan tidak memiliki kewajiban tertunda kepada kami.',
    },
    {
      title: '9. Informasi Anak & Penyandang Disabilitas',
      content: 'Layanan Kami tidak ditujukan untuk anak-anak di bawah usia 18 tahun. Kami secara khusus juga akan memproses Data Pribadi Pengguna penyandang disabilitas sesuai ketentuan Undang-Undang yang berlaku dengan cara yang disesuaikan.',
    },
    {
      title: '10. Kontak Kami',
      content: 'Jika Anda memiliki pertanyaan atau komentar mengenai kebijakan privasi ini, silakan hubungi kami melalui:\nEmail: admin@karsafin.biz.id\nWhatsApp: +62 813-9359-1050\nInstagram: @karsafin.id',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kebijakan Privasi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Pembaruan Terakhir: 21 Mei 2026
        </Text>
        <Text style={[styles.mainDescription, { color: colors.text }]}>
          Privasi Anda adalah prioritas utama kami. Kebijakan Privasi ini menjelaskan bagaimana Karsafin mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda.
        </Text>

        <View style={styles.policiesList}>
          {policies.map((item, index) => (
            <View key={index} style={[styles.policyItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.policyTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.policyContent, { color: colors.textSecondary }]}>{item.content}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Keamanan data Anda dilindungi menggunakan standar privasi ketat Karsafin.
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
  welcomeText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  mainDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 24,
  },
  policiesList: {
    gap: 20,
  },
  policyItem: {
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  policyContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 32,
  },
});
