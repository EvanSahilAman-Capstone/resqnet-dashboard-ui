import React, { useState, useEffect, useRef } from 'react';
import Map, {
  Marker,
  Source,
  Layer,
  Popup,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl/mapbox';
import circle from '@turf/circle';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson';
import sensorGif from '../assets/sensor.gif';
import reportGif from '../assets/report.gif';
import alertGif from '../assets/alert.gif';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// WildfireEvent type matching what Dashboard sends
export interface WildfireEvent {
  id: string;
  latitude: number;
  longitude: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  message: string;
}

export interface BroadcastAlert {
  id: string;
  position: [number, number]; // [lat, lng]
  radius: number; // kilometers
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
  draftRadiusKm?: number; // Radius from the slider in kilometers
  draftPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; // Priority from the form
}

interface PopupInfo {
  longitude: number;
  latitude: number;
  title: string;
  details: string;
}

const MapComponent: React.FC<MapProps> = ({
  fires,
  evacuationRoute,
  broadcastAlerts = [],
  sensors = [],
  onMapClick,
  isPlacingAlert = false,
  draftRadiusKm = 1,
  draftPriority = 'LOW',
}) => {
  const mapRef = useRef<MapRef | null>(null);

  const [viewState, setViewState] = useState({
    longitude: -79.5,
    latitude: 44.5,
    zoom: 10,
  });

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null); // [lng, lat]
  const [initialUserLocation, setInitialUserLocation] = useState<[number, number] | null>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);

  // Mouse position for preview circle (follows cursor when placing alert)
  const [mousePosition, setMousePosition] = useState<[number, number] | null>(null); // [lng, lat]

  // Legend cycling indices
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [fireIndex, setFireIndex] = useState(0);
  const [sensorIndex, setSensorIndex] = useState(0);

  // Reset mouse position when exiting placement mode
  useEffect(() => {
    if (!isPlacingAlert) {
      setMousePosition(null);
    }
  }, [isPlacingAlert]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserLocation(coords);
        setInitialUserLocation(coords);
        setViewState({
          longitude: coords[0],
          latitude: coords[1],
          zoom: 10,
        });
      },
      (err) => console.warn('Geolocation failed:', err.message)
    );
  }, []);

  const priorityColors = {
    LOW: '#9CA3AF',      // Gray
    MEDIUM: '#FCD34D',   // Yellow
    HIGH: '#FB923C',     // Orange
    URGENT: '#DC2626',   // Red
  };

  const routeGeoJSON: Feature<LineString> | null =
    evacuationRoute.length > 0
      ? {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: evacuationRoute.map(([lat, lng]) => [lng, lat]),
          },
        }
      : null;

  // Create circle polygons for broadcast alerts using Turf
  const alertCirclePolygons: Feature[] = broadcastAlerts.map((alert) => {
    const center: [number, number] = [alert.position[1], alert.position[0]]; // [lng, lat]
    const radiusKm = alert.radius && alert.radius > 0 ? alert.radius : 1;

    const geo = circle(center, radiusKm, {
      steps: 64,
      units: 'kilometers',
      properties: {
        id: alert.id,
        priority: alert.priority,
        message: alert.message,
        radiusKm,
        color: priorityColors[alert.priority],
      },
    });

    return geo as Feature;
  });

  const alertsCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: alertCirclePolygons,
  };

  // Draft alert preview circle - follows mouse cursor and uses current priority color
  const draftAlertCircleFeature: Feature<Polygon> | null = mousePosition
    ? (circle(mousePosition, draftRadiusKm, {
        steps: 64,
        units: 'kilometers',
        properties: { 
          color: priorityColors[draftPriority],
        },
      }) as Feature<Polygon>)
    : null;

  const draftAlertCollection: FeatureCollection | null = draftAlertCircleFeature
    ? {
        type: 'FeatureCollection',
        features: [draftAlertCircleFeature],
      }
    : null;

  // Legend click handlers: cycle through each collection
  const flyTo = (lng: number, lat: number, zoom = 12) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom, essential: true });
  };

  const cycleBroadcasts = () => {
    if (broadcastAlerts.length === 0) return;
    const idx = broadcastIndex % broadcastAlerts.length;
    const alert = broadcastAlerts[idx];
    flyTo(alert.position[1], alert.position[0]);
    setBroadcastIndex((prev) => prev + 1);
  };

  const cycleFires = () => {
    if (fires.length === 0) return;
    const idx = fireIndex % fires.length;
    const fire = fires[idx];
    flyTo(fire.longitude, fire.latitude);
    setFireIndex((prev) => prev + 1);
  };

  const cycleSensors = () => {
    if (sensors.length === 0) return;
    const idx = sensorIndex % sensors.length;
    const sensor = sensors[idx];
    flyTo(sensor.longitude, sensor.latitude);
    setSensorIndex((prev) => prev + 1);
  };

  const goToUserLocation = () => {
    if (!userLocation && !initialUserLocation) return;
    const [lng, lat] = userLocation ?? initialUserLocation!;
    flyTo(lng, lat, 12);
  };

  return (
    <div className="w-full h-full rounded-xl shadow-inner relative">
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        onMouseMove={(e) => {
          // Update preview circle position as mouse moves (only when placing alert)
          if (isPlacingAlert) {
            const { lng, lat } = e.lngLat;
            setMousePosition([lng, lat]);
          }
        }}
        onClick={(e) => {
          if (!isPlacingAlert) return;

          const { lng, lat } = e.lngLat;

          // Single click places the alert immediately
          if (onMapClick) {
            onMapClick(lat, lng);
          }
          
          // Clear preview
          setMousePosition(null);
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
        cursor={isPlacingAlert ? 'crosshair' : 'grab'}
        ref={mapRef}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker longitude={userLocation[0]} latitude={userLocation[1]}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 18,
                boxShadow: '0 0 8px rgba(37, 99, 235, 0.6)',
                cursor: 'pointer',
              }}
              onMouseEnter={() =>
                setPopupInfo({
                  longitude: userLocation[0],
                  latitude: userLocation[1],
                  title: 'Your Location',
                  details: 'You are here',
                })
              }
            >
              ↑
            </div>
          </Marker>
        )}

        {/* Fire markers */}
        {fires.map((fire) => (
          <Marker key={fire.id} longitude={fire.longitude} latitude={fire.latitude}>
            <img
              src={reportGif}
              style={{ width: 40, height: 40, cursor: 'pointer' }}
              alt="Fire"
              onMouseEnter={() =>
                setPopupInfo({
                  longitude: fire.longitude,
                  latitude: fire.latitude,
                  title: 'Fire Report',
                  details: `${fire.message}\nSeverity: ${fire.riskLevel}\nLocation: [${fire.latitude.toFixed(3)}, ${fire.longitude.toFixed(3)}]`,
                })
              }
            />
          </Marker>
        ))}

        {/* Sensor markers */}
        {sensors.map((sensor) => (
          <Marker key={sensor.id} longitude={sensor.longitude} latitude={sensor.latitude}>
            <img
              src={sensorGif}
              style={{ width: 40, height: 40, cursor: 'pointer' }}
              alt="Sensor"
              onMouseEnter={() =>
                setPopupInfo({
                  longitude: sensor.longitude,
                  latitude: sensor.latitude,
                  title: sensor.name,
                  details: `Status: ${sensor.status}\nBattery: ${sensor.battery}%\nTemp: ${sensor.temperature}°C`,
                })
              }
            />
          </Marker>
        ))}

        {/* Broadcast alert markers */}
        {broadcastAlerts.map((alert) => {
          const radiusKm = alert.radius && alert.radius > 0 ? alert.radius : 1;
          return (
            <Marker key={alert.id} longitude={alert.position[1]} latitude={alert.position[0]}>
              <img
                src={alertGif}
                style={{ width: 40, height: 40, cursor: 'pointer' }}
                alt="Alert"
                onMouseEnter={() =>
                  setPopupInfo({
                    longitude: alert.position[1],
                    latitude: alert.position[0],
                    title: 'Broadcast Alert',
                    details: `Severity: ${alert.priority}\nMessage: ${alert.message}\nRadius: ${radiusKm.toFixed(2)} km`,
                  })
                }
              />
            </Marker>
          );
        })}

        {/* Broadcast alert circles - rendered as polygon fills */}
        {alertCirclePolygons.length > 0 && (
          <Source id="alert-circles" type="geojson" data={alertsCollection}>
            <Layer
              id="alert-circles-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.2,
              }}
            />
            <Layer
              id="alert-circles-outline"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 2,
              }}
            />
          </Source>
        )}

        {/* Draft alert preview circle - follows mouse and changes with priority */}
        {draftAlertCollection && (
          <Source id="draft-alert-circle" type="geojson" data={draftAlertCollection}>
            <Layer
              id="draft-alert-circle-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.15,
              }}
            />
            <Layer
              id="draft-alert-circle-outline"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 2,
              }}
            />
          </Source>
        )}

        {/* Evacuation route */}
        {routeGeoJSON && (
          <Source type="geojson" data={routeGeoJSON}>
            <Layer
              id="route"
              type="line"
              paint={{
                'line-color': '#3b82f6',
                'line-width': 4,
              }}
            />
          </Source>
        )}

        {/* Popup card - stays open on hover */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
            offset={25}
          >
            <div
              className="bg-white rounded-lg shadow-xl p-3 min-w-[200px]"
              onMouseLeave={() => setPopupInfo(null)}
            >
              <h3 className="font-semibold text-sm text-gray-900 mb-1">
                {popupInfo.title}
              </h3>
              <p className="text-xs text-gray-600 whitespace-pre-line">
                {popupInfo.details}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Draft alert radius indicator */}
      {mousePosition && (
        <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 rounded bg-black/80 px-3 py-2 text-sm text-white shadow-lg z-50">
          Radius: {draftRadiusKm.toFixed(2)} km | Priority: {draftPriority}
        </div>
      )}

      {/* Legend – bottom left */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-md px-3 py-2 text-xs text-gray-800 space-y-1 z-50">
        <div className="font-semibold text-[11px] text-gray-700 mb-1">
          Legend (click to cycle)
        </div>
        <button
          type="button"
          onClick={cycleBroadcasts}
          className="flex items-center space-x-2 hover:bg-gray-100 rounded px-2 py-1 w-full text-left"
        >
          <img src={alertGif} alt="Broadcast" className="w-4 h-4" />
          <span>Broadcasts ({broadcastAlerts.length})</span>
        </button>
        <button
          type="button"
          onClick={cycleFires}
          className="flex items-center space-x-2 hover:bg-gray-100 rounded px-2 py-1 w-full text-left"
        >
          <img src={reportGif} alt="Report" className="w-4 h-4" />
          <span>Reports ({fires.length})</span>
        </button>
        <button
          type="button"
          onClick={cycleSensors}
          className="flex items-center space-x-2 hover:bg-gray-100 rounded px-2 py-1 w-full text-left"
        >
          <img src={sensorGif} alt="Sensor" className="w-4 h-4" />
          <span>Sensors ({sensors.length})</span>
        </button>
      </div>

      {/* "My Location" button – bottom right */}
      <button
        type="button"
        onClick={goToUserLocation}
        className="absolute bottom-4 right-4 rounded-full bg-white/90 backdrop-blur shadow-md w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-50 z-50"
        title="Go to my location"
      >
        ⦿
      </button>
    </div>
  );
};

export default MapComponent;
