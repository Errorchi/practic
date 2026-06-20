import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Clock, Flag } from 'lucide-react';
import { formatDate, formatTimeFromDate, getPriorityColorClass, getPriorityLabel, sortTasksByTimeAndPriority } from './general';
import { apiService } from '../../services/api.service';
import { NotificationService } from '../../services/push.service';
import { useNotifications } from '../../hooks/push';
import type { Task, DailyStreak } from '../../types';

interface MainPageProps {
  tasks: Task[];
  onTaskComplete: (taskId: string) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onDeleteTask: (taskId: string) => void;
}

export function MainPage({
  tasks,
  onTaskComplete,
  onAddTask,
  onDeleteTask
}: MainPageProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskIsSkill, setNewTaskIsSkill] = useState(false);
  const [newTaskDeadline, setNewTaskDeadline] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [newTaskSkillDuration, setNewTaskSkillDuration] = useState(1);
  const [newTaskTime, setNewTaskTime] = useState('09:00');

  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useNotifications(tasks);

  useEffect(() => {
    const loadStreak = async () => {
      try {
        const streakData = await apiService.getStreak();
        setStreak(streakData);
      } catch (error) {
        console.error('Failed to load streak:', error);
      }
    };
    loadStreak();
  }, []);

  useEffect(() => {
    const requestQuietly = async () => {
      const notificationService = NotificationService.getInstance();
      await notificationService.requestPermission();
    };
    requestQuietly();
  }, []);

  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.deadline).toDateString();
    const today = new Date().toDateString();
    return taskDate === today;
  });

  const skills = todayTasks.filter(task => task.is_skill);
  const regularTasks = todayTasks.filter(task => !task.is_skill);

  // ✅ Функция валидации
  const validateTaskDate = (deadlineDateTime: Date): string | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(deadlineDateTime.getFullYear(), deadlineDateTime.getMonth(), deadlineDateTime.getDate());
    
    if (targetDate < today) {
      return '❌ Нельзя создавать задачи на прошедшие даты. Выберите сегодняшнюю или будущую дату.';
    }
    
    if (targetDate.getTime() === today.getTime() && deadlineDateTime.getTime() < now.getTime()) {
      return '❌ Нельзя создавать задачи на прошедшее время сегодня. Выберите будущее время.';
    }
    
    return null;
  };

  // ✅ Исправленный handleAddTask с валидацией и обработкой ошибок
  const handleAddTask = async () => {
    // Очищаем предыдущую ошибку
    setErrorMessage(null);

    // Проверка текста
    if (!newTaskText.trim()) {
      setErrorMessage('❌ Введите описание задачи');
      return;
    }

    // Собираем дату и время
    const deadlineDateTime = new Date(newTaskDeadline);
    const [hours, minutes] = newTaskTime.split(':').map(Number);
    deadlineDateTime.setHours(hours, minutes, 0, 0);

    // ✅ ВАЛИДАЦИЯ НА КЛИЕНТЕ
    const validationError = validateTaskDate(deadlineDateTime);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        text: newTaskText.trim(),
        completed: false,
        deadline: deadlineDateTime.toISOString(),
        priority: newTaskPriority,
        is_skill: newTaskIsSkill,
        skill_duration: newTaskIsSkill ? newTaskSkillDuration : undefined,
        original_deadline: null,
        parent_task_id: null,
        day_number: 1
      };
      
      await onAddTask(taskData);
      
      // Сброс формы
      setNewTaskText('');
      setNewTaskPriority('medium');
      setNewTaskIsSkill(false);
      setNewTaskSkillDuration(1);
      setNewTaskTime('09:00');
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setNewTaskDeadline(`${year}-${month}-${day}`);
      setShowAddForm(false);
      
    } catch (error: any) {
      console.error('Failed to add task:', error);
      
      // ✅ Извлекаем сообщение об ошибке из ответа сервера
      let errorMsg = 'Не удалось создать задачу. Попробуйте позже.';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (data.message) {
          errorMsg = data.message;
        } else if (data.details) {
          errorMsg = data.details;
        } else if (data.error) {
          errorMsg = data.error;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(`❌ ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Задачи на сегодня
          </h1>
          <p className="text-gray-600">
            {formatDate(new Date())}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-md border-2 border-pink-200">
            <div className="text-3xl font-bold text-pink-600">
              {todayTasks.filter(t => t.completed).length}/{todayTasks.length}
            </div>
            <div className="text-sm text-gray-600">Задач выполнено</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border-2 border-pink-200">
            <div className="text-3xl font-bold text-pink-600">
              {skills.filter(s => s.completed).length}/{skills.length}
            </div>
            <div className="text-sm text-gray-600">Навыков выполнено</div>
          </div>
        </div>

        {skills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Ежедневные навыки ⚡
            </h2>
            <div className="space-y-2">
              {sortTasksByTimeAndPriority(skills).map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={onTaskComplete}
                  onDelete={onDeleteTask}
                  formatTime={formatTimeFromDate}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            Задачи 📝
          </h2>
          {regularTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-pink-200">
              <p className="text-gray-500">Нет задач на сегодня. Добавьте задачу ниже!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortTasksByTimeAndPriority(regularTasks).map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={onTaskComplete}
                  onDelete={onDeleteTask}
                  formatTime={formatTimeFromDate}
                />
              ))}
            </div>
          )}
        </div>

        {!showAddForm ? (
          <button
            onClick={() => {
              setShowAddForm(true);
              setErrorMessage(null);
            }}
            className="w-full bg-pink-600 text-white py-4 rounded-xl hover:bg-pink-700 transition-colors font-semibold shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={24} />
            Добавить новую задачу
          </button>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-pink-200">
            <h3 className="font-bold mb-4">Добавить новую задачу</h3>
            
            {/* ✅ ОТОБРАЖЕНИЕ ОШИБКИ */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">
                {errorMessage}
              </div>
            )}
            
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => {
                setNewTaskText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Описание задачи..."
              className={`w-full px-4 py-3 border-2 rounded-lg mb-4 focus:outline-none focus:border-pink-500 ${
                errorMessage ? 'border-red-300' : 'border-pink-200'
              }`}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Приоритет
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Время выполнения
                </label>
                <input
                  type="time"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Срок выполнения
                </label>
                <input
                  type="date"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  &nbsp;
                </label>
                <div className="flex items-center h-full">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTaskIsSkill}
                      onChange={(e) => {
                        setNewTaskIsSkill(e.target.checked);
                        if (!e.target.checked) {
                          setNewTaskSkillDuration(1);
                        }
                      }}
                      className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                    />
                    <span className="text-sm text-gray-700">Ежедневный навык</span>
                  </label>
                </div>
              </div>
            </div>

            {newTaskIsSkill && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Длительность навыка (дней)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTaskSkillDuration(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newTaskSkillDuration}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setNewTaskSkillDuration(Math.max(1, Math.min(30, value)));
                    }}
                    className="w-20 px-3 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setNewTaskSkillDuration(prev => Math.min(30, prev + 1))}
                    className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddTask}
                disabled={isSubmitting}
                className={`flex-1 py-2 rounded-lg transition-colors font-semibold ${
                  isSubmitting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-pink-600 text-white hover:bg-pink-700'
                }`}
              >
                {isSubmitting ? 'Создание...' : 'Добавить задачу'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setErrorMessage(null);
                  setNewTaskText('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  formatTime: (dateString: string) => string;
}

function TaskItem({
  task,
  onComplete,
  onDelete,
  formatTime
}: TaskItemProps) {
  const getSkillDayInfo = () => {
    if (task.is_skill && task.skill_duration && task.skill_duration > 1) {
      return ` (день ${task.day_number || 1} из ${task.skill_duration})`;
    }
    return '';
  };

  return (
    <div
      className={`bg-white rounded-xl p-4 shadow-md border-2 transition-all ${
        task.completed
          ? 'bg-green-50 border-green-300'
          : 'border-pink-200 hover:border-pink-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onComplete(task.id)}
          className="flex-shrink-0 mt-1"
          disabled={task.completed}
        >
          {task.completed ? (
            <CheckCircle2 className="text-green-600" size={24} />
          ) : (
            <Circle className="text-gray-400 hover:text-pink-600 transition-colors" size={24} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`font-medium ${
              task.completed
                ? 'line-through text-gray-500'
                : 'text-gray-800'
            }`}
          >
            {task.text}{getSkillDayInfo()}
          </p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColorClass(task.priority)}`}>
              <Flag size={12} className="inline mr-1" />
              {getPriorityLabel(task.priority)}
            </span>
            
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={12} />
              {formatTime(task.deadline)}
            </span>

            {task.is_skill && task.skill_duration && task.skill_duration > 1 && (
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full">
                Навык {task.skill_duration} дней
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}