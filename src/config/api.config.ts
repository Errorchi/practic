// For local development, change VITE_API_URL to your local server URL (e.g., http://localhost:3000)
// For production with Vercel, it will be auto-detected from the deployment URL (leave empty)
const BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_CONFIG = {
    BASE_URL: BASE_URL,
    TIMEOUT: 30000,
    ENDPOINTS: {
        AUTH: '/api/auth',
        TASKS: '/api/tasks',
        STREAK: '/api/streak',
        PROFILE: '/api/profile',
        ACHIEVEMENTS: '/api/achievements'
    }
};

export const getApiUrl = (endpoint: string, params?: Record<string, string>): string => {
    let url: string;
    
    if (API_CONFIG.BASE_URL) {
        // Full URL for local development or custom API server
        url = API_CONFIG.BASE_URL + endpoint;
    } else {
        // Relative URL for same-origin (Vercel deployment)
        url = endpoint;
    }
    
    if (params) {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => 
            searchParams.append(key, params[key])
        );
        url += '?' + searchParams.toString();
    }
    
    return url;
};