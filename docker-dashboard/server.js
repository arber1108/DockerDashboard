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

async function saveContainerMetricsToDb(stats, dockerId) {
  const containerResult = await pool.query(
    "SELECT id FROM container WHERE docker_id = $1",
    [dockerId]
  );
  if (containerResult.rows.length === 0) {
    console.error("Container not found in database:", dockerId);
    return;
  }
  const containerId = containerResult.rows[0].id;

  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numCpus = stats.cpu_stats.online_cpus || 1;
  const cpuPercent =
    systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

  const memoryMb = stats.memory_stats.usage / (1024 * 1024);

  const query = `
    INSERT INTO container_metrics (time, container_id, cpu_usage_percent, memory_usage_mb)
    VALUES (NOW(), $1, $2, $3)
  `;
  await pool.query(query, [containerId, cpuPercent, memoryMb]);
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

            // Start/stop stats monitoring based on container state
            if (eventData.status === "start") {
              monitorContainerStats(containerInfo.Id);
            } else if (eventData.status === "stop" || eventData.status === "die") {
              stopMonitoringContainer(containerInfo.Id);
            }
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
  const statsStreams = new Map();

  async function monitorContainerStats(containerId) {
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

      console.log(`Attached to stats stream for container ${containerId.substring(0, 12)}...`);
      stream.setEncoding("utf8");

      stream.on("data", (chunk) => {
        try {
          const data = JSON.parse(chunk);
          saveContainerMetricsToDb(data, containerId);
        } catch (err) {
          console.error("Error parsing Chunk:", err);
        }
      });

      stream.on("end", () => {
        console.log(`Stream ended for container ${containerId.substring(0, 12)}`);
        statsStreams.delete(containerId);
      });

      stream.on("error", (error) => {
        console.error(`Stream error for container ${containerId.substring(0, 12)}:`, error);
        statsStreams.delete(containerId);
      });
    } catch (error) {
      console.error(`Failed to get stats for container ${containerId.substring(0, 12)}:`, error);
    }
  }

  function stopMonitoringContainer(containerId) {
    const stream = statsStreams.get(containerId);
    if (stream) {
      stream.destroy();
      statsStreams.delete(containerId);
      console.log(`Stopped monitoring container ${containerId.substring(0, 12)}`);
    }
  }

  async function monitorAllContainers() {
    for (const container of containers) {
      await monitorContainerStats(container.Id);
    }
  }

  monitorAllContainers();
  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
