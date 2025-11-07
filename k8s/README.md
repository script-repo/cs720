# Kubernetes Manifests

This directory contains Kubernetes manifests for deploying the CS720 platform.

## Structure

```
k8s/
├── base/                          # Base configuration (used by Flux)
│   ├── namespace.yaml             # cs720 namespace
│   ├── configmap.yaml             # Environment configuration
│   ├── secrets.yaml               # Secrets template (DO NOT commit real secrets!)
│   ├── backend-deployment.yaml    # Backend API deployment + service + PVC
│   ├── proxy-deployment.yaml      # CORS proxy deployment + service
│   ├── ai-service-deployment.yaml # AI service deployment + service
│   ├── frontend-deployment.yaml   # Frontend deployment + service
│   ├── hpa.yaml                   # Horizontal Pod Autoscalers
│   ├── ingress.yaml               # Ingress configuration
│   └── kustomization.yaml         # Kustomize configuration
└── overlays/                      # Environment-specific overlays (optional)
    └── production/                # Production customizations
```

## Quick Start

### Deploy with kubectl

```bash
# Apply all manifests
kubectl apply -k k8s/base/

# Check status
kubectl get all -n cs720
```

### Deploy with Flux (Recommended)

See [DEPLOYMENT.md](../DEPLOYMENT.md) for complete Flux setup.

```bash
# Bootstrap Flux
flux bootstrap github --owner=script-repo --repository=cs720 --path=./flux

# Apply Flux configuration
kubectl apply -f flux/sources/cs720-repo.yaml
kubectl apply -f flux/kustomizations/cs720.yaml
```

## Configuration

### Before Deployment

1. **Update image references** in all `*-deployment.yaml` files:
   ```yaml
   image: ghcr.io/script-repo/cs720-frontend:latest
   ```

2. **Update secrets** in `secrets.yaml` or create them separately:
   ```bash
   kubectl create secret generic cs720-secrets --from-env-file=.env -n cs720
   ```

3. **Update ingress hostname** in `ingress.yaml`:
   ```yaml
   - host: your-domain.com
   ```

4. **Update kustomization.yaml** with your image paths

## Services

| Service | Port | Type | Description |
|---------|------|------|-------------|
| cs720-frontend | 80 | ClusterIP | React PWA (nginx) |
| cs720-backend | 3001 | ClusterIP | Fastify API |
| cs720-proxy | 3002 | ClusterIP | CORS Proxy |
| cs720-ai-service | 3003 | ClusterIP | AI/LLM Service |

## High Availability

- **Multiple replicas**: Frontend (3), Backend (3), Proxy (2), AI (2)
- **Auto-scaling**: HPA based on CPU/memory (requires metrics-server)
- **Health checks**: Liveness and readiness probes
- **Rolling updates**: Zero-downtime deployments
- **Resource limits**: Prevent resource exhaustion

## Storage

- **Backend PVC**: 10Gi for SQLite database
- **Access mode**: ReadWriteOnce
- Customize `storageClassName` based on your cluster

## Ingress

Default configuration uses nginx ingress controller:
- Frontend: `/`
- Backend API: `/api`
- Proxy: `/proxy`
- AI Service: `/ai`

Update annotations for your ingress controller or load balancer.

## Customization

### Using Kustomize Overlays

Create environment-specific overlays:

```bash
k8s/overlays/production/
├── kustomization.yaml
├── replica-patch.yaml
└── resource-limits-patch.yaml
```

Then deploy:
```bash
kubectl apply -k k8s/overlays/production/
```

### Resource Limits

Adjust based on actual usage:
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Scaling

Manual scaling:
```bash
kubectl scale deployment cs720-backend --replicas=5 -n cs720
```

Auto-scaling (edit HPA):
```bash
kubectl edit hpa cs720-backend-hpa -n cs720
```

## Monitoring

```bash
# Check pods
kubectl get pods -n cs720

# View logs
kubectl logs -f deployment/cs720-backend -n cs720

# Describe resources
kubectl describe deployment cs720-backend -n cs720

# Check HPA status
kubectl get hpa -n cs720

# Resource usage
kubectl top pods -n cs720
```

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod POD-NAME -n cs720
kubectl logs POD-NAME -n cs720
```

### Image pull errors

Verify image exists and credentials are correct:
```bash
kubectl get events -n cs720 --sort-by='.lastTimestamp'
```

### Health check failures

Check probe configuration and application health:
```bash
kubectl logs POD-NAME -n cs720
kubectl exec -it POD-NAME -n cs720 -- wget -O- http://localhost:3001/health
```

## Security

- Runs as non-root user
- Security contexts configured
- Secrets for sensitive data
- Consider adding NetworkPolicies
- Consider using PodSecurityStandards

## See Also

- [Main Deployment Guide](../DEPLOYMENT.md)
- [Flux Configuration](../flux/README.md)
- [Root README](../README.md)
