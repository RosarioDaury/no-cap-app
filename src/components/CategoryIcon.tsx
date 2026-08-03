import { ShoppingCart, Zap, PartyPopper, Fuel, Heart, BookOpen, Umbrella, CreditCard, Car } from 'lucide-react-native';
import { colors, TintName, tintPalette } from '@/src/theme/theme';

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

export function CategoryIcon({
  name,
  tint,
  size = 16,
}: {
  name: string;
  tint?: TintName;
  size?: number;
}) {
  const Icon = map[name] ?? ShoppingCart;
  const color = tint ? tintPalette[tint][700] : colors.textSecondary;
  return <Icon size={size} color={color} />;
}

export function iconBg(tint: TintName): string {
  return tintPalette[tint][100];
}
