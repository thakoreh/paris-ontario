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
    <div className="w-full h-full min-h-[400px] rounded-2xl bg-[var(--border)]/50 flex items-center justify-center">
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
  const [showMap, setShowMap] = useState(true);

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
        className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 60%, #134E4A 100%)',
        }}
      >
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="relative max-w-7xl mx-auto">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-white mb-3">
            Restaurant Directory
          </h1>
          <p className="text-white/75 text-lg max-w-xl">
            {restaurants.length} local favourites in Paris, Ontario — filter, search,
            and discover your next favourite meal.
          </p>
        </div>
      </div>

      {/* Sticky filter/search bar */}
      <div className="sticky top-16 z-30 bg-white border-b border-[var(--border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3">
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex items-center justify-between gap-4">
            <FilterBar filters={filters} onToggle={toggleFilter} />
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-[var(--text-muted)] hide-mobile">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
              <button
                className={`filter-chip !px-3 ${showMap ? 'active' : ''}`}
                onClick={() => setShowMap((v) => !v)}
                aria-pressed={showMap}
              >
                <Map className="w-4 h-4" />
                <span className="hide-mobile">Map</span>
              </button>
            </div>
          </div>
          {activeCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <SlidersHorizontal className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">
                {activeCount} filter{activeCount !== 1 ? 's' : ''} active
              </span>
              <button
                onClick={clearFilters}
                className="text-sm text-[var(--primary)] font-medium hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filtered.length === 0 ? (
          /* Empty state */
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
          <div
            className={`grid gap-8 ${showMap ? 'lg:grid-cols-5' : 'grid-cols-1'}`}
            style={showMap ? { gridTemplateColumns: 'repeat(5, 1fr)' } : {}}
          >
            {/* Restaurant list */}
            <div className={`${showMap ? 'lg:col-span-3' : ''}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
            </div>

            {/* Map */}
            {showMap && (
              <div className="lg:col-span-2 sticky top-40 h-[calc(100vh-12rem)]">
                <MapView
                  restaurants={filtered}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
