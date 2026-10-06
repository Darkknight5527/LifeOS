import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Content-Security-Policy for the built site: only our own code runs, and
// data can only be sent to our own API. (Not in dev — Vite's dev server
// needs inline scripts and a websocket.)
function csp(apiUrl) {
  let apiOrigin = "";
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    /* no API URL set */
  }
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin}`.trim(),
    "media-src 'self' blob:",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  return {
    name: "lifeos-csp",
    apply: "build",
    transformIndexHtml: (html) =>
      html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />\n    <meta name="referrer" content="no-referrer" />`),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), csp(env.VITE_API_URL || process.env.VITE_API_URL || "http://localhost:4000/api")],
  };
});
