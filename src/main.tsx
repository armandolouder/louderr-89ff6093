import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (new URLSearchParams(window.location.search).has("cache-reset")) {
  const url = new URL(window.location.href);
  url.searchParams.delete("cache-reset");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

// Remove Service Workers antigos e TODO cache que prende o painel numa versão velha.
if ("serviceWorker" in navigator) {
  const resetKey = "louder-cache-reset-2026-06-25";

  (async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.allSettled(cacheNames.map((name) => caches.delete(name)));
    }

    const hadStale = registrations.length > 0;
    if (hadStale && !sessionStorage.getItem(resetKey)) {
      sessionStorage.setItem(resetKey, "done");
      window.location.reload();
    }
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
