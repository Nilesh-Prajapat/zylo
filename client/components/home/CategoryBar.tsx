'use client';

import {
  LayoutGrid,
  Music2,
  Gamepad2,
  MessageCircle,
  Sparkles,
  Pencil,
  Trophy,
  Compass,
  Heart,
  Zap,
} from 'lucide-react';

export interface CategoryOption {
  label: string;
  icon: typeof Music2;
}

export const CATEGORIES: CategoryOption[] = [
  { label: 'All', icon: LayoutGrid },
  { label: 'Music', icon: Music2 },
  { label: 'Gaming', icon: Gamepad2 },
  { label: 'Just Chatting', icon: MessageCircle },
  { label: 'Dance', icon: Sparkles },
  { label: 'Art', icon: Pencil },
  { label: 'Fitness', icon: Trophy },
  { label: 'Outdoors', icon: Compass },
  { label: 'Lifestyle', icon: Heart },
  { label: 'Tech', icon: Zap },
];

interface CategoryBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryBar({ selectedCategory, onSelectCategory }: CategoryBarProps) {
  return (
    <div className="w-full overflow-hidden">
      <div className="scrollbar-hide flex gap-2.5 overflow-x-auto py-1">
        {CATEGORIES.map(({ label, icon: Icon }) => {
          const isSelected = selectedCategory.toLowerCase() === label.toLowerCase();
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectCategory(label)}
              className={`flex h-[40px] shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-[#7C3AED] text-white shadow-xs'
                  : 'bg-white border border-[#E9E5F2] text-[#6F687D] hover:bg-[#F3EEFF] hover:text-[#7C3AED] hover:border-[#7C3AED]/30'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
