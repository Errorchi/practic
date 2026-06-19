import { apiService } from './api.service';

class AuthService {
    private isAuthenticated = false;

    constructor() {
        this.isAuthenticated = !!apiService.getUserId();
    }

    async login(email: string, password: string) {
        try {
            const response = await apiService.login(email, password);
            if (response.success) {
                this.isAuthenticated = true;
                return { success: true, user: response.user };
            }
            return { success: false, error: response.error };
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async register(name: string, email: string, password: string) {
        try {
            const response = await apiService.register(name, email, password);
            if (response.success) {
                this.isAuthenticated = true;
                return { success: true, user: response.user };
            }
            return { success: false, error: response.error };
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    logout() {
        apiService.clearUserId();
        this.isAuthenticated = false;
    }

    isLoggedIn(): boolean {
        return this.isAuthenticated || !!apiService.getUserId();
    }
}

export const authService = new AuthService();