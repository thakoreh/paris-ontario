'use client';

import { Wifi, Accessibility, Trees, Baby, Clock } from 'lucide-react';
import { ActiveFilters, FilterKey } from '@/types';

interface Props {
  filters: ActiveFilters;
  onToggle: (key: FilterKey) => void;
}

const FILTERS: { key: FilterKey; icon: typeof Wifi; label: string }[] = [
  { key: 'openNow', icon: Clock, label: 'Open Now' },
  { key: 'wifi', icon: Wifi, label: 'WiFi' },
  { key: 'wheelchair', icon: Accessibility, label: 'Wheelchair Accessible' },
  { key: 'patio', icon: Trees, label: 'Patio' },
  { key: 'kidFriendly', icon: Baby, label: 'Kid-Friendly' },
];

export default function FilterBar({ filters, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          className={`filter-chip ${filters[key] ? 'active' : ''}`}
          onClick={() => onToggle(key)}
          aria-pressed={filters[key]}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
