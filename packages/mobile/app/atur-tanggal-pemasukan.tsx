import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheet } from '@/components';

export default function AturTanggalPemasukanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const loadSavedDay = async () => {
      try {
        const saved = await AsyncStorage.getItem('@karsafin_income_date');
        if (saved) {
          setSelectedDay(parseInt(saved, 10));
        }
      } catch (err) {
        console.error('Failed to load saved day:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSavedDay();
  }, []);

  const handleSave = async (day: number) => {
    setSelectedDay(day);
    setShowPicker(false);
    setSaving(true);
    try {
      await AsyncStorage.setItem('@karsafin_income_date', day.toString());
      Alert.alert('Berhasil', `Tanggal pemasukan bulanan berhasil diatur ke tanggal ${day}.`);
    } catch (err) {
      Alert.alert('Error', 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        {/* Blue Header Section */}
        <View style={[styles.headerBg, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <FontAwesome name="chevron-left" size={18} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.textContainer}>
              <Text style={styles.headerTitle}>Atur Tanggal</Text>
              <Text style={styles.headerTitle}>Pemasukan</Text>
            </View>
            
            {/* Minimalist Graphic Element matching Gambar 1 */}
            <View style={styles.graphicContainer}>
              <View style={styles.paperBg}>
                <View style={styles.greenBadge}>
                  <Text style={styles.greenBadgeText}>Laporan</Text>
                  <Text style={styles.greenBadgeText}>Keuangan</Text>
                </View>
                <View style={styles.paperLines}>
                  <View style={styles.line} />
                  <View style={styles.line} />
                  <View style={styles.line} />
                </View>
              </View>
              {/* Floating sparkles */}
              <FontAwesome name="star" size={16} color="#fff" style={styles.sparkle1} />
              <FontAwesome name="star" size={12} color="#fff" style={styles.sparkle2} />
            </View>
          </View>
        </View>

        {/* Floating Info Box */}
        <View style={styles.contentBody}>
          <View style={[styles.infoBox, { backgroundColor: colorScheme === 'dark' ? '#1e3a8a30' : '#eff6ff', borderColor: colorScheme === 'dark' ? '#1d4ed850' : '#bfdbfe' }]}>
            <Text style={[styles.infoText, { color: colorScheme === 'dark' ? '#93c5fd' : '#1e40af' }]}>
              Dapet pemasukan tanggal berapa pun bisa kamu atur, laporan keuangan makin akurat!
            </Text>
            <View style={styles.bulbCircle}>
              <Text style={{ fontSize: 16 }}>💡</Text>
            </View>
          </View>

          {/* Form Box */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Tanggal pemasukan</Text>
            
            <TouchableOpacity 
              style={[styles.pickerButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>
                Setiap tanggal {selectedDay}
              </Text>
              <FontAwesome name="calendar" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Day Picker BottomSheet */}
      <BottomSheet visible={showPicker} onClose={() => setShowPicker(false)} title="Pilih Tanggal Pemasukan">
        <Text style={[styles.bottomSheetDesc, { color: colors.textSecondary }]}>
          Pilih tanggal gajian atau tanggal pemasukan utama bulanan Anda. Siklus laporan keuangan bulanan Anda akan disesuaikan dengan tanggal ini.
        </Text>
        <ScrollView style={styles.daysScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.daysGrid}>
            {days.map((day) => {
              const isSelected = selectedDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    { 
                      backgroundColor: isSelected ? colors.tint : colors.inputBg,
                      borderColor: isSelected ? colors.tint : colors.border
                    }
                  ]}
                  onPress={() => handleSave(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayChipText, { color: isSelected ? '#ffffff' : colors.text }]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBg: {
    backgroundColor: Colors.primary,    // Vibrant deep blue
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1.2,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  graphicContainer: {
    flex: 1,
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
  },
  paperBg: {
    width: 85,
    height: 110,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ rotate: '5deg' }],
  },
  greenBadge: {
    backgroundColor: '#15803d',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  greenBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  paperLines: {
    gap: 6,
  },
  line: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    width: '100%',
  },
  sparkle1: {
    position: 'absolute',
    left: 20,
    top: 10,
  },
  sparkle2: {
    position: 'absolute',
    left: 10,
    bottom: 30,
  },
  contentBody: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  bulbCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#bfdbfe50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSheetDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  daysScroll: {
    maxHeight: 350,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  dayChip: {
    width: '17%', // 5 items per row with gap
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
