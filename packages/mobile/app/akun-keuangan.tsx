import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors, { useColors } from '@/constants/Colors';
import type { FinancialAccount } from '@karsafin/shared';
import { BottomSheet } from '@/components';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function FinancialAccountsScreen() {
  const { user, api } = useAuth();
  const { activeWorkspace, workspaces } = useWorkspace();
  const colorScheme = useColorScheme() ?? 'dark';
  useColors();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'bank' | 'ewallet' | 'investment' | 'other'>('bank');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [editAccount, setEditAccount] = useState<FinancialAccount | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountBalance, setEditAccountBalance] = useState('');
  const [updating, setUpdating] = useState(false);

  const [showCopyAccounts, setShowCopyAccounts] = useState(false);
  const [sourceWorkspaceId, setSourceWorkspaceId] = useState<string | null>(null);
  const [sourceAccounts, setSourceAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [copyingAccounts, setCopyingAccounts] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.accounts.getAll();
      setAccounts(data || []);
    } catch (err) {
      console.error('Load accounts error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const getAccountColorByName = (name: string): string => {
    const n = name.toLowerCase().trim();
    if (n.includes('bca')) return '#0051d4';
    if (n.includes('permata')) return '#009639';
    if (n.includes('gopay') || n.includes('go-pay') || n.includes('go pay')) return '#00a2e9';
    if (n.includes('shopee') || n.includes('spay')) return '#ee4d2d';
    if (n.includes('mandiri')) return '#003d79';
    if (n.includes('bni')) return '#f97316';
    if (n.includes('bri')) return '#00529b';
    if (n.includes('ovo')) return '#4c2a86';
    if (n.includes('linkaja') || n.includes('link aja')) return '#e52b27';
    if (n.includes('cash') || n.includes('tunai') || n.includes('dompet')) return '#10b981';
    return '#64748b'; // default slate color
  };

  const handleAddAccount = async () => {
    if (!user || !newAccountName.trim()) return;
    setSaving(true);
    try {
      let defaultIcon = '💵';
      if (newAccountType === 'bank') defaultIcon = '💳';
      else if (newAccountType === 'ewallet') defaultIcon = '📱';
      else if (newAccountType === 'investment') defaultIcon = '📈';

      const balanceNum = Number(newAccountBalance.replace(/\D/g, ''));

      const { error } = await api.accounts.create(user.id, {
        name: newAccountName.trim(),
        type: newAccountType,
        is_default: false,
        color: getAccountColorByName(newAccountName),
        icon: defaultIcon,
        balance: balanceNum,
      });
      if (error) throw error;
      setNewAccountName('');
      setNewAccountBalance('');
      setShowAddAccount(false);
      await loadAccounts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menambah akun');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (acc: FinancialAccount) => {
    setEditAccount(acc);
    setEditAccountName(acc.name);
    setEditAccountBalance(acc.balance ? Number(acc.balance).toLocaleString('id-ID') : '');
    setShowEditAccount(true);
  };

  const handleUpdateAccount = async () => {
    if (!editAccount || !editAccountName.trim()) return;
    setUpdating(true);
    try {
      const { error } = await api.accounts.update(editAccount.id, {
        name: editAccountName.trim(),
        icon: editAccount.icon,
        balance: Number(editAccountBalance.replace(/\D/g, '')),
      });
      if (error) throw error;
      setShowEditAccount(false);
      setEditAccount(null);
      await loadAccounts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengupdate akun');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = (id: string) => {
    Alert.alert('Hapus Akun', 'Yakin ingin menghapus akun ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await api.accounts.delete(id);
          await loadAccounts();
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
          color: acc.color,
          icon: acc.icon,
          balance: 0,
        });
      }
      Alert.alert('Berhasil', selectedAccountIds.length + ' akun berhasil disalin');
      setShowCopyAccounts(false);
      await loadAccounts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyalin akun');
    } finally {
      setCopyingAccounts(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return ' Bank';
      case 'ewallet': return ' E-Wallet';
      case 'investment': return ' Investasi';
      default: return '💵 Cash';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bank': return '💳';
      case 'ewallet': return ' ';
      case 'investment': return '📈';
      default: return '💵';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Akun Keuangan</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }} style={{ flex: 1 }}>
          {accounts.length === 0 ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 40 }}>Belum ada akun keuangan</Text>
          ) : (
            (['bank', 'ewallet', 'investment', 'other'] as const).map((type) => {
              const typeAccounts = accounts.filter((acc) => acc.type === type);
              if (typeAccounts.length === 0) return null;
              return (
                <View key={type} style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 16, paddingHorizontal: 16, color: colors.textSecondary }}>
                    {getTypeLabel(type)}
                  </Text>
                  {typeAccounts.map((acc) => (
                    <View key={acc.id} style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.card }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                          <Text style={{ fontSize: 18 }}>{getTypeIcon(acc.type)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{acc.name}</Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                            {acc.type === 'bank' ? 'Bank' : acc.type === 'ewallet' ? 'E-Wallet' : acc.type === 'investment' ? 'Investasi' : 'Lainnya'}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleOpenEdit(acc)} style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef2ff', marginRight: 8 }}>
                          <Text style={{ color: '#6366f1', fontSize: 14 }}>✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteAccount(acc.id)} style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fef2f2' }}>
                          <Text style={{ color: Colors.danger, fontSize: 14 }}>X</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        paddingTop: 12,
        paddingBottom: insets.bottom + 12,
        paddingHorizontal: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border
      }}>
        {workspaces.filter((ws) => ws.id !== activeWorkspace?.id).length > 0 && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10, backgroundColor: colors.card }}
            onPress={() => {
              setSourceWorkspaceId(null);
              setSourceAccounts([]);
              setSelectedAccountIds([]);
              setShowCopyAccounts(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 14 }}> Salin dari Workspace Lain</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowAddAccount(true)}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>+ Tambah Akun Keuangan</Text>
        </TouchableOpacity>
      </View>

      <BottomSheet visible={showAddAccount} onClose={() => { setShowAddAccount(false); setNewAccountBalance(''); }} title="Tambah Akun Keuangan">
        <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4, color: colors.textSecondary }}>Nama Akun</Text>
        <TextInput
          style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }}
          value={newAccountName}
          onChangeText={setNewAccountName}
          placeholder="Contoh: BCA, GoPay, Cash"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14, color: colors.textSecondary }}>Jenis Akun</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(['bank', 'ewallet', 'investment', 'other'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1, backgroundColor: newAccountType === t ? Colors.primary : colors.inputBg, borderColor: newAccountType === t ? Colors.primary : colors.border }}
              onPress={() => setNewAccountType(t)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: newAccountType === t ? '#fff' : colors.text }}>
                {t === 'bank' ? ' Bank' : t === 'ewallet' ? ' E-Wallet' : t === 'investment' ? ' Investasi' : '💵 Cash'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14, color: colors.textSecondary }}>Saldo Awal</Text>
        <TextInput
          style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'right' }}
          value={newAccountBalance}
          onChangeText={(val) => setNewAccountBalance(val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={{ borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 16, backgroundColor: Colors.primary, opacity: saving || !newAccountName.trim() ? 0.7 : 1 }}
          onPress={handleAddAccount}
          disabled={saving || !newAccountName.trim()}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Tambah Akun</Text>}
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={showCopyAccounts} onClose={() => setShowCopyAccounts(false)} title="Salin Akun dari Workspace Lain">
        {!sourceWorkspaceId ? (
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: colors.textSecondary }}>Pilih Workspace Sumber</Text>
            {workspaces
              .filter((ws) => ws.id !== activeWorkspace?.id)
              .map((ws) => (
                <TouchableOpacity
                  key={ws.id}
                  style={{ paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                  onPress={() => handleOpenCopyAccounts(ws.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{ws.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{ws.type === 'family' ? 'Keluarga' : 'Pribadi'}</Text>
                    </View>
                    <Text style={{ color: Colors.primary, fontSize: 16 }}>{'->'}</Text>
                  </View>
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
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>{'<-'} Kembali ke pilihan workspace</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, color: colors.textSecondary }}>Pilih Akun untuk Disalin</Text>
            {sourceAccounts.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 24 }}>Tidak ada akun di workspace ini</Text>
            ) : (
              sourceAccounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={{ paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                  onPress={() => {
                    setSelectedAccountIds((prev) =>
                      prev.includes(acc.id) ? prev.filter((id) => id !== acc.id) : [...prev, acc.id]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: selectedAccountIds.includes(acc.id) ? Colors.primary : colors.border, backgroundColor: selectedAccountIds.includes(acc.id) ? Colors.primary : 'transparent', marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
                      {selectedAccountIds.includes(acc.id) && <Text style={{ color: '#fff', fontSize: 12 }}>V</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{acc.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{acc.type}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 16, backgroundColor: Colors.primary, opacity: copyingAccounts || selectedAccountIds.length === 0 ? 0.7 : 1 }}
              onPress={handleCopyAccounts}
              disabled={copyingAccounts || selectedAccountIds.length === 0}
              activeOpacity={0.8}
            >
              {copyingAccounts ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Salin {selectedAccountIds.length} Akun</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={showEditAccount} onClose={() => setShowEditAccount(false)} title="Edit Akun Keuangan">
        <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4, color: colors.textSecondary }}>Nama Akun</Text>
        <TextInput
          style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }}
          value={editAccountName}
          onChangeText={setEditAccountName}
          placeholder="Nama akun"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14, color: colors.textSecondary }}>Saldo Saat Ini</Text>
        <TextInput
          style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'right' }}
          value={editAccountBalance}
          onChangeText={(val) => setEditAccountBalance(val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={{ borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 16, backgroundColor: Colors.primary, opacity: updating || !editAccountName.trim() ? 0.7 : 1 }}
          onPress={handleUpdateAccount}
          disabled={updating || !editAccountName.trim()}
          activeOpacity={0.8}
        >
          {updating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Simpan Perubahan</Text>}
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
  },
});