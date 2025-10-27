# WhiteCap Data Assistant — Software Specification
**Architecture:** SQLite (facts) + SQLite + `sqlite-vec` (vectors) + IndexedDB (offline cache)  
**Audience:** Agentic orchestration team (data/infra/app/ML)  
**Status:** v1.0 — ready to implement on a laptop or server

---

## 0) Quick Links to Seed Artifacts (from prior analysis)
These are provided to accelerate implementation and to serve as concrete examples:
- **CSV headers & samples:** `whitecap_headers.json` → contains column lists and two example rows per file.  
  _Download:_ `sandbox:/mnt/data/whitecap_headers.json`
- **Auto-detected field hints & schema draft:** `whitecap_detected_fields.json` → suggested normalized schema and detected key-like fields.  
  _Download:_ `sandbox:/mnt/data/whitecap_detected_fields.json`
- **Demo SQLite DB (first-pass):** `whitecap_demo.db` → raw tables (one per CSV), plus `accounts` and `clusters` rollups.  
  _Download:_ `sandbox:/mnt/data/whitecap_demo.db`
- **Embeddings-ready summaries:** `whitecap_summaries.jsonl` → compact per-account / per-cluster summaries suitable for vector search.  
  _Download:_ `sandbox:/mnt/data/whitecap_summaries.jsonl`

> These artifacts are **illustrative**. The implementation below shows how to re-create/refresh them from source CSVs in a fully automated way.

---

## 1) Objectives & Non-Goals
**Objectives**
1. Provide a **truth layer** with **correct, joinable facts** from the provided WhiteCap CSVs.
2. Provide a **semantic discovery layer** for fuzzy queries (“who looks AI-ready / at-risk?”) that resolves back to truth.
3. Expose the data via **stable tool APIs** (HTTP + MCP) for LLMs/agents to retrieve **only minimal slices** into prompt context.
4. Support **offline UX** via IndexedDB cache; re-sync when online.
5. Keep everything runnable on a **single laptop/container**, with a path to scale later.

**Non-Goals**
- Replacing enterprise warehouses or MDM; this is a **portable assistant store**.
- Training models; we only do light **summarization** + **embeddings** for retrieval.

---

## 2) High-Level Architecture
```
           ┌────────────────────────────────────────────────┐
           │                 LLM / Agent(s)                  │
           │   • tool calls (function calling / MCP)         │
           │   • prompt receives ONLY small JSON slices      │
           └───────────────▲───────────────────┬─────────────┘
                           │                   │
                    semantic_search      get_* (facts)
                           │                   │
                 ┌─────────┴─────────┐   ┌────┴────────────────┐
                 │  Vector Layer      │   │   Truth Layer       │
                 │  SQLite + sqlite-vec│  │   SQLite (ACID)     │
                 │  (summaries.jsonl) │   │   normalized tables │
                 └─────────▲─────────┘   └──────────▲──────────┘
                           │                         │
                 Embed Summaries             ETL from CSVs
                           │                         │
                 ┌─────────┴──────────┐      ┌──────┴────────────────────────┐
                 │  Summarizer (Job)  │      │   Raw CSVs (WhiteCap_*.csv)   │
                 │  • per account/cluster    │   + validation + mapping       │
                 └─────────────────────┘      └───────────────────────────────┘

                               (Optional Offline Cache)
                                      │
                           ┌──────────┴──────────┐
                           │  IndexedDB (PWA)    │
                           │ • accounts, clusters│
                           │ • denormalized views│
                           └──────────────────────┘
```

---

## 3) Source Inputs (concrete)
The current dataset includes (examples):
- `WhiteCap_CS720_All_VMs.csv`
- `WhiteCap_SC720_All_nodes.csv`
- `WhiteCap_CS720_Storage_Containers.csv`
- `WhiteCap_CS720_Cluster_All_Info.csv`
- `WhiteCap_CS720_Resource_Utilization_-_All.csv`
- `WhiteCap_CS720_Licenses.csv`, `WhiteCap_CS720_License_report.csv`, `WhiteCap_CS720_Orders_Assets_Licenses.csv`, `WhiteCap_CS720_All_block_SW_assets.csv`
- `WhiteCap_CS720_Support_Case_History.csv`, `WhiteCap_CS720_Support_Case_Distribution.csv`, `WhiteCap Resources Case History 90 Days.csv`
- `WhiteCap Resources Workloads.csv`, `WhiteCap Resources Product Heatmap.csv`, `WhiteCap Resources Deal Registration.csv`
- `WhiteCap_CS720_All_Discoveries.csv`

