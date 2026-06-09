import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Keyboard,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native'
import { useColorScheme } from '@/components/useColorScheme'
import Colors, { useColors } from '@/constants/Colors'
import { BorderRadius, Spacing } from '@/constants/DesignSystem'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeight = '85%',
}: {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxHeight?: string | number
}) {
  const colorScheme = useColorScheme() ?? 'dark'
  useColors();
  const colors = Colors[colorScheme]
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current

  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start()
    } else {
      slideAnim.setValue(SCREEN_HEIGHT)
      setKeyboardHeight(0)
    }
  }, [visible])

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e =>
      setKeyboardHeight(e.endCoordinates.height)
    )
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0)
    )
    return () => { show.remove(); hide.remove() }
  }, [])

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            styles.content,
            {
              backgroundColor: colors.card,
              maxHeight: maxHeight as any,
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ fontSize: 24, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              keyboardHeight > 0 && { paddingBottom: keyboardHeight },
            ]}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
})
