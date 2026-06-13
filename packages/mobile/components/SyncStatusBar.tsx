import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useSync } from '@/providers/SyncProvider';
import Colors from '@/constants/Colors';

export default function SyncStatusBar() {
  const { syncState, triggerSync } = useSync();
  const { isOnline, pendingChanges, isSyncing, lastSyncAt } = syncState;

  if (!isOnline) {
    return (
      <View style={[styles.bar, { backgroundColor: Colors.warning }]}>
        <Text style={styles.text}>🔴 Anda sedang offline</Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={[styles.bar, { backgroundColor: Colors.info }]}>
        <Text style={styles.text}>🔄 Menyinkronkan...</Text>
      </View>
    );
  }

  if (pendingChanges > 0) {
    return (
      <TouchableOpacity onPress={triggerSync} activeOpacity={0.8}>
        <View style={[styles.bar, { backgroundColor: Colors.warning }]}>
          <Text style={styles.text}>
            ⏳ {pendingChanges} perubahan menunggu sinkronisasi — Ketuk untuk sync
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (lastSyncAt) {
    return (
      <View style={[styles.bar, { backgroundColor: Colors.success }]}>
        <Text style={styles.text}>
          ✅ Tersinkron • {lastSyncAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
