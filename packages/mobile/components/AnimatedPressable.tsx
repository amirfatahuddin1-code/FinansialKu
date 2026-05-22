import React, { useRef } from 'react'
import { TouchableOpacity, Animated } from 'react-native'

export default function AnimatedPressable({
  children,
  onPress,
  style,
  activeOpacity = 0.7,
  scaleTo = 0.97,
  ...props
}: {
  children: React.ReactNode
  onPress?: () => void
  style?: any
  activeOpacity?: number
  scaleTo?: number
  [key: string]: any
}) {
  const scale = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start()
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  )
}
