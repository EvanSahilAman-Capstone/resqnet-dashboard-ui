import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { INCIDENT_STATUS_OPACITY } from './constants';
import type { WildfireEvent, BroadcastAlert, Sensor, PopupInfo, FireReport, Incident } from './types';

interface MarkersProps {
  fires:              WildfireEvent[];
  fireReports?:       FireReport[];
  incidents?:         Incident[];
  sensors:            Sensor[];
  broadcastAlerts:    BroadcastAlert[];
  userLocation:       [number, number] | null;
  destinationPin:     [number, number] | null;
  onPopup:            (info: PopupInfo | null) => void;
  onBroadcastDetail:  (alert: BroadcastAlert) => void;
  onFireReportClick?: (report: FireReport) => void;
  onIncidentClick?:   (incident: Incident) => void;
}

const SEV_COLOR: Record<string, string> = {
  low:      '#9ca3af',
  medium:   '#f97316',
  high:     '#ef4444',
  critical: '#991b1b',
};

const BCAST_COLOR: Record<string, string> = {
  LOW:    '#9ca3af',
  MEDIUM: '#f97316',
  HIGH:   '#ef4444',
  URGENT: '#991b1b',
};

// Every wrapper must be exactly the icon size — zero extra space
const zero: React.CSSProperties = {
  display:    'block',
  lineHeight: 0,
  padding:    0,
  margin:     0,
  border:     'none',
  background: 'none',
};

// White circle button — fire reports, incidents, sensors, wildfire feed
const CirclePin: React.FC<{
  color:         string;
  size?:         number;
  opacity?:      number;
  onClick?:      () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children:      React.ReactNode;
}> = ({ color, size = 32, opacity = 1, onClick, onMouseEnter, onMouseLeave, children }) => (
  <div
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{
      ...zero,
      width:           size,
      height:          size,
      borderRadius:    '50%',
      backgroundColor: '#ffffff',
      border:          `2px solid ${color}`,
      boxShadow:       '0 2px 6px rgba(0,0,0,0.20)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      cursor:          onClick ? 'pointer' : 'default',
      opacity,
      flexShrink:      0,
    }}
  >
    {children}
  </div>
);

// Bare icon — broadcast only (no circle, no background)
const BarePin: React.FC<{
  onClick?:      () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children:      React.ReactNode;
}> = ({ onClick, onMouseEnter, onMouseLeave, children }) => (
  <div
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{ ...zero, cursor: onClick ? 'pointer' : 'default' }}
  >
    {children}
  </div>
);

// Build a clean SVG — display:block kills inline spacing glow
const Svg = (
  children: React.ReactNode,
  color: string,
  size: number,
  extraStyle?: React.CSSProperties,
) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', pointerEvents: 'none', flexShrink: 0, ...extraStyle }}
  >
    {children}
  </svg>
);

