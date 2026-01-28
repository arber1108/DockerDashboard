import { getContainerById, getContainerStats } from "@/app/actions/container";
import { ChartLineStep } from "@/components/chart-line-step";
import { ChartLineStepMemory } from "@/components/chart-line-step-memory";

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
      <div className="grid grid-cols-3 m-10 gap-5">
        <ChartLineStep containerId={resolvedParams.containerId} />
        <ChartLineStepMemory containerId={resolvedParams.containerId} />
      </div>
    </>
  );
}
