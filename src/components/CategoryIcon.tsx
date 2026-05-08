import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

interface CategoryIconProps {
  iconName: string;
  className?: string;
  size?: number;
}

// Colorful gradient backgrounds for different icon types
const iconColors: Record<string, string> = {
  // Food & Dining
  UtensilsCrossed: "bg-gradient-to-br from-orange-400 to-red-500",
  Utensils: "bg-gradient-to-br from-orange-400 to-red-500",
  Coffee: "bg-gradient-to-br from-amber-500 to-orange-600",
  
  // Transportation
  Car: "bg-gradient-to-br from-red-500 to-pink-600",
  Plane: "bg-gradient-to-br from-blue-400 to-cyan-500",
  Navigation: "bg-gradient-to-br from-blue-400 to-cyan-500",
  
  // Shopping & Retail
  ShoppingBag: "bg-gradient-to-br from-green-400 to-emerald-500",
  ShoppingCart: "bg-gradient-to-br from-green-400 to-emerald-500",
  
  // Health & Medical
  Heart: "bg-gradient-to-br from-pink-400 to-rose-500",
  Activity: "bg-gradient-to-br from-green-400 to-emerald-500",
  
  // Work & Business
  Briefcase: "bg-gradient-to-br from-amber-600 to-orange-600",
  Building: "bg-gradient-to-br from-gray-500 to-gray-700",
  Building2: "bg-gradient-to-br from-gray-500 to-gray-700",
  
  // Entertainment
  Film: "bg-gradient-to-br from-purple-500 to-indigo-600",
  Gamepad2: "bg-gradient-to-br from-purple-500 to-pink-600",
  Music: "bg-gradient-to-br from-pink-400 to-purple-500",
  
  // Education
  Book: "bg-gradient-to-br from-blue-500 to-indigo-600",
  GraduationCap: "bg-gradient-to-br from-purple-500 to-indigo-600",
  
  // Fitness & Sports
  Dumbbell: "bg-gradient-to-br from-yellow-400 to-orange-500",
  
  // Home & Utilities
  Home: "bg-gradient-to-br from-amber-500 to-orange-600",
  Zap: "bg-gradient-to-br from-yellow-400 to-amber-500",
  Wifi: "bg-gradient-to-br from-blue-400 to-cyan-500",
  
  // Finance
  CreditCard: "bg-gradient-to-br from-blue-500 to-indigo-600",
  DollarSign: "bg-gradient-to-br from-green-500 to-emerald-600",
  PiggyBank: "bg-gradient-to-br from-pink-400 to-rose-500",
  TrendingUp: "bg-gradient-to-br from-green-500 to-emerald-600",
  
  // Gifts & Special
  Gift: "bg-gradient-to-br from-yellow-400 to-orange-500",
  
  // Travel
  MapPin: "bg-gradient-to-br from-red-400 to-pink-500",
  
  // Additional common icons
  Receipt: "bg-gradient-to-br from-gray-400 to-gray-600",
  Scissors: "bg-gradient-to-br from-orange-400 to-red-500",
  Users: "bg-gradient-to-br from-yellow-400 to-orange-500",
  Code: "bg-gradient-to-br from-blue-500 to-indigo-600",
  
  // Default fallback - colorful gradient
  default: "bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500",
};

export function CategoryIcon({ iconName, className, size = 20 }: CategoryIconProps) {
  const IconComponent = (LucideIcons as any)[iconName];
  
  if (!IconComponent) {
    return null;
  }

  const colorClass = iconColors[iconName] || iconColors.default;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg p-1.5 shadow-sm",
        colorClass,
        className
      )}
      style={{ width: size + 8, height: size + 8 }}
    >
      <IconComponent 
        className="h-full w-full text-white" 
        style={{ width: size, height: size }}
      />
    </div>
  );
}

