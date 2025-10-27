import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { getDatabase, transaction } from '../db/database';
import {
  normalizeAccountName,
  generateId,
  normalizeDate,
  normalizeDatetime,
  normalizeNumber,
  normalizeColumnName,
  extractClusterUuid,
  extractAccountName
} from '../utils/normalization';
import crypto from 'crypto';

interface SyncResult {
  syncId: string;
  status: 'completed' | 'failed';
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage?: string;
  tables: {
    [tableName: string]: {
      inserted: number;
      updated: number;
      failed: number;
    };
  };
}

interface SyncLog {
  syncId: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  tableName?: string;
  recordCount?: number;
}

class ETLService {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(__dirname, '../../../../data');
  }

  /**
   * Main sync operation - processes all CSV files for all accounts
   */
  async sync(): Promise<SyncResult> {
    const syncId = crypto.randomUUID();
    const db = getDatabase();
    const startTime = new Date().toISOString();

    console.log(`[ETL] Starting sync ${syncId}`);

    // Initialize sync run
    db.prepare(`
      INSERT INTO sync_runs (sync_id, status, started_at, records_processed, records_failed)
      VALUES (?, ?, ?, 0, 0)
    `).run(syncId, 'running', startTime);

    const result: SyncResult = {
      syncId,
      status: 'completed',
      recordsProcessed: 0,
      recordsFailed: 0,
      tables: {}
    };

    try {
      // Get all account directories
      const accountDirs = this.getAccountDirectories();

      this.log(syncId, 'info', `Found ${accountDirs.length} account directories`, null, accountDirs.length);

      for (const accountDir of accountDirs) {
        console.log(`[ETL] Processing account: ${accountDir}`);
        const accountPath = path.join(this.dataDir, accountDir);

        // Process all CSV files for this account
        const csvFiles = this.getCsvFiles(accountPath);
        this.log(syncId, 'info', `Processing ${csvFiles.length} CSV files for ${accountDir}`, null, csvFiles.length);

        for (const csvFile of csvFiles) {
          try {
            const filePath = path.join(accountPath, csvFile);
            const fileResult = await this.processCSVFile(syncId, accountDir, filePath);

            // Merge results
            for (const [table, stats] of Object.entries(fileResult)) {
              if (!result.tables[table]) {
                result.tables[table] = { inserted: 0, updated: 0, failed: 0 };
              }
              result.tables[table].inserted += stats.inserted;
              result.tables[table].updated += stats.updated;
              result.tables[table].failed += stats.failed;

              result.recordsProcessed += stats.inserted + stats.updated;
              result.recordsFailed += stats.failed;
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[ETL] Error processing ${csvFile}:`, errorMsg);
            this.log(syncId, 'error', `Failed to process ${csvFile}: ${errorMsg}`, csvFile);
            result.recordsFailed++;
          }
        }
      }

      // Update sync run as completed
      db.prepare(`
        UPDATE sync_runs
        SET status = 'completed', completed_at = ?, records_processed = ?, records_failed = ?
        WHERE sync_id = ?
      `).run(new Date().toISOString(), result.recordsProcessed, result.recordsFailed, syncId);

      this.log(syncId, 'info', `Sync completed successfully. Processed: ${result.recordsProcessed}, Failed: ${result.recordsFailed}`);

      console.log(`[ETL] Sync ${syncId} completed successfully`);
      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ETL] Sync ${syncId} failed:`, errorMsg);

      result.status = 'failed';
      result.errorMessage = errorMsg;

      // Update sync run as failed
      db.prepare(`
        UPDATE sync_runs
        SET status = 'failed', completed_at = ?, records_processed = ?, records_failed = ?, error_message = ?
        WHERE sync_id = ?
      `).run(new Date().toISOString(), result.recordsProcessed, result.recordsFailed, errorMsg, syncId);

      this.log(syncId, 'error', `Sync failed: ${errorMsg}`);

      throw error;
    }
  }

  /**
   * Process a single CSV file
   */
  private async processCSVFile(
    syncId: string,
    accountName: string,
    filePath: string
  ): Promise<Record<string, { inserted: number; updated: number; failed: number }>> {
    const fileName = path.basename(filePath, '.csv');
    console.log(`[ETL] Processing file: ${fileName}`);

    const rows = await this.readCSV(filePath);
    console.log(`[ETL] Read ${rows.length} rows from ${fileName}`);

    // Determine file type and route to appropriate transformer
    return this.transformAndLoad(syncId, accountName, fileName, rows);
  }

  /**
   * Read CSV file into array of objects
   */
  private async readCSV(filePath: string): Promise<Record<string, any>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, any>[] = [];

      fs.createReadStream(filePath)
        .pipe(csv.default())
        .on('data', (row: any) => {
          // Normalize column names
          const normalized: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            normalized[normalizeColumnName(key)] = value;
          }
          rows.push(normalized);
        })
        .on('end', () => resolve(rows))
        .on('error', (error: any) => reject(error));
    });
  }

  /**
   * Transform and load data based on file type
   */
  private transformAndLoad(
    syncId: string,
    accountName: string,
    fileName: string,
    rows: Record<string, any>[]
  ): Record<string, { inserted: number; updated: number; failed: number }> {
    const result: Record<string, { inserted: number; updated: number; failed: number }> = {};

    // Route to specific transformer based on filename pattern
    if (fileName.toLowerCase().includes('cluster_all_info')) {
      result['clusters'] = this.transformClusters(syncId, accountName, rows);
    } else if (fileName.toLowerCase().includes('all_nodes')) {
      result['nodes'] = this.transformNodes(syncId, rows);
    } else if (fileName.toLowerCase().includes('all_vms')) {
      result['vms'] = this.transformVMs(syncId, rows);
    } else if (fileName.toLowerCase().includes('storage_containers')) {
      result['storage_containers'] = this.transformStorageContainers(syncId, rows);
    } else if (fileName.toLowerCase().includes('license')) {
      result['licenses'] = this.transformLicenses(syncId, accountName, rows);
    } else if (fileName.toLowerCase().includes('case_history') || fileName.toLowerCase().includes('case history')) {
      result['cases'] = this.transformCases(syncId, accountName, rows);
    } else if (fileName.toLowerCase().includes('workload')) {
      result['workloads'] = this.transformWorkloads(syncId, accountName, rows);
    } else if (fileName.toLowerCase().includes('product_heatmap') || fileName.toLowerCase().includes('product heatmap')) {
      result['product_heatmap'] = this.transformProductHeatmap(syncId, accountName, rows);
    } else if (fileName.toLowerCase().includes('deal_registration') || fileName.toLowerCase().includes('deal registration')) {
      result['deal_registration'] = this.transformDealRegistration(syncId, accountName, rows);
    } else if (fileName.toLowerCase().includes('utilization')) {
      result['utilization'] = this.transformUtilization(syncId, rows);
    } else if (fileName.toLowerCase().includes('discoveries')) {
      result['discoveries'] = this.transformDiscoveries(syncId, accountName, rows);
    } else {
      this.log(syncId, 'warning', `Unknown file type, skipping: ${fileName}`, fileName);
    }

    return result;
  }

  /**
   * Transform cluster data
   */
  private transformClusters(
    syncId: string,
    accountName: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    const accountNameNormalized = normalizeAccountName(accountName);

    // Ensure account exists
    this.ensureAccount(accountNameNormalized, accountName);

    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO clusters (cluster_uuid, account_name_normalized, cluster_name, site, sw_version, license_state)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(cluster_uuid) DO UPDATE SET
        cluster_name = excluded.cluster_name,
        site = excluded.site,
        sw_version = excluded.sw_version,
        license_state = excluded.license_state,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const clusterUuid = extractClusterUuid(row) || generateId(accountNameNormalized, row.cluster_name || 'unknown');

        upsertStmt.run(
          clusterUuid,
          accountNameNormalized,
          row.cluster_name || row.name || null,
          row.site || null,
          row.sw_version || row.version || null,
          row.license_state || null
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert cluster:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed clusters: ${inserted} inserted, ${failed} failed`, 'clusters', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform node data
   */
  private transformNodes(
    syncId: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO nodes (node_id, cluster_uuid, model, cpu, memory_gb, gpu_model, serial)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(node_id) DO UPDATE SET
        model = excluded.model,
        cpu = excluded.cpu,
        memory_gb = excluded.memory_gb,
        gpu_model = excluded.gpu_model,
        serial = excluded.serial,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const clusterUuid = extractClusterUuid(row);
        if (!clusterUuid) {
          failed++;
          continue;
        }

        const nodeId = row.node_id || row.serial || generateId(clusterUuid, row.model, row.serial);

        upsertStmt.run(
          nodeId,
          clusterUuid,
          row.model || null,
          row.cpu || null,
          normalizeNumber(row.memory_gb),
          row.gpu_model || null,
          row.serial || null
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert node:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed nodes: ${inserted} inserted, ${failed} failed`, 'nodes', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform VM data
   */
  private transformVMs(
    syncId: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO vms (vm_uuid, cluster_uuid, vm_name, os, ip, power_state, owner)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(vm_uuid) DO UPDATE SET
        vm_name = excluded.vm_name,
        os = excluded.os,
        ip = excluded.ip,
        power_state = excluded.power_state,
        owner = excluded.owner,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const clusterUuid = extractClusterUuid(row);
        if (!clusterUuid) {
          failed++;
          continue;
        }

        const vmUuid = row.vm_uuid || row.uuid || generateId(clusterUuid, row.vm_name);

        upsertStmt.run(
          vmUuid,
          clusterUuid,
          row.vm_name || row.name || null,
          row.os || row.operating_system || null,
          row.ip || row.ip_address || null,
          row.power_state || null,
          row.owner || null
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert VM:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed VMs: ${inserted} inserted, ${failed} failed`, 'vms', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform storage container data
   */
  private transformStorageContainers(
    syncId: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO storage_containers (container_id, cluster_uuid, container_name, capacity_gb, used_gb, replication)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(container_id) DO UPDATE SET
        container_name = excluded.container_name,
        capacity_gb = excluded.capacity_gb,
        used_gb = excluded.used_gb,
        replication = excluded.replication,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const clusterUuid = extractClusterUuid(row);
        if (!clusterUuid) {
          failed++;
          continue;
        }

        const containerId = row.container_id || generateId(clusterUuid, row.container_name);

        upsertStmt.run(
          containerId,
          clusterUuid,
          row.container_name || row.name || null,
          normalizeNumber(row.capacity_gb) || normalizeNumber(row.capacity),
          normalizeNumber(row.used_gb) || normalizeNumber(row.used),
          row.replication || null
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert storage container:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed storage containers: ${inserted} inserted, ${failed} failed`, 'storage_containers', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform license data
   */
  private transformLicenses(
    syncId: string,
    accountName: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    const accountNameNormalized = normalizeAccountName(accountName);
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO licenses (license_key, cluster_uuid, account_name_normalized, sku, edition, expiry, entitlement_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(license_key) DO UPDATE SET
        cluster_uuid = excluded.cluster_uuid,
        account_name_normalized = excluded.account_name_normalized,
        sku = excluded.sku,
        edition = excluded.edition,
        expiry = excluded.expiry,
        entitlement_qty = excluded.entitlement_qty,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const clusterUuid = extractClusterUuid(row);
        const licenseKey = row.license_key || row.key || generateId(accountNameNormalized, row.sku, row.edition);

        upsertStmt.run(
          licenseKey,
          clusterUuid,
          accountNameNormalized,
          row.sku || null,
          row.edition || null,
          normalizeDate(row.expiry) || normalizeDate(row.expiration_date),
          normalizeNumber(row.entitlement_qty) || normalizeNumber(row.quantity)
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert license:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed licenses: ${inserted} inserted, ${failed} failed`, 'licenses', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform support case data
   */
  private transformCases(
    syncId: string,
    accountName: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    const accountNameNormalized = normalizeAccountName(accountName);
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO cases (case_number, account_name_normalized, cluster_uuid, severity, status, product, opened, closed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(case_number) DO UPDATE SET
        cluster_uuid = excluded.cluster_uuid,
        severity = excluded.severity,
        status = excluded.status,
        product = excluded.product,
        opened = excluded.opened,
        closed = excluded.closed,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const caseNumber = row.case_number || row.case_id || row.number;
        if (!caseNumber) {
          failed++;
          continue;
        }

        const clusterUuid = extractClusterUuid(row);

        upsertStmt.run(
          caseNumber,
          accountNameNormalized,
          clusterUuid,
          row.severity || null,
          row.status || null,
          row.product || null,
          normalizeDatetime(row.opened) || normalizeDatetime(row.created_date),
          normalizeDatetime(row.closed) || normalizeDatetime(row.closed_date)
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert case:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed cases: ${inserted} inserted, ${failed} failed`, 'cases', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform workload data
   */
  private transformWorkloads(
    syncId: string,
    accountName: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    const accountNameNormalized = normalizeAccountName(accountName);
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO workloads (workload_id, account_name_normalized, workload_name, category, priority, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(workload_id) DO UPDATE SET
        workload_name = excluded.workload_name,
        category = excluded.category,
        priority = excluded.priority,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const workloadName = row.workload_name || row.name;
        const workloadId = row.workload_id || generateId(accountNameNormalized, workloadName);

        upsertStmt.run(
          workloadId,
          accountNameNormalized,
          workloadName || null,
          row.category || null,
          row.priority || null,
          row.notes || null
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert workload:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed workloads: ${inserted} inserted, ${failed} failed`, 'workloads', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform product heatmap data
   */
  private transformProductHeatmap(
    syncId: string,
    accountName: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    const accountNameNormalized = normalizeAccountName(accountName);
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO product_heatmap (heatmap_id, account_name_normalized, product, propensity, interest_level, last_touch)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(heatmap_id) DO UPDATE SET
        propensity = excluded.propensity,
        interest_level = excluded.interest_level,
        last_touch = excluded.last_touch,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const product = row.product || row.product_name;
        const heatmapId = row.heatmap_id || generateId(accountNameNormalized, product);

        upsertStmt.run(
          heatmapId,
          accountNameNormalized,
          product || null,
          normalizeNumber(row.propensity),
          row.interest_level || null,
          normalizeDatetime(row.last_touch) || normalizeDatetime(row.last_contact)
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert product heatmap:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed product heatmap: ${inserted} inserted, ${failed} failed`, 'product_heatmap', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform deal registration data
   */
  private transformDealRegistration(
    syncId: string,
    accountName: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    const accountNameNormalized = normalizeAccountName(accountName);
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO deal_registration (deal_id, account_name_normalized, stage, amount, partner, oem, close_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(deal_id) DO UPDATE SET
        stage = excluded.stage,
        amount = excluded.amount,
        partner = excluded.partner,
        oem = excluded.oem,
        close_date = excluded.close_date,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const dealId = row.deal_id || generateId(accountNameNormalized, row.partner, row.close_date);

        upsertStmt.run(
          dealId,
          accountNameNormalized,
          row.stage || null,
          normalizeNumber(row.amount),
          row.partner || null,
          row.oem || null,
          normalizeDate(row.close_date)
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert deal:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed deal registrations: ${inserted} inserted, ${failed} failed`, 'deal_registration', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform utilization data
   */
  private transformUtilization(
    syncId: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO utilization (util_id, cluster_uuid, timestamp, cpu_pct, mem_pct, storage_pct, iops, latency_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(util_id) DO UPDATE SET
        cpu_pct = excluded.cpu_pct,
        mem_pct = excluded.mem_pct,
        storage_pct = excluded.storage_pct,
        iops = excluded.iops,
        latency_ms = excluded.latency_ms
    `);

    for (const row of rows) {
      try {
        const clusterUuid = extractClusterUuid(row);
        if (!clusterUuid) {
          failed++;
          continue;
        }

        const timestamp = normalizeDatetime(row.timestamp) || new Date().toISOString();
        const utilId = row.util_id || generateId(clusterUuid, timestamp);

        upsertStmt.run(
          utilId,
          clusterUuid,
          timestamp,
          normalizeNumber(row.cpu_pct),
          normalizeNumber(row.mem_pct) || normalizeNumber(row.memory_pct),
          normalizeNumber(row.storage_pct),
          normalizeNumber(row.iops),
          normalizeNumber(row.latency_ms) || normalizeNumber(row.latency)
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert utilization:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed utilization: ${inserted} inserted, ${failed} failed`, 'utilization', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Transform discovery data
   */
  private transformDiscoveries(
    syncId: string,
    accountName: string,
    rows: Record<string, any>[]
  ): { inserted: number; updated: number; failed: number } {
    const db = getDatabase();
    const accountNameNormalized = normalizeAccountName(accountName);
    let inserted = 0, updated = 0, failed = 0;

    const upsertStmt = db.prepare(`
      INSERT INTO discoveries (discovery_id, account_name_normalized, type, timestamp, notes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(discovery_id) DO UPDATE SET
        type = excluded.type,
        timestamp = excluded.timestamp,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `);

    for (const row of rows) {
      try {
        const discoveryId = row.discovery_id || generateId(accountNameNormalized, row.type, row.timestamp);

        upsertStmt.run(
          discoveryId,
          accountNameNormalized,
          row.type || row.discovery_type || null,
          normalizeDatetime(row.timestamp) || normalizeDatetime(row.date),
          row.notes || row.description || null
        );

        inserted++;
      } catch (error) {
        console.error('[ETL] Failed to insert discovery:', error);
        failed++;
      }
    }

    this.log(syncId, 'info', `Processed discoveries: ${inserted} inserted, ${failed} failed`, 'discoveries', inserted);
    return { inserted, updated, failed };
  }

  /**
   * Ensure account exists (upsert)
   */
  private ensureAccount(accountNameNormalized: string, displayName: string): void {
    const db = getDatabase();

    db.prepare(`
      INSERT INTO accounts (account_name_normalized, account_name_display)
      VALUES (?, ?)
      ON CONFLICT(account_name_normalized) DO UPDATE SET
        account_name_display = excluded.account_name_display,
        updated_at = CURRENT_TIMESTAMP
    `).run(accountNameNormalized, displayName);
  }

  /**
   * Get all account directories in the data folder
   */
  private getAccountDirectories(): string[] {
    try {
      const items = fs.readdirSync(this.dataDir);
      return items.filter(item => {
        const itemPath = path.join(this.dataDir, item);
        return fs.statSync(itemPath).isDirectory() && item !== 'etl';
      });
    } catch (error) {
      console.error('[ETL] Error reading data directory:', error);
      return [];
    }
  }

  /**
   * Get all CSV files in a directory
   */
  private getCsvFiles(dirPath: string): string[] {
    try {
      const files = fs.readdirSync(dirPath);
      return files.filter(file => file.toLowerCase().endsWith('.csv'));
    } catch (error) {
      console.error('[ETL] Error reading directory:', error);
      return [];
    }
  }

  /**
   * Log sync operation
   */
  private log(syncId: string, level: 'info' | 'warning' | 'error', message: string, tableName?: string | null, recordCount?: number): void {
    const db = getDatabase();

    db.prepare(`
      INSERT INTO sync_log (sync_id, level, message, table_name, record_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(syncId, level, message, tableName || null, recordCount || null);
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit: number = 10): any[] {
    const db = getDatabase();

    return db.prepare(`
      SELECT sync_id, status, started_at, completed_at, records_processed, records_failed, error_message
      FROM sync_runs
      ORDER BY started_at DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Get sync logs for a specific sync
   */
  getSyncLogs(syncId: string): any[] {
    const db = getDatabase();

    return db.prepare(`
      SELECT level, message, table_name, record_count, timestamp
      FROM sync_log
      WHERE sync_id = ?
      ORDER BY timestamp ASC
    `).all(syncId);
  }
}

export const etlService = new ETLService();
export default etlService;
