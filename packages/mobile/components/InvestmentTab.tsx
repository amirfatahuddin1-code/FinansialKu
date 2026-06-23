import React, { useState, useEffect, useCallback } from 'react'
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
import { FontAwesome } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
import type { FinancialAccount, Category } from '@karsafin/shared'
import { BottomSheet, EmptyState } from '@/components'

interface InvestmentTabProps {
  colors: any
  insets: any
}

interface InvestmentAsset {
  id: string
  name: string
  type: 'saham' | 'reksadana' | 'emas' | 'obligasi' | 'crypto'
  units: number
  avgBuyPrice: number
  currentPrice: number
  accountId?: string   // ID akun keuangan investasi (pengganti platform string)
  platform: string     // Kept for backward compatibility display (filled from account name)
  purchaseDate?: string
  transactionId?: string // ID transaksi terkait pembelian di Supabase
  createdAt: string
}

const ASSET_TYPES = [
  { key: 'saham' as const, label: 'Saham', icon: 'line-chart', color: '#3b82f6', bg: '#3b82f620', unitLabel: 'lembar' },
  { key: 'reksadana' as const, label: 'Reksadana', icon: 'bar-chart', color: '#10b981', bg: '#10b98120', unitLabel: 'unit' },
  { key: 'emas' as const, label: 'Emas', icon: 'diamond', color: '#f59e0b', bg: '#f59e0b20', unitLabel: 'gram' },
  { key: 'obligasi' as const, label: 'Obligasi', icon: 'shield', color: '#6366f1', bg: '#6366f120', unitLabel: 'surat' },
  { key: 'crypto' as const, label: 'Crypto', icon: 'bolt', color: '#ef4444', bg: '#ef444420', unitLabel: 'koin' },
]

function getUnitLabel(type: InvestmentAsset['type']): string {
  return ASSET_TYPES.find(t => t.key === type)?.unitLabel ?? 'unit'
}

