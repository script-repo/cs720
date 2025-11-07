# GitOps Architecture - Complete Technical Guide

**CS720 Platform - Containerized Deployment with Flux CD**

This document provides an exhaustive explanation of the GitOps architecture, deployment process, scaling mechanisms, and failure modes for the CS720 platform.

---

## Table of Contents

1. [What is GitOps?](#what-is-gitops)
2. [The Complete Architecture](#the-complete-architecture)
3. [The Complete GitOps Flow](#the-complete-gitops-flow)
4. [Scaling Process](#scaling-process)
5. [Failure Modes](#failure-modes)
6. [Monitoring and Observability](#monitoring-and-observability)

---

## What is GitOps?

Imagine your Git repository is like a blueprint for your entire application. GitOps means:

- **Git is the single source of truth** - Everything about how your app should run is stored in Git
- **Automatic deployment** - When you push changes to Git, they automatically deploy to your servers
- **Self-healing** - If someone manually changes something on the servers, the system automatically changes it back to match Git
- **Full history** - Every change is tracked, so you can see who changed what and when

Think of it like Google Docs auto-save, but for your entire infrastructure.

---

## The Complete Architecture

### Component 1: Your Code Repository (GitHub)

**What it contains:**

```
cs720/
├── Source code (frontend, backend, services)
├── Dockerfiles (recipes for building containers)
├── k8s/ (Kubernetes manifests - deployment blueprints)
└── flux/ (GitOps automation config)
```

**How it works:**

- Developers write code and push to GitHub
- Git stores every version of every file
- This is your "desired state" - how everything SHOULD be

---

### Component 2: GitHub Actions (CI/CD Pipeline)

**What it does:**

When you push code to the `main` branch:

1. **Triggers automatically** - GitHub detects the push

2. **Builds container images** - for each service:
   - Reads the Dockerfile (build recipe)
   - Compiles your TypeScript code
   - Bundles everything into a container image
   - This happens WITHOUT Docker daemon (uses buildx/buildkit)
   - Creates OCI-compliant images (works with containerd)

3. **Tags images** with multiple versions:
   - `latest` - always points to newest build from main
   - `main-abc123` - specific commit SHA
   - `v1.2.3` - if you create a version tag
   - `1.2` - semantic version without patch

4. **Pushes to GitHub Container Registry (ghcr.io)**:
   - Your images are stored like Docker Hub, but integrated with GitHub
   - Example: `ghcr.io/script-repo/cs720-frontend:latest`

**Why this matters:**

- No manual building needed
- Every commit gets a unique, traceable image
- Images are immutable (never change once built)
- You can always roll back to any previous version

---

### Component 3: Kubernetes Cluster

**What Kubernetes is:**

Think of Kubernetes as an intelligent fleet manager for containers:

- You tell it "I want 3 frontend servers running"
- It finds servers with available resources
- It starts the containers
- If one crashes, it starts a new one automatically
- If a server dies, it moves containers to healthy servers

**Your cluster structure:**

```
Kubernetes Cluster
├── Namespace: cs720 (isolated environment for your app)
│   ├── Frontend Pods (3 replicas)
│   │   └── nginx serving React app (port 8080)
│   ├── Backend Pods (3 replicas)
│   │   └── Fastify API + SQLite (port 3001)
│   ├── Proxy Pods (2 replicas)
│   │   └── CORS proxy (port 3002)
│   └── AI Service Pods (2 replicas)
│       └── LLM integration (port 3003)
└── Namespace: flux-system (Flux's control center)
    ├── source-controller (watches GitHub)
    ├── kustomize-controller (applies manifests)
    ├── helm-controller (not used in your setup)
    └── notification-controller (can alert you)
```

**Key Kubernetes concepts:**

#### Pods

- Smallest unit in Kubernetes
- One or more containers that run together
- Your app runs in pods
- Each pod gets its own IP address

#### Deployments

- Manages a set of identical pods
- Ensures desired number of replicas are always running
- Handles rolling updates

#### Services

- Stable network endpoint for pods
- Pods come and go (die/restart), services stay
- Example: `cs720-backend` service always points to backend pods
- Internal DNS: `http://cs720-backend:3001`

#### Ingress

- Routes external traffic into your cluster
- Like a reverse proxy/load balancer
- One domain, multiple backend services
- Example:
  ```
  your-domain.com/       → frontend service
  your-domain.com/api    → backend service
  your-domain.com/proxy  → proxy service
  ```

#### ConfigMaps

- Store configuration (non-sensitive)
- Environment variables
- Example: `PORT=3001`, `NODE_ENV=production`

#### Secrets

- Store sensitive data (passwords, API keys)
- Base64 encoded (NOT encrypted by default)
- You should use Sealed Secrets or External Secrets in production

#### PersistentVolumeClaim (PVC)

- Requests storage from the cluster
- Backend uses this for SQLite database file
- Data survives pod restarts

---

### Component 4: Flux CD (The GitOps Engine)

**What Flux does:**

Flux is like a robot that constantly:
1. Watches your Git repository for changes
2. Compares Git to what's running in Kubernetes
3. Makes Kubernetes match Git automatically

**Flux Components:**

#### 1. Source Controller (watches Git)

```yaml
GitRepository: cs720
  ├── URL: https://github.com/script-repo/cs720
  ├── Branch: main
  ├── Interval: Check every 1 minute
  └── Path: /k8s/ (only care about this folder)
```

**How it works:**

- Every minute, Flux fetches the latest commit from GitHub
- If there's a new commit, it downloads the changed files
- Stores them internally for other Flux components to use

#### 2. Kustomize Controller (applies changes)

```yaml
Kustomization: cs720
  ├── Source: GitRepository/cs720
  ├── Path: ./k8s/base
  ├── Interval: Reconcile every 5 minutes
  ├── Prune: true (delete resources removed from Git)
  └── Health Checks: Wait for deployments to be ready
```

**How it works:**

- Reads Kubernetes manifests from Git
- Uses Kustomize to process them (merging, patching)
- Applies them to Kubernetes
- Checks if deployments are healthy
- If something fails, retries automatically

#### 3. Image Automation (optional)

This is more advanced - automatically updates image tags in Git:

```yaml
ImageRepository: cs720-frontend
  ├── Scans: ghcr.io/script-repo/cs720-frontend
  ├── Interval: Every 5 minutes
  └── Finds: New image tags

ImagePolicy: cs720-frontend
  ├── Uses: ImageRepository/cs720-frontend
  └── Selects: Latest semver tag (v1.2.3)

ImageUpdateAutomation: cs720
  ├── Watches: All ImagePolicies
  ├── Updates: k8s/base/*.yaml files
  └── Commits: Back to Git with new image tags
```

**How it works:**

- Flux checks GHCR for new images
- When it finds one (e.g., `v1.0.5`), it:
  - Updates the Kubernetes manifest in Git
  - Commits the change: "Automated image update: frontend v1.0.5"
  - Pushes to GitHub
- Then the normal GitOps cycle triggers deployment

---

## The Complete GitOps Flow

Let me walk through a real example: You add a new feature to the frontend.

### Step 1: Developer Makes Changes

```bash
# You're working locally
vim frontend/src/components/NewFeature.tsx

# Make changes, test locally
npm run dev

# Commit and push
git add .
git commit -m "Add awesome new feature"
git push origin main
```

**What happens:**

- Git receives your push
- Stores the new commit (e.g., SHA: `abc1234`)

---

### Step 2: GitHub Actions Builds Images

**Trigger:**

- GitHub Actions detects push to `main` branch
- Starts workflow: `.github/workflows/build-images.yml`

**Build Process (for each service):**

```
GitHub Actions Runner (Ubuntu VM)
├── Step 1: Checkout code
│   └── Git clone with commit abc1234
│
├── Step 2: Set up buildx
│   └── Install build tools (not Docker daemon!)
│
├── Step 3: Login to GHCR
│   └── Authenticate with GITHUB_TOKEN
│
├── Step 4: Build frontend image
│   ├── Read: frontend/Dockerfile
│   ├── Stage 1 (builder):
│   │   ├── Base: node:20-alpine
│   │   ├── npm ci (install dependencies)
│   │   ├── npm run build (compile TypeScript, bundle with Vite)
│   │   └── Output: /app/dist/
│   │
│   └── Stage 2 (production):
│       ├── Base: nginx:alpine
│       ├── Copy: nginx.conf → /etc/nginx/
│       ├── Copy: dist/ → /usr/share/nginx/html/
│       ├── User: nginx (non-root)
│       └── Result: Minimal image (~50MB)
│
└── Step 5: Push to registry
    ├── Tag: ghcr.io/you/cs720-frontend:latest
    ├── Tag: ghcr.io/you/cs720-frontend:main-abc1234
    └── Push to GHCR
```

**Parallel builds:**

- All 4 services build at the same time (matrix strategy)
- Frontend, backend, proxy, ai-service
- Total time: ~3-5 minutes

**What you get:**

- New images in GHCR with multiple tags
- Each image is immutable (content never changes)
- Full audit trail (commit → image)

---

### Step 3: Flux Detects Changes

**Source Controller checks Git (every 1 minute):**

```
Flux Source Controller
├── Fetch: https://github.com/you/cs720
├── Current commit in cluster: xyz7890
├── Latest commit in GitHub: abc1234
├── Difference detected!
└── Download: New manifests from abc1234
```

**Even if you didn't change k8s/ manifests:**

- Flux still detects the commit
- But Kustomize Controller sees no manifest changes
- No deployment happens (images are still `latest` tag)

**If you DID change k8s/ manifests:**

- Flux downloads new YAML files
- Prepares to apply them

---

### Step 4: Kustomize Controller Reconciles

**With image automation enabled:**

```
Image Reflector Controller (every 5 minutes)
├── Scan GHCR: ghcr.io/you/cs720-frontend
├── Find tags:
│   ├── latest (digest: sha256:new123)
│   ├── main-abc1234
│   └── v1.0.5 (newest semver)
│
├── Current tag in Git: v1.0.4
├── New tag available: v1.0.5
└── Update needed!

Image Automation Controller
├── Update: k8s/base/frontend-deployment.yaml
│   └── Change: image: ...frontend:v1.0.4 → v1.0.5
├── Commit to Git: "Automated image update"
└── Push to GitHub

Source Controller (detects new commit)
└── Download: Updated manifests

Kustomize Controller
├── Read: k8s/base/frontend-deployment.yaml
├── Current state in cluster:
│   └── image: ghcr.io/you/cs720-frontend:v1.0.4
├── Desired state in Git:
│   └── image: ghcr.io/you/cs720-frontend:v1.0.5
└── Apply changes!
```

---

### Step 5: Kubernetes Rolling Update

**Deployment Controller takes over:**

```
Kubernetes Deployment: cs720-frontend
├── Current state:
│   ├── Replica 1: v1.0.4 (running, healthy)
│   ├── Replica 2: v1.0.4 (running, healthy)
│   └── Replica 3: v1.0.4 (running, healthy)
│
├── Desired state (from Flux):
│   └── image: v1.0.5 (3 replicas)
│
└── Rolling Update Strategy:
    ├── maxSurge: 1 (can have 4 pods during update)
    └── maxUnavailable: 1 (min 2 must stay running)
```

**The update process:**

```
Time: 0s
├── Replica 1: v1.0.4 ✓ (serving traffic)
├── Replica 2: v1.0.4 ✓ (serving traffic)
├── Replica 3: v1.0.4 ✓ (serving traffic)
└── CREATE: Replica 4: v1.0.5 (starting...)

Time: 10s
├── Replica 1: v1.0.4 ✓ (serving traffic)
├── Replica 2: v1.0.4 ✓ (serving traffic)
├── Replica 3: v1.0.4 ✓ (serving traffic)
└── Replica 4: v1.0.5 ✓ (healthy! starts serving)

Time: 15s
├── Replica 1: v1.0.4 ✓ (serving traffic)
├── Replica 2: v1.0.4 ✓ (serving traffic)
├── DELETE: Replica 3: v1.0.4 (draining connections...)
├── Replica 4: v1.0.5 ✓ (serving traffic)
└── CREATE: Replica 5: v1.0.5 (starting...)

Time: 25s
├── Replica 1: v1.0.4 ✓ (serving traffic)
├── Replica 2: v1.0.4 ✓ (serving traffic)
├── Replica 4: v1.0.5 ✓ (serving traffic)
└── Replica 5: v1.0.5 ✓ (healthy! starts serving)

Time: 30s
├── DELETE: Replica 1: v1.0.4 (draining...)
├── Replica 2: v1.0.4 ✓ (serving traffic)
├── Replica 4: v1.0.5 ✓ (serving traffic)
├── Replica 5: v1.0.5 ✓ (serving traffic)
└── CREATE: Replica 6: v1.0.5 (starting...)

Time: 40s
├── Replica 2: v1.0.4 ✓ (serving traffic)
├── Replica 4: v1.0.5 ✓ (serving traffic)
├── Replica 5: v1.0.5 ✓ (serving traffic)
└── Replica 6: v1.0.5 ✓ (healthy! starts serving)

Time: 45s
├── DELETE: Replica 2: v1.0.4 (draining...)
├── Replica 4: v1.0.5 ✓ (serving traffic)
├── Replica 5: v1.0.5 ✓ (serving traffic)
└── Replica 6: v1.0.5 ✓ (serving traffic)

Time: 50s (COMPLETE)
├── Replica 4: v1.0.5 ✓ (serving traffic)
├── Replica 5: v1.0.5 ✓ (serving traffic)
└── Replica 6: v1.0.5 ✓ (serving traffic)
```

**Zero downtime achieved because:**

- Always at least 2 pods serving traffic
- New pods must pass health checks before serving
- Old pods drain existing connections gracefully

---

### Step 6: Health Checks Verify Success

**Kubernetes runs two types of probes:**

#### Readiness Probe (is pod ready to serve traffic?)

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5    # Wait 5s after container starts
  periodSeconds: 5          # Check every 5s
  timeoutSeconds: 3         # Response must come within 3s
  failureThreshold: 3       # 3 failures = remove from service
```

**What happens:**

```
Pod starts
├── 5s: Wait (initialDelaySeconds)
├── 5s: GET http://pod-ip:8080/health
│   └── Response: 200 OK → READY! Add to service
├── 10s: Check again → 200 OK → Still ready
├── 15s: Check again → 200 OK → Still ready
└── (continues every 5s)
```

**If a check fails:**

```
├── 20s: GET /health → Timeout (no response)
│   └── Failure count: 1
├── 25s: GET /health → 500 Internal Server Error
│   └── Failure count: 2
├── 30s: GET /health → Timeout
│   └── Failure count: 3 → NOT READY!
│       └── Remove from service (stop sending traffic)
├── 35s: GET /health → 200 OK
│   └── Failure count: 0 → READY again!
│       └── Add back to service
```

#### Liveness Probe (is pod healthy or should we restart it?)

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10   # Wait longer before first check
  periodSeconds: 10         # Check every 10s
  failureThreshold: 3       # 3 failures = restart pod
```

**What happens if pod becomes unhealthy:**

```
├── 30s: GET /health → 200 OK → Healthy
├── 40s: GET /health → 200 OK → Healthy
├── 50s: GET /health → Timeout
│   └── Failure count: 1
├── 60s: GET /health → Timeout
│   └── Failure count: 2
├── 70s: GET /health → Timeout
│   └── Failure count: 3 → UNHEALTHY!
│       └── RESTART container
├── Container restarts
├── 10s after restart: Wait (initialDelaySeconds)
├── 20s: GET /health → 200 OK → Healthy again!
```

#### The /health endpoint (you need to implement this)

```typescript
// services/backend/src/server.ts
app.get('/health', async (req, res) => {
  // Check critical dependencies
  try {
    // Can we query the database?
    await db.query('SELECT 1');

    // Is there enough memory?
    const memUsage = process.memoryUsage().heapUsed;
    if (memUsage > 450 * 1024 * 1024) { // 450MB of 512MB limit
      return res.status(503).send('Memory pressure');
    }

    // Everything OK
    return res.status(200).send('healthy');
  } catch (error) {
    return res.status(503).send('unhealthy');
  }
});
```

---

## Scaling Process

### Types of Scaling

#### 1. Manual Scaling

```bash
# Scale frontend to 5 replicas
kubectl scale deployment cs720-frontend --replicas=5 -n cs720
```

**What happens:**

```
Current: 3 pods
Desired: 5 pods

Kubernetes Deployment Controller:
├── Calculate: Need 2 more pods
├── CREATE Pod 4:
│   ├── Schedule: Find node with available CPU/memory
│   ├── Pull image: ghcr.io/.../cs720-frontend:latest
│   ├── Start container
│   ├── Wait: initialDelaySeconds (5s)
│   ├── Check: Readiness probe
│   └── Ready: Add to service
│
└── CREATE Pod 5: (same process)

Result: 5 pods running (30 seconds total)
```

**The scheduling process:**

```
Kubernetes Scheduler
├── Pod 4 needs:
│   ├── CPU request: 50m (0.05 cores)
│   └── Memory request: 64Mi
│
├── Check all nodes:
│   ├── Node 1:
│   │   ├── Total: 4 CPUs, 16GB RAM
│   │   ├── Used: 2 CPUs, 8GB RAM
│   │   └── Available: 2 CPUs, 8GB RAM ✓ Fits!
│   ├── Node 2:
│   │   ├── Total: 4 CPUs, 16GB RAM
│   │   ├── Used: 3.9 CPUs, 15GB RAM
│   │   └── Available: 0.1 CPUs, 1GB RAM ✗ Doesn't fit
│   └── Node 3: ...
│
├── Selected: Node 1
├── Assign: Pod 4 → Node 1
└── Kubelet on Node 1: Start the pod
```

---

#### 2. Horizontal Pod Autoscaling (HPA)

This is automatic scaling based on metrics.

**Your configuration:**

```yaml
HorizontalPodAutoscaler: cs720-frontend-hpa
├── Target: Deployment/cs720-frontend
├── Min replicas: 3
├── Max replicas: 10
├── Metrics:
│   ├── CPU: Target 70% utilization
│   └── Memory: Target 80% utilization
└── Behavior:
    ├── Scale up: Fast (100% or 2 pods every 30s)
    └── Scale down: Slow (50% every 60s, wait 5min)
```

**How HPA works:**

##### Step 1: Metrics Collection

```
Every 15 seconds:

Metrics Server
├── Query: kubelet on each node
├── Collect:
│   ├── Pod 1: CPU 45%, Memory 60%
│   ├── Pod 2: CPU 85%, Memory 75%
│   └── Pod 3: CPU 90%, Memory 82%
│
└── Calculate averages:
    ├── CPU: (45 + 85 + 90) / 3 = 73.3%
    └── Memory: (60 + 75 + 82) / 3 = 72.3%
```

##### Step 2: Decision Making

```
HPA Controller (checks every 15s)
├── Current state:
│   ├── Replicas: 3
│   ├── CPU usage: 73.3%
│   └── Memory usage: 72.3%
│
├── Target:
│   ├── CPU: 70%
│   └── Memory: 80%
│
├── Calculate needed replicas:
│   ├── For CPU: 3 × (73.3 / 70) = 3.14 → Round up to 4
│   └── For Memory: 3 × (72.3 / 80) = 2.7 → Round to 3
│
├── Pick highest: 4 replicas
└── Decision: SCALE UP from 3 to 4
```

##### Step 3: Execution

```
HPA → Updates Deployment spec
├── replicas: 3 → 4

Deployment Controller → Creates new pod
├── CREATE Pod 4
└── Same process as manual scaling

Result: Load distributed across 4 pods
└── New average: ~55% CPU per pod
```

**Scale-down scenario:**

```
Later that day (traffic decreases)

Current: 7 replicas (after busy period)
CPU usage: 30% average

HPA calculation:
├── Needed: 7 × (30 / 70) = 3 replicas
├── But wait! Scale-down behavior:
│   ├── Stabilization: Wait 5 minutes
│   └── Max decrease: 50% (not more than 3 pods at once)
│
└── Decision: 7 → 4 replicas (50% reduction)

5 minutes later:
├── Current: 4 replicas
├── CPU usage: 40%
├── Needed: 4 × (40 / 70) = 2.3 → 3 replicas
└── Decision: 4 → 3 replicas

Final: Stabilized at 3 (minimum)
```

**Why slow scale-down?**

- Prevents "flapping" (rapid up/down cycles)
- Avoids killing pods during temporary traffic dips
- More stable system

**Real-world scenario: Black Friday traffic spike**

```
Time: 00:00 (normal traffic)
├── Replicas: 3
├── CPU: 40%
└── Memory: 50%

Time: 09:00 (store opens, traffic increases)
├── CPU: 85% (above 70% target)
├── HPA: Scale to 4 replicas
└── Wait 30s, check again

Time: 09:01
├── CPU: 70% (still at target with 4 pods)
├── Traffic increasing
└── CPU climbing to 80%

Time: 09:02
├── CPU: 80%
├── HPA: Scale to 5 replicas
└── Create 1 new pod

Time: 10:00 (peak traffic)
├── Multiple scale-up events
├── Current: 10 replicas (max)
├── CPU: 75% (distributed across 10 pods)
└── System handling 10x traffic

Time: 14:00 (traffic declining)
├── CPU: 50%
├── HPA: Could scale down, but waits 5 minutes
└── Prevents premature scale-down

Time: 14:10 (traffic still declining)
├── Confirmed: Low load for 5+ minutes
├── HPA: Scale down 10 → 5 (50% max decrease)
└── Remove 5 pods gracefully

Time: 18:00 (back to normal)
├── Replicas: 3 (minimum)
├── CPU: 40%
└── Ready for tomorrow
```

---

#### 3. Resource Requests and Limits

Every pod declares resources:

```yaml
resources:
  requests:         # Minimum guaranteed
    memory: "256Mi"
    cpu: "100m"     # 0.1 CPU cores
  limits:           # Maximum allowed
    memory: "512Mi"
    cpu: "500m"     # 0.5 CPU cores
```

**What this means:**

**CPU:**
- `100m` = 100 millicores = 0.1 CPU core
- 1 CPU core = 1000m
- Request: Scheduler ensures node has 100m available
- Limit: Container throttled if exceeds 500m

**Memory:**
- `256Mi` = 256 mebibytes ≈ 268 MB
- Request: Scheduler ensures 256Mi available
- Limit: Container killed (OOMKilled) if exceeds 512Mi

**Resource behavior:**

```
Node with 4 CPUs, 16GB RAM

Scheduled pods:
├── Pod A: requests 1 CPU, 2GB → Scheduled
├── Pod B: requests 1 CPU, 2GB → Scheduled
├── Pod C: requests 1 CPU, 2GB → Scheduled
├── Pod D: requests 1 CPU, 2GB → Scheduled
└── Total: 4 CPUs, 8GB reserved

New pod E wants: 1 CPU, 2GB
├── Node available: 0 CPUs, 8GB
├── Decision: PENDING (not enough CPU)
└── Wait for another node or pod removal

What's actually running:
├── Pod A: Using 0.5 CPU (50% of request)
├── Pod B: Using 0.3 CPU
├── Pod C: Using 1.2 CPU (exceeding request, but OK)
└── Pod D: Using 0.8 CPU
Total used: 2.8 CPUs (plenty free!)

But Kubernetes:
└── Schedules based on REQUESTS, not actual usage
└── This prevents overcommitting
```

**When pods exceed limits:**

**CPU limit exceeded:**

```
Pod using 600m (limit is 500m)
└── Kubernetes: Throttle CPU to 500m
    └── Pod runs slower, but keeps running
    └── No crash
```

**Memory limit exceeded:**

```
Pod using 600Mi (limit is 512Mi)
└── Kubernetes: Kill pod (OOMKill)
    └── Deployment: Restart pod immediately
    └── Liveness probe: Would catch this anyway
    └── Pod restarts with fresh memory
```

**Real example:**

```
Backend pod lifecycle:
├── 00:00: Start
│   └── Memory: 128Mi (startup)
├── 01:00: Normal operation
│   └── Memory: 256Mi (request)
├── 10:00: Busy period
│   └── Memory: 380Mi (still under 512Mi limit)
├── 15:00: Memory leak (bug in code!)
│   ├── Memory: 512Mi → 513Mi
│   └── OOMKilled!
├── 15:00:05: Deployment restarts pod
├── 15:00:20: Pod ready again
│   └── Memory: 128Mi (fresh start)
└── Leak will happen again (need to fix bug!)
```

---

## Failure Modes

### Category 1: Application Failures

#### 1.1 Single Pod Crashes

**Scenario:** Bug causes one frontend pod to crash

```
State before:
├── Pod 1: Running ✓
├── Pod 2: Running ✓
└── Pod 3: Running ✓

Event: Bug triggered in Pod 2
├── Pod 2: Exit code 1 (crash)
└── Container stops

Immediate response (< 1 second):
├── Service: Removes Pod 2 from endpoints
├── New traffic: Routes to Pod 1 and Pod 3 only
└── User impact: None (other pods handle traffic)

Kubernetes response (within seconds):
├── Deployment Controller: Detects crash
├── RestartPolicy: Always
└── Restart Pod 2 container

Pod 2 restart process:
├── 0s: Start container
├── 10s: Wait (liveness initial delay)
├── 20s: Liveness check → Passes
├── 5s: Wait (readiness initial delay)
├── 10s: Readiness check → Passes
└── 15s: Added back to service

Total downtime: 0 seconds (for users)
Pod 2 unavailable: ~30 seconds
```

**If pod keeps crashing (CrashLoopBackOff):**

```
├── Crash #1: Restart immediately
├── Crash #2: Wait 10 seconds, restart
├── Crash #3: Wait 20 seconds, restart
├── Crash #4: Wait 40 seconds, restart
├── Crash #5: Wait 80 seconds, restart
└── Max backoff: 5 minutes between restarts

Meanwhile:
├── Pod 1: Still serving ✓
├── Pod 3: Still serving ✓
└── Users: No impact (but reduced capacity)

Monitoring alerts:
└── "Pod cs720-frontend-xyz has restarted 5 times in 10 minutes"
```

---

#### 1.2 All Pods of One Service Crash

**Scenario:** Shared bug crashes all frontend pods

```
Event: All 3 frontend pods crash simultaneously
├── Pod 1: Crash
├── Pod 2: Crash
└── Pod 3: Crash

Immediate impact:
├── Service cs720-frontend: No healthy endpoints
├── Ingress: Returns 503 Service Unavailable
└── Users: See error page

Kubernetes response (parallel):
├── Restart Pod 1 (immediately)
├── Restart Pod 2 (immediately)
└── Restart Pod 3 (immediately)

If bug is triggered by startup:
├── All pods crash on boot
├── CrashLoopBackOff on all 3
└── Service down until bug fixed

Recovery options:
├── Option 1: Rollback
│   └── kubectl rollout undo deployment/cs720-frontend -n cs720
│       └── Reverts to previous working image
│
├── Option 2: Fix in Git
│   ├── Push fix to GitHub
│   ├── GitHub Actions: Build new image
│   ├── Flux: Deploy new image
│   └── Timeline: 5-10 minutes
│
└── Option 3: Manual patch
    └── kubectl set image deployment/cs720-frontend \
        frontend=ghcr.io/.../cs720-frontend:v1.0.4 -n cs720
```

---

#### 1.3 Health Check Failures

**Scenario:** Backend /health endpoint timing out

```
Pod state:
├── Container: Running (process alive)
├── /health endpoint: Timeout (overloaded?)
└── CPU: 95% (maxed out)

Readiness probe failures:
├── Check 1: Timeout → Fail count: 1
├── Check 2: Timeout → Fail count: 2
├── Check 3: Timeout → Fail count: 3
└── Pod marked NOT READY
    └── Removed from service endpoints

Traffic distribution:
├── Before: Load balanced across 3 pods
├── After: All traffic to 2 healthy pods
└── Risk: Cascade failure (overloading healthy pods)

Liveness probe failures (if continues):
├── Check 1: Timeout → Fail count: 1
├── Check 2: Timeout → Fail count: 2
├── Check 3: Timeout → Fail count: 3
└── Container RESTART

After restart:
├── Fresh container: Low CPU
├── Health checks: Pass
└── Back in service
```

**Prevention with HPA:**

```
High CPU detected (95%)
├── HPA: Triggers scale-up
├── New pod: Starts
├── Load: Distributed across 4 pods
└── CPU per pod: Drops to 60%
```

---

### Category 2: Infrastructure Failures

#### 2.1 Single Node Failure

**Scenario:** Physical server (node) crashes

```
Cluster state:
├── Node 1: Running (3 pods)
├── Node 2: Running (4 pods)
└── Node 3: FAILED (5 pods) ← Hard crash

Immediate effect:
├── 5 pods on Node 3: Unreachable
├── Kubelet: Not responding
└── Node status: NotReady

Kubernetes response (within 40 seconds):
├── Node Controller: Marks Node 3 as NotReady
├── Wait: 40s grace period (maybe temporary?)
└── After 40s: Begin pod eviction

Pod eviction and rescheduling:
├── Mark all pods on Node 3 as Terminating
├── Deployment Controllers: Detect missing pods
└── Create replacement pods on healthy nodes

For each pod on Node 3:
├── Pod A (frontend):
│   ├── Desired: 3 replicas
│   ├── Current: 2 (on Node 1 and 2)
│   ├── Missing: 1
│   └── CREATE: New pod on Node 1
│
├── Pod B (backend):
│   └── (same process)
│
└── Continue for all pods...

Timeline:
├── 0s: Node 3 crashes
├── 0-40s: Grace period (users experience errors)
├── 40s: Eviction begins
├── 60s: New pods starting
├── 90s: Most pods ready
└── 120s: All services restored

User impact:
├── If you have 3 replicas per service:
│   ├── Lost: 1 replica per service
│   ├── Remaining: 2 replicas
│   └── Impact: Reduced capacity, possible slowness
│
└── If you had ONLY pods on Node 3:
    └── Service down for ~2 minutes
```

**With persistent storage:**

```
Backend pod on Node 3 had PVC (database)
├── PVC: Uses ReadWriteOnce
│   └── Can only attach to ONE node
│
├── Problem: PVC still attached to Node 3
├── New pod on Node 1: Can't attach PVC
└── Status: Pending (waiting for volume)

If Node 3 is truly dead:
├── Manual intervention needed:
│   └── kubectl delete node node-3 --force
├── This releases the PVC
└── New pod can attach and start

Timeline: 5-10 minutes (requires manual action)
```

---

#### 2.2 Network Partition

**Scenario:** Network split (some nodes can't talk to others)

```
Cluster topology:
├── Control plane: Nodes 1-3
└── Worker nodes: Nodes 4-10

Network partition:
├── Partition A: Nodes 1-5 (can communicate)
└── Partition B: Nodes 6-10 (can communicate)
    └── But A and B can't talk to each other

From control plane perspective (Nodes 1-3):
├── Nodes 4-5: Healthy ✓
├── Nodes 6-10: NotReady (timeout)
└── Begin evicting pods from Nodes 6-10

From Nodes 6-10 perspective:
├── Control plane: Unreachable
├── Kubelet: Can't report status
└── Pods: Still running!

Result: Split brain
├── Partition A: Creating NEW pods (thinks 6-10 dead)
├── Partition B: Running OLD pods (can't talk to API)
└── Both serving traffic (if load balancer sees both)

Potential issues:
├── Database writes: Two pods writing to replicas
├── Inconsistent state
└── Duplicate processing

When network heals:
├── Control plane: Sees all nodes again
├── Duplicate pods: Terminated
└── System reconciles to desired state
```

---

#### 2.3 Control Plane Failure

**Scenario:** Kubernetes API server goes down

```
Control plane components:
├── kube-apiserver: DOWN ✗
├── kube-controller-manager: Can't work (needs API)
└── kube-scheduler: Can't work (needs API)

Impact on running workloads:
├── Existing pods: Keep running ✓
├── Kubelets: Cache pod specs, continue
└── Services: Keep load balancing ✓

What DOESN'T work:
├── New pods: Can't schedule
├── Pod restarts: Delayed
├── kubectl commands: Fail
├── Flux: Can't apply changes
└── HPA: Can't scale

User impact:
└── Existing traffic: NO IMPACT
└── New deployments: Blocked
└── Failures: Not auto-healed

Example:
├── Frontend pod crashes
├── Kubelet: Tries to restart
├── API server: Can't confirm
└── Pod: Restart delayed until API returns

Recovery:
├── Option 1: API server auto-restarts
│   └── Timeline: 30-60 seconds
│
└── Option 2: Multi-master setup
    ├── Master 1: Failed
    ├── Master 2: Takes over
    └── Downtime: < 10 seconds
```

---

### Category 3: Data Failures

#### 3.1 Database Corruption

**Scenario:** SQLite database file corrupted

```
Backend pod:
├── PVC mounted: /app/data
├── Database file: /app/data/database.db
└── Event: File corrupted (disk error, bug, etc.)

Application behavior:
├── Reads: Return errors
├── Writes: Fail
└── /health endpoint: Returns 503

Kubernetes response:
├── Readiness probe: Fails
├── Pod: Removed from service
├── Liveness probe: Fails (after 3 attempts)
└── Pod: Restarted

After restart:
├── Container: Fresh start
├── Database file: Still corrupted! (PVC persists)
├── App starts: Can't open database
└── CrashLoopBackOff

Recovery:
├── Manual intervention required
├── Restore from backup:
│   └── kubectl cp backup.db cs720/pod-name:/app/data/database.db
└── Or: Delete PVC, start fresh (DATA LOSS!)
```

**Prevention:**

```
Automated backups:
├── CronJob: Runs daily
├── Backup script:
│   ├── sqlite3 database.db ".backup backup.db"
│   ├── Upload to S3/cloud storage
│   └── Retain: 30 days
└── Restore process documented
```

---

#### 3.2 PVC Full (Out of Disk Space)

**Scenario:** 10GB PVC reaches capacity

```
PVC state:
├── Capacity: 10GB
├── Used: 9.8GB
└── Available: 200MB

Application behavior:
├── Writes: Start failing
├── Logs: "No space left on device"
└── Database: Can't grow

Kubernetes:
├── Doesn't monitor PVC usage by default
├── No automatic expansion
└── Pod keeps running (appears healthy)

Symptoms:
├── /health might pass (read-only checks)
├── Actual writes: Failing
└── User errors: "Can't save data"

Recovery:
├── Option 1: Expand PVC (if StorageClass supports)
│   └── kubectl edit pvc cs720-backend-data -n cs720
│       └── Change: 10Gi → 20Gi
│
├── Option 2: Clean up old data
│   └── kubectl exec pod -n cs720 -- rm /app/data/old-files
│
└── Option 3: Migrate to new larger PVC
    └── Backup, create new PVC, restore
```

---

### Category 4: External Dependencies

#### 4.1 Image Registry Unavailable

**Scenario:** GHCR.io goes down during deployment

```
New deployment triggered:
├── Flux: Detects new image tag
├── Update: Deployment to use new image
└── Kubernetes: Tries to pull image

Pull image:
├── Contact: ghcr.io
├── Response: Timeout (registry down)
└── Error: ImagePullBackOff

Pod state:
├── Container: Can't start
├── Status: ImagePullBackOff
└── Deployment: Stuck

Existing pods:
├── Old version: Still running ✓
├── Not restarted: Keep using cached image
└── Service: Continues normally

Impact:
├── New deployment: Blocked
├── Existing traffic: No impact
└── Pod restarts: Will fail (can't pull image)

Recovery:
├── Wait: Registry comes back
├── Kubernetes: Retries automatically
└── Deployment: Completes

If registry stays down:
├── Manual rollback needed
└── Or: Use image that's already cached on nodes
```

**Prevention: ImagePullPolicy**

```yaml
containers:
- name: frontend
  image: ghcr.io/.../cs720-frontend:v1.0.5
  imagePullPolicy: IfNotPresent  # Use cached if available
  # vs Always (default for :latest tag)
```

---

#### 4.2 Flux Can't Reach GitHub

**Scenario:** GitHub outage or network issue

```
Flux Source Controller:
├── Every minute: Fetch from GitHub
├── Request: https://github.com/you/cs720
└── Response: Timeout

Flux state:
├── Last successful fetch: 10 minutes ago
├── Current state: Using cached manifests
└── New commits: Not detected

Impact:
├── Existing deployments: Keep running
├── New changes in Git: Not deployed
└── Reconciliation: Uses last known good state

If you push a fix:
├── Git: Receives commit
├── GitHub Actions: Builds image
├── Flux: Can't fetch new manifests
└── Image built but not deployed

When GitHub recovers:
├── Flux: Resumes fetching
├── Detects: All missed commits
└── Deploys: Latest state immediately
```

---

### Category 5: Cascade Failures

#### 5.1 Thundering Herd

**Scenario:** All pods restart simultaneously

```
Event: Cluster maintenance, all nodes rebooted
├── All pods: Terminated
└── All pods: Restart at same time

Startup sequence:
├── 100 pods: All starting
├── All hitting: External API during init
└── External API: Overwhelmed, returns errors

Effect:
├── Pods: Can't complete startup
├── Health checks: Fail
├── Pods: Restart
└── Cycle: Repeats (thundering herd)

Prevention:
├── Stagger startups:
│   └── initialDelaySeconds: Randomize
│       └── 30s + random(0-30s)
│
└── Exponential backoff:
    └── Retry external calls with delays
```

---

#### 5.2 Memory Pressure Cascade

**Scenario:** One service leaks memory, affects others

```
Backend pod memory leak:
├── Normal: 256Mi
├── After 1 hour: 400Mi
├── After 2 hours: 512Mi (limit)
└── OOMKilled

Node state:
├── Total memory: 16GB
├── Other pods: 10GB
├── Backend pod: Requests 256Mi but uses 512Mi
└── Actually available: 6GB, but 5.5GB "stolen" by leak

New pod tries to schedule:
├── Requests: 512Mi
├── Node shows: 6GB available
├── Schedule: Pod to this node
└── Reality: Only 500Mi actually free

Result:
├── New pod: Starts
├── Needs: 512Mi
├── Available: 500Mi
└── OOMKilled immediately

Cascade:
├── More pods killed: Free memory
├── Deployment: Creates replacements
├── Replacements: Also OOMKilled
└── Cluster: Thrashing

Prevention:
├── Set memory limits (you did this! ✓)
├── Monitor actual usage
└── Alert on high memory utilization
```

---

#### 5.3 Database Connection Pool Exhaustion

**Scenario:** Backend can't handle traffic spike

```
Backend configuration:
├── Max database connections: 10
├── Pod replicas: 3
└── Total possible: 30 concurrent queries

Traffic spike:
├── Requests: 100/second
├── Each request: Database query
└── Required connections: > 30

What happens:
├── Connections 1-30: Servicing requests
├── Request 31: Waits for free connection
├── Request 32-100: All waiting
└── Timeout: Requests fail

Pod behavior:
├── CPU: Low (waiting for DB)
├── Memory: Low
├── Health checks: Timeout (DB connection wait)
└── Pods: Marked NotReady

HPA:
├── Sees: Low CPU
├── Thinks: No need to scale
└── Doesn't scale up!

Cascade:
├── All pods: Marked NotReady
├── Service: No endpoints
└── Complete outage

Recovery:
├── Traffic reduces
├── Connections: Free up
├── Pods: Become ready again
└── Service: Restored

Prevention:
├── Increase connection pool size
├── Add connection timeouts
├── Scale based on request rate (not just CPU)
└── Implement request queuing
```

---

## Monitoring and Observability

To detect failures before users notice:

### 1. Metrics to Track

```
Pod metrics:
├── CPU/Memory usage
├── Restart count
├── Ready status
└── Age

Service metrics:
├── Request rate
├── Error rate
├── Response time
└── Active connections

Node metrics:
├── Available resources
├── Disk usage
└── Network I/O
```

### 2. Alerts to Configure

```
Critical:
├── All pods of a service down
├── Node NotReady
├── PVC > 85% full
└── High error rate (> 5%)

Warning:
├── Pod restart count > 5
├── High CPU/memory (> 80%)
├── Slow response times
└── HPA at max replicas
```

### 3. Troubleshooting Commands

```bash
# Check pod status
kubectl get pods -n cs720

# View pod logs
kubectl logs -f deployment/cs720-backend -n cs720

# Describe pod (see events)
kubectl describe pod POD-NAME -n cs720

# Check resource usage
kubectl top pods -n cs720

# View recent events
kubectl get events -n cs720 --sort-by='.lastTimestamp'

# Check HPA status
kubectl get hpa -n cs720

# Flux status
flux get all
flux logs --follow

# Check node status
kubectl get nodes

# Debug pod
kubectl exec -it POD-NAME -n cs720 -- /bin/sh

# Port forward for testing
kubectl port-forward svc/cs720-frontend 8080:80 -n cs720

# Rollback deployment
kubectl rollout undo deployment/cs720-backend -n cs720

# View deployment history
kubectl rollout history deployment/cs720-backend -n cs720

# Force Flux reconciliation
flux reconcile source git cs720
flux reconcile kustomization cs720

# Suspend/resume Flux
flux suspend kustomization cs720
flux resume kustomization cs720
```

---

## Summary

This GitOps architecture provides:

✅ **Automated deployments** - Push to Git, automatically deployed
✅ **Self-healing** - Failures automatically recovered
✅ **Zero-downtime updates** - Rolling deployments
✅ **Auto-scaling** - Handle traffic spikes automatically
✅ **Full audit trail** - Every change tracked in Git
✅ **Declarative** - Describe what you want, not how to do it
✅ **Rollback capability** - Revert to any previous version
✅ **High availability** - Multiple replicas, health checks

**Key Insight:** Everything is declarative and self-healing. You declare desired state in Git, and Kubernetes constantly works to make reality match that state, automatically recovering from most failures.

The system is designed to handle failures gracefully, with multiple layers of redundancy and automatic recovery mechanisms. Understanding these failure modes helps you design more resilient applications and respond effectively when issues occur.

---

**Related Documentation:**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Step-by-step deployment guide
- [k8s/README.md](./k8s/README.md) - Kubernetes configuration reference
- [flux/README.md](./flux/README.md) - Flux GitOps setup guide
