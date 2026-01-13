import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import Docker from "dockerode";
import { Contact } from "lucide-react";
import { ALL } from "node:dns";

var socket =
  process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";

console.log(socket);

var docker = new Docker({ socketPath: socket });

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  function monitorDockerEvents() {
    const filters = {
      type: ["container"],
      event: ["start", "die"],
    };

    docker.getEvents({ filters }, (err, stream) => {
      if (err) {
        console.log("Error getting Docker Events: ", err);
        return;
      }

      stream.on("data", async (chunk) => {
        try {
          const eventData = JSON.parse(chunk.toString());
          console.log("Raw Docker Event:", eventData);

          const container = docker.getContainer(eventData.Actor.ID);
          const containerInfo = await container.inspect();

          console.log(`New container detected: ${containerInfo.Name}`);
          io.emit("new-container", containerInfo);
        } catch (error) {
          console.error("Error processing Event Chunk", error);
        }
      });

      stream.on("error", (err) => {
        console.error("Docker Event Stream error: ", err);
      });
    });
  }

  monitorDockerEvents();

  io.on("connection", (socket) => {
    socket.emit("connectToClient");

    docker.listContainers((err, containers) => {
      if (!err) {
        socket.emit("initial-containers", containers);
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
