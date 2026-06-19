-- PostgreSQL Schema for Gamified Task Calendar App
-- Run this SQL in the Neon SQL Editor to create the database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'User',
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    currency INTEGER NOT NULL DEFAULT 0,
    character_icon VARCHAR(50) NOT NULL DEFAULT '👧',
    background_style VARCHAR(50) NOT NULL DEFAULT 'default',
    experience INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    tags TEXT[] NOT NULL DEFAULT ARRAY['Новичок'],
    purchased_icons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    purchased_backgrounds TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    deadline TIMESTAMP NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_skill BOOLEAN NOT NULL DEFAULT FALSE,
    skill_duration INTEGER,
    original_deadline TIMESTAMP,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    day_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily streak table
CREATE TABLE IF NOT EXISTS daily_streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    streak_multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    last_completed_date DATE,
    base_experience INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    reward INTEGER NOT NULL DEFAULT 0
);

-- User achievements (junction table)
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Seed default achievements
INSERT INTO achievements (id, title, description, icon, reward) VALUES
    ('first_task', 'Первый шаг', 'Выполните первую задачу', '🎯', 50),
    ('ten_tasks', 'Десятка', 'Выполните 10 задач', '💪', 100),
    ('fifty_tasks', 'Трудоголик', 'Выполните 50 задач', '🔥', 250),
    ('hundred_tasks', 'Мастер продуктивности', 'Выполните 100 задач', '🏆', 500),
    ('week_streak', 'Неделя', 'Поддерживайте серию 7 дней', '📅', 200),
    ('month_streak', 'Месяц', 'Поддерживайте серию 30 дней', '🌟', 1000),
    ('level_5', 'Новичок-эксперт', 'Достигните 5 уровня', '⭐', 150),
    ('level_10', 'Профессионал', 'Достигните 10 уровня', '👑', 500),
    ('level_20', 'Легенда', 'Достигните 20 уровня', '💎', 2000),
    ('all_achievements', 'Коллекционер', 'Соберите все достижения', '🏅', 5000)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_user_id ON daily_streaks(user_id);