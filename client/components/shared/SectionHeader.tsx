import type { LucideIcon } from 'lucide-react';

export function SectionHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-zylo-purple" />}
          <h2 className="text-lg font-bold tracking-[-0.02em] text-zylo-text">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-xs text-zylo-muted">{subtitle}</p>}
      </div>
      {action && (
        <button className="text-xs font-semibold text-zylo-purple transition hover:text-[#6926d1]">
          {action}
        </button>
      )}
    </div>
  );
}
