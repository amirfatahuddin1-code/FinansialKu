import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, PanResponder, Alert, Platform, useWindowDimensions, Dimensions,
} from 'react-native';
import Svg, { Rect, LinearGradient as SvgLinearGradient, Stop, Defs } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { setAppPrimaryColor } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';
import {
  hsvToHex, hexToHsv, isValidHex, getHueColor,
  SPECTRUM_COLORS, GRADIENT_DIRECTIONS, GradientDirection,
} from '@/utils/colorUtils';

const PADDING = 20;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PICKER_WIDTH = Math.min(SCREEN_WIDTH - PADDING * 2 - 40, 320);
const PICKER_HEIGHT = Math.round(PICKER_WIDTH * 0.78);
const SLIDER_HEIGHT = 28;
const INDICATOR_SIZE = 20;
const CUSTOM_THEMES_KEY = '@karsafin_custom_themes';

export default function PilihWarnaScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { width: winWidth } = useWindowDimensions();
  const pickerWidth = Math.min(winWidth - PADDING * 2 - 40, 320);
  const pickerHeight = Math.round(pickerWidth * 0.78);

  const [activeTab, setActiveTab] = useState<'solid' | 'gradient'>('solid');

  const [hue, setHue] = useState(260);
  const [sat, setSat] = useState(80);
  const [val, setVal] = useState(90);
  const [hexInput, setHexInput] = useState('#8B5CF6');

  const [gradSelectedStop, setGradSelectedStop] = useState<0 | 1>(0);
  const [gradStops, setGradStops] = useState([
    { hue: 260, sat: 80, val: 90 },
    { hue: 200, sat: 70, val: 85 },
  ]);
  const [gradDirection, setGradDirection] = useState<GradientDirection>(GRADIENT_DIRECTIONS[2]);
  const [themeName, setThemeName] = useState('');

  const uid = useRef(Date.now().toString(36)).current;

  const solidHex = hsvToHex(hue, sat, val);
  const currentGradStop = gradStops[gradSelectedStop];
  const grad1Hex = hsvToHex(gradStops[0].hue, gradStops[0].sat, gradStops[0].val);
  const grad2Hex = hsvToHex(gradStops[1].hue, gradStops[1].sat, gradStops[1].val);
  const currentHue = activeTab === 'solid' ? hue : currentGradStop.hue;
  const currentSat = activeTab === 'solid' ? sat : currentGradStop.sat;
  const currentVal = activeTab === 'solid' ? val : currentGradStop.val;

  const applyColor = async (hex: string) => {
    setAppPrimaryColor(hex, colorScheme === 'dark');
    await AsyncStorage.setItem('@karsafin_theme_color', hex);
  };

  const handleSave = async () => {
    const name = themeName.trim() || (activeTab === 'solid'
      ? `Warna ${solidHex}`
      : `Gradasi ${grad1Hex} - ${grad2Hex}`);

    const newTheme = activeTab === 'solid'
      ? { id: `custom_${Date.now()}`, name, mode: 'solid' as const, color: solidHex }
      : { id: `custom_${Date.now()}`, name, mode: 'gradient' as const, colors: [grad1Hex, grad2Hex] as [string, string], direction: gradDirection };

    try {
      const customRaw = await AsyncStorage.getItem(CUSTOM_THEMES_KEY);
      const customThemes = customRaw ? JSON.parse(customRaw) : [];
      customThemes.push(newTheme);
      await AsyncStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));

      if (activeTab === 'solid') {
        await applyColor(solidHex);
      } else {
        await applyColor(grad1Hex);
        await AsyncStorage.setItem('@karsafin_gradient_config', JSON.stringify({
          colors: [grad1Hex, grad2Hex],
          direction: gradDirection,
        }));
      }

      Alert.alert('Tema Tersimpan', `Tema "${name}" berhasil disimpan!`, [
        { text: 'Oke', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Gagal menyimpan tema.');
    }
  };

  const updateHexFromSolid = useCallback((h: number, s: number, v: number) => {
    setHexInput(hsvToHex(h, s, v));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pilih Warna Kustom</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.inputBg }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'solid' && { backgroundColor: colors.tint }]}
          onPress={() => setActiveTab('solid')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeTab === 'solid' ? '#fff' : colors.textSecondary }]}>Warna Solid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gradient' && { backgroundColor: colors.tint }]}
          onPress={() => setActiveTab('gradient')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeTab === 'gradient' ? '#fff' : colors.textSecondary }]}>Gradasi</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        key={activeTab}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: PADDING, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2D Color Area */}
        <FullColorArea2D
          width={pickerWidth}
          height={pickerHeight}
          hue={currentHue}
          sat={currentSat}
          val={currentVal}
          onSatValChange={activeTab === 'solid'
            ? (s, v) => { setSat(s); setVal(v); setHexInput(hsvToHex(hue, s, v)); }
            : (s, v) => setGradStops(prev => {
                const next = [...prev];
                next[gradSelectedStop] = { ...next[gradSelectedStop], sat: s, val: v };
                return next;
              })
          }
        />

        {/* Hue Slider */}
        <FullHueSlider
          width={pickerWidth}
          height={SLIDER_HEIGHT}
          hue={currentHue}
          onHueChange={activeTab === 'solid'
            ? (h) => { setHue(h); setHexInput(hsvToHex(h, sat, val)); }
            : (h) => setGradStops(prev => {
                const next = [...prev];
                next[gradSelectedStop] = { ...next[gradSelectedStop], hue: h };
                return next;
              })
          }
        />

        {/* Solid — Hex Input */}
        {activeTab === 'solid' && (
          <View style={[styles.hexRow, { width: pickerWidth }]}>
            <View style={[styles.hexPreview, { backgroundColor: solidHex }]} />
            <TextInput
              style={[styles.hexInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={hexInput}
              onChangeText={(t) => {
                const upper = t.toUpperCase();
                setHexInput(upper);
                if (isValidHex(upper)) {
                  const hsv = hexToHsv(upper);
                  setHue(hsv.h); setSat(hsv.s); setVal(hsv.v);
                }
              }}
              maxLength={7}
              autoCapitalize="characters"
            />
            <View style={styles.pipetteIcon}>
              <FontAwesome name="eyedropper" size={18} color={colors.textMuted} />
            </View>
          </View>
        )}

        {/* Gradient Tab */}
        {activeTab === 'gradient' && (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Pilih Warna Gradasi</Text>
            <View style={styles.stopRow}>
              <TouchableOpacity
                style={[styles.stopBtn, gradSelectedStop === 0 && styles.stopBtnActive]}
                onPress={() => setGradSelectedStop(0)}
                activeOpacity={0.7}
              >
                <View style={[styles.stopCircle, { backgroundColor: grad1Hex }]} />
                <Text style={[styles.stopLabel, { color: gradSelectedStop === 0 ? colors.tint : colors.textMuted }]}>Warna 1</Text>
              </TouchableOpacity>
              <FontAwesome name="arrow-right" size={16} color={colors.textMuted} style={{ marginHorizontal: 8 }} />
              <TouchableOpacity
                style={[styles.stopBtn, gradSelectedStop === 1 && styles.stopBtnActive]}
                onPress={() => setGradSelectedStop(1)}
                activeOpacity={0.7}
              >
                <View style={[styles.stopCircle, { backgroundColor: grad2Hex }]} />
                <Text style={[styles.stopLabel, { color: gradSelectedStop === 1 ? colors.tint : colors.textMuted }]}>Warna 2</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.hexRow, { width: pickerWidth }]}>
              <View style={[styles.hexPreview, { backgroundColor: hsvToHex(currentGradStop.hue, currentGradStop.sat, currentGradStop.val) }]} />
              <TextInput
                style={[styles.hexInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                value={hsvToHex(currentGradStop.hue, currentGradStop.sat, currentGradStop.val)}
                onChangeText={(t) => {
                  const upper = t.toUpperCase();
                  if (isValidHex(upper)) {
                    const hsv = hexToHsv(upper);
                    setGradStops(prev => {
                      const next = [...prev];
                      next[gradSelectedStop] = { hue: hsv.h, sat: hsv.s, val: hsv.v };
                      return next;
                    });
                  }
                }}
                maxLength={7}
                autoCapitalize="characters"
              />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>Arah Gradasi</Text>
            <View style={styles.dirGrid}>
              {GRADIENT_DIRECTIONS.map((dir, i) => {
                const active = gradDirection.label === dir.label;
                const gid = `${uid}_dir_${i}`;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dirBtn, { backgroundColor: active ? colors.tint : colors.inputBg, borderColor: active ? colors.tint : colors.border }]}
                    onPress={() => setGradDirection(dir)}
                    activeOpacity={0.7}
                  >
                    <Svg width={22} height={22} style={{ borderRadius: 4 }}>
                      <Defs>
                        <SvgLinearGradient id={gid} x1={dir.start.x} y1={dir.start.y} x2={dir.end.x} y2={dir.end.y}>
                          <Stop offset="0%" stopColor={grad1Hex} />
                          <Stop offset="100%" stopColor={grad2Hex} />
                        </SvgLinearGradient>
                      </Defs>
                      <Rect width={22} height={22} fill={`url(#${gid})`} rx={4} />
                    </Svg>
                    <Text style={[styles.dirLabel, { color: active ? '#fff' : colors.textSecondary }]}>{dir.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>Pratinjau</Text>
            <View style={[styles.gradPreview, { borderColor: colors.border }]}>
              <Svg width="100%" height="100%" style={{ borderRadius: 12 }}>
                <Defs>
                  <SvgLinearGradient id={`${uid}_preview`} x1={gradDirection.start.x} y1={gradDirection.start.y} x2={gradDirection.end.x} y2={gradDirection.end.y}>
                    <Stop offset="0%" stopColor={grad1Hex} />
                    <Stop offset="100%" stopColor={grad2Hex} />
                  </SvgLinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill={`url(#${uid}_preview)`} rx={12} />
              </Svg>
            </View>
          </View>
        )}

        {/* Name Input */}
        <View style={styles.nameSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Nama Tema Kustom</Text>
          <TextInput
            style={[styles.nameInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            value={themeName}
            onChangeText={setThemeName}
            placeholder="Contoh: Sunset Biru"
            placeholderTextColor={colors.textMuted}
            maxLength={30}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.tint }]} onPress={handleSave} activeOpacity={0.8}>
          <FontAwesome name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Simpan Tema Kustom</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ─── 2D Color Area ─── */
function FullColorArea2D({
  width, height, hue, sat, val, onSatValChange,
}: {
  width: number; height: number; hue: number; sat: number; val: number;
  onSatValChange: (s: number, v: number) => void;
}) {
  const hueColor = getHueColor(hue);
  const onSatValRef = useRef(onSatValChange);
  const widthRef = useRef(width);
  const heightRef = useRef(height);

  useEffect(() => { onSatValRef.current = onSatValChange; }, [onSatValChange]);
  useEffect(() => { widthRef.current = width; }, [width]);
  useEffect(() => { heightRef.current = height; }, [height]);

  const posX = (sat / 100) * width;
  const posY = (1 - val / 100) * height;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: handleTouch,
    onPanResponderMove: handleTouch,
  })).current;

  function handleTouch(evt: any) {
    const { locationX, locationY } = evt.nativeEvent;
    if (locationX == null || locationY == null) return;
    const w = widthRef.current;
    const h = heightRef.current;
    if (w <= 0 || h <= 0) return;
    const clampedX = Math.max(0, Math.min(w, locationX));
    const clampedY = Math.max(0, Math.min(h, locationY));
    const newSat = Math.round((clampedX / w) * 100);
    const newVal = Math.round((1 - clampedY / h) * 100);
    onSatValRef.current(Math.max(0, Math.min(100, newSat)), Math.max(0, Math.min(100, newVal)));
  }

  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden', alignSelf: 'center', marginTop: 16 }} {...panResponder.panHandlers}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="hueBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={hueColor} />
            <Stop offset="100%" stopColor="#000000" />
          </SvgLinearGradient>
          <SvgLinearGradient id="whiteOverlay" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="100%" stopColor="transparent" />
          </SvgLinearGradient>
        </Defs>
        <Rect width={width} height={height} fill={hueColor} />
        <Rect width={width} height={height} fill="url(#whiteOverlay)" />
        <Rect width={width} height={height} fill="url(#hueBase)" />
      </Svg>
      <View style={[style_indicator, { left: posX - INDICATOR_SIZE / 2, top: posY - INDICATOR_SIZE / 2 }]}>
        <View style={[style_indicatorInner, { borderColor: sat > 60 && val > 60 ? '#fff' : '#ddd' }]} />
      </View>
    </View>
  );
}

