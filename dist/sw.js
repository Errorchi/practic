// public/sw.js
self.addEventListener('install', event => {
  console.log('Service Worker установлен');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker активирован');
  event.waitUntil(clients.claim());
});

// Обработка push-уведомлений
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Напоминание о задаче!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: '📋 Открыть' },
      { action: 'complete', title: '✅ Выполнить' }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '⏰ Напоминание', options)
  );
});

// Обработка кликов по уведомлению
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const taskId = event.notification.data?.taskId;
  
  if (event.action === 'complete' && taskId) {
    // Отправляем запрос на выполнение задачи
    event.waitUntil(
      fetch('/api/tasks/complete', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: taskId, user_id: 1 }) // TODO: получить user_id
      })
      .then(response => response.json())
      .then(data => {
        console.log('Задача выполнена:', data);
      })
      .catch(err => {
        console.error('Ошибка выполнения задачи:', err);
      })
    );
  }
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});