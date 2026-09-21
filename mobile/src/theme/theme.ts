export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  bgApp: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  teal: TintScale;
  gold: TintScale;
  plum: TintScale;
  coral: TintScale;
  chrome1: string;
  chrome2: string;
  chrome3: string;
  /** Primary CTA label / accent on chrome buttons */
  chromeText: string;
  /** Expanded quick-add circle gradient */
  chromeExpanded1: string;
  chromeExpanded2: string;
  /** Hairline on metal buttons */
  chromeBorder: string;
};

type TintScale = {
  900: string;
  700: string;
  500: string;
  300: string;
  100: string;
  50: string;
};

export const darkColors: ThemeColors = {
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
    900: '#78350F',
    700: '#B45309',
    500: '#F5A623',
    300: '#FBC55C',
    100: '#FDE0A6',
    50: '#2A2013',
  },
  plum: {
    900: '#4C1D95',
    700: '#5B21B6',
    500: '#8B5CF6',
    300: '#B9A6FA',
    100: '#DCD1FC',
    50: '#211A38',
  },
  coral: {
    900: '#9F1239',
    700: '#9F1239',
    500: '#FB4463',
    300: '#FB8598',
    100: '#FDC8D2',
    50: '#2A1420',
  },
  chrome1: '#3B4148',
  chrome2: '#1C1F24',
  chrome3: '#0A0B0D',
  chromeText: '#7EE8F5',
  chromeExpanded1: '#2a3138',
  chromeExpanded2: '#14171a',
  chromeBorder: 'rgba(255,255,255,0.12)',
};

/** Cool neutral light palette — keeps brand accents, avoids cream/terracotta defaults. */
export const lightColors: ThemeColors = {
  bgApp: '#F0F2F5',
  surface: '#FFFFFF',
  surfaceAlt: '#E6E9EE',
  border: '#CDD2D9',
  textPrimary: '#12151A',
  textSecondary: '#5A6570',
  textMuted: '#8A939E',
  teal: {
    900: '#003B3E',
    700: '#0E7490',
    500: '#0891A8',
    300: '#22D3EE',
    100: '#CFFAFE',
    50: '#E0F7FA',
  },
  gold: {
    900: '#78350F',
    700: '#B45309',
    500: '#D97706',
    300: '#F5A623',
    100: '#FEF3C7',
    50: '#FFF8EB',
  },
  plum: {
    900: '#4C1D95',
    700: '#6D28D9',
    500: '#7C3AED',
    300: '#8B5CF6',
    100: '#EDE9FE',
    50: '#F5F3FF',
  },
  coral: {
    900: '#9F1239',
    700: '#BE123C',
    500: '#E11D48',
    300: '#FB4463',
    100: '#FFE4E6',
    50: '#FFF1F2',
  },
  chrome1: '#E8EAED',
  chrome2: '#D8DCE2',
  chrome3: '#C5CAD3',
  chromeText: '#0E7490',
  chromeExpanded1: '#D0D5DC',
  chromeExpanded2: '#B8BFC9',
  chromeBorder: 'rgba(0,0,0,0.08)',
};

export type TintName = 'teal' | 'gold' | 'plum' | 'coral';

export function tintPaletteFor(colors: ThemeColors) {
  return {
    teal: colors.teal,
    gold: colors.gold,
    plum: colors.plum,
    coral: colors.coral,
  } as const;
}

/** @deprecated Prefer useTheme().colors — defaults to dark for non-UI helpers. */
export const colors = darkColors;

/** @deprecated Prefer useTheme().tintPalette */
export const tintPalette = tintPaletteFor(darkColors);

export const radius = { sm: 12, md: 16, lg: 26, xl: 18, pill: 999 } as const;

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

export const type = {
  hero: { fontFamily: typography.display, fontSize: 52, letterSpacing: -1.5 },
  display: { fontFamily: typography.display, fontSize: 28, letterSpacing: -0.6 },
  title: { fontFamily: typography.display, fontSize: 24, letterSpacing: -0.4 },
  amountLg: { fontFamily: typography.display, fontSize: 21 },
  amountSm: { fontFamily: typography.display, fontSize: 14 },
  rowTitle: { fontFamily: typography.uiSemiBold, fontSize: 13.5 },
  body: { fontFamily: typography.uiMedium, fontSize: 13, lineHeight: 20 },
  meta: { fontFamily: typography.uiMedium, fontSize: 11 },
  eyebrow: {
    fontFamily: typography.uiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  tab: { fontFamily: typography.uiBold, fontSize: 9, letterSpacing: 0.4 },
} as const;

export const glow = {
  teal: {
    shadowColor: '#22D3EE',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export function paletteForMode(mode: ThemeMode): ThemeColors {
  return mode === 'light' ? lightColors : darkColors;
}
