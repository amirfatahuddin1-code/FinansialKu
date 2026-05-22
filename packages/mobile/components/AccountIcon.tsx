import React from 'react';
import { Image, Text, StyleSheet } from 'react-native';

const bankImages: Record<string, any> = {
  'assets/img/banks/bca.png': require('../assets/img/banks/bca.png'),
  'assets/img/banks/bni.png': require('../assets/img/banks/bni.png'),
  'assets/img/banks/bri.png': require('../assets/img/banks/bri.png'),
  'assets/img/banks/bsi.png': require('../assets/img/banks/bsi.png'),
  'assets/img/banks/btn.png': require('../assets/img/banks/btn.png'),
  'assets/img/banks/cimb.png': require('../assets/img/banks/cimb.png'),
  'assets/img/banks/danamon.png': require('../assets/img/banks/danamon.png'),
  'assets/img/banks/mandiri.png': require('../assets/img/banks/mandiri.png'),
  'assets/img/banks/ocbc.png': require('../assets/img/banks/ocbc.png'),
  'assets/img/banks/permata.png': require('../assets/img/banks/permata.png'),
};

interface AccountIconProps {
  icon?: string;
  type?: string;
  size?: number;
  color?: string;
}

export default function AccountIcon({ icon, type, size = 18, color }: AccountIconProps) {
  if (icon && bankImages[icon]) {
    return (
      <Image
        source={bankImages[icon]}
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
          resizeMode: 'contain',
        }}
      />
    );
  }

  // Fallback to web URL or emoji
  const isImage = icon && (icon.startsWith('assets/') || icon.startsWith('http') || icon.endsWith('.png') || icon.endsWith('.jpg') || icon.includes('/'));

  if (isImage) {
    const uri = icon.startsWith('http') 
      ? icon 
      : `https://finansialku-ecru.vercel.app/${icon}`;
      
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
          resizeMode: 'contain',
        }}
      />
    );
  }

  // Fallback to emoji
  let defaultEmoji = '💵';
  if (type === 'bank') defaultEmoji = '💳';
  else if (type === 'ewallet') defaultEmoji = '📱';
  else if (type === 'investment') defaultEmoji = '📈';

  return (
    <Text style={{ fontSize: size, color }}>
      {icon || defaultEmoji}
    </Text>
  );
}
