import React, { createContext, useContext, useMemo } from 'react';
import {
  ThemeColors,
  ThemeMode,
  paletteForMode,
  tintPaletteFor,
  typography,
  radius,
  spacing,
} from '@/src/theme/theme';
import { useDb } from '@/src/hooks/DbProvider';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  tintPalette: ReturnType<typeof tintPaletteFor>;
  setMode: (mode: ThemeMode) => Promise<void>;
  typography: typeof typography;
  radius: typeof radius;
  spacing: typeof spacing;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, setSetting } = useDb();
  const mode: ThemeMode = settings?.theme === 'light' ? 'light' : 'dark';

  const value = useMemo<ThemeContextValue>(() => {
    const colors = paletteForMode(mode);
    return {
      mode,
      colors,
      tintPalette: tintPaletteFor(colors),
      setMode: async (next) => {
        await setSetting({ theme: next });
      },
      typography,
      radius,
      spacing,
    };
  }, [mode, setSetting]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
