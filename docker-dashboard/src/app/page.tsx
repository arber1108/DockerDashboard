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
  const [containerObject, setContainerObject] = useState();

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onNewContainer(containerObject) {
      setContainerObject(containerObject);
    }

    socket.on("connectToClient", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new-container", (arg) => {
      console.log(arg);
      onNewContainer(arg);
    });

    socket.on("initial-containers", (arg) => {
      console.log(arg);
      setContainerObject(arg);
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
        {containerObject && (
          <div className="w-xl">
            <Card>
              <CardHeader>
                <CardTitle>{containerObject.Name}</CardTitle>
                <CardDescription>{containerObject.Image}</CardDescription>
                <CardAction>Manage Container</CardAction>
              </CardHeader>
              <CardContent>
                <p>{containerObject.Status}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
