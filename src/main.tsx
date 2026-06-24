import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove Service Workers antigos que podem manter o painel preso em uma versão velha.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations
      .filter((registration) => {
        const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || "";
        return scriptUrl.endsWith("/sw.js") || scriptUrl.endsWith("/service-worker.js");
      })
      .forEach((registration) => registration.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
