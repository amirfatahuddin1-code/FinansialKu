import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { BottomSheet } from '@/components';
import type {
  FinancialAccount,
  Member,
  WhatsAppLink,
  SubscriptionPlan,
  Subscription,
  Category,
} from '@karsafin/shared';

export default function SettingsScreen() {
  const { user, api, signOut } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [whatsappLink, setWhatsappLink] = useState<WhatsAppLink | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showProfile, setShowProfile] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showMember, setShowMember] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [planDurationTab, setPlanDurationTab] = useState<'Bulanan' | 'Tahunan' | 'Lifetime'>('Bulanan');

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'bank' | 'ewallet' | 'investment' | 'other'>('bank');
  const [whatsappPhone, setWhatsappPhone] = useState('');

  const [showCopyAccounts, setShowCopyAccounts] = useState(false);
  const [sourceWorkspaceId, setSourceWorkspaceId] = useState<string | null>(null);
  const [sourceAccounts, setSourceAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [copyingAccounts, setCopyingAccounts] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#4F46E5');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense' | 'savings'>('expense');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { workspaces, activeWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [managingMember, setManagingMember] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [profileRes, accRes, catRes, memRes, waRes, planRes, subRes] = await Promise.all([
        api.profiles.get(user.id),
        api.accounts.getAll(),
        api.categories.getAll(),
        api.members.getAll(user.id),
        api.whatsapp?.getLinkedAccount(user.id) || Promise.resolve({ data: null, error: null }),
        api.subscription.getPlans(),
        api.subscription.getSubscriptionHistory(user.id),
      ]);
      if (profileRes.data) {
        setProfileName(profileRes.data.name || '');
        setProfilePhone(profileRes.data.phone || '');
      }
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      setMembers(memRes.data || []);
      setWhatsappLink(waRes.data || null);
      setPlans(planRes.data || []);
      const subs = subRes.data || [];
      setSubscription(subs.find((s: Subscription) => s.status === 'active') || null);
    } catch (err) {
      console.error('Load settings error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await api.profiles.update(user.id, { name: profileName, phone: profilePhone });
      if (error) throw error;
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
      setShowProfile(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = async () => {
    if (!user || !newAccountName.trim()) return;
    setSaving(true);
    try {
      const { error } = await api.accounts.create(user.id, {
        name: newAccountName.trim(),
        type: newAccountType,
        is_default: false,
      });
      if (error) throw error;
      setNewAccountName('');
      setShowAccount(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menambah akun');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = (id: string) => {
    Alert.alert('Hapus Akun', 'Yakin ingin menghapus akun ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const { error } = await api.accounts.delete(id);
          if (error) console.error(error);
          loadData();
        },
      },
    ]);
  };

  const handleOpenCopyAccounts = async (workspaceId: string) => {
    setSourceWorkspaceId(workspaceId);
    setSelectedAccountIds([]);
    setShowCopyAccounts(true);
    try {
      const { data } = await api.accounts.getAllForWorkspace(workspaceId);
      setSourceAccounts(data || []);
    } catch (err) {
      console.error('Fetch source accounts error:', err);
      setSourceAccounts([]);
    }
  };

  const handleCopyAccounts = async () => {
    if (!user || !sourceWorkspaceId || selectedAccountIds.length === 0) return;
    setCopyingAccounts(true);
    try {
      const accountsToCopy = sourceAccounts.filter((acc) => selectedAccountIds.includes(acc.id));
      for (const acc of accountsToCopy) {
        await api.accounts.create(user.id, {
          name: acc.name,
          type: acc.type as any,
          is_default: false,
        });
      }
      Alert.alert('Berhasil', `${accountsToCopy.length} akun berhasil disalin`);
      setShowCopyAccounts(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyalin akun');
    } finally {
      setCopyingAccounts(false);
    }
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewCategoryColor('#4F46E5');
    setNewCategoryType('expense');
    setShowCategoryForm(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setNewCategoryIcon(cat.icon);
    setNewCategoryColor(cat.color);
    setNewCategoryType(cat.type);
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    if (!user || !newCategoryName.trim() || !newCategoryIcon.trim()) {
      Alert.alert('Perhatian', 'Nama dan ikon kategori harus diisi.');
      return;
    }
    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await api.categories.update(editingCategory.id, {
          name: newCategoryName.trim(),
          icon: newCategoryIcon.trim(),
          color: newCategoryColor,
          type: newCategoryType,
        });
        if (error) throw error;
        Alert.alert('Berhasil', 'Kategori berhasil diperbarui');
      } else {
        const { error } = await api.categories.create(user.id, {
          name: newCategoryName.trim(),
          icon: newCategoryIcon.trim(),
          color: newCategoryColor,
          type: newCategoryType,
        });
        if (error) throw error;
        Alert.alert('Berhasil', 'Kategori berhasil ditambahkan');
      }
      setNewCategoryName('');
      setNewCategoryIcon('');
      setNewCategoryColor('#4F46E5');
      setNewCategoryType('expense');
      setEditingCategory(null);
      setShowCategoryForm(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    if (cat.is_default) {
      Alert.alert('Tidak Bisa Dihapus', 'Kategori bawaan tidak dapat dihapus.');
      return;
    }
    Alert.alert('Hapus Kategori', `Yakin ingin menghapus kategori "${cat.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const { error } = await api.categories.delete(cat.id);
          if (error) {
            Alert.alert('Error', error.message || 'Gagal menghapus kategori');
            return;
          }
          loadData();
        },
      },
    ]);
  };

  const loadWorkspaceMembers = async (workspaceId: string) => {
    const { data } = await api.workspaces.getMembers(workspaceId);
    if (data) setWorkspaceMembers(data);
  };

  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceMembers(activeWorkspace.id);
    }
  }, [activeWorkspace]);

  const handleCreateFamily = async () => {
    if (!user || !newFamilyName.trim()) return;
    setSaving(true);
    try {
      const { error } = await api.workspaces.create(user.id, newFamilyName.trim(), 'family');
      if (error) throw error;
      setNewFamilyName('');
      setShowCreateFamily(false);
      await refreshWorkspaces();
      Alert.alert('Berhasil', 'Workspace keluarga dibuat!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal membuat keluarga');
    } finally {
      setSaving(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!user || !joinInviteCode.trim()) return;
    setSaving(true);
    try {
      const { error } = await api.workspaces.join(user.id, joinInviteCode.trim());
      if (error) throw error;
      setJoinInviteCode('');
      setShowJoinFamily(false);
      await refreshWorkspaces();
      Alert.alert('Berhasil', 'Anda berhasil bergabung ke workspace keluarga!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal bergabung, pastikan kode benar.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!activeWorkspace?.invite_code) return;
    await Clipboard.setStringAsync(activeWorkspace.invite_code);
    Alert.alert('Tersalin', 'Kode undangan berhasil disalin ke clipboard');
  };

  const handleRegenerateInviteCode = async () => {
    if (!activeWorkspace) return;
    Alert.alert('Buat Kode Baru', 'Kode undangan lama akan tidak berlaku. Lanjutkan?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Buat Baru',
        onPress: async () => {
          setManagingMember(true);
          try {
            const { data, error } = await api.workspaces.regenerateInviteCode(activeWorkspace.id);
            if (error) throw error;
            if (data) await refreshWorkspaces();
            Alert.alert('Berhasil', 'Kode undangan baru telah dibuat');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Gagal membuat kode baru');
          } finally {
            setManagingMember(false);
          }
        },
      },
    ]);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeWorkspace) return;
    Alert.alert('Hapus Anggota', `Yakin ingin menghapus ${memberName} dari workspace ini?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setManagingMember(true);
          try {
            const { error } = await api.workspaces.removeMember(activeWorkspace.id, memberId);
            if (error) throw error;
            loadWorkspaceMembers(activeWorkspace.id);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Gagal menghapus anggota');
          } finally {
            setManagingMember(false);
          }
        },
      },
    ]);
  };

  const handleToggleRole = async (memberId: string, currentRole: string, memberName: string) => {
    if (!activeWorkspace) return;
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const action = newRole === 'admin' ? 'menjadikan admin' : 'menjadikan anggota';
    Alert.alert('Ubah Peran', `${action} ${memberName}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya',
        onPress: async () => {
          setManagingMember(true);
          try {
            const { error } = await api.workspaces.updateMemberRole(activeWorkspace.id, memberId, newRole);
            if (error) throw error;
            loadWorkspaceMembers(activeWorkspace.id);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Gagal mengubah peran');
          } finally {
            setManagingMember(false);
          }
        },
      },
    ]);
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspace || !user) return;
    Alert.alert(
      'Keluar dari Workspace',
      'Anda akan keluar dari workspace ini. Data tidak akan hilang, tapi Anda tidak bisa mengaksesnya lagi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            setManagingMember(true);
            try {
              const { error } = await api.workspaces.leave(activeWorkspace.id, user.id);
              if (error) throw error;
              setShowMember(false);
              await refreshWorkspaces();
              Alert.alert('Berhasil', 'Anda telah keluar dari workspace');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal keluar dari workspace');
            } finally {
              setManagingMember(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    Alert.alert(
      'Hapus Workspace',
      'SEMUA data workspace ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan!',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Konfirmasi Lagi',
              'Ketik "HAPUS" untuk mengonfirmasi penghapusan workspace ini',
              [
                { text: 'Batal', style: 'cancel' },
                {
                  text: 'HAPUS',
                  style: 'destructive',
                  onPress: async () => {
                    setManagingMember(true);
                    try {
                      const { error } = await api.workspaces.delete(activeWorkspace.id);
                      if (error) throw error;
                      setShowMember(false);
                      await refreshWorkspaces();
                      Alert.alert('Berhasil', 'Workspace telah dihapus');
                    } catch (err: any) {
                      Alert.alert('Error', err.message || 'Gagal menghapus workspace');
                    } finally {
                      setManagingMember(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLinkWhatsApp = async () => {
    if (!user || !whatsappPhone.trim()) return;
    setSaving(true);
    try {
      const { error } = await api.whatsapp.linkPhone(user.id, whatsappPhone.trim());
      if (error) throw error;
      Alert.alert('Berhasil', 'WhatsApp berhasil dihubungkan');
      setWhatsappPhone('');
      setShowWhatsApp(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menghubungkan WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkWhatsApp = async () => {
    if (!user) return;
    Alert.alert('Putuskan WhatsApp', 'Yakin ingin memutuskan koneksi WhatsApp?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Putuskan',
        style: 'destructive',
        onPress: async () => {
          const { error } = await api.whatsapp.unlinkPhone(user.id);
          if (error) console.error(error);
          loadData();
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const processSimulatedSubscription = async (plan: SubscriptionPlan) => {
    if (!user) return;
    setSaving(true);
    try {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(now.getDate() + plan.duration_days);

      const { error } = await api.supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      Alert.alert('Berhasil', `Paket ${plan.name} berhasil diaktifkan secara simulasi!`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengaktifkan simulasi paket');
    } finally {
      setSaving(false);
    }
  };

  const processMidtransPayment = async (plan: SubscriptionPlan) => {
    if (!user) return;
    setSaving(true);
    try {
      const sessionRes = await api.auth.getSession();
      const token = sessionRes.data?.session?.access_token || undefined;
      
      const { data, error } = await api.subscription.createPayment(
        plan.id,
        {
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata,
        },
        token
      );

      if (error) throw error;
      if (!data) throw new Error('Gagal mendapatkan data pembayaran');

      const redirectUrl = data.redirect_url || data.snap_url;
      if (redirectUrl) {
        const result = await WebBrowser.openBrowserAsync(redirectUrl);
        if (result.type === 'cancel') {
          Alert.alert('Informasi', 'Pembayaran dibatalkan.');
        } else {
          Alert.alert('Menunggu Pembayaran', 'Jika pembayaran berhasil, status langganan Anda akan diperbarui secara otomatis. Silakan refresh halaman pengaturan beberapa saat lagi.');
        }
      } else {
        throw new Error('Url pembayaran tidak ditemukan. Harap gunakan metode Simulasi.');
      }
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memproses pembayaran via Midtrans');
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) return;
    
    Alert.alert(
      'Aktifkan Langganan',
      `Pilih metode pembayaran untuk paket ${plan.name} (Rp ${plan.price.toLocaleString('id-ID')}):`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Midtrans Payment (Asli)',
          onPress: () => processMidtransPayment(plan),
        },
        {
          text: 'Aktifkan Instan (Simulasi)',
          style: 'default',
          onPress: () => processSimulatedSubscription(plan),
        }
      ]
    );
  };

  const renderPlanFeaturesList = (plan: SubscriptionPlan) => {
    const features = plan.features as any;
    if (!features) return null;

    const items = [
      { label: 'transaksi aplikasi manual tanpa batas', allowed: true },
      { label: `transaksi aplikasi AI Asisten ${features.ai_assistant === 'unlimited' ? 'tanpa batas' : 'maksimal 20 per hari'}`, allowed: true },
      { label: `transaksi lewat whatsapp/telegram ${features.messaging_transactions === 'unlimited' ? 'tanpa batas' : 'masing-masing maksimal 20 per hari'}`, allowed: true },
      { label: 'kelola rencana anggaran, acara, dan tabungan', allowed: true },
      { label: 'catat hutang piutang', allowed: true },
      { label: 'laporan keuangan', allowed: true },
      { label: 'kalkulator finansial', allowed: true },
      { label: `ubah tema aplikasi ${features.theme_changes === 'unlimited' ? 'tanpa batas' : '1 kali'}`, allowed: true },
      { label: `fitur workspace ${features.workspace_max === 'unlimited' ? 'maksimal tanpa batas' : 'maksimal 2'}`, allowed: true },
    ];

    return (
      <View style={styles.planFeaturesContainer}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.featureRow}>
            <FontAwesome
              name={item.allowed ? 'check-circle' : 'times-circle'}
              size={14}
              color={item.allowed ? '#10b981' : '#ef4444'}
              style={styles.featureIcon}
            />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const sectionHeader = (title: string) => (
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
  );

  const menuItem = (icon: string, label: string, onPress: () => void, isLast?: boolean) => (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
    </TouchableOpacity>
  );

  const statusBadge = (connected: boolean) => (
    <View style={[styles.statusBadge, { backgroundColor: connected ? '#dcfce7' : '#fef2f2' }]}>
      <Text style={[styles.statusText, { color: connected ? '#16a34a' : '#ef4444' }]}>
        {connected ? 'Tersambung' : 'Belum tersambung'}
      </Text>
    </View>
  );

  const isUnlimitedAi = subscription?.subscription_plans?.name?.includes('Pro');

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textMuted }}>Memuat Pengaturan...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 0, paddingHorizontal: 0, paddingBottom: 40 + insets.bottom }]}>
        {/* Solid Blue Header Block (Inside ScrollView so overlap works perfectly!) */}
        <View
          style={[
            styles.topHeaderBg,
            {
          backgroundColor: colors.tint,
              paddingTop: insets.top + 16,
              paddingBottom: 120,
            }
          ]}
        >
          {/* Back and Title Navigation Row */}
          <View style={styles.topNavRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.topBackBtn} activeOpacity={0.7}>
              <FontAwesome name="chevron-left" size={18} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.topTitleText}>Profil dan Pengaturan</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>

        {/* Outer Padding Container for the rest of settings */}
        <View style={{ paddingHorizontal: 16 }}>
          {/* Main Overlapping Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            {/* Avatar Ring */}
            <View style={[styles.avatarRing, { borderColor: colors.card, backgroundColor: colors.card }]}>
              <View style={[styles.avatarInner, { 
                backgroundColor: isUnlimitedAi ? '#fefce8' : colors.tint + '20', 
                borderColor: isUnlimitedAi ? '#eab308' : colors.tint + '40',
                borderWidth: isUnlimitedAi ? 3 : 1.5 
              }]}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: isUnlimitedAi ? '#ca8a04' : colors.tint }}>{profileName.charAt(0).toUpperCase() || 'U'}</Text>
              </View>
              {/* Active Premium badge pill below avatar */}
              <View style={[styles.premiumPill, { backgroundColor: isUnlimitedAi ? '#0f172a' : '#f1f5f9' }]}>
                <Text style={[styles.premiumPillText, { color: isUnlimitedAi ? '#facc15' : '#64748b' }]}>
                  {isUnlimitedAi ? 'PRO 🌟' : 'BASIC 👤'}
                </Text>
              </View>
            </View>

            {/* Pencil Edit Icon at top-right of the card */}
            <TouchableOpacity 
              style={[styles.editPencilBtn, { backgroundColor: colorScheme === 'dark' ? '#334155' : '#f1f5f9', borderColor: colors.border }]} 
              onPress={() => setShowProfile(true)}
              activeOpacity={0.8}
            >
              <FontAwesome name="pencil" size={15} color={colors.textSecondary} />
              {/* Small red notification dot */}
              <View style={styles.redDot} />
            </TouchableOpacity>

            {/* User Details */}
            <Text style={[styles.profileNameText, { color: colors.text }]}>
              {profileName || 'User'}
            </Text>
            <Text style={[styles.profileDetailText, { color: colors.textSecondary }]}>
              {user?.email || 'Tidak ada email'}
            </Text>
            {profilePhone ? (
              <Text style={[styles.profileDetailText, { color: colors.textSecondary, marginTop: 4 }]}>
                {profilePhone}
              </Text>
            ) : null}

            {/* Subscription Plan Active Status Card */}
            <LinearGradient
              colors={isUnlimitedAi ? ['#0f172a', '#1e293b'] : ['#374151', '#4b5563']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subStatusCard}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.subStatusTitle, { color: '#fff' }]}>
                  {isUnlimitedAi ? 'Paket kamu saat ini:\nPro' : 'Paket kamu saat ini:\nBasic'}
                </Text>
                <Text style={[styles.subStatusDesc, { color: isUnlimitedAi ? '#94a3b8' : '#e5e7eb' }]}>
                  {subscription && isUnlimitedAi
                    ? subscription.subscription_plans?.name?.includes('Lifetime') 
                      ? 'Berlaku selamanya (Lifetime)' 
                      : `Berlaku sampai ${new Date(subscription.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : 'Nikmati fitur tanpa batas dengan paket Pro'
                  }
                </Text>
              </View>
              {/* Astro-robot scene on the right */}
              <View style={styles.astroContainer}>
                <View style={[styles.astroCircleBg, { backgroundColor: isUnlimitedAi ? '#facc1520' : '#ffffff20' }]}>
                  <Text style={{ fontSize: 32 }}>{isUnlimitedAi ? '🚀' : '🤖'}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Menus and settings items */}
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 24 }]}>
            {sectionHeader('Konteks Catatan')}
            {menuItem('💼', 'Pilih Workspace', () => setShowWorkspace(true))}
          </View>

          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sectionHeader('Akun')}
            {menuItem('👤', 'Profil Saya', () => setShowProfile(true))}
            {menuItem('🏦', 'Akun Keuangan', () => router.push('/akun-keuangan'))}
            {menuItem('🏷️', 'Kategori Transaksi', () => setShowCategory(true))}
            {menuItem('📅', 'Atur Tanggal Pemasukan', () => router.push('/atur-tanggal-pemasukan'))}
            {menuItem('👨‍👩‍👧', 'Anggota Workspace', () => router.push('/workspace-members'))}

            {sectionHeader('Integrasi')}
            {menuItem('📱', 'Hubungkan WhatsApp', () => setShowWhatsApp(true))}
            {menuItem('✈️', 'Hubungkan Telegram', () => router.push('/telegram'))}

            {sectionHeader('Aplikasi')}
            {!isUnlimitedAi && menuItem('🎯', 'Kuota AI', () => router.push('/kuota-ai'))}
            {menuItem('💳', 'Langganan', () => setShowSubscription(true))}
            {menuItem('🎨', 'Tema', () => router.push('/tema'))}
            {menuItem('📋', 'Syarat dan Ketentuan', () => router.push('/syarat-ketentuan'))}
            {menuItem('🔒', 'Kebijakan Privasi', () => router.push('/kebijakan-privasi'))}
            {menuItem('❓', 'Tanya Jawab (FAQ)', () => router.push('/faq'))}
            {menuItem('📞', 'Kontak Kami', () => router.push('/kontak-kami'))}
            {menuItem('ℹ️', 'Tentang Karsafin', () => setShowAbout(true), true)}
          </View>

          <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={18} color="#ef4444" />
            <Text style={[styles.logoutText, { color: '#ef4444' }]}>Keluar Akun</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Karsafin v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Profile */}
      <BottomSheet visible={showProfile} onClose={() => setShowProfile(false)} title="Profil Saya">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Lengkap</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={profileName}
          onChangeText={setProfileName}
          placeholder="Nama Anda"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Nomor Telepon</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={profilePhone}
          onChangeText={setProfilePhone}
          placeholder="+62xxx"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSaveProfile}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Perubahan</Text>}
        </TouchableOpacity>
      </BottomSheet>

      {/* Accounts */}
      <BottomSheet visible={showAccount} onClose={() => setShowAccount(false)} title="Akun Keuangan">
        {accounts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada akun keuangan</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
            {(['bank', 'ewallet', 'investment', 'other'] as const).map((type) => {
              const typeAccounts = accounts.filter((acc) => acc.type === type);
              if (typeAccounts.length === 0) return null;
              const typeLabel = type === 'bank' ? '🏦 Bank' : type === 'ewallet' ? '📱 E-Wallet' : type === 'investment' ? '📈 Investasi' : '💵 Cash';
              return (
                <View key={type} style={{ marginBottom: 16 }}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{typeLabel}</Text>
                  {typeAccounts.map((acc) => (
                    <View key={acc.id} style={[styles.listItem, { borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listItemTitle, { color: colors.text }]}>{acc.name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteAccount(acc.id)}>
                        <Text style={{ color: Colors.danger, fontSize: 20 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        )}
        {workspaces.filter((ws) => ws.id !== activeWorkspace?.id).length > 0 && (
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, marginTop: 12 }]}
            onPress={() => setShowCopyAccounts(true)}
            activeOpacity={0.7}
          >
            <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 14 }}>📋 Salin dari Workspace Lain</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Nama Akun</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={newAccountName}
          onChangeText={setNewAccountName}
          placeholder="Contoh: BCA, GoPay, Cash"
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.typeRow}>
          {(['bank', 'ewallet', 'investment', 'other'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeChip,
                {
                  backgroundColor: newAccountType === t ? Colors.primary : colors.inputBg,
                  borderColor: newAccountType === t ? Colors.primary : colors.border,
                },
              ]}
              onPress={() => setNewAccountType(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.typeChipText, { color: newAccountType === t ? '#fff' : colors.text }]}>
                {t === 'bank' ? '🏦 Bank' : t === 'ewallet' ? ' E-Wallet' : t === 'investment' ? '📈 Investasi' : '💵 Cash'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving || !newAccountName.trim() ? 0.7 : 1 }]}
          onPress={handleAddAccount}
          disabled={saving || !newAccountName.trim()}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Tambah Akun</Text>}
        </TouchableOpacity>
      </BottomSheet>

      {/* Copy Accounts from Other Workspace */}
      <BottomSheet visible={showCopyAccounts} onClose={() => setShowCopyAccounts(false)} title="Salin Akun dari Workspace Lain">
        {!sourceWorkspaceId ? (
          <View>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Pilih Workspace Sumber</Text>
            {workspaces
              .filter((ws) => ws.id !== activeWorkspace?.id)
              .map((ws) => (
                <TouchableOpacity
                  key={ws.id}
                  style={[styles.listItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleOpenCopyAccounts(ws.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]}>{ws.name}</Text>
                    <Text style={[styles.listItemSub, { color: colors.textMuted }]}>{ws.type === 'family' ? 'Keluarga' : 'Pribadi'}</Text>
                  </View>
                  <Text style={{ color: Colors.primary, fontSize: 16 }}>→</Text>
                </TouchableOpacity>
              ))}
          </View>
        ) : (
          <View>
            <TouchableOpacity
              style={{ marginBottom: 12 }}
              onPress={() => { setSourceWorkspaceId(null); setSourceAccounts([]); setSelectedAccountIds([]); }}
              activeOpacity={0.7}
            >
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>← Kembali ke pilihan workspace</Text>
            </TouchableOpacity>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Pilih Akun untuk Disalin</Text>
            {sourceAccounts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tidak ada akun di workspace ini</Text>
            ) : (
              sourceAccounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.listItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedAccountIds((prev) =>
                      prev.includes(acc.id) ? prev.filter((id) => id !== acc.id) : [...prev, acc.id]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: selectedAccountIds.includes(acc.id) ? Colors.primary : colors.border,
                        backgroundColor: selectedAccountIds.includes(acc.id) ? Colors.primary : 'transparent',
                        marginRight: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {selectedAccountIds.includes(acc.id) && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, { color: colors.text }]}>{acc.name}</Text>
                      <Text style={[styles.listItemSub, { color: colors.textMuted }]}>{acc.type}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: copyingAccounts || selectedAccountIds.length === 0 ? 0.7 : 1, marginTop: 16 }]}
              onPress={handleCopyAccounts}
              disabled={copyingAccounts || selectedAccountIds.length === 0}
              activeOpacity={0.8}
            >
              {copyingAccounts ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Salin {selectedAccountIds.length} Akun</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      {/* Categories */}
      <BottomSheet visible={showCategory} onClose={() => { setShowCategory(false); setEditingCategory(null); }} title="Kategori Transaksi">
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, margin: 0 }]}>Kategori Pengeluaran</Text>
            <TouchableOpacity
              style={[styles.smallAddBtn, { backgroundColor: Colors.primary }]}
              onPress={() => { setNewCategoryType('expense'); openAddCategory(); }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>+</Text>
            </TouchableOpacity>
          </View>
          {categories.filter(c => c.type === 'expense').length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada kategori pengeluaran</Text>
          ) : (
            categories.filter(c => c.type === 'expense').map((cat) => (
              <View key={cat.id} style={[styles.categoryItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.categoryIconBox, { backgroundColor: cat.color + '20' }]}>
                  <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                </View>
                <View style={styles.categoryTextContainer}>
                  <Text style={[styles.categoryItemName, { color: colors.text }]}>{cat.name}</Text>
                  {cat.is_default && (
                    <Text style={[styles.categoryBadgeText, { color: colors.textMuted }]}>Bawaan</Text>
                  )}
                </View>
                <View style={styles.categoryActions}>
                  {!cat.is_default && (
                    <>
                      <TouchableOpacity onPress={() => openEditCategory(cat)} style={styles.categoryEditBtn}>
                        <FontAwesome name="pencil" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.categoryDeleteBtn}>
                        <FontAwesome name="trash" size={14} color={Colors.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, margin: 0 }]}>Kategori Pemasukan</Text>
            <TouchableOpacity
              style={[styles.smallAddBtn, { backgroundColor: Colors.success }]}
              onPress={() => { setNewCategoryType('income'); openAddCategory(); }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>+</Text>
            </TouchableOpacity>
          </View>
          {categories.filter(c => c.type === 'income').length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada kategori pemasukan</Text>
          ) : (
            categories.filter(c => c.type === 'income').map((cat) => (
              <View key={cat.id} style={[styles.categoryItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.categoryIconBox, { backgroundColor: cat.color + '20' }]}>
                  <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                </View>
                <View style={styles.categoryTextContainer}>
                  <Text style={[styles.categoryItemName, { color: colors.text }]}>{cat.name}</Text>
                  {cat.is_default && (
                    <Text style={[styles.categoryBadgeText, { color: colors.textMuted }]}>Bawaan</Text>
                  )}
                </View>
                <View style={styles.categoryActions}>
                  {!cat.is_default && (
                    <>
                      <TouchableOpacity onPress={() => openEditCategory(cat)} style={styles.categoryEditBtn}>
                        <FontAwesome name="pencil" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.categoryDeleteBtn}>
                        <FontAwesome name="trash" size={14} color={Colors.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16 }}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary, margin: 0 }]}>Kategori Tabungan</Text>
            <TouchableOpacity
              style={[styles.smallAddBtn, { backgroundColor: Colors.primary }]}
              onPress={() => { setNewCategoryType('savings'); openAddCategory(); }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>+</Text>
            </TouchableOpacity>
          </View>
          {categories.filter(c => c.type === 'savings').length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada kategori tabungan</Text>
          ) : (
            categories.filter(c => c.type === 'savings').map((cat) => (
              <View key={cat.id} style={[styles.categoryItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.categoryIconBox, { backgroundColor: cat.color + '20' }]}>
                  <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                </View>
                <View style={styles.categoryTextContainer}>
                  <Text style={[styles.categoryItemName, { color: colors.text }]}>{cat.name}</Text>
                  {cat.is_default && (
                    <Text style={[styles.categoryBadgeText, { color: colors.textMuted }]}>Bawaan</Text>
                  )}
                </View>
                <View style={styles.categoryActions}>
                  {!cat.is_default && (
                    <>
                      <TouchableOpacity onPress={() => openEditCategory(cat)} style={styles.categoryEditBtn}>
                        <FontAwesome name="pencil" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.categoryDeleteBtn}>
                        <FontAwesome name="trash" size={14} color={Colors.danger} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      {/* Add/Edit Category Form */}
      <BottomSheet visible={showCategoryForm} onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }} title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Kategori</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          placeholder="Nama kategori"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Ikon (emoji)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={newCategoryIcon}
          onChangeText={setNewCategoryIcon}
          placeholder="🍔"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Warna</Text>
        <View style={styles.colorPickerRow}>
          {['#4F46E5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorOption,
                { backgroundColor: c, borderColor: newCategoryColor === c ? colors.text : 'transparent', borderWidth: 2 },
              ]}
              onPress={() => setNewCategoryColor(c)}
              activeOpacity={0.7}
            />
          ))}
        </View>
        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Tipe</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeChip,
              {
                backgroundColor: newCategoryType === 'expense' ? Colors.danger : colors.inputBg,
                borderColor: newCategoryType === 'expense' ? Colors.danger : colors.border,
              },
            ]}
            onPress={() => setNewCategoryType('expense')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeChipText, { color: newCategoryType === 'expense' ? '#fff' : colors.text }]}>
              Pengeluaran
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeChip,
              {
                backgroundColor: newCategoryType === 'income' ? Colors.success : colors.inputBg,
                borderColor: newCategoryType === 'income' ? Colors.success : colors.border,
              },
            ]}
            onPress={() => setNewCategoryType('income')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeChipText, { color: newCategoryType === 'income' ? '#fff' : colors.text }]}>
              Pemasukan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeChip,
              {
                backgroundColor: newCategoryType === 'savings' ? '#8b5cf6' : colors.inputBg,
                borderColor: newCategoryType === 'savings' ? '#8b5cf6' : colors.border,
              },
            ]}
            onPress={() => setNewCategoryType('savings')}
            activeOpacity={0.7}
          >
            <Text style={[styles.typeChipText, { color: newCategoryType === 'savings' ? '#fff' : colors.text }]}>
              Tabungan
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving || !newCategoryName.trim() || !newCategoryIcon.trim() ? 0.7 : 1 }]}
          onPress={handleSaveCategory}
          disabled={saving || !newCategoryName.trim() || !newCategoryIcon.trim()}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}</Text>}
        </TouchableOpacity>
      </BottomSheet>

      {/* Workspace Selection */}
      <BottomSheet visible={showWorkspace} onClose={() => setShowWorkspace(false)} title="Pilih Workspace">
        {workspaces.map((ws) => (
          <TouchableOpacity 
            key={ws.id} 
            style={[styles.listItem, { borderBottomColor: colors.border, backgroundColor: activeWorkspace?.id === ws.id ? colors.inputBg : 'transparent' }]}
            onPress={async () => {
              await switchWorkspace(ws.id);
              setShowWorkspace(false);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.listItemTitle, { color: colors.text }]}>{ws.name}</Text>
              <Text style={[styles.listItemSub, { color: colors.textMuted }]}>{ws.type === 'personal' ? 'Pribadi' : 'Keluarga'}</Text>
            </View>
            {activeWorkspace?.id === ws.id && (
              <FontAwesome name="check-circle" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <View style={{ marginTop: 20, gap: 10 }}>
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: Colors.primary, marginTop: 0 }]}
            onPress={() => { setShowWorkspace(false); setShowCreateFamily(true); }}
          >
            <Text style={styles.saveBtnText}>+ Buat Workspace Keluarga</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1, marginTop: 0 }]}
            onPress={() => { setShowWorkspace(false); setShowJoinFamily(true); }}
          >
            <Text style={[styles.saveBtnText, { color: colors.text }]}>Bergabung dengan Kode</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Create Family Workspace */}
      <BottomSheet visible={showCreateFamily} onClose={() => setShowCreateFamily(false)} title="Buat Keluarga Baru">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Keluarga</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={newFamilyName}
          onChangeText={setNewFamilyName}
          placeholder="Misal: Keluarga Cemara"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving || !newFamilyName.trim() ? 0.7 : 1 }]}
          onPress={handleCreateFamily}
          disabled={saving || !newFamilyName.trim()}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Buat Sekarang</Text>}
        </TouchableOpacity>
      </BottomSheet>

      {/* Join Family Workspace */}
      <BottomSheet visible={showJoinFamily} onClose={() => setShowJoinFamily(false)} title="Bergabung ke Keluarga">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Kode Undangan (6 Digit)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textTransform: 'uppercase' }]}
          value={joinInviteCode}
          onChangeText={setJoinInviteCode}
          placeholder="XXXXXX"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={6}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving || !joinInviteCode.trim() ? 0.7 : 1 }]}
          onPress={handleJoinFamily}
          disabled={saving || !joinInviteCode.trim()}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Gabung Sekarang</Text>}
        </TouchableOpacity>
      </BottomSheet>



      {/* WhatsApp */}
      <BottomSheet visible={showWhatsApp} onClose={() => setShowWhatsApp(false)} title="Hubungkan WhatsApp">
        <View style={styles.integrationCard}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>📱</Text>
          {whatsappLink ? (
            <>
              {statusBadge(true)}
              <Text style={[styles.integrationDesc, { color: colors.textSecondary }]}>
                Terhubung ke nomor {whatsappLink.phone_number}
              </Text>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: Colors.danger, marginTop: 16 }]}
                onPress={handleUnlinkWhatsApp}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>Putuskan Koneksi</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {statusBadge(false)}
              <Text style={[styles.integrationDesc, { color: colors.textSecondary }]}>
                Catat transaksi otomatis dari chat WhatsApp Anda
              </Text>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Nomor WhatsApp</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                value={whatsappPhone}
                onChangeText={setWhatsappPhone}
                placeholder="+62812xxxx"
          placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving || !whatsappPhone.trim() ? 0.7 : 1, marginTop: 8 }]}
                onPress={handleLinkWhatsApp}
                disabled={saving || !whatsappPhone.trim()}
                activeOpacity={0.8}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Hubungkan</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </BottomSheet>


      {/* Subscription */}
      <BottomSheet visible={showSubscription} onClose={() => setShowSubscription(false)} title="Langganan">
        <View style={styles.integrationCard}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>💳</Text>
          {subscription ? (
            <>
              <View style={[styles.planBadge, { backgroundColor: '#dcfce7', marginBottom: 6 }]}>
                <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 16 }}>
                  {subscription.subscription_plans?.name || 'Aktif'}
                </Text>
              </View>
              <Text style={[styles.integrationDesc, { color: colors.textSecondary, marginTop: 4, marginBottom: 16 }]}>
                Paket {subscription.subscription_plans?.name || 'Pro'} {subscription.subscription_plans?.name?.includes('Lifetime') ? 'aktif selamanya' : `aktif hingga ${new Date(subscription.expires_at).toLocaleDateString('id-ID')}`}
              </Text>
            </>
          ) : (
            <>
              <View style={[styles.planBadge, { backgroundColor: '#fef2f2', marginBottom: 6 }]}>
                <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 16 }}>Tidak Aktif</Text>
              </View>
              <Text style={[styles.integrationDesc, { color: colors.textSecondary, marginTop: 4, marginBottom: 16 }]}>
                Nikmati fitur lengkap Karsafin dengan berlangganan
              </Text>
            </>
          )}

          {(!subscription || subscription.subscription_plans?.name?.includes('Basic')) && (
            <View style={{ width: '100%', marginBottom: 24, padding: 16, backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Fitur Paket Basic Saat Ini</Text>
              
              {[
                { label: 'Transaksi aplikasi manual tanpa batas', icon: 'check-circle', color: '#10b981' },
                { label: 'Transaksi aplikasi AI Asisten maksimal 20 per hari', icon: 'exclamation-circle', color: '#f59e0b' },
                { label: 'Transaksi lewat whatsapp/telegram maksimal masing-masing 20 per hari', icon: 'exclamation-circle', color: '#f59e0b' },
                { label: 'Kelola rencana anggaran, acara, dan tabungan', icon: 'check-circle', color: '#10b981' },
                { label: 'Catat hutang piutang', icon: 'check-circle', color: '#10b981' },
                { label: 'Laporan keuangan', icon: 'check-circle', color: '#10b981' },
                { label: 'Kalkulator finansial', icon: 'check-circle', color: '#10b981' },
                { label: 'Ubah tema aplikasi 1 kali', icon: 'exclamation-circle', color: '#f59e0b' },
                { label: 'Fitur workspace maksimal 2', icon: 'exclamation-circle', color: '#f59e0b' }
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <FontAwesome name={item.icon as any} size={14} color={item.color} style={{ marginRight: 8, width: 16, textAlign: 'center' }} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}

          {plans.length > 0 && (
            <View style={{ gap: 16, width: '100%' }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: 'center', fontSize: 14, fontWeight: '700' }]}>Pilih Durasi</Text>
              
              <View style={styles.typeRow}>
                {(['Bulanan', 'Tahunan', 'Lifetime'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: planDurationTab === t ? Colors.primary : colors.inputBg,
                        borderColor: planDurationTab === t ? Colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPlanDurationTab(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeChipText, { color: planDurationTab === t ? '#fff' : colors.text }]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {plans.filter((p) => {
                const validPlans = ['Pro - Bulanan', 'Pro - Tahunan', 'Pro - Lifetime'];
                if (!validPlans.includes(p.name)) return false;

                if (planDurationTab === 'Bulanan' && p.duration_days === 30) return true;
                if (planDurationTab === 'Tahunan' && p.duration_days === 365) return true;
                if (planDurationTab === 'Lifetime' && p.duration_days > 10000) return true;
                return false;
              }).map((plan) => {
                const isActive = subscription?.plan_id === plan.id;
                return (
                  <View
                    key={plan.id}
                    style={[
                      styles.planCard, 
                      { backgroundColor: colors.inputBg, borderColor: colors.border },
                      isActive && styles.activePlanBorder
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.planName, { color: colors.text, fontSize: 16 }]}>{plan.name}</Text>
                        <Text style={[styles.planPrice, { color: Colors.primary, fontSize: 16 }]}>
                          Rp {plan.price.toLocaleString('id-ID')}
                        </Text>
                      </View>
                      
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        Durasi: {plan.duration_days} Hari
                      </Text>

                      {renderPlanFeaturesList(plan)}

                      <TouchableOpacity
                        style={[
                          styles.planSelectBtn,
                          {
                            backgroundColor: isActive ? '#10b981' : Colors.primary,
                            opacity: saving ? 0.7 : 1
                          }
                        ]}
                        disabled={isActive || saving}
                        onPress={() => handleSubscribe(plan)}
                      >
                        <Text style={styles.planSelectBtnText}>
                          {isActive ? '✓ Paket Aktif' : 'Pilih & Aktifkan'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </BottomSheet>

      {/* Theme */}
      <BottomSheet visible={showTheme} onClose={() => setShowTheme(false)} title="Tema">
        <View style={styles.integrationCard}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>🎨</Text>
          <View style={[styles.planBadge, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.integrationDesc, { color: colors.text }]}>
              Mode {colorScheme === 'dark' ? 'Gelap' : 'Terang'}
            </Text>
          </View>
          <Text style={[styles.integrationDesc, { color: colors.textSecondary, marginTop: 12 }]}>
            Saat ini tema mengikuti pengaturan sistem perangkat Anda. Ubah tema melalui pengaturan sistem untuk beralih antara mode terang dan gelap.
          </Text>
          <View style={[styles.codeBox, { backgroundColor: colors.inputBg, borderColor: colors.border, marginTop: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>{colorScheme === 'dark' ? '🌙' : '☀️'}</Text>
              <View>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Tema Aktif</Text>
                <Text style={[styles.codeValue, { color: colors.text }]}>
                  {colorScheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </BottomSheet>

      {/* About */}
      <BottomSheet visible={showAbout} onClose={() => setShowAbout(false)} title="Tentang Karsafin">
        <View style={styles.integrationCard}>
          <View style={[{ backgroundColor: Colors.primary, width: 64, height: 64, borderRadius: 32, marginBottom: 12, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 28, color: '#fff', fontWeight: '800' }}>K</Text>
          </View>
          <Text style={[styles.planName, { color: colors.text, fontSize: 20 }]}>Karsafin</Text>
          <Text style={[styles.codeLabel, { color: colors.textMuted, marginTop: 4 }]}>v1.0.0</Text>
          <Text style={[styles.integrationDesc, { color: colors.textSecondary, marginTop: 12, textAlign: 'center' }]}>
            Atur Keuangan, Wujudkan Mimpi
          </Text>
          <Text style={[styles.integrationDesc, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Aplikasi pencatat keuangan pribadi dan keluarga yang terintegrasi dengan WhatsApp & Telegram.
          </Text>
          <Text style={[styles.codeLabel, { color: colors.textMuted, marginTop: 16 }]}>© 2026 Karsafin</Text>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeaderBg: {
    overflow: 'hidden',
    position: 'relative',
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitleText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileCard: {
    borderRadius: 24,
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginTop: -55,
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarRing: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  premiumPill: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#fbbf2480',
  },
  premiumPillText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  editPencilBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  profileNameText: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
  profileDetailText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 3,
  },
  subStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  subStatusTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  subStatusDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  astroContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  astroCircleBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff15',
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuIcon: {
    fontSize: 18,
    width: 32,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  menuArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
    color: '#64748b',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  listItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  smallAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryItemName: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  categoryBadgeText: {
    fontSize: 11,
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,70,229,0.1)',
  },
  categoryDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  integrationCard: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  integrationDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  codeBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  codeValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 4,
  },
  codeHint: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  planBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
  },
  planFeatures: {
    fontSize: 11,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  memberActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planFeaturesContainer: {
    marginTop: 10,
    gap: 6,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 14,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 12,
    lineHeight: 16,
  },
  planSelectBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  planSelectBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  activePlanBorder: {
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
});
