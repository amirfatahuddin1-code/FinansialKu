import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { ADS } from '@/constants/Ads';

export default function KuotaAIScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user, api } = useAuth();
  const [aiQuota, setAiQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [isUnlimitedAi, setIsUnlimitedAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adLoading, setAdLoading] = useState(false);
  const rewardedAdRef = useRef<RewardedAd | null>(null);

  const loadQuota = useCallback(async () => {
    if (!user) return;
    try {
      const [quotaRes, subRes] = await Promise.all([
        api.profiles.getAiQuota(user.id, { refresh: true }),
        api.subscription.getSubscriptionHistory(user.id)
      ]);
      if (quotaRes.data) setAiQuota(quotaRes.data);
      const activeSub = subRes.data?.find((s: any) => s.status === 'active');
      const planName = activeSub?.subscription_plans?.name || '';
      setIsUnlimitedAi(planName.includes('Pro'));
    } catch (e) {
      console.warn('Load quota error:', e);
    }
    setLoading(false);
  }, [user, api]);

  useEffect(() => { loadQuota(); }, [loadQuota]);

  const loadRewardedAd = useCallback(() => {
    try {
      const ad = RewardedAd.createForAdRequest(
        __DEV__ ? TestIds.REWARDED : ADS.rewardedAdUnitId
      );
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setAdLoading(false);
        ad.show();
      });
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        if (!user || !aiQuota) return;
        const reward = aiQuota.rewardAmount;
        const { data } = await api.profiles.addAiQuota(user.id, reward);
        await loadQuota();
        if (data && data.applied) {
          Alert.alert('🎉 Selamat!', `Anda mendapat ${reward} kuota AI gratis!`);
        } else {
          Alert.alert('Mohon Maaf', 'Kamu sudah melampaui batas reward kuota transaksi AI untuk hari ini, silahkan ulangi besok lagi');
        }
      });
      ad.addAdEventListener(AdEventType.ERROR, () => {
        setAdLoading(false);
        Alert.alert('Gagal', 'Iklan gagal dimuat. Coba lagi nanti.');
      });
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        setAdLoading(false);
      });
      ad.load();
      rewardedAdRef.current = ad;
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const quota = aiQuota?.quota ?? 0;
  const maxQuota = aiQuota?.max ?? 20;
  const rewardAmount = aiQuota?.rewardAmount ?? 5;
  const pct = maxQuota > 0 ? (quota / maxQuota) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <FontAwesome name="chevron-left" size={18} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.titleText}>Kuota AI</Text>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🎯</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Sisa Kuota AI Hari Ini</Text>
          <Text style={[styles.quotaNumber, { color: quota <= 5 && !isUnlimitedAi ? '#ef4444' : colors.tint }]}>
            {isUnlimitedAi ? '∞' : quota}
            {!isUnlimitedAi && <Text style={[styles.quotaMax, { color: colors.textMuted }]}>/{maxQuota}</Text>}
          </Text>
          {!isUnlimitedAi && (
            <View style={{ width: '100%', height: 12, backgroundColor: colors.inputBg, borderRadius: 6, marginTop: 12, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: quota <= 5 ? '#ef4444' : colors.tint, borderRadius: 6 }} />
            </View>
          )}
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {isUnlimitedAi
              ? 'Selamat! Kamu memiliki kuota akses AI tanpa batas.'
              : quota > 0
              ? `Kamu masih punya ${quota} kesempatan bertanya pada Karsafin AI hari ini.`
              : 'Kuota AI kamu sudah habis. Tonton iklan untuk dapat kuota tambahan!'}
          </Text>
        </View>

        {!isUnlimitedAi && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🎬</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Tambah Kuota</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary, marginBottom: 16 }]}>
              Tonton video iklan singkat untuk mendapatkan {rewardAmount} kuota AI gratis tambahan.
            </Text>
            <TouchableOpacity
              style={[styles.watchBtn, { backgroundColor: colors.tint, opacity: adLoading ? 0.6 : 1 }]}
              onPress={handleWatchAd}
              disabled={adLoading}
              activeOpacity={0.8}
            >
              {adLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.watchBtnText}>🎬 Tonton Iklan (+{rewardAmount} Kuota)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>ℹ️</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Tentang Kuota AI</Text>
          <View style={{ gap: 16, marginTop: 8, width: '100%' }}>
            <InfoSection
              icon="🎯"
              title="Apa itu Kuota AI?"
              description={`Kuota AI adalah jumlah percakapan yang bisa kamu lakukan dengan asisten AI Karsafin setiap hari. Setiap kali kamu mengirim pesan atau menggunakan quick action, kuota akan berkurang 1.`}
            />
            <InfoSection
              icon="🔄"
              title="Kapan Kuota direset?"
              description={`Setiap hari pukul 00:00 waktu setempat, kuota kamu akan direset kembali menjadi 20 percakapan secara otomatis.`}
            />
            <InfoSection
              icon="🎬"
              title="Bagaimana cara menambah kuota?"
              description={`Jika kuota kamu habis, kamu bisa menonton video iklan singkat untuk mendapatkan +${rewardAmount} kuota tambahan. Cukup tekan tombol "Tonton Iklan" di halaman ini.`}
            />
            <InfoSection
              icon="📈"
              title="Berapa maksimal kuota per hari?"
              description={`Kamu bisa mendapatkan maksimal 50 kuota per hari melalui kombinasi kuota gratis (${maxQuota}) dan reward dari menonton iklan.`}
            />
            <InfoSection
              icon="💡"
              title="Fitur apa saja yang didukung AI?"
              description="Karsafin AI bisa membantu: mencatat transaksi otomatis, mengecek riwayat keuangan, analisis pengeluaran per kategori, simulasi target tabungan, mengatur budget bulanan, rekomendasi investasi, dan tips keuangan pribadi."
            />
            <InfoSection
              icon="⭐"
              title="Ada opsi tanpa batas?"
              description="Ya! Dengan berlangganan paket Premium (Settings → Langganan), kamu bisa menikmati fitur AI tanpa batasan kuota harian, plus fitur eksklusif lainnya."
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoSection({ icon, title, description }: { icon: string; title: string; description: string }) {
  const isDark = (useColorScheme() ?? 'dark') === 'dark';
  const bg = isDark ? '#1e293b' : '#f1f5f9';
  const titleColor = isDark ? '#f1f5f9' : '#1e293b';
  const descColor = isDark ? '#94a3b8' : '#64748b';
  return (
    <View style={{ width: '100%', backgroundColor: bg, borderRadius: 12, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Text style={{ fontSize: 20, marginTop: 2 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: titleColor, lineHeight: 20 }}>{title}</Text>
          <Text style={{ fontSize: 13, color: descColor, lineHeight: 20, marginTop: 4 }}>{description}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
  quotaNumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  quotaMax: {
    fontSize: 20,
    fontWeight: '600',
  },
  watchBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  watchBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
