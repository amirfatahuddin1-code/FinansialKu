import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { FontAwesome } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'

import { useAuth } from '@/providers/AuthProvider'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { useColorScheme } from '@/components/useColorScheme'
import Colors from '@/constants/Colors'
import { Spacing, BorderRadius } from '@/constants/DesignSystem'
import {
  formatCurrency,
  parseAmount,
  getLocalToday,
  formatDate,
} from '@karsafin/shared'
import type { ShoppingPlan, ShoppingItem } from '@karsafin/shared'
import { BottomSheet, EmptyState } from '@/components'

interface ShoppingTabProps {
  colors: any
  insets: any
}

// Helper function to auto-categorize item transactions based on keywords
const categorizeItem = (itemName: string, categories: any[]) => {
  const name = itemName.toLowerCase().trim();
  const mapping = [
    {
      keywords: ['makan', 'minum', 'kopi', 'roti', 'susu', 'beras', 'snack', 'camilan', 'teh', 'jus', 'daging', 'sayur', 'buah', 'mie', 'bakso', 'cafe', 'resto', 'warung', 'kuliner', 'bumbu', 'telur'],
      categoryNames: ['makanan', 'minuman', 'makanan & minuman', 'kuliner', 'pangan']
    },
    {
      keywords: ['bensin', 'parkir', 'tol', 'ojek', 'grab', 'gojek', 'bus', 'kereta', 'tiket', 'service', 'oli', 'kendaraan', 'travel', 'transport', 'taxi', 'taksi'],
      categoryNames: ['transportasi', 'kendaraan', 'transport', 'perjalanan']
    },
    {
      keywords: ['baju', 'celana', 'sepatu', 'tas', 'kaos', 'jaket', 'kemeja', 'sabun', 'shampoo', 'odol', 'sikat', 'tisu', 'belanja', 'toko', 'supermarket', 'mal', 'mall', 'kosmetik', 'makeup', 'skincare'],
      categoryNames: ['belanja', 'kebutuhan pribadi', 'pribadi', 'pakaian', 'fashion']
    },
    {
      keywords: ['buku', 'pen', 'pensil', 'tulis', 'kertas', 'kursus', 'sekolah', 'kuliah', 'spp', 'edukasi', 'pendidikan', 'kuliah'],
      categoryNames: ['pendidikan', 'edukasi', 'sekolah', 'buku']
    },
    {
      keywords: ['obat', 'dokter', 'vitamin', 'sakit', 'klinik', 'apotek', 'sakit', 'sehat', 'kesehatan', 'rs', 'rumah sakit'],
      categoryNames: ['kesehatan', 'medis', 'obat']
    },
    {
      keywords: ['listrik', 'air', 'wifi', 'internet', 'pulsa', 'kuota', 'bpjs', 'tagihan', 'utilitas', 'netflix', 'spotify', 'youtube', 'langganan'],
      categoryNames: ['tagihan', 'utilitas', 'langganan', 'rutin']
    },
    {
      keywords: ['nonton', 'bioskop', 'game', 'liburan', 'wisata', 'rekreasi', 'hiburan', 'konser', 'karaoke', 'jalan-jalan'],
      categoryNames: ['hiburan', 'rekreasi', 'hobi', 'entertainment']
    }
  ];

  for (const map of mapping) {
    const hasKeyword = map.keywords.some(kw => name.includes(kw));
    if (hasKeyword) {
      const matchedCat = categories.find(c =>
        map.categoryNames.some(targetName => c.name.toLowerCase().includes(targetName))
      );
      if (matchedCat) return matchedCat;
    }
  }

  const belanjaCat = categories.find(c => c.name.toLowerCase().includes('belanja'));
  if (belanjaCat) return belanjaCat;

  const lainnyaCat = categories.find(c => c.name.toLowerCase().includes('lain'));
  if (lainnyaCat) return lainnyaCat;

  return categories[0];
};

// Helper function to smart match planned vs realized items
const isSmartMatch = (nameA: string, nameB: string) => {
  const stopWords = new Set([
    'dan', 'atau', 'di', 'ke', 'dari', 'untuk', 'dengan', 'yang', 'ini', 'itu', 'pada',
    'pcs', 'box', 'pack', 'pak', 'bks', 'bungkus', 'botol', 'kaleng', 'biji',
    'and', 'or', 'in', 'to', 'for', 'with', 'the', 'a', 'an', 'at', 'on', 'of', 'baru'
  ]);
  const normalize = (name: string) => {
    return (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));
  };
  const wordsA = normalize(nameA);
  const wordsB = normalize(nameB);
  
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  return wordsA.some(word => wordsB.includes(word));
};

