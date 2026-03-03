import React from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import circle from '@turf/circle';
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson';
import type { BroadcastAlert } from './types';
import { PRIORITY_COLORS, getRouteColor } from './constants';

interface MapLayersProps {
  broadcastAlerts: BroadcastAlert[];
  evacuationRoute: [number, number][];
  evacuationSafetyScore?: number;
  mousePosition: [number, number] | null;
  draftRadiusKm: number;
  draftPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  showDraftCircle?: boolean;
}

const MapLayers: React.FC<MapLayersProps> = ({
  broadcastAlerts,
  evacuationRoute,
  evacuationSafetyScore,
  mousePosition,
  draftRadiusKm,
  draftPriority,
  showDraftCircle = false,
}) => {
  const routeColor = getRouteColor(evacuationSafetyScore);

  const alertCircles: Feature[] = broadcastAlerts.map((alert) => {
    const center: [number, number] = [alert.position[1], alert.position[0]];
    const radiusKm = alert.radius > 0 ? alert.radius : 1;
    return circle(center, radiusKm, {
      steps: 64,
      units: 'kilometers',
      properties: {
        id:       alert.id,
        priority: alert.priority,
        color:    PRIORITY_COLORS[alert.priority],
      },
    }) as Feature;
  });

  const alertsCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: alertCircles,
  };

  // Only render when broadcast panel is open AND mouse is on map
  const draftFeature: Feature<Polygon> | null =
    showDraftCircle && mousePosition
      ? (circle(mousePosition, Math.max(0.01, draftRadiusKm), {
          steps: 64,
          units: 'kilometers',
          properties: { color: PRIORITY_COLORS[draftPriority] },
        }) as Feature<Polygon>)
      : null;

  const routeGeoJSON: Feature<LineString> | null =
    evacuationRoute.length > 0
      ? {
          type: 'Feature',
          properties: { safetyScore: evacuationSafetyScore ?? null },
          geometry: {
            type: 'LineString',
            coordinates: evacuationRoute.map(([lat, lng]) => [lng, lat]),
          },
        }
      : null;

  return (
    <>
      {/* Broadcast alert circles */}
      {alertCircles.length > 0 && (
        <Source id="alert-circles" type="geojson" data={alertsCollection}>
          <Layer id="alert-circles-fill" type="fill"
            paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 }} />
          <Layer id="alert-circles-outline" type="line"
            paint={{ 'line-color': ['get', 'color'], 'line-width': 2 }} />
        </Source>
      )}

      {/* Draft broadcast circle — dashed outline */}
      {draftFeature && (
        <Source id="draft-alert-circle" type="geojson"
          data={{ type: 'FeatureCollection', features: [draftFeature] }}>
          <Layer id="draft-alert-circle-fill" type="fill"
            paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 }} />
          <Layer id="draft-alert-circle-outline" type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 2,
              'line-dasharray': [3, 2],
            }} />
        </Source>
      )}

      {/* Evacuation route */}
      {routeGeoJSON && (
        <Source type="geojson" data={routeGeoJSON}>
          <Layer id="route" type="line"
            paint={{ 'line-color': routeColor, 'line-width': 5 }} />
          <Layer id="route-hover-hit" type="line"
            paint={{ 'line-color': 'rgba(0,0,0,0)', 'line-width': 16 }} />
        </Source>
      )}
    </>
  );
};

export default MapLayers;
