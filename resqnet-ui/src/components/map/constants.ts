import type { MapStyle } from './types';

export const MAP_STYLES: MapStyle[] = [
  { id: 'streets',   label: 'Standard',   url: 'mapbox://styles/mapbox/streets-v12'           },
  { id: 'outdoors',  label: 'Terrain',    url: 'mapbox://styles/mapbox/outdoors-v12'           },
  { id: 'satellite', label: 'Satellite',  url: 'mapbox://styles/mapbox/satellite-streets-v12'  },
  { id: 'dark',      label: 'Dark',       url: 'mapbox://styles/mapbox/dark-v11'               },
  { id: '3d',        label: '3D',         url: 'mapbox://styles/mapbox/streets-v12'           },
];

export const PRIORITY_COLORS: Record<string, string> = {
  LOW:    '#9CA3AF',
  MEDIUM: '#FCD34D',
  HIGH:   '#FB923C',
  URGENT: '#DC2626',
};

export const getRouteColor = (score?: number): string => {
  if (score == null) return '#3b82f6';
  if (score >= 80)   return '#10b981';
  if (score >= 60)   return '#facc15';
  if (score >= 40)   return '#fb923c';
  return '#ef4444';
};

export const getConfidenceLabel = (score?: number): string => {
  if (score == null) return 'Unknown';
  if (score >= 80)   return 'High';
  if (score >= 60)   return 'Moderate';
  if (score >= 40)   return 'Low';
  return 'Very Low';
};

export const SENSOR_LOCATION_NAMES: Record<string, string> = {
  SENSOR_001: "Dryden Fire Center",
  SENSOR_002: "Red Lake",
  SENSOR_003: "Sioux Lookout",
  SENSOR_004: "Thunder Bay",
  SENSOR_005: "Timmins",
  SENSOR_006: "Cochrane",
  SENSOR_007: "Pickle Lake",
}