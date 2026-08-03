export const colors = {
  bgApp: '#0C0E11',
  surface: '#16191E',
  surfaceAlt: '#1D2127',
  border: '#2B3038',
  textPrimary: '#EDEFF2',
  textSecondary: '#9AA2AC',
  textMuted: '#5C636D',

  teal: {
    900: '#003B3E',
    700: '#0891A8',
    500: '#22D3EE',
    300: '#7EE8F5',
    100: '#B8F3FA',
    50: '#0E2A2E',
  },
  gold: {
    700: '#B45309',
    500: '#F5A623',
    300: '#FBC55C',
    100: '#FDE0A6',
    50: '#2A2013',
  },
  plum: {
    700: '#5B21B6',
    500: '#8B5CF6',
    300: '#B9A6FA',
    100: '#DCD1FC',
    50: '#211A38',
  },
  coral: {
    700: '#9F1239',
    500: '#FB4463',
    300: '#FB8598',
    100: '#FDC8D2',
    50: '#2A1420',
  },

  chrome1: '#3B4148',
  chrome2: '#1C1F24',
  chrome3: '#0A0B0D',
} as const;

export type TintName = 'teal' | 'gold' | 'plum' | 'coral';

export const tintPalette = {
  teal: colors.teal,
  gold: colors.gold,
  plum: colors.plum,
  coral: colors.coral,
} as const;

export const radius = { sm: 12, md: 16, lg: 26, pill: 999 } as const;

export const typography = {
  display: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
  displayBold: 'SpaceGrotesk_700Bold',
  ui: 'Manrope_400Regular',
  uiMedium: 'Manrope_500Medium',
  uiSemiBold: 'Manrope_600SemiBold',
  uiBold: 'Manrope_700Bold',
  eyebrow: 11,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
