importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBpGNrt_QY1msTtYBIKyYw8sc-0YSc7qlM',
  authDomain: 'hammadtools-3243d.firebaseapp.com',
  projectId: 'hammadtools-3243d',
  messagingSenderId: '401018030777',
  appId: '1:401018030777:web:c82896d463db5ca69fa968',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'New Notification';
  const options = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/favicon.png',
    image: payload.notification?.image,
    data: {
      link: payload?.data?.link || '/dashboard',
    },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.navigate(link);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(link);
        }

        return undefined;
      })
  );
});

