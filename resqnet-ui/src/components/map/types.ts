import type { LayerToggles } from '../../context/PanelContext';
import type { FireReport, Incident } from '../../hooks/useLocalData';


export interface WildfireEvent {
  id:        string;
  latitude:  number;
  longitude: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  message:   string;
}


export interface BroadcastAlert {
  id:           string;
  position:     [number, number];
  radius:       number;
  priority:     'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  message:      string;
  timestamp?:   string;
  status?:      'ACTIVE' | 'UPDATED' | 'RESOLVED';
  description?: string;
  createdBy?:   { email: string | null; name: string | null; user_id: string };
  updatedBy?:   { email: string | null; name: string | null; user_id: string } | null;
  updatedAt?:   string | null;
  logs?:        { message: string; updated_by: string; timestamp: string }[];
}


export interface Sensor {
  id:          string;
  name:        string;
  status:      'ONLINE' | 'WARNING' | 'OFFLINE';
  latitude:    number;
  longitude:   number;
  health:      number;
  temperature: number;
  humidity:    number;
  battery:     number;
  lastPing:    string;
}


export interface PopupInfo {
  longitude: number;
  latitude:  number;
  title:     string;
  details:   string;
}


export interface MapStyle {
  id:    string;
  label: string;
  url:   string;
  icon?: string;
}


export interface FireReportReview {
  reviewed_by:       string;
  reviewed_at:       string;
  decision:          'verify' | 'verify_and_change_to_incident' | 'reject';
  notes?:            string | null;
  rejection_reason?: string | null;
  incident_id?:      string | null;
}


export interface BackendSensor {
  id?:            string;
  last_seen?:     number | string | null;
  lat?:           number | string | null;
  lng?:           number | string | null;
  temperature?:   number | string | null;
  humidity?:      number | string | null;
  battery_level?: number | string | null;
  container_id?:  string | null;
}


export interface MapProps {
  fires:                        WildfireEvent[];
  evacuationRoute?:             [number, number][];
  evacuationSafetyScore?:       number;
  broadcastAlerts?:             BroadcastAlert[];
  sensors?:                     Sensor[];
  incidents?:                   Incident[];
  fireReports?:                 FireReport[];
  onFireReportClick?:           (r: FireReport) => void;
  onIncidentClick?:             (i: Incident) => void;
  onMapClick?:                  (lat: number, lng: number) => void;
  isPlacingAlert?:              boolean;
  isBroadcastPanelOpen?:        boolean;
  draftRadiusKm?:               number;
  draftPriority?:               'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  onStartDestinationSelection?: () => void;
  onSelectDestinationOnMap?:    (lat: number, lng: number) => void;
  onRequestRouteFromPinned?:    () => void;
  onCancelRoute?:               () => void;
  hasActiveRoute?:              boolean;
  isSelectingDestination?:      boolean;
  destinationPin?:              [number, number] | null;
  onCycleBroadcastsRef?:        (fn: () => void) => void;
  onCycleFiresRef?:             (fn: () => void) => void;
  onCycleSensorsRef?:           (fn: () => void) => void;
  onGoToLocationRef?:           (fn: () => void) => void;
  onFlyToRef?:                  (fn: (lat: number, lng: number) => void) => void;
  onDraftRadiusChange?:         (r: number) => void;
  onBroadcastDetail?:           (alert: BroadcastAlert) => void;
  layerToggles?:                LayerToggles;
  customOverlayFile?:           File | null;
}


// Re-export shared types so map sub-components can import from one place
export type { FireReport, Incident };