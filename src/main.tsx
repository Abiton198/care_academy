import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 1. Render the App
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

// 2. Service Worker Registration & Auto-Update Logic
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Check for updates every time the app comes to the foreground
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (
                installingWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // This executes when the new Git push is downloaded and ready
                console.log("New content available; please refresh.");
                if (window.confirm("Care Academy has been updated! Would you like to refresh to see the latest version?")) {
                  window.location.reload();
                }
              }
            };
          }
        };
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}