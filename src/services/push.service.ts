export class NotificationService {
  private static instance: NotificationService;
  private permissionGranted = false;

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

    if (this.permissionGranted) {
      // Для PWA на мобильных устройствах
      if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, options);
        });
      } else {
        // Fallback для обычных браузеров
        new Notification(title, options);
      }
    }
  }

    scheduleTaskReminder(task: { id: string; text: string; deadline: string; priority: string }) {
    const deadlineTime = new Date(task.deadline).getTime();
    const now = Date.now();
    const reminderTime = deadlineTime - 30 * 60 * 1000;

    if (reminderTime > now) {
        const delay = reminderTime - now;
        
        const timeoutId = window.setTimeout(() => {
        const notificationOptions: NotificationOptions = {
            body: `"${task.text}" должна быть выполнена через 30 минут`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: `task-${task.id}`,
            data: {
            taskId: task.id,
            url: '/'
            }
        };

        this.showNotification(`⏰ Напоминание о задаче!`, notificationOptions);
        }, delay);

        this.saveScheduledReminder(task.id, timeoutId);
    }
    }

  private saveScheduledReminder(taskId: string, timeoutId: number) {
    const reminders = JSON.parse(localStorage.getItem('scheduledReminders') || '{}');
    reminders[taskId] = timeoutId;
    localStorage.setItem('scheduledReminders', JSON.stringify(reminders));
  }

  cancelReminder(taskId: string) {
    const reminders = JSON.parse(localStorage.getItem('scheduledReminders') || '{}');
    if (reminders[taskId]) {
      clearTimeout(reminders[taskId]);
      delete reminders[taskId];
      localStorage.setItem('scheduledReminders', JSON.stringify(reminders));
    }
  }
}