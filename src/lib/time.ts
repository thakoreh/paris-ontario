import { Restaurant, RestaurantHours, ClosedHours } from '@/types';

export function isOpenNow(restaurant: Restaurant): boolean {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[now.getDay()];
  const hours = restaurant.hours[today];

  if (!hours || 'closed' in hours) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Handle late-night closes (e.g., 00:00 = midnight)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export function formatHours(hours: RestaurantHours | ClosedHours): string {
  if ('closed' in hours) return 'Closed';
  return `${formatTime(hours.open)} – ${formatTime(hours.close)}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${m.toString().padStart(2, '0')}${period}`;
}

export function getDayName(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}
