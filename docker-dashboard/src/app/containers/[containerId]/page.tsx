"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getContainerById,
  getContainerStats,
  startContainer,
  stopContainer,
  restartContainer,
} from "@/app/actions/container";
import { ChartLineStep } from "@/components/chart-line-step";
import { ChartLineStepMemory } from "@/components/chart-line-step-memory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RotateCw } from "lucide-react";

export default function ContainerDetails() {
  const { containerId } = useParams<{ containerId: string }>();
  const [containerInfo, setContainerInfo] = useState<any>(null);
  const [containerStats, setContainerStats] = useState<any>(null);

  const refreshInfo = () => {
    getContainerById(containerId).then(setContainerInfo);
  };

  useEffect(() => {
    if (!containerId) return;
    refreshInfo();
    getContainerStats(containerId).then(setContainerStats);
  }, [containerId]);

  const handleAction = async (action: (id: string) => Promise<void>) => {
    await action(containerId);
    refreshInfo();
  };

  if (!containerInfo) return <p>Loading...</p>;

  const status: string = containerInfo.State?.Status ?? "unknown";

  return (
    <>
      <div className="flex items-center gap-3 m-10 mb-0">
        <h1 className="text-2xl font-bold">Container Details</h1>
        <Badge
          variant="outline"
          className={
            status === "running"
              ? "border-emerald-500 text-emerald-500"
              : status === "exited"
                ? "border-rose-500 text-rose-500"
                : status === "paused"
                  ? "border-yellow-500 text-yellow-500"
                  : "border-slate-500 text-slate-500"
          }
        >
          {status}
        </Badge>
      </div>
      <p className="mx-10 mt-1 text-sm text-muted-foreground font-mono">
        {containerId}
      </p>
      <div className="grid grid-cols-3 m-10 gap-5">
        <ChartLineStep containerId={containerId} />
        <ChartLineStepMemory containerId={containerId} />
      </div>
      <div className="flex items-center gap-3 mx-10">
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => handleAction(startContainer)}
        >
          <Play className="size-4" />
          Start
        </Button>
        <Button
          className="bg-destructive text-white hover:bg-destructive/80"
          onClick={() => handleAction(stopContainer)}
        >
          <Square className="size-4" />
          Stop
        </Button>
        <Button
          variant="outline"
          onClick={() => handleAction(restartContainer)}
        >
          <RotateCw className="size-4" />
          Restart
        </Button>
      </div>
    </>
  );
}
