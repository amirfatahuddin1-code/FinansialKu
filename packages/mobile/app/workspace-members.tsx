import React, { useState, useEffect, useCallback } from 'react';
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
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import * as Clipboard from 'expo-clipboard';
import { BottomSheet } from '@/components';
import { LinearGradient } from 'expo-linear-gradient';

export default function WorkspaceMembersScreen() {
  const router = useRouter();
  const { user, api } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals for personal workspace upgrade
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');

  const loadMembers = useCallback(async () => {
    if (!activeWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await api.workspaces.getMembers(activeWorkspace.id);
      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      console.error('Failed to load workspace members:', err);
      Alert.alert('Gagal Memuat', 'Tidak bisa mengambil daftar anggota.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleCopyInviteCode = async () => {
    if (!activeWorkspace?.invite_code) return;
    await Clipboard.setStringAsync(activeWorkspace.invite_code);
    Alert.alert('Tersalin', 'Kode undangan berhasil disalin ke clipboard');
  };

  const handleShareInviteCode = async () => {
    if (!activeWorkspace?.invite_code) return;
    try {
      const message = `Halo! Yuk gabung ke workspace keluarga Karsafin saya menggunakan kode undangan: ${activeWorkspace.invite_code}\n\nDownload Karsafin sekarang dan atur keuangan bersama keluarga!`;
      await Share.share({
        message,
        title: 'Undangan Workspace Keluarga Karsafin',
      });
    } catch (error: any) {
      console.error('Error sharing code:', error.message);
    }
  };

  const handleRegenerateInviteCode = async () => {
    if (!activeWorkspace) return;
    Alert.alert(
      'Buat Kode Baru',
      'Kode undangan yang lama akan hangus secara permanen. Anggota baru harus menggunakan kode yang baru. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buat Baru',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await api.workspaces.regenerateInviteCode(activeWorkspace.id);
              if (error) throw error;
              await refreshWorkspaces();
              Alert.alert('Berhasil', 'Kode undangan baru berhasil dibuat.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal mengubah kode undangan.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeWorkspace) return;
    Alert.alert(
      'Hapus Anggota',
      `Apakah Anda yakin ingin mengeluarkan ${memberName} dari workspace ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluarkan',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await api.workspaces.removeMember(activeWorkspace.id, memberId);
              if (error) throw error;
              await loadMembers();
              Alert.alert('Berhasil', `${memberName} telah dikeluarkan dari workspace.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal mengeluarkan anggota.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleRole = async (memberId: string, currentRole: string, memberName: string) => {
    if (!activeWorkspace) return;
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const actionText = newRole === 'admin' ? 'Promosikan menjadi Admin' : 'Turunkan menjadi Anggota biasa';
    
    Alert.alert(
      'Ubah Peran Anggota',
      `Apakah Anda yakin ingin melakukan tindakan berikut pada ${memberName}?\nTindakan: ${actionText}`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ubah Peran',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await api.workspaces.updateMemberRole(activeWorkspace.id, memberId, newRole);
              if (error) throw error;
              await loadMembers();
              Alert.alert('Berhasil', `Peran ${memberName} berhasil diperbarui.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal memperbarui peran anggota.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveWorkspace = async () => {
    if (!activeWorkspace || !user) return;
    Alert.alert(
      'Keluar dari Workspace',
      'Anda akan kehilangan akses ke seluruh catatan keuangan, anggaran, dan tabungan dalam workspace keluarga ini. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const { error } = await api.workspaces.leave(activeWorkspace.id, user.id);
              if (error) throw error;
              await refreshWorkspaces();
              router.back();
              Alert.alert('Berhasil', 'Anda telah keluar dari workspace keluarga.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal keluar dari workspace.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    Alert.alert(
      'Hapus Workspace',
      'PERINGATAN: Seluruh data anggaran, tabungan, transaksi, dan riwayat di workspace keluarga ini akan DIHAPUS PERMANEN untuk semua anggota. Tindakan ini tidak bisa dibatalkan!',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Konfirmasi Terakhir',
              'Ketik "HAPUS" di bawah untuk menghapus permanen workspace ini.',
              [
                { text: 'Batal', style: 'cancel' },
                {
                  text: 'HAPUS',
                  style: 'destructive',
                  onPress: async () => {
                    setActionLoading(true);
                    try {
                      const { error } = await api.workspaces.delete(activeWorkspace.id);
                      if (error) throw error;
                      await refreshWorkspaces();
                      router.back();
                      Alert.alert('Berhasil', 'Workspace keluarga berhasil dihapus.');
                    } catch (err: any) {
                      Alert.alert('Error', err.message || 'Gagal menghapus workspace.');
                    } finally {
                      setActionLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleCreateFamily = async () => {
    if (!user || !newFamilyName.trim()) return;
    setActionLoading(true);
    try {
      const { data: subs } = await api.subscription.getSubscriptionHistory(user.id);
      const activeSub = subs?.find((s: any) => s.status === 'active') || null;
      const isPro = activeSub?.plan_id && activeSub.plan_id !== 'basic';

      if (!isPro && workspaces.length >= 2) {
        Alert.alert(
          'Batas Workspace Tercapai',
          'Pengguna paket Basic hanya dapat memiliki maksimal 2 workspace. Silakan upgrade ke paket Pro untuk membuat workspace baru!'
        );
        setActionLoading(false);
        return;
      }

      const { data, error } = await api.workspaces.create(user.id, newFamilyName.trim(), 'family');
      if (error) throw error;
      setNewFamilyName('');
      setShowCreateFamily(false);
      await refreshWorkspaces();
      if (data) await switchWorkspace(data.id);
      Alert.alert('Berhasil', `Workspace keluarga "${newFamilyName.trim()}" berhasil dibuat!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal membuat workspace keluarga.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!user || !joinInviteCode.trim()) return;
    setActionLoading(true);
    try {
      const { data: subs } = await api.subscription.getSubscriptionHistory(user.id);
      const activeSub = subs?.find((s: any) => s.status === 'active') || null;
      const isPro = activeSub?.plan_id && activeSub.plan_id !== 'basic';

      if (!isPro && workspaces.length >= 2) {
        Alert.alert(
          'Batas Workspace Tercapai',
          'Pengguna paket Basic hanya dapat memiliki maksimal 2 workspace. Silakan upgrade ke paket Pro untuk bergabung ke workspace baru!'
        );
        setActionLoading(false);
        return;
      }

      const { data, error } = await api.workspaces.join(user.id, joinInviteCode.trim());
      if (error) throw error;
      setJoinInviteCode('');
      setShowJoinFamily(false);
      await refreshWorkspaces();
      if (data) await switchWorkspace(data.id);
      Alert.alert('Berhasil', `Anda telah bergabung ke workspace "${data?.name || 'Keluarga'}"!`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Kode undangan tidak valid atau sudah kadaluarsa.');
    } finally {
      setActionLoading(false);
    }
  };

  const currentUserMemberObj = members.find((m) => m.user_id === user?.id);
  const currentUserRole = currentUserMemberObj?.role || 'member';
  const isOwner = activeWorkspace?.owner_id === user?.id;
  const isWorkspaceAdmin = currentUserRole === 'admin' || isOwner;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Anggota Workspace</Text>
        <View style={{ width: 40 }} />
      </View>

      {actionLoading && (
        <View style={[styles.topLoader, { backgroundColor: Colors.primary + '15' }]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={[styles.topLoaderText, { color: colors.text }]}>Memproses tindakan...</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textMuted }}>Memuat data anggota...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          
          {/* Active Workspace Info Card */}
          <LinearGradient
            colors={activeWorkspace?.type === 'family' ? ['#1e40af', '#1e3a8a'] : ['#334155', '#1e293b']}
            style={styles.workspaceCard}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.iconCircle}>
                <FontAwesome 
                  name={activeWorkspace?.type === 'family' ? 'users' : 'user'} 
                  size={20} 
                  color="#ffffff" 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.workspaceName}>{activeWorkspace?.name || 'Workspace'}</Text>
                <Text style={styles.workspaceType}>
                  {activeWorkspace?.type === 'family' ? 'Workspace Keluarga' : 'Workspace Pribadi'}
                </Text>
              </View>
            </View>

            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Peran Anda:</Text>
              <View style={[styles.roleBadgeSelf, { backgroundColor: isOwner ? '#f59e0b' : '#3b82f6' }]}>
                <Text style={styles.roleBadgeSelfText}>
                  {isOwner ? 'PEMILIK WORKSPACE' : currentUserRole === 'admin' ? 'ADMIN WORKSPACE' : 'ANGGOTA'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* If Personal Workspace - Show Promotional & Actions */}
          {activeWorkspace?.type === 'personal' ? (
            <View style={[styles.promoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.promoTitle, { color: colors.text }]}>Kolaborasi dengan Keluarga</Text>
              <Text style={[styles.promoDesc, { color: colors.textSecondary }]}>
                Saat ini Anda berada di Workspace Pribadi. Hanya Anda yang dapat melihat catatan keuangan ini.
                Buat workspace keluarga atau bergabung dengan keluarga Anda untuk mulai mencatat keuangan bersama secara real-time!
              </Text>
              
              <View style={{ gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                  onPress={() => setShowCreateFamily(true)}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="plus" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Buat Workspace Keluarga</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setShowJoinFamily(true)}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="sign-in" size={16} color={colors.text} style={{ marginRight: 8 }} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Bergabung via Kode Undangan</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Invite Code Section for Family Workspaces */}
              {activeWorkspace?.invite_code && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Undang Anggota Baru</Text>
                  <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                    Bagikan kode undangan 6-digit di bawah ini kepada anggota keluarga Anda. Mereka dapat memasukkannya di aplikasi untuk langsung bergabung.
                  </Text>

                  <View style={[styles.codeDisplayBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.codeLabelText, { color: colors.textSecondary }]}>KODE UNDANGAN AKTIF</Text>
                    <Text style={[styles.codeString, { color: Colors.primary }]}>{activeWorkspace.invite_code}</Text>
                  </View>

                  <View style={styles.codeButtonRow}>
                    <TouchableOpacity
                      style={[styles.codeBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}
                      onPress={handleCopyInviteCode}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="copy" size={14} color={colors.text} />
                      <Text style={[styles.codeBtnText, { color: colors.text }]}>Salin Kode</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.codeBtn, { backgroundColor: Colors.primary }]}
                      onPress={handleShareInviteCode}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="share" size={14} color="#ffffff" />
                      <Text style={[styles.codeBtnText, { color: '#ffffff' }]}>Bagikan</Text>
                    </TouchableOpacity>
                  </View>

                  {isWorkspaceAdmin && (
                    <TouchableOpacity
                      style={styles.regenerateBtn}
                      onPress={handleRegenerateInviteCode}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name="refresh" size={12} color={colors.textSecondary} />
                      <Text style={[styles.regenerateBtnText, { color: colors.textSecondary }]}>
                        Buat Ulang Kode Undangan Baru
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Members List */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>
                  Daftar Anggota ({members.length})
                </Text>

                {members.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada anggota.</Text>
                ) : (
                  members.map((m) => {
                    const isMemberMe = m.user_id === user?.id;
                    const isMemberOwner = m.user_id === activeWorkspace?.owner_id;
                    const canManageThisMember = isWorkspaceAdmin && !isMemberOwner && !isMemberMe;

                    return (
                      <View key={m.id} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.memberAvatar, { backgroundColor: Colors.primary }]}>
                          <Text style={styles.avatarText}>
                            {m.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={[styles.memberName, { color: colors.text }]}>
                              {m.profiles?.name || 'User'}
                            </Text>
                            {isMemberMe && (
                              <View style={[styles.meBadge, { backgroundColor: colors.border }]}>
                                <Text style={[styles.meBadgeText, { color: colors.textMuted }]}>Anda</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                            {m.profiles?.email || 'Tidak ada email'}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <View style={[styles.roleBadge, { backgroundColor: m.role === 'admin' ? '#dbeafe' : '#f3f4f6' }]}>
                              <Text style={[styles.roleBadgeText, { color: m.role === 'admin' ? '#2563eb' : '#6b7280' }]}>
                                {m.role === 'admin' ? 'ADMIN' : 'ANGGOTA'}
                              </Text>
                            </View>
                            {isMemberOwner && (
                              <View style={[styles.roleBadge, { backgroundColor: '#fef3c7' }]}>
                                <Text style={[styles.roleBadgeText, { color: '#d97706' }]}>PEMILIK</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Admin Action Buttons */}
                        {canManageThisMember && (
                          <View style={styles.actionsContainer}>
                            <TouchableOpacity
                              style={[styles.memberActionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}
                              onPress={() => handleToggleRole(m.id, m.role, m.profiles?.name || 'User')}
                              activeOpacity={0.7}
                            >
                              <FontAwesome
                                name={m.role === 'admin' ? 'arrow-down' : 'arrow-up'}
                                size={14}
                                color={colors.text}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.memberActionBtn, { backgroundColor: '#fef2f2' }]}
                              onPress={() => handleRemoveMember(m.id, m.profiles?.name || 'User')}
                              activeOpacity={0.7}
                            >
                              <FontAwesome name="trash" size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {/* Danger Zone */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: Colors.danger + '30', borderWidth: 1 }]}>
                <Text style={[styles.sectionTitle, { color: Colors.danger, marginBottom: 8 }]}>Danger Zone</Text>
                <Text style={[styles.sectionDesc, { color: colors.textSecondary, marginBottom: 16 }]}>
                  Tindakan sensitif dan permanen yang berkaitan dengan workspace keluarga Anda.
                </Text>

                <View style={{ gap: 12 }}>
                  {!isOwner && (
                    <TouchableOpacity
                      style={[styles.dangerBtn, { backgroundColor: Colors.danger + '12', borderColor: Colors.danger + '30', borderWidth: 1 }]}
                      onPress={handleLeaveWorkspace}
                      activeOpacity={0.8}
                    >
                      <FontAwesome name="sign-out" size={16} color={Colors.danger} />
                      <Text style={[styles.dangerBtnText, { color: Colors.danger }]}>Keluar dari Workspace Keluarga</Text>
                    </TouchableOpacity>
                  )}

                  {isOwner && (
                    <TouchableOpacity
                      style={[styles.dangerBtn, { backgroundColor: Colors.danger }]}
                      onPress={handleDeleteWorkspace}
                      activeOpacity={0.8}
                    >
                      <FontAwesome name="trash" size={16} color="#ffffff" />
                      <Text style={[styles.dangerBtnText, { color: '#ffffff' }]}>Hapus Workspace Keluarga Secara Permanen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}

        </ScrollView>
      )}

      {/* Upgrade Modals */}
      {/* Create Family Workspace BottomSheet */}
      <BottomSheet visible={showCreateFamily} onClose={() => setShowCreateFamily(false)} title="Buat Keluarga Baru">
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Workspace Keluarga</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          value={newFamilyName}
          onChangeText={setNewFamilyName}
          placeholder="Misal: Keluarga Cemara, Hubby & Wifey"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: actionLoading || !newFamilyName.trim() ? 0.7 : 1 }]}
          onPress={handleCreateFamily}
          disabled={actionLoading || !newFamilyName.trim()}
        >
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Buat Sekarang</Text>}
        </TouchableOpacity>
      </BottomSheet>

      {/* Join Family Workspace BottomSheet */}
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
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: actionLoading || !joinInviteCode.trim() ? 0.7 : 1 }]}
          onPress={handleJoinFamily}
          disabled={actionLoading || !joinInviteCode.trim()}
        >
          {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Gabung Sekarang</Text>}
        </TouchableOpacity>
      </BottomSheet>
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
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  topLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  topLoaderText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  workspaceCard: {
    borderRadius: BorderRadius.xl,
    padding: 20,
    gap: 16,
    ...Shadows.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  workspaceType: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  roleContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  roleBadgeSelf: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  roleBadgeSelfText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  promoCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    ...Shadows.sm,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  promoDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: 20,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
  },
  codeDisplayBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  codeLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  codeString: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
  },
  codeButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  codeBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  codeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  regenerateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  meBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  memberActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    ...Shadows.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
