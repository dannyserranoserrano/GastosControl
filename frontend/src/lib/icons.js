import {
  Hammer, Wrench, FileText, Users, Truck, MoreHorizontal,
  Paintbrush, Zap, Home, Package, ShoppingCart, Trees,
  Droplet, Flame, Bolt, Lightbulb, PiggyBank, Sparkles,
} from "lucide-react";

export const ICONS = {
  Hammer,
  Wrench,
  FileText,
  Users,
  Truck,
  MoreHorizontal,
  Paintbrush,
  Zap,
  Home,
  Package,
  ShoppingCart,
  Trees,
  Droplet,
  Flame,
  Bolt,
  Lightbulb,
  PiggyBank,
  Sparkles,
};

export function iconFor(name) {
  return ICONS[name] || MoreHorizontal;
}