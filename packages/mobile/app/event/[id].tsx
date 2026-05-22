import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useWorkspace } from '@/providers/WorkspaceProvider';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { formatCurrency, parseAmount, getLocalToday } from '@karsafin/shared';
import type { Event, EventItem, Category, FinancialAccount } from '@karsafin/shared';
import { BottomSheet, CategoryIcon, AccountIcon, AddCategoryModal } from '@/components';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatInputAmount = (val: string) => {
  const numericVal = val.replace(/[^0-9]/g, '');
  if (!numericVal) return '';
  return parseInt(numericVal, 10).toLocaleString('id-ID');
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<EventItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<string>(''); 
  const [itemUnitPrice, setItemUnitPrice] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemActual, setItemActual] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !id) return;
    try {
      const [eventsRes, catRes, accRes] = await Promise.all([
        api.events.getAll(true),
        api.categories.getAll(),
        api.accounts.getAll()
      ]);
      const currentEvent = eventsRes.data?.find(e => e.id === id);
      if (currentEvent) {
        setEvent(currentEvent);
      }
      setCategories(catRes.data || []);
      setAccounts(accRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, id, activeWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalBudget = event?.items?.reduce((sum, item) => sum + (item.budget || 0), 0) || 0;
  const totalActual = event?.items?.reduce((sum, item) => sum + (item.actual || 0), 0) || 0;
  const targetBudget = event?.budget || 0;
  
  const openAddItemModal = () => {
    setEditItem(null);
    setItemName('');
    setItemCategory('');
    setItemUnitPrice('');
    setItemQty('1');
    setItemActual('');
    const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
    setSelectedAccountId(defaultAcc?.id || '');
    setShowItemModal(true);
  };

  const openEditItemModal = (item: EventItem) => {
    setEditItem(item);
    setItemName(item.name);
    setItemCategory(item.category || '');
    setItemUnitPrice(item.unit_price ? item.unit_price.toLocaleString('id-ID') : '');
    setItemQty(item.qty ? item.qty.toString() : '1');
    setItemActual(item.actual ? item.actual.toLocaleString('id-ID') : '');
    const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
    setSelectedAccountId(defaultAcc?.id || '');
    setShowItemModal(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert('Hapus Item', 'Yakin ingin menghapus item ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        const { error } = await api.eventItems.delete(itemId);
        if (!error) loadData();
      }}
    ]);
  };

  const handleSaveItem = async () => {
    if (!user || !event) return;
    if (!itemName.trim()) {
      Alert.alert('Error', 'Nama item tidak boleh kosong');
      return;
    }
    
    setSavingItem(true);
    try {
      const unitPrice = parseAmount(itemUnitPrice);
      const qty = parseInt(itemQty, 10) || 1;
      const budget = unitPrice * qty;
      const actual = parseAmount(itemActual);
      
      const payload = {
        name: itemName.trim(),
        category: itemCategory || undefined,
        unit_price: unitPrice,
        qty,
        budget,
        actual,
        is_paid: editItem ? editItem.is_paid : false,
      };

      let currentItem = editItem;

      if (editItem) {
        const { data, error } = await api.eventItems.update(editItem.id, payload);
        if (error) throw error;
        currentItem = data as EventItem;
      } else {
        const { data, error } = await api.eventItems.create(event.id, payload as any);
        if (error) throw error;
        currentItem = data as EventItem;
      }
      
      if (actual > 0 && currentItem && !currentItem.is_paid && itemCategory) {
        const txPayload = {
          type: 'expense' as const,
          amount: actual,
          category_id: itemCategory,
          description: `${event.name} - ${itemName.trim()}`,
          date: getLocalToday(),
          source: 'manual',
          event_id: event.id,
          account_id: selectedAccountId || undefined,
        };
        const { error: txError } = await api.transactions.create(user.id, txPayload as any);
        if (!txError) {
          await api.eventItems.togglePaid(currentItem.id, true);
        }
      }

      setShowItemModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan item');
    } finally {
      setSavingItem(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textMuted }}>Memuat Acara...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Acara tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.primary }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: Math.max(insets.top, 20), paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 20, backgroundColor: colors.tint }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8, marginLeft: -8 }}>
              <FontAwesome name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', flex: 1 }}>{event.name}</Text>
          </View>
          
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Anggaran</Text>
              <Text style={styles.summaryValue}>Rp {formatCurrency(targetBudget > 0 ? targetBudget : totalBudget)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Realisasi</Text>
              <Text style={styles.summaryValue}>Rp {formatCurrency(totalActual)}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Rincian Acara</Text>
            <TouchableOpacity onPress={openAddItemModal} style={{ backgroundColor: 'rgba(0,98,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
              <Text style={{ color: '#0062ff', fontWeight: '600', fontSize: 14 }}>+ Tambah Item</Text>
            </TouchableOpacity>
          </View>

          {(!event.items || event.items.length === 0) ? (
            <View style={{ padding: 32, alignItems: 'center', backgroundColor: colors.card, borderRadius: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Belum ada rincian item.{'\n'}Tambahkan item untuk mencatat RAB.</Text>
            </View>
          ) : (
            event.items.map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openEditItemModal(item)}
                onLongPress={() => handleDeleteItem(item.id)}
              >
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.itemBudget, { color: colors.text }]}>Rp {formatCurrency(item.budget)}</Text>
                </View>
                <View style={styles.itemSubRow}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {item.qty} x Rp {formatCurrency(item.unit_price)}
                  </Text>
                </View>
                <View style={[styles.itemActualBox, { backgroundColor: colors.background }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Realisasi</Text>
                  <Text style={{ color: item.actual > 0 ? (item.actual > item.budget ? '#ef4444' : '#10b981') : colors.textMuted, fontWeight: '700' }}>
                    Rp {formatCurrency(item.actual)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editItem ? 'Edit Item' : 'Tambah Item'}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Item</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          placeholder="Mis: Konsumsi Rapat"
          placeholderTextColor={colors.textMuted}
          value={itemName}
          onChangeText={setItemName}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Kategori</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {categories.filter(c => c.type === 'expense').map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catBtn,
                { backgroundColor: colors.inputBg, borderColor: colors.border },
                itemCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '20' }
              ]}
              onPress={() => setItemCategory(cat.id)}
            >
              <Text style={{ fontSize: 16, marginRight: 8 }}>{cat.icon}</Text>
              <Text style={{ color: colors.text, fontWeight: itemCategory === cat.id ? '700' : '400' }}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.catBtn,
              { backgroundColor: colors.inputBg, borderColor: colors.border, borderStyle: 'dashed', borderWidth: 1.5 }
            ]}
            onPress={() => setShowAddCategory(true)}
          >
            <Text style={{ fontSize: 16, marginRight: 8, color: colors.textMuted }}>+</Text>
            <Text style={{ color: colors.textSecondary }}>Baru</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Harga Satuan</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={itemUnitPrice}
              onChangeText={(val) => setItemUnitPrice(formatInputAmount(val))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Kuantitas</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={itemQty}
              onChangeText={(val) => setItemQty(val.replace(/[^0-9]/g, ''))}
              placeholder="1"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={{ marginBottom: 16, marginTop: 16, padding: 12, backgroundColor: 'rgba(0,98,255,0.1)', borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Total Anggaran Item</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0062ff' }}>
            Rp {formatCurrency(parseAmount(itemUnitPrice) * (parseInt(itemQty, 10) || 1))}
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 0 }]}>Realisasi (Sudah Dibayar)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
          keyboardType="numeric"
          value={itemActual}
          onChangeText={(val) => setItemActual(formatInputAmount(val))}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        {!editItem?.is_paid && (
          <>
            {itemActual && parseAmount(itemActual) > 0 && (
              <Text style={{ color: '#0062ff', fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                💡 Transaksi pengeluaran akan otomatis dicatat saat disimpan.
              </Text>
            )}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>Akun Sumber Dana</Text>
            {accounts.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Belum ada akun keuangan. Atur di Pengaturan.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {accounts.map(acc => {
                  const isSelected = selectedAccountId === acc.id;

                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.catBtn,
                        {
                          backgroundColor: isSelected ? (acc.color || '#0062ff') + '25' : colors.inputBg,
                          borderColor: isSelected ? acc.color || '#0062ff' : colors.border,
                          gap: 6,
                        },
                      ]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <AccountIcon icon={acc.icon} type={acc.type} size={14} />
                      <Text style={{ color: colors.text, fontWeight: isSelected ? '700' : '400', fontSize: 13 }}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: savingItem ? 0.7 : 1 }]}
          onPress={handleSaveItem}
          disabled={savingItem}
        >
          {savingItem ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan</Text>}
        </TouchableOpacity>
      </BottomSheet>

      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSave={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
          setItemCategory(newCat.id);
          setShowAddCategory(false);
        }}
        initialType="expense"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  itemCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemBudget: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSubRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemActualBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 16,
    fontSize: 16,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
