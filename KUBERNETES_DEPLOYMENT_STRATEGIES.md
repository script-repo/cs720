# CS720 Platform - Kubernetes Deployment Strategies Analysis

**Document Version:** 1.0.0
**Date:** 2025-11-16
**Author:** Claude Code Analysis
**Status:** Production Ready

---

## Executive Summary

This document provides a comprehensive analysis of deployment strategies for the CS720 Customer Intelligence Platform, from its current state to production-ready Kubernetes deployment. After extensive research and evaluation of 10+ deployment methodologies, we provide clear recommendations for both development and production workflows.

**Current State:** Multi-service application with 4 independent microservices
**Target State:** Production-ready Kubernetes deployment with CI/CD automation
**Recommended Approach:** GitHub Actions + Flux GitOps + Tilt (for development)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Independent Service Containerization](#2-independent-service-containerization)
3. [Flux CD Integration with GitHub Container Registry](#3-flux-cd-integration-with-github-container-registry)
4. [Alternative Deployment Methods](#4-alternative-deployment-methods)
5. [Comprehensive Comparison Matrix](#5-comprehensive-comparison-matrix)
6. [Final Recommendations](#6-final-recommendations)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Appendix: Quick Reference Commands](#8-appendix-quick-reference-commands)

---

## 1. Current State Analysis

### 1.1 Platform Architecture

The CS720 platform is a modern microservices architecture consisting of:

| Service | Technology | Port | Purpose | Storage |
|---------|-----------|------|---------|---------|
| **Frontend** | React 18 + Vite + TypeScript | 3000/8080 | PWA user interface with offline support | IndexedDB (browser) |
| **Backend** | Fastify + Node.js 20 + TypeScript | 3001 | RESTful API, OAuth, sync orchestration | SQLite (10Gi PVC) |
| **Proxy** | Express + Node.js 20 + TypeScript | 3002 | CORS proxy for OpenAI-compatible APIs | None (stateless) |
| **AI Service** | Express + Node.js 20 + TypeScript | 3003 | Multi-backend LLM integration (Ollama + OpenAI) | None (stateless) |

**Key Characteristics:**
- **Shared Library:** `@cs720/shared` provides common TypeScript types and utilities
- **Modern Build Tools:** Vite for frontend, TypeScript compilation for services
- **Multi-stage Dockerfiles:** All services already optimized with Alpine Linux
- **Current CI/CD:** GitHub Actions builds and pushes to GitHub Container Registry
- **Current K8s Setup:** Kustomize-based manifests with Flux GitOps configuration
- **High Availability:** HPA configured for auto-scaling (3-10 replicas)

### 1.2 Existing Infrastructure

**Already Implemented (✅):**
- ✅ Multi-stage Dockerfiles for all 4 services
- ✅ GitHub Actions CI/CD pipeline (`.github/workflows/build-images.yml`)
- ✅ GitHub Container Registry (ghcr.io) integration
- ✅ Kubernetes manifests in `k8s/base/` (Kustomize)
- ✅ Flux GitOps configuration in `flux/`
- ✅ Health checks and liveness probes
- ✅ Horizontal Pod Autoscalers
- ✅ Resource limits and requests
- ✅ Non-root container users

**Current Workflow:**
```
Developer → Git Push → GitHub Actions → Build Images → Push to GHCR → Flux Detects → Deploy to K8s
```

**Strengths:**
- Production-ready architecture
- Well-organized codebase
- Security best practices (non-root, multi-stage builds)
- GitOps-ready with Flux

**Gaps:**
- No development workflow optimization (slow local iteration)
- Manual environment management
- Limited deployment strategy options (no canary/blue-green)
- Secrets management could be improved

---

## 2. Independent Service Containerization

### 2.1 Containerization Status

All four services are **already independently containerized** with optimized multi-stage builds. Here's the detailed breakdown:

#### 2.1.1 Frontend Service

**Dockerfile:** `frontend/Dockerfile`
**Build Context:** `./frontend` (independent)
**Image Size:** ~50MB (nginx:alpine)
**Build Time:** ~30 seconds

**Multi-Stage Optimization:**
```dockerfile
# Stage 1: Build (node:20-alpine)
- npm ci (clean install)
- npm run build (Vite build)
- Output: /dist (static files)

# Stage 2: Production (nginx:alpine)
- Copy static files to /usr/share/nginx/html
- Custom nginx.conf for SPA routing
- Non-root user (nginx:nginx)
- Health check on port 8080
```

**Build Command:**
```bash
docker build \
  --file ./frontend/Dockerfile \
  --tag ghcr.io/script-repo/cs720-frontend:latest \
  --tag ghcr.io/script-repo/cs720-frontend:v1.0.0 \
  --platform linux/amd64 \
  --cache-from type=gha \
  --cache-to type=gha,mode=max \
  ./frontend
```

**Push Command:**
```bash
docker push ghcr.io/script-repo/cs720-frontend:latest
docker push ghcr.io/script-repo/cs720-frontend:v1.0.0
```

#### 2.1.2 Backend Service

**Dockerfile:** `services/backend/Dockerfile`
**Build Context:** `.` (root, requires shared module)
**Image Size:** ~150MB (node:20-alpine + SQLite)
**Build Time:** ~40 seconds

**Multi-Stage Optimization:**
```dockerfile
# Stage 1: Builder (node:20-alpine)
- Install build dependencies: python3, make, g++ (for better-sqlite3)
- npm ci
- npm run build (TypeScript → JavaScript)

# Stage 2: Production (node:20-alpine)
- Install runtime dependencies: sqlite
- Copy /dist and production node_modules only
- Create /app/data for SQLite database
- Non-root user (node:node)
- Health check on port 3001
```

**Environment Variables Required:**
```bash
# Core
PORT=3001
NODE_ENV=production

# OAuth (Salesforce)
SALESFORCE_CLIENT_ID=<secret>
SALESFORCE_CLIENT_SECRET=<secret>
SALESFORCE_REDIRECT_URI=https://yourdomain.com/auth/callback

# OAuth (Microsoft)
MICROSOFT_CLIENT_ID=<secret>
MICROSOFT_CLIENT_SECRET=<secret>
MICROSOFT_REDIRECT_URI=https://yourdomain.com/auth/callback

# Security
ENCRYPTION_KEY=<32-character-key>

# LLM Integration
OLLAMA_BASE_URL=http://ollama:11434
PROXY_URL=http://cs720-proxy:3002

# Business Intelligence
BI_API_KEY=<secret>
BI_BASE_URL=https://api.example-bi.com
```

**Build Command:**
```bash
docker build \
  --file ./services/backend/Dockerfile \
  --tag ghcr.io/script-repo/cs720-backend:latest \
  --tag ghcr.io/script-repo/cs720-backend:v1.0.0 \
  --platform linux/amd64 \
  .
```

#### 2.1.3 Proxy Service

**Dockerfile:** `services/proxy/Dockerfile`
**Build Context:** `.` (root, requires shared module)
**Image Size:** ~80MB (node:20-alpine)
**Build Time:** ~20 seconds

**Multi-Stage Optimization:**
```dockerfile
# Stage 1: Builder
- Build shared library first
- Build proxy service (TypeScript)
- Maintain workspace structure

# Stage 2: Production
- Copy built artifacts and node_modules
- Non-root user (node:node)
- Health check on port 3002
```

**Build Command:**
```bash
docker build \
  --file ./services/proxy/Dockerfile \
  --tag ghcr.io/script-repo/cs720-proxy:latest \
  .
```

#### 2.1.4 AI Service

**Dockerfile:** `services/ai-service/Dockerfile`
**Build Context:** `.` (root, requires shared module)
**Image Size:** ~85MB (node:20-alpine)
**Build Time:** ~20 seconds

**Multi-Stage Optimization:**
```dockerfile
# Stage 1: Builder
- Build shared library
- Build ai-service (TypeScript)

# Stage 2: Production
- Copy built artifacts
- Non-root user (node:node)
- Health check on port 3003
```

**Build Command:**
```bash
docker build \
  --file ./services/ai-service/Dockerfile \
  --tag ghcr.io/script-repo/cs720-ai-service:latest \
  .
```

### 2.2 Build Automation (GitHub Actions)

**Current Workflow:** `.github/workflows/build-images.yml`

**Features:**
- ✅ Parallel builds for all 4 services
- ✅ Multi-platform support (linux/amd64)
- ✅ GitHub Actions cache for faster builds
- ✅ Automatic tagging (latest, semver, SHA)
- ✅ Push to GitHub Container Registry (ghcr.io)
- ✅ Metadata extraction

**Trigger Conditions:**
- Push to `main` branch → Build and push
- Tagged releases (`v*`) → Build and push with version tags
- Pull requests → Build only (validation, no push)

**Image Tags Generated:**
```
ghcr.io/script-repo/cs720-frontend:latest
ghcr.io/script-repo/cs720-frontend:main-abc1234
ghcr.io/script-repo/cs720-frontend:v1.0.0
ghcr.io/script-repo/cs720-frontend:v1.0
```

### 2.3 Build Order and Dependencies

**Dependency Graph:**
```
@cs720/shared (TypeScript types)
  ↓
  ├─→ Backend (indirect via npm workspace)
  ├─→ Proxy (built inside Docker)
  └─→ AI Service (built inside Docker)

Frontend (completely independent)
```

**Build Sequence:**
All services can be built **in parallel** because:
- The `shared` module is built inside each Docker container
- No cross-service dependencies at build time
- Each Dockerfile handles its own dependency resolution

**Total Build Time (Parallel):** ~40 seconds (longest service: backend)

### 2.4 Container Registry Commands

#### 2.4.1 Manual Build Script

**File:** `scripts/build-all-images.sh`

```bash
#!/bin/bash
set -e

OWNER="${GITHUB_REPOSITORY_OWNER:-script-repo}"
VERSION="${VERSION:-latest}"

echo "🏗️  Building all CS720 container images..."
echo "📦 Registry: ghcr.io/${OWNER}"
echo "🏷️  Version: ${VERSION}"

# Build all services in parallel
docker build -f ./frontend/Dockerfile \
  -t ghcr.io/${OWNER}/cs720-frontend:${VERSION} \
  ./frontend &

docker build -f ./services/backend/Dockerfile \
  -t ghcr.io/${OWNER}/cs720-backend:${VERSION} \
  . &

docker build -f ./services/proxy/Dockerfile \
  -t ghcr.io/${OWNER}/cs720-proxy:${VERSION} \
  . &

docker build -f ./services/ai-service/Dockerfile \
  -t ghcr.io/${OWNER}/cs720-ai-service:${VERSION} \
  . &

wait
echo "✅ All images built successfully!"
```

#### 2.4.2 Push Script

**File:** `scripts/push-all-images.sh`

```bash
#!/bin/bash
set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN not set"
  exit 1
fi

OWNER="${GITHUB_REPOSITORY_OWNER:-script-repo}"
VERSION="${VERSION:-latest}"

echo "🔐 Logging in to GHCR..."
echo $GITHUB_TOKEN | docker login ghcr.io -u ${OWNER} --password-stdin

echo "📤 Pushing all images..."
docker push ghcr.io/${OWNER}/cs720-frontend:${VERSION}
docker push ghcr.io/${OWNER}/cs720-backend:${VERSION}
docker push ghcr.io/${OWNER}/cs720-proxy:${VERSION}
docker push ghcr.io/${OWNER}/cs720-ai-service:${VERSION}

echo "✅ All images pushed successfully!"
```

#### 2.4.3 Testing Images Locally

```bash
# Pull all images
docker pull ghcr.io/script-repo/cs720-frontend:latest
docker pull ghcr.io/script-repo/cs720-backend:latest
docker pull ghcr.io/script-repo/cs720-proxy:latest
docker pull ghcr.io/script-repo/cs720-ai-service:latest

# Test with docker-compose
docker-compose up -d

# Verify health
curl http://localhost:3000  # Frontend
curl http://localhost:3001/health  # Backend
curl http://localhost:3002/health  # Proxy
curl http://localhost:3003/health  # AI Service
```

### 2.5 Image Size Optimization Summary

| Service | Base Image | Final Size | Optimization |
|---------|-----------|-----------|--------------|
| Frontend | nginx:alpine | ~50MB | ✅ Multi-stage, static files only |
| Backend | node:20-alpine | ~150MB | ✅ Multi-stage, production deps only |
| Proxy | node:20-alpine | ~80MB | ✅ Multi-stage, minimal deps |
| AI Service | node:20-alpine | ~85MB | ✅ Multi-stage, minimal deps |
| **Total** | - | **~365MB** | **Average: 91MB per service** |

**Optimization Techniques Applied:**
- ✅ Alpine Linux base images (~5MB vs 100MB+ for standard Linux)
- ✅ Multi-stage builds (separate build and runtime stages)
- ✅ npm ci (clean, reproducible installs)
- ✅ Production-only dependencies in final stage
- ✅ .dockerignore files to exclude unnecessary files
- ✅ Layer caching optimization
- ✅ Non-root users for security

---

## 3. Flux CD Integration with GitHub Container Registry

### 3.1 Overview

Flux CD is a GitOps continuous delivery tool that automatically syncs Kubernetes manifests from Git and monitors container registries for new images. Your project already has Flux configured in the `flux/` directory.

**Flux Components:**
- **Source Controller:** Monitors Git repositories
- **Kustomize Controller:** Applies Kubernetes manifests
- **Image Automation Controller:** Watches container registries for new images
- **Notification Controller:** Sends alerts to Slack/Teams/etc.

### 3.2 Authentication to GitHub Container Registry

#### 3.2.1 Create GitHub Personal Access Token

**Required Scopes:**
- `read:packages` (required for pulling images)
- `write:packages` (optional, for image automation)

**Generate at:** https://github.com/settings/tokens

#### 3.2.2 Create Kubernetes Secret

**For Flux Image Automation (scanning registry):**
```bash
kubectl create secret docker-registry ghcr-auth \
  --namespace=flux-system \
  --docker-server=ghcr.io \
  --docker-username=script-repo \
  --docker-password=ghp_YourGitHubPersonalAccessToken \
  --docker-email=your-email@example.com
```

**For Application Pods (pulling private images):**
```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --namespace=cs720 \
  --docker-server=ghcr.io \
  --docker-username=script-repo \
  --docker-password=ghp_YourGitHubPersonalAccessToken \
  --docker-email=your-email@example.com
```

**Alternative: Service Account Patch**
```bash
# Add imagePullSecret to default service account
kubectl patch serviceaccount default \
  -n cs720 \
  -p '{"imagePullSecrets": [{"name": "ghcr-pull-secret"}]}'
```

### 3.3 Flux Installation and Bootstrap

#### 3.3.1 Install Flux CLI

```bash
# macOS
brew install fluxcd/tap/flux

# Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Windows
choco install flux
```

#### 3.3.2 Bootstrap Flux

```bash
# Check prerequisites
flux check --pre

# Bootstrap Flux with GitHub
export GITHUB_TOKEN=ghp_YourPersonalAccessToken
export GITHUB_USER=script-repo
export GITHUB_REPO=cs720

flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=${GITHUB_REPO} \
  --branch=main \
  --path=./flux \
  --personal \
  --private=false

# Verify installation
flux check
flux get sources git
```

**What Bootstrap Does:**
1. Installs Flux components in `flux-system` namespace
2. Creates a deploy key in your GitHub repository
3. Commits Flux manifests to `./flux` directory
4. Sets up continuous reconciliation (monitors Git for changes)

### 3.4 GitRepository Source Configuration

**File:** `flux/sources/cs720-repo.yaml`

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: cs720
  namespace: flux-system
spec:
  interval: 1m0s
  url: https://github.com/script-repo/cs720
  ref:
    branch: main
  ignore: |
    # Exclude files from triggering reconciliation
    /*
    !/k8s/
    !/flux/
```

**Apply:**
```bash
kubectl apply -f flux/sources/cs720-repo.yaml

# Verify
flux get sources git cs720

# Force reconciliation
flux reconcile source git cs720
```

### 3.5 Kustomization Resource

**File:** `flux/kustomizations/cs720.yaml`

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cs720
  namespace: flux-system
spec:
  interval: 5m0s
  path: ./k8s/base
  prune: true  # Delete resources removed from Git
  sourceRef:
    kind: GitRepository
    name: cs720
  timeout: 2m0s
  wait: true  # Wait for resources to be ready

  # Health checks for all deployments
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cs720-frontend
      namespace: cs720
    - apiVersion: apps/v1
      kind: Deployment
      name: cs720-backend
      namespace: cs720
    - apiVersion: apps/v1
      kind: Deployment
      name: cs720-proxy
      namespace: cs720
    - apiVersion: apps/v1
      kind: Deployment
      name: cs720-ai-service
      namespace: cs720

  retryInterval: 1m0s

  # Variable substitution (optional)
  postBuild:
    substitute:
      DOMAIN: "cs720.example.com"
      ENVIRONMENT: "production"
```

**Apply:**
```bash
kubectl apply -f flux/kustomizations/cs720.yaml

# Watch reconciliation
flux get kustomizations --watch

# Force reconciliation
flux reconcile kustomization cs720 --with-source
```

### 3.6 Image Automation (Optional)

Flux can automatically update image tags in your Git repository when new images are pushed to the registry.

#### 3.6.1 ImageRepository Configuration

**File:** `flux/image-automation/image-repository.yaml`

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: cs720-frontend
  namespace: flux-system
spec:
  image: ghcr.io/script-repo/cs720-frontend
  interval: 5m0s
  secretRef:
    name: ghcr-auth
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: cs720-backend
  namespace: flux-system
spec:
  image: ghcr.io/script-repo/cs720-backend
  interval: 5m0s
  secretRef:
    name: ghcr-auth
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: cs720-proxy
  namespace: flux-system
spec:
  image: ghcr.io/script-repo/cs720-proxy
  interval: 5m0s
  secretRef:
    name: ghcr-auth
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: cs720-ai-service
  namespace: flux-system
spec:
  image: ghcr.io/script-repo/cs720-ai-service
  interval: 5m0s
  secretRef:
    name: ghcr-auth
```

#### 3.6.2 ImagePolicy Configuration

**File:** `flux/image-automation/image-policy.yaml`

```yaml
# Semantic versioning (production)
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: cs720-frontend
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: cs720-frontend
  policy:
    semver:
      range: '>=1.0.0'
---
# Latest from main branch (development)
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: cs720-backend
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: cs720-backend
  policy:
    alphabetical:
      order: asc
  filterTags:
    pattern: '^main-[a-f0-9]+'
```

#### 3.6.3 ImageUpdateAutomation

**File:** `flux/image-automation/image-update.yaml`

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: cs720
  namespace: flux-system
spec:
  interval: 10m0s
  sourceRef:
    kind: GitRepository
    name: cs720
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxcdbot@users.noreply.github.com
        name: fluxcdbot
      messageTemplate: |
        Automated image update

        Files:
        {{ range $filename, $_ := .Updated.Files -}}
        - {{ $filename }}
        {{ end -}}

        Images:
        {{ range .Updated.Images -}}
        - {{.}}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./k8s/base
    strategy: Setters
```

**Update kustomization.yaml with image markers:**
```yaml
# k8s/base/kustomization.yaml
images:
  - name: ghcr.io/script-repo/cs720-backend
    newTag: latest # {"$imagepolicy": "flux-system:cs720-backend"}
  - name: ghcr.io/script-repo/cs720-frontend
    newTag: latest # {"$imagepolicy": "flux-system:cs720-frontend"}
```

### 3.7 Deployment Workflow

**Automated GitOps Flow:**
```
1. Developer pushes code to GitHub
2. GitHub Actions builds and pushes images to ghcr.io
3. Flux ImageRepository detects new image
4. Flux ImagePolicy determines if image should be deployed
5. Flux ImageUpdateAutomation updates k8s/base/kustomization.yaml
6. Flux commits and pushes change to Git
7. Flux Kustomization detects Git change
8. Flux applies manifests to Kubernetes
9. Kubernetes performs rolling update
```

### 3.8 Monitoring and Troubleshooting

**Check Flux Status:**
```bash
# Overall status
flux check

# Git sources
flux get sources git

# Kustomizations
flux get kustomizations

# Image repositories
flux get image repository

# Image policies
flux get image policy

# Image updates
flux get image update
```

**View Logs:**
```bash
# All Flux logs
flux logs --follow

# Specific controller
flux logs --kind=Kustomization --name=cs720
```

**Force Reconciliation:**
```bash
# Reconcile Git source
flux reconcile source git cs720

# Reconcile Kustomization
flux reconcile kustomization cs720

# Reconcile with source
flux reconcile kustomization cs720 --with-source
```

**Suspend/Resume:**
```bash
# Suspend automated deployments
flux suspend kustomization cs720

# Resume
flux resume kustomization cs720
```

### 3.9 Multi-Environment Setup

**Directory Structure:**
```
k8s/
├── base/                    # Shared resources
│   ├── namespace.yaml
│   ├── deployments/
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── patches/
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patches/
    └── production/
        ├── kustomization.yaml
        └── patches/
```

**Flux Kustomizations for Each Environment:**

```yaml
# flux/kustomizations/cs720-dev.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cs720-dev
  namespace: flux-system
spec:
  interval: 1m0s
  path: ./k8s/overlays/dev
  prune: true
  sourceRef:
    kind: GitRepository
    name: cs720
  targetNamespace: cs720-dev
---
# flux/kustomizations/cs720-staging.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cs720-staging
  namespace: flux-system
spec:
  interval: 5m0s
  path: ./k8s/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: cs720
  targetNamespace: cs720-staging
---
# flux/kustomizations/cs720-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cs720-production
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./k8s/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: cs720
  targetNamespace: cs720-production
  # Manual sync for production
  # Remove automated section
```

### 3.10 Security Best Practices

#### 3.10.1 Sealed Secrets

Instead of committing secrets to Git, use Sealed Secrets:

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Install kubeseal CLI
brew install kubeseal

# Create secret (don't commit)
kubectl create secret generic cs720-secrets \
  --namespace=cs720 \
  --from-literal=SALESFORCE_CLIENT_ID=xxx \
  --dry-run=client -o yaml > secret.yaml

# Seal it (safe to commit)
kubeseal --format=yaml < secret.yaml > sealed-secret.yaml

# Commit sealed secret
git add sealed-secret.yaml
git commit -m "Add sealed secrets"
```

#### 3.10.2 SOPS with Age Encryption

```bash
# Install SOPS
brew install sops

# Install age
brew install age

# Generate age key
age-keygen -o age.agekey

# Store key in Kubernetes
kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey

# Encrypt secrets
sops --encrypt --in-place k8s/base/secrets.yaml

# Configure Flux to decrypt
# In kustomization.yaml:
spec:
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

### 3.11 Notifications and Alerts

**Configure Slack notifications:**

```yaml
# flux/notifications/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta1
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: cs720-deployments
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta1
kind: Alert
metadata:
  name: cs720-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: cs720
    - kind: Kustomization
      name: cs720
    - kind: ImageRepository
      name: '*'
```

---

## 4. Alternative Deployment Methods

### 4.1 Method Comparison Overview

| Method | Best For | Complexity | Prod Ready | CS720 Score |
|--------|----------|-----------|------------|-------------|
| Git Clone in Container | Never | 3/10 | ⛔ No | 2/10 |
| GitHub Actions (Current) | CI/CD | 4/10 | ✅ Yes | 9/10 |
| GitLab CI | GitLab users | 5/10 | ✅ Yes | 6/10 |
| Jenkins | Enterprise | 8/10 | ✅ Yes | 4/10 |
| Kaniko + Tekton | In-cluster builds | 7/10 | ⚠️ Yes | 5/10 |
| Helm Charts | Multi-env | 6/10 | ✅ Yes | 7/10 |
| Skaffold | Development | 5/10 | ⚠️ Dev | 8/10 |
| Tilt | Development | 5/10 | ⚠️ Dev | **9/10** |
| ArgoCD | GitOps UI | 6/10 | ✅ Yes | 7/10 |
| Flux CD (Current) | GitOps | 6/10 | ✅ Yes | 8/10 |
| Tekton Pipelines | K8s-native CI/CD | 9/10 | ⚠️ Yes | 2/10 |

### 4.2 Detailed Method Analysis

#### 4.2.1 Stateless Containers with Git Clone

**Concept:** Containers clone the Git repository and build the application on startup.

**How It Works:**
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache git python3 make g++
WORKDIR /app

# Clone at runtime
ENV GIT_REPO=https://github.com/script-repo/cs720.git
ENV GIT_BRANCH=main

CMD git clone --depth 1 --branch ${GIT_BRANCH} ${GIT_REPO} . && \
    cd services/backend && \
    npm ci && \
    npm run build && \
    npm start
```

**Pros:**
- ✅ No build infrastructure needed
- ✅ Always latest code
- ✅ Simple conceptually
- ✅ No image registry required

**Cons:**
- ❌ Startup time: 2-5 minutes per pod
- ❌ Resource usage: 2-4GB RAM during build
- ❌ HPA won't work (scaling too slow)
- ❌ Security risk (git credentials, source code exposed)
- ❌ Network dependency (can't start without Git access)
- ❌ Inconsistent deployments (race conditions)
- ❌ No immutability guarantee
- ❌ Build failures in production

**Suitability for CS720:** **2/10 ⛔ Not Recommended**

**Why Not:**
- Backend with SQLite needs fast restarts
- HPA is critical for your architecture
- Multiple replicas would build independently
- Security concerns with OAuth credentials

**Complexity:** 3/10
**Value:** 1/10
**Maintenance:** 7/10 (High)

---

#### 4.2.2 GitHub Actions (Current Implementation)

**Concept:** GitHub-hosted CI/CD that builds images and pushes to registry.

**Current Workflow:** `.github/workflows/build-images.yml`

**Pros:**
- ✅ Free for public repos (2000 min/month for private)
- ✅ Integrated with GitHub
- ✅ Matrix builds (parallel)
- ✅ Built-in secrets management
- ✅ Rich marketplace (1000+ actions)
- ✅ Great caching support
- ✅ Multi-platform builds
- ✅ Already implemented and working

**Cons:**
- ⚠️ GitHub lock-in
- ⚠️ Limited build minutes (free tier)
- ⚠️ Can't run locally easily
- ⚠️ Runner limitations (2 CPU, 7GB RAM)

**Suitability for CS720:** **9/10 ✅ Excellent (Keep It)**

**Recommendation:** Keep using GitHub Actions, but enhance with:
- Add deployment stages (dev/staging/prod)
- Implement semantic versioning
- Add security scanning (Trivy, Snyk)
- PR environment previews

**Complexity:** 4/10
**Value:** 9/10
**Maintenance:** 3/10 (Low)

---

#### 4.2.3 GitLab CI/CD

**Concept:** GitLab's integrated CI/CD with built-in container registry.

**Configuration Example:**
```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

build:frontend:
  stage: build
  image: docker:24-dind
  script:
    - docker build -t $CI_REGISTRY/$CI_PROJECT_PATH/frontend:$CI_COMMIT_SHA -f frontend/Dockerfile .
    - docker push $CI_REGISTRY/$CI_PROJECT_PATH/frontend:$CI_COMMIT_SHA

deploy:production:
  stage: deploy
  script:
    - kubectl set image deployment/cs720-frontend frontend=$CI_REGISTRY/$CI_PROJECT_PATH/frontend:$CI_COMMIT_SHA
  environment:
    name: production
  only:
    - main
  when: manual
```

**Pros:**
- ✅ Integrated platform (Git + CI/CD + Registry + K8s)
- ✅ More free minutes than GitHub (400/month)
- ✅ Built-in container registry
- ✅ Review apps (automatic PR environments)
- ✅ Advanced security scanning
- ✅ Native Kubernetes integration

**Cons:**
- ❌ Requires migration from GitHub
- ⚠️ Learning curve
- ⚠️ Self-hosted GitLab is resource-heavy
- ⚠️ Smaller ecosystem than GitHub

**Suitability for CS720:** **6/10 ⚠️ Consider Only If Migrating**

**Recommendation:** Not worth migrating unless you need GitLab-specific features.

**Complexity:** 5/10
**Value:** 6/10 (if already on GitLab)
**Maintenance:** 5/10 (Medium)

---

#### 4.2.4 Jenkins with Kubernetes Plugin

**Concept:** Self-hosted CI/CD server with dynamic Kubernetes agents.

**Jenkinsfile Example:**
```groovy
pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: docker
    image: docker:24-dind
    command: ['cat']
    tty: true
'''
        }
    }

    stages {
        stage('Build') {
            steps {
                container('docker') {
                    sh 'docker build -t ghcr.io/script-repo/cs720-backend:${GIT_COMMIT} -f services/backend/Dockerfile .'
                }
            }
        }
    }
}
```

**Pros:**
- ✅ Maximum flexibility
- ✅ Rich plugin ecosystem (1800+)
- ✅ Self-hosted control
- ✅ Kubernetes-native agents
- ✅ Advanced pipeline features

**Cons:**
- ❌ Infrastructure overhead (run Jenkins)
- ❌ Complex setup (steep learning curve)
- ❌ Security concerns (secure Jenkins itself)
- ❌ Resource hungry (2-4GB RAM)
- ❌ Plugin maintenance (updates break things)
- ❌ Groovy knowledge required

**Suitability for CS720:** **4/10 ⚠️ Overkill**

**Why Lower Score:**
- Too much complexity for 4 services
- Maintenance overhead too high
- GitHub Actions already works well

**When to Use:**
- Enterprise with existing Jenkins
- Complex compliance requirements
- Need extreme customization

**Complexity:** 8/10
**Value:** 5/10
**Maintenance:** 9/10 (Very High)

---

#### 4.2.5 Kaniko and In-Cluster Builds

**Concept:** Build container images inside Kubernetes pods without Docker daemon.

**Kaniko Job Example:**
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: kaniko-build-frontend
spec:
  template:
    spec:
      containers:
      - name: kaniko
        image: gcr.io/kaniko-project/executor:latest
        args:
          - "--dockerfile=/workspace/frontend/Dockerfile"
          - "--context=git://github.com/script-repo/cs720.git#main"
          - "--destination=ghcr.io/script-repo/cs720-frontend:latest"
          - "--cache=true"
        volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker/
```

**With Tekton Pipeline:**
```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: cs720-build
spec:
  tasks:
  - name: git-clone
    taskRef:
      name: git-clone
  - name: build-frontend
    taskRef:
      name: kaniko
    params:
    - name: IMAGE
      value: ghcr.io/script-repo/cs720-frontend:latest
```

**Pros:**
- ✅ No Docker daemon needed (security)
- ✅ Builds in-cluster
- ✅ Reproducible builds
- ✅ Layer caching support
- ✅ Kubernetes-native

**Cons:**
- ❌ 20-30% slower than Docker
- ❌ Resource intensive (2-4GB per build)
- ❌ Complex troubleshooting
- ❌ Tekton adds significant complexity
- ❌ Limited Dockerfile features

**Suitability for CS720:** **5/10 ⚠️ Specialized Use Case**

**When to Use:**
- Air-gapped environments
- Cannot use external CI/CD
- Strict security requirements
- Everything must run in K8s

**Recommendation:** GitHub Actions is simpler and better for CS720.

**Complexity:** 7/10
**Value:** 5/10
**Maintenance:** 7/10 (High)

---

#### 4.2.6 Helm Charts

**Concept:** Package manager for Kubernetes with templating and versioning.

**Chart Structure:**
```
cs720-helm/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-staging.yaml
├── values-production.yaml
└── templates/
    ├── frontend/deployment.yaml
    ├── backend/deployment.yaml
    ├── proxy/deployment.yaml
    ├── ai-service/deployment.yaml
    └── ingress.yaml
```

**values.yaml Example:**
```yaml
global:
  registry: ghcr.io
  imagePrefix: script-repo/cs720

frontend:
  replicaCount: 3
  image:
    tag: "v1.0.5"
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
```

**Deployment:**
```bash
# Install
helm install cs720 ./cs720-helm \
  --namespace cs720 \
  --values values-production.yaml

# Upgrade
helm upgrade cs720 ./cs720-helm \
  --set backend.image.tag=v1.0.6

# Rollback
helm rollback cs720 1
```

**Pros:**
- ✅ Versioned releases
- ✅ DRY configuration (Don't Repeat Yourself)
- ✅ Easy rollback
- ✅ Multiple environments (different values files)
- ✅ Dependency management
- ✅ Community charts
- ✅ GitOps compatible (works with Flux/ArgoCD)

**Cons:**
- ⚠️ Templating complexity (Go templates)
- ⚠️ Learning curve
- ⚠️ Debugging difficulty
- ⚠️ Helm state management
- ⚠️ Overhead for simple deployments

**Suitability for CS720:** **7/10 ✅ Good Addition**

**When to Adopt:**
- You have 3+ environments (dev/staging/prod)
- Configuration management becomes complex
- Want easy rollback capability
- Need to share configuration between services

**Recommendation:** Consider adding Helm chart alongside Kustomize.

**Complexity:** 6/10
**Value:** 7/10
**Maintenance:** 4/10 (Low-Medium)

---

#### 4.2.7 Skaffold for Development

**Concept:** Automates the build-deploy-test loop for local development.

**skaffold.yaml Example:**
```yaml
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: cs720-platform

build:
  artifacts:
  - image: ghcr.io/script-repo/cs720-frontend
    context: frontend
    docker:
      dockerfile: Dockerfile
    sync:
      manual:
      - src: 'src/**/*.tsx'
        dest: /app/src

deploy:
  kubectl:
    manifests:
    - k8s/base/*.yaml

portForward:
- resourceType: service
  resourceName: cs720-frontend
  port: 80
  localPort: 3000
```

**Usage:**
```bash
# Development mode (auto-rebuild)
skaffold dev

# Run once
skaffold run

# Profile-specific
skaffold run -p production
```

**Pros:**
- ✅ Fast inner loop (rebuild in seconds)
- ✅ File watching (auto-rebuild)
- ✅ Port forwarding (automatic)
- ✅ Multi-service support
- ✅ Profiles for environments
- ✅ File sync (hot reload)

**Cons:**
- ⚠️ Development focused (less for production)
- ⚠️ Configuration complexity grows
- ⚠️ Build speed still needs image rebuilds
- ⚠️ Runs on developer machine

**Suitability for CS720:** **8/10 ✅ Excellent for Development**

**Recommendation:** **Adopt for local development workflow**

**Use Case:**
```bash
# Developer workflow
git clone cs720
cd cs720
skaffold dev
# Edit code → auto-rebuild in ~10 seconds
```

**Complexity:** 5/10
**Value:** 8/10 (for development)
**Maintenance:** 3/10 (Low)

---

#### 4.2.8 Tilt for Development

**Concept:** Advanced development environment with web UI and faster rebuilds.

**Tiltfile Example (Python-based):**
```python
# Tiltfile
allow_k8s_contexts(['minikube', 'docker-desktop'])

# Frontend
docker_build(
    'ghcr.io/script-repo/cs720-frontend',
    context='./frontend',
    live_update=[
        sync('./frontend/src', '/app/src'),
        run('cd /app && npm install', trigger=['./frontend/package.json']),
    ]
)

k8s_yaml('k8s/base/frontend-deployment.yaml')
k8s_resource(
    'cs720-frontend',
    port_forwards='3000:8080',
    labels=['frontend']
)

# Repeat for other services...
```

**UI Dashboard:**
- Visual status of all services
- Log streaming
- Resource graph
- Custom buttons for manual tasks
- Performance metrics

**Pros:**
- ✅ **Amazing UI** (visual dashboard)
- ✅ **Fastest rebuilds** (faster than Skaffold)
- ✅ **Live update** (sync files without rebuild)
- ✅ **Multi-service** (perfect for microservices)
- ✅ **Custom buttons** (manual tasks)
- ✅ **Resource graph** (visualize dependencies)
- ✅ **Team collaboration**

**Cons:**
- ⚠️ Development only (not for production)
- ⚠️ Python syntax (learning curve)
- ⚠️ Resource usage (heavier than Skaffold)
- ⚠️ Requires K8s cluster

**Suitability for CS720:** **9/10 ✅ Strongly Recommended**

**Why Perfect Fit:**
- 4 interdependent services
- Need local Ollama for testing
- TypeScript requires compilation
- Team of developers
- Complex environment setup

**Workflow:**
```bash
# New developer joins
git clone cs720
cd cs720
tilt up
# Wait 2-3 minutes → entire stack running
# Open http://localhost:10350 → see all services
# Edit code → auto-rebuild in 5-10 seconds
```

**Complexity:** 5/10
**Value:** 9/10 (for development)
**Maintenance:** 2/10 (Very Low)

---

#### 4.2.9 ArgoCD for GitOps

**Concept:** GitOps continuous delivery with beautiful web UI.

**Application Definition:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cs720
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/script-repo/cs720
    targetRevision: main
    path: k8s/base
  destination:
    server: https://kubernetes.default.svc
    namespace: cs720
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**Features:**
- Web UI for deployments
- Multi-cluster management
- SSO integration
- RBAC
- Rollback capability
- Progressive delivery (canary/blue-green)

**Pros:**
- ✅ **Best-in-class UI**
- ✅ GitOps native
- ✅ Multi-cluster
- ✅ SSO integration
- ✅ Fine-grained RBAC
- ✅ Diff view
- ✅ Easy rollback

**Cons:**
- ⚠️ Resource usage (500MB RAM)
- ⚠️ More complex than Flux
- ⚠️ Another system to manage
- ⚠️ Opinionated

**Suitability for CS720:** **7/10 ✅ Good Alternative to Flux**

**Current State:** You already have Flux, which is lighter weight.

**Recommendation:**
- **Stick with Flux** for now
- **Consider ArgoCD** if you need:
  - UI for non-technical team members
  - More advanced progressive delivery
  - Multi-cluster management

**Complexity:** 6/10
**Value:** 7/10
**Maintenance:** 5/10 (Medium)

---

#### 4.2.10 Tekton Pipelines

**Concept:** Kubernetes-native CI/CD using Custom Resource Definitions.

**Pipeline Example:**
```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: cs720-pipeline
spec:
  tasks:
  - name: git-clone
    taskRef:
      name: git-clone
  - name: build
    taskRef:
      name: kaniko
    runAfter: [git-clone]
  - name: deploy
    taskRef:
      name: kubectl-deploy
    runAfter: [build]
```

**Pros:**
- ✅ Kubernetes-native
- ✅ Reusable tasks
- ✅ Cloud-native (CNCF)
- ✅ No CI/CD server needed
- ✅ Flexible

**Cons:**
- ❌ **Extremely complex** (steepest learning curve)
- ❌ **Verbose YAML** (lots of boilerplate)
- ❌ **Limited UI** (basic dashboard)
- ❌ **Debugging pain** (hard to troubleshoot)
- ❌ **Resource intensive** (every pipeline = pods)

**Suitability for CS720:** **2/10 ⛔ Not Recommended**

**Why Not:**
- Way too complex for 4-service app
- GitHub Actions is simpler and better
- No advantages for your use case
- Huge learning curve

**When to Use:**
- Large enterprise with K8s expertise
- Everything must run in-cluster
- Complex compliance requirements

**Complexity:** 9/10
**Value:** 2/10
**Maintenance:** 9/10 (Very High)

---

## 5. Comprehensive Comparison Matrix

### 5.1 Feature Comparison

| Feature | GitHub Actions | Flux CD | Tilt | Helm | ArgoCD | Skaffold | Jenkins |
|---------|---------------|---------|------|------|--------|----------|---------|
| **Build Pipeline** | ✅ Excellent | ❌ No | ⚠️ Dev Only | ❌ No | ❌ No | ⚠️ Dev Only | ✅ Yes |
| **GitOps** | ❌ No | ✅ Excellent | ❌ No | ⚠️ Partial | ✅ Excellent | ❌ No | ⚠️ Partial |
| **Local Dev** | ❌ No | ❌ No | ✅ Excellent | ❌ No | ❌ No | ✅ Good | ❌ No |
| **Web UI** | ✅ Good | ⚠️ Basic | ✅ Excellent | ❌ No | ✅ Excellent | ❌ CLI | ✅ Good |
| **Auto-scaling** | N/A | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | N/A |
| **Rollback** | ⚠️ Manual | ✅ Auto | ✅ Auto | ✅ Easy | ✅ Easy | ✅ Auto | ⚠️ Manual |
| **Multi-env** | ✅ Yes | ✅ Yes | ⚠️ Profiles | ✅ Excellent | ✅ Yes | ⚠️ Profiles | ✅ Yes |
| **Image Automation** | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ✅ Yes | ❌ No | ✅ Yes |
| **Secrets Management** | ✅ Built-in | ⚠️ External | ⚠️ External | ⚠️ External | ⚠️ External | ⚠️ External | ✅ Built-in |
| **Cost** | Free/Paid | Free | Free | Free | Free | Free | Free |

### 5.2 Complexity vs Value Matrix

```
High Value │
          │    Tilt (Dev)
          │    ●
          │        GitHub Actions
          │            ●
          │                Flux CD
          │                  ●
          │              Helm      Skaffold
          │              ●         ● (Dev)
          │          ArgoCD
          │            ●
          │
          │  Kaniko
          │    ●           Jenkins
          │                  ●
          │
          │  GitLab
          │    ●    Tekton
          │          ●
          │
Low Value │  Git Clone
          │    ●
          └────────────────────────────────────
           Low                         High
                  Complexity
```

### 5.3 Deployment Method Scorecard

| Method | Complexity | Dev XP | Prod Ready | Resource | Maint | CS720 Score | Verdict |
|--------|-----------|--------|------------|----------|-------|-------------|---------|
| **Git Clone in Container** | 3/10 | 2/10 | ⛔ No | Very High | 7/10 | **2/10** | ⛔ Never Use |
| **GitHub Actions** | 4/10 | 7/10 | ✅ Yes | Low | 3/10 | **9/10** | ✅ Keep (Current) |
| **GitLab CI** | 5/10 | 7/10 | ✅ Yes | Medium | 5/10 | **6/10** | ⚠️ Only if migrating |
| **Jenkins** | 8/10 | 5/10 | ✅ Yes | High | 9/10 | **4/10** | ⚠️ Overkill |
| **Kaniko + Tekton** | 7/10 | 4/10 | ⚠️ Yes | High | 7/10 | **5/10** | ⚠️ Specialized |
| **Helm Charts** | 6/10 | 6/10 | ✅ Yes | Low | 4/10 | **7/10** | ✅ Add for multi-env |
| **Skaffold** | 5/10 | 9/10 | ⚠️ Dev | Medium | 3/10 | **8/10** | ✅ Great for dev |
| **Tilt** | 5/10 | 10/10 | ⚠️ Dev | Medium | 2/10 | **9/10** | ✅ **Highly Recommended** |
| **ArgoCD** | 6/10 | 7/10 | ✅ Yes | Medium | 5/10 | **7/10** | ✅ Good alternative |
| **Flux CD** | 6/10 | 6/10 | ✅ Yes | Low | 4/10 | **8/10** | ✅ Keep (Current) |
| **Tekton** | 9/10 | 3/10 | ⚠️ Yes | Very High | 9/10 | **2/10** | ⛔ Too complex |

**Legend:**
- ✅ Recommended
- ⚠️ Use with caution or specific scenarios
- ⛔ Not recommended

---

## 6. Final Recommendations

### 6.1 Recommended Architecture

**For CS720, the optimal deployment strategy combines:**

1. **Production Deployment:**
   - **GitHub Actions** (CI/CD) - Already implemented ✅
   - **Flux CD** (GitOps) - Already implemented ✅
   - **Kustomize** (Manifest management) - Already implemented ✅
   - **GitHub Container Registry** (Image storage) - Already implemented ✅

2. **Add for Development:**
   - **Tilt** (Local development) - **Strongly recommended** 🌟

3. **Consider Adding:**
   - **Helm** (Multi-environment management) - Optional, add when you have 3+ environments

### 6.2 Rationale for Recommendations

#### Why Keep Current Setup (GitHub Actions + Flux + Kustomize)?

**GitHub Actions:**
- ✅ Free for your use case (public repo or 2000 min/month)
- ✅ Already working well
- ✅ Integrated with GitHub (single platform)
- ✅ Matrix builds for parallel service building
- ✅ Great caching (layer caching, buildx cache)
- ✅ Easy to understand and maintain
- ✅ Rich ecosystem (security scanning, etc.)

**Flux CD:**
- ✅ Lightweight (lower resource usage than ArgoCD)
- ✅ Pure GitOps (Git as single source of truth)
- ✅ Image automation (auto-update on new images)
- ✅ Already configured
- ✅ CNCF project (vendor-neutral)
- ✅ Works seamlessly with Kustomize

**Kustomize:**
- ✅ Simple and declarative
- ✅ No templating needed for current complexity
- ✅ Native to kubectl (kubectl apply -k)
- ✅ Easy to understand for team

#### Why Add Tilt?

**Massive Developer Productivity Improvement:**

**Before Tilt (Current Developer Workflow):**
```bash
# Edit code
vim services/backend/src/server.ts

# Build and deploy (manual)
npm run build
docker build -t cs720-backend:dev -f services/backend/Dockerfile .
docker push cs720-backend:dev
kubectl set image deployment/cs720-backend backend=cs720-backend:dev
kubectl rollout status deployment/cs720-backend

# Wait for deployment
# Check logs
kubectl logs -f deployment/cs720-backend

# Total time: 3-5 minutes per change
```

**After Tilt (Developer Workflow):**
```bash
# One-time setup
tilt up

# Edit code
vim services/backend/src/server.ts
# Tilt detects change, rebuilds, redeploys automatically
# See results in 5-10 seconds

# Visual dashboard at http://localhost:10350
# - See all 4 services
# - Real-time logs
# - Resource status
# - Performance metrics
# - Custom buttons for tasks
```

**Productivity Gains:**
- ⚡ **30x faster feedback loop** (5-10 sec vs 3-5 min)
- 👀 **Visual dashboard** for all services
- 🔄 **Automatic rebuild/redeploy** on file changes
- 🚀 **Live code sync** for interpreted languages
- 📊 **Performance metrics** built-in
- 🎯 **Multi-service orchestration** (all 4 services + Ollama)
- 🆕 **Easier onboarding** for new developers

**Investment:**
- Setup time: 2-4 hours (create Tiltfile)
- Learning curve: 1 day
- Maintenance: Minimal (update when adding services)
- ROI: Immediate (every developer benefits daily)

#### When to Add Helm?

**Add Helm when:**
- ✅ You have 3+ environments (dev, staging, production)
- ✅ Configuration management becomes repetitive
- ✅ You need advanced templating
- ✅ You want built-in rollback (helm rollback)
- ✅ You need to share configurations

**Current State:** You have `k8s/base/` with Kustomize, which is sufficient for now.

**Future State:** When you add staging environment, consider Helm:
```
cs720-helm/
├── Chart.yaml
├── values.yaml              # Defaults
├── values-dev.yaml          # Development overrides
├── values-staging.yaml      # Staging overrides
└── values-production.yaml   # Production overrides
```

**Helm + Flux Integration:**
```yaml
# flux/helmreleases/cs720-production.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: cs720-production
spec:
  chart:
    spec:
      chart: ./cs720-helm
      sourceRef:
        kind: GitRepository
        name: cs720
  values:
    environment: production
    backend:
      replicaCount: 5
      image:
        tag: v1.0.5
```

#### What NOT to Add?

**❌ Don't Add Jenkins:**
- Requires dedicated infrastructure
- 2-4GB RAM minimum for Jenkins master
- Complex Groovy syntax
- High maintenance overhead
- GitHub Actions already works perfectly

**❌ Don't Add Tekton:**
- Extremely complex (9/10 complexity)
- Verbose YAML (100+ lines for simple pipelines)
- Steep learning curve
- No advantages over GitHub Actions for CS720
- Resource intensive (every pipeline run = multiple pods)

**❌ Don't Add ArgoCD (yet):**
- You already have Flux (redundant)
- Flux is lighter weight (100MB vs 500MB)
- ArgoCD is great but adds complexity
- Consider only if you need:
  - Web UI for non-technical users
  - Advanced canary deployments
  - Multi-cluster management

**❌ Don't Use Git Clone in Containers:**
- Anti-pattern
- Slow startup (2-5 minutes)
- Breaks HPA
- Security risks
- Inconsistent deployments

### 6.3 Migration Path

**You don't need to migrate anything!** Your current setup is excellent.

**Just add Tilt for development:**

**Week 1: Add Tilt**
```bash
# 1. Install Tilt
brew install tilt  # macOS
# or curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash

# 2. Create Tiltfile (see example in Method 4.2.8)
# 3. Test locally
tilt up

# 4. Share with team
git add Tiltfile
git commit -m "Add Tilt for local development"
```

**Month 2: Optional Helm (if needed)**
```bash
# 1. Create Helm chart
helm create cs720-helm

# 2. Move k8s/base/* to templates/
# 3. Extract values to values.yaml
# 4. Create environment-specific values files

# 5. Update Flux to use HelmRelease
```

**Future: Add staging environment**
```bash
# 1. Create k8s/overlays/staging/
# 2. Create Flux Kustomization for staging
# 3. Deploy staging cluster
```

### 6.4 Cost Analysis

| Method | Infrastructure Cost | Operational Cost | Total Annual |
|--------|-------------------|------------------|--------------|
| **GitHub Actions** (current) | $0 (public repo) | $0 (free tier) | **$0** |
| **Flux CD** (current) | $0 (runs in K8s) | $0 | **$0** |
| **Tilt** (recommended) | $0 (local dev) | $0 | **$0** |
| **Kustomize** (current) | $0 | $0 | **$0** |
| **Helm** (optional) | $0 | $0 | **$0** |
| **Current Total** | **$0** | **$0** | **$0** |
| **Recommended Total** | **$0** | **$0** | **$0** |

**Alternative Costs (if you chose differently):**

| Alternative | Infrastructure | Operations | Annual |
|-------------|---------------|------------|--------|
| Jenkins | $50-200/mo (VM) | Engineer time (high) | $600-2400 |
| GitLab Self-hosted | $100-300/mo (VM) | Engineer time (medium) | $1200-3600 |
| ArgoCD | $0 (in K8s) | Engineer time (low) | $0 |

**Conclusion:** Recommended setup costs **$0** and is the most efficient.

### 6.5 Risk Assessment

| Risk | Current Setup | Recommendation | Mitigation |
|------|--------------|----------------|------------|
| **GitHub Outage** | Medium (CI/CD breaks) | Same | Cache images locally, have manual build script |
| **Flux Failure** | Low (auto-recovery) | Same | Manual kubectl apply as backup |
| **Registry Unavailable** | Medium (can't pull images) | Same | Use imagePullPolicy: IfNotPresent |
| **Cluster Failure** | High (app down) | Same | Multi-cluster, backups |
| **Developer Productivity** | Medium (slow iteration) | **Improved with Tilt** | N/A |
| **Configuration Drift** | Low (GitOps prevents) | Same | Flux self-heal enabled |
| **Secret Leakage** | Medium | Same | Use Sealed Secrets or SOPS |

**Overall Risk:** **Low to Medium** with current setup
**Risk with Recommendations:** **Low** (improved developer experience, same production risk)

---

## 7. Implementation Roadmap

### 7.1 Phase 1: Immediate (This Week)

**Goal:** Improve developer productivity with Tilt

**Tasks:**
1. **Install Tilt** on development machines
2. **Create Tiltfile** for CS720 platform
3. **Test locally** with all 4 services
4. **Document workflow** for team
5. **Train developers** on Tilt usage

**Expected Time:** 4-8 hours
**Expected Benefit:** 30x faster development feedback loop

**Tiltfile Template:**
```python
# Tiltfile
allow_k8s_contexts(['minikube', 'docker-desktop', 'kind-cs720'])

# Frontend
docker_build(
    'ghcr.io/script-repo/cs720-frontend',
    context='./frontend',
    dockerfile='./frontend/Dockerfile',
    live_update=[
        sync('./frontend/src', '/app/src'),
        sync('./frontend/public', '/app/public'),
    ]
)

k8s_yaml('k8s/base/frontend-deployment.yaml')
k8s_resource('cs720-frontend', port_forwards='3000:8080', labels=['frontend'])

# Backend
docker_build(
    'ghcr.io/script-repo/cs720-backend',
    context='.',
    dockerfile='./services/backend/Dockerfile',
    live_update=[
        sync('./services/backend/src', '/app/src'),
        run('cd /app && npm run build', trigger=['./services/backend/src/**/*.ts']),
        restart_container()
    ]
)

k8s_yaml('k8s/base/backend-deployment.yaml')
k8s_resource('cs720-backend', port_forwards='3001:3001', labels=['backend'])

# Proxy
docker_build(
    'ghcr.io/script-repo/cs720-proxy',
    context='.',
    dockerfile='./services/proxy/Dockerfile',
    live_update=[
        sync('./services/proxy/src', '/app/src'),
        restart_container()
    ]
)

k8s_yaml('k8s/base/proxy-deployment.yaml')
k8s_resource('cs720-proxy', port_forwards='3002:3002', labels=['services'])

# AI Service
docker_build(
    'ghcr.io/script-repo/cs720-ai-service',
    context='.',
    dockerfile='./services/ai-service/Dockerfile',
    live_update=[
        sync('./services/ai-service/src', '/app/src'),
        restart_container()
    ]
)

k8s_yaml('k8s/base/ai-service-deployment.yaml')
k8s_resource('cs720-ai-service', port_forwards='3003:3003', labels=['services'])

print("""
╔════════════════════════════════════════════╗
║  CS720 Platform - Development Environment  ║
╠════════════════════════════════════════════╣
║  Frontend:   http://localhost:3000         ║
║  Backend:    http://localhost:3001         ║
║  Proxy:      http://localhost:3002         ║
║  AI Service: http://localhost:3003         ║
║  Tilt UI:    http://localhost:10350        ║
╚════════════════════════════════════════════╝
""")
```

**Usage:**
```bash
# Start development environment
tilt up

# Open Tilt UI
# Browser opens automatically at http://localhost:10350

# Edit code → see changes in 5-10 seconds
```

### 7.2 Phase 2: Short-term (Next Month)

**Goal:** Enhance CI/CD and monitoring

**Tasks:**
1. **Add security scanning** to GitHub Actions (Trivy, Snyk)
2. **Implement semantic versioning** (automatic version bumps)
3. **Add PR environment previews** (ephemeral environments)
4. **Set up monitoring** (Prometheus, Grafana)
5. **Configure alerts** (Slack notifications from Flux)

**Expected Time:** 2-3 days
**Expected Benefit:** Better security, visibility, and quality

**GitHub Actions Enhancement:**
```yaml
# .github/workflows/build-images.yml
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/script-repo/cs720-backend:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### 7.3 Phase 3: Medium-term (Next Quarter)

**Goal:** Multi-environment support and advanced deployment strategies

**Tasks:**
1. **Create staging environment**
2. **Implement Helm charts** (if you have 3+ environments)
3. **Add canary deployments** (Argo Rollouts or Flagger)
4. **Implement secrets management** (Sealed Secrets or External Secrets)
5. **Set up disaster recovery** (Velero backups)

**Expected Time:** 1-2 weeks
**Expected Benefit:** Production-grade reliability and deployment flexibility

**Helm Chart Creation:**
```bash
# Create Helm chart
helm create cs720-helm

# Migrate existing manifests
mv k8s/base/* cs720-helm/templates/

# Extract configuration to values
# Create environment-specific values files
```

### 7.4 Phase 4: Long-term (Future)

**Goal:** Scale and optimize

**Tasks:**
1. **Multi-cluster deployment** (if you expand)
2. **Service mesh** (Istio/Linkerd for advanced traffic management)
3. **GitOps for infrastructure** (Terraform + Atlantis or Flux)
4. **Advanced observability** (OpenTelemetry, distributed tracing)
5. **Cost optimization** (cluster autoscaling, spot instances)

**Considerations:**
- Only implement when you have the scale and need
- Don't over-engineer for current requirements
- Prioritize developer productivity and reliability

---

## 8. Appendix: Quick Reference Commands

### 8.1 Build and Push Images

**Build All Services Locally:**
```bash
# Set variables
export GITHUB_REPOSITORY_OWNER="script-repo"
export VERSION="v1.0.0"

# Build all in parallel
docker build -f frontend/Dockerfile -t ghcr.io/${GITHUB_REPOSITORY_OWNER}/cs720-frontend:${VERSION} frontend &
docker build -f services/backend/Dockerfile -t ghcr.io/${GITHUB_REPOSITORY_OWNER}/cs720-backend:${VERSION} . &
docker build -f services/proxy/Dockerfile -t ghcr.io/${GITHUB_REPOSITORY_OWNER}/cs720-proxy:${VERSION} . &
docker build -f services/ai-service/Dockerfile -t ghcr.io/${GITHUB_REPOSITORY_OWNER}/cs720-ai-service:${VERSION} . &
wait

echo "✅ All images built successfully"
```

**Push to GitHub Container Registry:**
```bash
# Login
export GITHUB_TOKEN="ghp_YourPersonalAccessToken"
echo $GITHUB_TOKEN | docker login ghcr.io -u ${GITHUB_REPOSITORY_OWNER} --password-stdin

# Push all
docker push ghcr.io/${GITHUB_REPOSITORY_OWNER}/cs720-frontend:${VERSION}
docker push ghcr.io/${GITHUB_REPOSITORY_OWNER}/cs720-backend:${VERSION}
docker push ghcr.io/${GITHUB_REPOSITORY_OWNER}/cs720-proxy:${VERSION}
docker push ghcr.io/${GITHUB_REPOSITORY_OWNER}/cs720-ai-service:${VERSION}
```

### 8.2 Flux Commands

**Check Flux Status:**
```bash
# Overall health
flux check

# Sources
flux get sources git

# Kustomizations
flux get kustomizations

# Image repositories
flux get image repository

# Logs
flux logs --follow
```

**Force Reconciliation:**
```bash
# Git source
flux reconcile source git cs720

# Kustomization
flux reconcile kustomization cs720

# With source
flux reconcile kustomization cs720 --with-source
```

**Suspend/Resume:**
```bash
# Suspend
flux suspend kustomization cs720

# Resume
flux resume kustomization cs720
```

### 8.3 Kubernetes Commands

**Check Deployment Status:**
```bash
# All resources
kubectl get all -n cs720

# Deployments
kubectl get deployments -n cs720

# Pods
kubectl get pods -n cs720

# Services
kubectl get svc -n cs720

# Ingress
kubectl get ingress -n cs720
```

**View Logs:**
```bash
# Backend logs
kubectl logs -f deployment/cs720-backend -n cs720

# All pods for a service
kubectl logs -f -l app=cs720-backend -n cs720

# Previous logs (if pod crashed)
kubectl logs --previous deployment/cs720-backend -n cs720
```

**Describe Resources:**
```bash
# Deployment
kubectl describe deployment cs720-backend -n cs720

# Pod
kubectl describe pod <pod-name> -n cs720

# Service
kubectl describe svc cs720-backend -n cs720
```

**Execute Commands in Pods:**
```bash
# Shell access
kubectl exec -it deployment/cs720-backend -n cs720 -- /bin/sh

# Run command
kubectl exec deployment/cs720-backend -n cs720 -- node -v
```

### 8.4 Tilt Commands

**Start Development:**
```bash
# Start Tilt
tilt up

# Start in background
tilt up -- --stream

# Stop
tilt down

# View logs
tilt logs
```

**Tilt CI (for testing):**
```bash
# Run Tilt in CI mode (non-interactive)
tilt ci

# Render manifests without applying
tilt dump
```

### 8.5 Helm Commands

**Install/Upgrade:**
```bash
# Install
helm install cs720 ./cs720-helm \
  --namespace cs720 \
  --create-namespace \
  --values values-production.yaml

# Upgrade
helm upgrade cs720 ./cs720-helm \
  --namespace cs720 \
  --values values-production.yaml

# Dry run
helm install cs720 ./cs720-helm \
  --dry-run --debug
```

**Rollback:**
```bash
# List releases
helm list -n cs720

# History
helm history cs720 -n cs720

# Rollback to previous
helm rollback cs720 -n cs720

# Rollback to specific revision
helm rollback cs720 1 -n cs720
```

**Uninstall:**
```bash
# Uninstall
helm uninstall cs720 -n cs720
```

### 8.6 Troubleshooting

**Pod Not Starting:**
```bash
# Check events
kubectl get events -n cs720 --sort-by='.lastTimestamp'

# Describe pod
kubectl describe pod <pod-name> -n cs720

# Check logs
kubectl logs <pod-name> -n cs720

# Check image pull
kubectl get events -n cs720 | grep -i "pull"
```

**Image Pull Errors:**
```bash
# Check secret
kubectl get secret ghcr-pull-secret -n cs720

# Test image pull manually
docker pull ghcr.io/script-repo/cs720-backend:latest

# Check registry authentication
kubectl get secret ghcr-pull-secret -n cs720 -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
```

**Deployment Not Updating:**
```bash
# Check rollout status
kubectl rollout status deployment/cs720-backend -n cs720

# View rollout history
kubectl rollout history deployment/cs720-backend -n cs720

# Restart deployment
kubectl rollout restart deployment/cs720-backend -n cs720

# Undo rollout
kubectl rollout undo deployment/cs720-backend -n cs720
```

**Flux Not Syncing:**
```bash
# Check Flux logs
flux logs --all-namespaces

# Check Git source
flux get sources git cs720

# Reconcile manually
flux reconcile source git cs720
flux reconcile kustomization cs720

# Check for errors
kubectl describe gitrepository cs720 -n flux-system
kubectl describe kustomization cs720 -n flux-system
```

---

## Summary

### Current State
The CS720 platform is **already production-ready** with:
- ✅ Multi-stage Dockerfiles for all 4 services
- ✅ GitHub Actions CI/CD pipeline
- ✅ GitHub Container Registry integration
- ✅ Flux GitOps deployment
- ✅ Kubernetes manifests with Kustomize
- ✅ High availability (HPA, health checks)

### Recommended Additions
1. **Tilt** for local development (9/10 score) - **Immediate priority**
2. **Helm** for multi-environment management (7/10 score) - **Future consideration**

### Do NOT Change
1. **Keep GitHub Actions** - Already working perfectly (9/10 score)
2. **Keep Flux CD** - Lightweight and effective (8/10 score)
3. **Keep Kustomize** - Simple and sufficient (current needs)

### Deployment Methods to Avoid
1. ⛔ Git clone in containers (2/10)
2. ⛔ Tekton (2/10 - too complex)
3. ⚠️ Jenkins (4/10 - overkill)

### Total Investment Required
- **Time:** 4-8 hours (add Tilt)
- **Cost:** $0
- **Complexity:** Minimal increase
- **Benefit:** 30x faster development feedback loop

**Verdict:** Your current architecture is excellent. Just add Tilt for developer productivity, and you're golden. 🌟

---

**Document Maintenance:**
- Review quarterly
- Update when new deployment tools emerge
- Gather team feedback on Tilt adoption
- Reassess Helm need when adding staging environment

**For Questions or Updates:**
- Consult this document first
- Check official documentation (Flux, Tilt, Kubernetes)
- Test changes in development before production
- Document any deviations from this strategy

---

*End of Document*