/* ─── Hue Slider ─── */
function FullHueSlider({
  width, height, hue, onHueChange,
}: {
  width: number; height: number; hue: number; onHueChange: (h: number) => void;
}) {
  const onHueRef = useRef(onHueChange);
  const widthRef = useRef(width);

  useEffect(() => { onHueRef.current = onHueChange; }, [onHueChange]);
  useEffect(() => { widthRef.current = width; }, [width]);

  const posX = (hue / 360) * width;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: handleTouch,
    onPanResponderMove: handleTouch,
  })).current;

  function handleTouch(evt: any) {
    const { locationX } = evt.nativeEvent;
    if (locationX == null) return;
    const w = widthRef.current;
    if (w <= 0) return;
    onHueRef.current(Math.round((Math.max(0, Math.min(w, locationX)) / w) * 360));
  }

  return (
    <View style={{ width, height, borderRadius: height / 2, overflow: 'hidden', alignSelf: 'center', marginTop: 12 }} {...panResponder.panHandlers}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">
            {SPECTRUM_COLORS.map((sc, i) => <Stop key={i} offset={sc.offset} stopColor={sc.color} />)}
          </SvgLinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#spectrum)" rx={height / 2} />
      </Svg>
      <View style={[style_hueIndicator, { left: posX - 7, height: height + 10 }]} />
    </View>
  );
}

