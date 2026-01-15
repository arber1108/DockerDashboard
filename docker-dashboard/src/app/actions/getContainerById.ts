"use server";

import Docker from "dockerode";
import Stream from "stream";

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
    return containerStats;
  } catch (error) {
    console.log("Error in getContainerStats:", error);
  }
}

export { getContainerById, getContainerStats };
