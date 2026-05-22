import Colors from './Colors'

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 60,
}

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
}

export const Typography = {
  h1: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  h2: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  h3: { fontSize: 24, fontWeight: '800' },
  h4: { fontSize: 20, fontWeight: '700' },
  h5: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  bodyBold: { fontSize: 16, fontWeight: '700' },
  caption: { fontSize: 13, fontWeight: '500' },
  small: { fontSize: 12, fontWeight: '500' },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
}

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
}

export function getShadow(level: keyof typeof Shadows, colorScheme: 'light' | 'dark') {
  if (colorScheme === 'dark') {
    return {
      ...Shadows[level],
      shadowOpacity: (Shadows[level].shadowOpacity as number) * 1.5,
    }
  }
  return Shadows[level]
}
