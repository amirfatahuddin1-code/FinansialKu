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

export default function SyaratKetentuanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const terms = [
    {
      title: '1. Pendahuluan',
      content: 'Syarat dan ketentuan ini yang mengatur ketentuan penggunaan Anda (“Syarat dan Ketentuan”) sebelum Anda mengakses dan menggunakan Aplikasi Karsafin (“Aplikasi”). Syarat dan Ketentuan ini untuk Aplikasi yang dimiliki dan dioperasikan oleh Karsafin, disebut sebagai "Perusahaan", "Kami", "Milik Kami", atau "Kita").\n\nDengan menggunakan atau mengakses Aplikasi atau layanan lain apa pun yang disediakan oleh Kami, Anda dengan ini setuju untuk terikat oleh Ketentuan Penggunaan ini. Ketentuan Penggunaan ini memberi tahu Anda semua yang perlu Anda ketahui tentang Aplikasi dan Kami yang terdapat dalam Aplikasi.',
    },
    {
      title: '2. Pendaftaran Akun Anda',
      content: 'Aplikasi hanya dapat Anda gunakan setelah Anda melakukan pendaftaran untuk akun Anda dan dinyatakan selesai. Anda mengakui bahwa Aplikasi tidak akan tersedia untuk Anda tanpa pendaftaran. Anda dapat menambahkan informasi tentang diri Anda ke akun tersebut sesuai dengan informasi minimal yang dipersyaratkan oleh Kami dalam Aplikasi.\n\nAnda harus berkomitmen terhadap batasan usia untuk melakukan pendaftaran akun, yaitu Anda harus berusia minimal 18 tahun, dan menjamin kebenaran mengenai informasi yang Anda berikan tersebut.\n\nJika Anda berusia di bawah 18 tahun, Anda harus dan Kami anggap telah mendapatkan izin dari salah satu orang tua atau wali sah untuk melakukan pendaftaran akun. Kami imbau agar Anda tidak membuat akun sampai Anda telah meminta persetujuan orang tua atau wali sah Anda.\n\nJika Anda adalah orang tua atau wali sah anak di bawah umur yang hendak membuat akun, Anda harus menyetujui Syarat dan Ketentuan ini atas nama anak di bawah umur tersebut, dan Anda bertanggung jawab atas seluruh penggunaan akun atau layanan Aplikasi.',
    },
    {
      title: '3. Penggunaan Aplikasi',
      content: 'Anda harus menggunakan Aplikasi hanya sesuai dengan Syarat dan Ketentuan ini, untuk tujuan yang dimaksudkan dan mematuhi semua peraturam dan hukum yang berlaku dan ketentuan penggunaan pihak ketiga.',
    },
    {
      title: '4. Lisensi Aplikasi',
      content: 'Layanan Aplikasi yang diberikan oleh Kami kepada Anda diatur pada kepatuhan Anda sebagai penerima lisensi (“Penerima Lisensi”) dengan tanggung jawabnya yang ditetapkan sebagai berikut:\n\n• Anda bertanggung jawab penuh untuk menjaga kerahasiaan dan keamanan akses informasi yang Anda gunakan untuk mengakses layanan (sebagaimana dijelaskan lebih lanjut dan didefinisikan dalam Ketentuan Umum Layanan), termasuk namun tidak terbatas pada nomor akses, kata sandi, pertanyaan dan jawaban keamanan, nomor akun, dan/atau informasi login (secara kolektif disebut "Akses Informasi Penerima Lisensi").\n\n• Anda bertanggung jawab penuh untuk memastikan bahwa penggunaan layanan Aplikasi oleh Anda tidak melanggar Syarat dan Ketentuan, kebijakan, pedoman, peraturan, atau batasan apa pun yang berlaku dari penyedia layanan keuangan Anda. Anda dengan ini mengakui dan setuju bahwa Anda bertanggung jawab penuh untuk memverifikasi kepatuhan layanan Aplikasi dengan syarat dan ketentuan, kebijakan, pedoman, peraturan, atau batasan penyedia layanan keuangan Anda dan Kami secara tegas melepaskan tanggung jawab apa pun yang berasal dari kegagalan Anda untuk melakukannya.\n\n• Anda bertanggung jawab penuh atas semua komunikasi elektronik, termasuk pendaftaran akun dan informasi pemegang akun lainnya, email, data keuangan, dan data lain yang dimasukkan menggunakan Akses Informasi Penerima Lisensi. Perusahaan berasumsi bahwa komunikasi apa pun yang diterima melalui penggunaan Akses Informasi Penerima Lisensi dikirim atau disahkan oleh Anda dan bahwa komunikasi apa pun yang Anda kirim sesuai dengan undang-undang yang berlaku.\n\n• Anda dengan ini menyetujui untuk segera memberitahu Kami jika Anda mengetahui adanya kehilangan, pencurian, atau penggunaan tanpa izin atas Akses Informasi Penerima Lisensi. Kami berhak untuk menolak akses ke layanan (atau bagian apapun darinya) jika Kami secara wajar yakin bahwa kehilangan, pencurian, atau penggunaan yang tidak sah atas Akses Informasi Penerima Lisensi telah terjadi untuk memungkinkan Kami untuk menyelidiki kehilangan, pencurian, atau penggunaan yang tidak sah dari Akses Informasi Penerima Lisensi mana pun.\n\n• Anda dengan ini mengakui dan menyetujui bahwa Kami dan pihak ketiga terkait memiliki izin untuk menggabungkan data di akun Anda dari Penyedia Layanan Keuangan Anda seperti biaya bank dan kartu kredit, debit dan deposit ("Data Akun") dengan data dari orang lain dengan cara yang tidak mengidentifikasi Anda atau individu mana pun, dan untuk menggunakan Data Akun agregat tersebut untuk melakukan penelitian analitis tertentu, pelacakan kinerja dan perbandingan, dan mempublikasikan hasil ringkasan atau agregat dari waktu ke waktu, dan mendistribusikan atau melisensikan anonim, data penelitian teragregasi untuk tujuan apa pun, termasuk namun tidak terbatas pada membantu meningkatkan produk dan layanan, membantu pemecahan masalah, dan dukungan teknis.',
    },
    {
      title: '5. Pihak Ketiga dan Aplikasi Kami',
      content: 'Kami mungkin memiliki materi di Aplikasi yang disediakan oleh pihak ketiga. Sehubungan dengan penggunaan Anda atas Aplikasi, atau layanan lain apa pun yang disediakan sehubungan dengannya, Anda dimungkinkan untuk diberitahu tentang layanan yang ditawarkan oleh pihak ketiga termasuk perbankan online, pembayaran online, investasi online, pengunduhan akun, pembayaran tagihan online, perdagangan online, dan informasi akun lainnya yang tersedia dari Penyedia Layanan Keuangan pihak ketiga Anda ("Penyedia") (layanan tersebut disebut secara kolektif di sini sebagai "Layanan Pihak Ketiga").\n\nJika Anda memutuskan untuk menggunakan Layanan Pihak Ketiga, termasuk namun tidak terbatas untuk mengatur perbankan, menjadwalkan layanan untuk mengakses akun Anda, dan/atau mengunduh transaksi, Anda bertanggung jawab sepenuhnya untuk meninjau dan memahami syarat dan ketentuan yang mengatur Layanan Pihak Ketiga tersebut. Dalam keadaan apa pun kami tidak akan bertanggung jawab atas pengiriman Layanan Pihak Ketiga, informasi yang terkandung di situs web pihak ketiga tersebut atau atas penggunaan atau ketidakmampuan Anda untuk menggunakan Layanan Pihak Ketiga atau mengakses akun Anda, memperoleh data, atau mengunduh transaksi. Akses ke situs web pihak ketiga mana pun adalah risiko Anda sendiri, dan Anda mengakui dan memahami bahwa situs web pihak ketiga yang ditautkan mungkin berisi persyaratan dan kebijakan privasi yang berbeda dari milik kami dan di mana kami tidak memiliki masukan atau kendali. Anda dengan ini memahami bahwa Kami secara tegas tidak dapat menerima dan melepaskan tanggung jawab atau menjamin atas keakuratannya dan kinerja Layanan Pihak Ketiga tersebut.',
    },
    {
      title: '6. Perubahan dan Penangguhan Aplikasi',
      content: 'Kami memiliki diskresi untuk mengubah atau menghentikan, untuk sementara atau selamanya, layanan Aplikasi termasuk karena alasan teknis, masalah keamanan, dan persyaratan hukum dengan memberikan pemberitahuan terlebih dahulu yang wajar kepada Anda. Namun, apabila dalam keadaan tertentu, Kami mungkin tidak dapat memberitahu Anda terlebih dahulu. Kami tidak akan bertanggung jawab atas perubahan, penangguhan, atau penghentian layanan.\n\nModifikasi dapat mencakup penetapan atau perubahan batasan terkait penggunaan layanan, sementara atau permanen, termasuk (i) jumlah ruang penyimpanan yang Anda miliki di layanan setiap saat dan (ii) berapa kali (durasi maksimum) Anda dapat mengakses layanan dalam jangka waktu tertentu. Kami akan berusaha untuk mengirimkan pemberitahuan tentang setiap perubahan pada Persyaratan Lisensi Pengguna Akhir ini untuk jangka waktu tiga puluh (30) hari sebelum modifikasi tersebut. Oleh karena itu, Kami menyarankan Anda untuk meninjau Syarat dan Ketentuan ini dari waktu ke waktu. Penggunaan Anda yang berkelanjutan atas Aplikasi dan layanan yang tersedia setelah pemberitahuan Perusahaan tentang modifikasi Syarat dan Ketentuan ini merupakan persetujuan Anda terhadap Syarat dan Ketentuan yang telah dilakukan perubahan atau modifikasi. Kami dapat melakukan maintenance layanan pada Aplikasi dari waktu ke waktu yang dapat mengakibatkan gangguan, penundaan, atau kesalahan dalam layanan.',
    },
    {
      title: '7. Disclaimer',
      content: 'Aplikasi, konten, layanan, dan tautannya disediakan atas dasar "Apa adanya" dan digunakan dengan risiko Anda sendiri. Anda bertanggung jawab penuh atas segala kerusakan pada sistem komputer, aplikasi, atau perangkat lain Anda atau kehilangan data yang diakibatkan oleh penggunaan layanan, Layanan Pihak Ketiga, atau data yang diberikan melalui layanan atau Layanan Pihak Ketiga sejauh yang diizinkan oleh hukum. Kami menyangkal semua jaminan, tersurat, tersirat, atau menurut undang-undang dalam bentuk apapun mengenai Aplikasi ini (termasuk konten, layanan, perangkat lunak, perangkat keras, dan tautan pihak ketiga) termasuk jaminan tersirat apapun tentang kesesuaian untuk tujuan tertentu, dapat diperjualbelikan, judul, non-pelanggaran, hasil, akurasi, kelengkapan, aksesibilitas, kompatibilitas, legalitas, keamanan, bebas kesalahan dan bebas dari gangguan. Jika hukum dan peraturan yang berlaku tidak mengizinkan pengecualian dari beberapa atau semua jaminan tersirat di atas berlaku untuk Anda, pengecualian di atas akan berlaku untuk Anda sejauh diizinkan oleh hukum yang berlaku.',
    },
    {
      title: '8. Batasan Tanggung Jawab Kami',
      content: 'Penggunaan Anda atas Aplikasi merupakan tanggung jawab dan risiko yang akan ditanggung oleh Anda sendiri. Anda secara tegas memahami dan menyetujui bahwa Kami atau direktur, karyawan, mitra, agen, atau afiliasinya tidak bertanggung jawab atas segala kerusakan dan kerugian secara langsung maupun tidak langsung, insidental, khusus, konsekuensial, atau hukuman, termasuk tanpa batasan, kehilangan keuntungan, data, penggunaan, niat baik (goodwill), atau kerugian tidak berwujud maupun berwujud lainnya, yang diakibatkan oleh Syarat dan Ketentuan ini, penggunaan Aplikasi, atau tindakan Kami sehubungan dengan layanan. Terlebih lagi, kami tidak bertanggung jawab atas segala kerusakan dan kerugian Anda yang disebabkan oleh (a) penggunaan Aplikasi yang tidak tepat; (b) segala konten dan Layanan Pihak Ketiga mana pun pada Aplikasi; dan/atau (c) akses tidak sah ke atau perubahan transmisi atau data Anda.',
    },
    {
      title: '9. Keluhan & Hubungi Kami',
      content: 'Jika terdapat keluhan dari Anda, Anda dapat memberi tahu dan menghubungi Kami melalui E-mail admin@karsafin.biz.id atau melalui WhatsApp +62 813-9359-1050 atau Instagram @karsafin.id.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Syarat & Ketentuan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Pembaruan Terakhir: 21 Mei 2026
        </Text>
        <Text style={[styles.mainDescription, { color: colors.text }]}>
          Harap baca Syarat dan Ketentuan Layanan ini secara seksama sebelum mulai menggunakan Karsafin.
        </Text>

        <View style={styles.termsList}>
          {terms.map((item, index) => (
            <View key={index} style={[styles.termItem, { borderBottomColor: colors.border }]}>
              <Text style={[styles.termTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.termContent, { color: colors.textSecondary }]}>{item.content}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Terima kasih telah mempercayai Karsafin.
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
  termsList: {
    gap: 20,
  },
  termItem: {
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  termTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  termContent: {
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
