'use client';

import { useState, useMemo } from 'react';
import { useLiveStreams, useUpcomingStreams, useTrendingCreators } from '@/lib/hooks/use-queries';
import { HeroFeature } from '@/components/home/HeroFeature';
import { CategoryBar } from '@/components/home/CategoryBar';
import { LiveNowSection } from '@/components/home/LiveNowSection';
import { UpcomingSection } from '@/components/home/UpcomingSection';
import { TrendingCreatorsSection } from '@/components/home/TrendingCreatorsSection';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const { data: streams = [], isLoading: loadingStreams } = useLiveStreams();
  const { data: upcomingStreams = [] } = useUpcomingStreams();
  const { data: creators = [] } = useTrendingCreators();

  // Filter live streams by category if not 'All'
  const filteredStreams = useMemo(() => {
    if (selectedCategory === 'All') return streams;
    return streams.filter((s) => {
      const catName = s.category?.name || s.vibe || '';
      return catName.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [streams, selectedCategory]);

  // Top 3 featured streams for Hero Section
  const featuredStreams = useMemo(() => {
    return streams.slice(0, 3);
  }, [streams]);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8 lg:space-y-10 select-none">
      {/* 1. Compact Hero Discovery + Featured Live Streams */}
      <HeroFeature featuredStreams={featuredStreams} />

      {/* 2. Horizontal Category Strip */}
      <CategoryBar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 3. Live Now Section */}
      <LiveNowSection
        streams={filteredStreams}
        loading={loadingStreams}
      />

      {/* 4. Upcoming Live Section */}
      <UpcomingSection streams={upcomingStreams} />

      {/* 5. Trending Creators Section */}
      <TrendingCreatorsSection creators={creators} />
    </div>
  );
}
