// Service worker : affiche la notification « commande prête » envoyée par le serveur, même page fermée.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Commande prête', {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/' },
      icon: '/favicon.svg',
      vibrate: [200, 100, 200],
    }),
  );
});

// Un toucher sur la notification rouvre la page de la table (ou l'onglet déjà ouvert).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname === url);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
