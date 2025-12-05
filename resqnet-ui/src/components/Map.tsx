// src/components/Map.tsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { WildfireEvent } from '../hooks/useLocalData.ts'; 

// Fix Leaflet Icons
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface MapProps {
    fires: WildfireEvent[];
    evacuationRoute: [number, number][];
}

const Map: React.FC<MapProps> = ({ /** add fires, evacuationRoute here later for use with fire markers */}) => {
    // Default center for Ontario map
    const defaultCenter: L.LatLngTuple = [44.5, -79.5];

    return (
        <div className="w-full h-full rounded-xl shadow-inner">
            <MapContainer 
                center={defaultCenter} 
                zoom={10} 
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
            >

            {/* Map Tiles: OpenStreetMap */}
            <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            </MapContainer>
        </div>
    );
};

export default Map;