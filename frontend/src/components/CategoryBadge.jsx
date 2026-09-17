import * as Icons from "lucide-react";
import { COLOR_MAP } from "../lib/api";
import { useCategories } from "../lib/categoriesContext";

export default function CategoryBadge({ category }) {
  const { categories } = useCategories();
  const meta = categories.find((c) => c.name === category);
  const iconName = meta?.icon || "MoreHorizontal";
  const color = meta?.color || "stone";
  const Icon = Icons[iconName] || Icons.MoreHorizontal;
  const cls = (COLOR_MAP[color] || COLOR_MAP.stone).cls;

  return (
    <span
      data-testid={`cat-badge-${category}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cls}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {category}
    </span>
  );
}
