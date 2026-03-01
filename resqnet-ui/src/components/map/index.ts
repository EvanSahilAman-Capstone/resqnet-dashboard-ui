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

export interface PopupInfo {
  longitude: number;
  latitude: number;
  title: string;
  details: string;
}

export interface MapProps {
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