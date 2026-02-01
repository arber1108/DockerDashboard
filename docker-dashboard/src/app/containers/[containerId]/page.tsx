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

export default function ContainerDetails() {
  const { containerId } = useParams<{ containerId: string }>();
  const [containerInfo, setContainerInfo] = useState<any>(null);
  const [containerStats, setContainerStats] = useState<any>(null);

  useEffect(() => {
    if (!containerId) return;
    getContainerById(containerId).then(setContainerInfo);
    getContainerStats(containerId).then(setContainerStats);
  }, [containerId]);

  if (!containerInfo) return <p>Loading...</p>;

  return (
    <>
      <h1>Container Details {containerId}</h1>
      <div className="grid grid-cols-3 m-10 gap-5">
        <ChartLineStep containerId={containerId} />
        <ChartLineStepMemory containerId={containerId} />
      </div>
      <div className="grid grid-cols-3 m-10 gap-5">
        <Button variant={"outline"} onClick={() => startContainer(containerId)}>
          Start
        </Button>
        <Button variant={"outline"} onClick={() => stopContainer(containerId)}>
          Stop
        </Button>
        <Button
          variant={"outline"}
          onClick={() => restartContainer(containerId)}
        >
          Restart
        </Button>
      </div>
    </>
  );
}
