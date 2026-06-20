// hooks/push.ts
import { useEffect, useRef } from 'react';
import { NotificationService } from '../services/push.service';
import type { Task } from '../types';

export const useNotifications = (tasks: Task[]) => {
  const notificationService = NotificationService.getInstance();
  const scheduledTasksRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const granted = await notificationService.requestPermission();
      
      if (!granted) {
        console.log('🔕 Уведомления не разрешены');
        return;
      }

      // Восстанавливаем таймеры
      notificationService.restoreReminders(tasks);
      scheduleReminders();
    };

    const scheduleReminders = () => {
      const now = Date.now();
      
      tasks.forEach(task => {
        if (task.completed) {
          if (scheduledTasksRef.current.has(task.id)) {
            notificationService.cancelReminder(task.id);
            scheduledTasksRef.current.delete(task.id);
          }
          return;
        }

        const deadlineTime = new Date(task.deadline).getTime();
        
        // Пропускаем невалидные даты
        if (isNaN(deadlineTime)) {
          return;
        }

        const reminderTime = deadlineTime - 30 * 60 * 1000;
        
        if (deadlineTime <= now) {
          if (scheduledTasksRef.current.has(task.id)) {
            notificationService.cancelReminder(task.id);
            scheduledTasksRef.current.delete(task.id);
          }
          return;
        }

        // Если напоминание должно быть сейчас
        if (reminderTime <= now && !scheduledTasksRef.current.has(task.id)) {
          const minutesLeft = Math.round((deadlineTime - now) / 60000);
          if (minutesLeft > 0 && minutesLeft <= 60) {
            console.log(`🔔 Срочное уведомление для "${task.text}" (${minutesLeft} мин)`);
            notificationService.showNotification(
              '⏰ Срочно! Задача скоро закончится!',
              {
                body: `Задача "${task.text}" должна быть выполнена через ${minutesLeft} минут!`,
                tag: `task-${task.id}`,
                data: { taskId: task.id, url: '/' }
              }
            );
            scheduledTasksRef.current.add(task.id);
          }
          return;
        }

        // Планируем напоминание
        if (!scheduledTasksRef.current.has(task.id) && reminderTime > now) {
          console.log(`📅 Планируем напоминание для "${task.text}"`);
          notificationService.scheduleTaskReminder(task);
          scheduledTasksRef.current.add(task.id);
        }
        
        if (reminderTime <= now) {
          scheduledTasksRef.current.delete(task.id);
        }
      });
    };

    init();

    const interval = setInterval(scheduleReminders, 30000);

    return () => {
      clearInterval(interval);
      scheduledTasksRef.current.forEach(taskId => {
        notificationService.cancelReminder(taskId);
      });
      scheduledTasksRef.current.clear();
    };
  }, [tasks]);
};