import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  PanResponder,
  Dimensions,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Svg, { Rect, LinearGradient as SvgLinearGradient, Stop, Circle, Defs } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
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

export type ColorPickerResult = {
  mode: 'solid';
  color: string;
  name: string;
} | {
  mode: 'gradient';
  colors: [string, string];
  direction: GradientDirection;
  name: string;
};

interface ColorPickerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (result: ColorPickerResult) => void;
}

export default function ColorPicker({ visible, onClose, onSave }: ColorPickerProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const maxSheetHeight = winHeight * 0.9;

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

  useEffect(() => {
    if (visible) {
      setThemeName('');
      setActiveTab('solid');
      setHue(260); setSat(80); setVal(90);
      setHexInput('#8B5CF6');
      setGradSelectedStop(0);
      setGradStops([
        { hue: 260, sat: 80, val: 90 },
        { hue: 200, sat: 70, val: 85 },
      ]);
      setGradDirection(GRADIENT_DIRECTIONS[2]);
    }
  }, [visible]);

  const updateHexFromSolid = useCallback((h: number, s: number, v: number) => {
    setHexInput(hsvToHex(h, s, v));
  }, []);

  const handleSolidSatValChange = useCallback((s: number, v: number) => {
    setSat(s); setVal(v);
    setHexInput(hsvToHex(hue, s, v));
  }, [hue]);

  const handleSolidHueChange = useCallback((h: number) => {
    setHue(h);
    setHexInput(hsvToHex(h, sat, val));
  }, [sat, val]);

  const handleSolidHexSubmit = useCallback((text: string) => {
    const upper = text.toUpperCase();
    setHexInput(upper);
    if (isValidHex(upper)) {
      const hsv = hexToHsv(upper);
      setHue(hsv.h); setSat(hsv.s); setVal(hsv.v);
    }
  }, []);

  const solidHex = hsvToHex(hue, sat, val);
  const currentGradStop = gradStops[gradSelectedStop];
  const grad1Hex = hsvToHex(gradStops[0].hue, gradStops[0].sat, gradStops[0].val);
  const grad2Hex = hsvToHex(gradStops[1].hue, gradStops[1].sat, gradStops[1].val);

  const handleGradSatValChange = useCallback((s: number, v: number) => {
    setGradStops(prev => {
      const next = [...prev];
      next[gradSelectedStop] = { ...next[gradSelectedStop], sat: s, val: v };
      return next;
    });
  }, [gradSelectedStop]);

  const handleGradHueChange = useCallback((h: number) => {
    setGradStops(prev => {
      const next = [...prev];
      next[gradSelectedStop] = { ...next[gradSelectedStop], hue: h };
      return next;
    });
  }, [gradSelectedStop]);

  const handleGradHexSubmit = useCallback((text: string, stopIndex: number) => {
    const upper = text.toUpperCase();
    if (isValidHex(upper)) {
      const hsv = hexToHsv(upper);
      setGradStops(prev => {
        const next = [...prev];
        next[stopIndex] = { hue: hsv.h, sat: hsv.s, val: hsv.v };
        return next;
      });
    }
  }, []);

  const currentHue = activeTab === 'solid' ? hue : currentGradStop.hue;
  const currentSat = activeTab === 'solid' ? sat : currentGradStop.sat;
  const currentVal = activeTab === 'solid' ? val : currentGradStop.val;

  const handleSave = () => {
    const name = themeName.trim() || (activeTab === 'solid' ? `Warna ${solidHex}` : `Gradasi ${grad1Hex} - ${grad2Hex}`);
    if (activeTab === 'solid') {
      onSave({ mode: 'solid', color: solidHex, name });
    } else {
      onSave({
        mode: 'gradient',
        colors: [grad1Hex, grad2Hex],
        direction: gradDirection,
        name,
      });
    }
  };

  const uid = useRef(Date.now().toString(36)).current;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <View style={{ maxHeight: maxSheetHeight, justifyContent: 'flex-end' }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.sheet, { backgroundColor: theme.card, height: maxSheetHeight }]}>
              <View style={{ flex: 1 }}>
              <View style={styles.dragHandle} />
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Pilih Warna Kustom</Text>

              {/* Tab Switcher */}
              <View style={[styles.tabBar, { backgroundColor: theme.inputBg, borderRadius: 12 }]}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'solid' && { backgroundColor: theme.tint }]}
                  onPress={() => setActiveTab('solid')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'solid' ? '#fff' : theme.textSecondary }]}>
                    Warna Solid
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'gradient' && { backgroundColor: theme.tint }]}
                  onPress={() => setActiveTab('gradient')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'gradient' ? '#fff' : theme.textSecondary }]}>
                    Gradasi
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView key={activeTab} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16, paddingTop: 4 }}>
                {/* 2D Color Area */}
                <ColorArea2D
                  width={PICKER_WIDTH}
                  height={PICKER_HEIGHT}
                  hue={currentHue}
                  sat={currentSat}
                  val={currentVal}
                  onSatValChange={activeTab === 'solid' ? handleSolidSatValChange : handleGradSatValChange}
                />

                {/* Hue Slider */}
                <HueSlider
                  width={PICKER_WIDTH}
                  height={SLIDER_HEIGHT}
                  hue={currentHue}
                  onHueChange={activeTab === 'solid' ? handleSolidHueChange : handleGradHueChange}
                />

                {/* Hex Input + Preview — Solid */}
                {activeTab === 'solid' && (
                  <View style={[styles.hexRow, { width: PICKER_WIDTH }]}>
                    <View style={[styles.hexPreview, { backgroundColor: solidHex }]} />
                    <TextInput
                      style={[styles.hexInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                      value={hexInput}
                      onChangeText={handleSolidHexSubmit}
                      maxLength={7}
                      autoCapitalize="characters"
                    />
                    <View style={styles.pipetteIcon}>
                      <FontAwesome name="eyedropper" size={18} color={theme.textMuted} />
                    </View>
                  </View>
                )}

                {/* Gradient Tab Content */}
                {activeTab === 'gradient' && (
                  <View style={{ marginTop: 16 }}>
                    {/* Color Stop Selector */}
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Pilih Warna Gradasi</Text>
                    <View style={styles.stopRow}>
                      <TouchableOpacity
                        style={[styles.stopBtn, gradSelectedStop === 0 && styles.stopBtnActive]}
                        onPress={() => setGradSelectedStop(0)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.stopCircle, { backgroundColor: grad1Hex }]} />
                        <Text style={[styles.stopLabel, { color: gradSelectedStop === 0 ? theme.tint : theme.textMuted }]}>
                          Warna 1
                        </Text>
                      </TouchableOpacity>

                      <FontAwesome name="arrow-right" size={16} color={theme.textMuted} style={{ marginHorizontal: 8 }} />

                      <TouchableOpacity
                        style={[styles.stopBtn, gradSelectedStop === 1 && styles.stopBtnActive]}
                        onPress={() => setGradSelectedStop(1)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.stopCircle, { backgroundColor: grad2Hex }]} />
                        <Text style={[styles.stopLabel, { color: gradSelectedStop === 1 ? theme.tint : theme.textMuted }]}>
                          Warna 2
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Gradient Hex Input */}
                    <View style={[styles.hexRow, { width: PICKER_WIDTH }]}>
                      <View style={[styles.hexPreview, { backgroundColor: hsvToHex(currentGradStop.hue, currentGradStop.sat, currentGradStop.val) }]} />
                      <TextInput
                        style={[styles.hexInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                        value={hsvToHex(currentGradStop.hue, currentGradStop.sat, currentGradStop.val)}
                        onChangeText={(t) => handleGradHexSubmit(t, gradSelectedStop)}
                        maxLength={7}
                        autoCapitalize="characters"
                      />
                    </View>

                    {/* Direction Selector */}
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 16 }]}>Arah Gradasi</Text>
                    <View style={styles.dirGrid}>
                      {GRADIENT_DIRECTIONS.map((dir, i) => {
                        const active = gradDirection.label === dir.label;
                        const gid = `${uid}_dir_${i}`;
                        return (
                          <TouchableOpacity
                            key={i}
                            style={[
                              styles.dirBtn,
                              {
                                backgroundColor: active ? theme.tint : theme.inputBg,
                                borderColor: active ? theme.tint : theme.border,
                              },
                            ]}
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
                            <Text style={[styles.dirLabel, { color: active ? '#fff' : theme.textSecondary }]}>
                              {dir.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Gradient Preview */}
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 16 }]}>Pratinjau</Text>
                    <View style={[styles.gradPreview, { borderColor: theme.border }]}>
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
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Nama Tema Kustom</Text>
                  <TextInput
                    style={[styles.nameInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    value={themeName}
                    onChangeText={setThemeName}
                    placeholder="Contoh: Sunset Biru"
                    placeholderTextColor={theme.textMuted}
                    maxLength={30}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.tint }]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="check" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Simpan Tema Kustom</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Close */}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Text style={[styles.closeText, { color: theme.textSecondary }]}>Batal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── 2D Color Area ─── */
