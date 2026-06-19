export const russianMonths = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
];

export const russianMonthsGenitive = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

export const russianDaysShort = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const russianDaysLong = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export const formatTimeFromDate = (dateString: string): string => {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDate = (date: Date): string => {
  const day = date.getDate();
  const month = russianMonths[date.getMonth()];
  const year = date.getFullYear();
  const dayOfWeek = russianDaysLong[date.getDay()];
  return `${dayOfWeek}, ${day} ${month} ${year} г.`;
};

export const getPriorityColorClass = (priority: string): string => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low': return 'bg-green-100 text-green-800 border-green-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'high': return 'высокий';
    case 'medium': return 'средний';
    case 'low': return 'низкий';
    default: return priority;
  }
};

export const getDaysInMonth = (date: Date): (Date | null)[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  const startingDayOfWeek = firstDay.getDay();
  const offset = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  const days: (Date | null)[] = [];
  
  for (let i = 0; i < offset; i++) {
    days.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
};

export const getWeekDays = (date: Date): Date[] => {
  const currentDay = date.getDay();
  const startOfWeek = new Date(date);
  const dayOffset = currentDay === 0 ? 6 : currentDay - 1;
  startOfWeek.setDate(date.getDate() - dayOffset);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

export const sortTasksByTimeAndPriority = <T extends { deadline: string; priority: 'low' | 'medium' | 'high' }>(tasks: T[]): T[] => {
  return [...tasks].sort((a, b) => {
    const timeA = new Date(a.deadline).getTime();
    const timeB = new Date(b.deadline).getTime();
    
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};