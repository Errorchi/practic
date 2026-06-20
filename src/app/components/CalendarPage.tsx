import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, Trash2, Clock } from 'lucide-react';
import type { Task } from '../../types';
import { 
  getDaysInMonth, 
  getWeekDays, 
  russianMonths, 
  russianMonthsGenitive, 
  russianDaysShort, 
  russianDaysLong,
  formatTimeFromDate,
  getPriorityColorClass,
  getPriorityLabel,
  sortTasksByTimeAndPriority
} from './general';

interface CalendarPageProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onTaskComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

type ViewMode = 'month' | 'week' | 'day';

export function CalendarPage({
  tasks,
  onAddTask,
  onTaskComplete,
  onDeleteTask
}: CalendarPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskIsSkill, setNewTaskIsSkill] = useState(false);
  const [newTaskSkillDuration, setNewTaskSkillDuration] = useState(1);
  const [newTaskTime, setNewTaskTime] = useState('09:00');

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.deadline);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const handlePrevPeriod = () => {
    if (viewMode === 'day') {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() - 1);
      setSelectedDate(newDate);
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'day') {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + 1);
      setSelectedDate(newDate);
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      const selectedDateTime = new Date(selectedDate);
      const [hours, minutes] = newTaskTime.split(':').map(Number);
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      onAddTask({
        text: newTaskText,
        completed: false,
        deadline: selectedDateTime.toISOString(),
        priority: newTaskPriority,
        is_skill: newTaskIsSkill,
        skill_duration: newTaskIsSkill ? newTaskSkillDuration : undefined,
        original_deadline: null,
        parent_task_id: null,
        day_number: 1
      });
      setNewTaskText('');
      setNewTaskPriority('medium');
      setNewTaskIsSkill(false);
      setNewTaskSkillDuration(1);
      setNewTaskTime('09:00');
      setShowAddForm(false);
    }
  };

  const selectedDateTasks = getTasksForDate(selectedDate);
  const days = getDaysInMonth(currentDate);
  const weekDays = getWeekDays(currentDate);

  const getDisplayTitle = () => {
    if (viewMode === 'day') {
      const dayOfWeek = russianDaysLong[selectedDate.getDay()];
      const day = selectedDate.getDate();
      const month = russianMonthsGenitive[selectedDate.getMonth()];
      const year = selectedDate.getFullYear();
      const isToday = selectedDate.toDateString() === new Date().toDateString();
      return `${dayOfWeek}, ${day} ${month} ${year} г.${isToday ? ' (Сегодня)' : ''}`;
    } else if (viewMode === 'week') {
      const startDate = weekDays[0];
      const endDate = weekDays[6];
      return `${startDate.getDate()} ${russianMonthsGenitive[startDate.getMonth()]} - ${endDate.getDate()} ${russianMonthsGenitive[endDate.getMonth()]} ${endDate.getFullYear()} г.`;
    } else {
      return `${russianMonths[currentDate.getMonth()]} ${currentDate.getFullYear()} г.`;
    }
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentDate(today);
  };

  const groupTasksByTime = () => {
    const timeSlots = [
      '08:00', '09:00', '10:00', '11:00', 
      '12:00', '13:00', '14:00', '15:00', 
      '16:00', '17:00', '18:00', '19:00', 
      '20:00', '21:00', '22:00'
    ];
    
    const grouped: {[key: string]: Task[]} = {};
    
    timeSlots.forEach(slot => {
      grouped[slot] = [];
    });
    
    selectedDateTasks.forEach(task => {
      const taskTime = formatTimeFromDate(task.deadline);
      
      let closestSlot = timeSlots[0];
      let minDiff = Infinity;
      
      timeSlots.forEach(slot => {
        const [slotHour, slotMinute] = slot.split(':').map(Number);
        const [taskHour, taskMinute] = taskTime.split(':').map(Number);
        
        const slotTime = slotHour * 60 + slotMinute;
        const taskTimeInMinutes = taskHour * 60 + taskMinute;
        const diff = Math.abs(slotTime - taskTimeInMinutes);
        
        if (diff < minDiff) {
          minDiff = diff;
          closestSlot = slot;
        }
      });
      
      grouped[closestSlot].push(task);
    });
    
    return { grouped, timeSlots };
  };

  const { grouped: tasksByTime, timeSlots } = groupTasksByTime();

  return (
    <div className="min-h-full p-6 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-4">Календарь</h1>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'month'
                  ? 'bg-pink-600 text-white'
                  : 'bg-white text-pink-600 border-2 border-pink-200 hover:bg-pink-50'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'week'
                  ? 'bg-pink-600 text-white'
                  : 'bg-white text-pink-600 border-2 border-pink-200 hover:bg-pink-50'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'day'
                  ? 'bg-pink-600 text-white'
                  : 'bg-white text-pink-600 border-2 border-pink-200 hover:bg-pink-50'
              }`}
            >
              День
            </button>
          </div>

          <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md border-2 border-pink-200 mb-4">
            <button
              onClick={handlePrevPeriod}
              className="p-2 hover:bg-pink-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="text-pink-600" size={24} />
            </button>
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-bold">
                {getDisplayTitle()}
              </h2>
              <button
                onClick={goToToday}
                className="mt-1 text-sm font-medium"
              >
              </button>
            </div>
            <button
              onClick={handleNextPeriod}
              className="p-2 hover:bg-pink-50 rounded-lg transition-colors"
            >
              <ChevronRight className="text-pink-600" size={24} />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {viewMode === 'month' && (
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-pink-200">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {russianDaysShort.map(day => (
                    <div key={day} className="text-center font-semibold text-pink-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={index} className="aspect-square" />;
                    }
                    
                    const dayTasks = getTasksForDate(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedDate(day);
                          if (viewMode !== 'day') {
                            setViewMode('day');
                          }
                        }}
                        className={`aspect-square p-2 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'bg-pink-600 border-pink-600 text-white'
                            : isToday
                            ? 'bg-pink-100 border-pink-400 text-pink-700'
                            : dayTasks.length > 0
                            ? 'border-pink-200 hover:border-pink-400'
                            : 'border-gray-200 hover:border-pink-200'
                        }`}
                      >
                        <div className="text-sm font-semibold">{day.getDate()}</div>
                        {dayTasks.length > 0 && (
                          <div className="mt-1">
                            <div className={`w-2 h-2 rounded-full mx-auto ${
                              isSelected ? 'bg-white' : 'bg-pink-400'
                            }`} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === 'week' && (
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-pink-200">
                <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                  {weekDays.map((day, index) => {
                    const dayTasks = getTasksForDate(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    
                    return (
                      <div key={index} className="flex flex-col">
                        <button
                          onClick={() => {
                            setSelectedDate(day);
                            if (viewMode !== 'day') {
                              setViewMode('day');
                            }
                          }}
                          className={`p-3 rounded-lg border-2 transition-all mb-2 ${
                            isSelected
                              ? 'bg-pink-600 border-pink-600 text-white'
                              : isToday
                              ? 'bg-pink-100 border-pink-400 text-pink-700'
                              : 'border-pink-200 hover:border-pink-400'
                          }`}
                        >
                          <div className="text-xs font-semibold mb-1">
                            {russianDaysShort[day.getDay()]}
                          </div>
                          <div className="text-xl font-bold">{day.getDate()}</div>
                        </button>
                        
                        <div className="space-y-1 min-h-[200px]">
                          {sortTasksByTimeAndPriority(dayTasks).map(task => (
                            <div
                              key={task.id}
                              className={`p-2 rounded-lg border text-xs ${
                                task.completed
                                  ? 'bg-green-50 border-green-300'
                                  : 'bg-white border-pink-200'
                              }`}
                            >
                              <div className="flex items-start gap-1">
                                <button
                                  onClick={() => onTaskComplete(task.id)}
                                  className="flex-shrink-0 mt-0.5"
                                  disabled={task.completed}
                                >
                                  {task.completed ? (
                                    <CheckCircle2 className="text-green-600" size={14} />
                                  ) : (
                                    <Circle className="text-gray-400" size={14} />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`${task.completed ? 'line-through text-gray-500' : ''} break-words whitespace-normal`}>
                                    {task.text}
                                    {!!(task.is_skill && task.skill_duration && task.skill_duration > 1) && (
                                      <span className="text-pink-600 text-xs whitespace-nowrap">
                                        (день {task.day_number || 1} из {task.skill_duration})
                                      </span>
                                    )}
                                  </p>
                                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    <Clock size={10} className="flex-shrink-0" />
                                    <span className="truncate">{formatTimeFromDate(task.deadline)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === 'day' && (
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-pink-200">
                <div className="mb-6">
                  <h3 className="font-bold text-pink-700 text-xl mb-2">
                    {russianDaysLong[selectedDate.getDay()]}, {selectedDate.getDate()} {russianMonthsGenitive[selectedDate.getMonth()]} {selectedDate.getFullYear()} г.
                  </h3>
                </div>
                
                {selectedDateTasks.length === 0 ? (
                  <div className="text-center py-12 bg-pink-50 rounded-lg border-2 border-dashed border-pink-200">
                    <p className="text-gray-500 mb-2">Нет задач на этот день</p>
                    <p className="text-sm text-gray-400">Добавьте задачу, нажав кнопку "Добавить задачу" справа</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortTasksByTimeAndPriority(selectedDateTasks).map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onComplete={onTaskComplete}
                        onDelete={onDeleteTask}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-8">
                  <h4 className="font-bold text-pink-700 mb-4">Расписание дня</h4>
                  <div className="space-y-1">
                    {timeSlots.map(time => {
                      const tasksAtThisTime = tasksByTime[time];
                      
                      return (
                        <div key={time} className="flex items-start border-b border-pink-100 pb-2">
                          <div className="w-20 text-sm font-medium text-gray-600 py-2">{time}</div>
                          <div className="flex-1 min-h-12">
                            {sortTasksByTimeAndPriority(tasksAtThisTime).map(task => (
                              <div
                                key={task.id}
                                className={`mb-1 p-2 rounded border text-sm ${
                                  task.completed
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-pink-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onTaskComplete(task.id)}
                                    className="flex-shrink-0"
                                    disabled={task.completed}
                                  >
                                    {task.completed ? (
                                      <CheckCircle2 className="text-green-600" size={16} />
                                    ) : (
                                      <Circle className="text-gray-400" size={16} />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <span className={`${task.completed ? 'line-through text-gray-500' : ''}`}>
                                      {task.text}
                                      {!!(task.is_skill && task.skill_duration && task.skill_duration > 1) && (
                                        <span className="text-pink-600 text-xs ml-1">
                                          (день {task.day_number || 1} из {task.skill_duration})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-md border-2 border-pink-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-pink-700">
                  {selectedDate.getDate()} {russianMonthsGenitive[selectedDate.getMonth()]}
                </h3>
                <div className="text-sm text-gray-500">
                  {russianDaysShort[selectedDate.getDay()]}
                </div>
              </div>
              
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-4">Нет задач на этот день</p>
                  <div className="w-16 h-16 mx-auto bg-pink-100 rounded-full flex items-center justify-center mb-4">
                    <Plus className="text-pink-400" size={24} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto pr-2">
                  {sortTasksByTimeAndPriority(selectedDateTasks).map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onComplete={onTaskComplete}
                      onDelete={onDeleteTask}
                    />
                  ))}
                </div>
              )}

              <div className="border-t border-pink-100 pt-4">
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    Добавить задачу
                  </button>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      placeholder="Описание задачи..."
                      className="w-full px-3 py-2 border-2 border-pink-200 rounded-lg mb-2 focus:outline-none focus:border-pink-500 text-sm"
                      autoFocus
                    />

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">
                          Время
                        </label>
                        <input
                          type="time"
                          value={newTaskTime}
                          onChange={(e) => setNewTaskTime(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 mb-1">
                          Приоритет
                        </label>
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                          className="w-full px-3 py-2 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
                        >
                          <option value="low">Низкий</option>
                          <option value="medium">Средний</option>
                          <option value="high">Высокий</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="flex items-center gap-2 mb-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTaskIsSkill}
                          onChange={(e) => {
                            setNewTaskIsSkill(e.target.checked);
                            if (!e.target.checked) {
                              setNewTaskSkillDuration(1);
                            }
                          }}
                          className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700">Ежедневный навык</span>
                      </label>
                      
                      {newTaskIsSkill && (
                        <div className="ml-6 mt-1">
                          <label className="block text-xs text-gray-700 mb-1">
                            Длительность (дней)
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setNewTaskSkillDuration(prev => Math.max(1, prev - 1))}
                              className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 text-sm"
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
                              className="w-16 px-2 py-1 border-2 border-pink-200 rounded-lg focus:outline-none focus:border-pink-500 text-sm text-center"
                            />
                            <button
                              type="button"
                              onClick={() => setNewTaskSkillDuration(prev => Math.min(30, prev + 1))}
                              className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddTask}
                        className="flex-1 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition-colors text-sm font-semibold"
                      >
                        Добавить
                      </button>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm font-semibold"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {viewMode === 'day' && (
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-pink-200">
                <h4 className="font-bold text-pink-700 mb-3">Статистика дня</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Всего задач:</span>
                    <span className="font-bold text-pink-700">{selectedDateTasks.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Выполнено:</span>
                    <span className="font-bold text-green-600">
                      {selectedDateTasks.filter(t => t.completed).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Навыки:</span>
                    <span className="font-bold text-pink-600">
                      {selectedDateTasks.filter(t => t.is_skill).length}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-pink-100">
                    <div className="text-xs text-gray-500">
                      Прогресс выполнения:
                    </div>
                    <div className="w-full bg-pink-100 rounded-full h-2 mt-1">
                      <div 
                        className="bg-pink-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: selectedDateTasks.length > 0 
                            ? `${(selectedDateTasks.filter(t => t.completed).length / selectedDateTasks.length) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      {selectedDateTasks.filter(t => t.completed).length} из {selectedDateTasks.length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

function TaskItem({
  task,
  onComplete,
  onDelete,
}: TaskItemProps) {
  const getSkillDayInfo = () => {
    if (task.is_skill && task.skill_duration && task.skill_duration > 1) {
      const dayNum = task.day_number && task.day_number > 0 ? task.day_number : 1;
      return ` (день ${dayNum} из ${task.skill_duration})`;
    }
    return '';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div
      className={`rounded-lg p-3 border-2 transition-all text-sm ${
        task.completed
          ? 'bg-green-50 border-green-300'
          : 'border-pink-100 hover:border-pink-200'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => onComplete(task.id)}
          className="flex-shrink-0"
          disabled={task.completed}
        >
          {task.completed ? (
            <CheckCircle2 className="text-green-600" size={18} />
          ) : (
            <Circle className="text-gray-400 hover:text-pink-600 transition-colors" size={18} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-sm ${
              task.completed
                ? 'line-through text-gray-500'
                : 'text-gray-800'
            }`}
          >
            {task.text}{getSkillDayInfo()}
          </p>
          
          <div className="mt-1 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColorClass(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={12} />
              {formatTime(task.deadline)}
            </span>
            {!!(task.is_skill && task.skill_duration && task.skill_duration > 1) && (
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                Навык
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}