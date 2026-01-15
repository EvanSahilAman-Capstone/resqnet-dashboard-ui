import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const useApi = () => {
  const { getAccessTokenSilently } = useAuth0();

  const fetchWithAuth = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      try {
        const token = await getAccessTokenSilently();

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    [getAccessTokenSilently]
  );

  return { fetchWithAuth };
};
