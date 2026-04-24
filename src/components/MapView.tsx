'use client';

import { useEffect, useRef } from 'react';
import { Restaurant } from '@/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    L: any;
  }
}

interface Props {
  restaurants: Restaurant[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export default function MapView({ restaurants, selectedId, onSelect }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (!mapDivRef.current) return;

    const init = () => {
      if (!window.L || !mapDivRef.current) return;

      const L = window.L;

      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapDivRef.current!, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: true,
      }).setView([43.1495, -80.3865], 14);

      // Warm, desaturated tile layer to match the aesthetic
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map);

      mapInstanceRef.current = map;

      const primaryColor = '#0D9488';

      restaurants.forEach((r) => {
        const isSelected = r.id === selectedId;
        const size = isSelected ? 24 : 14;
        const pulse = isSelected
          ? `<div style="position:absolute;inset:-10px;border-radius:50%;border:2px solid ${primaryColor};animation:pulse-ring 1.2s ease-out infinite;pointer-events:none;"></div>`
          : '';

        const markerHtml = `<div style="position:relative;width:${size}px;height:${size}px;">
          <div style="width:${size}px;height:${size}px;border-radius:50%;background:${primaryColor};border:3px solid white;box-shadow:0 2px 10px rgba(13,148,136,0.45);cursor:pointer;transition:transform 0.2s;">
          </div>${pulse}</div>`;

        const icon = L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        L.marker([r.coordinates.lat, r.coordinates.lng], { icon })
          .addTo(map)
          .on('click', () => onSelect?.(r.id))
          .bindTooltip(
            `<div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;color:#1C1917;white-space:nowrap">${r.name}</div><div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#78716C;white-space:nowrap">${r.cuisine}</div>`,
            { direction: 'top', offset: [0, -8], className: 'custom-tooltip' }
          );
      });

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      });
      if (mapDivRef.current) ro.observe(mapDivRef.current);
    };

    if (window.L) {
      init();
    } else {
      // Load Leaflet from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
        link.onload = init;
      };
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      initRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker sizes when selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const primaryColor = '#0D9488';

    restaurants.forEach((r) => {
      const isSelected = r.id === selectedId;
      const size = isSelected ? 24 : 14;
      const pulse = isSelected
        ? `<div style="position:absolute;inset:-10px;border-radius:50%;border:2px solid ${primaryColor};animation:pulse-ring 1.2s ease-out infinite;pointer-events:none;"></div>`
        : '';

      const markerHtml = `<div style="position:relative;width:${size}px;height:${size}px;">
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${primaryColor};border:3px solid white;box-shadow:0 2px 10px rgba(13,148,136,0.45);cursor:pointer;transition:transform 0.2s;">
        </div>${pulse}</div>`;

      const icon = window.L.divIcon({
        html: markerHtml,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      window.L.marker([r.coordinates.lat, r.coordinates.lng], { icon }).addTo(mapInstanceRef.current);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div
      ref={mapDivRef}
      id="leaflet-map"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        borderRadius: '20px',
        overflow: 'hidden',
        background: '#f5f3f0',
      }}
    />
  );
}
