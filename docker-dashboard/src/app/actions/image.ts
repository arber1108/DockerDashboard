"use server";

import Docker from "dockerode";

const socket =
  process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";

const docker = new Docker({ socketPath: socket });

async function removeImage(id: string) {
  try {
    const image = docker.getImage(id);
    await image.remove();
  } catch (error) {
    console.error("Error removing image:", error);
    throw error;
  }
}

export { removeImage };
