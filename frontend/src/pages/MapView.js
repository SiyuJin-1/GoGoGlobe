import React, { useState, useEffect } from 'react';
import { Popup} from 'react-leaflet';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import 'leaflet-control-geocoder'; // 默认挂载到 L.Control.Geocoder

import './MapView.css';

// 修复图标不显示
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// 搜索控件
function GeocoderControl({ setSearchMarker }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !L.Control.Geocoder) return;

    const geocoder = L.Control.geocoder({
      position: 'topleft',
      defaultMarkGeocode: true, 
      placeholder: 'Search location...',
      geocoder: L.Control.Geocoder.nominatim()
    }).addTo(map);

    geocoder.on('markgeocode', function (e) {
      const { center, name } = e.geocode;
      map.setView(center, map.getZoom());

      // ✅ 设置 marker 和 name，用于之后点击才选中
      setSearchMarker({ position: [center.lat, center.lng], name });
    });

    return () => map.removeControl(geocoder);
  }, [map, setSearchMarker]);

  return null;
}



// 点击地图获取位置 + 返回地址
function LocationMarker({ onSelect }) {
  const [position, setPosition] = useState(null);
  const [popupText, setPopupText] = useState(null);
  const map = useMap();
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
        );
        const data = await res.json();
        const locationName = data.display_name || 'Unknown';
        setPopupText(locationName);
        onSelect(locationName);
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        setPopupText("Unknown location");
      }
    }
  });

    return position ? (
    <Marker position={position}>
      {popupText && <Popup>{popupText}</Popup>}
    </Marker> ) : null;
}

export default function MapView({ onLocationSelected }) {
  const [searchMarker, setSearchMarker] = useState(null); // { position: [...], name: '...' }

  return (
    <MapContainer center={[37.7749, -122.4194]} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://a.tile.openstreetmap.de/{z}/{x}/{y}.png"
      />
      <GeocoderControl setSearchMarker={setSearchMarker} />
      <LocationMarker onSelect={onLocationSelected} />
      {searchMarker && (
        <Marker
          position={searchMarker.position}
          eventHandlers={{
            click: () => onLocationSelected(searchMarker.name) // ✅ 用户点击蓝标时才触发选择
          }}
        >
          <Popup>📍 {searchMarker.name}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