**Natural keys we rely on**
- `AccountNameNormalized` (derived from “Account Name” variants)  
  Lowercase, trimmed, punctuation/suffix normalized (e.g., strip “, inc.”).
- `ClusterUUID` (appears across infra exports)

---

## 4) Normalized Target Data Model (SQLite)
> Keep original “raw_*” tables for lineage. Populate clean tables below via `INSERT…SELECT` transforms.

### 4.1 Tables
**accounts**
- `account_name_normalized TEXT PRIMARY KEY`
- `region TEXT NULL`
- `theater TEXT NULL`
- `ae_email TEXT NULL`
- `se_owner_email TEXT NULL`
- indices: `(region)`, `(theater)`, `(ae_email)`, `(se_owner_email)`

**clusters**
- `cluster_uuid TEXT PRIMARY KEY`
- `account_name_normalized TEXT REFERENCES accounts(account_name_normalized)`
- `cluster_name TEXT NULL`
- `site TEXT NULL`
- `sw_version TEXT NULL`
- `license_state TEXT NULL`
- indices: `(account_name_normalized)`, `(cluster_name)`

**nodes**
- `node_id TEXT PRIMARY KEY`  -- prefer serial/UUID when available
- `cluster_uuid TEXT REFERENCES clusters(cluster_uuid)`
- `model TEXT NULL`, `cpu TEXT NULL`, `memory_gb REAL NULL`, `gpu_model TEXT NULL`, `serial TEXT NULL`
- indices: `(cluster_uuid)`

**vms**
- `vm_uuid TEXT PRIMARY KEY`
- `cluster_uuid TEXT REFERENCES clusters(cluster_uuid)`
- `vm_name TEXT NULL`, `os TEXT NULL`, `ip TEXT NULL`, `power_state TEXT NULL`, `owner TEXT NULL`
- indices: `(cluster_uuid)`, `(vm_name)`

**storage_containers**
- `container_id TEXT PRIMARY KEY`  -- or (cluster_uuid, container_name) composite
- `cluster_uuid TEXT REFERENCES clusters(cluster_uuid)`
- `container_name TEXT NULL`, `capacity_gb REAL NULL`, `used_gb REAL NULL`, `replication TEXT NULL`
- indices: `(cluster_uuid)`

**licenses**
- `license_key TEXT PRIMARY KEY`  -- or (account, sku) if that’s canonical
- `cluster_uuid TEXT NULL REFERENCES clusters(cluster_uuid)`
- `account_name_normalized TEXT NULL REFERENCES accounts(account_name_normalized)`
- `sku TEXT NULL`, `edition TEXT NULL`, `expiry DATE NULL`, `entitlement_qty INTEGER NULL`
- indices: `(account_name_normalized)`, `(cluster_uuid)`, `(expiry)`

**cases**
- `case_number TEXT PRIMARY KEY`
- `account_name_normalized TEXT REFERENCES accounts(account_name_normalized)`
- `cluster_uuid TEXT NULL REFERENCES clusters(cluster_uuid)`
- `severity TEXT NULL`, `status TEXT NULL`, `product TEXT NULL`, `opened DATETIME NULL`, `closed DATETIME NULL`
- indices: `(account_name_normalized)`, `(cluster_uuid)`, `(opened)`, `(status)`

**workloads**
- `workload_id TEXT PRIMARY KEY`  -- synthetic: hash(account, workload_name)
- `account_name_normalized TEXT REFERENCES accounts(account_name_normalized)`
- `workload_name TEXT NULL`, `category TEXT NULL`, `priority TEXT NULL`, `notes TEXT NULL`

**product_heatmap**
- `heatmap_id TEXT PRIMARY KEY`  -- synthetic: hash(account, product)
- `account_name_normalized TEXT REFERENCES accounts(account_name_normalized)`
- `product TEXT`, `propensity REAL NULL`, `interest_level TEXT NULL`, `last_touch DATETIME NULL`

**deal_registration**
- `deal_id TEXT PRIMARY KEY`
- `account_name_normalized TEXT REFERENCES accounts(account_name_normalized)`
- `stage TEXT NULL`, `amount REAL NULL`, `partner TEXT NULL`, `oem TEXT NULL`, `close_date DATE NULL`

