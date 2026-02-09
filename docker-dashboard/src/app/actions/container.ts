"use server";

import Docker from "dockerode";
import { stderr, stdout } from "process";

const socket =
  process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";

const docker = new Docker({ socketPath: socket });

async function getContainerById(Id: string) {
  try {
    const container = docker.getContainer(Id);
    const containerInfos = await container.inspect();
    return containerInfos;
  } catch (error) {
    console.error("Error in getContainerById:", error);
    throw error;
  }
}

async function getContainerStats(Id: string) {
  try {
    const container = docker.getContainer(Id);
    const containerStats = await container.stats({ stream: false });
    const cpuDelta =
      containerStats.cpu_stats.cpu_usage.total_usage -
      containerStats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      containerStats.cpu_stats.system_cpu_usage -
      containerStats.precpu_stats.system_cpu_usage;
    const cpuCores = containerStats.cpu_stats.online_cpus || 1;

    let cpuPercent = 0;
    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * cpuCores * 100.0;
    }

    const formattedCpuPercent = parseFloat(cpuPercent.toFixed(2));
    console.log("CPU Percentage: ", formattedCpuPercent);

    return containerStats;
  } catch (error) {
    console.log("Error in getContainerStats:", error);
  }
}

async function startContainer(id: string) {
  const container = docker.getContainer(id);
  await container.start();
}

async function stopContainer(id: string) {
  const container = docker.getContainer(id);
  await container.stop();
}

async function restartContainer(id: string) {
  const container = docker.getContainer(id);
  await container.restart();
}

async function pauseContainer(id: string) {
  const container = docker.getContainer(id);
  await container.pause();
}

async function unpauseContainer(id: string) {
  const container = docker.getContainer(id);
  await container.unpause();
}

async function removeContainer(id: string) {
  const container = docker.getContainer(id);
  await container.remove();
}

async function getContainerLogs(id: string) {
  const container = docker.getContainer(id);
  const logs = await container.logs({ stderr: true, stdout: true });
  return logs.toString();
}
export {
  getContainerById,
  getContainerStats,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  pauseContainer,
  unpauseContainer,
  getContainerLogs,
};
