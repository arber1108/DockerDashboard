"use client";

import { useState, useEffect } from "react";
import { socket } from "../../socket";
import { columns, Image } from "./columns";
import { DataTable } from "./data-table";

export default function ImagesPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
      socket.emit("request-images");
    }

    function onConnect() {
      setIsConnected(true);
      socket.emit("request-images");
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("connectToClient", () => setIsConnected(true));
    socket.on("disconnect", onDisconnect);
    socket.on("initial-images", (data: Image[]) => {
      setImages(data);
    });
    socket.on("images-updated", (data: Image[]) => {
      setImages(data);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("connectToClient");
      socket.off("disconnect", onDisconnect);
      socket.off("initial-images");
      socket.off("images-updated");
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <h1 className="ml-5 pt-5 text-4xl font-bold">Images</h1>
      <p className="ml-6 pt-2">
        Status:{" "}
        <span className={isConnected ? "text-green-500" : "text-red-500"}>
          {isConnected ? "connected" : "disconnected"}
        </span>
      </p>
      <div className="p-5">
        <DataTable columns={columns} data={images} />
      </div>
    </div>
  );
}
