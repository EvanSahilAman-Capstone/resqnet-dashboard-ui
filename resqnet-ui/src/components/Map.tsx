import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents } from 'react-leaflet';
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

export interface BroadcastAlert {
    id: string;
    position: [number, number];
    radius: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    message: string;
}

interface MapProps {
    fires: WildfireEvent[];
    evacuationRoute: [number, number][];
    broadcastAlerts?: BroadcastAlert[];
    onMapClick?: (lat: number, lng: number) => void;
    isPlacingAlert?: boolean;
}

// Component to handle map clicks
const MapClickHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void; isPlacingAlert?: boolean }> = ({ onMapClick, isPlacingAlert }) => {
    useMapEvents({
        click(e) {
            if (isPlacingAlert && onMapClick) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
};

const Map: React.FC<MapProps> = ({ fires, evacuationRoute, broadcastAlerts = [], onMapClick, isPlacingAlert = false }) => {
    const defaultCenter: L.LatLngTuple = [44.5, -79.5];

    // Color mapping for priority levels
    const priorityColors = {
        LOW: '#FCD34D',
        MEDIUM: '#FB923C',
        HIGH: '#F97316',
        URGENT: '#DC2626',
    };

    return (
        <div className="w-full h-full rounded-xl shadow-inner">
            <MapContainer 
                center={defaultCenter} 
                zoom={10} 
                scrollWheelZoom={true}
                style={{ 
                    height: '100%', 
                    width: '100%', 
                    borderRadius: '0.75rem',
                    cursor: isPlacingAlert ? 'crosshair' : 'grab'
                }}
            >
                {/* Map Tiles: OpenStreetMap */}
                <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Map click handler for placing alerts */}
                <MapClickHandler onMapClick={onMapClick} isPlacingAlert={isPlacingAlert} />

                {/* Fire markers */}
                {fires.map((fire) => (
                    <Marker key={fire.id} position={[fire.latitude, fire.longitude]}>
                        <Popup>
                            <strong>{fire.riskLevel}</strong><br />
                            {fire.message}
                        </Popup>
                    </Marker>
                ))}

                {/* Broadcast alert circles */}
                {broadcastAlerts.map((alert) => (
                    <React.Fragment key={alert.id}>
                        <Circle
                            center={alert.position}
                            radius={alert.radius * 1000}
                            pathOptions={{
                                color: priorityColors[alert.priority],
                                fillColor: priorityColors[alert.priority],
                                fillOpacity: 0.2,
                                weight: 2,
                            }}
                        />
                        <Marker position={alert.position}>
                            <Popup>
                                <div className="font-semibold text-red-700">
                                    {alert.priority} ALERT
                                </div>
                                <div className="text-sm">{alert.message}</div>
                                <div className="text-xs text-gray-500">Radius: {alert.radius}km</div>
                            </Popup>
                        </Marker>
                    </React.Fragment>
                ))}

                {/* Evacuation route */}
                {evacuationRoute.length > 0 && (
                    <Polyline positions={evacuationRoute} color="blue" weight={4} />
                )}
            </MapContainer>
        </div>
    );
};

export default Map;
