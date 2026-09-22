'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface CustomSelectProps {
  options: SelectOption[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options array
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-zylo-warm px-4 text-xs font-semibold text-zylo-text outline-none transition-all ${
          isOpen
            ? 'border-zylo-purple ring-2 ring-zylo-purple/20 bg-white shadow-sm'
            : 'border-zylo-border hover:border-zylo-purple/50 hover:bg-white'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <selectedOption.icon className="h-4 w-4 text-zylo-purple" />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-zylo-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-zylo-purple' : ''
          }`}
        />
      </button>

      {/* Options Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-2xl border border-zylo-border bg-white p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 scrollbar-hide">
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-zylo-purple text-white shadow-xs'
                    : 'text-zylo-text hover:bg-zylo-warm hover:text-zylo-purple'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && (
                    <opt.icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-zylo-purple'}`} />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
