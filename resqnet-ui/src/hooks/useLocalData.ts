import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../utils/api';


export interface FireReport {
  _id?:           string;
  report_id:      string;
  photo_links:    string[];
  hazard_type:    string;
  uploading_user: string;
  coordinates:    [number, number];
  severity:       'low' | 'medium' | 'high' | 'critical';
  description?:   string;
  timestamp:      string;
  status?:        'pending_review' | 'verified' | 'converted_to_incident' | 'rejected';
  review?:        FireReportReview | null;
  created_by?:    string;
}

export interface FireReportReview {
  reviewed_by:       string;
  reviewed_at:       string;
  decision:          'verify' | 'verify_and_change_to_incident' | 'reject';
  notes?:            string | null;
  rejection_reason?: string | null;
  incident_id?:      string | null;
}

export interface Incident {
  _id?:                   string;
  incident_id:            string;
  title:                  string;
  description:            string;
  category:               'wildfire' | 'smoke' | 'road_block' | 'evacuation_issue' | 'rescue_request' | 'other';
  priority:               'low' | 'medium' | 'high' | 'urgent';
  severity:               'low' | 'medium' | 'high' | 'critical';
  coordinates:            [number, number];
  status:                 'active' | 'contained' | 'resolved' | 'cancelled';
  source_fire_report_id?: string | null;
  created_by:             { user_id: string; name?: string };
  created_at:             string;
  updated_at:             string;
  logs:                   { message: string; updated_by: { user_id: string }; timestamp: string }[];
  comments:               { message: string; created_by: { user_id: string }; created_at: string }[];
}

export interface WildfireEvent {
  id:        string;
  latitude:  number;
  longitude: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  message:   string;
}


// ── useLocalData (fire reports) ───────────────────────────────────────────────

export const useLocalData = () => {
  const { fetchWithAuth } = useApi();
  const [fires, setFires]         = useState<FireReport[]>([]);
  const [evacRoute, setEvacRoute] = useState<[number, number][]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchFires = async () => {
      try {
        const data: FireReport[] = await fetchWithAuth("/fires");
        setFires(data);
      } catch (err) {
        console.error("Failed to fetch fires:", err);
        setFires([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFires();
  }, []);

  return { fires, evacRoute, loading, setFires, setEvacRoute };
};


// ── useIncidents ──────────────────────────────────────────────────────────────

export const useIncidents = () => {
  const { fetchWithAuth } = useApi();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth("/incidents");
      setIncidents(Array.isArray(data) ? data : data.incidents ?? []);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  return { incidents, loading, setIncidents, refetch: fetchIncidents };
};