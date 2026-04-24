export interface RestaurantHours {
  open: string;
  close: string;
}

export type ClosedHours = { closed: true };

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  description: string;
  image: string;
  address: string;
  phone: string;
  website: string;
  hours: Partial<Record<string, RestaurantHours | ClosedHours>>;
  filters: {
    wifi: boolean;
    wheelchair: boolean;
    patio: boolean;
    kidFriendly: boolean;
  };
  upvotes: number;
  coordinates: { lat: number; lng: number };
}

export type FilterKey = 'openNow' | 'wifi' | 'wheelchair' | 'patio' | 'kidFriendly';

export interface ActiveFilters {
  openNow: boolean;
  wifi: boolean;
  wheelchair: boolean;
  patio: boolean;
  kidFriendly: boolean;
}
