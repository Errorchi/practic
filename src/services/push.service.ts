// services/push.service.ts
export class NotificationService {
  private static instance: NotificationService;
  private permissionGranted = false;
  private timers: Map<string, number> = new Map();
  private swReady = false;

  private constructor() {
    // Проверяем Service Worker при создании
    this.checkServiceWorker();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async checkServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          this.swReady = true;
          console.log('✅ Service Worker найден');
        } else {
          console.log('⚠️ Service Worker не зарегистрирован');
        }
      }
    } catch (error) {
      console.error('Ошибка проверки SW:', error);
    }
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
      console.log('🔕 Уведомления не разрешены');
      return;
    }

    try {
      // Всегда используем обычное уведомление (более надежно)
      const notification = new Notification(title, {
        ...options,
        icon: options?.icon || '/icons/icon-192.png',
        badge: options?.badge || '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        silent: false,
        tag: options?.tag || `notification-${Date.now()}`
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };

      notification.onshow = () => {
        console.log('✅ Уведомление показано:', title);
      };

      notification.onerror = (error) => {
        console.error('❌ Ошибка показа уведомления:', error);
      };

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  scheduleTaskReminder(task: { id: string; text: string; deadline: string; priority: string }) {
    const deadlineTime = new Date(task.deadline).getTime();
    const now = Date.now();
    const reminderTime = deadlineTime - 30 * 60 * 1000;

    if (isNaN(deadlineTime)) {
      console.error('❌ Невалидная дата задачи:', task);
      return;
    }

    console.log(`📅 Задача "${task.text}" deadline: ${new Date(deadlineTime).toLocaleString()}`);
    console.log(`📅 Сейчас: ${new Date(now).toLocaleString()}`);
    console.log(`📅 Напоминание в: ${new Date(reminderTime).toLocaleString()}`);

    if (reminderTime <= now) {
      console.log(`⏰ Время напоминания для задачи "${task.text}" уже прошло`);
      
      if (deadlineTime > now) {
        const minutesLeft = Math.round((deadlineTime - now) / 60000);
        if (minutesLeft > 0 && minutesLeft <= 60) {
          console.log(`🔔 Показываем срочное уведомление: ${minutesLeft} минут до дедлайна`);
          this.showNotification(
            '⏰ Срочно! Задача скоро закончится!',
            {
              body: `Задача "${task.text}" должна быть выполнена через ${minutesLeft} минут!`,
              tag: `task-${task.id}`,
              data: { taskId: task.id, url: '/' }
            }
          );
        }
      }
      return;
    }

    const delay = reminderTime - now;
    const minutesDelay = Math.round(delay / 60000);
    console.log(`📅 Напоминание для "${task.text}" через ${minutesDelay} минут (в ${new Date(reminderTime).toLocaleString()})`);

    // ✅ УБИРАЕМ ПРОВЕРКУ НА 24 ЧАСА
    // Теперь планируем ВСЕ напоминания, независимо от времени

    // Для очень долгих напоминаний (> 30 дней) используем другой подход
    if (delay > 30 * 24 * 60 * 60 * 1000) {
      console.log(`📅 Напоминание через ${Math.round(delay / (24 * 60 * 60 * 1000))} дней, сохраняем в localStorage`);
      // Сохраняем в localStorage, чтобы восстановить позже
      this.saveScheduledReminder(task.id, -1); // -1 означает "долгосрочное"
      return;
    }

    const timeoutId = window.setTimeout(() => {
      console.log(`🔔 ОТПРАВКА УВЕДОМЛЕНИЯ для задачи "${task.text}"`);
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
    if (this.timers.has(taskId)) {
      clearTimeout(this.timers.get(taskId)!);
      this.timers.delete(taskId);
    }

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

  restoreReminders(tasks: { id: string; text: string; deadline: string; priority: string }[]) {
    try {
      const reminders = JSON.parse(localStorage.getItem('scheduledReminders') || '{}');
      const now = Date.now();

      Object.entries(reminders).forEach(([taskId, timeoutId]) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
          this.cancelReminder(taskId);
          return;
        }

        const deadlineTime = new Date(task.deadline).getTime();
        const reminderTime = deadlineTime - 30 * 60 * 1000;

        if (reminderTime > now && !task.completed) {
          this.scheduleTaskReminder(task);
        } else {
          this.cancelReminder(taskId);
        }
      });
    } catch (error) {
      console.error('Failed to restore reminders:', error);
    }
  }

  // Тестовая функция для проверки уведомлений
  testNotification() {
    console.log('🔔 Тестовое уведомление');
    this.showNotification('🔔 Тестовое уведомление!', {
      body: 'Если вы видите это - уведомления работают!',
      icon: '/icons/icon-192.png',
      requireInteraction: true
    });
  }
}