**utilization**
- `util_id TEXT PRIMARY KEY`  -- synthetic: hash(cluster_uuid, timestamp)
- `cluster_uuid TEXT REFERENCES clusters(cluster_uuid)`
- `timestamp DATETIME NOT NULL`
- `cpu_pct REAL NULL`, `mem_pct REAL NULL`, `storage_pct REAL NULL`, `iops REAL NULL`, `latency_ms REAL NULL`
- indices: `(cluster_uuid, timestamp DESC)`

**discoveries**
- `discovery_id TEXT PRIMARY KEY`
- `account_name_normalized TEXT REFERENCES accounts(account_name_normalized)`
- `type TEXT NULL`, `timestamp DATETIME NULL`, `notes TEXT NULL`

### 4.2 Canonical Normalizations
**AccountNameNormalized(text):**
- lowercase
- trim whitespace
- remove trailing company suffixes: `,? (inc|corp|ltd|llc)\.?$`
- collapse multiple spaces
- remove trailing punctuation

**Date/Time:**
- Parse to `YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS` (UTC or agreed TZ)

**Numbers:**
- Strip thousands separators and coerce to REAL/INTEGER

**Deduping:**
- Prefer stable IDs (VM UUID, Cluster UUID). Else synthesize, e.g., SHA1 of concatenated natural keys.

---

## 5) ETL Workflow (Re-creatable by Agents)

### 5.1 File Intake
- Accept all `WhiteCap_*.csv` files into `/data/incoming`.
- For each file:
  - Auto-detect encoding (UTF-8, latin-1 fallback).
  - Tolerate malformed lines but log & report counts.
  - Trim column names; normalize to snake_case lower.

### 5.2 Raw Landing Tables
- Create table per CSV file: `raw_<filename_stem>` or use exact snake_case of the filename.
- Add helper projected columns when present:
  - `accountnamenormalized` (from any “account name” column variant)
  - `clusteruuid` (pass-through)

### 5.3 Transform → Normalized
Populate clean tables with `INSERT…SELECT` from raw tables, applying:
- key derivations (synthetic IDs where needed)
- type coercions (dates, numerics)
- deduplication (window functions by natural key + latest timestamp)
- referential checks (only insert clusters with a valid account or allow NULL then repair in reconcile step)

### 5.4 Data Quality Gates
- **Counts:** per table vs prior run
- **Nulls:** ensure key fields < 0.1% null (except explicitly nullable)
- **Key collisions:** 0 tolerated on PKs
- **Referential integrity:** fk violations reported

If DQ fails → flag build and do not publish.

---

## 6) Summaries & Embeddings (Vector Layer on SQLite + sqlite-vec)
**Goal:** support fuzzy discovery while keeping facts grounded.

### 6.1 What to Summarize
- **Per Account:** counts of clusters, cases (last 30/90d), workloads mentioning AI/containers/GPU, product heatmap highlights, renewal/licensing posture.
- **Per Cluster:** role (prod/dev), notable workloads (ERP, AI inference), hot metrics (utilization peaks), storage headroom, active cases.

A seed corpus is provided: `whitecap_summaries.jsonl` (download above).

### 6.2 Embedding Generation
- Use a local embedding model or API.
- Store **(id, type, account_name_normalized?, cluster_uuid?, text, embedding, updated_at)** in SQLite.

### 6.3 SQLite + sqlite-vec
We will store vectors in SQLite and enable vector search with the `sqlite-vec` extension.

**Install/Load (platform-specific):**
- Build or download the `sqlite-vec` extension shared library (consult the project docs).  
- Load in SQLite session:
  ```sql
  SELECT load_extension('/path/to/sqlite-vec'); 
  ```

**Schema (generic, using a normal table for metadata + vector column):**
```sql
CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  etype TEXT NOT NULL CHECK(etype IN ('account_summary','cluster_summary')),
  account_name_normalized TEXT NULL,
  cluster_uuid TEXT NULL,
  text TEXT NOT NULL,
  dim INTEGER NOT NULL,
  embedding BLOB NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Depending on the sqlite-vec build, you may need to create an index/auxiliary virtual table
-- to accelerate ANN search. Consult your chosen build and finalize the DDL accordingly.
```

**Semantic Search (pseudocode):**
```sql
-- Assume a query embedding is :query_vec
SELECT id, etype, account_name_normalized, cluster_uuid, text
FROM embeddings
-- WHERE <vector index> MATCH :query_vec
ORDER BY distance(embedding, :query_vec) ASC
LIMIT :k;
```

**Fallback:** If `sqlite-vec` is unavailable, perform top-k in Python and preserve the same API outputs.

---

## 7) API Service (Facts + Semantic) for Tool Calls
**Stack:** FastAPI, sqlite3

