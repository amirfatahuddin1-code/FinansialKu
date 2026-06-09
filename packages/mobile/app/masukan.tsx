import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { useColors } from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';

export default function MasukanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  useColors();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleKirim = () => {
    if (rating === 0) {
      Alert.alert('Perhatian', 'Mohon berikan penilaian bintang terlebih dahulu.');
      return;
    }
    
    // Simulate sending feedback
    Alert.alert('Terima Kasih!', 'Masukan Anda telah berhasil dikirim. Kami sangat menghargai feedback Anda!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome name="chevron-left" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Masukan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Graphic Area (mimicking the image illustration) */}
        <View style={styles.graphicContainer}>
          <View style={styles.semiCircleBg}>
            {/* Mascot Element */}
            <View style={styles.mascotContainer}>
              <View style={styles.mascotFace}>
                {/* Eyes */}
                <View style={styles.eyeLeft} />
                <View style={styles.eyeRight} />
                {/* Smile */}
                <View style={styles.smile} />
              </View>
              {/* Wizard Hat */}
              <View style={styles.hatBase} />
              <View style={styles.hatTop} />
              {/* Stars */}
              <FontAwesome name="star" size={24} color="#f43f5e" style={styles.starPink1} />
              <FontAwesome name="star" size={18} color="#f43f5e" style={styles.starPink2} />
              <FontAwesome name="star" size={32} color="#fbbf24" style={styles.starYellow1} />
              <FontAwesome name="star" size={14} color="#fbbf24" style={styles.starYellow2} />
              <FontAwesome name="star" size={20} color="#fbbf24" style={styles.starYellow3} />
            </View>
          </View>
        </View>

        {/* Feedback Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.cardTitle}>
            Nilai pengalaman kamu{'\n'}menggunakan Karsafin!
          </Text>

          {/* Star Rating */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
                style={styles.starButton}
              >
                <FontAwesome 
                  name="star" 
                  size={36} 
                  color={star <= rating ? '#fbbf24' : '#cbd5e1'} 
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Feedback Input */}
          <View style={[styles.inputContainer, { backgroundColor: colorScheme === 'dark' ? '#334155' : '#f8fafc' }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Tulis masukan atau saran kamu di sini"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              value={feedback}
              onChangeText={setFeedback}
            />
          </View>

          {/* Footer Text */}
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Tim Karsafin bakal baca saran kamu. Kalau kamu tertarik ngobrol bareng tim Karsafin, tulis di sini ya!
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.submitButton, 
            { 
              backgroundColor: rating > 0 ? '#60a5fa' : '#94a3b8',
              opacity: rating > 0 ? 1 : 0.8 
            }
          ]}
          onPress={handleKirim}
          disabled={rating === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Kirim</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  graphicContainer: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginTop: -10, // Bring it closer to header
  },
  semiCircleBg: {
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#bfdbfe', // Light blue background
    position: 'absolute',
    bottom: -150,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  mascotContainer: {
    width: 140,
    height: 140,
    position: 'relative',
    alignItems: 'center',
  },
  mascotFace: {
    width: 100,
    height: 70,
    backgroundColor: '#1e293b',
    borderRadius: 35,
    position: 'absolute',
    bottom: 20,
    borderWidth: 8,
    borderColor: '#f8fafc',
  },
  eyeLeft: {
    width: 12,
    height: 6,
    backgroundColor: '#93c5fd',
    borderRadius: 6,
    position: 'absolute',
    top: 20,
    left: 20,
    transform: [{ rotate: '15deg' }],
  },
  eyeRight: {
    width: 12,
    height: 6,
    backgroundColor: '#93c5fd',
    borderRadius: 6,
    position: 'absolute',
    top: 20,
    right: 20,
    transform: [{ rotate: '-15deg' }],
  },
  smile: {
    width: 16,
    height: 6,
    borderBottomWidth: 3,
    borderBottomColor: '#f8fafc',
    borderRadius: 8,
    position: 'absolute',
    bottom: 15,
    left: '42%',
  },
  hatBase: {
    width: 120,
    height: 20,
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    position: 'absolute',
    top: 40,
    transform: [{ rotate: '-10deg' }],
    zIndex: 2,
  },
  hatTop: {
    width: 70,
    height: 80,
    backgroundColor: '#312e81',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 40,
    position: 'absolute',
    top: -20,
    left: 20,
    transform: [{ rotate: '-5deg' }],
    zIndex: 1,
  },
  starPink1: { position: 'absolute', top: -30, right: 30, zIndex: 3 },
  starPink2: { position: 'absolute', top: 50, left: -20, zIndex: 3 },
  starYellow1: { position: 'absolute', top: 30, right: -40, zIndex: 3 },
  starYellow2: { position: 'absolute', top: 10, left: 10, zIndex: 3 },
  starYellow3: { position: 'absolute', top: 60, left: -50, zIndex: 3 },
  card: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginTop: -40, // Overlap with graphic
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 10,
    borderWidth: 1,
    marginBottom: 40,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1d4ed8', // Deep blue
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  inputContainer: {
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  submitButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
