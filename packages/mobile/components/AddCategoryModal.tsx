import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { useColorScheme } from './useColorScheme';
import Colors from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/DesignSystem';
import BottomSheet from './BottomSheet';
import type { Category } from '@karsafin/shared';

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (newCat: Category) => void;
  initialType: 'income' | 'expense' | 'savings';
}

const PRESET_COLORS = [
  '#ef4444', // Red
  '#10b981', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Orange
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Gray
];

export default function AddCategoryModal({ visible, onClose, onSave, initialType }: AddCategoryModalProps) {
  const { user, api } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState(PRESET_COLORS[2]); // Default to blue
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Input Error', 'Nama kategori tidak boleh kosong');
      return;
    }

    setSaving(false);
    try {
      setSaving(true);
      const { data, error } = await api.categories.create(user.id, {
        name: name.trim(),
        icon: icon.trim() || '🏷️',
        color,
        type: initialType,
      });

      if (error) {
        throw error;
      }

      if (data) {
        // Reset states
        setName('');
        setIcon('🏷️');
        setColor(PRESET_COLORS[2]);
        onSave(data);
      }
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Gagal menyimpan kategori baru');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Tambah Kategori Baru">
      <View style={{ gap: Spacing.md, paddingBottom: 20 }}>
        {/* Nama Kategori */}
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Kategori</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Mis: Jajan, Transport, Gaji"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* Ikon Emoji */}
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Ikon Emoji</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Ketik satu emoji (mis: 🍔, 🚗)"
            placeholderTextColor={colors.textMuted}
            value={icon}
            onChangeText={setIcon}
          />
        </View>

        {/* Pilihan Warna */}
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Warna Kategori</Text>
          <View style={styles.colorGrid}>
            {PRESET_COLORS.map((c) => {
              const isSelected = color === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    isSelected && { borderColor: colors.text, borderWidth: 3 },
                  ]}
                  onPress={() => setColor(c)}
                  activeOpacity={0.8}
                />
              );
            })}
          </View>
        </View>

        {/* Tombol Simpan */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Kategori</Text>}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 16,
    fontSize: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 4,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  saveBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
