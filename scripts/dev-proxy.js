#!/usr/bin/env node

/**
 * Dev proxy entry point used to run the frontend and Payload backend behind a single
 * origin for the standard Docker Compose workflow (not the Caddy stack), routing
 * `/admin` + `/api` traffic to port 3001 and everything else to the Next.js dev server
 * on port 3000. Caddy can be run in parallel for HTTPS and other proxying needs (but it
 * does not execute this script).
 *
 * NOTE: This stays plain CommonJS so `node scripts/dev-proxy.js` works without
 * requiring ts-node/tsx. The proxy acts as a zero-dependency bootstrap for
 * local development, so avoiding a TypeScript runtime keeps startup friction low.
 */

const http = require("http");
const httpProxy = require("http-proxy");

// Create proxy server
const proxy = httpProxy.createProxyServer({});

// Create server
const server = http.createServer((req, res) => {
  const { url } = req;

  // Route admin and API to backend (port 3001)
  if (url.startsWith("/admin") || url.startsWith("/api/")) {
    proxy.web(req, res, {
      target: "http://localhost:3001",
      changeOrigin: true,
    });
  }
  // Route everything else to frontend (port 3000)
  else {
    proxy.web(req, res, {
      target: "http://localhost:3000",
      changeOrigin: true,
    });
  }
});

// Handle WebSocket connections for Next.js dev server
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, {
    target: "http://localhost:3000",
    ws: true,
  });
});

// Start proxy on port 8082
server.listen(8082, () => {
  console.info("🚀 Local development proxy running on http://localhost:8082");
  console.info("📝 Admin available at: http://localhost:8082/admin");
  console.info("🌐 Frontend available at: http://localhost:8082/");
});
