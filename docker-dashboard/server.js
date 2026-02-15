import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { docker } from "./server/docker.js";
import { saveContainerToDb, setSaveToDB, getSaveToDB } from "./server/db.js";
import { monitorAllContainers } from "./server/stats.js";
import { monitorDockerEvents } from "./server/events.js";
import { getImagesWithStatus } from "./server/images.js";
import { monitorImageEvents } from "./server/imageEvents.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

let containers = [];
let images = [];

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

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

      monitorAllContainers(containers, io);
    } else {
      console.log("Error listing containers: ", err);
    }
  });

  // Load initial images
  getImagesWithStatus()
    .then((imgs) => {
      images = imgs;
      console.log("Initial images loaded:", imgs.length);
    })
    .catch((err) => {
      console.error("Error listing images:", err);
    });

  io.on("connection", (socket) => {
    socket.emit("connectToClient");
    socket.emit("initial-containers", containers);
    socket.emit("initial-images", images);
    socket.emit("save-stats-state", getSaveToDB());

    socket.on("request-containers", () => {
      socket.emit("initial-containers", containers);
    });

    socket.on("request-images", () => {
      socket.emit("initial-images", images);
    });

    socket.on("subscribe-container-stats", (containerId) => {
      socket.join(`stats-${containerId}`);
      console.log(
        `Socket ${socket.id} subscribed to ${containerId.substring(0, 12)}`,
      );
    });

    socket.on("unsubscribe-container-stats", (containerId) => {
      socket.leave(`stats-${containerId}`);
      console.log(
        `Socket ${socket.id} unsubscribed from ${containerId.substring(0, 12)}`,
      );
    });

    socket.on("saveStats", (saveStats) => {
      setSaveToDB(saveStats);
      console.log("Set state for saving to DB to: ", saveStats);
    });
  });

  monitorDockerEvents(io, containers, {
    onContainerCreated(containerObject) {
      containers.push(containerObject);
      getImagesWithStatus()
        .then((imgs) => {
          images = imgs;
          io.emit("images-updated", images);
        })
        .catch((err) => console.error("Error refreshing images:", err));
    },
    onContainerDestroyed(deletedId) {
      containers = containers.filter((c) => c.Id !== deletedId);
      getImagesWithStatus()
        .then((imgs) => {
          images = imgs;
          io.emit("images-updated", images);
        })
        .catch((err) => console.error("Error refreshing images:", err));
    },
    onStatusChange(statusChangeObj) {
      containers = containers.map((c) =>
        c.Id === statusChangeObj.Id
          ? { ...c, Status: statusChangeObj.Status }
          : c,
      );
    },
  });

  // Monitor image events (pull, delete, tag, untag)
  monitorImageEvents(io, (updatedImages) => {
    images = updatedImages;
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
