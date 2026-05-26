import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Rect, LinearGradient as SvgLinearGradient, Stop, Defs } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { setAppPrimaryColor } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GRADIENT_DIRECTIONS, GradientDirection } from '@/utils/colorUtils';
import { useAuth } from '@/providers/AuthProvider';

const THEME_OPTIONS = [
  { id: 'navy', name: 'Biru Navy (Default)', hex: '#1E40AF' },
  { id: 'indigo', name: 'Biru Indigo', hex: '#3730A3' },
  { id: 'emerald', name: 'Hijau Zamrud', hex: '#047857' },
  { id: 'sunset', name: 'Oranye Senja', hex: '#C2410C' },
  { id: 'purple', name: 'Ungu Royal', hex: '#6D28D9' },
  { id: 'rose', name: 'Merah Muda', hex: '#F43F5E' },
  { id: 'ocean', name: 'Biru Samudra', hex: '#0EA5E9' },
  { id: 'dark', name: 'Hitam Elegan', hex: '#1E293B' },
];

interface CustomTheme {
  id: string;
  name: string;
  mode: 'solid' | 'gradient';
  color?: string;
  colors?: [string, string];
  direction?: GradientDirection;
}

const CUSTOM_THEMES_KEY = '@karsafin_custom_themes';

export default function TemaScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user, api } = useAuth();

  const [selectedHex, setSelectedHex] = useState('#1E40AF');
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [themeChangeCount, setThemeChangeCount] = useState(0);

  const loadThemeData = useCallback(async () => {
    try {
      const [savedTheme, customRaw] = await Promise.all([
        AsyncStorage.getItem('@karsafin_theme_color'),
        AsyncStorage.getItem(CUSTOM_THEMES_KEY),
      ]);
      if (savedTheme) setSelectedHex(savedTheme);
      if (customRaw) setCustomThemes(JSON.parse(customRaw));
    } catch (err) {
      console.error('Failed to load theme data', err);
    }
  }, []);

  const loadSubscriptionAndCount = useCallback(async () => {
    if (!user) return;
    try {
      const [subRes, countRes] = await Promise.all([
        api.subscription.getSubscriptionHistory(user.id),
        AsyncStorage.getItem('@karsafin_theme_changes_count'),
      ]);
      const subs = subRes.data || [];
      const activeSub = subs.find((s: any) => s.status === 'active') || null;
      const pro = !!(activeSub?.plan_id && activeSub.plan_id !== 'basic');
      setIsPro(pro);
      if (countRes) {
        setThemeChangeCount(parseInt(countRes, 10));
      }
    } catch (err) {
      console.error('Failed to load subscription/count in theme:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadThemeData();
      loadSubscriptionAndCount();
    }, [loadThemeData, loadSubscriptionAndCount])
  );

  const checkThemeChangeAllowed = async (): Promise<boolean> => {
    if (isPro) return true;
    if (themeChangeCount >= 1) {
      Alert.alert(
        'Batas Ubah Tema Tercapai',
        'Pengguna paket Basic hanya dapat mengubah tema aplikasi sebanyak 1 kali. Silakan upgrade ke paket Pro untuk mengubah tema tanpa batas!'
      );
      return false;
    }
    return true;
  };

  const applyColor = useCallback(async (hex: string) => {
    setSelectedHex(hex);
    setAppPrimaryColor(hex, colorScheme === 'dark');
    await AsyncStorage.setItem('@karsafin_theme_color', hex);

    if (!isPro) {
      const newCount = themeChangeCount + 1;
      setThemeChangeCount(newCount);
      await AsyncStorage.setItem('@karsafin_theme_changes_count', String(newCount));
    }
  }, [colorScheme, isPro, themeChangeCount]);

  const handleSelectPreset = async (hex: string) => {
    const allowed = await checkThemeChangeAllowed();
    if (!allowed) return;

    await applyColor(hex);
    Alert.alert(
      'Tema Diperbarui',
      'Warna utama aplikasi berhasil diubah!',
      [{ text: 'Oke', onPress: () => router.back() }]
    );
  };

  const handleSelectCustom = async (theme: CustomTheme) => {
    const allowed = await checkThemeChangeAllowed();
    if (!allowed) return;

    if (theme.mode === 'solid' && theme.color) {
      await applyColor(theme.color);
    } else if (theme.mode === 'gradient' && theme.colors) {
      await applyColor(theme.colors[0]);
      await AsyncStorage.setItem('@karsafin_gradient_config', JSON.stringify({
        colors: theme.colors,
        direction: theme.direction,
      }));
    }
    Alert.alert(
      'Tema Diperbarui',
      `Tema "${theme.name}" berhasil diterapkan!`,
      [{ text: 'Oke', onPress: () => router.back() }]
    );
  };

  const handleDeleteCustom = async (id: string) => {
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    await AsyncStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));
  };

  const isPresetSelected = (hex: string) => selectedHex.toUpperCase() === hex.toUpperCase();
  const isCustomSelected = (theme: CustomTheme) => {
    if (theme.mode === 'solid') return selectedHex.toUpperCase() === (theme.color || '').toUpperCase();
    return false;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tema Aplikasi</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
        <Text style={[styles.mainDescription, { color: colors.text }]}>
          Personalisasi Karsafin dengan warna favorit Anda.
        </Text>

        {/* Preset Themes */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Tema Bawaan</Text>
        <View style={styles.themeList}>
          {THEME_OPTIONS.map((theme) => {
            const selected = isPresetSelected(theme.hex);
            return (
              <TouchableOpacity
                key={theme.id}
                style={[styles.themeCard, { backgroundColor: colors.card, borderColor: selected ? theme.hex : colors.border, borderWidth: selected ? 2 : 1 }]}
                onPress={() => handleSelectPreset(theme.hex)}
                activeOpacity={0.7}
              >
                <View style={[styles.colorPreview, { backgroundColor: theme.hex }]} />
                <Text style={[styles.themeName, { color: colors.text }]}>{theme.name}</Text>
                {selected && (
                  <View style={[styles.checkCircle, { backgroundColor: theme.hex }]}>
                    <FontAwesome name="check" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Themes */}
        {customThemes.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 24 }]}>Tema Kustom</Text>
            <View style={styles.themeList}>
              {customThemes.map((ct) => {
                const selected = isCustomSelected(ct);
                const displayHex = ct.mode === 'solid' ? ct.color! : ct.colors![0];
                return (
                  <TouchableOpacity
                    key={ct.id}
                    style={[styles.themeCard, { backgroundColor: colors.card, borderColor: selected ? displayHex : colors.border, borderWidth: selected ? 2 : 1 }]}
                    onPress={() => handleSelectCustom(ct)}
                    activeOpacity={0.7}
                  >
                    {ct.mode === 'gradient' && ct.colors ? (
                      <View style={[styles.colorPreview, { overflow: 'hidden' }]}>
                        <Svg width="100%" height="100%">
                          <Defs>
                            <SvgLinearGradient id={`grad_${ct.id}`} x1={ct.direction?.start.x ?? 0} y1={ct.direction?.start.y ?? 0} x2={ct.direction?.end.x ?? 1} y2={ct.direction?.end.y ?? 1}>
                              <Stop offset="0%" stopColor={ct.colors[0]} />
                              <Stop offset="100%" stopColor={ct.colors[1]} />
                            </SvgLinearGradient>
                          </Defs>
                          <Rect width="100%" height="100%" fill={`url(#grad_${ct.id})`} rx={16} />
                        </Svg>
                      </View>
                    ) : (
                      <View style={[styles.colorPreview, { backgroundColor: ct.color || '#000' }]} />
                    )}
                    <Text style={[styles.themeName, { color: colors.text }]}>{ct.name}</Text>
                    {selected && (
                      <View style={[styles.checkCircle, { backgroundColor: displayHex }]}>
                        <FontAwesome name="check" size={12} color="#fff" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteCustom(ct.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <FontAwesome name="times-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Custom Color Picker Button */}
        <TouchableOpacity
          style={[styles.customBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={async () => {
            const allowed = await checkThemeChangeAllowed();
            if (allowed) {
              router.push('/pilih-warna');
            }
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.customBtnIcon, { backgroundColor: colors.tint }]}>
            <FontAwesome name="paint-brush" size={16} color="#fff" />
          </View>
          <Text style={[styles.customBtnText, { color: colors.text }]}>Pilih Warna Sendiri</Text>
          <Text style={[styles.customBtnArrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  scrollContent: { padding: 20 },
  mainDescription: {
    fontSize: 15, lineHeight: 22, fontWeight: '500', marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', letterSpacing: 0.3,
    marginBottom: 12, marginLeft: 4, textTransform: 'uppercase',
  },
  themeList: { gap: 12 },
  themeCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 16,
  },
  colorPreview: {
    width: 36, height: 36, borderRadius: 18, marginRight: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  themeName: { fontSize: 15, fontWeight: '600', flex: 1 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  customBtn: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, borderWidth: 1,
    marginTop: 24,
  },
  customBtnIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  customBtnText: { fontSize: 15, fontWeight: '600', flex: 1 },
  customBtnArrow: { fontSize: 22, fontWeight: '300' },
});
