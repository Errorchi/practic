import { useState, useCallback } from 'react';
import { apiService } from '../services/api.service';

export function useApi<T>(apiCall: (...args: any[]) => Promise<T>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(async (...args: any[]) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiCall(...args);
            setData(result);
            return { success: true, data: result };
        } catch (err: any) {
            const errorMessage = err.message || 'An error occurred';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [apiCall]);

    return { data, loading, error, execute };
}