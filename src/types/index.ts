export interface Task {
    id: string;
    user_id?: number;
    text: string;
    completed: boolean;
    deadline: string;
    priority: 'low' | 'medium' | 'high';
    is_skill: boolean;
    skill_duration?: number;
    original_deadline?: string | null;
    parent_task_id?: string | null;
    day_number?: number;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  currency: number;
  characterIcon: string;
  backgroundStyle: string;
  experience: number;
  level: number;
  levelTitle?: string;
  tags: string[];
  purchasedIcons?: string[];
  purchasedBackgrounds?: string[];
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    reward?: number;
    unlocked?: boolean;
    unlocked_at?: string;
}

export interface DailyStreak {
    user_id: number;
    current_streak: number;
    streak_multiplier: number;
    last_completed_date: string;
    base_experience: number;
    updated_at?: string;
}

export interface LoginResponse {
    success: boolean;
    userId?: number;
    user?: UserProfile;
    error?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export type Page = 'main' | 'calendar' | 'profile';

export interface LevelUpgrade {
    level: number;
    reward: number;
    unlocked: boolean;
}