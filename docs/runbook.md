# AI Meeting Contract Bridge - Runbook

## 🚀 Deployment Guide

### Prerequisites

- Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- PostgreSQL 16+ database
- Redis 7+ cluster
- NATS 2+ server
- S3-compatible storage (AWS S3, MinIO, etc.)
- Domain with SSL certificate
- Monitoring stack (Prometheus, Grafana, Jaeger)

### Infrastructure Setup

#### 1. Database Setup
```sql
-- Create database and user
CREATE DATABASE ai_meeting_bridge;
CREATE USER bridge_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ai_meeting_bridge TO bridge_user;

-- Enable required extensions
\c ai_meeting_bridge;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

#### 2. Redis Cluster Configuration
```yaml
# redis.conf
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
```

#### 3. NATS Server Configuration
```yaml
# nats-server.conf
jetstream: enabled
http_port: 8222
server_name: "ai-meeting-bridge-nats"

authorization: {
  users: [
    {user: bridge_worker, password: secure_worker_password},
    {user: bridge_api, password: secure_api_password}
  ]
}
```

### Application Deployment

#### 1. Environment Configuration
```bash
# .env.production
DATABASE_URL=postgresql://bridge_user:secure_password@postgres:5432/ai_meeting_bridge
REDIS_URL=redis://redis-cluster:6379
NATS_URL=nats://bridge_worker:secure_worker_password@nats:4222
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET=ai-meeting-bridge-prod
ENCRYPTION_KEY=your-256-bit-encryption-key-here
JWT_SECRET=your-jwt-secret-here
NODE_ENV=production
```

#### 2. Docker Build and Push
```bash
# Build all services
npm run docker:build

# Tag and push images
docker tag ai-meeting-bridge-api:latest your-registry.com/ai-meeting-bridge-api:v1.0.0
docker tag ai-meeting-bridge-web:latest your-registry.com/ai-meeting-bridge-web:v1.0.0
docker tag ai-meeting-bridge-transcript-worker:latest your-registry.com/ai-meeting-bridge-transcript-worker:v1.0.0
docker tag ai-meeting-bridge-decision-worker:latest your-registry.com/ai-meeting-bridge-decision-worker:v1.0.0
docker tag ai-meeting-bridge-draft-worker:latest your-registry.com/ai-meeting-bridge-draft-worker:v1.0.0
docker tag ai-meeting-bridge-qa-worker:latest your-registry.com/ai-meeting-bridge-qa-worker:v1.0.0
docker tag ai-meeting-bridge-export-worker:latest your-registry.com/ai-meeting-bridge-export-worker:v1.0.0

# Push to registry
docker push your-registry.com/ai-meeting-bridge-api:v1.0.0
docker push your-registry.com/ai-meeting-bridge-web:v1.0.0
# ... push all images
```

#### 3. Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-meeting-bridge-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-meeting-bridge-api
  template:
    metadata:
      labels:
        app: ai-meeting-bridge-api
    spec:
      containers:
      - name: api
        image: your-registry.com/ai-meeting-bridge-api:v1.0.0
        ports:
        - containerPort: 3001
        envFrom:
        - secretRef:
            name: ai-meeting-bridge-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Monitoring Setup

#### 1. Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ai-meeting-bridge-api'
    static_configs:
      - targets: ['api-service:3001']
    metrics_path: '/metrics'

  - job_name: 'ai-meeting-bridge-workers'
    static_configs:
      - targets: ['transcript-worker:8000', 'decision-worker:8001', 'draft-worker:8002', 'qa-worker:8003', 'export-worker:8004']
    metrics_path: '/metrics'
```

#### 2. Grafana Dashboards
Import the following dashboards:
- AI Meeting Contract Bridge - System Overview
- AI Meeting Contract Bridge - Performance Metrics
- AI Meeting Contract Bridge - SLO Tracking
- AI Meeting Contract Bridge - Error Monitoring

## 🔧 Operations

### Daily Operations

