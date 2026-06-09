import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'
import { useColorScheme } from '@/components/useColorScheme'
import Colors, { useColors } from '@/constants/Colors'
import { BorderRadius, Spacing } from '@/constants/DesignSystem'

function SkeletonBlock({ width, height, style, borderRadius = BorderRadius.md }: {
  width?: number | string
  height?: number | string
  style?: any
  borderRadius?: number
}) {
  useColors()
  const colorScheme = useColorScheme() ?? 'dark'
  const colors = Colors[colorScheme]
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View
      style={[
        {
          width: width || '100%',
          height: height || 20,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  )
}

export function SkeletonCard({ style }: { style?: any }) {
  useColors()
  const colorScheme = useColorScheme() ?? 'dark'
  const colors = Colors[colorScheme]
  return (
    <View style={[{
      padding: Spacing.xl,
      borderRadius: BorderRadius.xl,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.md,
    }, style]}>
      <SkeletonBlock width="40%" height={16} />
      <SkeletonBlock height={12} borderRadius={6} />
      <SkeletonBlock width="60%" height={12} borderRadius={6} />
    </View>
  )
}

export function SkeletonRow({ style }: { style?: any }) {
  useColors()
  const colorScheme = useColorScheme() ?? 'dark'
  const colors = Colors[colorScheme]
  return (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      gap: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    }, style]}>
      <SkeletonBlock width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, gap: 4 }}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="40%" height={12} />
      </View>
      <SkeletonBlock width={80} height={16} />
    </View>
  )
}

export default SkeletonBlock
