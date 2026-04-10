import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { UserRound, ShieldCheck } from 'lucide-react';
import { INCIDENT_STATUS_OPACITY } from './constants';
import type { WildfireEvent, BroadcastAlert, Sensor, PopupInfo, SafeZone } from './types';
import type { FireReport, Incident } from '../../hooks/useLocalData';

interface MarkersProps {
  fires:              WildfireEvent[];
  fireReports?:       FireReport[];
  incidents?:         Incident[];
  sensors:            Sensor[];
  broadcastAlerts:    BroadcastAlert[];
  safeZones?:         SafeZone[];
  userLocation:       [number, number] | null;
  destinationPin:     [number, number] | null;
  onPopup:            (info: PopupInfo | null) => void;
  onBroadcastDetail:  (alert: BroadcastAlert) => void;
  onFireReportClick?: (report: FireReport) => void;
  onIncidentClick?:   (incident: Incident) => void;
  onSafeZoneClick?:   (zone: SafeZone) => void;
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

const SAFE_ZONE_GREEN = '#16a34a';

function safeMarker(
  id: string,
  lng: number,
  lat: number,
  label: string,
): { valid: true; lng: number; lat: number } | { valid: false } {
  const ok =
    typeof lng === 'number' && typeof lat === 'number' &&
    !isNaN(lng) && !isNaN(lat) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180;
  if (!ok) {
    console.warn(`[MapMarkers] invalid coords ${label} id=${id} lng=${lng} lat=${lat} — skipped`);
    return { valid: false };
  }
  return { valid: true, lng, lat };
}

const FilledCirclePin: React.FC<{
  color: string; size?: number; opacity?: number;
  onClick?: () => void; onMouseEnter?: () => void; onMouseLeave?: () => void;
  children: React.ReactNode;
}> = ({ color, size = 36, opacity = 1, onClick, onMouseEnter, onMouseLeave, children }) => (
  <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{
    width: size, height: size, borderRadius: '50%', backgroundColor: color,
    border: '2.5px solid rgba(255,255,255,0.6)', boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default', opacity, flexShrink: 0, lineHeight: 0, padding: 0, margin: 0,
  }}>{children}</div>
);

const CirclePin: React.FC<{
  color: string; size?: number; opacity?: number;
  onClick?: () => void; onMouseEnter?: () => void; onMouseLeave?: () => void;
  children: React.ReactNode;
}> = ({ color, size = 32, opacity = 1, onClick, onMouseEnter, onMouseLeave, children }) => (
  <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{
    width: size, height: size, borderRadius: '50%', backgroundColor: '#ffffff',
    border: `2px solid ${color}`, boxShadow: '0 2px 6px rgba(0,0,0,0.20)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default', opacity, flexShrink: 0, lineHeight: 0, padding: 0, margin: 0,
  }}>{children}</div>
);

const BarePin: React.FC<{
  onClick?: () => void; onMouseEnter?: () => void; onMouseLeave?: () => void;
  children: React.ReactNode;
}> = ({ onClick, onMouseEnter, onMouseLeave, children }) => (
  <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{
    display: 'block', lineHeight: 0, padding: 0, margin: 0,
    border: 'none', background: 'none', cursor: onClick ? 'pointer' : 'default',
  }}>{children}</div>
);

const Svg = (children: React.ReactNode, color: string, size: number, extraStyle?: React.CSSProperties) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', pointerEvents: 'none', flexShrink: 0, ...extraStyle }}>
    {children}
  </svg>
);

