import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  Clipboard,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import type { TelegramLink, TelegramGroupLink } from '@karsafin/shared';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

const BOT_USERNAME = '@FinanzaidBot';

export default function TelegramSettingsScreen() {
  const router = useRouter();
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [linkingGroup, setLinkingGroup] = useState(false);
  const [linkedAccount, setLinkedAccount] = useState<TelegramLink | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [linkedGroups, setLinkedGroups] = useState<TelegramGroupLink[]>([]);

  const checkLink = useCallback(async () => {
    if (!user) return null;
    const { data } = await api.telegram.getLinkedAccount(user.id);
    setLinkedAccount(data);
    return data;
  }, [user]);

  const checkLinkedGroups = useCallback(async () => {
    if (!user) return;
    const { data } = await api.telegramGroup.getLinkedGroups(user.id);
    setLinkedGroups(data || []);
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const linked = await checkLink();
      await checkLinkedGroups();

      // If user is not connected yet, auto generate verification code on mount!
      if (!linked) {
        try {
          const { data } = await api.telegram.generateLinkCode(user.id);
          if (data) {
            setLinkCode(data.code);
            setCodeExpiresAt(data.expires_at);
          }
        } catch (err) {
          console.log('Error auto-generating telegram code:', err);
        }
      }
      setLoading(false);
    })();
  }, [user, checkLink, checkLinkedGroups]);

  const handleOpenBot = async () => {
    const url = 'https://t.me/FinanzaidBot';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Tidak dapat membuka Telegram. Pastikan aplikasi Telegram terinstall.');
    }
  };

  const handleGenerateCode = async () => {
    if (!user) return;
    setLinking(true);
    try {
      const { data, error } = await api.telegram.generateLinkCode(user.id);
      if (error || !data) throw error || new Error('Gagal generate kode');
      setLinkCode(data.code);
      setCodeExpiresAt(data.expires_at);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menghasilkan kode');
    } finally {
      setLinking(false);
    }
  };

  const handleCopyCode = () => {
    Clipboard.setString('/start');
    Alert.alert('Berhasil', 'Teks "/start" berhasil disalin!');
  };

  const handleCheckConnection = async () => {
    if (!user) return;
    if (!telegramId.trim()) {
      Alert.alert('Perhatian', 'Masukkan ID Telegram terlebih dahulu.');
      return;
    }
    setChecking(true);
    try {
      const { data, error } = await api.telegram.linkTelegram(user.id, telegramId.trim(), '');
      if (error) throw error;
      if (data) {
        await checkLink();
        setLinkCode('');
        setTelegramId('');
        Alert.alert('Berhasil', 'Akun Telegram berhasil terhubung!');
      } else {
        Alert.alert('Belum Terhubung', 'Koneksi gagal. Pastikan Anda telah mengirimkan kode verifikasi ke Bot Telegram dan ID Anda benar.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menghubungkan akun');
    } finally {
      setChecking(false);
    }
  };

  const handleUnlink = () => {
    Alert.alert('Putuskan Koneksi', 'Yakin ingin memutuskan koneksi Telegram?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Putuskan',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          await api.telegram.unlinkTelegram(user.id);
          setLinkedAccount(null);
          setLinkCode('');
          setTelegramId('');
          // Re-generate code for future link
          handleGenerateCode();
        },
      },
    ]);
  };

  const handleLinkGroup = async () => {
    if (!user) return;
    if (!groupId.trim()) {
      Alert.alert('Perhatian', 'Masukkan ID Grup Telegram terlebih dahulu.');
      return;
    }
    setLinkingGroup(true);
    try {
      const { data, error } = await api.telegramGroup.linkGroup(
        user.id,
        groupId.trim(),
        groupName.trim() || 'Grup Telegram'
      );
      if (error) throw error;
      if (data) {
        setLinkedGroups((prev) => [data, ...prev]);
        setGroupId('');
        setGroupName('');
        Alert.alert('Berhasil', 'Grup Telegram berhasil terhubung!');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menghubungkan grup');
    } finally {
      setLinkingGroup(false);
    }
  };

  const handleUnlinkGroup = (group: TelegramGroupLink) => {
    Alert.alert('Putuskan Grup', `Yakin ingin memutuskan koneksi grup "${group.group_name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Putuskan',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          await api.telegramGroup.unlinkGroup(user.id, group.telegram_group_id);
          setLinkedGroups((prev) => prev.filter((g) => g.id !== group.id));
        },
      },
    ]);
  };

  const formatExpiry = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WIB`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color="#1a56db" />
        <Text style={{ marginTop: 16, color: colors.text }}>Memuat Telegram...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pengaturan Telegram</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Kelola koneksi Telegram Anda untuk notifikasi dan input transaksi cepat.
        </Text>

        {/* ===== PERSONAL SECTION ===== */}
        {activeWorkspace?.type !== 'family' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal (Chat Pribadi)</Text>
            {linkedAccount ? (
          /* Connected State */
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.connectedRow}>
              <View style={[styles.statusIconCircle, { backgroundColor: '#dcfce7' }]}>
                <FontAwesome name="check" size={20} color="#15803d" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.connectedTitle, { color: colors.text }]}>Terhubung</Text>
                <Text style={[styles.connectedSubtitle, { color: colors.textSecondary }]}>
                  {linkedAccount.telegram_username
                    ? `@${linkedAccount.telegram_username}`
                    : `ID: ${linkedAccount.telegram_user_id}`
                  }
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.unlinkBtn, { borderColor: Colors.danger }]}
              onPress={handleUnlink}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.danger, fontWeight: '600', fontSize: 14 }}>Putuskan Koneksi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Disconnected State */
          <View style={styles.disconnectedContainer}>
            {/* Status Card */}
            <View style={[styles.statusWarningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statusIconCircle, { backgroundColor: '#fef3c7' }]}>
                <FontAwesome name="exclamation-triangle" size={18} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.notConnectedTitle, { color: colors.text }]}>Belum Terhubung</Text>
                <Text style={[styles.notConnectedSubtitle, { color: colors.textSecondary }]}>
                  Hubungkan akun Telegram Anda untuk input transaksi via chat
                </Text>
              </View>
            </View>

            {/* Steps connection card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
              <View style={styles.cardHeaderRow}>
                <FontAwesome name="info-circle" size={18} color="#1a56db" />
                <Text style={[styles.howToTitle, { color: colors.text }]}>Cara Menghubungkan</Text>
              </View>

              {/* Step 1 */}
              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberBadgeText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    Buka Bot <Text style={{ fontWeight: '700', color: '#1a56db' }}>{BOT_USERNAME}</Text>
                  </Text>
                  <TouchableOpacity
                    style={[styles.openBotButton, { backgroundColor: '#1a56db' }]}
                    onPress={handleOpenBot}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 16, marginRight: 6 }}>✈️</Text>
                    <Text style={styles.openBotButtonText}>Buka Bot Telegram</Text>
                    <FontAwesome name="external-link" size={12} color="#fff" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberBadgeText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    Kirim pesan berikut:
                  </Text>
                  
                  {linkCode ? (
                    <TouchableOpacity
                      style={[styles.codeBox, { backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}
                      onPress={handleCopyCode}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.codeText}>/start</Text>
                      <FontAwesome name="copy" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.generateBtn, { backgroundColor: '#1a56db', opacity: linking ? 0.7 : 1 }]}
                      onPress={handleGenerateCode}
                      disabled={linking}
                      activeOpacity={0.8}
                    >
                      {linking ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.generateBtnText}>Generate Kode</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {codeExpiresAt && (
                    <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
                      Berlaku hingga {formatExpiry(codeExpiresAt)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Step 3 */}
              <View style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberBadgeText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    Copy ID telegram dari balasan Bot ke kolom hubungkan di bawah ini:
                  </Text>
                  <TextInput
                    style={[styles.textInputStyle, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="Paste ID Telegram disini"
                    placeholderTextColor={colors.textSecondary}
                    value={telegramId}
                    onChangeText={setTelegramId}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Connect Button */}
              <TouchableOpacity
                style={{ marginTop: 8 }}
                onPress={handleCheckConnection}
                disabled={checking}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#1a56db', '#0ea5e9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.gradientBtn, { opacity: checking ? 0.7 : 1 }]}
                >
                  {checking ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.connectBtnText}>Hubungkan Akun</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
          </>
        )}

        {/* ===== GROUP SECTION ===== */}
        {activeWorkspace?.type === 'family' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>
              Grup Bersama (Pasangan/Keluarga)
            </Text>

        {/* Card: Hubungkan Grup Baru */}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <FontAwesome name="link" size={18} color="#1a56db" />
            <Text style={[styles.howToTitle, { color: '#1a56db' }]}>Hubungkan Grup Baru</Text>
          </View>

          <Text style={[styles.inputLabel, { color: colors.text }]}>ID GRUP TELEGRAM</Text>
          <TextInput
            style={[styles.textInputStyle, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="-1001234567890"
            placeholderTextColor={colors.textSecondary}
            value={groupId}
            onChangeText={setGroupId}
            keyboardType="numeric"
          />

          <View style={styles.groupInstructionsContainer}>
            <Text style={[styles.groupInstructionsHeader, { color: colors.text }]}>
              Cara menghubungkan grup:
            </Text>
            <Text style={[styles.groupInstructionsStep, { color: colors.textSecondary }]}>
              1. Kirim pesan dengan format <Text style={{ fontWeight: '700', color: colors.text }}>/info</Text> di grup Telegram
            </Text>
            <Text style={[styles.groupInstructionsStep, { color: colors.textSecondary }]}>
              2. Cek pesan masuk dari Karsafin Bot
            </Text>
            <Text style={[styles.groupInstructionsStep, { color: colors.textSecondary }]}>
              3. Copy ID Grup dan tempelkan di field ID Grup Telegram
            </Text>
          </View>

          <Text style={[styles.inputLabel, { color: colors.text }]}>NAMA GRUP (OPSIONAL)</Text>
          <TextInput
            style={[styles.textInputStyle, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Keuangan Bersama"
            placeholderTextColor={colors.textSecondary}
            value={groupName}
            onChangeText={setGroupName}
          />

          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={handleLinkGroup}
            disabled={linkingGroup}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1a56db', '#0ea5e9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientBtn, { opacity: linkingGroup ? 0.7 : 1 }]}
            >
              {linkingGroup ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome name="link" size={15} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.connectBtnText}>Hubungkan Grup</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Linked Groups List */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24, marginBottom: 12 }]}>
          Grup Terhubung
        </Text>

        {linkedGroups.length > 0 ? (
          linkedGroups.map((group) => (
            <View
              key={group.id}
              style={[styles.groupItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.groupIconCircle}>
                <FontAwesome name="users" size={16} color="#1a56db" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.groupItemName, { color: colors.text }]}>{group.group_name}</Text>
                <Text style={[styles.groupItemId, { color: colors.textSecondary }]}>{group.telegram_group_id}</Text>
              </View>
              <TouchableOpacity
                style={styles.unlinkGroupButton}
                onPress={() => handleUnlinkGroup(group)}
                activeOpacity={0.8}
              >
                <Text style={styles.unlinkGroupButtonText}>Putuskan</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada grup yang terhubung</Text>
          </View>
        )}

          </>
        )}

        <View style={{ height: 40 }} />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  pageSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  howToTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  connectedTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  connectedSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  disconnectedContainer: {
    width: '100%',
  },
  statusWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  notConnectedTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  notConnectedSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a56db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  openBotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  openBotButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#1a56db',
  },
  expiryText: {
    fontSize: 11,
    marginTop: 4,
  },
  generateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  generateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  textInputStyle: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  gradientBtn: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#1a56db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  connectBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  unlinkBtn: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 16,
  },
  groupInstructionsContainer: {
    marginTop: 16,
    marginBottom: 8,
    gap: 6,
  },
  groupInstructionsHeader: {
    fontSize: 13,
    fontWeight: '700',
  },
  groupInstructionsStep: {
    fontSize: 12,
    lineHeight: 18,
  },
  groupItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  groupIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  groupItemId: {
    fontSize: 12,
    marginTop: 2,
  },
  unlinkGroupButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  unlinkGroupButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    borderRadius: BorderRadius.xl,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
