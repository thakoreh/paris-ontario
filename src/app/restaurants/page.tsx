'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Search,
  SlidersHorizontal,
  Map,
  X,
  Wifi,
  Accessibility,
  Trees,
  Baby,
  Clock,
} from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';
import { restaurants } from '@/data/restaurants';
import { filterRestaurants, getActiveFilterCount } from '@/lib/filters';
import { ActiveFilters, FilterKey } from '@/types';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--warm-bg)',
        borderRadius: '20px',
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading map…</span>
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

const FILTERS: { key: FilterKey; icon: typeof Wifi; label: string }[] = [
  { key: 'openNow', icon: Clock, label: 'Open Now' },
  { key: 'wifi', icon: Wifi, label: 'WiFi' },
  { key: 'wheelchair', icon: Accessibility, label: 'Accessible' },
  { key: 'patio', icon: Trees, label: 'Patio' },
  { key: 'kidFriendly', icon: Baby, label: 'Kid-Friendly' },
];

export default function RestaurantsPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilters>(INITIAL_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);

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

  // Close map on mobile by default
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowMap(false);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--warm-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Page Header ──────────────────────────────────────── */}
      <div
        style={{
          paddingTop: '100px',
          paddingBottom: '2rem',
          background: 'linear-gradient(135deg, #0D9488 0%, #0B7A70 55%, #065E57 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="dot-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.15 }} />
        <div className="container-xl" style={{ position: 'relative', zIndex: 1 }}>
          <h1
            className="font-serif animate-fade-in-up"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: '0.5rem',
            }}
          >
            Restaurant Directory
          </h1>
          <p
            className="animate-fade-in-up delay-100"
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '1rem',
              fontWeight: 300,
            }}
          >
            {restaurants.length} local favourites in Paris, Ontario
          </p>
        </div>
      </div>

      {/* ── Sticky Filter Bar ─────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: '68px',
          zIndex: 40,
          background:
            'rgba(250,248,245,0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--warm-border)',
          boxShadow: '0 2px 12px rgba(28,25,23,0.06)',
        }}
      >
        <div className="container-xl" style={{ padding: '0.875rem 1rem' }}>
          {/* Search row */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '0.75rem',
              alignItems: 'center',
            }}
          >
            {/* Search input */}
            <div
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search
                style={{
                  position: 'absolute',
                  left: '14px',
                  width: '16px',
                  height: '16px',
                  color: searchFocused ? 'var(--primary)' : 'var(--text-light)',
                  transition: 'color 0.2s',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
              <input
                type="text"
                placeholder="Search restaurants or cuisine…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 40px',
                  borderRadius: '12px',
                  border: `1.5px solid ${searchFocused ? 'var(--primary)' : 'var(--warm-border)'}`,
                  background: 'var(--warm-surface)',
                  color: 'var(--text)',
                  fontSize: '0.9375rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: searchFocused ? '0 0 0 3px rgba(13,148,136,0.1)' : 'none',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    padding: '2px',
                  }}
                >
                  <X style={{ width: '14px', height: '14px' }} />
                </button>
              )}
            </div>

            {/* Map toggle */}
            <button
              onClick={() => setShowMap((v) => !v)}
              className={`filter-chip ${showMap ? 'active' : ''}`}
              style={{ flexShrink: 0 }}
            >
              <Map style={{ width: '16px', height: '16px' }} />
              <span className="hide-mobile">Map</span>
            </button>
          </div>

          {/* Filter chips row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {FILTERS.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  className={`filter-chip ${filters[key] ? 'active' : ''}`}
                  onClick={() => toggleFilter(key)}
                >
                  <Icon style={{ width: '14px', height: '14px' }} />
                  {label}
                </button>
              ))}
            </div>

            {/* Results count + clear */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexShrink: 0,
              }}
            >
              {activeCount > 0 && (
                <>
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {activeCount} filter{activeCount !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={clearFilters}
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                    }}
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: showMap ? '1fr 1fr' : '1fr',
          gap: 0,
          transition: 'grid-template-columns 0.3s ease',
        }}
        className="directory-grid"
      >
        {/* ── Left: Restaurant List ─────────────────────────── */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 140px)',
          }}
          className="restaurant-list-scroll"
        >
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 1rem',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'var(--primary-xlight)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <SlidersHorizontal style={{ width: '24px', height: '24px', color: 'var(--primary)' }} />
              </div>
              <h3
                className="font-serif"
                style={{ fontSize: '1.375rem', marginBottom: '0.5rem', color: 'var(--text)' }}
              >
                No restaurants match
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                Try adjusting your search or clearing some filters.
              </p>
              <button onClick={clearFilters} className="btn-primary">
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* Results header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}
              >
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{filtered.length}</span>{' '}
                  restaurant{filtered.length !== 1 ? 's' : ''} found
                </p>
                {showMap && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-light)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Map style={{ width: '12px', height: '12px' }} />
                    Click card to pin on map
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filtered.map((r, i) => (
                  <div
                    key={r.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  >
                    <RestaurantCard
                      restaurant={r}
                      onSelect={handleSelect}
                      selected={selectedId === r.id}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Right: Map Panel ───────────────────────────────── */}
        {showMap && (
          <div
            style={{
              position: 'sticky',
              top: '140px',
              height: 'calc(100vh - 140px)',
              padding: '1rem 1rem 1rem 0',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid var(--warm-border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <MapView
                restaurants={filtered}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Map FAB ───────────────────────────────────── */}
      {!showMap && (
        <button
          onClick={() => setShowMap(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 50,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Show map"
        >
          <Map style={{ width: '22px', height: '22px' }} />
        </button>
      )}

      {/* ── Mobile Map Bottom Sheet ──────────────────────────── */}
      {showMap && typeof window !== 'undefined' && window.innerWidth < 1024 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Backdrop */}
          <div
            style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowMap(false)}
          />

          {/* Sheet */}
          <div
            style={{
              background: 'var(--warm-surface)',
              borderRadius: '24px 24px 0 0',
              height: '60vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '12px 0 4px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'var(--warm-border)',
                }}
              />
            </div>
            {/* Close */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 16px 8px',
                borderBottom: '1px solid var(--warm-border)',
              }}
            >
              <span
                style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}
              >
                Map View
              </span>
              <button
                onClick={() => setShowMap(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--warm-bg)',
                  border: '1px solid var(--warm-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              </button>
            </div>
            {/* Map */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <MapView
                restaurants={filtered}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
