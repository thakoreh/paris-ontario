'use client';

import { Wifi, Accessibility, Trees, Baby, ExternalLink } from 'lucide-react';
import { Restaurant } from '@/types';
import { isOpenNow } from '@/lib/time';
import UpvoteButton from './UpvoteButton';

interface Props {
  restaurant: Restaurant;
  onSelect?: (id: string) => void;
  selected?: boolean;
  compact?: boolean;
}

export default function RestaurantCard({ restaurant, onSelect, selected, compact }: Props) {
  const open = isOpenNow(restaurant);

  const tags = [
    restaurant.filters.wifi && { icon: Wifi, label: 'WiFi' },
    restaurant.filters.wheelchair && { icon: Accessibility, label: 'Accessible' },
    restaurant.filters.patio && { icon: Trees, label: 'Patio' },
    restaurant.filters.kidFriendly && { icon: Baby, label: 'Kid-Friendly' },
  ].filter(Boolean) as { icon: typeof Wifi; label: string }[];

  return (
    <article
      className={`restaurant-card ${selected ? 'ring-2 ring-[var(--primary)]' : ''}`}
      onClick={() => onSelect?.(restaurant.id)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {/* Photo */}
      <div className="aspect-photo relative">
        <img
          src={restaurant.image}
          alt={`${restaurant.name} — ${restaurant.cuisine}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Gradient at bottom of image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        {/* Open badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <span className={`open-badge ${open ? 'open' : 'closed'}`}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: open ? '#16A34A' : '#DC2626',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {open ? 'Open Now' : 'Closed'}
          </span>
        </div>

        {/* Cuisine pill */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
          }}
        >
          <span
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
              color: 'var(--primary-dark)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '100px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {restaurant.cuisine}
          </span>
        </div>

        {/* Website link */}
        <a
          href={restaurant.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
          aria-label={`Visit ${restaurant.name} website`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Content */}
      <div style={{ padding: compact ? '14px' : '18px' }}>
        {/* Name + upvote row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <h3
            className="font-serif"
            style={{
              fontSize: compact ? '1.0625rem' : '1.1875rem',
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'var(--text)',
            }}
          >
            {restaurant.name}
          </h3>
          <UpvoteButton
            restaurantId={restaurant.id}
            initialUpvotes={restaurant.upvotes}
            compact
          />
        </div>

        {/* Description */}
        {!compact && (
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '12px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {restaurant.description}
          </p>
        )}

        {/* Tags */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            marginBottom: '12px',
          }}
        >
          {tags.map(({ icon: Icon, label }) => (
            <span key={label} className="tag-chip">
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>

        {/* Address */}
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M6 1C4.067 1 2.5 2.567 2.5 4.5C2.5 7.167 6 11 6 11C6 11 9.5 7.167 9.5 4.5C9.5 2.567 7.933 1 6 1ZM6 5.75C5.308 5.75 4.75 5.192 4.75 4.5C4.75 3.808 5.308 3.25 6 3.25C6.692 3.25 7.25 3.808 7.25 4.5C7.25 5.192 6.692 5.75 6 5.75Z"
              fill="currentColor"
            />
          </svg>
          {restaurant.address}
        </p>
      </div>
    </article>
  );
}
