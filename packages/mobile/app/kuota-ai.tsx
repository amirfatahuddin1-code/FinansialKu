import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { useColors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from '@/utils/mobile-ads-wrapper';
import { ADS } from '@/constants/Ads';

export default function KuotaAIScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  useColors();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user, api } = useAuth();
  
  const [aiQuota, setAiQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [telegramQuota, setTelegramQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [whatsappQuota, setWhatsappQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [messagingUsage, setMessagingUsage] = useState<{ wa_count: number; telegram_count: number } | null>(null);
  
  const [isUnlimitedAi, setIsUnlimitedAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adLoading, setAdLoading] = useState(false);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const rewardedAdRef = useRef<RewardedAd | null>(null);

  const loadQuota = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Load AI Quota
      try {
        const aiRes = await api.profiles.getAiQuota(user.id);
        if (aiRes.data) setAiQuota(aiRes.data);
      } catch (e) {
        console.warn('Error loading AI quota:', e);
      }

      // 2. Load Telegram Quota
      try {
        if (api.profiles.getTelegramQuota) {
          const tgRes = await api.profiles.getTelegramQuota(user.id);
          if (tgRes.data) setTelegramQuota(tgRes.data);
        } else {
          console.warn('api.profiles.getTelegramQuota is not defined');
        }
      } catch (e) {
        console.warn('Error loading Telegram quota:', e);
      }

      // 3. Load WhatsApp Quota
      try {
        if (api.profiles.getWhatsappQuota) {
          const waRes = await api.profiles.getWhatsappQuota(user.id);
          if (waRes.data) setWhatsappQuota(waRes.data);
        } else {
          console.warn('api.profiles.getWhatsappQuota is not defined');
        }
      } catch (e) {
        console.warn('Error loading WhatsApp quota:', e);
      }

      // 4. Load Messaging Usage
      try {
        const usageRes = await api.subscription.getMessagingUsage(user.id);
        if (usageRes.data) setMessagingUsage(usageRes.data);
      } catch (e) {
        console.warn('Error loading messaging usage:', e);
      }

      // 5. Load Subscription History
      try {
        const subRes = await api.subscription.getSubscriptionHistory(user.id);
        const activeSub = subRes.data?.find((s: any) => s.status === 'active');
        const planName = activeSub?.subscription_plans?.name || '';
        setIsUnlimitedAi(planName.includes('Pro') || planName.includes('Trial'));
      } catch (e) {
        console.warn('Error loading subscription history:', e);
      }
    } catch (e) {
      console.warn('General load quota error:', e);
    }
    setLoading(false);
  }, [user, api]);

  useEffect(() => { loadQuota(); }, [loadQuota]);

  const loadRewardedAd = useCallback(() => {
    try {
      const ad = RewardedAd.createForAdRequest(
        __DEV__ ? TestIds.REWARDED : ADS.rewardedAdUnitId
      );
      let earned = false;
      
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setAdLoading(false);
        ad.show();
      });
      
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      });
      
      ad.addAdEventListener(AdEventType.ERROR, () => {
        setAdLoading(false);
        Alert.alert('Gagal', 'Iklan gagal dimuat. Coba lagi nanti.');
      });
      
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        setAdLoading(false);
        if (earned) {
          setRewardModalVisible(true);
        }
      });
      
      ad.load();
      rewardedAdRef.current = ad;
    } catch {
      setAdLoading(false);
      Alert.alert('Gagal', 'Iklan tidak tersedia saat ini.');
    }
  }, [user, api, loadQuota]);

  const handleWatchAd = () => {
    const isAiMax = (aiQuota?.quota ?? 0) >= (aiQuota?.max ?? 50);
    const isTgMax = (telegramQuota?.quota ?? 20) >= (telegramQuota?.max ?? 50);
    const isWaMax = (whatsappQuota?.quota ?? 20) >= (whatsappQuota?.max ?? 50);

    if (isAiMax && isTgMax && isWaMax) {
      Alert.alert('Mohon Maaf', 'Semua kuota transaksi kamu sudah mencapai batas maksimal (50). Kamu tidak dapat menambah kuota lagi hari ini.');
      return;
    }
    setAdLoading(true);
    loadRewardedAd();
  };

  const handleClaimReward = async (type: 'ai' | 'telegram' | 'whatsapp') => {
    if (!user) return;
    try {
      setRewardModalVisible(false);
      setAdLoading(true);
      
      let res;
      let title = '';
      if (type === 'ai') {
        res = await api.profiles.addAiQuota(user.id, 5);
        title = 'AI Asisten';
      } else if (type === 'telegram') {
        if (!api.profiles.addTelegramQuota) {
          throw new Error('Metode addTelegramQuota tidak ditemukan di API (kemungkinan bundler cache). Harap restart/reload Expo Anda.');
        }
        res = await api.profiles.addTelegramQuota(user.id, 5);
        title = 'Transaksi Telegram';
      } else if (type === 'whatsapp') {
        if (!api.profiles.addWhatsappQuota) {
          throw new Error('Metode addWhatsappQuota tidak ditemukan di API (kemungkinan bundler cache). Harap restart/reload Expo Anda.');
        }
        res = await api.profiles.addWhatsappQuota(user.id, 5);
        title = 'Transaksi WhatsApp';
      }
      
      await loadQuota();
      
      if (res && res.data && res.data.applied && !res.error) {
        Alert.alert('🎉 Selamat!', `Kuota ${title} Anda berhasil ditambah +5!`);
      } else {
        const errorMsg = res?.error?.message || res?.error || 'Kuota mungkin sudah mencapai batas harian.';
        Alert.alert('Mohon Maaf', `Gagal menambahkan kuota ${title}. ${errorMsg}`);
      }
    } catch (e: any) {
      console.warn('Error claiming reward:', e);
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan sistem saat memproses reward.');
    } finally {
      setAdLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Quota AI calculations
  const quota = aiQuota?.quota ?? 0;
  const maxQuota = aiQuota?.max ?? 50;
  const pct = maxQuota > 0 ? (quota / maxQuota) * 100 : 0;

  // Telegram calculations
  const tgLimit = telegramQuota?.quota ?? 20;
  const tgUsage = messagingUsage?.telegram_count ?? 0;
  const tgRemaining = Math.max(0, tgLimit - tgUsage);
  const tgPct = tgLimit > 0 ? (tgRemaining / tgLimit) * 100 : 0;

  // WhatsApp calculations
  const waLimit = whatsappQuota?.quota ?? 20;
  const waUsage = messagingUsage?.wa_count ?? 0;
  const waRemaining = Math.max(0, waLimit - waUsage);
  const waPct = waLimit > 0 ? (waRemaining / waLimit) * 100 : 0;

  const rewardAmount = aiQuota?.rewardAmount ?? 5;

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
          <Text style={styles.titleText}>Kuota AI & Transaksi</Text>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Card Kuota AI Asisten */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 32 }}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quotaLabel, { color: colors.text }]}>AI Asisten</Text>
              <Text style={[styles.quotaDetail, { color: colors.textSecondary }]}>
                {isUnlimitedAi ? 'Percakapan AI tanpa batas' : 'Sisa kuota tanya jawab AI hari ini'}
              </Text>
            </View>
            <Text style={[styles.quotaValue, { color: quota <= 5 && !isUnlimitedAi ? '#ef4444' : colors.tint }]}>
              {isUnlimitedAi ? '∞' : quota}
              {!isUnlimitedAi && <Text style={{ fontSize: 14, color: colors.textMuted }}>/{maxQuota}</Text>}
            </Text>
          </View>
          {!isUnlimitedAi && (
            <View style={{ width: '100%', height: 8, backgroundColor: colors.inputBg, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: quota <= 5 ? '#ef4444' : colors.tint, borderRadius: 4 }} />
            </View>
          )}
        </View>

        {/* Card Kuota Telegram */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 32 }}>✈️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quotaLabel, { color: colors.text }]}>Transaksi Telegram</Text>
              <Text style={[styles.quotaDetail, { color: colors.textSecondary }]}>
                {isUnlimitedAi ? 'Transaksi Telegram tanpa batas' : `Sisa transaksi hari ini (Limit: ${tgLimit})`}
              </Text>
            </View>
            <Text style={[styles.quotaValue, { color: tgRemaining <= 5 && !isUnlimitedAi ? '#ef4444' : colors.tint }]}>
              {isUnlimitedAi ? '∞' : tgRemaining}
              {!isUnlimitedAi && <Text style={{ fontSize: 14, color: colors.textMuted }}>/{tgLimit}</Text>}
            </Text>
          </View>
          {!isUnlimitedAi && (
            <View style={{ width: '100%', height: 8, backgroundColor: colors.inputBg, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${tgPct}%`, height: '100%', backgroundColor: tgRemaining <= 5 ? '#ef4444' : colors.tint, borderRadius: 4 }} />
            </View>
          )}
        </View>

        {/* Card Kuota WhatsApp */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 32 }}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quotaLabel, { color: colors.text }]}>Transaksi WhatsApp</Text>
              <Text style={[styles.quotaDetail, { color: colors.textSecondary }]}>
                {isUnlimitedAi ? 'Transaksi WhatsApp tanpa batas' : `Sisa transaksi hari ini (Limit: ${waLimit})`}
              </Text>
            </View>
            <Text style={[styles.quotaValue, { color: waRemaining <= 5 && !isUnlimitedAi ? '#ef4444' : colors.tint }]}>
              {isUnlimitedAi ? '∞' : waRemaining}
              {!isUnlimitedAi && <Text style={{ fontSize: 14, color: colors.textMuted }}>/{waLimit}</Text>}
            </Text>
          </View>
          {!isUnlimitedAi && (
            <View style={{ width: '100%', height: 8, backgroundColor: colors.inputBg, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${waPct}%`, height: '100%', backgroundColor: waRemaining <= 5 ? '#ef4444' : colors.tint, borderRadius: 4 }} />
            </View>
          )}
        </View>

        {!isUnlimitedAi && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 24, alignItems: 'center' }]}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🎬</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Tambah Kuota</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary, marginBottom: 16 }]}>
              Tonton video iklan singkat untuk mendapatkan +{rewardAmount} kuota gratis tambahan. Kamu bebas memilih kuota mana yang ingin ditambah!
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

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 24 }]}>
          <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>ℹ️</Text>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: 'center' }]}>Tentang Kuota & Limit</Text>
          <View style={{ gap: 16, marginTop: 12, width: '100%' }}>
            <InfoSection
              icon="🎯"
              title="Apa itu Kuota Transaksi?"
              description="Kuota transaksi membatasi jumlah aktivitas yang dapat dicatat menggunakan AI Asisten, Telegram, atau WhatsApp setiap hari untuk meminimalkan beban server."
            />
            <InfoSection
              icon="🔄"
              title="Kapan Kuota direset?"
              description="Setiap hari pukul 00:00 waktu setempat, kuota kamu akan direset secara otomatis kembali ke batas dasar 20 transaksi."
            />
            <InfoSection
              icon="🎬"
              title="Bagaimana cara menambah kuota?"
              description={`Dengan menonton video iklan singkat, kamu akan mendapatkan +${rewardAmount} kuota tambahan secara instan yang dapat dialokasikan ke AI Asisten, Telegram, atau WhatsApp.`}
            />
            <InfoSection
              icon="📈"
              title="Berapa maksimal kuota per hari?"
              description="Maksimal kuota yang bisa dikumpulkan adalah 50 transaksi per hari untuk masing-masing jenis kuota."
            />
            <InfoSection
              icon="⭐"
              title="Ingin kuota tanpa batas?"
              description="Berlangganan paket Premium (Settings → Langganan) untuk menikmati akses AI Asisten, Telegram, dan WhatsApp tanpa batasan kuota harian."
            />
          </View>
        </View>
      </ScrollView>

      {/* Modal Pemilihan Kuota */}
      <Modal
        visible={rewardModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRewardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🎉</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Pilih Kuota Tambahan</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Selamat! Kamu berhasil mendapatkan +{rewardAmount} kuota gratis. Silakan pilih jenis kuota yang ingin ditambah:
            </Text>
            
            <View style={{ gap: 12, marginVertical: 20, width: '100%' }}>
              {/* Option AI Asisten */}
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  { borderColor: colors.border, backgroundColor: colors.inputBg },
                  quota >= maxQuota && styles.disabledOption
                ]}
                disabled={quota >= maxQuota}
                onPress={() => handleClaimReward('ai')}
              >
                <Text style={{ fontSize: 24 }}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>AI Asisten (+{rewardAmount})</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                    {quota >= maxQuota ? 'Sudah mencapai batas maksimal' : `Kuota saat ini: ${quota}/${maxQuota}`}
                  </Text>
                </View>
                {quota >= maxQuota && (
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold' }}>Maksimal</Text>
                )}
              </TouchableOpacity>

              {/* Option Telegram */}
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  { borderColor: colors.border, backgroundColor: colors.inputBg },
                  tgLimit >= 50 && styles.disabledOption
                ]}
                disabled={tgLimit >= 50}
                onPress={() => handleClaimReward('telegram')}
              >
                <Text style={{ fontSize: 24 }}>✈️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>Transaksi Telegram (+{rewardAmount})</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                    {tgLimit >= 50 ? 'Sudah mencapai batas maksimal' : `Limit harian saat ini: ${tgLimit}/50`}
                  </Text>
                </View>
                {tgLimit >= 50 && (
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold' }}>Maksimal</Text>
                )}
              </TouchableOpacity>

              {/* Option WhatsApp */}
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  { borderColor: colors.border, backgroundColor: colors.inputBg },
                  waLimit >= 50 && styles.disabledOption
                ]}
                disabled={waLimit >= 50}
                onPress={() => handleClaimReward('whatsapp')}
              >
                <Text style={{ fontSize: 24 }}>💬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>Transaksi WhatsApp (+{rewardAmount})</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                    {waLimit >= 50 ? 'Sudah mencapai batas maksimal' : `Limit harian saat ini: ${waLimit}/50`}
                  </Text>
                </View>
                {waLimit >= 50 && (
                  <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold' }}>Maksimal</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: colors.inputBg }]}
              onPress={() => setRewardModalVisible(false)}
            >
              <Text style={[styles.closeModalBtnText, { color: colors.text }]}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
  quotaLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  quotaDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  quotaValue: {
    fontSize: 24,
    fontWeight: '800',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    width: '100%',
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  closeModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
