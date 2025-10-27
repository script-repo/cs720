-- CS720 Data Schema for SQLite
-- Based on WhiteCap Data Assistant specification

-- ============================================================================
-- NORMALIZED TABLES
-- ============================================================================

-- Accounts (top-level customer entities)
CREATE TABLE IF NOT EXISTS accounts (
  account_name_normalized TEXT PRIMARY KEY,
  account_name_display TEXT,
  region TEXT NULL,
  theater TEXT NULL,
  ae_email TEXT NULL,
  se_owner_email TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_region ON accounts(region);
CREATE INDEX IF NOT EXISTS idx_accounts_theater ON accounts(theater);
CREATE INDEX IF NOT EXISTS idx_accounts_ae ON accounts(ae_email);
CREATE INDEX IF NOT EXISTS idx_accounts_se ON accounts(se_owner_email);

-- Clusters (infrastructure groupings)
CREATE TABLE IF NOT EXISTS clusters (
  cluster_uuid TEXT PRIMARY KEY,
  account_name_normalized TEXT NOT NULL REFERENCES accounts(account_name_normalized) ON DELETE CASCADE,
  cluster_name TEXT NULL,
  site TEXT NULL,
  sw_version TEXT NULL,
  license_state TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clusters_account ON clusters(account_name_normalized);
CREATE INDEX IF NOT EXISTS idx_clusters_name ON clusters(cluster_name);

-- Nodes (physical/virtual hosts)
CREATE TABLE IF NOT EXISTS nodes (
  node_id TEXT PRIMARY KEY,
  cluster_uuid TEXT NOT NULL REFERENCES clusters(cluster_uuid) ON DELETE CASCADE,
  model TEXT NULL,
  cpu TEXT NULL,
  memory_gb REAL NULL,
  gpu_model TEXT NULL,
  serial TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nodes_cluster ON nodes(cluster_uuid);

-- VMs (virtual machines)
CREATE TABLE IF NOT EXISTS vms (
  vm_uuid TEXT PRIMARY KEY,
  cluster_uuid TEXT NOT NULL REFERENCES clusters(cluster_uuid) ON DELETE CASCADE,
  vm_name TEXT NULL,
  os TEXT NULL,
  ip TEXT NULL,
  power_state TEXT NULL,
  owner TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vms_cluster ON vms(cluster_uuid);
CREATE INDEX IF NOT EXISTS idx_vms_name ON vms(vm_name);

-- Storage Containers
CREATE TABLE IF NOT EXISTS storage_containers (
  container_id TEXT PRIMARY KEY,
  cluster_uuid TEXT NOT NULL REFERENCES clusters(cluster_uuid) ON DELETE CASCADE,
  container_name TEXT NULL,
  capacity_gb REAL NULL,
  used_gb REAL NULL,
  replication TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_cluster ON storage_containers(cluster_uuid);

-- Licenses
CREATE TABLE IF NOT EXISTS licenses (
  license_key TEXT PRIMARY KEY,
  cluster_uuid TEXT NULL REFERENCES clusters(cluster_uuid) ON DELETE SET NULL,
  account_name_normalized TEXT NULL REFERENCES accounts(account_name_normalized) ON DELETE CASCADE,
  sku TEXT NULL,
  edition TEXT NULL,
  expiry DATE NULL,
  entitlement_qty INTEGER NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_licenses_account ON licenses(account_name_normalized);
CREATE INDEX IF NOT EXISTS idx_licenses_cluster ON licenses(cluster_uuid);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry);

-- Support Cases
CREATE TABLE IF NOT EXISTS cases (
  case_number TEXT PRIMARY KEY,
  account_name_normalized TEXT NOT NULL REFERENCES accounts(account_name_normalized) ON DELETE CASCADE,
  cluster_uuid TEXT NULL REFERENCES clusters(cluster_uuid) ON DELETE SET NULL,
  severity TEXT NULL,
  status TEXT NULL,
  product TEXT NULL,
  opened DATETIME NULL,
  closed DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cases_account ON cases(account_name_normalized);
CREATE INDEX IF NOT EXISTS idx_cases_cluster ON cases(cluster_uuid);
CREATE INDEX IF NOT EXISTS idx_cases_opened ON cases(opened);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- Workloads
CREATE TABLE IF NOT EXISTS workloads (
  workload_id TEXT PRIMARY KEY,
  account_name_normalized TEXT NOT NULL REFERENCES accounts(account_name_normalized) ON DELETE CASCADE,
  workload_name TEXT NULL,
  category TEXT NULL,
  priority TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workloads_account ON workloads(account_name_normalized);

-- Product Heatmap (interest/propensity data)
CREATE TABLE IF NOT EXISTS product_heatmap (
  heatmap_id TEXT PRIMARY KEY,
  account_name_normalized TEXT NOT NULL REFERENCES accounts(account_name_normalized) ON DELETE CASCADE,
  product TEXT NOT NULL,
  propensity REAL NULL,
  interest_level TEXT NULL,
  last_touch DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_heatmap_account ON product_heatmap(account_name_normalized);

-- Deal Registration
CREATE TABLE IF NOT EXISTS deal_registration (
  deal_id TEXT PRIMARY KEY,
  account_name_normalized TEXT NOT NULL REFERENCES accounts(account_name_normalized) ON DELETE CASCADE,
  stage TEXT NULL,
  amount REAL NULL,
  partner TEXT NULL,
  oem TEXT NULL,
  close_date DATE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deals_account ON deal_registration(account_name_normalized);

-- Resource Utilization (time-series metrics)
CREATE TABLE IF NOT EXISTS utilization (
  util_id TEXT PRIMARY KEY,
  cluster_uuid TEXT NOT NULL REFERENCES clusters(cluster_uuid) ON DELETE CASCADE,
  timestamp DATETIME NOT NULL,
  cpu_pct REAL NULL,
  mem_pct REAL NULL,
  storage_pct REAL NULL,
  iops REAL NULL,
  latency_ms REAL NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_util_cluster_time ON utilization(cluster_uuid, timestamp DESC);

-- Discoveries
CREATE TABLE IF NOT EXISTS discoveries (
  discovery_id TEXT PRIMARY KEY,
  account_name_normalized TEXT NOT NULL REFERENCES accounts(account_name_normalized) ON DELETE CASCADE,
  type TEXT NULL,
  timestamp DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discoveries_account ON discoveries(account_name_normalized);

-- ============================================================================
-- SYNC METADATA
-- ============================================================================

-- Sync runs (track ETL execution history)
CREATE TABLE IF NOT EXISTS sync_runs (
  sync_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
  started_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT NULL,
  metadata TEXT NULL -- JSON for additional context
);

CREATE INDEX IF NOT EXISTS idx_sync_started ON sync_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_runs(status);

-- Sync log (detailed ETL operations log)
CREATE TABLE IF NOT EXISTS sync_log (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_id TEXT NOT NULL REFERENCES sync_runs(sync_id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK(level IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  table_name TEXT NULL,
  record_count INTEGER NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_log_sync ON sync_log(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_level ON sync_log(level);

-- ============================================================================
-- TRIGGERS for updated_at
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS accounts_updated_at
  AFTER UPDATE ON accounts
  FOR EACH ROW
BEGIN
  UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE account_name_normalized = NEW.account_name_normalized;
END;

CREATE TRIGGER IF NOT EXISTS clusters_updated_at
  AFTER UPDATE ON clusters
  FOR EACH ROW
BEGIN
  UPDATE clusters SET updated_at = CURRENT_TIMESTAMP WHERE cluster_uuid = NEW.cluster_uuid;
END;

CREATE TRIGGER IF NOT EXISTS nodes_updated_at
  AFTER UPDATE ON nodes
  FOR EACH ROW
BEGIN
  UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE node_id = NEW.node_id;
END;

CREATE TRIGGER IF NOT EXISTS vms_updated_at
  AFTER UPDATE ON vms
  FOR EACH ROW
BEGIN
  UPDATE vms SET updated_at = CURRENT_TIMESTAMP WHERE vm_uuid = NEW.vm_uuid;
END;

CREATE TRIGGER IF NOT EXISTS storage_containers_updated_at
  AFTER UPDATE ON storage_containers
  FOR EACH ROW
BEGIN
  UPDATE storage_containers SET updated_at = CURRENT_TIMESTAMP WHERE container_id = NEW.container_id;
END;

CREATE TRIGGER IF NOT EXISTS licenses_updated_at
  AFTER UPDATE ON licenses
  FOR EACH ROW
BEGIN
  UPDATE licenses SET updated_at = CURRENT_TIMESTAMP WHERE license_key = NEW.license_key;
END;

CREATE TRIGGER IF NOT EXISTS cases_updated_at
  AFTER UPDATE ON cases
  FOR EACH ROW
BEGIN
  UPDATE cases SET updated_at = CURRENT_TIMESTAMP WHERE case_number = NEW.case_number;
END;

CREATE TRIGGER IF NOT EXISTS workloads_updated_at
  AFTER UPDATE ON workloads
  FOR EACH ROW
BEGIN
  UPDATE workloads SET updated_at = CURRENT_TIMESTAMP WHERE workload_id = NEW.workload_id;
END;

CREATE TRIGGER IF NOT EXISTS product_heatmap_updated_at
  AFTER UPDATE ON product_heatmap
  FOR EACH ROW
BEGIN
  UPDATE product_heatmap SET updated_at = CURRENT_TIMESTAMP WHERE heatmap_id = NEW.heatmap_id;
END;

CREATE TRIGGER IF NOT EXISTS deal_registration_updated_at
  AFTER UPDATE ON deal_registration
  FOR EACH ROW
BEGIN
  UPDATE deal_registration SET updated_at = CURRENT_TIMESTAMP WHERE deal_id = NEW.deal_id;
END;

CREATE TRIGGER IF NOT EXISTS discoveries_updated_at
  AFTER UPDATE ON discoveries
  FOR EACH ROW
BEGIN
  UPDATE discoveries SET updated_at = CURRENT_TIMESTAMP WHERE discovery_id = NEW.discovery_id;
END;
