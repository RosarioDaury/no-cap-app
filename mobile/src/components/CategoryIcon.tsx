import { ShoppingCart, Zap, PartyPopper, Fuel, Heart, BookOpen, Umbrella, CreditCard, Car } from 'lucide-react-native';
import { TintName, tintPalette as defaultTintPalette, colors as defaultColors } from '@/src/theme/theme';
import { useTheme } from '@/src/hooks/ThemeProvider';

const map: Record<string, typeof ShoppingCart> = {
  'shopping-cart': ShoppingCart,
  zap: Zap,
  'party-popper': PartyPopper,
  fuel: Fuel,
  heart: Heart,
  book: BookOpen,
  umbrella: Umbrella,
  'credit-card': CreditCard,
  car: Car,
};

export const CATEGORY_ICON_OPTIONS = Object.keys(map);
export const CATEGORY_TINT_OPTIONS: TintName[] = ['teal', 'gold', 'plum', 'coral'];

export function CategoryIcon({
  name,
  tint,
  size = 16,
  shade = 700,
}: {
  name: string;
  tint?: TintName;
  size?: number;
  shade?: 500 | 700;
}) {
  const { colors, tintPalette } = useTheme();
  const Icon = map[name] ?? ShoppingCart;
  const color = tint ? tintPalette[tint][shade] : colors.textSecondary;
  return <Icon size={size} color={color} />;
}

export function iconBg(
  tint: TintName,
  palette: typeof defaultTintPalette = defaultTintPalette,
): string {
  return palette[tint][100];
}

/** Prefer this in themed screens so icon chips follow light/dark. */
export function useIconBg() {
  const { tintPalette } = useTheme();
  return (tint: TintName) => tintPalette[tint][100];
}

// Keep defaultColors import used for type-check of palette shape
void defaultColors;
