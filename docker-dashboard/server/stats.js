import { docker } from "./docker.js";
import { convertCPUToPercent, saveContainerMetricsToDb } from "./db.js";

const statsStreams = new Map();
const lastStatsTime = new Map();
const STATS_INTERVAL_MS = 3000;

async function monitorContainerStats(containerId, io) {
  if (statsStreams.has(containerId)) {
    return;
  }

  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();

    if (info.State.Status !== "running") {
      return;
    }

    const stream = await container.stats({ stream: true });
    statsStreams.set(containerId, stream);

    console.log(
      `Attached to stats stream for container ${containerId.substring(0, 12)}...`,
    );
    stream.setEncoding("utf8");

    stream.on("data", (chunk) => {
      try {
        const now = Date.now();
        const lastTime = lastStatsTime.get(containerId) || 0;

        if (now - lastTime < STATS_INTERVAL_MS) {
          return;
        }
        lastStatsTime.set(containerId, now);

        const data = JSON.parse(chunk);
        saveContainerMetricsToDb(data, containerId);

        const statsObject = {
          containerId,
          cpuPercent: convertCPUToPercent(data),
          time: new Date(data.read).toLocaleTimeString("en-GB"),
        };

        const memoryObject = {
          containerId,
          memoryInMb: data.memory_stats.usage / (1024 * 1024),
          time: new Date(data.read).toLocaleTimeString("en-GB"),
          limit: data.memory_stats.limit / (1024 * 1024),
        };

        io.to(`stats-${containerId}`).emit("memory-data", memoryObject);
        io.to(`stats-${containerId}`).emit("percentage-data", statsObject);
      } catch (err) {
        console.error("Error parsing Chunk:", err);
      }
    });

    stream.on("end", () => {
      console.log(
        `Stream ended for container ${containerId.substring(0, 12)}`,
      );
      statsStreams.delete(containerId);
      lastStatsTime.delete(containerId);
    });

    stream.on("error", (error) => {
      console.error(
        `Stream error for container ${containerId.substring(0, 12)}:`,
        error,
      );
      statsStreams.delete(containerId);
      lastStatsTime.delete(containerId);
    });
  } catch (error) {
    console.error(
      `Failed to get stats for container ${containerId.substring(0, 12)}:`,
      error,
    );
  }
}

function stopMonitoringContainer(containerId) {
  const stream = statsStreams.get(containerId);
  if (stream) {
    stream.destroy();
    statsStreams.delete(containerId);
    lastStatsTime.delete(containerId);
    console.log(
      `Stopped monitoring container ${containerId.substring(0, 12)}`,
    );
  }
}

async function monitorAllContainers(containers, io) {
  for (const container of containers) {
    await monitorContainerStats(container.Id, io);
  }
}

export { monitorContainerStats, stopMonitoringContainer, monitorAllContainers };
