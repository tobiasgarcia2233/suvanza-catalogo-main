"use client";

import type { Category } from "@/types";

interface CategoryFilterBarProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryFilterBar({
  categories,
  selected,
  onSelect,
}: CategoryFilterBarProps) {
  if (categories.length === 0) return null;

  const pillClasses = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-brand text-white"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={pillClasses(selected === null)}
      >
        Todas
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(selected === c.id ? null : c.id)}
          className={pillClasses(selected === c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
