import axios from "axios";
import type { OptimizeResult } from "../types";

const API_URL = "http://localhost:8000";

export const optimizeRoute = async (origin: string, stops: string[]): Promise<OptimizeResult> => {
    try {
        const response = await axios.post<OptimizeResult>(`${API_URL}/api/optimize`, { origin, stops });
        return response.data;
    } catch (error) {
        console.error("API error:", error);
        throw error;
    }
};
