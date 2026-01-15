import {
  getContainerById,
  getContainerStats,
} from "@/app/actions/getContainerById";

export default async function ContainerDetails({
  params,
}: {
  params: { containerId: string } | Promise<{ containerId: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const containerInfo = await getContainerById(resolvedParams.containerId);
  const containerStats = await getContainerStats(resolvedParams.containerId);
  console.log("ContainerStats: ", containerStats);
  return (
    <>
      {" "}
      <h1>Container Details {resolvedParams.containerId}</h1>
    </>
  );
}