export default function ShoppingTab({ colors, insets }: ShoppingTabProps) {
  const themeColor = colors.tint
  const { user, api } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const colorScheme = useColorScheme() ?? 'dark'

  const [plans, setPlans] = useState<ShoppingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'daily' | 'monthly' | 'realized'>('all')

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editPlanId, setEditPlanId] = useState<string | null>(null)
  const [planName, setPlanName] = useState('')
  const [planDate, setPlanDate] = useState(getLocalToday())
  const [planType, setPlanType] = useState<'daily' | 'monthly'>('daily')
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState<ShoppingPlan | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const [duplicateDate, setDuplicateDate] = useState(getLocalToday())
  const [showDuplicateDatePicker, setShowDuplicateDatePicker] = useState(false)

  // Realization modal state
  const [showRealizationModal, setShowRealizationModal] = useState(false)
  const [realizationPlan, setRealizationPlan] = useState<ShoppingPlan | null>(null)
  const [realizationItems, setRealizationItems] = useState<ShoppingItem[]>([])
  const [autoSaveTransaction, setAutoSaveTransaction] = useState(true)
  const [isScanningReceipt, setIsScanningReceipt] = useState(false)

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewPlan, setReviewPlan] = useState<ShoppingPlan | null>(null)

  const openReviewModal = (plan: ShoppingPlan) => {
    setReviewPlan(plan)
    setShowReviewModal(true)
  }

  // Summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryPlan, setSummaryPlan] = useState<ShoppingPlan | null>(null)
  const [checkedSummaryItems, setCheckedSummaryItems] = useState<Record<string, boolean>>({})

  const openSummaryModal = (plan: ShoppingPlan) => {
    setSummaryPlan(plan)
    setCheckedSummaryItems({})
    setShowSummaryModal(true)
  }

  const toggleSummaryItem = (itemId: string) => {
    setCheckedSummaryItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const loadPlans = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await api.shoppingPlans.getAll()
      if (error) throw error
      setPlans(data || [])
    } catch (err: any) {
      console.error('Failed to load shopping plans:', err)
      Alert.alert('Error', 'Gagal memuat rencana belanja')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadPlans()
    }, [activeWorkspace])
  )

  const generateItemId = () => 'item_' + Math.random().toString(36).substring(2, 11)

  const openAddModal = () => {
    setEditPlanId(null)
    setPlanName('')
    setPlanDate(getLocalToday())
    setPlanType('daily')
    setItems([
      {
        id: generateItemId(),
        name: '',
        qty: 1,
        unitPrice: 0,
        total: 0,
        isRealized: false,
      },
    ])
    setShowFormModal(true)
  }

  const openEditModal = (plan: ShoppingPlan) => {
    setEditPlanId(plan.id)
    setPlanName(plan.name)
    setPlanDate(plan.date)
    setPlanType(plan.type)
    setItems(plan.items.map(item => ({ ...item })))
    setShowFormModal(true)
  }

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        id: generateItemId(),
        name: '',
        qty: 1,
        unitPrice: 0,
        total: 0,
        isRealized: false,
      },
    ])
  }

  const handleRemoveItemRow = (id: string) => {
    if (items.length <= 1) {
      Alert.alert('Peringatan', 'Rencana belanja harus memiliki minimal 1 barang.')
      return
    }
    setItems(items.filter(item => item.id !== id))
  }

  const handleUpdateItemValue = (id: string, field: keyof ShoppingItem, val: any) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: val }
          // Compute total
          if (field === 'qty' || field === 'unitPrice') {
            updated.total = updated.qty * updated.unitPrice
          }
          return updated
        }
        return item
      })
    )
  }

  const handleUpdateRealizationItem = (id: string, field: keyof ShoppingItem, val: any) => {
    setRealizationItems(
      realizationItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: val }
          if (field === 'qty' || field === 'unitPrice') {
            updated.total = updated.qty * updated.unitPrice
          }
          return updated
        }
        return item
      })
    )
  }

  const handleSavePlan = async () => {
    if (!user) return
    if (!planName.trim()) {
      Alert.alert('Peringatan', 'Nama rencana tidak boleh kosong.')
      return
    }

    const invalidItem = items.some(item => !item.name.trim())
    if (invalidItem) {
      Alert.alert('Peringatan', 'Semua nama barang harus diisi.')
      return
    }

    // Compute totals
    const totalPlanned = items.reduce((sum, item) => sum + item.total, 0)
    const totalRealized = items.reduce((sum, item) => {
      if (item.isRealized) {
        return sum + (item.realizedAmount !== undefined ? item.realizedAmount : item.total)
      }
      return sum
    }, 0)
    const isAllRealized = editPlanId ? (plans.find(p => p.id === editPlanId)?.is_realized || false) : false

    const payload = {
      name: planName.trim(),
      date: planDate,
      type: planType,
      items: items.map(item => ({
        id: item.id,
        name: item.name.trim(),
        qty: Number(item.qty) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.qty) || 1) * (Number(item.unitPrice) || 0),
        isRealized: item.isRealized,
        realizedAmount: item.isRealized
          ? (item.realizedAmount !== undefined ? Number(item.realizedAmount) : (Number(item.qty) || 1) * (Number(item.unitPrice) || 0))
          : undefined,
      })),
      total_planned: totalPlanned,
      total_realized: totalRealized,
      is_realized: isAllRealized,
    }

    try {
      if (editPlanId) {
        const { error } = await api.shoppingPlans.update(editPlanId, payload)
        if (error) throw error
      } else {
        const { error } = await api.shoppingPlans.create(user.id, payload)
        if (error) throw error
      }
      setShowFormModal(false)
      loadPlans()
    } catch (err: any) {
      console.error('Failed to save plan:', err)
      Alert.alert('Error', 'Gagal menyimpan rencana belanja')
    }
  }

  const handleDeletePlan = (id: string) => {
    Alert.alert(
      'Hapus Rencana',
      'Apakah Anda yakin ingin menghapus rencana belanja ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await api.shoppingPlans.delete(id)
              if (error) throw error
              loadPlans()
            } catch (err: any) {
              console.error('Failed to delete plan:', err)
              Alert.alert('Error', 'Gagal menghapus rencana belanja')
            }
          },
        },
      ]
    )
  }

  const openDuplicateModal = (plan: ShoppingPlan) => {
    setDuplicateSource(plan)
    setDuplicateName(`${plan.name} (Salin)`)
    setDuplicateDate(getLocalToday())
    setShowDuplicateModal(true)
  }

  const handleSaveDuplicate = async () => {
    if (!user || !duplicateSource) return
    if (!duplicateName.trim()) {
      Alert.alert('Peringatan', 'Nama rencana baru tidak boleh kosong.')
      return
    }

    // Reset items to unrealized for copy
    const copiedItems = duplicateSource.items.map(item => ({
      ...item,
      id: 'item_' + Math.random().toString(36).substring(2, 11),
      isRealized: false,
      realizedAmount: undefined,
    }))

    const totalPlanned = copiedItems.reduce((sum, item) => sum + item.total, 0)

    const payload = {
      name: duplicateName.trim(),
      date: duplicateDate,
      type: duplicateSource.type,
      items: copiedItems,
      total_planned: totalPlanned,
      total_realized: 0,
      is_realized: false,
    }

    try {
      const { error } = await api.shoppingPlans.create(user.id, payload)
      if (error) throw error
      setShowDuplicateModal(false)
      loadPlans()
    } catch (err: any) {
      console.error('Failed to duplicate plan:', err)
      Alert.alert('Error', 'Gagal menyalin rencana belanja')
    }
  }

  const openRealizationModal = (plan: ShoppingPlan) => {
    setRealizationPlan(plan)
    setRealizationItems(
      plan.items.map(item => ({
        ...item,
        isRealized: true,
        realizedAmount: item.realizedAmount ?? item.total,
      }))
    )
    setAutoSaveTransaction(true)
    setShowRealizationModal(true)
  }

  const handleSaveRealization = async () => {
    if (!user || !realizationPlan) return
    const invalidItem = realizationItems.some(item => !item.name.trim())
    if (invalidItem) {
      Alert.alert('Peringatan', 'Semua nama barang harus diisi.')
      return
    }

    // Extract the original planned items from the realizationPlan
    const originalItems = realizationPlan.items.map(item => ({
      id: item.id,
      name: item.plannedName || item.name,
      qty: item.plannedQty !== undefined ? item.plannedQty : item.qty,
      unitPrice: item.plannedUnitPrice !== undefined ? item.plannedUnitPrice : item.unitPrice,
      total: item.plannedTotal !== undefined ? item.plannedTotal : item.total,
    }))

    // Perform smart matching between originalItems and realizationItems
    const matchedOriginalIds = new Set<string>()
    const mergedItems: ShoppingItem[] = []

    for (const realized of realizationItems) {
      // Direct match by ID first
      let match = originalItems.find(orig => orig.id === realized.id)

      if (!match) {
        // Fallback: smart match by name
        match = originalItems.find(orig => 
          !matchedOriginalIds.has(orig.id) && isSmartMatch(orig.name, realized.name)
        )
      }

      if (match) {
        matchedOriginalIds.add(match.id)
        mergedItems.push({
          id: realized.id,
          name: realized.name.trim(), // Use realized/scanned name
          qty: realized.qty,
          unitPrice: realized.unitPrice,
          total: realized.total,
          isRealized: true,
          realizedAmount: realized.total,
          plannedName: match.name,
          plannedQty: match.qty,
          plannedUnitPrice: match.unitPrice,
          plannedTotal: match.total,
        })
      } else {
        // New item in realization
        mergedItems.push({
          id: realized.id,
          name: realized.name.trim(),
          qty: realized.qty,
          unitPrice: realized.unitPrice,
          total: realized.total,
          isRealized: true,
          realizedAmount: realized.total,
        })
      }
    }

    // Add unmatched planned items (planned but not realized)
    for (const orig of originalItems) {
      if (!matchedOriginalIds.has(orig.id)) {
        mergedItems.push({
          id: orig.id,
          name: orig.name,
          qty: 0,
          unitPrice: 0,
          total: 0,
          isRealized: false,
          realizedAmount: undefined,
          plannedName: orig.name,
          plannedQty: orig.qty,
          plannedUnitPrice: orig.unitPrice,
          plannedTotal: orig.total,
        })
      }
    }

    const totalRealized = realizationItems.reduce((sum, item) => sum + item.total, 0)

    try {
      // Update plan
      const { error } = await api.shoppingPlans.update(realizationPlan.id, {
        items: mergedItems,
        total_realized: totalRealized,
        is_realized: true,
      })
      if (error) throw error

      // Auto save transactions per item
      if (autoSaveTransaction && realizationItems.length > 0) {
        const { data: catData } = await api.categories.getAll()
        const expenseCategories = catData?.filter(c => c.type === 'expense') || []

        for (const item of realizationItems) {
          if (item.total <= 0) continue
          
          const matchedCat = categorizeItem(item.name, expenseCategories)
          
          await api.transactions.create(user.id, {
            type: 'expense',
            amount: item.total,
            description: `${item.name} (${item.qty}x @ Rp ${formatCurrency(item.unitPrice)}) - ${realizationPlan.name}`,
            date: getLocalToday(),
            category_id: matchedCat?.id,
          })
        }
      }

      setShowRealizationModal(false)
      loadPlans()
    } catch (err: any) {
      console.error('Failed to realize plan:', err)
      Alert.alert('Error', 'Gagal merealisasikan rencana belanja')
    }
  }

  const handleTogglePlanRealized = async (plan: ShoppingPlan) => {
    const targetState = !plan.is_realized
    const updatedItems = plan.items.map(item => ({
      ...item,
      isRealized: targetState,
      realizedAmount: targetState ? item.total : undefined,
      plannedName: targetState ? (item.plannedName || item.name) : undefined,
      plannedQty: targetState ? (item.plannedQty !== undefined ? item.plannedQty : item.qty) : undefined,
      plannedUnitPrice: targetState ? (item.plannedUnitPrice !== undefined ? item.plannedUnitPrice : item.unitPrice) : undefined,
      plannedTotal: targetState ? (item.plannedTotal !== undefined ? item.plannedTotal : item.total) : undefined,
    }))

    const totalRealized = targetState ? plan.total_planned : 0

    try {
      const { error } = await api.shoppingPlans.update(plan.id, {
        items: updatedItems,
        total_realized: totalRealized,
        is_realized: targetState,
      })
      if (error) throw error
      loadPlans()
    } catch (err: any) {
      console.error('Failed to update status plan:', err)
      Alert.alert('Error', 'Gagal memperbarui status rencana')
    }
  }

  // Filters plans based on activeFilter
  const filteredPlans = plans.filter(p => {
    if (activeFilter === 'daily') return p.type === 'daily' && !p.is_realized
    if (activeFilter === 'monthly') return p.type === 'monthly' && !p.is_realized
    if (activeFilter === 'realized') return p.is_realized
    return !p.is_realized // 'all' shows all active plans
  })

  // Calculate overall planned & realized totals for summary
  const totalSummaryPlanned = plans.filter(p => !p.is_realized).reduce((sum, p) => sum + p.total_planned, 0)
  const totalSummaryRealized = plans.filter(p => !p.is_realized).reduce((sum, p) => sum + p.total_realized, 0)

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <FontAwesome name="shopping-cart" size={18} color="#3b82f6" />
          </View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>ANGGARAN BELANJA</Text>
          <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>Rp {formatCurrency(totalSummaryPlanned)}</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <FontAwesome name="check-circle" size={18} color="#10b981" />
          </View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>TOTAL REALISASI</Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>Rp {formatCurrency(totalSummaryRealized)}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'all' && { backgroundColor: themeColor }]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' ? styles.filterTextActive : { color: colors.textSecondary }]}>
            Semua
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'daily' && { backgroundColor: themeColor }]}
          onPress={() => setActiveFilter('daily')}
        >
          <Text style={[styles.filterText, activeFilter === 'daily' ? styles.filterTextActive : { color: colors.textSecondary }]}>
            Harian
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'monthly' && { backgroundColor: themeColor }]}
          onPress={() => setActiveFilter('monthly')}
        >
          <Text style={[styles.filterText, activeFilter === 'monthly' ? styles.filterTextActive : { color: colors.textSecondary }]}>
            Bulanan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'realized' && { backgroundColor: themeColor }]}
          onPress={() => setActiveFilter('realized')}
        >
          <Text style={[styles.filterText, activeFilter === 'realized' ? styles.filterTextActive : { color: colors.textSecondary }]}>
            Selesai
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, { backgroundColor: themeColor + '15', borderColor: themeColor, borderWidth: 1 }]}
          onPress={openAddModal}
        >
          <Text style={[styles.filterText, { color: themeColor, fontWeight: '800' }]}>
            + Rencana
          </Text>
        </TouchableOpacity>
      </View>

      {/* Plan List */}
      {filteredPlans.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="Tidak Ada Rencana Belanja"
          subtitle={
            activeFilter === 'realized'
              ? 'Belum ada rencana belanja yang direalisasikan.'
              : 'Susun rencana belanja Anda agar pengeluaran terkendali.'
          }
          actionLabel={activeFilter !== 'realized' ? '+ Rencana Baru' : undefined}
          onAction={activeFilter !== 'realized' ? openAddModal : undefined}
        />
      ) : (
        filteredPlans.map(plan => {
          const itemsRealizedCount = plan.items.filter(i => i.isRealized).length
          const totalItemsCount = plan.items.length
          const progressPercent = totalItemsCount > 0 ? Math.round((itemsRealizedCount / totalItemsCount) * 100) : 0

          return (
            <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: plan.type === 'daily' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)' }]}>
                    <Text style={[styles.badgeText, { color: plan.type === 'daily' ? '#3b82f6' : '#8b5cf6' }]}>
                      {plan.type === 'daily' ? 'Harian' : 'Bulanan'}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: plan.is_realized ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                    <Text style={[styles.badgeText, { color: plan.is_realized ? '#10b981' : '#f59e0b' }]}>
                      {plan.is_realized ? 'Selesai' : 'Aktif'}
                    </Text>
                  </View>
                </View>

                {/* Quick check toggle */}
                <TouchableOpacity
                  onPress={() => handleTogglePlanRealized(plan)}
                  style={[styles.quickCheck, { borderColor: plan.is_realized ? '#10b981' : colors.border, backgroundColor: plan.is_realized ? '#10b981' : 'transparent' }]}
                >
                  {plan.is_realized && <FontAwesome name="check" size={10} color="#fff" />}
                </TouchableOpacity>
              </View>

              {/* Clickable Card Body */}
              <TouchableOpacity
                activeOpacity={plan.is_realized ? 1 : 0.7}
                disabled={plan.is_realized}
                onPress={() => openSummaryModal(plan)}
              >
                {/* Plan Name & Date */}
                <Text style={[styles.planTitle, { color: colors.text }]}>{plan.name}</Text>
                <View style={styles.dateRow}>
                  <FontAwesome name="calendar" size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(plan.date)}</Text>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTextRow}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Barang dibeli</Text>
                    <Text style={[styles.progressVal, { color: themeColor }]}>{itemsRealizedCount}/{totalItemsCount} ({progressPercent}%)</Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: themeColor }]} />
                  </View>
                </View>

                {/* Cost comparison */}
                <View style={[styles.priceCompareRow, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Rencana</Text>
                    <Text style={[styles.priceValText, { color: colors.text }]}>Rp {formatCurrency(plan.total_planned)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Realisasi</Text>
                    <Text style={[styles.priceValText, { color: plan.total_realized > 0 ? '#10b981' : colors.textSecondary }]}>
                      Rp {formatCurrency(plan.total_realized)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {plan.is_realized ? (
                  <TouchableOpacity
                    onPress={() => openReviewModal(plan)}
                    style={[styles.actionBtn, { backgroundColor: colors.border, flex: 1 }]}
                  >
                    <FontAwesome name="file-text" size={12} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Review</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => openEditModal(plan)}
                    style={[styles.actionBtn, { backgroundColor: colors.border, flex: 1 }]}
                  >
                    <FontAwesome name="edit" size={12} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Ubah</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => openDuplicateModal(plan)}
                  style={[styles.actionBtn, { backgroundColor: colors.border, flex: 1 }]}
                >
                  <FontAwesome name="copy" size={12} color={colors.textSecondary} />
                  <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Salin</Text>
                </TouchableOpacity>

                {!plan.is_realized && (
                  <TouchableOpacity
                    onPress={() => openRealizationModal(plan)}
                    style={[styles.actionBtn, { backgroundColor: themeColor, borderWidth: 0, flex: 1 }]}
                  >
                    <FontAwesome name="shopping-bag" size={12} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: '#fff', fontWeight: 'bold' }]}>Realisasi</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => handleDeletePlan(plan.id)}
                  style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                >
                  <FontAwesome name="trash" size={12} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )
        })
      )}

      {/* Form BottomSheet */}
      <BottomSheet
        visible={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editPlanId ? 'Ubah Rencana Belanja' : 'Buat Rencana Belanja'}
        maxHeight="90%"
      >
        <View style={styles.modalContent}>
          {/* Plan Name */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nama Rencana</Text>
          <TextInput
            placeholder="Mis: Belanja Bulanan"
            placeholderTextColor={colors.textMuted}
            value={planName}
            onChangeText={setPlanName}
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          />

          {/* Plan Type */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tipe Belanja</Text>
          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              onPress={() => setPlanType('daily')}
              style={[
                styles.typeOption,
                { borderColor: colors.border, backgroundColor: planType === 'daily' ? themeColor + '15' : 'transparent' },
                planType === 'daily' && { borderColor: themeColor },
              ]}
            >
              <Text style={[styles.typeOptionText, { color: planType === 'daily' ? themeColor : colors.textSecondary }]}>
                Harian
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPlanType('monthly')}
              style={[
                styles.typeOption,
                { borderColor: colors.border, backgroundColor: planType === 'monthly' ? themeColor + '15' : 'transparent' },
                planType === 'monthly' && { borderColor: themeColor },
              ]}
            >
              <Text style={[styles.typeOptionText, { color: planType === 'monthly' ? themeColor : colors.textSecondary }]}>
                Bulanan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tanggal Belanja</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.inputBg, justifyContent: 'center' }]}
          >
            <Text style={{ color: colors.text }}>{formatDate(planDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(planDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios')
                if (selectedDate) {
                  const offset = selectedDate.getTimezoneOffset()
                  const fixedDate = new Date(selectedDate.getTime() - offset * 60 * 1000)
                  setPlanDate(fixedDate.toISOString().split('T')[0])
                }
              }}
            />
          )}

          {/* Items Editor Section */}
          <View style={styles.itemsHeaderRow}>
            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Daftar Barang</Text>
            <TouchableOpacity onPress={handleAddItemRow} style={[styles.addItemBtn, { backgroundColor: themeColor }]}>
              <FontAwesome name="plus" size={10} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.addItemBtnText}>Barang</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, idx) => (
            <View key={item.id} style={[styles.itemEditorCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <View style={styles.itemRowHeader}>
                <Text style={[styles.itemNumberText, { color: colors.textMuted }]}>Barang #{idx + 1}</Text>
                <TouchableOpacity onPress={() => handleRemoveItemRow(item.id)}>
                  <FontAwesome name="times-circle" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <TextInput
                placeholder="Nama barang"
                placeholderTextColor={colors.textMuted}
                value={item.name}
                onChangeText={val => handleUpdateItemValue(item.id, 'name', val)}
                style={[styles.itemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
              />

              {/* Qty & Price Row */}
              <View style={styles.itemParamsRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.itemSublabel, { color: colors.textMuted }]}>Qty</Text>
                  <TextInput
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={item.qty.toString()}
                    onChangeText={val => handleUpdateItemValue(item.id, 'qty', parseInt(val.replace(/[^0-9]/g, '')) || 0)}
                    style={[styles.itemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                  />
                </View>

                <View style={{ flex: 2 }}>
                  <Text style={[styles.itemSublabel, { color: colors.textMuted }]}>Harga Satuan (Rp)</Text>
                  <TextInput
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={item.unitPrice === 0 ? '' : item.unitPrice.toLocaleString('id-ID')}
                    onChangeText={val => handleUpdateItemValue(item.id, 'unitPrice', parseAmount(val))}
                    style={[styles.itemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                  />
                </View>
              </View>

              {/* Realization state removed from Add/Edit Plan form */}


              {/* Row Total Display */}
              <View style={styles.itemTotalRow}>
                <Text style={[styles.itemTotalLabel, { color: colors.textSecondary }]}>Estimasi Subtotal:</Text>
                <Text style={[styles.itemTotalVal, { color: colors.text }]}>Rp {formatCurrency(item.total)}</Text>
              </View>
            </View>
          ))}

          {/* Form Footer with Sums */}
          <View style={[styles.formSumBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Total Anggaran:</Text>
              <Text style={[styles.sumValue, { color: '#3b82f6' }]}>
                Rp {formatCurrency(items.reduce((sum, item) => sum + item.total, 0))}
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity onPress={handleSavePlan} style={[styles.saveBtn, { backgroundColor: themeColor }]}>
            <Text style={styles.saveBtnText}>Simpan Rencana</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Duplicate Plan Modal */}
      <BottomSheet
        visible={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Salin Rencana Belanja"
      >
        <View style={styles.modalContent}>
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nama Rencana Baru</Text>
          <TextInput
            placeholder="Salin nama rencana"
            placeholderTextColor={colors.textMuted}
            value={duplicateName}
            onChangeText={setDuplicateName}
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          />

          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tanggal Belanja Baru</Text>
          <TouchableOpacity
            onPress={() => setShowDuplicateDatePicker(true)}
            style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.inputBg, justifyContent: 'center' }]}
          >
            <Text style={{ color: colors.text }}>{formatDate(duplicateDate)}</Text>
          </TouchableOpacity>
          {showDuplicateDatePicker && (
            <DateTimePicker
              value={new Date(duplicateDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDuplicateDatePicker(Platform.OS === 'ios')
                if (selectedDate) {
                  const offset = selectedDate.getTimezoneOffset()
                  const fixedDate = new Date(selectedDate.getTime() - offset * 60 * 1000)
                  setDuplicateDate(fixedDate.toISOString().split('T')[0])
                }
              }}
            />
          )}

          <TouchableOpacity onPress={handleSaveDuplicate} style={[styles.saveBtn, { backgroundColor: themeColor }]}>
            <Text style={styles.saveBtnText}>Salin & Buat Rencana</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Realization Modal */}
      <BottomSheet
        visible={showRealizationModal}
        onClose={() => setShowRealizationModal(false)}
        title="Realisasi Rencana Belanja"
        maxHeight="90%"
      >
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={[styles.scanReceiptBtn, { borderColor: themeColor, backgroundColor: themeColor + '15' }]}
            onPress={async () => {
              if (!user || !api) return
              try {
                setIsScanningReceipt(true)
                // Use a dynamic import or require for ImagePicker if it's imported at top level
                const ImagePicker = require('expo-image-picker')
                const perm = await ImagePicker.requestCameraPermissionsAsync()
                if (!perm.granted) {
                  Alert.alert('Izin Diperlukan', 'Izinkan akses kamera untuk foto nota.')
                  setIsScanningReceipt(false)
                  return
                }
                const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.3, base64: true })
                if (result.canceled || !result.assets?.[0]) {
                  setIsScanningReceipt(false)
                  return
                }
                const asset = result.assets[0]
                if (!asset.base64) {
                  setIsScanningReceipt(false)
                  return
                }

                const { data: scanResult, error: scanError } = await api.supabase.functions.invoke('scan-receipt', {
                  body: { image: asset.base64, mimeType: asset.mimeType || 'image/jpeg' },
                })

                if (scanError || !scanResult?.transactions || scanResult.transactions.length === 0) {
                  Alert.alert('Gagal', 'Tidak bisa membaca nota ini. Pastikan foto jelas dan coba lagi.')
                  setIsScanningReceipt(false)
                  return
                }

                const newItems = scanResult.transactions.map((tx: any) => {
                  const qty = Number(tx.qty) || 1
                  const amount = Number(tx.amount) || 0
                  const unitPrice = Number(tx.unit_price) || (qty > 0 ? Math.round(amount / qty) : amount) || 0
                  const total = amount || (qty * unitPrice)
                  return {
                    id: 'item_' + Math.random().toString(36).substring(2, 11),
                    name: tx.description || 'Item Baru',
                    qty: qty,
                    unitPrice: unitPrice,
                    total: total,
                    isRealized: true,
                    realizedAmount: total,
                  }
                })

                if (newItems.length > 0) {
                  // Prepend or replace? Let's append or replace based on user preference, but replace is safer for "otomatis isi"
                  setRealizationItems(newItems)
                }

                setIsScanningReceipt(false)
              } catch (err) {
                console.error(err)
                Alert.alert('Error', 'Terjadi kesalahan saat memproses nota.')
                setIsScanningReceipt(false)
              }
            }}
            disabled={isScanningReceipt}
          >
            {isScanningReceipt ? (
              <Text style={[styles.scanReceiptText, { color: themeColor }]}>Membaca nota...</Text>
            ) : (
              <>
                <FontAwesome name="camera" size={14} color={themeColor} style={{ marginRight: 8 }} />
                <Text style={[styles.scanReceiptText, { color: themeColor }]}>Scan Nota Belanja</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.itemsHeaderRow}>
            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Daftar Realisasi Barang</Text>
            <TouchableOpacity onPress={() => {
              setRealizationItems([
                ...realizationItems,
                { id: 'item_' + Math.random().toString(36).substring(2, 11), name: '', qty: 1, unitPrice: 0, total: 0, isRealized: true }
              ])
            }} style={[styles.addItemBtn, { backgroundColor: themeColor }]}>
              <FontAwesome name="plus" size={10} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.addItemBtnText}>Barang</Text>
            </TouchableOpacity>
          </View>

          {realizationItems.map((item, idx) => (
            <View key={item.id} style={[styles.itemEditorCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <View style={styles.itemRowHeader}>
                <Text style={[styles.itemNumberText, { color: colors.textMuted }]}>Item Realisasi #{idx + 1}</Text>
                <TouchableOpacity onPress={() => {
                  setRealizationItems(realizationItems.filter(i => i.id !== item.id))
                }}>
                  <FontAwesome name="times-circle" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Nama item"
                placeholderTextColor={colors.textMuted}
                value={item.name}
                onChangeText={val => handleUpdateRealizationItem(item.id, 'name', val)}
                style={[styles.itemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
              />

              <View style={styles.itemParamsRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.itemSublabel, { color: colors.textMuted }]}>Qty</Text>
                  <TextInput
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={item.qty.toString()}
                    onChangeText={val => handleUpdateRealizationItem(item.id, 'qty', parseInt(val.replace(/[^0-9]/g, '')) || 0)}
                    style={[styles.itemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                  />
                </View>

                <View style={{ flex: 2 }}>
                  <Text style={[styles.itemSublabel, { color: colors.textMuted }]}>Harga Satuan (Rp)</Text>
                  <TextInput
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={item.unitPrice === 0 ? '' : item.unitPrice.toLocaleString('id-ID')}
                    onChangeText={val => handleUpdateRealizationItem(item.id, 'unitPrice', parseAmount(val))}
                    style={[styles.itemInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                  />
                </View>
              </View>

              <View style={styles.itemTotalRow}>
                <Text style={[styles.itemTotalLabel, { color: colors.textSecondary }]}>Subtotal:</Text>
                <Text style={[styles.itemTotalVal, { color: colors.text }]}>Rp {formatCurrency(item.total)}</Text>
              </View>
            </View>
          ))}

          <View style={[styles.formSumBox, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 16 }]}>
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Total Realisasi:</Text>
              <Text style={[styles.sumValue, { color: '#10b981' }]}>
                Rp {formatCurrency(realizationItems.reduce((sum, item) => sum + item.total, 0))}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setAutoSaveTransaction(!autoSaveTransaction)}
            style={styles.autoSaveCheckboxRow}
          >
            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: autoSaveTransaction ? '#10b981' : 'transparent' }]}>
              {autoSaveTransaction && <FontAwesome name="check" size={8} color="#fff" />}
            </View>
            <Text style={[styles.autoSaveCheckboxLabel, { color: colors.text }]}>Simpan transaksi otomatis</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSaveRealization} style={[styles.saveBtn, { backgroundColor: themeColor }]}>
            <Text style={styles.saveBtnText}>Simpan Realisasi</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Review Modal */}
      <BottomSheet
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Rencana vs Realisasi"
        maxHeight="90%"
      >
        {reviewPlan && (
          <View style={styles.modalContent}>
            <Text style={[styles.reviewPlanTitle, { color: colors.text }]}>{reviewPlan.name}</Text>
            <Text style={[styles.reviewPlanDate, { color: colors.textMuted }]}>Tanggal: {formatDate(reviewPlan.date)}</Text>
            
            <View style={styles.reviewTableHeader}>
              <Text style={[styles.reviewTableHeaderText, { color: colors.textSecondary, flex: 2 }]}>Barang</Text>
              <Text style={[styles.reviewTableHeaderText, { color: colors.textSecondary, flex: 1.2, textAlign: 'right' }]}>Rencana</Text>
              <Text style={[styles.reviewTableHeaderText, { color: colors.textSecondary, flex: 1.2, textAlign: 'right' }]}>Realisasi</Text>
            </View>

            <View style={{ marginVertical: 8 }}>
              {reviewPlan.items.map((item, index) => {
                const isPlanned = item.plannedTotal !== undefined || !item.isRealized
                const isRealized = item.isRealized && item.realizedAmount !== undefined

                const nameToDisplay = item.name
                const plannedTotal = item.plannedTotal !== undefined ? item.plannedTotal : item.total
                const realizedTotal = item.realizedAmount !== undefined ? item.realizedAmount : 0

                let plannedText = '-'
                let realizedText = '-'
                let diffText = ''
                let diffColor = colors.textMuted

                if (isPlanned) {
                  plannedText = `Rp ${formatCurrency(plannedTotal)}`
                }
                
                if (isRealized) {
                  realizedText = `Rp ${formatCurrency(realizedTotal)}`
                }

                if (isPlanned && isRealized) {
                  const diff = realizedTotal - plannedTotal
                  diffColor = diff > 0 ? '#ef4444' : diff < 0 ? '#10b981' : colors.textMuted
                  diffText = `${diff > 0 ? '+' : ''}Rp ${formatCurrency(diff)}`
                } else if (isPlanned && !isRealized) {
                  diffColor = '#10b981'
                  diffText = `Hemat Rp ${formatCurrency(plannedTotal)}`
                } else if (!isPlanned && isRealized) {
                  diffColor = '#ef4444'
                  diffText = `+Rp ${formatCurrency(realizedTotal)}`
                }

                return (
                  <View key={item.id || index} style={[styles.reviewTableRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.reviewItemName, { color: colors.text }]}>{nameToDisplay}</Text>
                      {isPlanned && isRealized && (
                        <Text style={[styles.reviewItemQty, { color: colors.textMuted }]}>
                          Rencana: {(item.plannedQty !== undefined ? item.plannedQty : item.qty)}x @ Rp {formatCurrency(item.plannedUnitPrice !== undefined ? item.plannedUnitPrice : item.unitPrice)} | Realisasi: {item.qty}x @ Rp {formatCurrency(item.unitPrice)}
                        </Text>
                      )}
                      {isPlanned && !isRealized && (
                        <Text style={[styles.reviewItemQty, { color: colors.textMuted }]}>
                          Rencana: {(item.plannedQty !== undefined ? item.plannedQty : item.qty)}x @ Rp {formatCurrency(item.plannedUnitPrice !== undefined ? item.plannedUnitPrice : item.unitPrice)} (Tidak dibeli)
                        </Text>
                      )}
                      {!isPlanned && isRealized && (
                        <Text style={[styles.reviewItemQty, { color: colors.textMuted }]}>
                          Realisasi: {item.qty}x @ Rp {formatCurrency(item.unitPrice)} (Baru)
                        </Text>
                      )}
                    </View>
                    
                    <Text style={[styles.reviewTableVal, { color: colors.text, flex: 1.2 }]}>
                      {plannedText}
                    </Text>
                    
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Text style={[styles.reviewTableVal, { color: isRealized ? '#10b981' : colors.textMuted, fontWeight: '700' }]}>
                        {realizedText}
                      </Text>
                      {diffText !== '' && (
                        <Text style={{ fontSize: 9, color: diffColor, fontWeight: '600', marginTop: 2 }}>
                          {diffText}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>

            <View style={[styles.reviewSummaryBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.sumRow}>
                <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Total Rencana Anggaran:</Text>
                <Text style={[styles.sumValue, { color: colors.text }]}>Rp {formatCurrency(reviewPlan.total_planned)}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Total Realisasi:</Text>
                <Text style={[styles.sumValue, { color: '#10b981' }]}>Rp {formatCurrency(reviewPlan.total_realized)}</Text>
              </View>
              
              <View style={styles.summaryDivider} />
              
              <View style={styles.sumRow}>
                <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Selisih Anggaran:</Text>
                {(() => {
                  const totalDiff = reviewPlan.total_realized - reviewPlan.total_planned
                  const totalDiffColor = totalDiff > 0 ? '#ef4444' : totalDiff < 0 ? '#10b981' : colors.text
                  return (
                    <Text style={[styles.sumValue, { color: totalDiffColor }]}>
                      {totalDiff > 0 ? 'Lebih Boros ' : totalDiff < 0 ? 'Hemat ' : ''}
                      Rp {formatCurrency(Math.abs(totalDiff))}
                    </Text>
                  )
                })()}
              </View>
            </View>

            <TouchableOpacity onPress={() => setShowReviewModal(false)} style={[styles.saveBtn, { backgroundColor: themeColor, marginBottom: Spacing.md }]}>
              <Text style={styles.saveBtnText}>Tutup Review</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      {/* Summary Modal */}
      <BottomSheet
        visible={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title="Ringkasan Daftar Belanja"
        maxHeight="80%"
      >
        {summaryPlan && (
          <View style={styles.modalContent}>
            <Text style={[styles.reviewPlanTitle, { color: colors.text, marginBottom: 4 }]}>{summaryPlan.name}</Text>
            <Text style={[styles.reviewPlanDate, { color: colors.textMuted, marginBottom: 16 }]}>
              Tanggal: {formatDate(summaryPlan.date)} • Tipe: {summaryPlan.type === 'daily' ? 'Harian' : 'Bulanan'}
            </Text>

            <View style={[styles.summaryTableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.summaryTableHeaderText, { color: colors.textSecondary, width: 40 }]}>No</Text>
              <Text style={[styles.summaryTableHeaderText, { color: colors.textSecondary, flex: 2 }]}>Nama Barang</Text>
              <Text style={[styles.summaryTableHeaderText, { color: colors.textSecondary, flex: 1, textAlign: 'right' }]}>Jumlah</Text>
            </View>

            <View style={{ marginVertical: 8 }}>
              {summaryPlan.items.map((item, index) => {
                const isChecked = !!checkedSummaryItems[item.id]
                return (
                  <TouchableOpacity
                    key={item.id || index}
                    activeOpacity={0.7}
                    onPress={() => toggleSummaryItem(item.id)}
                    style={[
                      styles.summaryTableRow,
                      { borderBottomColor: colors.border },
                      isChecked && { backgroundColor: colors.border + '20' }
                    ]}
                  >
                    <View style={{ width: 40, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[
                        styles.summaryCheckbox,
                        { borderColor: colors.border, backgroundColor: isChecked ? themeColor : 'transparent' }
                      ]}>
                        {isChecked && <FontAwesome name="check" size={8} color="#fff" />}
                      </View>
                      <Text style={[
                        styles.summaryItemNo,
                        { color: colors.textMuted },
                        isChecked && { textDecorationLine: 'line-through' }
                      ]}>
                        {index + 1}
                      </Text>
                    </View>

                    <Text style={[
                      styles.summaryItemName,
                      { color: colors.text, flex: 2 },
                      isChecked && { textDecorationLine: 'line-through', color: colors.textMuted }
                    ]}>
                      {item.name}
                    </Text>

                    <Text style={[
                      styles.summaryItemQty,
                      { color: colors.textSecondary, flex: 1, textAlign: 'right' },
                      isChecked && { textDecorationLine: 'line-through', color: colors.textMuted }
                    ]}>
                      {item.qty}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              onPress={() => setShowSummaryModal(false)}
              style={[styles.saveBtn, { backgroundColor: themeColor, marginTop: Spacing.md, marginBottom: Spacing.md }]}
            >
              <Text style={styles.saveBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 5,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 10,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  reviewPlanTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  reviewPlanDate: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  reviewTableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  reviewTableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  reviewTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reviewItemName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  reviewItemQty: {
    fontSize: 11,
    fontWeight: '600',
  },
  reviewTableVal: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  reviewSummaryBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginVertical: 8,
  },
  planCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg - 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  quickCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  priceCompareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginBottom: Spacing.md,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  priceValText: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  modalContent: {
    paddingVertical: Spacing.sm,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  typeOption: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  addItemBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  itemEditorCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  itemRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  itemParamsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  itemSublabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemRealizationBox: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  realizeCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  realizeCheckboxLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  itemTotalLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemTotalVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  formSumBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  sumLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  sumValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  saveBtn: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  scanReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  scanReceiptText: {
    fontSize: 13,
    fontWeight: '800',
  },
  autoSaveCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: Spacing.md,
  },
  autoSaveCheckboxLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryTableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  summaryTableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
  },
  summaryCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  summaryItemNo: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryItemQty: {
    fontSize: 13,
    fontWeight: '800',
  },
})
