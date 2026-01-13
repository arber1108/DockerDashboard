"use client";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { socket } from "../socket";
import { useState } from "react";
import { useEffect } from "react";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connectToClient", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new-container", (arg) => {
      console.log(arg);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <div>
      <h1 className="flex justify-start ml-5 pt-5 text-6xl">
        Docker Dashboard
      </h1>
      <div>
        <p>Status: {isConnected ? "connected" : "disconnected"}</p>
      </div>
      <div className="flex flex-row gap-3 pt-5 m-5">
        <div className="w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Container Titel</CardTitle>
              <CardDescription>Image</CardDescription>
              <CardAction>Manage Container</CardAction>
            </CardHeader>
            <CardContent>
              <p>Status</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
