# CS720 Platform - Containerized Deployment Guide

This guide covers containerizing the CS720 platform and deploying it to Kubernetes with high availability using Flux GitOps and containerd runtime.

## Architecture Overview

### Services
- **Frontend**: React PWA served by nginx (Port 8080)
- **Backend**: Fastify API with SQLite database (Port 3001)
- **Proxy**: CORS proxy service (Port 3002)
- **AI Service**: LLM integration service (Port 3003)

### Infrastructure Stack
- **Container Runtime**: containerd (not Docker)
- **Image Registry**: GitHub Container Registry (ghcr.io)
- **Build System**: GitHub Actions with buildx
- **Orchestration**: Kubernetes
- **GitOps**: Flux CD
- **High Availability**: Multiple replicas, HPA, health checks

## Prerequisites

### Required Tools
1. **Kubernetes cluster** with containerd runtime
   - Minimum: 4 vCPUs, 8GB RAM
   - Recommended: 8+ vCPUs, 16GB+ RAM

2. **kubectl** - Kubernetes CLI
   ```bash
   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
   ```

3. **Flux CLI**
   ```bash
   # Install Flux CLI
   curl -s https://fluxcd.io/install.sh | sudo bash

   # Verify installation
   flux --version
   ```

4. **GitHub Personal Access Token**
   - Create at: https://github.com/settings/tokens
   - Scopes needed: `repo`, `write:packages`, `read:packages`

### Optional Tools
- **metrics-server** - For HPA (auto-scaling)
- **Ingress controller** - nginx, traefik, etc.
- **cert-manager** - For TLS certificates
- **Sealed Secrets** or **External Secrets** - Secret management

## Step-by-Step Deployment

### Phase 1: Prepare Repository

#### 1.1 Update Configuration Files

Before deploying, you need to customize several files with your GitHub username and domain:

**GitHub Actions** (.github/workflows/build-images.yml):
```yaml
# No changes needed - IMAGE_PREFIX is automatically set from your GitHub username
```

**Flux Sources** (flux/sources/cs720-repo.yaml):
```yaml
spec:
  url: https://github.com/YOUR-USERNAME/cs720
```

**Flux Image Automation** (flux/image-automation/\*.yaml):
```yaml
spec:
  image: ghcr.io/YOUR-USERNAME/cs720-frontend
```

**Kubernetes Deployments** (k8s/base/\*-deployment.yaml):
```yaml
image: ghcr.io/YOUR-USERNAME/cs720-frontend:latest
```

**Ingress** (k8s/base/ingress.yaml):
```yaml
- host: cs720.example.com  # Your actual domain
```

**Kustomization** (k8s/base/kustomization.yaml):
```yaml
images:
  - name: ghcr.io/YOUR-USERNAME/cs720-backend
```

#### 1.2 Update Secrets Template

Edit `k8s/base/secrets.yaml` with your actual values (or better yet, use Sealed Secrets):

```bash
# Option 1: Create secrets directly in cluster (not recommended for production)
kubectl create namespace cs720
kubectl create secret generic cs720-secrets \
  --from-literal=SALESFORCE_CLIENT_ID="your-value" \
  --from-literal=SALESFORCE_CLIENT_SECRET="your-value" \
  --from-literal=ENCRYPTION_KEY="your-32-character-key" \
  --namespace=cs720

# Option 2: Use Sealed Secrets (recommended)
# Follow: https://github.com/bitnami-labs/sealed-secrets
```

### Phase 2: Set Up GitHub Container Registry

#### 2.1 Enable GHCR

GHCR is automatically enabled for your GitHub account. No additional setup needed.

#### 2.2 Configure Package Visibility (Optional)

After first push, go to:
```
https://github.com/YOUR-USERNAME?tab=packages
```

