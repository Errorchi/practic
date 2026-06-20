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

      // Запрашиваем разрешение
      const granted = await notificationService.requestPermission();
      
      if (!granted) {
        console.log('🔕 Уведомления не разрешены');
        return;
      }

      console.log('✅ Уведомления разрешены');

      // Восстанавливаем таймеры после перезагрузки
      notificationService.restoreReminders(tasks);

      // Планируем напоминания
      scheduleReminders();
    };

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
        
        // Если задача уже просрочена
        if (deadlineTime <= now) {
          if (scheduledTasksRef.current.has(task.id)) {
            notificationService.cancelReminder(task.id);
            scheduledTasksRef.current.delete(task.id);
          }
          return;
        }

        // Если время напоминания уже прошло, но задача не выполнена
        if (reminderTime <= now && !scheduledTasksRef.current.has(task.id)) {
          const minutesLeft = Math.round((deadlineTime - now) / 60000);
          if (minutesLeft > 0) {
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
          notificationService.scheduleTaskReminder(task);
          scheduledTasksRef.current.add(task.id);
        }
        
        // Если время напоминания уже прошло, удаляем из отслеживаемых
        if (reminderTime <= now) {
          scheduledTasksRef.current.delete(task.id);
        }
      });
    };

    init();

    // Проверяем каждые 30 секунд
    const interval = setInterval(scheduleReminders, 30000);

    return () => {
      clearInterval(interval);
      // Очищаем все таймеры при размонтировании
      scheduledTasksRef.current.forEach(taskId => {
        notificationService.cancelReminder(taskId);
      });
      scheduledTasksRef.current.clear();
    };
  }, [tasks]);
};