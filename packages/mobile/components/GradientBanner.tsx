import React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BorderRadius } from '@/constants/DesignSystem'
import type { ColorValue } from 'react-native'

export default function GradientBanner({
  children,
  colors,
  start,
  end,
  style,
  paddingTop = 0,
  paddingBottom = 60,
}: {
  children: React.ReactNode
  colors: readonly [ColorValue, ColorValue, ...ColorValue[]]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  style?: ViewStyle
  paddingTop?: number
  paddingBottom?: number
}) {
  return (
    <LinearGradient
      colors={colors}
      start={start || { x: 0, y: 0 }}
      end={end || { x: 1, y: 1 }}
      style={[
        styles.banner,
        {
          paddingTop,
          paddingBottom,
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 24,
    borderBottomLeftRadius: BorderRadius['2xl'] + 16,
    borderBottomRightRadius: BorderRadius['2xl'] + 16,
  },
})