// SVG paths
const FlameIcon  = (color: string, size: number) => Svg(<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>, color, size);
const PersonIcon = (color: string, size: number) => Svg(<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>, color, size);
const RadioIcon  = (color: string, size: number) => Svg(<><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></>, color, size);
const CpuIcon    = (color: string, size: number) => Svg(<><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M9 2v2M2 15h2M2 9h2M15 22v-2M9 22v-2M22 15h-2M22 9h-2"/></>, color, size);
const NavIcon    = (color: string, size: number) => Svg(<path d="M3 11l19-9-9 19-2-8-8-2z"/>, color, size, { transform: 'rotate(-90deg)' });
const PinIcon    = (color: string, size: number) => Svg(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>, color, size);

const MapMarkers: React.FC<MarkersProps> = ({
  fires, fireReports = [], incidents = [], sensors, broadcastAlerts,
  userLocation, destinationPin, onPopup, onBroadcastDetail,
  onFireReportClick, onIncidentClick,
}) => (
  <>
    {/* ── User location ── circle + nav arrow ──────────────────────────── */}
    {userLocation && (
      <Marker longitude={userLocation[0]} latitude={userLocation[1]} anchor="center">
        <CirclePin
          color="#2563eb"
          size={30}
          onMouseEnter={() => onPopup({ longitude: userLocation[0], latitude: userLocation[1], title: 'Your Location', details: 'You are here' })}
          onMouseLeave={() => onPopup(null)}
        >
          {NavIcon('#2563eb', 14)}
        </CirclePin>
      </Marker>
    )}

    {/* ── Destination pin ── circle + map pin ──────────────────────────── */}
    {destinationPin && (
      <Marker longitude={destinationPin[1]} latitude={destinationPin[0]} anchor="center">
        <CirclePin
          color="#dc2626"
          size={30}
          onMouseEnter={() => onPopup({ longitude: destinationPin[1], latitude: destinationPin[0], title: 'Destination', details: `[${destinationPin[0].toFixed(3)}, ${destinationPin[1].toFixed(3)}]` })}
          onMouseLeave={() => onPopup(null)}
        >
          {PinIcon('#dc2626', 14)}
        </CirclePin>
      </Marker>
    )}

    {/* ── Incidents ── white circle + flame coloured by severity ───────── */}
    {incidents
      .filter((inc) => {
        if (!inc.coordinates) return false;
        const [lng, lat] = inc.coordinates;
        return typeof lng === 'number' && typeof lat === 'number'
          && !isNaN(lng) && !isNaN(lat)
          && inc.status !== 'cancelled';
      })
      .map((inc) => {
        const [lng, lat] = inc.coordinates!;
        const color   = inc.status === 'contained' ? '#16a34a' : (SEV_COLOR[inc.severity] ?? '#ef4444');
        const opacity = INCIDENT_STATUS_OPACITY[inc.status] ?? 1;
        return (
          <Marker key={`inc-${inc.incident_id}`} longitude={lng} latitude={lat} anchor="center">
            <CirclePin
              color={color}
              size={32}
              opacity={opacity}
              onClick={() => onIncidentClick?.(inc)}
              onMouseEnter={() => onPopup({ longitude: lng, latitude: lat, title: inc.title, details: `${inc.status.toUpperCase()} · ${inc.severity} · ${inc.category.replace(/_/g, ' ')}` })}
              onMouseLeave={() => onPopup(null)}
            >
              {FlameIcon(color, 15)}
            </CirclePin>
          </Marker>
        );
      })}

    {/* ── Citizen fire reports ── white circle + person icon ───────────── */}
    {fireReports
      .filter((r) => !r.status || r.status === 'pending_review')
      .map((report) => {
        const [lng, lat] = report.coordinates;
        const color = SEV_COLOR[report.severity] ?? '#f97316';
        return (
          <Marker key={`fr-${report.report_id}`} longitude={lng} latitude={lat} anchor="center">
            <CirclePin
              color={color}
              size={32}
              onClick={() => onFireReportClick?.(report)}
              onMouseEnter={() => onPopup({ longitude: lng, latitude: lat, title: `🚨 ${report.hazard_type}`, details: `By ${report.uploading_user} · ${report.severity} · pending review` })}
              onMouseLeave={() => onPopup(null)}
            >
              {PersonIcon(color, 15)}
            </CirclePin>
          </Marker>
        );
      })}

    {/* ── Wildfire feed events ── white circle + flame (red) ───────────── */}
    {fires.map((fire) => {
      const color = fire.riskLevel === 'EXTREME' ? '#991b1b'
                  : fire.riskLevel === 'HIGH'    ? '#ef4444'
                  : fire.riskLevel === 'MEDIUM'  ? '#f97316'
                  :                                '#9ca3af';
      return (
        <Marker key={fire.id} longitude={fire.longitude} latitude={fire.latitude} anchor="center">
          <CirclePin
            color={color}
            size={30}
            onMouseEnter={() => onPopup({ longitude: fire.longitude, latitude: fire.latitude, title: fire.message, details: `${fire.riskLevel} · [${fire.latitude.toFixed(3)}, ${fire.longitude.toFixed(3)}]` })}
            onMouseLeave={() => onPopup(null)}
          >
            {FlameIcon(color, 14)}
          </CirclePin>
        </Marker>
      );
    })}

    {/* ── Sensors ── white circle + CPU icon ───────────────────────────── */}
    {sensors.map((sensor) => {
      const color = sensor.status === 'ONLINE'  ? '#16a34a'
                  : sensor.status === 'WARNING' ? '#f59e0b'
                  :                               '#9ca3af';
      return (
        <Marker key={sensor.id} longitude={sensor.longitude} latitude={sensor.latitude} anchor="center">
          <CirclePin
            color={color}
            size={30}
            onMouseEnter={() => onPopup({ longitude: sensor.longitude, latitude: sensor.latitude, title: sensor.name, details: `${sensor.status} · ${sensor.battery}% · ${sensor.temperature}°C` })}
            onMouseLeave={() => onPopup(null)}
          >
            {CpuIcon(color, 14)}
          </CirclePin>
        </Marker>
      );
    })}

    {/* ── Broadcasts ── BARE radio icon, NO circle ─────────────────────── */}
    {broadcastAlerts.map((alert) => {
      const color = BCAST_COLOR[alert.priority] ?? '#ef4444';
      return (
        <Marker key={alert.id} longitude={alert.position[1]} latitude={alert.position[0]} anchor="center">
          <BarePin
            onClick={() => onBroadcastDetail(alert)}
            onMouseEnter={() => onPopup({ longitude: alert.position[1], latitude: alert.position[0], title: alert.message, details: `${alert.priority} · ${alert.radius > 0 ? alert.radius.toFixed(1) : '1.0'}km radius — click for details` })}
            onMouseLeave={() => onPopup(null)}
          >
            {RadioIcon(color, 22)}
          </BarePin>
        </Marker>
      );
    })}
  </>
);

export default MapMarkers;