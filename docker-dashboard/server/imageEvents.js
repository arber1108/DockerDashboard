import { docker } from "./docker.js";
import { getImagesWithStatus } from "./images.js";

function monitorImageEvents(io, onImagesUpdated) {
  console.log("Setting up Docker image events monitor...");
  const filters = {
    type: ["image"],
    event: ["pull", "delete", "tag", "untag", "import", "load"],
  };

  docker.getEvents({ filters }, (err, stream) => {
    if (err) {
      console.log("Error getting Docker Image Events: ", err);
      return;
    }
    console.log("Docker image events stream connected successfully");

    stream.on("data", async (chunk) => {
      try {
        const eventData = JSON.parse(chunk.toString());
        console.log("Docker image event:", eventData.Action);

        const images = await getImagesWithStatus();
        onImagesUpdated(images);
        io.emit("images-updated", images);
      } catch (error) {
        console.error("Error processing image event:", error);
      }
    });

    stream.on("error", (err) => {
      console.error("Docker image event stream error:", err);
    });
  });
}

export { monitorImageEvents };
