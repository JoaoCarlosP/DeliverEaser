import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteLocation } from '../../types';

interface Props {
  result: RouteLocation[];
  className?: string;
}

// Auto-fits the map to show all markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

function createNumberedIcon(label: string | number, isOrigin: boolean, isLast: boolean) {
  const bg = isOrigin ? '#1e293b' : isLast ? '#10b981' : '#0ea5e9';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${bg}"/>
      <text x="16" y="20" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="white">${label}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
    className: '',
  });
}

export const RouteMap: React.FC<Props> = ({ result, className = 'h-[560px]' }) => {
  const positions: [number, number][] = result.map(s => [s.lat, s.lng]);

  return (
    <div className={`overflow-hidden ${className}`}>
      <MapContainer
        center={positions[0] ?? [-23.5, -46.6]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds positions={positions} />

        {/* Route polyline */}
        <Polyline
          positions={positions}
          pathOptions={{ color: '#0ea5e9', weight: 3, opacity: 0.8, dashArray: '8 4' }}
        />

        {/* Markers */}
        {result.map((stop, i) => {
          const isLast = i === result.length - 1 && stop.type !== 'origin';
          const label = stop.type === 'origin' ? '★' : stop.sequence;
          return (
            <Marker
              key={i}
              position={[stop.lat, stop.lng]}
              icon={createNumberedIcon(label, stop.type === 'origin', isLast)}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: '180px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: stop.type === 'origin' ? '#64748b' : '#0ea5e9', marginBottom: '4px' }}>
                    {stop.type === 'origin' ? 'Departure' : `Stop ${stop.sequence}`}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', lineHeight: '1.4' }}>
                    {stop.address}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
