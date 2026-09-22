'use client';

import React from 'react';

interface CustomToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export function CustomToggle({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  disabled = false,
}: CustomToggleProps) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center justify-between p-4 rounded-2xl border transition-all select-none ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-zylo-border bg-zylo-warm/30'
          : 'cursor-pointer border-zylo-border bg-white hover:bg-zylo-warm/40 hover:border-zylo-purple/30 shadow-xs'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zylo-soft text-zylo-purple shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-xs font-extrabold text-zylo-text block">{label}</span>
          {description && (
            <span className="text-[11px] font-medium text-zylo-muted block mt-0.5 leading-snug">
              {description}
            </span>
          )}
        </div>
      </div>

      {/* Switch Track & Knob */}
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-zylo-purple' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
}
