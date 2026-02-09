import pg from "pg";
import "dotenv/config";

let saveToDB = false;

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

function convertCPUToPercent(stats) {
  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numCpus = stats.cpu_stats.online_cpus || 1;
  const cpuPercent =
    systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

  if (cpuPercent > 100) {
    return 100;
  }
  return cpuPercent;
}

async function saveContainerMetricsToDb(stats, dockerId) {
  if (saveToDB === false) {
    return;
  }
  const containerResult = await pool.query(
    "SELECT id FROM container WHERE docker_id = $1",
    [dockerId],
  );
  if (containerResult.rows.length === 0) {
    console.error("Container not found in database:", dockerId);
    return;
  }
  const containerId = containerResult.rows[0].id;

  const cpuPercent = convertCPUToPercent(stats);
  const memoryMb = stats.memory_stats.usage / (1024 * 1024);

  const query = `
    INSERT INTO container_metrics (time, container_id, cpu_usage_percent, memory_usage_mb)
    VALUES (NOW(), $1, $2, $3)
  `;
  await pool.query(query, [containerId, cpuPercent, memoryMb]);
}

function setSaveToDB(value) {
  saveToDB = value;
}

function getSaveToDB() {
  return saveToDB;
}

export {
  saveContainerToDb,
  saveContainerMetricsToDb,
  convertCPUToPercent,
  setSaveToDB,
  getSaveToDB,
};
