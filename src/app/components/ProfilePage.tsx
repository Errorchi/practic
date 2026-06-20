import { Settings, LogOut, Mail, Coins, ShoppingBag, Trophy, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { UserProfile, Achievement, DailyStreak } from '../../types';
import { apiService } from '../../services/api.service';

interface ProfilePageProps {
  userProfile: UserProfile;
  achievements: Achievement[];
  onUpdateProfile: (profile: UserProfile) => void;
  onLogout: () => void;
  onResetProgress: () => void;
}

const backgroundStyles = [
  { id: 'default', name: 'По умолчанию', color: 'from-pink-100 to-pink-300', price: 0 },
  { id: 'beige', name: 'Бафф', color: 'from-stone-300 to-stone-500', price: 5 },
  { id: 'beach', name: 'Пляж', color: 'from-red-50 to-amber-100', price: 5 },
  { id: 'sunset', name: 'Закат', color: 'from-orange-200 to-pink-300', price: 100 },
  { id: 'ocean', name: 'Океан', color: 'from-blue-200 to-cyan-300', price: 150 },
  { id: 'forest', name: 'Лес', color: 'from-green-200 to-emerald-300', price: 200 },
  { id: 'midnight', name: 'Полночь', color: 'from-purple-400 to-indigo-900', price: 400 },
  { id: 'vamp', name: 'Сумерки', color: 'from-rose-500 to-gray-950', price: 777 },
  { id: 'barbie', name: 'Барби', color: 'from-pink-400 to-pink-600', price: 1000 },
  { id: 'gradient', name: 'Градиент', color: 'from-pink-200 to-indigo-300', price: 1234 },
  { id: 'gold', name: 'Золото', color: 'from-yellow-300 to-amber-500', price: 5000 },
];

const characterIcons = [
  { id: '👧', name: 'Человек', price: 0 },
  { id: '👩‍🌾', name: 'Фермер', price: 30 },
  { id: '👩‍💼', name: 'Бизнесмен', price: 30 },
  { id: '👩‍🎨', name: 'Художник', price: 50},
  { id: '🕵️‍♀️', name: 'Детектив', price: 50 },
  { id: '👩‍🚀', name: 'Космонавт', price: 80 },
  { id: '👩‍💻', name: 'Программист', price: 80 },
  { id: '👩‍🔬', name: 'Ученый', price: 120 },
  { id: '🤖', name: 'Робот', price: 120 },
  { id: '🧛‍♀️', name: 'Вампир', price: 150 },
  { id: '🧝‍♀️', name: 'Эльф', price: 150 },
  { id: '🧚‍♀️', name: 'Фея', price: 180 },
  { id: '🧙‍♀️', name: 'Волшебник', price: 180 },
  { id: '🦸', name: 'Супергерой', price: 200 },
  { id: '👸', name: 'Королевская особа', price: 200 },
];

export function ProfilePage({
  userProfile,
  achievements,
  onUpdateProfile,
  onLogout,
  onResetProgress
}: ProfilePageProps) {
  
  const [showSettings, setShowSettings] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editEmail, setEditEmail] = useState(userProfile.email);
  const [localAchievements, setLocalAchievements] = useState<Achievement[]>(achievements);
  
  const [purchasedBackgrounds, setPurchasedBackgrounds] = useState<string[]>(
    userProfile.purchasedBackgrounds || ['default', userProfile.backgroundStyle]
  );
  const [purchasedIcons, setPurchasedIcons] = useState<string[]>(
    userProfile.purchasedIcons || ['👧', userProfile.characterIcon]
  );

  const [streak, setStreak] = useState<DailyStreak | null>(null);
  useEffect(() => {
    if (userProfile) {
      setPurchasedBackgrounds(userProfile.purchasedBackgrounds || ['default']);
      setPurchasedIcons(userProfile.purchasedIcons || ['👧']);
    }
  }, [userProfile])
  useEffect(() => {
    const loadData = async () => {
      try {
        const [streakData, achievementsData] = await Promise.all([
          apiService.getStreak(),
          apiService.getAchievements()
        ]);
        setStreak(streakData);
        setLocalAchievements(achievementsData);
        //console.log('📥 Profile loaded achievements:', achievementsData);
      } catch (error) {
        console.error('Failed to load profile data:', error);
      }
    };
    loadData();
  }, []);

  const handlePurchaseBackground = async (styleId: string, price: number) => {
    const currentPurchased = [...purchasedBackgrounds];
    
    if (!currentPurchased.includes(styleId)) {
      if (userProfile.currency >= price) {
        const updatedProfile = {
          ...userProfile,
          currency: userProfile.currency - price,
          backgroundStyle: styleId,
          purchasedBackgrounds: [...currentPurchased, styleId]
        };
        
        setPurchasedBackgrounds([...currentPurchased, styleId]);
        
        try {
          await onUpdateProfile(updatedProfile);
        } catch (error) {
          setPurchasedBackgrounds(currentPurchased);
          console.error('Failed to purchase background:', error);
        }
      } else {
        alert('Недостаточно монет для покупки!');
      }
    } else {
      const updatedProfile = {
        ...userProfile,
        backgroundStyle: styleId,
        purchasedBackgrounds: currentPurchased
      };
      await onUpdateProfile(updatedProfile);
    }
  };

  const handlePurchaseIcon = async (iconId: string, price: number) => {
    const isPurchased = purchasedIcons.includes(iconId);
    
    if (!isPurchased) {
      if (userProfile.currency >= price) {
        const updatedProfile = {
          ...userProfile,
          currency: userProfile.currency - price,
          characterIcon: iconId,
          purchasedIcons: [...purchasedIcons, iconId]
        };
        
        try {
          await onUpdateProfile(updatedProfile);
        } catch (error) {
          console.error('Failed to purchase icon:', error);
          alert('Ошибка при покупке. Попробуйте позже.');
        }
      } else {
        alert('Недостаточно монет для покупки!');
      }
    } else {
      const updatedProfile = {
        ...userProfile,
        characterIcon: iconId
      };
      await onUpdateProfile(updatedProfile);
    }
  };

  const handleSaveSettings = async () => {
    const updatedProfile = {
      ...userProfile,
      name: editName,
      email: editEmail,
      purchasedIcons: purchasedIcons,
      purchasedBackgrounds: purchasedBackgrounds
    };
    await onUpdateProfile(updatedProfile);
    setShowSettings(false);
  };
  
  const unlockedAchievements = localAchievements.filter(a => a.unlocked);
  const totalAchievementReward = localAchievements
    .filter(a => a.unlocked)
    .reduce((sum, ach) => sum + (ach.reward || 0), 0);

  return (
    <div className="min-h-full p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Профиль</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-white rounded-full shadow-md border-2 border-pink-200 hover:bg-pink-50 transition-colors"
          >
            <Settings className="text-pink-600" size={24} />
          </button>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-pink-200">
              <h2 className="text-2xl font-bold mb-6">Настройки</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <button
                  onClick={() => {
                    if (confirm('Вы уверены, что хотите сбросить весь прогресс? Это действие нельзя отменить.')) {
                      onResetProgress();
                      setShowSettings(false);
                    }
                  }}
                  className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} />
                  Сбросить прогресс
                </button>

                <button
                  onClick={onLogout}
                  className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <LogOut size={20} />
                  Выйти
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition-colors font-semibold"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setEditName(userProfile.name);
                    setEditEmail(userProfile.email);
                    setShowSettings(false);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-pink-200 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div 
              key={`icon-${userProfile.characterIcon}`}
              className="text-8xl transition-all duration-300"
            >
              {userProfile.characterIcon || '👧'}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-1">{userProfile.name}</h2>
              <p className="text-gray-600 flex items-center gap-2">
                <Mail size={16} />
                {userProfile.email}
              </p>
              
              <div className="mt-3 mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Уровень {userProfile.level}</span>
                  <span className="text-sm text-gray-600">{userProfile.experience} опыта</span>
                </div>
                <div className="w-full bg-pink-100 rounded-full h-2">
                  <div 
                    className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(userProfile.experience % 100) || 0}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                  До следующего уровня: {100 - (userProfile.experience % 100)} опыта
                </div>
              </div>
              
              {userProfile.tags && userProfile.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {userProfile.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700 rounded-full text-sm font-medium border border-pink-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-100 to-pink-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-pink-700 font-semibold flex items-center gap-2">
                <Coins className="text-yellow-500" size={24} />
                Валюта
              </span>
              <span className="text-3xl font-bold text-pink-700">{userProfile.currency}</span>
            </div>
            <div className="mt-2 text-sm text-pink-600">
              Заработано за достижения: <span className="font-bold">{totalAchievementReward} монет</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-200 mb-6">
          <button
            onClick={() => setShowStore(!showStore)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag size={28} />
              Магазин
            </h2>
            <span className="text-pink-600">{showStore ? <ChevronDown size={30} strokeWidth={3}/> : <ChevronRight size={30} strokeWidth={3} />}</span>
          </button>

          {showStore && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-3">Иконки персонажей</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {characterIcons.map(icon => {
                    const isPurchased = purchasedIcons.includes(icon.id);
                    const canAfford = userProfile.currency >= icon.price;
                    const isActive = userProfile.characterIcon === icon.id;

                    return (
                      <button
                        key={icon.id}
                        onClick={() => handlePurchaseIcon(icon.id, icon.price)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isActive
                            ? 'bg-pink-600 border-pink-600 text-white'
                            : isPurchased
                            ? 'bg-white border-pink-200 hover:border-pink-400'
                            : canAfford
                            ? 'bg-pink-50 border-pink-200 hover:border-pink-400'
                            : 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                        }`}
                        disabled={!isPurchased && !canAfford}
                      >
                        <div className="text-4xl mb-2">{icon.id}</div>
                        <div className="font-semibold text-sm">{icon.name}</div>
                        <div className="text-xs font-semibold">
                          {isPurchased ? (
                            <span className={isActive ? 'text-white' : 'text-pink-600'}>Куплено</span>
                          ) : (
                            <span className={`flex items-center justify-center gap-1 ${
                              canAfford ? 'text-gray-700' : 'text-gray-400'
                            }`}>
                              <Coins size={12} className="text-yellow-500" />
                              {icon.price}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3">Стили фона</h3>
                <div className="grid grid-cols-2 gap-3">
                  {backgroundStyles.map(style => {
                    const isPurchased = purchasedBackgrounds.includes(style.id);
                    const canAfford = userProfile.currency >= style.price;
                    const isActive = userProfile.backgroundStyle === style.id;

                    return (
                      <button
                        key={style.id}
                        onClick={() => handlePurchaseBackground(style.id, style.price)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isActive
                            ? 'border-pink-600 ring-2 ring-pink-600'
                            : isPurchased
                            ? 'border-pink-200 hover:border-pink-400'
                            : canAfford
                            ? 'border-pink-200 hover:border-pink-400'
                            : 'border-gray-200 opacity-50 cursor-not-allowed'
                        } ${canAfford ? 'bg-pink-50' : 'bg-gray-50'}`}
                        disabled={!isPurchased && !canAfford}
                      >
                        <div className={`h-16 rounded-lg bg-gradient-to-br ${style.color} mb-2`} />
                        <div className="font-semibold text-sm text-gray-800">{style.name}</div>
                        <div className="text-xs mt-1">
                          {isPurchased ? (
                            <span className="text-pink-600">Куплено</span>
                          ) : (
                            <span className={`flex items-center justify-center gap-1 ${
                              canAfford ? 'text-gray-700' : 'text-gray-400'
                            }`}>
                              <Coins size={12} className="text-yellow-500" />
                              {style.price}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-200">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Trophy size={28} />
            Достижения
          </h2>
          
          <div className="mb-4 p-4 bg-pink-50 rounded-xl border-2 border-pink-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600 mb-1">Прогресс</div>
                <div className="text-2xl font-bold text-pink-700">
                  {unlockedAchievements.length} / {achievements.length}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">Награда</div>
                <div className="text-2xl font-bold text-green-600">
                  {totalAchievementReward} монет
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map(achievement => (
              <div
                key={achievement.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  achievement.unlocked
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-4xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold mb-1 ${
                      achievement.unlocked ? 'text-orange-700' : 'text-gray-500'
                    }`}>
                      {achievement.title}
                    </h3>
                    <p className={`text-sm ${
                      achievement.unlocked ? 'text-orange-600' : 'text-gray-400'
                    }`}>
                      {achievement.description}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      {achievement.unlocked ? (
                        <div className="inline-block px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                          Разблокировано!
                        </div>
                      ) : (
                        <div className="inline-block px-3 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
                          Заблокировано
                        </div>
                      )}
                      {achievement.reward && (
                        <div className={`text-sm font-bold flex items-center gap-1 ${
                          achievement.unlocked ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          <Coins size={12} className="text-yellow-500" />
                          {achievement.reward} монет
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}