#### 1. Health Checks
```bash
# Check all services
kubectl get pods -n production

# Check service health
curl https://api.your-domain.com/v1/health
curl https://transcript-worker.your-domain.com/health
curl https://decision-worker.your-domain.com/health
curl https://draft-worker.your-domain.com/health
curl https://qa-worker.your-domain.com/health
curl https://export-worker.your-domain.com/health
```

#### 2. SLO Monitoring
```bash
# Check SLO compliance
curl https://api.your-domain.com/v1/monitoring/slo-report

# Expected response format:
{
  "sloCompliance": {
    "meetingProcessing": 0.96,  // 96% within 30s target
    "draftGeneration": 0.94,    // 94% within 12s target
    "export": 0.97,             // 97% within 5s target
    "systemAvailability": 0.9995 // 99.95% uptime
  }
}
```

#### 3. Log Analysis
```bash
# View recent errors
kubectl logs -f deployment/ai-meeting-bridge-api -n production --since=1h | grep ERROR

# Check worker queue depths
kubectl exec -it redis-pod -n production -- redis-cli LLEN meeting.ingest
kubectl exec -it redis-pod -n production -- redis-cli LLEN decisions.extract
kubectl exec -it redis-pod -n production -- redis-cli LLEN draft.make
```

### Incident Response

#### High Queue Depth Alert
```bash
# Check queue status
QUEUE_DEPTH=$(kubectl exec -it redis-pod -- redis-cli LLEN meeting.ingest)

if [ "$QUEUE_DEPTH" -gt 100 ]; then
  echo "ALERT: High queue depth detected: $QUEUE_DEPTH"

  # Scale up workers
  kubectl scale deployment transcript-worker --replicas=5 -n production

  # Notify team
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"High queue depth alert: '$QUEUE_DEPTH' items in meeting.ingest"}' \
    YOUR_SLACK_WEBHOOK_URL
fi
```

#### Service Unavailable
```bash
# Check pod status
kubectl get pods -n production

# Check logs for errors
kubectl logs deployment/ai-meeting-bridge-api -n production --previous

# Restart unhealthy pods
kubectl delete pod $(kubectl get pods -n production | grep CrashLoopBackOff | awk '{print $1}')
```

#### Database Issues
```bash
# Check database connectivity
kubectl exec -it postgres-pod -- psql -U bridge_user -d ai_meeting_bridge -c "SELECT 1;"

# Check connection pool
kubectl exec -it api-pod -- curl http://localhost:3001/metrics | grep db_connections

# Restart database if needed
kubectl delete pod postgres-pod
```

## 📊 Performance Optimization

### Scaling Guidelines

#### Horizontal Scaling
```yaml
# Scale API based on CPU usage
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-meeting-bridge-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Worker Scaling
```yaml
# Scale workers based on queue depth
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: transcript-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: transcript-worker
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: External
    external:
      metric:
        name: nats_queue_depth
        selector:
          matchLabels:
            queue: meeting.ingest
      target:
        type: AverageValue
        averageValue: "50"
```

### Database Optimization

#### Connection Pooling
```typescript
// TypeORM configuration for production
export const databaseConfig = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false, // Never use in production
  logging: false,
  poolSize: 10,
  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },
  ssl: {
    rejectUnauthorized: false,
  },
};
```

#### Query Optimization
```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_meetings_status_created ON meetings(status, created_at);
CREATE INDEX CONCURRENTLY idx_decisions_meeting_confidence ON decisions(meeting_id, confidence DESC);
CREATE INDEX CONCURRENTLY idx_drafts_contract_type_status ON drafts(contract_type, status);

-- Partition large tables by date
CREATE TABLE decisions_y2024m01 PARTITION OF decisions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## 🔒 Security Operations

### Certificate Management
```bash
# Renew SSL certificates
certbot certonly --webroot -w /var/www/html -d your-domain.com

# Update Kubernetes secrets
kubectl create secret tls ai-meeting-bridge-tls \
  --cert=/etc/letsencrypt/live/your-domain.com/fullchain.pem \
  --key=/etc/letsencrypt/live/your-domain.com/privkey.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Backup Strategy
```bash
# Database backup
kubectl exec -it postgres-pod -- pg_dump -U bridge_user ai_meeting_bridge > backup.sql