/* ─── Inline-style helpers (avoid StyleSheet dynamic height issues) ─── */
const style_indicator: any = {
  position: 'absolute',
  width: INDICATOR_SIZE,
  height: INDICATOR_SIZE,
  borderRadius: INDICATOR_SIZE / 2,
  justifyContent: 'center',
  alignItems: 'center',
  pointerEvents: 'none',
};
const style_indicatorInner: any = {
  width: 12, height: 12, borderRadius: 6, borderWidth: 2.5, backgroundColor: 'transparent',
};
const style_hueIndicator: any = {
  position: 'absolute', top: -5, width: 14, borderRadius: 4, borderWidth: 3, borderColor: '#fff',
  backgroundColor: 'transparent', pointerEvents: 'none',
};

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  tabBar: { flexDirection: 'row', padding: 4, marginHorizontal: PADDING, marginTop: 12, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  hexRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, alignSelf: 'center', gap: 10 },
  hexPreview: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  hexInput: {
    flex: 1, height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12,
    fontSize: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600', letterSpacing: 1,
  },
  pipetteIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  stopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stopBtn: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  stopBtnActive: {},
  stopCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)', marginBottom: 4 },
  stopLabel: { fontSize: 12, fontWeight: '600' },
  dirGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dirBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  dirLabel: { fontSize: 11, fontWeight: '600' },
  gradPreview: { width: '100%', height: 56, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  nameSection: { marginTop: 16 },
  nameInput: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
