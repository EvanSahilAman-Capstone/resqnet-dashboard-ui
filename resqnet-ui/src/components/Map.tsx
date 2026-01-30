// Map.tsx

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

export interface WildfireEvent {
  id: string;
  latitude: number;
  longitude: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  message: string;
}

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
  evacuationSafetyScore?: number;
  broadcastAlerts?: BroadcastAlert[];
  sensors?: Sensor[];

  onMapClick?: (lat: number, lng: number) => void;
  isPlacingAlert?: boolean;
  draftRadiusKm?: number;
  draftPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  onStartDestinationSelection?: () => void;
  onSelectDestinationOnMap?: (lat: number, lng: number) => void;
  onRequestRouteFromPinned?: () => void;
  onCancelRoute?: () => void;
  hasActiveRoute?: boolean;
  isSelectingDestination?: boolean;
  destinationPin?: [number, number] | null;
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
  evacuationSafetyScore,
  broadcastAlerts = [],
  sensors = [],
  onMapClick,
  isPlacingAlert = false,
  draftRadiusKm = 1,
  draftPriority = 'LOW',
  onStartDestinationSelection,
  onSelectDestinationOnMap,
  onRequestRouteFromPinned,
  onCancelRoute,
  hasActiveRoute = false,
  isSelectingDestination = false,
  destinationPin = null,
}) => {
  const mapRef = useRef<MapRef | null>(null);

  const [viewState, setViewState] = useState({
    longitude: -79.5,
    latitude: 44.5,
    zoom: 10,
  });

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [initialUserLocation, setInitialUserLocation] = useState<[number, number] | null>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [mousePosition, setMousePosition] = useState<[number, number] | null>(null);

  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [fireIndex, setFireIndex] = useState(0);
  const [sensorIndex, setSensorIndex] = useState(0);

  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    if (destinationPin) {
      setSearchInput(`${destinationPin[0].toFixed(6)}, ${destinationPin[1].toFixed(6)}`);
    } else {
      setSearchInput('');
    }
  }, [destinationPin]);

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
    LOW: '#9CA3AF',
    MEDIUM: '#FCD34D',
    HIGH: '#FB923C',
    URGENT: '#DC2626',
  };

  const getRouteColorFromScore = (score?: number): string => {
    if (score == null) return '#3b82f6';
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#facc15';
    if (score >= 40) return '#fb923c';
    return '#ef4444';
  };

  const getConfidenceLabelFromScore = (score?: number): string => {
    if (score == null) return 'Unknown';
    if (score >= 80) return 'High';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Low';
    return 'Very Low';
  };

  const routeColor = getRouteColorFromScore(evacuationSafetyScore);

  const routeGeoJSON: Feature<LineString> | null =
    evacuationRoute.length > 0
      ? {
          type: 'Feature',
          properties: {
            safetyScore: evacuationSafetyScore ?? null,
          },
          geometry: {
            type: 'LineString',
            coordinates: evacuationRoute.map(([lat, lng]) => [lng, lat]),
          },
        }
      : null;

  const alertCirclePolygons: Feature[] = broadcastAlerts.map((alert) => {
    const center: [number, number] = [alert.position[1], alert.position[0]];
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
          if (isPlacingAlert) {
            const { lng, lat } = e.lngLat;
            setMousePosition([lng, lat]);
            return;
          }

          if (routeGeoJSON && mapRef.current) {
            const features = mapRef.current.queryRenderedFeatures(e.point, {
              layers: ['route-hover-hit'],
            });

            if (features.length > 0) {
              const f = features[0];
              const score = f.properties?.safetyScore as number | undefined;
              const coords = (f.geometry as any).coordinates;
              const midIdx = Math.floor(coords.length / 2);
              const [lng, lat] = coords[midIdx];

              setPopupInfo({
                longitude: lng,
                latitude: lat,
                title: 'Evacuation Route',
                details: `${score?.toFixed(1) ?? 'N/A'}|${getConfidenceLabelFromScore(score)}`,
              });
            } else {
              if (popupInfo?.title === 'Evacuation Route') {
                setPopupInfo(null);
              }
            }
          }
        }}
        onClick={(e) => {
          const { lng, lat } = e.lngLat;

          if (isPlacingAlert && onMapClick) {
            onMapClick(lat, lng);
            setMousePosition(null);
            return;
          }

          if (isSelectingDestination && onSelectDestinationOnMap) {
            onSelectDestinationOnMap(lat, lng);
            return;
          }
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
        cursor={isPlacingAlert ? 'crosshair' : isSelectingDestination ? 'pointer' : 'grab'}
        ref={mapRef}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker longitude={userLocation[0]} latitude={userLocation[1]}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '9999px',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-blue-600"
                style={{ transform: 'rotate(-90deg)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </div>
          </Marker>
        )}

        {/* Destination pin marker */}
        {destinationPin && (
          <Marker longitude={destinationPin[1]} latitude={destinationPin[0]}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '9999px',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 6px rgba(0,0,0,0.25)',
                cursor: 'pointer',
              }}
              onMouseEnter={() =>
                setPopupInfo({
                  longitude: destinationPin[1],
                  latitude: destinationPin[0],
                  title: 'Destination',
                  details: `[${destinationPin[0].toFixed(3)}, ${destinationPin[1].toFixed(3)}]`,
                })
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-red-600"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
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
                  title: fire.message,
                  details: `${fire.riskLevel} • [${fire.latitude.toFixed(3)}, ${fire.longitude.toFixed(3)}]`,
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
                  details: `${sensor.status} • ${sensor.battery}% • ${sensor.temperature}°C`,
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
                    title: alert.message,
                    details: `${alert.priority} • ${radiusKm.toFixed(1)}km radius`,
                  })
                }
              />
            </Marker>
          );
        })}

        {/* Broadcast alert circles */}
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

        {/* Draft alert preview circle */}
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
                'line-color': routeColor,
                'line-width': 5,
              }}
            />
            <Layer
              id="route-hover-hit"
              type="line"
              paint={{
                'line-color': 'rgba(0,0,0,0)',
                'line-width': 16,
              }}
            />
          </Source>
        )}

        {/* Single white popup - NO outer wrapper */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            onClose={() => setPopupInfo(null)}
            offset={20}
            className="custom-popup"
          >
            <div
              onMouseLeave={() => setPopupInfo(null)}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            >
              {popupInfo.title === 'Evacuation Route' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151' }}>
                  {/* Safety Score */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      style={{ width: '16px', height: '16px', color: '#EAB308' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                      />
                    </svg>
                    <span style={{ fontWeight: 600 }}>{popupInfo.details.split('|')[0]}</span>
                  </div>

                  <span style={{ color: '#D1D5DB' }}>•</span>

                  {/* Confidence */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      style={{ width: '16px', height: '16px', color: '#3B82F6' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.99 14.993 6-6m6 3.001c0 1.268-.63 2.39-1.593 3.069a3.746 3.746 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043 3.745 3.745 0 0 1-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.297 3.746 3.746 0 0 1-1.593-3.068c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 0 1 1.043-3.297 3.745 3.745 0 0 1 3.296-1.042 3.745 3.745 0 0 1 3.068-1.594c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.297 3.746 3.746 0 0 1 1.593 3.068ZM9.74 9.743h.008v.007H9.74v-.007Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                      />
                    </svg>
                    <span>{popupInfo.details.split('|')[1]}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 600, fontSize: '12px', color: '#111827', marginBottom: '2px' }}>
                    {popupInfo.title}
                  </p>
                  <p style={{ fontSize: '11px', color: '#6B7280' }}>{popupInfo.details}</p>
                </div>
              )}
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

      {/* Destination mode indicator */}
      {isSelectingDestination && (
        <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 rounded bg-green-600 px-4 py-2 text-sm text-white shadow-lg z-50">
          Click on the map to select destination
        </div>
      )}

      {/* Routing controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 bg-white/95 backdrop-blur rounded-full shadow px-4 py-2">
        <input
          type="text"
          className="border-none outline-none text-sm bg-transparent w-56"
          placeholder="Click pin, then click map"
          value={searchInput}
          readOnly
        />

        {!hasActiveRoute ? (
          <>
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onStartDestinationSelection?.()}
              disabled={hasActiveRoute}
              aria-label="Select destination on map"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
            </button>

            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onRequestRouteFromPinned?.()}
              disabled={!destinationPin}
              aria-label="Generate route"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-red-500 hover:bg-red-50"
            onClick={() => onCancelRoute?.()}
            aria-label="Cancel route"
          >
            <span className="text-red-600 text-sm font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-md px-3 py-2 text-xs text-gray-800 space-y-1 z-50">
        <div className="font-semibold text-[11px] text-gray-700 mb-1">Legend (click to cycle)</div>
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

      {/* My Location button */}
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