const FlameIcon = (c: string, s: number) => Svg(<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />, c, s);
const RadioIcon = (c: string, s: number) => Svg(<><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></>, c, s);
const CpuIcon   = (c: string, s: number) => Svg(<><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M9 2v2M2 15h2M2 9h2M15 22v-2M9 22v-2M22 15h-2M22 9h-2"/></>, c, s);
const NavIcon   = (c: string, s: number) => Svg(<path d="M3 11l19-9-9 19-2-8-8-2z" />, c, s, { transform: 'rotate(-90deg)' });
const PinIcon   = (c: string, s: number) => Svg(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>, c, s);

const SAFE_ZONE_CATEGORY_LABEL: Record<string, string> = {
  shelter:          'Shelter',
  medical:          'Medical',
  evacuation_point: 'Evacuation Point',
  command_post:     'Command Post',
  other:            'Safe Zone',
};

const MapMarkers: React.FC<MarkersProps> = ({
  fires, fireReports = [], incidents = [], sensors, broadcastAlerts,
  safeZones = [], userLocation, destinationPin, onPopup, onBroadcastDetail,
  onFireReportClick, onIncidentClick, onSafeZoneClick,
}) => {
  return (
    <>
      {/* ── User location — stored as [lng, lat] ─────────────────────────── */}
      {userLocation && (() => {
        const c = safeMarker('user', userLocation[0], userLocation[1], 'userLocation');
        if (!c.valid) return null;
        return (
          <Marker longitude={c.lng} latitude={c.lat} anchor="center">
            <CirclePin color="#2563eb" size={32}
              onMouseEnter={() => onPopup({ longitude: c.lng, latitude: c.lat, title: 'Your Location', details: 'You are here' })}
              onMouseLeave={() => onPopup(null)}>
              {NavIcon('#2563eb', 15)}
            </CirclePin>
          </Marker>
        );
      })()}

      {/* ── Destination pin — stored as [lat, lng] ───────────────────────── */}
      {destinationPin && (() => {
        const c = safeMarker('dest', destinationPin[1], destinationPin[0], 'destinationPin');
        if (!c.valid) return null;
        return (
          <Marker longitude={c.lng} latitude={c.lat} anchor="center">
            <CirclePin color="#dc2626" size={32}
              onMouseEnter={() => onPopup({ longitude: c.lng, latitude: c.lat, title: 'Destination', details: `[${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}]` })}
              onMouseLeave={() => onPopup(null)}>
              {PinIcon('#dc2626', 15)}
            </CirclePin>
          </Marker>
        );
      })()}

      {/* ── Safe zones — always green, always shown ──────────────────────── */}
      {safeZones.map((zone) => {
        const c = safeMarker(zone.safe_zone_id, zone.coordinates[0], zone.coordinates[1], 'safeZone');
        if (!c.valid) return null;
        const categoryLabel = SAFE_ZONE_CATEGORY_LABEL[zone.category] ?? 'Safe Zone';
        return (
          <Marker key={`sz-${zone.safe_zone_id}`} longitude={c.lng} latitude={c.lat} anchor="center">
            <BarePin
              onClick={() => onSafeZoneClick?.(zone)}
              onMouseEnter={() => onPopup({
                longitude: c.lng,
                latitude:  c.lat,
                title:     zone.name,
                details:   `${categoryLabel} · ${zone.status.replace('_', ' ')} · ${zone.radius_m}m radius`,
              })}
              onMouseLeave={() => onPopup(null)}>
              <ShieldCheck
                size={26}
                color={SAFE_ZONE_GREEN}
                strokeWidth={2}
                style={{ display: 'block', pointerEvents: 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }}
              />
            </BarePin>
          </Marker>
        );
      })}

      {/* ── Incidents — coordinates [lng, lat] ───────────────────────────── */}
      {incidents.map((inc) => {
        const c = safeMarker(inc.incident_id, inc.coordinates?.[0], inc.coordinates?.[1], 'incident');
        if (!c.valid || inc.status === 'cancelled') return null;
        const color =
          inc.status === 'contained' ? '#16a34a' :
          inc.status === 'resolved'  ? '#6b7280' :
          SEV_COLOR[inc.severity]    ?? '#ef4444';
        const opacity = INCIDENT_STATUS_OPACITY[inc.status] ?? 1;
        return (
          <Marker key={`inc-${inc.incident_id}`} longitude={c.lng} latitude={c.lat} anchor="center">
            <FilledCirclePin color={color} size={36} opacity={opacity}
              onClick={() => onIncidentClick?.(inc)}
              onMouseEnter={() => onPopup({ longitude: c.lng, latitude: c.lat, title: inc.title, details: `${inc.status.toUpperCase()} · ${inc.severity} · ${inc.category.replace(/_/g, ' ')}` })}
              onMouseLeave={() => onPopup(null)}>
              {FlameIcon('#ffffff', 17)}
            </FilledCirclePin>
          </Marker>
        );
      })}

      {/* ── Fire reports — coordinates [lng, lat] ────────────────────────── */}
      {fireReports.map((report) => {
        const c = safeMarker(report.report_id, report.coordinates?.[0], report.coordinates?.[1], 'fireReport');
        if (!c.valid || (report.status && report.status !== 'pending_review')) return null;
        const color = SEV_COLOR[report.severity] ?? '#f97316';
        return (
          <Marker key={`fr-${report.report_id}`} longitude={c.lng} latitude={c.lat} anchor="center">
            <CirclePin color={color} size={36}
              onClick={() => onFireReportClick?.(report)}
              onMouseEnter={() => onPopup({ longitude: c.lng, latitude: c.lat, title: report.hazard_type, details: `By ${report.uploading_user} · ${report.severity} · pending review` })}
              onMouseLeave={() => onPopup(null)}>
              <UserRound size={18} color={color} strokeWidth={2} style={{ pointerEvents: 'none' }} />
            </CirclePin>
          </Marker>
        );
      })}

      {/* ── Wildfire feed — explicit latitude/longitude fields ────────────── */}
      {fires.map((fire) => {
        const c = safeMarker(fire.id, fire.longitude, fire.latitude, 'wildfire');
        if (!c.valid) return null;
        const color =
          fire.riskLevel === 'EXTREME' ? '#991b1b' :
          fire.riskLevel === 'HIGH'    ? '#ef4444' :
          fire.riskLevel === 'MEDIUM'  ? '#f97316' : '#9ca3af';
        return (
          <Marker key={fire.id} longitude={c.lng} latitude={c.lat} anchor="center">
            <CirclePin color={color} size={30}
              onMouseEnter={() => onPopup({ longitude: c.lng, latitude: c.lat, title: fire.message, details: `${fire.riskLevel} · [${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}]` })}
              onMouseLeave={() => onPopup(null)}>
              {FlameIcon(color, 14)}
            </CirclePin>
          </Marker>
        );
      })}

      {/* ── Sensors — explicit latitude/longitude fields ──────────────────── */}
      {sensors.map((sensor) => {
        const c = safeMarker(sensor.id, sensor.longitude, sensor.latitude, 'sensor');
        if (!c.valid) return null;
        const color =
          sensor.status === 'ONLINE'  ? '#16a34a' :
          sensor.status === 'WARNING' ? '#f59e0b' : '#9ca3af';
        return (
          <Marker key={sensor.id} longitude={c.lng} latitude={c.lat} anchor="center">
            <CirclePin color={color} size={30}
              onMouseEnter={() => onPopup({ longitude: c.lng, latitude: c.lat, title: sensor.name, details: `${sensor.status} · ${sensor.battery}% · ${sensor.temperature}C` })}
              onMouseLeave={() => onPopup(null)}>
              {CpuIcon(color, 14)}
            </CirclePin>
          </Marker>
        );
      })}

      {/* ── Broadcasts — position [lat, lng] ─────────────────────────────── */}
      {broadcastAlerts.map((alert) => {
        const c = safeMarker(alert.id, alert.position[1], alert.position[0], 'broadcast');
        if (!c.valid) return null;
        const color = BCAST_COLOR[alert.priority] ?? '#ef4444';
        return (
          <Marker key={alert.id} longitude={c.lng} latitude={c.lat} anchor="center">
            <BarePin
              onClick={() => onBroadcastDetail(alert)}
              onMouseEnter={() => onPopup({ longitude: c.lng, latitude: c.lat, title: alert.message, details: `${alert.priority} · ${alert.radius > 0 ? alert.radius.toFixed(1) : '1.0'}km radius — click for details` })}
              onMouseLeave={() => onPopup(null)}>
              {RadioIcon(color, 22)}
            </BarePin>
          </Marker>
        );
      })}
    </>
  );
};

export default MapMarkers;