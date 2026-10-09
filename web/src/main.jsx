import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { wakeServer } from "./api";
import { sendToApp } from "./lib/inApp.js";
import { registerServiceWorker } from "./lib/sw.js";
// Fonts bundled with the app (no request to Google Fonts). Outfit is one
// variable font file that covers every weight.
import "@fontsource-variable/outfit";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";
import "./index.css";

// The free server sleeps when idle and takes a while to wake: nudge it now,
// while the page is still drawing, so it's ready by the time data is needed.
wakeServer();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Tell the Android app the page has drawn, so it can drop its loading screen.
requestAnimationFrame(() => requestAnimationFrame(() => sendToApp("ready")));
setTimeout(() => {
  try {
    sessionStorage.removeItem("lifeos-chunk-reload");
  } catch {
    /* ignore */
  }
}, 5000);

registerServiceWorker();
