import { useEffect, useRef } from 'react';
import { NotificationService } from '../services/push.service';
import type { Task } from '../types';

export const useNotifications = (tasks: Task[]) => {
  const notificationService = NotificationService.getInstance();
  const scheduledTasksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Запрашиваем разрешение при загрузке
    notificationService.requestPermission();

    // Функция для проверки и планирования уведомлений
    const scheduleReminders = () => {
      const now = Date.now();
      
      tasks.forEach(task => {
        if (task.completed) {
          // Если задача выполнена, отменяем напоминание
          if (scheduledTasksRef.current.has(task.id)) {
            notificationService.cancelReminder(task.id);
            scheduledTasksRef.current.delete(task.id);
          }
          return;
        }

        const deadlineTime = new Date(task.deadline).getTime();
        const reminderTime = deadlineTime - 30 * 60 * 1000;
        
        // Планируем напоминание только если оно еще не запланировано и время не прошло
        if (!scheduledTasksRef.current.has(task.id) && reminderTime > now) {
          notificationService.scheduleTaskReminder(task);
          scheduledTasksRef.current.add(task.id);
        }
        
        // Если время напоминания уже прошло, удаляем из отслеживаемых
        if (reminderTime <= now) {
          scheduledTasksRef.current.delete(task.id);
        }
      });
    };

    scheduleReminders();

    // Перепланируем при изменении задач
    const interval = setInterval(scheduleReminders, 60000); // Проверяем каждую минуту

    return () => {
      clearInterval(interval);
      // Очищаем все таймеры при размонтировании
      scheduledTasksRef.current.forEach(taskId => {
        notificationService.cancelReminder(taskId);
      });
    };
  }, [tasks]);
};