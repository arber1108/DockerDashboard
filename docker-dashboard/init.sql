
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS container (
    id SERIAL PRIMARY KEY,
    docker_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    image VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS container_metrics (
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    container_id INTEGER NOT NULL REFERENCES container(id) ON DELETE CASCADE,
    cpu_usage_percent DOUBLE PRECISION,
    memory_usage_mb DOUBLE PRECISION
);

SELECT create_hypertable('container_metrics', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_container_metrics_container_id ON container_metrics(container_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_container_docker_id ON container(docker_id);
