/**
 * Custom entry point untuk monorepo dengan Error Catcher.
 * Jika ada error runtime (seperti modul tidak ketemu atau crash di _layout),
 * error akan langsung ditampilkan di layar HP daripada stuck di splash screen.
 */
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { createElement, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// Simpan error top-level sebelum react mount
let globalError = null;

if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    globalError = error;
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

function ErrorDisplay({ error }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>🚨 Runtime Error Terdeteksi!</Text>
      <ScrollView style={styles.errorScroll}>
        <Text style={styles.errorText}>
          {error?.message || String(error)}
        </Text>
        <Text style={styles.stackText}>
          {error?.stack || 'Tidak ada stack trace.'}
        </Text>
      </ScrollView>
    </View>
  );
}

let ctx;
try {
  ctx = require.context('./app');
} catch (e) {
  globalError = e;
}

function App() {
  const [error, setError] = useState(globalError);

  useEffect(() => {
    if (typeof ErrorUtils !== 'undefined') {
      const handler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((err, isFatal) => {
        setError(err);
        if (handler) handler(err, isFatal);
      });
    }
  }, []);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  try {
    return createElement(ExpoRoot, { context: ctx });
  } catch (err) {
    return <ErrorDisplay error={err} />;
  }
}

registerRootComponent(App);

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    padding: 24,
    paddingTop: 60,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f43f5e',
    marginBottom: 16,
  },
  errorScroll: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
  },
  errorText: {
    color: '#fda4af',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  stackText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
