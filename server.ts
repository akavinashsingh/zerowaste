import { createServer } from "http";
import { parse } from "url";

import next from "next";
import { Server } from "socket.io";

import { setIO } from "./lib/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
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
