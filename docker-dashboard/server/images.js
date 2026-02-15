import { docker } from "./docker.js";

async function getImagesWithStatus() {
  const [images, containers] = await Promise.all([
    docker.listImages({ all: true }),
    docker.listContainers({ all: true }),
  ]);

  const usedImageIds = new Set(containers.map((c) => c.ImageID));

  return images.map((image) => {
    const repoTag = image.RepoTags?.[0] || "<none>:<none>";
    const lastColon = repoTag.lastIndexOf(":");
    const repository = repoTag.substring(0, lastColon);
    const tag = repoTag.substring(lastColon + 1);

    return {
      Id: image.Id,
      ShortId: image.Id.replace("sha256:", "").substring(0, 12),
      Repository: repository,
      Tag: tag,
      Status: usedImageIds.has(image.Id) ? "In Use" : "Unused",
      Created: image.Created,
      Size: image.Size,
      Containers: containers.filter((c) => c.ImageID === image.Id).length,
    };
  });
}

export { getImagesWithStatus };
