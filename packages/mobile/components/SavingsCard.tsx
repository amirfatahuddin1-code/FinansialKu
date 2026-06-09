import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useColorScheme } from '@/components/useColorScheme'
import Colors, { useColors } from '@/constants/Colors'
import { BorderRadius, Spacing } from '@/constants/DesignSystem'
import { formatCurrencyCompact } from '@karsafin/shared'
import type { Savings } from '@karsafin/shared'

export default function SavingsCard({
  goal,
  onPress,
  onLongPress,
  onAddBalance,
  onTransfer,
  onDelete,
}: {
  goal: Savings
  onPress?: () => void
  onLongPress?: () => void
  onAddBalance?: () => void
  onTransfer?: () => void
  onDelete?: () => void
}) {
  const colorScheme = useColorScheme() ?? 'dark'
  useColors();
  const colors = Colors[colorScheme]
  const percent = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0
  const barColor = goal.color || Colors.primary

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
        <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{goal.name}</Text>
        </View>
        <Text style={[styles.percent, { color: barColor }]}>{percent}%</Text>
      </View>
      <View style={[styles.progressBg, { backgroundColor: colors.inputBg }]}>
        <View style={[styles.progressBar, { width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.footer}>
        <Text style={[styles.current, { color: colors.textSecondary }]}>
          Rp {formatCurrencyCompact(goal.current)}
        </Text>
        <Text style={[styles.target, { color: colors.textMuted }]}>
          Target: Rp {formatCurrencyCompact(goal.target)}
        </Text>
      </View>
      {goal.deadline && (
        <Text style={[styles.deadline, { color: colors.textMuted }]}>
          Deadline: {new Date(goal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      )}
      </TouchableOpacity>
      
      {(onAddBalance || onTransfer || onDelete) && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {onAddBalance && (
            <TouchableOpacity onPress={onAddBalance} activeOpacity={0.7} style={{ flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 13 }}>+ Saldo</Text>
            </TouchableOpacity>
          )}
          {onTransfer && (
            <TouchableOpacity onPress={onTransfer} activeOpacity={0.7} style={{ flex: 1, backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#8b5cf6', fontWeight: '700', fontSize: 13 }}>⚡ Transfer</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} activeOpacity={0.7} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: Colors.danger, fontWeight: '700', fontSize: 13 }}>Hapus</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg - 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  percent: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  current: {
    fontSize: 13,
    fontWeight: '600',
  },
  target: {
    fontSize: 13,
  },
  deadline: {
    fontSize: 12,
    marginTop: Spacing.sm,
  },
})
