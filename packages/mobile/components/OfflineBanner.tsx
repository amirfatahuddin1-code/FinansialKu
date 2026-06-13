import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSync } from '@/providers/SyncProvider';
import Colors from '@/constants/Colors';

export default function OfflineBanner() {
  const { syncState } = useSync();
  const { isOnline, pendingChanges } = syncState;

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📡</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Anda sedang offline</Text>
        <Text style={styles.subtitle}>
          {pendingChanges > 0
            ? `${pendingChanges} perubahan akan tersinkronisasi saat online`
            : 'Data dapat diakses secara offline'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  subtitle: {
    fontSize: 12,
    color: '#a16207',
    marginTop: 2,
  },
});
