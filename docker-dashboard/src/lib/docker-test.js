import Docker from "dockerode";

var socket =
  process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";

console.log(socket);

var docker = new Docker({ socketPath: socket });

docker.listContainers({ all: true }, function (err, containers) {
  console.log(JSON.stringify(containers, null, 2));
});
