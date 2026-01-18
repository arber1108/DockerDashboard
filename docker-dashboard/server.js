import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import Docker from "dockerode";
import pg from "pg";
import "dotenv/config";

var socket =
  process.platform === "win32"
    ? "//./pipe/docker_engine"
    : "/var/run/docker.sock";

console.log(socket);

var docker = new Docker({ socketPath: socket });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function saveContainerToDb(container) {
  const query = `
    INSERT INTO container (docker_id, name, created_at, image)
    VALUES ($1, $2, NOW(), $3)
    ON CONFLICT (docker_id) DO NOTHING
  `;
  await pool.query(query, [container.Id, container.Name, container.Image]);
}

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

let containers = [];

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

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

            if (!containers.some((c) => c.Id === containerObject.Id)) {
              containers.push(containerObject);
              io.emit("new-container", containerObject);
              try {
                await saveContainerToDb(containerObject);
              } catch (dbErr) {
                console.error("Error saving container to db:", dbErr);
              }
            }
          }

          //----Deleting Container----
          if (eventData.status === "destroy") {
            const deletedId = eventData.Actor.ID;
            console.log("Removing container with ID:", deletedId);

            // Filter out the deleted container
            containers = containers.filter((c) => c.Id !== deletedId);

            io.emit("container-deleted", deletedId);
            console.log("Remaining containers:", containers);
          }

          //----Status Change----
          if (
            eventData.status === "start" ||
            eventData.status === "stop" ||
            eventData.status === "die" ||
            eventData.status === "pause"
          ) {
            const containerInfo = await container.inspect();
            const statusChangeObj = {
              Id: containerInfo.Id,
              Status: containerInfo.State.Status,
            };
            io.emit("status-change", statusChangeObj);
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

  docker.listContainers({ all: true }, async (err, containersList) => {
    if (!err) {
      const data = containersList.map((container) => ({
        Id: container.Id,
        Name: container.Names[0].replace("/", ""),
        Status: container.State,
        Image: container.Image,
      }));

      console.log("Container-Data: ", data);
      containers = data;

      // Save containers to database
      for (const container of data) {
        try {
          await saveContainerToDb(container);
        } catch (dbErr) {
          console.error("Error saving container to db:", dbErr);
        }
      }
      console.log("Initial containers saved to database");
    } else {
      console.log("Error listing containers: ", err);
    }
  });

  io.on("connection", (socket) => {
    socket.emit("connectToClient");
    socket.emit("initial-containers", containers);
  });

  monitorDockerEvents();

  //----Container Stats Stream----
  async function monitorContainerStats() {
    try {
      const container = docker.getContainer(
        "a6041512c24fb8fb4cfdcc95245428a8131581e471e3e5311b696dacdf52c3de"
      );

      const stream = await container.stats({ stream: true });

      console.log("Attached to stats stream...");
      stream.setEncoding("utf8");

      stream.on("data", (chunk) => {
        try {
          const data = JSON.parse(chunk);
        } catch (err) {
          console.error("Error parsing Chunk:", err);
        }
      });

      stream.on("end", () => {
        console.log("Stream ended");
      });

      stream.on("error", (error) => {
        console.error("Stream error:", error);
      });
    } catch (error) {
      console.error("Failed to get Stats: ", error);
    }
  }

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