# S3 backup
aws s3 sync s3://ai-meeting-bridge-prod s3://ai-meeting-bridge-backup/$(date +%Y-%m-%d)

# Configuration backup
kubectl get all -n production -o yaml > k8s-backup.yaml
```

### Access Control
```bash
# Rotate service account tokens
kubectl create token ai-meeting-bridge-sa --duration=8760h > new-token.txt

# Update secrets
kubectl create secret generic ai-meeting-bridge-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=redis-url=$REDIS_URL \
  --from-literal=new-service-token=$(cat new-token.txt) \
  --dry-run=client -o yaml | kubectl apply -f -
```

## 🚨 Emergency Procedures

### Complete System Outage
```bash
# 1. Check cluster status
kubectl get nodes
kubectl get pods -n production

# 2. Restart critical services
kubectl rollout restart deployment/ai-meeting-bridge-api -n production
kubectl rollout restart deployment/postgres -n production
kubectl rollout restart deployment/redis -n production

# 3. Check application health
curl https://api.your-domain.com/v1/health

# 4. Notify stakeholders if downtime exceeds 5 minutes
```

### Data Loss Recovery
```bash
# 1. Stop all writes to prevent further corruption
kubectl scale deployment ai-meeting-bridge-api --replicas=0 -n production

# 2. Restore from backup
kubectl exec -it postgres-pod -- psql -U bridge_user -d ai_meeting_bridge < backup.sql

# 3. Verify data integrity
kubectl exec -it postgres-pod -- psql -U bridge_user -d ai_meeting_bridge -c "SELECT COUNT(*) FROM meetings;"

# 4. Restart services
kubectl scale deployment ai-meeting-bridge-api --replicas=3 -n production
```

### Security Incident Response
```bash
# 1. Isolate affected systems
kubectl cordon affected-node

# 2. Rotate all credentials
# Generate new encryption keys, database passwords, API keys

# 3. Update secrets
kubectl apply -f updated-secrets.yaml

# 4. Restart all deployments
kubectl rollout restart deployment -n production

# 5. Audit logs for breach details
kubectl logs deployment/ai-meeting-bridge-api -n production --since=24h | grep -i "unauthorized\|breach\|attack"
```

## 📈 Monitoring Dashboards

### Key Metrics to Monitor

1. **System Health**
   - Pod status and restarts
   - CPU/Memory usage
   - Network I/O

2. **Application Performance**
   - Request latency (p50, p95, p99)
   - Error rates by endpoint
   - Queue depths

3. **Business Metrics**
   - Meetings processed per hour
   - Drafts generated per day
   - User engagement rates

4. **SLO Compliance**
   - Meeting processing: < 30s p95
   - Draft generation: < 12s p95
   - Export completion: < 5s p95

### Alert Configuration

```yaml
# Alert manager configuration
groups:
  - name: ai-meeting-bridge
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"

      - alert: SLOViolation
        expr: slo_error_budget_remaining < 0.2
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "SLO violation detected"
          description: "Error budget remaining: {{ $value }}%"
```

## 🔄 Maintenance Tasks

### Weekly Tasks
- [ ] Review SLO compliance reports
- [ ] Check certificate expiration dates
- [ ] Update security patches
- [ ] Review and rotate logs
- [ ] Monitor storage usage

### Monthly Tasks
- [ ] Performance optimization review
- [ ] Database maintenance (VACUUM, REINDEX)
- [ ] Backup verification
- [ ] Dependency updates
- [ ] Security audit

### Quarterly Tasks
- [ ] Infrastructure capacity planning
- [ ] Disaster recovery testing
- [ ] Compliance audit
- [ ] Cost optimization review

---

**Last Updated:** January 2024
**Version:** 1.0.0
**Contact:** DevOps Team
