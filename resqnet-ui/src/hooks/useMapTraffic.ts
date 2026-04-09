import { useEffect, useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Map as MapboxMap } from 'mapbox-gl';

const TRAFFIC_LAYERS = [
  'traffic-and-closure-case',
  'traffic-and-closure-fill',
  'traffic-and-closure-bg',
  'traffic',
];

export function useMapTraffic(
  mapRef:    RefObject<MapRef | null>,
  mapLoaded: boolean,
) {
  const [showTraffic, setShowTraffic]       = useState(false);
  const [trafficLoading, setTrafficLoading] = useState(false);

  useEffect(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !mapLoaded) return;

    setTrafficLoading(true);

    // Add Mapbox traffic source + layers if not already present
    if (!map.getSource('mapbox-traffic')) {
      map.addSource('mapbox-traffic', {
        type: 'vector',
        url:  'mapbox://mapbox.mapbox-traffic-v1',
      });

      map.addLayer({
        id:           'traffic-and-closure-bg',
        type:         'line',
        source:       'mapbox-traffic',
        'source-layer': 'traffic',
        layout: {
          'line-join': 'round',
          'line-cap':  'round',
          visibility:  showTraffic ? 'visible' : 'none',
        },
        paint: {
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 6],
          'line-color': [
            'match', ['get', 'congestion'],
            'low',      '#22c55e',
            'moderate', '#f59e0b',
            'heavy',    '#ef4444',
            'severe',   '#7f1d1d',
            '#22c55e',
          ],
          'line-opacity': 0.6,
        },
      });
    }

    setTrafficLoading(false);
  }, [mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !mapLoaded) return;
    const vis = showTraffic ? 'visible' : 'none';
    TRAFFIC_LAYERS.forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    });
    // also toggle our custom layer
    if (map.getLayer('traffic-and-closure-bg'))
      map.setLayoutProperty('traffic-and-closure-bg', 'visibility', vis);
  }, [showTraffic, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const rehydrate = useCallback(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map) return;
    if (map.getLayer('traffic-and-closure-bg')) map.removeLayer('traffic-and-closure-bg');
    if (map.getSource('mapbox-traffic'))        map.removeSource('mapbox-traffic');
    // trigger re-add by toggling mapLoaded — handled by MapCore's style.load rehydrate call
  }, []);

  return { showTraffic, setShowTraffic, trafficLoading, trafficGeoJSON: null, rehydrate };
}