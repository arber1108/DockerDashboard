"use server";

import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getContainerData() {
  const result = await pool.query(`
    SELECT c.docker_id, c.name, cm.time, cm.cpu_usage_percent, cm.memory_usage_mb
    FROM container_metrics cm
    JOIN container c ON cm.container_id = c.id
    ORDER BY cm.time DESC
  `);

  return result.rows.map((row) => ({
    id: row.docker_id as string,
    name: row.name as string,
    time: new Date(row.time).toLocaleString(),
    cpu_usage_percentage: parseFloat(Number(row.cpu_usage_percent).toFixed(2)),
    memory_usage_mb: parseFloat(Number(row.memory_usage_mb).toFixed(2)),
  }));
}
