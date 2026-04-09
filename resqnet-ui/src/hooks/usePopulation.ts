import { useEffect, useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl';

export interface PopRow {
  latitude:   number;
  longitude:  number;
  population: number;
  area:       number;
}

export function usePopulation(
  mapRef:          RefObject<MapRef | null>,
  mapLoaded:       boolean,
  getToken:        () => Promise<string>,
  isAuthenticated: boolean,
) {
  const [showPopulation, setShowPopulation]       = useState(false);
  const [popLoading, setPopLoading]               = useState(true);
  const [popRawData, setPopRawData]               = useState<PopRow[]>([]);
  const [populationGeoJSON, setPopulationGeoJSON] =
    useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setPopLoading(true);

    console.log('[debug] attempting getToken...');
    getToken()
      .then((token) => {
        console.log('[debug] got token, fetching population...');
        return fetch('/population', {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => {
        console.log('[debug] population response status:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((rows: PopRow[]) => {
        if (cancelled || !Array.isArray(rows)) return;

        const densities    = rows.map((r) => (r.area > 0 ? r.population / r.area : 0));
        const logDensities = densities.map((d) => (d > 0 ? Math.log1p(d) : 0));
        const maxLog       = Math.max(1, ...logDensities);

        const features: GeoJSON.Feature<GeoJSON.Point>[] = rows.map((r, i) => ({
          type: 'Feature',
          properties: {
            weight:  logDensities[i]! / maxLog,
            density: densities[i]!,
          },
          geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
        }));

        const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
        setPopulationGeoJSON(fc);
        setPopRawData(rows);

        const map = mapRef.current?.getMap() as MapboxMap | undefined;
        const src = map?.getSource('population') as GeoJSONSource | undefined;
        src?.setData(fc);
      })
      .catch((err) => console.error('[ResQNet] population fetch failed:', err))
      .finally(() => { if (!cancelled) setPopLoading(false); });

    return () => { cancelled = true; };
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !mapLoaded || !populationGeoJSON) return;

    const firstLabel = map.getStyle()?.layers?.find(
      (l) => l.type === 'symbol' &&
        (l.layout as Record<string, unknown>)?.['text-field'],
    )?.id;

    if (!map.getSource('population')) {
      map.addSource('population', { type: 'geojson', data: populationGeoJSON });

      map.addLayer({
        id:     'population-heatmap',
        type:   'heatmap',
        source: 'population',
        paint: {
          'heatmap-weight':    ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 13, 0.8],
          'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 10, 10, 12, 28, 13, 50],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(0,0,0,0)',
            0.2, 'rgba(0,104,55,0.15)',
            0.4, 'rgba(102,189,99,0.5)',
            0.6, 'rgba(255,255,51,0.8)',
            0.8, 'rgba(253,141,60,0.9)',
            1,   'rgba(215,25,28,1)',
          ],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0, 10, 0.75, 13, 0.3, 15, 0],
        },
      }, firstLabel);

      map.addLayer({
        id:      'population-points',
        type:    'circle',
        source:  'population',
        minzoom: 12,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 2, 17, 4, 19, 8],
          'circle-color': [
            'interpolate', ['linear'], ['get', 'weight'],
            0,    'rgb(0,104,55)',
            0.3,  'rgb(102,189,99)',
            0.5,  'rgb(255,255,51)',
            0.7,  'rgb(253,141,60)',
            0.85, 'rgb(253,141,60)',
            1,    'rgb(215,25,28)',
          ],
          'circle-opacity':      ['interpolate', ['linear'], ['zoom'], 15, 0, 17, 0.75],
          'circle-stroke-width': 0.5,
          'circle-stroke-color': 'rgba(255,255,255,0.5)',
        },
      }, firstLabel);

      return;
    }

    (map.getSource('population') as GeoJSONSource).setData(populationGeoJSON);
  }, [populationGeoJSON, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !mapLoaded) return;
    const vis = showPopulation ? 'visible' : 'none';
    if (map.getLayer('population-heatmap'))
      map.setLayoutProperty('population-heatmap', 'visibility', vis);
    if (map.getLayer('population-points'))
      map.setLayoutProperty('population-points', 'visibility', vis);
  }, [showPopulation, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const rehydrate = useCallback(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !populationGeoJSON) return;
    if (map.getLayer('population-heatmap')) map.removeLayer('population-heatmap');
    if (map.getLayer('population-points'))  map.removeLayer('population-points');
    if (map.getSource('population'))        map.removeSource('population');
    setPopulationGeoJSON((prev) => (prev ? { ...prev } : prev));
  }, [populationGeoJSON]); // eslint-disable-line react-hooks/exhaustive-deps

  return { showPopulation, setShowPopulation, popLoading, popRawData, rehydrate };
}