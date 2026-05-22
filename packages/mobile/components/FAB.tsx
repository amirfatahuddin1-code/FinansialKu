import React from 'react'
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native'
import { BorderRadius, Spacing } from '@/constants/DesignSystem'

export default function FAB({
  label,
  onPress,
  color,
}: {
  label: string
  onPress: () => void
  color: string
}) {
  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fab: {
    flex: 1,
    paddingVertical: Spacing.lg - 2,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
})
