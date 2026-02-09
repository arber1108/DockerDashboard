import { docker } from "./docker.js";
import { saveContainerToDb } from "./db.js";
import { monitorContainerStats, stopMonitoringContainer } from "./stats.js";

function monitorDockerEvents(io, containers, callbacks) {
  console.log("Setting up Docker events monitor...");
  const filters = {
    type: ["container"],
    event: ["start", "die", "pause", "unpause", "stop", "create", "destroy"],
  };

  docker.getEvents({ filters }, (err, stream) => {
    if (err) {
      console.log("Error getting Docker Events: ", err);
      return;
    }
    console.log("Docker events stream connected successfully");

    stream.on("data", async (chunk) => {
      try {
        const eventData = JSON.parse(chunk.toString());
        const eventStatus = eventData.status || eventData.Action;
        console.log(
          "Docker event:",
          eventStatus,
          "id:",
          eventData.Actor?.ID?.substring(0, 12),
        );
        const container = docker.getContainer(eventData.Actor.ID);

        //----Creating new Container----
        if (eventStatus === "create") {
          const containerInfo = await container.inspect();
          console.log(eventData);
          const containerObject = {
            Id: containerInfo.Id,
            Name: containerInfo.Name.replace("/", ""),
            Status: containerInfo.State.Status,
            Image: containerInfo.Config.Image,
          };

          if (!containers.some((c) => c.Id === containerObject.Id)) {
            callbacks.onContainerCreated(containerObject);
            io.emit("new-container", containerObject);
            try {
              await saveContainerToDb(containerObject);
            } catch (dbErr) {
              console.error("Error saving container to db:", dbErr);
            }
          }
        }

        //----Deleting Container----
        if (eventStatus === "destroy") {
          const deletedId = eventData.Actor.ID;
          console.log("Removing container with ID:", deletedId);

          callbacks.onContainerDestroyed(deletedId);

          io.emit("container-deleted", deletedId);
          console.log("Remaining containers:", containers);
        }

        //----Status Change----
        if (
          eventStatus === "start" ||
          eventStatus === "stop" ||
          eventStatus === "die" ||
          eventStatus === "pause" ||
          eventStatus === "unpause"
        ) {
          const containerInfo = await container.inspect();
          const statusChangeObj = {
            Id: containerInfo.Id,
            Status: containerInfo.State.Status,
          };

          callbacks.onStatusChange(statusChangeObj);

          io.emit("status-change", statusChangeObj);
          console.log(
            "Status change:",
            statusChangeObj.Id.substring(0, 12),
            "->",
            statusChangeObj.Status,
          );

          // Start/stop stats monitoring based on container state
          if (eventStatus === "start") {
            monitorContainerStats(containerInfo.Id, io);
          } else if (eventStatus === "stop" || eventStatus === "die") {
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

export { monitorDockerEvents };
