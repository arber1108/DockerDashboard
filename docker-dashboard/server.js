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
      event: ["start", "die", "pause", "stop", "create", "destroy"],
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

          //----Creating new Container----
          if (eventData.status == "create") {
            const containerInfo = await container.inspect();
            console.log(eventData);
            const containerObject = {
              Id: containerInfo.Id,
              Name: containerInfo.Name.replace("/", ""),
              Status: containerInfo.State.Status,
              Image: containerInfo.Config.Image,
            };

            containers.push(containerObject);
            io.emit("new-container", containerObject);
          }

          //----Deleting Container----
          if (eventData.status === "destroy") {
            const deletedId = eventData.Actor.ID; // Use Actor.ID instead of ID
            console.log("Removing container with ID:", deletedId);

            // Filter out the deleted container
            containers = containers.filter((c) => c.Id !== deletedId);

            io.emit("container-deleted", deletedId);
            console.log("Remaining containers:", containers);
          }
        } catch (error) {
          console.error("Error processing Event Chunk", error);
        }
      });

      stream.on("error", (err) => {
        console.error("Docker Event Stream error: ", err);
      });
    });
  }

  io.on("connection", (socket) => {
    socket.emit("connectToClient");

    docker.listContainers({ all: true }, (err, containersList) => {
      if (!err) {
        const data = containersList.map((container) => ({
          Id: container.Id,
          Name: container.Names[0].replace("/", ""),
          Status: container.State,
          Image: container.Image,
        }));
        console.log(data);
        containers = data; // Replace the array instead of pushing
        socket.emit("initial-containers", data);
      }
    });
  });

  monitorDockerEvents();

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
