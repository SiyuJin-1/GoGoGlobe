import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder';

// 统一取后端地址（保持和你项目里其它页面一致）
const API_BASE = process.env.REACT_APP_API_BASE || "/api";


// 修复图标不显示
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// 搜索控件 —— 改成使用你的后端代理
function GeocoderControl({ setSearchMarker }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !L.Control.Geocoder) return;

    const geocoder = L.Control.geocoder({
      position: 'topleft',
      defaultMarkGeocode: true,
      placeholder: 'Search location...',
      // ⭐ 关键：让 geocoder 走你的后端
      geocoder: L.Control.Geocoder.nominatim({
        // 最好带斜杠，内部会拼 /search 和 /reverse
        serviceUrl: `${API_BASE}/geocode/`
      })
    }).addTo(map);

    geocoder.on('markgeocode', function (e) {
      const { center, name } = e.geocode;
      map.setView(center, map.getZoom());
      setSearchMarker({ position: [center.lat, center.lng], name });
    });

    return () => map.removeControl(geocoder);
  }, [map, setSearchMarker]);

  return null;
}

// 点击地图做逆地理 —— 改成请求你后端的 /api/geocode/reverse
function LocationMarker({ onSelect }) {
  const [position, setPosition] = useState(null);
  const [popupText, setPopupText] = useState(null);
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      try {
        const resp = await fetch(
          `${API_BASE}/geocode/reverse?lat=${lat}&lon=${lng}&lang=en`,
          { credentials: 'include' } // 可要可不要，你的后端允许即可
        );
        const data = await resp.json();
        const locationName = data?.display_name || data?.name || 'Unknown';
        setPopupText(locationName);
        onSelect(locationName);
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        setPopupText('Unknown location');
      }
    }
  });

  return position ? (
    <Marker position={position}>
      {popupText && <Popup>{popupText}</Popup>}
    </Marker>
  ) : null;
}

export default function MapView({ onLocationSelected }) {
  const [searchMarker, setSearchMarker] = useState(null);

  return (
    <MapContainer center={[37.7749, -122.4194]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://a.tile.openstreetmap.de/{z}/{x}/{y}.png"
      />
      <GeocoderControl setSearchMarker={setSearchMarker} />
      <LocationMarker onSelect={onLocationSelected} />
      {searchMarker && (
        <Marker
          position={searchMarker.position}
          eventHandlers={{ click: () => onLocationSelected(searchMarker.name) }}
        >
          <Popup>📍 {searchMarker.name}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
