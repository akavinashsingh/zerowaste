"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

export function useSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const socketInstance = io({ reconnectionAttempts: 5 });
    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      socketInstance.emit("join", userId);
      setConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
    });

    socketInstance.on("reconnect", () => {
      socketInstance.emit("join", userId);
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [session?.user?.id]);

  // Return the ref object so consumers access socketRef.current inside their own effects
  return { socketRef, connected };
}
