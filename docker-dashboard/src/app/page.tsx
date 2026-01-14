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
  const [containerObject, setContainerObject] = useState([]);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onNewContainer(newContainer) {
      setContainerObject((prev) => [...prev, newContainer]);
    }

    socket.on("connectToClient", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new-container", (arg) => {
      onNewContainer(arg);
    });

    socket.on("initial-containers", (arg) => {
      setContainerObject(arg);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new-container");
      socket.off("initial-containers");
    };
  }, []);

  console.log("Containerobject: ", containerObject);

  return (
    <div className="flex flex-col min-h-screen">
      <h1 className="ml-5 pt-5 text-6xl font-bold">Docker Dashboard</h1>
      <p className="ml-6 pt-2">
        Status:{" "}
        <span className={isConnected ? "text-green-500" : "text-red-500"}>
          {isConnected ? "connected" : "disconnected"}
        </span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-5">
        {containerObject.map((container) => (
          <Card key={container.Id} className="w-full">
            {" "}
            <CardHeader>
              <CardTitle className="truncate">{container.Name}</CardTitle>
              <CardDescription className="truncate">
                {container.Image}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono bg-slate-100 p-2 rounded">
                {container.Status}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
