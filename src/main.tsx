import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove any old Service Worker / PWA cache that may be serving stale (old) pages.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
  if ("caches" in window) {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
