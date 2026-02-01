import Docker from "dockerode";

const socket =
  process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";

console.log(socket);

const docker = new Docker({ socketPath: socket });

export { docker };
