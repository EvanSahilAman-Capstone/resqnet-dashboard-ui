import { useState, useEffect } from 'react'; 

// Defines the data shape for a wildfire event (from DynamoDB schema)
export interface WildfireEvent {
    id: string; 
    latitude: number;
    longitude: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    message: string;
}

export const useLocalData = () => {
   const [fires, setFires] = useState<WildfireEvent[]>([]);
   const [evacRoute, setEvacRoute] = useState<[number, number][]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
    setLoading(false);
   }, []);

   return { fires, evacRoute, loading, setFires, setEvacRoute };
};