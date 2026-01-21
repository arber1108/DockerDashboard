"use client";

import { io } from "socket.io-client";

export const socket = io({
  transports: ["websocket", "polling"], // Prefer WebSocket
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000,
});

socket.on("connect", () => console.log("Socket connected:", socket.id));
socket.on("disconnect", (reason) =>
  console.log("Socket disconnected:", reason),
);
socket.on("connect_error", (err) =>
  console.log("Socket connect error:", err.message),
);
