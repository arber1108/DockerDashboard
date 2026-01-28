"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { socket } from "../socket";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const description = "A line chart with step";

interface memoryStats {
  containerId: string;
  time: string;
  memoryInMb: number;
  limit: number;
}

interface ChartLineStepProps {
  containerId: string;
}

const MAX_SIZE = 5;

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "cyan",
  },
} satisfies ChartConfig;

export function ChartLineStepMemory({ containerId }: ChartLineStepProps) {
  const [memoryData, setMemoryData] = useState<memoryStats[]>([]);

  const memoryLimit =
    memoryData.length > 0 ? Math.round(memoryData[0].limit) : undefined;

  useEffect(() => {
    socket.emit("subscribe-container-stats", containerId);

    const handleData = (data: memoryStats) => {
      if (data.containerId === containerId) {
        setMemoryData((prev) => [...prev, data].slice(-MAX_SIZE));
      }
    };

    socket.on("memory-data", handleData);

    return () => {
      socket.emit("unsubscribe-container-stats", containerId);
      socket.off("memory-data", handleData);
    };
  }, [containerId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Usage (MB)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={memoryData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              color="cyan"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, memoryLimit ?? "auto"]}
              tickLine={false}
              axisLine={false}
            />

            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel color="cyan" />}
            />
            <Line
              dataKey="memoryInMb"
              type="step"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
