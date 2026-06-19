export const API_CONFIG = {
    BASE_URL: '', // ВСЕГДА пустая строка для Vercel
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
    // ВСЕГДА используем только относительный путь
    let url = endpoint;
    
    if (params) {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => 
            searchParams.append(key, params[key])
        );
        url += '?' + searchParams.toString();
    }
    
    return url;
};
