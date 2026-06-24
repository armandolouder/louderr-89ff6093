import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove Service Workers antigos que podem manter o painel preso em uma versão velha.
if ("serviceWorker" in navigator) {
  const resetKey = "louder-cache-reset-2026-06-24";

  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    const staleRegistrations = registrations.filter((registration) => {
      const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || "";
      return scriptUrl.endsWith("/sw.js") || scriptUrl.endsWith("/service-worker.js");
    });

    if (staleRegistrations.length === 0) return;

    await Promise.allSettled(staleRegistrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.allSettled(
        cacheNames
          .filter((name) => /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name))
          .map((name) => caches.delete(name)),
      );
    }

    if (!sessionStorage.getItem(resetKey)) {
      sessionStorage.setItem(resetKey, "done");
      window.location.reload();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