function ColorArea2D({
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (evt) => handleTouch(evt),
      onPanResponderMove: (evt) => handleTouch(evt),
    })
  ).current;

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
    <View
      style={{ width, height, borderRadius: 12, overflow: 'hidden', alignSelf: 'center', marginTop: 16 }}
      {...panResponder.panHandlers}
    >
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
      {/* Indicator */}
      <View style={[styles.indicator, { left: posX - INDICATOR_SIZE / 2, top: posY - INDICATOR_SIZE / 2 }]}>
        <View style={[styles.indicatorInner, { borderColor: sat > 60 && val > 60 ? '#fff' : '#ddd' }]} />
      </View>
    </View>
  );
}

/* ─── Hue Slider ─── */
function HueSlider({
  width, height, hue, onHueChange,
}: {
  width: number; height: number; hue: number; onHueChange: (h: number) => void;
}) {
  const onHueRef = useRef(onHueChange);
  const widthRef = useRef(width);

  useEffect(() => { onHueRef.current = onHueChange; }, [onHueChange]);
  useEffect(() => { widthRef.current = width; }, [width]);

  const posX = (hue / 360) * width;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: (evt) => handleTouch(evt),
      onPanResponderMove: (evt) => handleTouch(evt),
    })
  ).current;

  function handleTouch(evt: any) {
    const { locationX } = evt.nativeEvent;
    if (locationX == null) return;
    const w = widthRef.current;
    if (w <= 0) return;
    const clamped = Math.max(0, Math.min(w, locationX));
    onHueRef.current(Math.round((clamped / w) * 360));
  }

  return (
    <View
      style={{ width, height, borderRadius: height / 2, overflow: 'hidden', alignSelf: 'center', marginTop: 12 }}
      {...panResponder.panHandlers}
    >
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">
            {SPECTRUM_COLORS.map((sc, i) => (
              <Stop key={i} offset={sc.offset} stopColor={sc.color} />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#spectrum)" rx={height / 2} />
      </Svg>
      {/* Indicator */}
      <View style={[styles.hueIndicator, { left: posX - 7, height: height + 10 }]} />
    </View>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.5,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  indicatorInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  hueIndicator: {
    position: 'absolute',
    top: -5,
    width: 14,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    pointerEvents: 'none',
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'center',
    gap: 10,
  },
  hexPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  hexInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
    letterSpacing: 1,
  },
  pipetteIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stopBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  stopBtnActive: {},
  stopCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
    marginBottom: 4,
  },
  stopLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dirGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dirLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  gradPreview: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  nameSection: {
    marginTop: 16,
  },
  nameInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    marginTop: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
