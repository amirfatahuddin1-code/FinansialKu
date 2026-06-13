import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useSync } from '@/providers/SyncProvider';
import Colors from '@/constants/Colors';

export default function SyncPopup() {
  const { syncState } = useSync();
  const { isSyncing, syncStatus, progress, lastError } = syncState;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const show = isSyncing || syncStatus === 'success' || syncStatus === 'error';

  useEffect(() => {
    if (isSyncing) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const spin = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else if (syncStatus === 'success' || syncStatus === 'error') {
      rotateAnim.setValue(0);
    }
  }, [isSyncing, syncStatus]);

  if (!show) return null;

  const spinInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal transparent animationType="none" visible={show}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.popup,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {isSyncing && (
            <>
              <Animated.View style={{ transform: [{ rotate: spinInterpolation }] }}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </Animated.View>
              <Text style={styles.title}>Menyinkronkan Data...</Text>
              {progress.total > 0 && (
                <Text style={styles.subtitle}>
                  {progress.phase === 'pushing' ? 'Mengirim perubahan...' : 'Mengunduh data...'}
                  {' '}({progress.current}/{progress.total})
                </Text>
              )}
            </>
          )}
          {syncStatus === 'success' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: Colors.success }]}>
                <Text style={styles.iconText}>✓</Text>
              </View>
              <Text style={styles.title}>Sinkronisasi Berhasil</Text>
              <Text style={styles.subtitle}>Data Anda telah diperbarui</Text>
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: Colors.danger }]}>
                <Text style={styles.iconText}>✕</Text>
              </View>
              <Text style={styles.title}>Sinkronisasi Gagal</Text>
              <Text style={styles.subtitle}>{lastError || 'Coba lagi nanti'}</Text>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    minWidth: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
});
