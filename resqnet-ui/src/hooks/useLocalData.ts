import { useState, useEffect } from 'react'; 

// Match the backend schema
export interface FireReport {
    report_id: string;
    photo_link: string;
    hazard_type: string;
    uploading_user: string;
    coordinates: [number, number];
    severity: "low" | "medium" | "high";
    timestamp: string;
}

// Keep WildfireEvent for the Map component
export interface WildfireEvent {
    id: string; 
    latitude: number;
    longitude: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    message: string;
}

export const useLocalData = () => {
   const [fires, setFires] = useState<FireReport[]>([]);
   const [evacRoute, setEvacRoute] = useState<[number, number][]>([]);
   const [loading, setLoading] = useState(true);
   
   useEffect(() => {
       const fetchFires = async () => {
           try {
               const res = await fetch("http://127.0.0.1:8000/fires");
               const data: FireReport[] = await res.json();
               setFires(data);
           } catch (err) {
               console.error("Failed to fetch fires:", err);
           } finally {
               setLoading(false);
           }
       };

       fetchFires();
   }, []);

   return { fires, evacRoute, loading, setFires, setEvacRoute };
};
