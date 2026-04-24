'use client';

import { Heart, Wifi, Accessibility, Trees, Baby, ExternalLink } from 'lucide-react';
import { Restaurant } from '@/types';
import { isOpenNow } from '@/lib/time';
import UpvoteButton from './UpvoteButton';

interface Props {
  restaurant: Restaurant;
  onSelect?: (id: string) => void;
  selected?: boolean;
}

export default function RestaurantCard({ restaurant, onSelect, selected }: Props) {
  const open = isOpenNow(restaurant);

  const tags = [
    restaurant.filters.wifi && { icon: Wifi, label: 'WiFi' },
    restaurant.filters.wheelchair && { icon: Accessibility, label: 'Accessible' },
    restaurant.filters.patio && { icon: Trees, label: 'Patio' },
    restaurant.filters.kidFriendly && { icon: Baby, label: 'Kid-Friendly' },
  ].filter(Boolean) as { icon: typeof Wifi; label: string }[];

  return (
    <article
      className={`restaurant-card cursor-pointer ${selected ? 'ring-2 ring-[var(--primary)]' : ''}`}
      onClick={() => onSelect?.(restaurant.id)}
    >
      {/* Photo */}
      <div className="aspect-photo relative">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Open badge */}
        <div className="absolute top-3 left-3">
          <span className={`open-badge ${open ? 'open' : 'closed'}`}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-600' : 'bg-red-500'}`}
            />
            {open ? 'Open Now' : 'Closed'}
          </span>
        </div>
        {/* Cuisine */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-[var(--primary-dark)] text-xs font-semibold px-3 py-1 rounded-full">
            {restaurant.cuisine}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-serif text-lg text-[var(--text)] leading-tight">
            {restaurant.name}
          </h3>
          <UpvoteButton restaurantId={restaurant.id} initialUpvotes={restaurant.upvotes} />
        </div>

        <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-3 line-clamp-2">
          {restaurant.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map(({ icon: Icon, label }) => (
            <span key={label} className="tag-chip">
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}
        </div>

        {/* Address */}
        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-[var(--secondary)] inline-block" />
          {restaurant.address}
        </p>
      </div>
    </article>
  );
}
