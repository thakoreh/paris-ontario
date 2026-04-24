'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Map, List, SlidersHorizontal } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import RestaurantCard from '@/components/RestaurantCard';
import { restaurants } from '@/data/restaurants';
import { filterRestaurants, getActiveFilterCount } from '@/lib/filters';
import { ActiveFilters, FilterKey } from '@/types';

// Dynamic import for Leaflet (client-side only)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[200px] rounded-2xl bg-[var(--border)]/50 flex items-center justify-center">
      <span className="text-[var(--text-muted)] text-sm">Loading map...</span>
    </div>
  ),
});

const INITIAL_FILTERS: ActiveFilters = {
  openNow: false,
  wifi: false,
  wheelchair: false,
  patio: false,
  kidFriendly: false,
};

export default function RestaurantsPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilters>(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const toggleFilter = useCallback((key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearch('');
  }, []);

  const filtered = filterRestaurants(restaurants, search, filters);
  const activeCount = getActiveFilterCount(filters);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Page Header */}
      <div
        className="relative pt-28 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 60%, #134E4A 100%)',
        }}
      >
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="relative max-w-7xl mx-auto">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-3">
            Restaurant Directory
          </h1>
          <p className="text-white/75 text-base sm:text-lg max-w-xl">
            {restaurants.length} local favourites in Paris, Ontario — filter, search,
            and discover your next favourite meal.
          </p>
        </div>
      </div>

      {/* Sticky filter/search bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-[var(--border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3">
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <FilterBar filters={filters} onToggle={toggleFilter} />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-[var(--text-muted)] hidden sm:block">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
              <button
                className={`filter-chip !px-3 ${showMap ? 'active' : ''}`}
                onClick={() => setShowMap((v) => !v)}
                aria-pressed={showMap}
              >
                <Map className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>
          {activeCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <SlidersHorizontal className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span className="text-sm text-[var(--text-muted)]">
                {activeCount} filter{activeCount !== 1 ? 's' : ''} active
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-[var(--primary)] font-medium hover:underline shrink-0"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center mx-auto mb-4">
              <List className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <h3 className="font-serif text-2xl text-[var(--text)] mb-2">
              No restaurants match your filters
            </h3>
            <p className="text-[var(--text-muted)] mb-6">
              Try adjusting your search or clearing some filters.
            </p>
            <button onClick={clearFilters} className="btn-primary">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Restaurant grid — always visible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {filtered.map((r, i) => (
                <div
                  key={r.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <RestaurantCard
                    restaurant={r}
                    onSelect={handleSelect}
                    selected={selectedId === r.id}
                  />
                </div>
              ))}
            </div>

            {/* Map panel — bottom drawer on tablet, sidebar on desktop */}
            {showMap && (
              <div className="
                fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-[var(--border)]
                lg:relative lg:inset-auto lg:rounded-2xl lg:shadow-lg lg:border lg:max-w-5xl lg:mx-auto
                h-[55vh] lg:h-[500px]
              ">
                {/* Drag handle for mobile */}
                <div className="lg:hidden flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
                </div>
                {/* Close button */}
                <button
                  onClick={() => setShowMap(false)}
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-[var(--border)] shadow flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors lg:hidden"
                  aria-label="Close map"
                >
                  <List className="w-4 h-4" />
                </button>
                <div className="w-full h-full">
                  <MapView
                    restaurants={filtered}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
