'use client';

import type { UserProfile } from '@/lib/types';
import { SectionHeader } from '../shared/SectionHeader';
import { CreatorCard } from '../shared/CreatorCard';

interface TrendingCreatorsSectionProps {
  creators: (UserProfile & { isFollowing?: boolean })[];
}

export function TrendingCreatorsSection({ creators }: TrendingCreatorsSectionProps) {
  if (!creators || creators.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title="Trending Creators"
        subtitle="Creators you'll love right now — follow to get live notifications"
        action="View all"
        actionHref="/explore"
      />

      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {creators.slice(0, 8).map((creator) => (
          <CreatorCard key={creator.id} creator={creator} />
        ))}
      </div>
    </section>
  );
}
