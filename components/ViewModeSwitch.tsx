// src/components/ui/ViewModeSwitch.tsx
"use client";

import { List, LayoutGrid } from "lucide-react";

export type ViewMode = "grid" | "catalog";

interface ViewModeSwitchProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function ViewModeSwitch({ viewMode, setViewMode }: ViewModeSwitchProps) {
  const baseClasses = "p-2 rounded-md transition-colors";
  const activeClasses = "bg-brand text-white";
  const inactiveClasses = "bg-gray-200 text-gray-600 hover:bg-gray-300";

  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => setViewMode("grid")}
        className={`${baseClasses} ${
          viewMode === "grid" ? activeClasses : inactiveClasses
        }`}
        aria-label="Grid View"
      >
        <LayoutGrid size={20} />
      </button>
      <button
        onClick={() => setViewMode("catalog")}
        className={`${baseClasses} ${
          viewMode === "catalog" ? activeClasses : inactiveClasses
        }`}
        aria-label="Catalog View"
      >
        <List size={20} />
      </button>
    </div>
  );
}
