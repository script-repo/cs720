# Flux GitOps Configuration

This directory contains Flux CD configuration for automated deployment of the CS720 platform to Kubernetes.

## Directory Structure

```
flux/
├── sources/              # GitRepository sources
│   └── cs720-repo.yaml   # Main repository source
├── kustomizations/       # Kustomization resources
│   └── cs720.yaml        # Main application kustomization
└── image-automation/     # Automated image updates (optional)
    ├── image-repository.yaml
    ├── image-policy.yaml
    └── image-update.yaml
```

## Prerequisites

1. **Kubernetes cluster** with containerd runtime
2. **Flux CLI** installed: https://fluxcd.io/flux/installation/
3. **kubectl** configured to access your cluster
4. **GitHub personal access token** (PAT) with repo access

## Installation

### 1. Install Flux on your cluster

```bash
# Check prerequisites
flux check --pre

# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=script-repo \
  --repository=cs720 \
  --branch=main \
  --path=./flux \
  --personal \
  --private=false
```

This will:
- Install Flux components in `flux-system` namespace
- Create a deploy key for the repository
- Commit the Flux manifests to the repository
- Configure Flux to sync from the repository

### 2. Configure image registry authentication (for private GHCR)

If using private GitHub Container Registry:

```bash
# Create secret for GHCR authentication
kubectl create secret docker-registry ghcr-auth \
  --namespace=flux-system \
  --docker-server=ghcr.io \
  --docker-username=script-repo \
  --docker-password=YOUR-GITHUB-PAT \
  --docker-email=YOUR-EMAIL
```

### 3. Configure application secrets

```bash
# Create the cs720 namespace first
kubectl create namespace cs720

# Create application secrets from .env file
kubectl create secret generic cs720-secrets \
  --from-env-file=./services/backend/.env \
  --namespace=cs720
```

Or use a secret management solution like:
- **Sealed Secrets**: https://github.com/bitnami-labs/sealed-secrets
- **External Secrets**: https://external-secrets.io/
- **SOPS with Flux**: https://fluxcd.io/flux/guides/mozilla-sops/

### 4. Update configuration

Before deploying, update the following files with your values:

1. **flux/sources/cs720-repo.yaml**
   - Replace `script-repo` with your GitHub username/org

2. **flux/image-automation/\*.yaml** (if using image automation)
   - Replace `script-repo` with your GitHub username/org

3. **k8s/base/\*.yaml**
   - Update image references to match your GHCR path
   - Update ingress hostname
   - Adjust resource limits based on your cluster capacity

### 5. Apply Flux configuration

```bash
# Apply the Flux configuration
kubectl apply -k flux/

# Watch the deployment
flux get kustomizations --watch

# Check logs if needed
flux logs --follow
```

## Verifying Deployment

```bash
# Check all Flux resources
flux get all

# Check application status
kubectl get all -n cs720

# Check pods
kubectl get pods -n cs720

# Check HPAs
kubectl get hpa -n cs720

# Tail logs from a specific service
kubectl logs -f deployment/cs720-backend -n cs720
```

## Image Update Automation

The image automation is **optional** and allows Flux to:
1. Monitor GHCR for new images
2. Automatically update image tags in git
3. Deploy the new images

To enable:
```bash
kubectl apply -f flux/image-automation/
```

To disable automatic updates, simply don't apply the image-automation manifests.

## Manual Deployment

If you prefer manual control without image automation:

```bash
# Just apply the base Flux configuration
kubectl apply -f flux/sources/cs720-repo.yaml
kubectl apply -f flux/kustomizations/cs720.yaml
```

## Troubleshooting

### Check Flux status
```bash
flux check
flux get sources git
flux get kustomizations
```

### Force reconciliation
```bash
flux reconcile source git cs720
flux reconcile kustomization cs720
```

### Suspend/Resume automation
```bash
# Suspend
flux suspend kustomization cs720

# Resume
flux resume kustomization cs720
```

### View events
```bash
kubectl get events -n flux-system --sort-by='.lastTimestamp'
kubectl get events -n cs720 --sort-by='.lastTimestamp'
```

## Updating the Application

### Method 1: GitOps (Recommended)
Simply push changes to your git repository:
```bash
git add .
git commit -m "Update deployment configuration"
git push
```

Flux will automatically detect and apply changes within 1 minute (or use `flux reconcile` to force immediate sync).

### Method 2: Image Updates
When you push new container images to GHCR (via GitHub Actions), Flux will:
1. Detect the new image (if image automation is enabled)
2. Update the image tag in git
3. Deploy the new version automatically

## Production Considerations

1. **Use separate environments**: Create overlays for staging/production
2. **Enable notifications**: Configure Flux alerts to Slack/Discord/Teams
3. **Use signed commits**: Enable GPG signing for security
4. **Monitor resources**: Set up Prometheus metrics for Flux
5. **Backup**: Regularly backup PersistentVolumes
6. **Security**: Use RBAC and network policies

## Additional Resources

- [Flux Documentation](https://fluxcd.io/flux/)
- [Flux Best Practices](https://fluxcd.io/flux/guides/best-practices/)
- [Kustomize Documentation](https://kustomize.io/)
