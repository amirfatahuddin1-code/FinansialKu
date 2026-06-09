import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { useColors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import { CategoryIcon } from '@/components';

export default function ModalScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  useColors();
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: Colors.primary + '15' }]}>
          <CategoryIcon emoji="💡" size={32} color={Colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Karsafin</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Fitur ini akan segera hadir
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          Kami sedang mengembangkan fitur-fitur baru untuk membantu Anda mengatur keuangan lebih baik.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: BorderRadius['2xl'] + 4,
    borderTopRightRadius: BorderRadius['2xl'] + 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.md,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
