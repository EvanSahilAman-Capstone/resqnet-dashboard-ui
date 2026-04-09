import { useEffect, useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';

export function useCountyBoundaries(
  mapRef:    RefObject<MapRef | null>,
  mapLoaded: boolean,
) {
  const [showCounties, setShowCounties]       = useState(false);
  const [countiesGeoJSON, setCountiesGeoJSON] =
    useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/ontario-counties.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((fc: GeoJSON.FeatureCollection) => {
        if (cancelled) return;
        setCountiesGeoJSON(fc);
      })
      .catch((err) => console.error('[ResQNet] county boundaries fetch failed:', err));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !mapLoaded || !countiesGeoJSON) return;

    const firstLabel = map.getStyle()?.layers?.find(
      (l) => l.type === 'symbol' &&
        (l.layout as Record<string, unknown>)?.['text-field'],
    )?.id;

    if (!map.getSource('county-boundaries')) {
      map.addSource('county-boundaries', { type: 'geojson', data: countiesGeoJSON });
      map.addLayer({
        id:     'county-fill',
        type:   'fill',
        source: 'county-boundaries',
        layout: { visibility: showCounties ? 'visible' : 'none' },
        paint:  { 'fill-color': '#6366f1', 'fill-opacity': 0.05 },
      }, firstLabel);
      map.addLayer({
        id:     'county-line',
        type:   'line',
        source: 'county-boundaries',
        layout: { visibility: showCounties ? 'visible' : 'none' },
        paint:  { 'line-color': '#6366f1', 'line-width': 1.2, 'line-opacity': 0.75 },
      }, firstLabel);
      return;
    }

    (map.getSource('county-boundaries') as GeoJSONSource).setData(countiesGeoJSON);
  }, [countiesGeoJSON, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !mapLoaded) return;
    const vis = showCounties ? 'visible' : 'none';
    if (map.getLayer('county-fill')) map.setLayoutProperty('county-fill', 'visibility', vis);
    if (map.getLayer('county-line')) map.setLayoutProperty('county-line', 'visibility', vis);
  }, [showCounties, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const rehydrate = useCallback(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !countiesGeoJSON) return;
    ['county-fill', 'county-line'].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource('county-boundaries')) map.removeSource('county-boundaries');
    setCountiesGeoJSON((prev) => (prev ? { ...prev } : prev));
  }, [countiesGeoJSON]); // eslint-disable-line react-hooks/exhaustive-deps

  return { showCounties, setShowCounties, rehydrate };
}