Make packages public or keep private (you'll need authentication for private).

### Phase 3: Build and Push Container Images

#### 3.1 Commit and Push Code

```bash
# Add all new files
git add .

# Commit containerization changes
git commit -m "Add containerization and Kubernetes deployment

- Add Dockerfiles for all services
- Add GitHub Actions workflow for image building
- Add Kubernetes manifests with HA configuration
- Add Flux GitOps configuration"

# Push to GitHub
git push origin main
```

#### 3.2 Trigger Image Builds

Pushing to `main` branch automatically triggers GitHub Actions to build images.

Monitor the build:
```bash
# Via GitHub web UI
https://github.com/YOUR-USERNAME/cs720/actions

# Or via CLI (requires gh)
gh workflow view "Build and Push Container Images" --web
```

The workflow will build and push 4 images:
- `ghcr.io/YOUR-USERNAME/cs720-frontend:latest`
- `ghcr.io/YOUR-USERNAME/cs720-backend:latest`
- `ghcr.io/YOUR-USERNAME/cs720-proxy:latest`
- `ghcr.io/YOUR-USERNAME/cs720-ai-service:latest`

### Phase 4: Install Flux on Kubernetes

#### 4.1 Verify Cluster

```bash
# Check cluster connection
kubectl cluster-info

# Verify containerd runtime
kubectl get nodes -o wide
# Should show CONTAINER-RUNTIME: containerd://...

# Check Flux prerequisites
flux check --pre
```

#### 4.2 Bootstrap Flux

```bash
# Set your GitHub username
export GITHUB_USER=YOUR-USERNAME
export GITHUB_TOKEN=your-personal-access-token

# Bootstrap Flux
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=cs720 \
  --branch=main \
  --path=./flux \
  --personal \
  --private=false
```

This command will:
- Install Flux components in `flux-system` namespace
- Create a deploy key for the repository
- Commit Flux manifests to your repo
- Start monitoring the repository

#### 4.3 Verify Flux Installation

```bash
# Check Flux components
flux check

# View all Flux resources
flux get all

# Watch for reconciliation
flux get kustomizations --watch
```

### Phase 5: Deploy Application

#### 5.1 Apply Application Configuration

```bash
# Apply Flux sources
kubectl apply -f flux/sources/cs720-repo.yaml

# Apply Flux kustomizations
kubectl apply -f flux/kustomizations/cs720.yaml

# Optional: Apply image automation (for automatic updates)
kubectl apply -f flux/image-automation/
```

#### 5.2 Monitor Deployment

```bash
# Watch Flux reconciliation
flux logs --follow

# Check application namespace
kubectl get all -n cs720

# Watch pods coming up
kubectl get pods -n cs720 --watch

# Check deployments
kubectl get deployments -n cs720

# Check services
kubectl get svc -n cs720
```

#### 5.3 Verify Health

```bash
# Check deployment status
kubectl rollout status deployment/cs720-frontend -n cs720
kubectl rollout status deployment/cs720-backend -n cs720
kubectl rollout status deployment/cs720-proxy -n cs720
kubectl rollout status deployment/cs720-ai-service -n cs720

# Check HPA (if metrics-server is installed)
kubectl get hpa -n cs720

# Check pod logs
kubectl logs -f deployment/cs720-backend -n cs720
```

### Phase 6: Configure Ingress (Optional)

#### 6.1 Install Ingress Controller

If not already installed:

```bash
# For nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Wait for it to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

#### 6.2 Update DNS

Point your domain to the ingress controller's external IP:

```bash
# Get the external IP
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Add DNS A record:
# cs720.example.com -> EXTERNAL-IP
```

#### 6.3 Configure TLS (Optional)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Update ingress annotations in k8s/base/ingress.yaml
# Then commit and push to trigger Flux update
```

## High Availability Features

### Implemented HA Features

1. **Multiple Replicas**
   - Frontend: 3 replicas
   - Backend: 3 replicas
   - Proxy: 2 replicas
   - AI Service: 2 replicas

2. **Horizontal Pod Autoscaling**
   - Auto-scales based on CPU and memory utilization
   - Min replicas maintained
   - Max replicas prevent resource exhaustion

3. **Health Checks**
   - Liveness probes: Restart unhealthy pods
   - Readiness probes: Remove pods from load balancing
   - Startup probes: Handle slow-starting applications

4. **Rolling Updates**
   - Zero-downtime deployments
   - Controlled rollout with surge and unavailable settings
   - Automatic rollback on failure

5. **Resource Management**
   - CPU and memory requests guarantee resources
   - Limits prevent resource exhaustion
   - Quality of Service (QoS) classification

6. **Pod Disruption Budgets** (optional - add if needed)
   - Maintain minimum availability during voluntary disruptions

### Scaling Configuration

To adjust scaling:

```bash
# Manual scaling
kubectl scale deployment cs720-backend --replicas=5 -n cs720

# Or edit HPA
kubectl edit hpa cs720-backend-hpa -n cs720
```

## Monitoring and Troubleshooting

### View Logs

```bash
# Single pod
kubectl logs -f deployment/cs720-backend -n cs720

# All pods in deployment
kubectl logs -f -l app=cs720-backend -n cs720

# Previous crashed pod
kubectl logs deployment/cs720-backend --previous -n cs720
```

### Debug Pods

```bash
# Describe pod for events
kubectl describe pod POD-NAME -n cs720

# Execute commands in pod
kubectl exec -it POD-NAME -n cs720 -- /bin/sh

# Port forward for local access
kubectl port-forward svc/cs720-frontend 8080:80 -n cs720
```

### Flux Operations

```bash
# Force reconciliation
flux reconcile source git cs720
flux reconcile kustomization cs720

# Suspend/resume automation
flux suspend kustomization cs720
flux resume kustomization cs720

# View events
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

### Common Issues

#### Pods in ImagePullBackOff

```bash
# Check image name and tag
kubectl describe pod POD-NAME -n cs720

# For private GHCR, create pull secret
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR-USERNAME \
  --docker-password=YOUR-PAT \
  --namespace=cs720

# Add to deployment spec.template.spec.imagePullSecrets
```

#### Pods Crashing (CrashLoopBackOff)

```bash
# Check logs
kubectl logs POD-NAME -n cs720

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Port conflicts
```

#### HPA Not Scaling

```bash
# Check metrics-server
kubectl top nodes
kubectl top pods -n cs720

# If metrics unavailable, install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Updating the Application

### GitOps Workflow (Recommended)

1. Make code changes locally
2. Commit and push to GitHub
3. GitHub Actions builds new images
4. Flux detects new images (if image automation enabled)
5. Flux updates Kubernetes automatically

```bash
# Example workflow
git add .
git commit -m "Add new feature"
git push

# Tag for versioned release
git tag v1.0.1
git push --tags
```

### Manual Update

```bash
# Update image tag in manifests
# Edit k8s/base/*-deployment.yaml

# Commit and push
git add k8s/
git commit -m "Update to v1.0.1"
git push

# Flux will auto-deploy within 1 minute
# Or force immediate reconciliation
flux reconcile kustomization cs720
```

## Backup and Recovery

### Backup SQLite Database

```bash
# Create backup job
kubectl create job cs720-backup-$(date +%Y%m%d) \
  --from=cronjob/cs720-backup -n cs720

# Or manually
POD=$(kubectl get pod -l app=cs720-backend -n cs720 -o jsonpath='{.items[0].metadata.name}')
kubectl cp cs720/$POD:/app/data/database.db ./backup-$(date +%Y%m%d).db
```

### Disaster Recovery

```bash
# Restore from backup
kubectl cp ./backup.db cs720/$POD:/app/data/database.db

# Or restore entire namespace
kubectl apply -k k8s/base/
```

## Production Checklist

- [ ] Update all placeholder values (GitHub username, domain, secrets)
- [ ] Configure proper secrets management (Sealed Secrets/External Secrets)
- [ ] Set up ingress with TLS certificates
- [ ] Configure resource limits based on actual usage
- [ ] Enable pod disruption budgets
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation (ELK/Loki)
- [ ] Set up Flux notifications (Slack/Discord)
- [ ] Configure backup strategy for PVCs
- [ ] Implement network policies for security
- [ ] Set up RBAC for team access
- [ ] Configure image vulnerability scanning
- [ ] Enable audit logging
- [ ] Plan disaster recovery procedures
- [ ] Document runbooks for common operations

## Additional Resources

- [Flux Documentation](https://fluxcd.io/flux/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Containerd Documentation](https://containerd.io/)
- [GHCR Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Kustomize Documentation](https://kustomize.io/)

## Support

For issues or questions:
- Check logs and events as described above
- Review Flux documentation
- Open GitHub issue in the repository
- Consult Kubernetes documentation
