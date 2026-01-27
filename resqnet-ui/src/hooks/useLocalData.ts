import { useState, useEffect } from 'react';
import { useApi } from '../utils/api';

export interface FireReport {
    report_id: string;
    photo_link: string;
    hazard_type: string;
    uploading_user: string;
    coordinates: [number, number];
    severity: "low" | "medium" | "high";
    timestamp: string;
}

export interface WildfireEvent {
    id: string; 
    latitude: number;
    longitude: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    message: string;
}

export const useLocalData = () => {
   const { fetchWithAuth } = useApi();
   const [fires, setFires] = useState<FireReport[]>([]);
   const [evacRoute, setEvacRoute] = useState<[number, number][]>([]);
   const [loading, setLoading] = useState(true);
   
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
