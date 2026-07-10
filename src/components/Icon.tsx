import {
  Utensils, Car, ShoppingBag, Receipt, Clapperboard, HeartPulse, GraduationCap,
  Plane, Ellipsis, Wallet, Gift, BadgePercent, TrendingUp, CircleDollarSign,
  Coffee, Pizza, Fuel, Bus, Zap, Wifi, Droplet, Film, Music, BookOpen,
  Stethoscope, Dumbbell, Shirt, Baby, ShoppingCart, HandCoins, Briefcase, Home,
  Smartphone, PiggyBank, Target, Heart, Gem, Gamepad2, Camera, Laptop, Bike,
  TreePalm, Sparkles, Landmark, Banknote, CreditCard, Cat, Dog, Cake,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps a stored kebab-case icon slug to a lucide component so categories,
 * budgets, and savings goals can show a real icon instead of just a colour.
 */
const MAP: Record<string, LucideIcon> = {
  utensils: Utensils, car: Car, "shopping-bag": ShoppingBag, receipt: Receipt,
  clapperboard: Clapperboard, "heart-pulse": HeartPulse, "graduation-cap": GraduationCap,
  plane: Plane, ellipsis: Ellipsis, wallet: Wallet, gift: Gift,
  "badge-percent": BadgePercent, "trending-up": TrendingUp, "circle-dollar-sign": CircleDollarSign,
  coffee: Coffee, pizza: Pizza, fuel: Fuel, bus: Bus, zap: Zap, wifi: Wifi,
  droplet: Droplet, film: Film, music: Music, "book-open": BookOpen,
  stethoscope: Stethoscope, dumbbell: Dumbbell, shirt: Shirt, baby: Baby,
  "shopping-cart": ShoppingCart, "hand-coins": HandCoins, briefcase: Briefcase,
  home: Home, smartphone: Smartphone, "piggy-bank": PiggyBank, target: Target,
  heart: Heart, gem: Gem, gamepad2: Gamepad2, camera: Camera, laptop: Laptop,
  bike: Bike, "tree-palm": TreePalm, sparkles: Sparkles, landmark: Landmark,
  banknote: Banknote, "credit-card": CreditCard, cat: Cat, dog: Dog, cake: Cake,
};

/** Icons offered when choosing a category icon. */
export const CATEGORY_ICONS = [
  "utensils", "coffee", "pizza", "shopping-cart", "shopping-bag", "shirt", "car",
  "fuel", "bus", "bike", "home", "zap", "droplet", "wifi", "smartphone", "receipt",
  "film", "clapperboard", "music", "gamepad2", "book-open", "graduation-cap",
  "heart-pulse", "stethoscope", "dumbbell", "plane", "tree-palm", "gift",
  "hand-coins", "wallet", "trending-up", "badge-percent", "briefcase", "baby",
  "cat", "dog", "cake", "circle-dollar-sign",
];

/** Icons offered when choosing a savings-goal icon. */
export const GOAL_ICONS = [
  "piggy-bank", "target", "home", "car", "bike", "plane", "tree-palm",
  "graduation-cap", "smartphone", "laptop", "camera", "gamepad2", "heart", "gem",
  "gift", "baby", "briefcase", "dumbbell", "shirt", "cake", "banknote", "wallet",
];

export default function Icon({
  name,
  size = 18,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const Cmp = (name && MAP[name]) || CircleDollarSign;
  return <Cmp size={size} className={className} />;
}