**Env:**
- `DB_PATH=/data/whitecap.db`
- `VEC_EXT=/extensions/sqlite-vec.so`
- `EMBED_DIM=768`

**Endpoints**
- `GET /search/semantic?q=...&k=5` → top-k summary hits
- `GET /accounts/{account}/overview` → facts slice for account
- `GET /clusters/{uuid}/health?window_days=7` → facts slice for cluster

**Errors:** 400 (input), 500 (server). JSON schema `{error:{type,message,details?}}`

---

## 8) MCP Tools
File: `mcp/whitecap.mcp.json`
```json
{
  "name": "whitecap",
  "version": "0.1.0",
  "tools": [
    {
      "name": "semantic_search",
      "description": "Semantic search over account and cluster summaries",
      "inputSchema": {
        "type":"object",
        "properties":{"query":{"type":"string"},"top_k":{"type":"integer","default":5}},
        "required":["query"]
      }
    },
    {
      "name": "get_account_overview",
      "description": "Structured overview for an account (facts from SQLite)",
      "inputSchema": {
        "type":"object",
        "properties":{"account_name_normalized":{"type":"string"}},
        "required":["account_name_normalized"]
      }
    },
    {
      "name": "get_cluster_health",
      "description": "Structured health snapshot for a cluster (facts from SQLite)",
      "inputSchema": {
        "type":"object",
        "properties":{"cluster_uuid":{"type":"string"},"window_days":{"type":"integer","default":7}},
        "required":["cluster_uuid"]
      }
    }
  ]
}
```

**Agent rule:** fuzzy → `semantic_search` → fact checks via `get_*` → answer from returned JSON only.

---

## 9) IndexedDB (Offline Cache)
**Stores:** `accounts`, `clusters`, `cases`, `summaries`  
**Sync:** periodic pull of deltas; SW caches responses; server is source-of-truth.

TypeScript init:
```ts
const db = await openDB('whitecap', 1, {
  upgrade(db) {
    db.createObjectStore('accounts', { keyPath: 'account_name_normalized' });
    const clusters = db.createObjectStore('clusters', { keyPath: 'cluster_uuid' });
    clusters.createIndex('by_account', 'account_name_normalized', { unique: false });
    db.createObjectStore('cases', { keyPath: 'case_number' });
    db.createObjectStore('summaries', { keyPath: 'id' });
  }
});
```

---

## 10) Deployment

**Dockerfile**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y curl ca-certificates build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV DB_PATH=/data/whitecap.db
ENV VEC_EXT=/extensions/sqlite-vec.so
ENV EMBED_DIM=768
EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

**requirements.txt**
```
fastapi
uvicorn
pydantic
python-dotenv
numpy
sqlite-utils
```

Run:
```bash
docker build -t whitecap-assistant .
docker run -p 8000:8000 -v $(pwd)/data:/data -v $(pwd)/extensions:/extensions whitecap-assistant
```

---

## 11) Security, Observability, Testing, Runbooks
- **Security:** least-priv file perms; secrets via env; mask any PII in summaries.
- **Observability:** JSON logs, Prometheus counters, `/healthz` endpoint (checks DB + vec ext).
- **Testing:** unit tests for normalizers, ETL SQL, API contracts, vector smoke tests.
- **Runbooks:** daily refresh (`etl` → `summarize` → `embed`), failure handling (parse errors, vec fallback).

---

## 12) Makefile Targets (suggested)
```makefile
DATA_DIR ?= ./data
DB       ?= $(DATA_DIR)/whitecap.db
SUMMARIES?= $(DATA_DIR)/whitecap_summaries.jsonl

.PHONY: etl summarize embed api all

etl:
	python etl.py --incoming $(DATA_DIR)/incoming --db $(DB)

summarize:
	python summarize.py --db $(DB) --out $(SUMMARIES)

embed:
	python embed.py --db $(DB) --summaries $(SUMMARIES) --vec-ext $$VEC_EXT --dim $$EMBED_DIM

api:
	uvicorn api:app --host 0.0.0.0 --port 8000

all: etl summarize embed api
```

---

## 13) Acceptance Criteria
- Fresh CSVs ingested → normalized tables updated with correct joins on `AccountNameNormalized` and `ClusterUUID`.
- Semantic search returns coherent top-k with traceable IDs.
- Tool calls return bounded JSON slices suitable for prompt context.
- Offline cache works; data refreshes when online.
- End-to-end: “pre-meeting prep” and “who’s at risk” produce grounded answers.

---

**End of Specification.**
