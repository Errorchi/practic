import { API_CONFIG, getApiUrl } from '../config/api.config';
import type { Task, UserProfile, LoginResponse, DailyStreak, Achievement } from '../types';

class ApiService {
    private userId: number | null = null;

    setUserId(id: number) {
        this.userId = id;
        localStorage.setItem('userId', id.toString());
    }

    getUserId(): number | null {
        if (!this.userId) {
            const stored = localStorage.getItem('userId');
            this.userId = stored ? parseInt(stored) : null;
        }
        return this.userId;
    }

    clearUserId() {
        this.userId = null;
        localStorage.removeItem('userId');
    }

    private async request<T>(
        endpoint: string,
        method: string = 'GET',
        data?: any,
        params?: Record<string, string>
    ): Promise<T> {
        const url = getApiUrl(endpoint, params);

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            return result;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>(API_CONFIG.ENDPOINTS.AUTH, 'POST', {
            action: 'login',
            email,
            password
        });
        
        if (response.success && response.userId) {
            this.setUserId(response.userId);
        }
        
        return response;
    }

    async register(name: string, email: string, password: string): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>(API_CONFIG.ENDPOINTS.AUTH, 'POST', {
            action: 'register',
            name,
            email,
            password
        });
        
        if (response.success && response.userId) {
            this.setUserId(response.userId);
        }
        
        return response;
    }

    async logout(): Promise<void> {
        this.clearUserId();
    }


    async getSkillTasks(): Promise<Task[]> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        const allTasks = await this.getTasks();
        return allTasks.filter(task => task.is_skill);
    }
    async createTask(task: Omit<Task, 'id'>): Promise<{ success: boolean; id: string }> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        const deadlineDate = new Date(task.deadline);
        const formattedDeadline = deadlineDate.getFullYear() + '-' + 
            String(deadlineDate.getMonth() + 1).padStart(2, '0') + '-' + 
            String(deadlineDate.getDate()).padStart(2, '0') + ' ' + 
            String(deadlineDate.getHours()).padStart(2, '0') + ':' + 
            String(deadlineDate.getMinutes()).padStart(2, '0') + ':' + 
            String(deadlineDate.getSeconds()).padStart(2, '0');

        const taskData = {
            text: task.text,
            completed: task.completed ? 1 : 0,
            deadline: formattedDeadline,
            priority: task.priority,
            is_skill: task.is_skill ? 1 : 0,
            skill_duration: task.skill_duration || null,
            original_deadline: task.original_deadline || null,
            parent_task_id: task.parent_task_id || null,
            day_number: task.day_number || 1
        };

        return this.request(API_CONFIG.ENDPOINTS.TASKS, 'POST', taskData, { 
            user_id: userId.toString() 
        });
    }
    
    async getTasks(date?: string): Promise<Task[]> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        const params: Record<string, string> = { user_id: userId.toString() };
        if (date) params.date = date;
    
        const response = await this.request<any>(API_CONFIG.ENDPOINTS.TASKS, 'GET', undefined, params);
        return Array.isArray(response) ? response : [];
    }

    async completeTask(taskId: string): Promise<{ success: boolean }> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        return this.request(API_CONFIG.ENDPOINTS.TASKS, 'PUT', { id: taskId }, { user_id: userId.toString() });
    }

    async deleteTask(taskId: string): Promise<{ success: boolean }> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        return this.request(API_CONFIG.ENDPOINTS.TASKS, 'DELETE', undefined, {
            user_id: userId.toString(),
            id: taskId
        });
    }

    async getProfile(): Promise<UserProfile> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        const response = await this.request<any>(API_CONFIG.ENDPOINTS.PROFILE, 'GET', undefined, { 
            user_id: userId.toString() 
        });
        
       // console.log('Profile response:', response);
        
        if (response.success && response.profile) {
            return response.profile;
        }
        
        throw new Error('Invalid profile response');
    }

    async updateProfile(profile: Partial<UserProfile>): Promise<{ success: boolean }> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        return this.request(API_CONFIG.ENDPOINTS.PROFILE, 'PUT', profile, { user_id: userId.toString() });
    }

    async getStreak(): Promise<DailyStreak> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        return this.request<DailyStreak>(API_CONFIG.ENDPOINTS.STREAK, 'GET', undefined, { user_id: userId.toString() });
    }

    async checkDailyCompletion(): Promise<any> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        return this.request(API_CONFIG.ENDPOINTS.STREAK, 'POST', undefined, {
            user_id: userId.toString(),
            action: 'check'
        });
    }

    async getAchievements(): Promise<Achievement[]> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        const response = await this.request<any>(API_CONFIG.ENDPOINTS.ACHIEVEMENTS, 'GET', undefined, { 
            user_id: userId.toString() 
        });
        
       // console.log('Achievements response:', response);
        
        if (response.success && response.all) {
            return response.all;
        } else if (Array.isArray(response)) {
            return response;
        } else if (response.data && Array.isArray(response.data)) {
            return response.data;
        }
        
        return [];
    }

    async checkAndUnlockAchievements(): Promise<Achievement[]> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        const response = await this.request<any>(API_CONFIG.ENDPOINTS.ACHIEVEMENTS, 'POST', {
            action: 'check_all'
        }, { 
            user_id: userId.toString() 
        });
        
        return this.getAchievements();
    }

    async unlockAchievement(achievementId: string): Promise<{ success: boolean; reward?: number }> {
        const userId = this.getUserId();
        if (!userId) throw new Error('User not authenticated');

        return this.request(API_CONFIG.ENDPOINTS.ACHIEVEMENTS, 'POST', { 
            achievement_id: achievementId 
        }, { 
            user_id: userId.toString() 
        });
    }
}

export const apiService = new ApiService();