export default function InvestmentTab({ colors, insets }: InvestmentTabProps) {
  const { user, api } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const colorScheme = useColorScheme() ?? 'dark'

  const [assets, setAssets] = useState<InvestmentAsset[]>([])
  const [loading, setLoading] = useState(true)

  // Db references for recording transactions
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Modal form states
  const [showAddEditModal, setShowAddEditModal] = useState(false)
  const [editAssetId, setEditAssetId] = useState<string | null>(null)
  const [assetName, setAssetName] = useState('')
  const [assetType, setAssetType] = useState<'saham' | 'reksadana' | 'emas' | 'obligasi' | 'crypto'>('saham')
  const [assetUnits, setAssetUnits] = useState('')
  const [assetAvgPrice, setAssetAvgPrice] = useState('')
  const [assetCurrentPrice, setAssetCurrentPrice] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')   // Akun investasi (platform/broker)
  const [purchaseDate, setPurchaseDate] = useState(getLocalToday())
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Transaction sync options
  const [syncToTransactions, setSyncToTransactions] = useState(false)
  const [buySourceAccountId, setBuySourceAccountId] = useState('') // Akun sumber dana saat beli

  // Sell Modal states
  const [showSellModal, setShowSellModal] = useState(false)
  const [sellAsset, setSellAsset] = useState<InvestmentAsset | null>(null)
  const [sellUnits, setSellUnits] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellReceiverAccountId, setSellReceiverAccountId] = useState('')
  const [sellRecordTransaction, setSellRecordTransaction] = useState(true)

  // Bulk Price Update states
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkPrices, setBulkPrices] = useState<Record<string, string>>({})

  // Add New Investment Account states
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountBalance, setNewAccountBalance] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)

  const storageKey = user ? `karsafin_investments_${user.id}` : null

  // Filter only investment-type accounts for the platform/broker picker
  const investmentAccounts = accounts.filter(a => a.type === 'investment')
  const allAccounts = accounts  // all accounts for sell receiver

  const migrateFromAsyncStorage = async () => {
    if (!user || !storageKey) return
    try {
      const stored = await AsyncStorage.getItem(storageKey)
      if (stored) {
        const localAssets = JSON.parse(stored)
        for (const asset of localAssets) {
          await api.investmentAssets.create(user.id, {
            name: asset.name,
            type: asset.type,
            units: asset.units,
            avgBuyPrice: asset.avgBuyPrice,
            currentPrice: asset.currentPrice,
            platform: asset.platform,
            accountId: asset.accountId || undefined,
            purchaseDate: asset.purchaseDate || undefined,
            transactionId: asset.transactionId || undefined,
          })
        }
        await AsyncStorage.removeItem(storageKey)
      }
    } catch (err) {
      console.error('Failed to migrate investments from AsyncStorage:', err)
    }
  }

  // Fetch local and API data
  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      // 0. Migrate if needed
      if (storageKey) {
        await migrateFromAsyncStorage()
      }

      // 1. Load Assets from Database
      const { data: dbAssets } = await api.investmentAssets.getAll()
      setAssets(dbAssets || [])

      // 2. Load DB data (Accounts and Categories)
      const [accRes, catRes] = await Promise.all([
        api.accounts.getAll(),
        api.categories.getAll(),
      ])

      if (accRes.data) {
        setAccounts(accRes.data)
        // Default selected: first investment account
        const defaultInvAcc = accRes.data.find(a => a.type === 'investment') || accRes.data.find(a => a.is_default) || accRes.data[0]
        if (defaultInvAcc) setSelectedAccountId(defaultInvAcc.id)
        // Default sell receiver: first non-investment account
        const defaultReceiver = accRes.data.find(a => a.type !== 'investment' && a.is_default) || accRes.data.find(a => a.type !== 'investment') || accRes.data[0]
        if (defaultReceiver) setSellReceiverAccountId(defaultReceiver.id)
      }
      if (catRes.data) {
        setCategories(catRes.data)
      }
    } catch (err) {
      console.error('Failed to load investments data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, activeWorkspace])

  const openAddModal = () => {
    setEditAssetId(null)
    setAssetName('')
    setAssetType('saham')
    setAssetUnits('')
    setAssetAvgPrice('')
    setAssetCurrentPrice('')
    // Default platform/broker: first investment account
    const defAcc = investmentAccounts[0] || accounts[0]
    if (defAcc) setSelectedAccountId(defAcc.id)
    // Default source of funds: first non-investment account (bank/ewallet)
    const defSource = accounts.find(a => a.type !== 'investment' && a.is_default)
      || accounts.find(a => a.type !== 'investment')
      || accounts[0]
    if (defSource) setBuySourceAccountId(defSource.id)
    setPurchaseDate(getLocalToday())
    setSyncToTransactions(false)
    setShowAddEditModal(true)
  }

  const openAddAccountModal = () => {
    setNewAccountName('')
    setNewAccountBalance('')
    setShowAddAccountModal(true)
  }

  const handleCreateInvestmentAccount = async () => {
    if (!user) return
    if (!newAccountName.trim()) {
      Alert.alert('Peringatan', 'Nama akun tidak boleh kosong.')
      return
    }
    setSavingAccount(true)
    try {
      const initialBalance = parseAmount(newAccountBalance) || 0
      const { data: newAcc, error } = await api.accounts.create(user.id, {
        name: newAccountName.trim(),
        type: 'investment',
        icon: '📈',
        color: '#f59e0b',
        is_default: false,
        balance: initialBalance,
      })
      if (error) throw error
      if (newAcc) {
        // Add new account to local list & auto-select it
        const updatedAccounts = [...accounts, newAcc]
        setAccounts(updatedAccounts)
        setSelectedAccountId(newAcc.id)
      }
      setShowAddAccountModal(false)
      Alert.alert('Berhasil', `Akun "${newAccountName.trim()}" berhasil ditambahkan.`)
    } catch (err: any) {
      console.error('Failed to create investment account:', err)
      Alert.alert('Error', 'Gagal membuat akun investasi. Silakan coba lagi.')
    } finally {
      setSavingAccount(false)
    }
  }

  const openEditModal = (asset: InvestmentAsset) => {
    setEditAssetId(asset.id)
    setAssetName(asset.name)
    setAssetType(asset.type)
    setAssetUnits(asset.units.toString())
    setAssetAvgPrice(asset.avgBuyPrice.toLocaleString('id-ID'))
    setAssetCurrentPrice(asset.currentPrice.toLocaleString('id-ID'))
    setSelectedAccountId(asset.accountId || (investmentAccounts[0]?.id ?? accounts[0]?.id ?? ''))
    setPurchaseDate(asset.purchaseDate || getLocalToday())
    setSyncToTransactions(false)
    setShowAddEditModal(true)
  }

  const handleSaveAsset = async () => {
    if (!user || !storageKey) return
    if (!assetName.trim()) {
      Alert.alert('Peringatan', 'Nama aset/ticker tidak boleh kosong.')
      return
    }

    const units = parseFloat(assetUnits.replace(/\./g, '').replace(',', '.')) || 0
    const avgPrice = parseAmount(assetAvgPrice)
    const curPrice = parseAmount(assetCurrentPrice) || avgPrice

    if (units <= 0 || avgPrice <= 0) {
      Alert.alert('Peringatan', 'Jumlah unit dan harga beli rata-rata harus lebih besar dari 0.')
      return
    }

    const upperTicker = assetName.trim().toUpperCase()
    const selectedAccount = accounts.find(a => a.id === selectedAccountId)
    const platformName = selectedAccount?.name ?? 'Manual'

    setLoading(true)
    try {
      if (editAssetId) {
        // If the asset has a linked transaction, update it in Supabase
        const assetToUpdate = assets.find(a => a.id === editAssetId)
        if (assetToUpdate?.transactionId) {
          try {
            const totalExpense = units * avgPrice
            let catId = ''
            const existingCat = categories.find(
              c => c.name.toLowerCase() === 'investasi' && c.type === 'expense'
            )
            if (existingCat) {
              catId = existingCat.id
            }
            await api.transactions.update(assetToUpdate.transactionId, {
              amount: totalExpense,
              date: purchaseDate,
              description: `Beli ${upperTicker} — ${units} ${getUnitLabel(assetType)} @ Rp ${formatCurrency(avgPrice)}`,
              category_id: catId || undefined,
            } as any)
          } catch (txErr) {
            console.error('Failed to update linked transaction:', txErr)
          }
        }

        await api.investmentAssets.update(editAssetId, {
          name: upperTicker,
          type: assetType,
          units,
          avgBuyPrice: avgPrice,
          currentPrice: curPrice,
          accountId: selectedAccountId || undefined,
          platform: platformName,
          purchaseDate,
        })
      } else {
        let transactionId = undefined

        // Record transaction if requested — BUY = EXPENSE from source account
        if (syncToTransactions && buySourceAccountId) {
          try {
            const totalExpense = units * avgPrice

            // Find or create a generic 'Investasi' EXPENSE category (not per-ticker)
            let catId = ''
            const existingCat = categories.find(
              c => c.name.toLowerCase() === 'investasi' && c.type === 'expense'
            )
            if (existingCat) {
              catId = existingCat.id
            } else {
              const { data: newCat, error: catErr } = await api.categories.create(user.id, {
                name: 'Investasi',
                icon: '📈',
                color: '#f59e0b',
                type: 'expense',
              })
              if (catErr) throw catErr
              if (newCat) {
                catId = newCat.id
                setCategories(prev => [...prev, newCat])
              }
            }

            // Single EXPENSE transaction from source account
            const { data: newTx, error: txErr } = await api.transactions.create(user.id, {
              type: 'expense',
              amount: totalExpense,
              account_id: buySourceAccountId,
              category_id: catId || undefined,
              date: purchaseDate,
              description: `Beli ${upperTicker} — ${units} ${getUnitLabel(assetType)} @ Rp ${formatCurrency(avgPrice)}`,
              source: 'manual',
            } as any)
            if (txErr) throw txErr
            if (newTx) {
              transactionId = newTx.id
            }
          } catch (txErr: any) {
            console.error('Failed to create investment buy transaction:', txErr)
            Alert.alert('Error', 'Gagal mencatat transaksi pembelian investasi.')
          }
        }

        await api.investmentAssets.create(user.id, {
          name: upperTicker,
          type: assetType,
          units,
          avgBuyPrice: avgPrice,
          currentPrice: curPrice,
          accountId: selectedAccountId || undefined,
          platform: platformName,
          purchaseDate,
          transactionId,
        })
      }

      setShowAddEditModal(false)
      await loadData()
    } catch (err: any) {
      console.error('Failed to save asset:', err)
      Alert.alert('Error', 'Gagal menyimpan aset investasi.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAsset = (id: string) => {
    const asset = assets.find(a => a.id === id)
    if (asset?.transactionId) {
      Alert.alert(
        'Hapus Aset',
        'Apakah Anda juga ingin menghapus transaksi pembelian terkait dari riwayat keuangan?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus Aset Saja',
            onPress: async () => {
              setLoading(true)
              try {
                await api.investmentAssets.delete(id)
                await loadData()
              } catch (err) {
                console.error(err)
              } finally {
                setLoading(false)
              }
            },
          },
          {
            text: 'Hapus Keduanya',
            style: 'destructive',
            onPress: async () => {
              setLoading(true)
              try {
                await api.investmentAssets.delete(id)
                await loadData()
                await api.transactions.delete(asset.transactionId!)
              } catch (err) {
                console.error('Failed to delete linked transaction:', err)
              } finally {
                setLoading(false)
              }
            },
          },
        ]
      )
    } else {
      Alert.alert(
        'Hapus Aset',
        'Apakah Anda yakin ingin menghapus aset investasi ini dari portofolio?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: async () => {
              setLoading(true)
              try {
                await api.investmentAssets.delete(id)
                await loadData()
              } catch (err) {
                console.error(err)
              } finally {
                setLoading(false)
              }
            },
          },
        ]
      )
    }
  }

  // ---- Sell Asset ----
  const openSellModal = (asset: InvestmentAsset) => {
    setSellAsset(asset)
    setSellUnits('')
    setSellPrice(asset.currentPrice.toLocaleString('id-ID'))
    setSellRecordTransaction(true)
    // Default receiver: first non-investment account
    const defReceiver = allAccounts.find(a => a.type !== 'investment' && a.is_default)
      || allAccounts.find(a => a.type !== 'investment')
      || allAccounts[0]
    if (defReceiver) setSellReceiverAccountId(defReceiver.id)
    setShowSellModal(true)
  }

  const handleConfirmSell = async () => {
    if (!user || !sellAsset) return

    const unitsSold = parseFloat(sellUnits.replace(/\./g, '').replace(',', '.')) || 0
    const pricePerUnit = parseAmount(sellPrice)

    if (unitsSold <= 0) {
      Alert.alert('Peringatan', 'Jumlah unit yang dijual harus lebih besar dari 0.')
      return
    }
    if (unitsSold > sellAsset.units) {
      Alert.alert('Peringatan', `Jumlah unit yang dijual (${unitsSold}) melebihi kepemilikan (${sellAsset.units} ${getUnitLabel(sellAsset.type)}).`)
      return
    }
    if (pricePerUnit <= 0) {
      Alert.alert('Peringatan', 'Harga jual per unit harus lebih besar dari 0.')
      return
    }

    const totalSellValue = unitsSold * pricePerUnit
    const unitLabel = getUnitLabel(sellAsset.type)

    setLoading(true)
    try {
      // Update asset units
      const newUnits = sellAsset.units - unitsSold
      if (newUnits <= 0) {
        // Remove asset entirely if all units sold
        await api.investmentAssets.delete(sellAsset.id)
      } else {
        await api.investmentAssets.update(sellAsset.id, {
          units: newUnits
        })
      }

      // Record transaction — SELL = single INCOME to receiver account
      if (sellRecordTransaction && sellReceiverAccountId) {
        try {
          const upperTicker = sellAsset.name.toUpperCase()

          // Find or create 'Hasil Investasi' INCOME category
          let catId = ''
          const existingCat = categories.find(
            c => c.name.toLowerCase() === 'hasil investasi' && c.type === 'income'
          )
          if (existingCat) {
            catId = existingCat.id
          } else {
            const { data: newCat } = await api.categories.create(user.id, {
              name: 'Hasil Investasi',
              icon: '💹',
              color: '#10b981',
              type: 'income',
            })
            if (newCat) {
              catId = newCat.id
              setCategories(prev => [...prev, newCat])
            }
          }

          // Single INCOME transaction to receiver account
          await api.transactions.create(user.id, {
            type: 'income',
            amount: totalSellValue,
            account_id: sellReceiverAccountId,
            category_id: catId || undefined,
            date: getLocalToday(),
            description: `Jual ${upperTicker} — ${unitsSold} ${unitLabel} @ Rp ${formatCurrency(pricePerUnit)}`,
            source: 'manual',
          } as any)
        } catch (txErr: any) {
          console.error('Failed to record sell transaction:', txErr)
          Alert.alert('Error', 'Gagal mencatat transaksi penjualan.')
        }
      }

      setShowSellModal(false)
      setSellAsset(null)
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openBulkModal = () => {
    const initialPrices: Record<string, string> = {}
    assets.forEach(a => {
      initialPrices[a.id] = a.currentPrice.toLocaleString('id-ID')
    })
    setBulkPrices(initialPrices)
    setShowBulkModal(true)
  }

  const handleSaveBulkPrices = async () => {
    setLoading(true)
    try {
      for (const a of assets) {
        const priceStr = bulkPrices[a.id]
        const price = priceStr ? parseAmount(priceStr) : a.currentPrice
        if (price !== a.currentPrice) {
          await api.investmentAssets.update(a.id, {
            currentPrice: price,
          })
        }
      }
      setShowBulkModal(false)
      await loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Calculations
  const totalCost = assets.reduce((sum, a) => sum + a.units * a.avgBuyPrice, 0)
  const totalCurrentValue = assets.reduce((sum, a) => sum + a.units * a.currentPrice, 0)
  const totalProfitLoss = totalCurrentValue - totalCost
  const profitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0
  const isProfit = totalProfitLoss >= 0

  // Asset allocations breakdown
  const typeAllocationValue = assets.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + curr.units * curr.currentPrice
    return acc
  }, {} as Record<string, number>)

  const totalAllocatedValue = Object.values(typeAllocationValue).reduce((sum, val) => sum + val, 0)

  const allocationsBreakdown = ASSET_TYPES.map(t => {
    const val = typeAllocationValue[t.key] || 0
    const percent = totalAllocatedValue > 0 ? (val / totalAllocatedValue) * 100 : 0
    const isSaham = t.key === 'saham'
    return {
      ...t,
      color: isSaham ? colors.tint : t.color,
      value: val,
      percentage: percent,
    }
  }).sort((a, b) => b.value - a.value)

  // Sell modal totals
  const sellUnitsParsed = parseFloat(sellUnits.replace(/\./g, '').replace(',', '.')) || 0
  const sellPriceParsed = parseAmount(sellPrice)
  const sellTotalValue = sellUnitsParsed * sellPriceParsed
  const sellProfit = sellAsset ? sellTotalValue - (sellUnitsParsed * sellAsset.avgBuyPrice) : 0

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Portfolio Summary Card */}
      <View style={[styles.mainSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryTopRow}>
          <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>NILAI PORTOPOLIO</Text>
          <TouchableOpacity onPress={openBulkModal} style={[styles.bulkUpdateBtn, { borderColor: colors.border }]}>
            <FontAwesome name="refresh" size={10} color={colors.textSecondary} />
            <Text style={[styles.bulkBtnText, { color: colors.textSecondary }]}>Update Harga</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.mainValue, { color: colors.text }]}>Rp {formatCurrency(totalCurrentValue)}</Text>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryGrid}>
          <View style={styles.gridItem}>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Total Modal</Text>
            <Text style={[styles.gridVal, { color: colors.text }]}>Rp {formatCurrency(totalCost)}</Text>
          </View>

          <View style={[styles.gridItem, { alignItems: 'flex-end' }]}>
            <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Keuntungan (P&L)</Text>
            <View style={styles.pnlRow}>
              <FontAwesome
                name={isProfit ? 'caret-up' : 'caret-down'}
                size={12}
                color={isProfit ? '#10b981' : '#ef4444'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.gridVal, { color: isProfit ? '#10b981' : '#ef4444' }]}>
                Rp {formatCurrency(totalProfitLoss)} ({profitLossPercent.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Allocation breakdown Section */}
      {assets.length > 0 && (
        <View style={[styles.allocationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Alokasi Portofolio</Text>
          <View style={styles.barStack}>
            {allocationsBreakdown.map((item, idx) => {
              if (item.percentage <= 0) return null
              return (
                <View
                  key={item.key}
                  style={[
                    styles.barSegment,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                      borderTopLeftRadius: idx === 0 ? 4 : 0,
                      borderBottomLeftRadius: idx === 0 ? 4 : 0,
                      borderTopRightRadius: idx === allocationsBreakdown.length - 1 ? 4 : 0,
                      borderBottomRightRadius: idx === allocationsBreakdown.length - 1 ? 4 : 0,
                    },
                  ]}
                />
              )
            })}
          </View>

          <View style={styles.legendContainer}>
            {allocationsBreakdown.map(item => (
              <View key={item.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                  {item.label} ({item.percentage.toFixed(0)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Assets List */}
      <View style={styles.assetsHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Daftar Aset</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={openAddAccountModal} style={[styles.addAccountBtn, { borderColor: colors.tint }]}>
            <FontAwesome name="bank" size={9} color={colors.tint} style={{ marginRight: 5 }} />
            <Text style={[styles.addAccountBtnText, { color: colors.tint }]}>+ Akun</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openAddModal} style={[styles.addAssetBtn, { backgroundColor: colors.tint }]}>
            <FontAwesome name="plus" size={10} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.addAssetBtnText}>Tambah Aset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {assets.length === 0 ? (
        <EmptyState
          icon="📈"
          title="Belum Ada Aset Investasi"
          subtitle="Mulai catat portofolio investasi Anda di sini untuk memantau perkembangannya."
          actionLabel="+ Tambah Aset Pertama"
          onAction={openAddModal}
        />
      ) : (
        assets.map(asset => {
          const typeConfig = ASSET_TYPES.find(t => t.key === asset.type)
          const isSaham = asset.type === 'saham'
          const typeColor = isSaham ? colors.tint : (typeConfig?.color || '#3b82f6')
          const typeBg = isSaham ? colors.tint + '15' : (typeConfig?.bg || 'rgba(128,128,128,0.1)')
          const assetCost = asset.units * asset.avgBuyPrice
          const assetValue = asset.units * asset.currentPrice
          const assetPnl = assetValue - assetCost
          const assetPnlPercent = assetCost > 0 ? (assetPnl / assetCost) * 100 : 0
          const isAssetProfit = assetPnl >= 0
          const unitLabel = getUnitLabel(asset.type)
          const linkedAccount = accounts.find(a => a.id === asset.accountId)

          return (
            <View key={asset.id} style={[styles.assetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Asset Card Header */}
              <View style={styles.assetCardHeader}>
                <View style={styles.assetMeta}>
                  <View style={[styles.assetIconBg, { backgroundColor: typeBg }]}>
                    <FontAwesome name={typeConfig?.icon as any || 'line-chart'} size={14} color={typeColor} />
                  </View>
                  <View>
                    <Text style={[styles.assetTicker, { color: colors.text }]}>{asset.name}</Text>
                    <Text style={[styles.assetPlatform, { color: colors.textMuted }]}>
                      {linkedAccount?.name ?? asset.platform}
                    </Text>
                  </View>
                </View>

                {/* Individual P&L Badge */}
                <View style={[styles.pnlBadge, { backgroundColor: isAssetProfit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' }]}>
                  <Text style={[styles.pnlBadgeText, { color: isAssetProfit ? '#10b981' : '#ef4444' }]}>
                    {isAssetProfit ? '+' : ''}
                    {assetPnlPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* Asset Details Grid */}
              <View style={styles.assetGrid}>
                <View style={styles.assetGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Kepemilikan</Text>
                  <Text style={[styles.detailVal, { color: colors.text }]}>{asset.units} {unitLabel}</Text>
                </View>
                <View style={styles.assetGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Harga Rerata</Text>
                  <Text style={[styles.detailVal, { color: colors.text }]}>Rp {formatCurrency(asset.avgBuyPrice)}</Text>
                </View>
                <View style={styles.assetGridItem}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Harga Saat Ini</Text>
                  <Text style={[styles.detailVal, { color: colors.text }]}>Rp {formatCurrency(asset.currentPrice)}</Text>
                </View>
              </View>

              {/* Total Summary comparing cost and current */}
              <View style={[styles.assetTotalCompare, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Nilai Aset</Text>
                  <Text style={[styles.detailValBold, { color: colors.text }]}>Rp {formatCurrency(assetValue)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>P&L Nominal</Text>
                  <Text style={[styles.detailValBold, { color: isAssetProfit ? '#10b981' : '#ef4444' }]}>
                    Rp {formatCurrency(assetPnl)}
                  </Text>
                </View>
              </View>

              {/* Actions row */}
              <View style={styles.assetActionsRow}>
                <TouchableOpacity onPress={() => openEditModal(asset)} style={[styles.assetActionBtn, { backgroundColor: colors.border }]}>
                  <FontAwesome name="edit" size={11} color={colors.textSecondary} />
                  <Text style={[styles.assetActionBtnText, { color: colors.textSecondary }]}>Ubah</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openSellModal(asset)} style={[styles.assetActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                  <FontAwesome name="dollar" size={11} color="#10b981" />
                  <Text style={[styles.assetActionBtnText, { color: '#10b981' }]}>Jual</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAsset(asset.id)} style={[styles.assetActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                  <FontAwesome name="trash" size={11} color="#ef4444" />
                  <Text style={[styles.assetActionBtnText, { color: '#ef4444' }]}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        })
      )}

      {/* Add / Edit Asset Modal */}
      <BottomSheet
        visible={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editAssetId ? 'Ubah Aset Investasi' : 'Tambah Aset Investasi'}
        maxHeight="90%"
      >
        <View style={styles.modalContent}>
          {/* Asset Ticker Name */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Kode Aset / Ticker</Text>
          <TextInput
            placeholder="Mis: BBCA, ANTM, BTC"
            placeholderTextColor={colors.textMuted}
            value={assetName}
            onChangeText={setAssetName}
            autoCapitalize="characters"
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          />

          {/* Asset Type pills */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tipe Aset</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {ASSET_TYPES.map(item => {
              const isSelected = assetType === item.key
              const itemColor = item.key === 'saham' ? colors.tint : item.color
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setAssetType(item.key)}
                  style={[
                    styles.typeSelectorChip,
                    { borderColor: colors.border, backgroundColor: isSelected ? itemColor + '15' : 'transparent' },
                    isSelected && { borderColor: itemColor },
                  ]}
                >
                  <FontAwesome name={item.icon as any} size={11} color={isSelected ? itemColor : colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.typeChipText, { color: isSelected ? itemColor : colors.textSecondary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Units - label sesuai tipe */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
            Jumlah ({getUnitLabel(assetType)})
          </Text>
          <TextInput
            placeholder={`0 ${getUnitLabel(assetType)}`}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={assetUnits}
            onChangeText={setAssetUnits}
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          />

          {/* Avg Price */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Harga Beli Rata-Rata (Rp)</Text>
          <TextInput
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={assetAvgPrice}
            onChangeText={val => setAssetAvgPrice(val.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          />

          {/* Current Price */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Harga Saat Ini (Rp, Opsional)</Text>
          <TextInput
            placeholder="Gunakan harga beli jika sama"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={assetCurrentPrice}
            onChangeText={val => setAssetCurrentPrice(val.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          />

          {/* Investment Account Picker (Platform / Broker) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs }}>
            <Text style={[styles.modalLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Akun Investasi (Platform/Broker)</Text>
            <TouchableOpacity
              onPress={() => { setShowAddEditModal(false); setTimeout(() => openAddAccountModal(), 300) }}
              style={[styles.inlineAddAccountBtn, { borderColor: colors.tint }]}
            >
              <FontAwesome name="plus" size={9} color={colors.tint} style={{ marginRight: 4 }} />
              <Text style={[styles.inlineAddAccountText, { color: colors.tint }]}>Akun Baru</Text>
            </TouchableOpacity>
          </View>
          {investmentAccounts.length === 0 ? (
            <TouchableOpacity
              onPress={() => { setShowAddEditModal(false); setTimeout(() => openAddAccountModal(), 300) }}
              style={[styles.noAccountBox, { borderColor: colors.tint + '60', backgroundColor: colors.tint + '08', borderStyle: 'dashed' }]}
            >
              <FontAwesome name="plus-circle" size={16} color={colors.tint} style={{ marginBottom: 4 }} />
              <Text style={[styles.noAccountText, { color: colors.tint, fontWeight: '700' }]}>
                + Tambah Akun Investasi Baru
              </Text>
              <Text style={[styles.noAccountText, { color: colors.textMuted, fontSize: 10, marginTop: 2 }]}>
                Misal: Bibit, Stockbit, Ajaib, dll.
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {investmentAccounts.map(acc => {
                const isSelected = selectedAccountId === acc.id
                return (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => setSelectedAccountId(acc.id)}
                    style={[
                      styles.platformChip,
                      { borderColor: colors.border, backgroundColor: isSelected ? colors.tint + '15' : 'transparent' },
                      isSelected && { borderColor: colors.tint },
                    ]}
                  >
                    <Text style={[styles.platformChipText, { color: isSelected ? colors.tint : colors.textSecondary }]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}

          {/* Date Picker */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tanggal Pembelian</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.inputBg, justifyContent: 'center' }]}
          >
            <Text style={{ color: colors.text }}>{formatDate(purchaseDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(purchaseDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios')
                if (selectedDate) {
                  const offset = selectedDate.getTimezoneOffset()
                  const fixedDate = new Date(selectedDate.getTime() - offset * 60 * 1000)
                  setPurchaseDate(fixedDate.toISOString().split('T')[0])
                }
              }}
            />
          )}

          {/* Save Transaction Sync Options (Only visible when creating asset) */}
          {!editAssetId && (
            <View style={[styles.syncBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity
                onPress={() => setSyncToTransactions(!syncToTransactions)}
                style={styles.syncCheckboxRow}
              >
                <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: syncToTransactions ? colors.tint : 'transparent' }]}>
                  {syncToTransactions && <FontAwesome name="check" size={8} color="#fff" />}
                </View>
                <Text style={[styles.syncCheckboxLabel, { color: colors.text }]}>Catat sebagai Pengeluaran</Text>
              </TouchableOpacity>

              {syncToTransactions && (
                <View style={{ marginTop: Spacing.sm }}>
                  <Text style={[styles.itemSublabel, { color: colors.textMuted }]}>
                    Dicatat sebagai pengeluaran (kategori: Investasi) dari akun:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {accounts.map(acc => {
                      const isSelected = buySourceAccountId === acc.id
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          onPress={() => setBuySourceAccountId(acc.id)}
                          style={[
                            styles.platformChip,
                            { borderColor: colors.border, backgroundColor: isSelected ? colors.tint + '15' : 'transparent' },
                            isSelected && { borderColor: colors.tint },
                          ]}
                        >
                          <Text style={[styles.platformChipText, { color: isSelected ? colors.tint : colors.textSecondary }]}>
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}


          {/* Save Button */}
          <TouchableOpacity onPress={handleSaveAsset} style={[styles.saveBtn, { backgroundColor: colors.tint }]}>
            <Text style={styles.saveBtnText}>Simpan Aset</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Sell Asset Modal */}
      <BottomSheet
        visible={showSellModal}
        onClose={() => { setShowSellModal(false); setSellAsset(null) }}
        title={sellAsset ? `Jual ${sellAsset.name}` : 'Jual Aset'}
        maxHeight="90%"
      >
        {sellAsset && (
          <View style={styles.modalContent}>
            {/* Current holdings info */}
            <View style={[styles.sellInfoBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <View style={styles.sellInfoRow}>
                <Text style={[styles.sellInfoLabel, { color: colors.textMuted }]}>Kepemilikan Saat Ini</Text>
                <Text style={[styles.sellInfoVal, { color: colors.text }]}>
                  {sellAsset.units} {getUnitLabel(sellAsset.type)}
                </Text>
              </View>
              <View style={styles.sellInfoRow}>
                <Text style={[styles.sellInfoLabel, { color: colors.textMuted }]}>Harga Rerata Beli</Text>
                <Text style={[styles.sellInfoVal, { color: colors.text }]}>Rp {formatCurrency(sellAsset.avgBuyPrice)}</Text>
              </View>
              <View style={styles.sellInfoRow}>
                <Text style={[styles.sellInfoLabel, { color: colors.textMuted }]}>Harga Pasar Saat Ini</Text>
                <Text style={[styles.sellInfoVal, { color: colors.text }]}>Rp {formatCurrency(sellAsset.currentPrice)}</Text>
              </View>
            </View>

            {/* Units to sell */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
              Jumlah {getUnitLabel(sellAsset.type)} yang Dijual
            </Text>
            <TextInput
              placeholder={`Maks. ${sellAsset.units} ${getUnitLabel(sellAsset.type)}`}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={sellUnits}
              onChangeText={setSellUnits}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
            />

            {/* Sell price per unit */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Harga Jual per {getUnitLabel(sellAsset.type)} (Rp)</Text>
            <TextInput
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={sellPrice}
              onChangeText={val => setSellPrice(val.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
            />

            {/* Estimated totals */}
            {sellUnitsParsed > 0 && sellPriceParsed > 0 && (
              <View style={[styles.sellSummaryBox, { backgroundColor: sellProfit >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderColor: sellProfit >= 0 ? '#10b981' : '#ef4444' }]}>
                <View style={styles.sellInfoRow}>
                  <Text style={[styles.sellInfoLabel, { color: colors.textMuted }]}>Total Nilai Jual</Text>
                  <Text style={[styles.sellInfoVal, { color: colors.text, fontWeight: '800' }]}>Rp {formatCurrency(sellTotalValue)}</Text>
                </View>
                <View style={styles.sellInfoRow}>
                  <Text style={[styles.sellInfoLabel, { color: colors.textMuted }]}>P&L Transaksi</Text>
                  <Text style={[styles.sellInfoVal, { color: sellProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: '800' }]}>
                    {sellProfit >= 0 ? '+' : ''}Rp {formatCurrency(sellProfit)}
                  </Text>
                </View>
              </View>
            )}

            {/* Record as transaction toggle */}
            <View style={[styles.syncBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity
                onPress={() => setSellRecordTransaction(!sellRecordTransaction)}
                style={styles.syncCheckboxRow}
              >
                <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: sellRecordTransaction ? '#10b981' : 'transparent' }]}>
                  {sellRecordTransaction && <FontAwesome name="check" size={8} color="#fff" />}
                </View>
                <Text style={[styles.syncCheckboxLabel, { color: colors.text }]}>Catat sebagai Transaksi</Text>
              </TouchableOpacity>

              {sellRecordTransaction && (
                <View style={{ marginTop: Spacing.sm }}>
                  <Text style={[styles.itemSublabel, { color: colors.textMuted }]}>Uang masuk ke Akun</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {allAccounts.map(acc => {
                      const isSelected = sellReceiverAccountId === acc.id
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          onPress={() => setSellReceiverAccountId(acc.id)}
                          style={[
                            styles.platformChip,
                            { borderColor: colors.border, backgroundColor: isSelected ? '#10b98115' : 'transparent' },
                            isSelected && { borderColor: '#10b981' },
                          ]}
                        >
                          <Text style={[styles.platformChipText, { color: isSelected ? '#10b981' : colors.textSecondary }]}>
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleConfirmSell}
              style={[styles.saveBtn, { backgroundColor: '#10b981' }]}
            >
              <FontAwesome name="dollar" size={14} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Konfirmasi Penjualan</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      {/* Bulk Update Modal */}
      <BottomSheet
        visible={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Update Harga Pasar Aset"
        maxHeight="85%"
      >
        <View style={styles.modalContent}>
          {assets.map(asset => (
            <View key={asset.id} style={styles.bulkRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bulkAssetLabel, { color: colors.text }]}>
                  {asset.name}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>
                  {getUnitLabel(asset.type)} · {accounts.find(a => a.id === asset.accountId)?.name ?? asset.platform}
                </Text>
              </View>
              <TextInput
                placeholder="Harga Saat Ini"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={bulkPrices[asset.id] || ''}
                onChangeText={val => setBulkPrices({
                  ...bulkPrices,
                  [asset.id]: val.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
                })}
                style={[styles.bulkInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
              />
            </View>
          ))}

          <TouchableOpacity onPress={handleSaveBulkPrices} style={[styles.saveBtn, { backgroundColor: colors.tint, marginTop: Spacing.md }]}>
            <Text style={styles.saveBtnText}>Simpan Semua Perubahan</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Add New Investment Account Modal */}
      <BottomSheet
        visible={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        title="Tambah Akun Investasi Baru"
        maxHeight="70%"
      >
        <View style={styles.modalContent}>
          {/* Info box */}
          <View style={[styles.addAccInfoBox, { backgroundColor: colors.tint + '12', borderColor: colors.tint + '40' }]}>
            <FontAwesome name="info-circle" size={13} color={colors.tint} style={{ marginRight: 8 }} />
            <Text style={[styles.addAccInfoText, { color: colors.tint }]}>
              Akun baru akan otomatis bertipe Investasi dan langsung muncul di daftar akun keuangan Anda.
            </Text>
          </View>

          {/* Account Name */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nama Akun / Platform</Text>
          <TextInput
            placeholder="Mis: Bibit, Stockbit, Ajaib, Pluang..."
            placeholderTextColor={colors.textMuted}
            value={newAccountName}
            onChangeText={setNewAccountName}
            autoFocus
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          />

          {/* Initial Balance (optional) */}
          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Saldo Awal (Rp, Opsional)</Text>
          <TextInput
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={newAccountBalance}
            onChangeText={val => setNewAccountBalance(val.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
          />

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleCreateInvestmentAccount}
            disabled={savingAccount}
            style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: savingAccount ? 0.7 : 1 }]}
          >
            {savingAccount ? (
              <Text style={styles.saveBtnText}>Menyimpan...</Text>
            ) : (
              <>
                <FontAwesome name="bank" size={14} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Simpan Akun Investasi</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainSummaryCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mainLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: Spacing.sm,
  },
  bulkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bulkBtnText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginVertical: Spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allocationCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg - 2,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  barStack: {
    height: 12,
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  barSegment: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginBottom: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  assetsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  addAssetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  addAssetBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  addAccountBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  inlineAddAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  inlineAddAccountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  addAccInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
  },
  addAccInfoText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    flex: 1,
  },
  assetCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg - 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  assetCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  assetMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  assetTicker: {
    fontSize: 15,
    fontWeight: '800',
  },
  assetPlatform: {
    fontSize: 11,
    fontWeight: '600',
  },
  pnlBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  pnlBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  assetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  assetGridItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailValBold: {
    fontSize: 13,
    fontWeight: '800',
  },
  assetTotalCompare: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  assetActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  assetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    marginLeft: 8,
  },
  assetActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
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
  typeSelectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  platformChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  platformChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noAccountBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  noAccountText: {
    fontSize: 12,
    lineHeight: 18,
  },
  syncBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  syncCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  syncCheckboxLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemSublabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  saveBtn: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  bulkAssetLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  bulkInput: {
    width: 140,
    height: 38,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  // Sell modal specific
  sellInfoBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sellSummaryBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sellInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sellInfoVal: {
    fontSize: 12,
    fontWeight: '700',
  },
})
