// services/push.service.ts
export class NotificationService {
  private static instance: NotificationService;
  private permissionGranted = false;
  private timers: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Этот браузер не поддерживает уведомления');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    }

    return false;
  }

  showNotification(title: string, options?: NotificationOptions) {
    if (!this.permissionGranted && Notification.permission === 'granted') {
      this.permissionGranted = true;
    }

    if (!this.permissionGranted) {
      console.log('Уведомления не разрешены');
      return;
    }

    try {
      // Проверяем, что документ видим (страница открыта)
      if (document.hidden) {
        // Если страница скрыта, используем Service Worker
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
              ...options,
              icon: options?.icon || '/icons/icon-192.png',
              badge: options?.badge || '/icons/icon-192.png',
              vibrate: [200, 100, 200],
              requireInteraction: true,
              data: options?.data || {}
            });
          }).catch(err => {
            console.error('SW notification failed:', err);
            // Fallback
            new Notification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      } else {
        // Если страница открыта, показываем обычное уведомление
        const notification = new Notification(title, {
          ...options,
          icon: options?.icon || '/icons/icon-192.png',
          badge: options?.badge || '/icons/icon-192.png'
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  scheduleTaskReminder(task: { id: string; text: string; deadline: string; priority: string }) {
    const deadlineTime = new Date(task.deadline).getTime();
    const now = Date.now();
    const reminderTime = deadlineTime - 30 * 60 * 1000;

    // Если время напоминания уже прошло
    if (reminderTime <= now) {
      console.log(`⏰ Время напоминания для задачи "${task.text}" уже прошло`);
      
      // Если задача еще не просрочена, показываем уведомление сразу
      if (deadlineTime > now) {
        const minutesLeft = Math.round((deadlineTime - now) / 60000);
        this.showNotification(
          '⏰ Срочно! Задача скоро закончится!',
          {
            body: `Задача "${task.text}" должна быть выполнена через ${minutesLeft} минут!`,
            tag: `task-${task.id}`,
            data: { taskId: task.id, url: '/' }
          }
        );
      }
      return;
    }

    const delay = reminderTime - now;
    console.log(`📅 Напоминание для "${task.text}" через ${Math.round(delay / 60000)} минут`);

    const timeoutId = window.setTimeout(() => {
      this.showNotification(
        '⏰ Напоминание о задаче!',
        {
          body: `Задача "${task.text}" должна быть выполнена через 30 минут`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `task-${task.id}`,
          data: { taskId: task.id, url: '/' },
          requireInteraction: true
        }
      );
    }, delay);

    // Сохраняем таймер
    this.timers.set(task.id, timeoutId);
    this.saveScheduledReminder(task.id, timeoutId);
  }

  private saveScheduledReminder(taskId: string, timeoutId: number) {
    try {
      const reminders = JSON.parse(localStorage.getItem('scheduledReminders') || '{}');
      reminders[taskId] = timeoutId;
      localStorage.setItem('scheduledReminders', JSON.stringify(reminders));
    } catch (error) {
      console.error('Failed to save reminder:', error);
    }
  }

  cancelReminder(taskId: string) {
    // Отменяем таймер в памяти
    if (this.timers.has(taskId)) {
      clearTimeout(this.timers.get(taskId)!);
      this.timers.delete(taskId);
    }

    // Отменяем таймер из localStorage
    try {
      const reminders = JSON.parse(localStorage.getItem('scheduledReminders') || '{}');
      if (reminders[taskId]) {
        clearTimeout(reminders[taskId]);
        delete reminders[taskId];
        localStorage.setItem('scheduledReminders', JSON.stringify(reminders));
        console.log(`❌ Напоминание для задачи ${taskId} отменено`);
      }
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
    }
  }

  // Восстанавливаем таймеры после перезагрузки страницы
  restoreReminders(tasks: { id: string; text: string; deadline: string; priority: string }[]) {
    try {
      const reminders = JSON.parse(localStorage.getItem('scheduledReminders') || '{}');
      const now = Date.now();

      Object.entries(reminders).forEach(([taskId, timeoutId]) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.completed) {
          this.cancelReminder(taskId);
          return;
        }

        const deadlineTime = new Date(task.deadline).getTime();
        const reminderTime = deadlineTime - 30 * 60 * 1000;

        if (reminderTime > now) {
          // Пересоздаем таймер
          this.scheduleTaskReminder(task);
        } else {
          // Удаляем просроченный
          this.cancelReminder(taskId);
        }
      });
    } catch (error) {
      console.error('Failed to restore reminders:', error);
    }
  }
}