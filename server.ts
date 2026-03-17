import { createServer } from "http";
import { parse } from "url";

import next from "next";
import { Server } from "socket.io";

import { setIO } from "./lib/socket";

const dev = process.env.NODE_ENV !== "production";
// Render (and most PaaS) require binding to 0.0.0.0, not localhost
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Lock Socket.IO CORS to the deployment origin in production.
// NEXTAUTH_URL is always the canonical public URL of the app.
const allowedOrigin = process.env.NEXTAUTH_URL ?? (dev ? "http://localhost:3000" : undefined);

void app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin ?? false,
      methods: ["GET", "POST"],
    },
  });

  setIO(io);

  io.on("connection", (socket) => {
    socket.on("join", (userId: unknown) => {
      // Validate the userId to prevent joining arbitrary rooms
      if (typeof userId === "string" && userId.length > 0 && userId.length <= 100) {
        void socket.join(userId);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${dev ? "development" : "production"}\n`);
  });
});
