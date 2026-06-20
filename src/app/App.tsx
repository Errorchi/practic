import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { MainPage } from './components/MainPage';
import { CalendarPage } from './components/CalendarPage';
import { ProfilePage } from './components/ProfilePage';
import { Home, Calendar, User } from 'lucide-react';
import type { Page, Task, Achievement, UserProfile, LevelUpgrade } from '../types';
import { apiService } from '../services/api.service';
import { authService } from '../services/auth.service';
import { API_CONFIG } from '../config/api.config';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('main');
  const [loading, setLoading] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 0,
    name: 'User',
    email: 'user@example.com',
    currency: 0,
    characterIcon: '👧',
    backgroundStyle: 'default',
    experience: 0,
    level: 1,
    tags: ['Новичок']
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [levelUpgrades, setLevelUpgrades] = useState<LevelUpgrade[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = authService.isLoggedIn();
      if (loggedIn) {
        setIsLoggedIn(true);
        await loadUserData();
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const profile = await apiService.getProfile();
      //console.log('Profile loaded:', profile);
      setUserProfile(profile);

      const userTasks = await apiService.getTasks();
      //console.log('Tasks loaded:', userTasks);
      setTasks(userTasks);

      const userAchievements = await apiService.getAchievements();
      //console.log('Achievements loaded:', userAchievements);
      setAchievements(userAchievements);
      
    } catch (error) {
      console.error('Failed to load user data:', error);
      authService.logout();
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (name: string, email: string) => {
    setIsLoggedIn(true);
    await loadUserData();
  };

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setTasks([]);
    setAchievements([]);
    setCurrentPage('main');
  };

  const handleResetProgress = async () => {
    setTasks([]);
    setAchievements([]);
    setLevelUpgrades([]);
    setUserProfile({
      ...userProfile,
      currency: 0,
      experience: 0,
      level: 1,
      tags: ['Новичок']
    });
  };

  const handleTaskComplete = async (taskId: string) => {
      try {
          await apiService.completeTask(taskId);
          
          setTasks(tasks.map(task => 
              task.id === taskId ? { ...task, completed: true } : task
          ));

          const updatedProfile = await apiService.getProfile();
          setUserProfile(updatedProfile);

          try {
              const checkResponse = await apiService.request(
                  API_CONFIG.ENDPOINTS.ACHIEVEMENTS, 
                  'POST', 
                  { action: 'check_all' }, 
                  { user_id: apiService.getUserId()!.toString() }
              );
              
              //console.log('🎯 Achievement check response:', checkResponse);
              
              const updatedAchievements = await apiService.getAchievements();
              setAchievements(updatedAchievements);
              
          } catch (error) {
              console.error('Failed to check achievements:', error);
              const updatedAchievements = await apiService.getAchievements();
              setAchievements(updatedAchievements);
          }

          await apiService.checkDailyCompletion();

      } catch (error) {
          console.error('Failed to complete task:', error);
      }
  };

  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    try {
      const response = await apiService.createTask(task);
      if (response.success) {
        const updatedTasks = await apiService.getTasks();
        setTasks(updatedTasks);
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiService.deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    try {
      const profileToSend = {
        name: profile.name,
        email: profile.email,
        characterIcon: profile.characterIcon,
        backgroundStyle: profile.backgroundStyle,
        experience: profile.experience,
        level: profile.level,
        currency: profile.currency,
        tags: profile.tags,
        purchasedBackgrounds: profile.purchasedBackgrounds,
        purchasedIcons: profile.purchasedIcons
      };
      
      const response = await apiService.updateProfile(profileToSend);
      if (response.success) {
        const updatedProfile = await apiService.getProfile();
        setUserProfile(updatedProfile);
        
        const updatedAchievements = await apiService.getAchievements();
        setAchievements(updatedAchievements);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-pink-400 to-pink-600">
        <div className="text-white text-2xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-gradient-to-br ${userProfile.backgroundStyle === 'default' ? 'from-pink-100 to-pink-300' :
      userProfile.backgroundStyle === 'sunset' ? 'from-orange-200 to-pink-300' :
      userProfile.backgroundStyle === 'ocean' ? 'from-blue-200 to-cyan-300' :
      userProfile.backgroundStyle === 'forest' ? 'from-green-200 to-emerald-300' :
      userProfile.backgroundStyle === 'midnight' ? 'from-purple-400 to-indigo-600' :
      userProfile.backgroundStyle === 'gradient' ? 'from-pink-200 to-indigo-300' :
      userProfile.backgroundStyle === 'gold' ? 'from-yellow-300 to-amber-500' :
      userProfile.backgroundStyle === 'vamp' ? 'from-rose-500 to-gray-950' :
      userProfile.backgroundStyle === 'beige' ? 'from-stone-300 to-stone-500' :
      userProfile.backgroundStyle === 'beach' ? 'from-red-50 to-amber-100' :
      userProfile.backgroundStyle === 'barbie' ? 'from-pink-400 to-pink-600' :
      'from-pink-50 to-pink-100'}`}>
      
      <div className="flex-1 overflow-auto">
        {currentPage === 'main' && (
          <MainPage
            tasks={tasks}
            onTaskComplete={handleTaskComplete}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {currentPage === 'calendar' && (
          <CalendarPage
            tasks={tasks}
            onAddTask={handleAddTask}
            onTaskComplete={handleTaskComplete}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {currentPage === 'profile' && (
          <ProfilePage
            key={`profile-${userProfile.characterIcon}-${userProfile.backgroundStyle}-${userProfile.currency}`}
            userProfile={userProfile}
            achievements={achievements}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
            onResetProgress={handleResetProgress}
          />
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 max-w-4xl mx-auto">
          <div className="flex justify-around py-2">
            <button
              onClick={() => setCurrentPage('main')}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all ${
                currentPage === 'main'
                  ? 'text-pink-600'
                  : 'text-gray-400 hover:text-pink-500'
              }`}
            >
              <Home size={20} />
              <span className="text-xs">Главная</span>
            </button>
            <button
              onClick={() => setCurrentPage('calendar')}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all ${
                currentPage === 'calendar'
                  ? 'text-pink-600'
                  : 'text-gray-400 hover:text-pink-500'
              }`}
            >
              <Calendar size={20} />
              <span className="text-xs">Календарь</span>
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all ${
                currentPage === 'profile'
                  ? 'text-pink-600'
                  : 'text-gray-400 hover:text-pink-500'
              }`}
            >
              <User size={20} />
              <span className="text-xs">Профиль</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}