import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (new URLSearchParams(window.location.search).has("cache-reset")) {
  const url = new URL(window.location.href);
  url.searchParams.delete("cache-reset");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

// Remove Service Workers/cache antigos e força 1 recarga quando mudamos renderização crítica.
// Isso evita o painel carregar bundles antigos no Lovable/PWA após deploys.
const appVersionKey = "louder-app-version";
const appVersion = "2026-06-29-email-preview-v2";
const shouldReloadForVersion = localStorage.getItem(appVersionKey) !== appVersion;

if ("serviceWorker" in navigator || shouldReloadForVersion) {
  const resetKey = `louder-cache-reset-${appVersion}`;

  (async () => {
    const registrations = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    await Promise.allSettled(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.allSettled(cacheNames.map((name) => caches.delete(name)));
    }

    if (shouldReloadForVersion) {
      localStorage.setItem(appVersionKey, appVersion);
    }

    const hadStale = registrations.length > 0;
    if ((hadStale || shouldReloadForVersion) && !sessionStorage.getItem(resetKey)) {
      sessionStorage.setItem(resetKey, "done");
      window.location.reload();
    }
  })();
}

createRoot(document.getElementById("root")!).render(<App />);
