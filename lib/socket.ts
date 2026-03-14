import type { Server } from "socket.io";

declare global {
  var _socketIO: Server | undefined;
}

export function setIO(io: Server): void {
  global._socketIO = io;
}

export function getIO(): Server | undefined {
  return global._socketIO;
}
