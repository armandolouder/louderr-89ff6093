// Limpador de emergência para instalações antigas do PWA.
// Algumas versões antigas carregavam /registerSW.js antes do app abrir;
// este arquivo usa esse mesmo caminho para remover o service worker velho.
(async () => {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      const appCacheNames = cacheNames.filter((name) =>
        /workbox|precache|runtime|googleAnalytics|vite|pwa|louder/i.test(name),
      );
      await Promise.allSettled(appCacheNames.map((name) => caches.delete(name)));
    }
  } finally {
    if (!sessionStorage.getItem("louder-register-sw-cleaned")) {
      sessionStorage.setItem("louder-register-sw-cleaned", "1");
      window.location.reload();
    }
  }
})();