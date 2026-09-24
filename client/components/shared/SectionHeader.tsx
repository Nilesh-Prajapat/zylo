import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export function SectionHeader({
  title,
  subtitle,
  action,
  actionHref,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  actionHref?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-[#7138F5]" />}
          <h2 className="text-lg font-bold tracking-[-0.02em] text-zylo-text">{title}</h2>
        </div>
        {subtitle && <p className="mt-1 text-xs text-zylo-muted">{subtitle}</p>}
      </div>
      {action && (
        actionHref ? (
          <Link href={actionHref} className="text-xs font-semibold text-[#7138F5] transition hover:text-[#6226e6]">
            {action} →
          </Link>
        ) : (
          <button className="text-xs font-semibold text-[#7138F5] transition hover:text-[#6226e6]">
            {action}
          </button>
        )
      )}
    </div>
  );
}
