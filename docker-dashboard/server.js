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
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  let containers = [];
  function monitorDockerEvents() {
    const filters = {
      type: ["container"],
      event: ["start"],
    };

    docker.getEvents({ filters }, (err, stream) => {
      if (err) {
        console.log("Error getting Docker Events: ", err);
        return;
      }

      stream.on("data", async (chunk) => {
        try {
          const eventData = JSON.parse(chunk.toString());
          const container = docker.getContainer(eventData.Actor.ID);
          const containerInfo = await container.inspect();

          const containerObject = {
            Id: containerInfo.Id,
            Name: containerInfo.Name.replace("/", ""),
            Status: containerInfo.State.Status,
            Image: containerInfo.Config.Image,
          };

          if (containers.some((e) => e.Id == containerObject.Id)) {
            console.log("already in list");
          } else {
            containers.push(containerObject);
          }

          console.log("Container List: ", containers);
          console.log(`New container detected: ${containerInfo.Name}`);
          io.emit("new-container", containerObject);
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

    docker.listContainers({ all: true }, (err, containers) => {
      if (!err) {
        console.log(containers);

        const data = containers.map((container) => ({
          Id: container.Id,
          Name: container.Names[0].replace("/", ""),
          Status: container.State,
          Image: container.Image,
        }));

        console.log(data);
        socket.emit("initial-containers", data);
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
