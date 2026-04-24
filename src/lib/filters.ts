import { Restaurant, ActiveFilters } from '@/types';
import { isOpenNow } from './time';

export function filterRestaurants(
  restaurants: Restaurant[],
  searchQuery: string,
  filters: ActiveFilters
): Restaurant[] {
  return restaurants.filter((r) => {
    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.cuisine.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Open Now
    if (filters.openNow && !isOpenNow(r)) return false;

    // Filter chips
    if (filters.wifi && !r.filters.wifi) return false;
    if (filters.wheelchair && !r.filters.wheelchair) return false;
    if (filters.patio && !r.filters.patio) return false;
    if (filters.kidFriendly && !r.filters.kidFriendly) return false;

    return true;
  });
}

export function getActiveFilterCount(filters: ActiveFilters): number {
  return Object.values(filters).filter(Boolean).length;
}
