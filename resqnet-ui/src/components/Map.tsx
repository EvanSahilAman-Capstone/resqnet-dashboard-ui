import React from 'react';
import { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { WildfireEvent } from '../hooks/useLocalData.ts';
import sensorGif from '../assets/sensor.gif';
import reportGif from '../assets/report.gif';
import alertGif from '../assets/alert.gif';

// Fire report icon - in assets/report.gif 
const fireIcon = new L.DivIcon({
    html: `<img src="${reportGif}" style="width: 40px; height: 40px; background: transparent;" />`,
    className: 'custom-fire-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

// User location marker (simple blue pin)
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Sensor icon - in assets/sensor.gif
const sensorIcon = new L.DivIcon({
    html: `<img src="${sensorGif}" style="width: 40px; height: 40px; background: transparent;" />`,
    className: 'custom-sensor-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

// Alert/Broadcast icon -in assets/alert.gif
const alertIcon = new L.DivIcon({
    html: `<img src="${alertGif}" style="width: 40px; height: 40px; background: transparent;" />`,
    className: 'custom-alert-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

export interface BroadcastAlert {
    id: string;
    position: [number, number];
    radius: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    message: string;
}

export interface Sensor {
    id: string;
    name: string;
    status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR';
    latitude: number;
    longitude: number;
    health: number;
    temperature: number;
    humidity: number;
    battery: number;
    lastPing: string;
}

interface MapProps {
    fires: WildfireEvent[];
    evacuationRoute: [number, number][];
    broadcastAlerts?: BroadcastAlert[];
    sensors?: Sensor[];
    onMapClick?: (lat: number, lng: number) => void;
    isPlacingAlert?: boolean;
}

// Component for centering map on user's position by default
const UserLocation: React.FC = () => {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const [accuracy, setAccuracy] = useState<number>(0);
    const map = useMap();

    useEffect(() => {
        map.locate({ setView: false, watch: false, timeout: 10000, maximumAge: 60000});

        const onLocationFound = (e: L.LocationEvent) => {
            setPosition(e.latlng);
            setAccuracy(e.accuracy || 0);
            map.flyTo(e.latlng, 10);
        };

        const onLocationError = (e: L.ErrorEvent) => {
      console.warn('Geolocation failed:', e.message);  // Fallback to default (Oakville)
    };

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    return () => {
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };
  }, [map]);

  return position ? (
    <>
      <Marker position={position} icon={userIcon}>
        <Popup>
          <div className="font-semibold text-blue-700">You are here</div>
          <div className="text-sm text-gray-600">Accuracy: {Math.round(accuracy)}m</div>
        </Popup>
      </Marker>
      {accuracy > 0 && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1, weight: 1 }}
        />
      )}
    </>
  ) : null;
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

const Map: React.FC<MapProps> = ({ fires, evacuationRoute, broadcastAlerts = [], sensors = [], onMapClick, isPlacingAlert = false }) => {
    const defaultCenter: L.LatLngTuple = [44.5, -79.5];

    // Color mapping for priority levels
    const priorityColors = {
        LOW: '#FCD34D',
        MEDIUM: '#FB923C',
        HIGH: '#F97316',
        URGENT: '#DC2626',
    };

    // Get sensor status color for popup
    const getSensorStatusColor = (status: Sensor['status']) => {
        switch (status) {
            case 'ONLINE': return '#10B981';
            case 'WARNING': return '#F59E0B';
            case 'OFFLINE': return '#6B7280';
            case 'ERROR': return '#EF4444';
            default: return '#6B7280';
        }
    };

    return (
        <div className="w-full h-full rounded-xl shadow-inner">
            <style>{`
                .custom-fire-icon,
                .custom-sensor-icon,
                .custom-alert-icon {
                    background: transparent !important;
                    border: none !important;
                }
            `}</style>
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

                <UserLocation />

                {/* Map click handler for placing alerts */}
                <MapClickHandler onMapClick={onMapClick} isPlacingAlert={isPlacingAlert} />

                {/* Fire markers - custom report GIF */}
                {fires.map((fire) => (
                    <Marker 
                        key={fire.id} 
                        position={[fire.latitude, fire.longitude]}
                        icon={fireIcon}
                    >
                        <Popup>
                            <div className="font-semibold text-red-700">
                                FIRE REPORT
                            </div>
                            <div className="text-sm mt-1">
                                <strong>Risk Level:</strong> {fire.riskLevel}<br />
                                <strong>Details:</strong> {fire.message}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Sensor markers - custom sensor GIF */}
                {sensors.map((sensor) => (
                    <Marker 
                        key={sensor.id} 
                        position={[sensor.latitude, sensor.longitude]}
                        icon={sensorIcon}
                    >
                        <Popup>
                            <div style={{ color: getSensorStatusColor(sensor.status) }} className="font-semibold">
                                SENSOR: {sensor.name}
                            </div>
                            <div className="text-sm mt-2 space-y-1">
                                <div>
                                    <strong>Status:</strong>{' '}
                                    <span style={{ color: getSensorStatusColor(sensor.status) }}>
                                        {sensor.status}
                                    </span>
                                </div>
                                <div><strong>Health:</strong> {sensor.health}%</div>
                                <div><strong>Temperature:</strong> {sensor.temperature}°C</div>
                                <div><strong>Humidity:</strong> {sensor.humidity}%</div>
                                <div><strong>Battery:</strong> {sensor.battery}%</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Last ping: {new Date(sensor.lastPing).toLocaleTimeString()}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Broadcast alert circles and markers */}
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
                        <Marker position={alert.position} icon={alertIcon}>
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
