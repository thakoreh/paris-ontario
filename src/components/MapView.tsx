'use client';

import { useEffect } from 'react';
import { Restaurant } from '@/types';

interface Props {
  restaurants: Restaurant[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export default function MapView({ restaurants, selectedId, onSelect }: Props) {
  useEffect(() => {
    let map: import('leaflet').Map;
    let markerGroup: import('leaflet').LayerGroup;
    let L: typeof import('leaflet');

    const initMap = async () => {
      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      const mapEl = document.getElementById('map');
      if (!mapEl || map) return;

      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      map = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView(
        [43.1495, -80.3865],
        14
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markerGroup = L.layerGroup().addTo(map);

      renderMarkers();

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapEl);
    };

    const renderMarkers = () => {
      if (!map || !markerGroup || !L) return;
      markerGroup.clearLayers();

      const primaryColor = '#0D9488';

      restaurants.forEach((r) => {
        const isSelected = r.id === selectedId;

        const markerHtml = `
          <div style="
            width: ${isSelected ? '20px' : '14px'};
            height: ${isSelected ? '20px' : '14px'};
            border-radius: 50%;
            background: ${primaryColor};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(13,148,136,0.5);
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
          ">
            ${isSelected ? `<div style="
              position: absolute;
              inset: -8px;
              border-radius: 50%;
              border: 2px solid ${primaryColor};
              animation: pulse-ring 1s ease-out infinite;
            "></div>` : ''}
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [isSelected ? 20 : 14, isSelected ? 20 : 14],
          iconAnchor: [isSelected ? 10 : 7, isSelected ? 10 : 7],
        });

        const marker = L.marker([r.coordinates.lat, r.coordinates.lng], { icon })
          .addTo(markerGroup);

        marker.on('click', () => {
          onSelect?.(r.id);
        });

        marker.bindTooltip(
          `<div style="font-family: Inter, sans-serif; font-size: 13px; font-weight: 600; color: #1C1917;">
            ${r.name}
          </div>
          <div style="font-family: Inter, sans-serif; font-size: 11px; color: #78716C;">
            ${r.cuisine}
          </div>`,
          { direction: 'top', offset: [0, -8] }
        );
      });
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
        map = undefined as unknown as typeof map;
      }
    };
  }, [restaurants, selectedId, onSelect]);

  return (
    <div
      id="map"
      className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden"
      style={{ background: '#f0f0f0' }}
    />
  );
}
