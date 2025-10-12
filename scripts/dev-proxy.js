#!/usr/bin/env node

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
  console.log("🚀 Local development proxy running on http://localhost:8082");
  console.log("📝 Admin available at: http://localhost:8082/admin");
  console.log("🌐 Frontend available at: http://localhost:8082/");
});
