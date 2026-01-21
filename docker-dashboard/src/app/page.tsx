"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { socket } from "../socket";
import { useState } from "react";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { io } from "socket.io-client";

interface Container {
  Id: string;
  Name: string;
  Image: string;
  Status: string;
}

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [containerObject, setContainerObject] = useState<Container[]>([]);
  const [saveStats, setSaveStats] = useState(false);

  function saveToDB() {
    const newValue = !saveStats;
    setSaveStats(newValue);
    socket.emit("saveStats", newValue);
  }
  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
      socket.emit("request-containers");
    }

    function onConnect() {
      setIsConnected(true);
      socket.emit("request-containers");
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("connectToClient", () => setIsConnected(true));
    socket.on("disconnect", onDisconnect);
    socket.on("new-container", (arg) => {
      setContainerObject((prev) => [...prev, arg]);
    });
    socket.on("container-deleted", (arg) => {
      setContainerObject((prev) => prev.filter((c) => c.Id !== arg));
    });
    socket.on("initial-containers", (arg) => {
      setContainerObject(arg);
    });
    socket.on("status-change", (arg) => {
      setContainerObject((prev) =>
        prev.map((item) =>
          item.Id === arg.Id ? { ...item, Status: arg.Status } : item,
        ),
      );
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("connectToClient");
      socket.off("disconnect", onDisconnect);
      socket.off("new-container");
      socket.off("initial-containers");
      socket.off("container-deleted");
      socket.off("status-change");
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <h1 className="ml-5 pt-5 text-6xl font-bold">Docker Dashboard</h1>

      <div className="flex justify-between">
        <p className="ml-6 pt-2">
          Status:{" "}
          <span className={isConnected ? "text-green-500" : "text-red-500"}>
            {isConnected ? "connected" : "disconnected"}
          </span>
        </p>
        <div className="mr-5">
          {saveStats ? (
            <Button variant="outline" onClick={() => saveToDB()}>
              Stop saving to DB
            </Button>
          ) : (
            <Button variant="outline" onClick={() => saveToDB()}>
              Start saving to DB
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-5">
        {containerObject.map((container) => (
          <Card key={container.Id} className="w-full border-cyan-200">
            {" "}
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle className="truncate">{container.Name} </CardTitle>
                {/*TODO: Add Hover animation*/}
                <a href={`/containers/${container.Id}`}>
                  <Settings></Settings>
                </a>
              </div>
              <CardDescription className="truncate">
                {container.Image}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2.5">
                <Badge
                  variant="outline"
                  className={
                    container.Status === "running"
                      ? "border-emerald-500 text-emerald-500"
                      : container.Status === "exited"
                        ? "border-rose-500 text-rose-500"
                        : container.Status === "paused"
                          ? "border-yellow-500 text-yellow-500"
                          : "border-slate-500"
                  }
                >
                  {container.Status}
                </Badge>

                <p className="text-[0.7em] pt-[0.190rem]">ID: {container.Id}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
