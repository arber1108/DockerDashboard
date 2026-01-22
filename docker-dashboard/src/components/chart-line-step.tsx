"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { socket } from "../socket";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export const description = "A line chart with step";

interface percentageStats {
  containerId: string;
  time: string;
  cpuPercent: number;
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

export function ChartLineStep({ containerId }: ChartLineStepProps) {
  const [percentageData, setPercentageData] = useState<percentageStats[]>([]);

  useEffect(() => {
    socket.emit("subscribe-container-stats", containerId);

    const handleData = (data: percentageStats) => {
      if (data.containerId === containerId) {
        setPercentageData((prev) => [...prev, data].slice(-MAX_SIZE));
      }
    };

    socket.on("percentage-data", handleData);

    return () => {
      socket.emit("unsubscribe-container-stats", containerId);
      socket.off("percentage-data", handleData);
    };
  }, [containerId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CPU Usage in %</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={percentageData}
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
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel color="cyan" />}
            />
            <Line
              dataKey="cpuPercent"
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
