import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { router } from 'expo-router';

export default function KontakKamiScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const handleWhatsApp = () => {
    const phoneNumber = '6281393591050'; // Official support number
    const message = 'Halo tim Karsafin, saya ingin menyampaikan kritik/saran mengenai aplikasi...';
    Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`)
      .catch(() => {
        // Fallback to web WhatsApp if app is not installed
        Linking.openURL(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
      });
  };

  const handleRateApp = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/id1234567890', // Replace with real app ID
      android: 'market://details?id=com.karsafin.app',
    }) || 'https://play.google.com/store/apps/details?id=com.karsafin.app';

    Linking.openURL(storeUrl).catch(() => {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.karsafin.app');
    });
  };

  const handleEmail = () => {
    Linking.openURL('mailto:admin@karsafin.biz.id?subject=Kritik/Saran%20Aplikasi%20Karsafin');
  };

  const handleFeedbackForm = () => {
    router.push('/masukan');
  };

  const handleSocialMedia = (platform: 'instagram' | 'facebook' | 'twitter') => {
    const urls = {
      instagram: 'https://instagram.com/karsafin.id',
      facebook: 'https://facebook.com/karsafin',
      twitter: 'https://x.com/Karsafin.id',
    };
    Linking.openURL(urls[platform]).catch((err) => console.error('Failed to open link:', err));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kontak Kami</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
        {/* Main white card matching Gambar 2 */}
        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Hubungi Kami</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Punya kritik, saran, ide fitur, atau apapun itu yang kamu mau sampein ke tim Karsafin? Ini caranya!
          </Text>

          <View style={styles.listContainer}>
            {/* WhatsApp */}
            <TouchableOpacity 
              style={[styles.listItem, { borderBottomColor: colors.border }]} 
              onPress={handleWhatsApp}
              activeOpacity={0.6}
            >
              <View style={styles.leftContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: '#dcfce7' }]}>
                  <FontAwesome name="whatsapp" size={20} color="#22c55e" />
                </View>
                <Text style={[styles.itemLabel, { color: colors.text }]}>WhatsApp</Text>
                <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.badgeText, { color: '#64748b' }]}>Rekomendasi</Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Rate Karsafin */}
            <TouchableOpacity 
              style={[styles.listItem, { borderBottomColor: colors.border }]} 
              onPress={handleRateApp}
              activeOpacity={0.6}
            >
              <View style={styles.leftContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: '#fef9c3' }]}>
                  <FontAwesome name="star" size={18} color="#eab308" />
                </View>
                <Text style={[styles.itemLabel, { color: colors.text }]}>Rate Karsafin</Text>
                <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.badgeText, { color: '#64748b' }]}>Rekomendasi</Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity 
              style={[styles.listItem, { borderBottomColor: colors.border }]} 
              onPress={handleEmail}
              activeOpacity={0.6}
            >
              <View style={styles.leftContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: '#fee2e2' }]}>
                  <FontAwesome name="envelope-o" size={16} color="#ef4444" />
                </View>
                <Text style={[styles.itemLabel, { color: colors.text }]}>Email</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Feedback */}
            <TouchableOpacity 
              style={[styles.listItem, { borderBottomColor: 'transparent' }]} 
              onPress={handleFeedbackForm}
              activeOpacity={0.6}
            >
              <View style={styles.leftContainer}>
                <View style={[styles.iconWrapper, { backgroundColor: '#e0e7ff' }]}>
                  <FontAwesome name="pencil-square-o" size={18} color="#4f46e5" />
                </View>
                <Text style={[styles.itemLabel, { color: colors.text }]}>Feedback</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Media Section */}
        <Text style={[styles.socialTitle, { color: colors.textSecondary }]}>Atau follow akun sosial media kami</Text>
        
        <View style={styles.socialRow}>
          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSocialMedia('instagram')}
            activeOpacity={0.7}
          >
            <FontAwesome name="instagram" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSocialMedia('facebook')}
            activeOpacity={0.7}
          >
            <FontAwesome name="facebook" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.socialButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSocialMedia('twitter')}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="x-twitter" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
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
  mainCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  listContainer: {
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  socialTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 32,
    marginBottom: 16,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
});
