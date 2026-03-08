import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import sensorGif from '../../assets/sensor.gif';
import reportGif from '../../assets/report.gif';
import alertGif  from '../../assets/alert.gif';
import type { WildfireEvent, BroadcastAlert, Sensor, PopupInfo } from './types';

interface MarkersProps {
  fires:            WildfireEvent[];
  sensors:          Sensor[];
  broadcastAlerts:  BroadcastAlert[];
  userLocation:     [number, number] | null;
  destinationPin:   [number, number] | null;
  onPopup:          (info: PopupInfo | null) => void;
  onBroadcastDetail:(alert: BroadcastAlert) => void;  // ← NEW
}

const MapMarkers: React.FC<MarkersProps> = ({
  fires, sensors, broadcastAlerts,
  userLocation, destinationPin,
  onPopup, onBroadcastDetail,
}) => {
  return (
    <>
      {/* User location */}
      {userLocation && (
        <Marker longitude={userLocation[0]} latitude={userLocation[1]}>
          <div
            style={{
              width: 32, height: 32, borderRadius: '9999px',
              backgroundColor: 'white', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 8px rgba(37,99,235,0.6)', cursor: 'pointer',
            }}
            onMouseEnter={() =>
              onPopup({ longitude: userLocation[0], latitude: userLocation[1],
                title: 'Your Location', details: 'You are here' })
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor"
              className="w-5 h-5 text-blue-600"
              style={{ transform: 'rotate(-90deg)' }}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </div>
        </Marker>
      )}

      {/* Destination pin */}
      {destinationPin && (
        <Marker longitude={destinationPin[1]} latitude={destinationPin[0]}>
          <div
            style={{
              width: 32, height: 32, borderRadius: '9999px',
              backgroundColor: 'white', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 6px rgba(0,0,0,0.25)', cursor: 'pointer',
            }}
            onMouseEnter={() =>
              onPopup({ longitude: destinationPin[1], latitude: destinationPin[0],
                title: 'Destination',
                details: `[${destinationPin[0].toFixed(3)}, ${destinationPin[1].toFixed(3)}]` })
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
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
              onPopup({ longitude: fire.longitude, latitude: fire.latitude,
                title: fire.message,
                details: `${fire.riskLevel} • [${fire.latitude.toFixed(3)}, ${fire.longitude.toFixed(3)}]` })
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
              onPopup({ longitude: sensor.longitude, latitude: sensor.latitude,
                title: sensor.name,
                details: `${sensor.status} • ${sensor.battery}% • ${sensor.temperature}°C` })
            }
          />
        </Marker>
      ))}

      {/* Broadcast markers — click opens detail panel */}
      {broadcastAlerts.map((alert) => {
        const radiusKm = alert.radius > 0 ? alert.radius : 1;
        return (
          <Marker key={alert.id} longitude={alert.position[1]} latitude={alert.position[0]}>
            <img
              src={alertGif}
              style={{ width: 40, height: 40, cursor: 'pointer' }}
              alt="Alert"
              onMouseEnter={() =>
                onPopup({ longitude: alert.position[1], latitude: alert.position[0],
                  title: alert.message,
                  details: `${alert.priority} • ${radiusKm.toFixed(1)}km radius — click for details` })
              }
              onClick={() => onBroadcastDetail(alert)}  // ← opens panel
            />
          </Marker>
        );
      })}
    </>
  );
};

export default MapMarkers;
