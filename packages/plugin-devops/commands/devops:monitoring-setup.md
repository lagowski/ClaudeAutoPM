# devops:monitoring-setup

Quickly setup production-grade monitoring stack with Prometheus, Grafana, and alerting using Context7-verified best practices.

## Description

Deploy a complete observability stack with automatic service discovery, pre-built dashboards, intelligent alerting, and SLO tracking. This command automates the setup of:

- **Monitoring Stack**: Prometheus + Grafana + AlertManager
- **Auto-Discovery**: Service discovery for Kubernetes, Docker, AWS
- **Dashboards**: Pre-built dashboards for Node.js, databases, and infrastructure
- **Alerting**: Production-ready alert rules for CPU, memory, disk, and error rates
- **SLO Tracking**: Availability, latency, and error budget monitoring

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: prometheus, grafana, kubernetes, alertmanager, docker.

## Usage

```bash
/devops:monitoring-setup [options]
```

## Options

- `--stack <type>` - Monitoring stack type (default: prometheus-grafana)
  - `prometheus-grafana` - Prometheus + Grafana + AlertManager
  - `prometheus-only` - Prometheus standalone
  - `grafana-cloud` - Use Grafana Cloud

- `--platform <target>` - Deployment platform (default: kubernetes)
  - `kubernetes` - Deploy to Kubernetes cluster
  - `docker` - Deploy via Docker Compose
  - `docker-swarm` - Deploy to Docker Swarm
  - `aws` - Deploy to AWS (ECS/EC2)

- `--namespace <name>` - Kubernetes namespace (default: monitoring)

- `--add-dashboards <dashboards>` - Comma-separated list of pre-built dashboards
  - `nodejs` - Node.js application metrics
  - `postgresql` - PostgreSQL database metrics
  - `redis` - Redis cache metrics
  - `nginx` - NGINX web server metrics
  - `docker` - Docker container metrics
  - `kubernetes` - Kubernetes cluster metrics

- `--slo-targets <targets>` - SLO targets (e.g., "availability=99.9,latency_p95=200ms")

- `--retention <period>` - Metrics retention period (default: 15d)

- `--storage-size <size>` - Persistent storage size (default: 50Gi)

- `--alert-channels <channels>` - Alert notification channels
  - `slack` - Slack webhook integration
  - `pagerduty` - PagerDuty integration
  - `email` - Email notifications
  - `webhook` - Custom webhook

- `--scrape-interval <interval>` - Prometheus scrape interval (default: 15s)

- `--dry-run` - Preview configuration without deploying

## Examples

### Basic Prometheus + Grafana Stack Setup

```bash
/devops:monitoring-setup --stack prometheus-grafana
```

**Output:**
```
📊 Monitoring Stack Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Prometheus deployed to monitoring namespace
✓ Grafana deployed with default dashboards
✓ AlertManager configured

🌐 Access URLs:
  Prometheus: http://prometheus.monitoring.svc.cluster.local:9090
  Grafana: http://grafana.monitoring.svc.cluster.local:3000
  AlertManager: http://alertmanager.monitoring.svc.cluster.local:9093

🔑 Grafana Credentials:
  Username: admin
  Password: [stored in monitoring/grafana-secret]
```

### Kubernetes Deployment with Custom Namespace

```bash
/devops:monitoring-setup --platform kubernetes --namespace observability
```

**Output:**
```
📦 Deploying to Kubernetes (observability namespace)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Created namespace: observability
✓ Installed Prometheus Operator via Helm
✓ Configured ServiceMonitors for auto-discovery
✓ Deployed Grafana with OAuth integration
✓ Configured PersistentVolumeClaims (50Gi each)

📊 Service Discovery Active:
  - Kubernetes pods (annotation: prometheus.io/scrape=true)
  - Kubernetes services (ServiceMonitor CRDs)
  - Node exporters on all nodes

🔍 Auto-discovered targets: 47 active scrapers
```

### Add Pre-built Dashboards

```bash
/devops:monitoring-setup --add-dashboards nodejs,postgresql,redis
```

**Output:**
```
📈 Installing Dashboards
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Node.js Dashboard (ID: 11159)
  - Request rate and latency
  - Memory and CPU usage
  - Event loop metrics
  - GC statistics

✓ PostgreSQL Dashboard (ID: 9628)
  - Connection pool metrics
  - Query performance
  - Database size and growth
  - Lock monitoring

✓ Redis Dashboard (ID: 11835)
  - Hit/miss rate
  - Memory usage
  - Command statistics
  - Replication lag

🌐 View dashboards: http://grafana.monitoring/dashboards
```

### Configure SLO Targets

```bash
/devops:monitoring-setup --slo-targets "availability=99.9,latency_p95=200ms,error_rate=0.1"
```

**Output:**
```
🎯 SLO Monitoring Configured
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Service Level Objectives:
  ✓ Availability: 99.9% (43.2min downtime/month)
  ✓ Latency P95: 200ms
  ✓ Error Rate: 0.1% (1 error per 1000 requests)

📊 SLO Dashboard Created:
  - Current performance vs targets
  - Error budget remaining
  - Burn rate alerts
  - Historical trend analysis

⚠️  Alerts configured:
  - Fast burn: Page if budget exhausted in 1h
  - Slow burn: Warning if budget exhausted in 6h
```

### Docker Compose Setup

```bash
/devops:monitoring-setup --platform docker --alert-channels slack,email
```

**Output:**
```
🐳 Docker Compose Monitoring Stack
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Created docker-compose.monitoring.yml
✓ Configured AlertManager routing

Services:
  - prometheus: Port 9090
  - grafana: Port 3000
  - alertmanager: Port 9093
  - node-exporter: Port 9100
  - cadvisor: Port 8080

Alert Channels:
  ✓ Slack: #monitoring-alerts
  ✓ Email: ops-team@company.com

To start: docker-compose -f docker-compose.monitoring.yml up -d
```

### AWS Deployment

```bash
/devops:monitoring-setup --platform aws --storage-size 100Gi
```

**Output:**
```
☁️  AWS Monitoring Stack Deployment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Created EFS volumes (100Gi) for Prometheus storage
✓ Deployed to ECS cluster: monitoring-cluster
✓ Configured CloudWatch integration
✓ Setup CloudWatch Logs → Prometheus adapter

Resources Created:
  - ECS Service: prometheus (2 tasks)
  - ECS Service: grafana (1 task)
  - ALB: monitoring-alb
  - EFS: monitoring-storage (100Gi)
  - IAM Roles: prometheus-role, grafana-role

🌐 Access:
  Grafana: https://monitoring.example.com
  Prometheus: https://prometheus.example.com
```

## Implementation

This command uses the **@observability-engineer** agent along with platform-specific agents:

### Step 1: Query Context7 for Best Practices

```markdown
Before setup, the agent queries:
- Prometheus configuration patterns
- Grafana dashboard best practices
- AlertManager routing strategies
- SLO/SLI implementation patterns
- Platform-specific deployment patterns
```

### Step 2: Platform Detection and Preparation

**Kubernetes:**
```bash
# Uses @kubernetes-orchestrator agent
- Install Prometheus Operator via Helm
- Create namespace and RBAC
- Configure ServiceMonitors for auto-discovery
- Setup PersistentVolumeClaims
```

**Docker Compose:**
```bash
# Uses @docker-containerization-expert agent
- Generate docker-compose.yml
- Configure volume mounts
- Setup networking
- Create scrape configs
```

**AWS:**
```bash
# Uses @aws-cloud-architect agent
- Create ECS task definitions
- Setup ALB and target groups
- Configure EFS volumes
- Integrate with CloudWatch
```

### Step 3: Prometheus Configuration

**Prometheus Configuration Template:**

```yaml
# Prometheus config (from Context7 best practices)
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    environment: 'prod'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/rules/*.yml'

scrape_configs:
  # Kubernetes service discovery
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2

  # Node exporter metrics
  - job_name: 'node-exporter'
    kubernetes_sd_configs:
      - role: endpoints
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: node-exporter

  # Application metrics
  - job_name: 'application'
    static_configs:
      - targets: ['app:8080']
    metrics_path: '/metrics'
```

### Step 4: Grafana Dashboard Setup

**Auto-import Popular Dashboards:**

```javascript
// Grafana dashboard provisioning (from Context7)
{
  "apiVersion": 1,
  "providers": [
    {
      "name": "default",
      "type": "file",
      "options": {
        "path": "/etc/grafana/dashboards"
      }
    }
  ]
}
```

**Pre-configured Dashboards:**

1. **Node.js Dashboard** (ID: 11159)
   - HTTP request rate and latency
   - Memory heap usage
   - CPU and event loop metrics
   - Garbage collection stats

2. **PostgreSQL Dashboard** (ID: 9628)
   - Connection pool metrics
   - Query performance (P50, P95, P99)
   - Database size and growth
   - Lock and deadlock monitoring

3. **Kubernetes Cluster Dashboard** (ID: 7249)
   - Node resource usage
   - Pod CPU and memory
   - Network I/O
   - Persistent volume usage

4. **Redis Dashboard** (ID: 11835)
   - Cache hit/miss rate
   - Memory usage and fragmentation
   - Command statistics
   - Replication lag

### Step 5: AlertManager Configuration

**AlertManager Config (from Context7):**

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    # Critical alerts to PagerDuty
    - match:
        severity: critical
      receiver: pagerduty
      continue: true

    # Warning alerts to Slack
    - match:
        severity: warning
      receiver: slack

    # Info alerts to email
    - match:
        severity: info
      receiver: email

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#monitoring-alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        description: '{{ .GroupLabels.alertname }}'

  - name: 'slack'
    slack_configs:
      - channel: '#monitoring-warnings'
        title: 'Warning: {{ .GroupLabels.alertname }}'

  - name: 'email'
    email_configs:
      - to: 'ops-team@company.com'
        from: 'alertmanager@company.com'
        smarthost: 'smtp.company.com:587'
```

### Step 6: Alert Rules

**Production-Ready Alert Rules (from Context7 SRE practices):**

```yaml
groups:
  - name: infrastructure_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | humanizePercentage }} on {{ $labels.instance }}"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      # Disk space critical
      - alert: DiskSpaceCritical
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Disk space critical on {{ $labels.instance }}"
          description: "Only {{ $value | humanizePercentage }} disk space remaining on {{ $labels.mountpoint }}"

  - name: application_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.service }}"

      # High latency P95
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s for {{ $labels.service }}"

      # Service down
      - alert: ServiceDown
        expr: up{job="application"} == 0
        for: 1m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.job }} service has been down for more than 1 minute"
```

### Step 7: SLO/SLI Monitoring

**SLO Configuration (using Sloth framework):**

```yaml
# SLO definition (from Context7 SRE patterns)
version: "prometheus/v1"
service: "api-service"
labels:
  team: "backend"

slos:
  # Availability SLO
  - name: "availability"
    objective: 99.9
    description: "API availability should be 99.9%"
    sli:
      events:
        error_query: |
          sum(rate(http_requests_total{job="api",status=~"5.."}[5m]))
        total_query: |
          sum(rate(http_requests_total{job="api"}[5m]))
    alerting:
      name: "AvailabilitySLOBreach"
      labels:
        severity: critical
      annotations:
        summary: "Availability SLO breach"
      page_alert:
        labels:
          severity: critical
      ticket_alert:
        labels:
          severity: warning

  # Latency SLO
  - name: "latency"
    objective: 99.0
    description: "99% of requests should complete under 200ms"
    sli:
      events:
        error_query: |
          sum(rate(http_request_duration_seconds_bucket{job="api",le="0.2"}[5m]))
        total_query: |
          sum(rate(http_request_duration_seconds_count{job="api"}[5m]))
    alerting:
      name: "LatencySLOBreach"
      labels:
        severity: warning
```

**Error Budget Dashboard:**

```json
{
  "dashboard": {
    "title": "SLO Error Budget",
    "panels": [
      {
        "id": 1,
        "title": "Availability Error Budget",
        "targets": [
          {
            "expr": "1 - ((1 - slo:availability:error_rate) / (1 - 0.999))",
            "legendFormat": "Error Budget Consumed"
          }
        ],
        "type": "gauge"
      },
      {
        "id": 2,
        "title": "Error Budget Burn Rate",
        "targets": [
          {
            "expr": "slo:availability:burn_rate_1h",
            "legendFormat": "1h Burn Rate"
          },
          {
            "expr": "slo:availability:burn_rate_6h",
            "legendFormat": "6h Burn Rate"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### Step 8: Service Discovery Configuration

**Kubernetes Auto-Discovery (from Context7):**

```yaml
# ServiceMonitor for automatic pod discovery
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: application-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      metrics: enabled
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

**Docker Swarm Auto-Discovery:**

```yaml
# Prometheus config for Docker Swarm
scrape_configs:
  - job_name: 'docker-swarm'
    dockerswarm_sd_configs:
      - host: unix:///var/run/docker.sock
        role: tasks
    relabel_configs:
      - source_labels: [__meta_dockerswarm_service_label_prometheus_enable]
        action: keep
        regex: true
```

### Step 9: Storage and Retention

**Persistent Storage Configuration:**

```yaml
# Prometheus StatefulSet with persistent storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
spec:
  serviceName: prometheus
  replicas: 2
  volumeClaimTemplates:
    - metadata:
        name: prometheus-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: "fast-ssd"
        resources:
          requests:
            storage: 50Gi
```

**Retention Policy:**

```yaml
# Prometheus retention configuration
args:
  - '--storage.tsdb.retention.time=15d'
  - '--storage.tsdb.retention.size=45GB'
  - '--storage.tsdb.path=/prometheus'
  - '--config.file=/etc/prometheus/prometheus.yml'
```

## Output Format

```
📊 MONITORING STACK DEPLOYMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Stack Components:
  ✓ Prometheus v2.45.0 deployed
  ✓ Grafana v10.0.0 deployed
  ✓ AlertManager v0.26.0 deployed
  ✓ Node Exporter deployed on 5 nodes
  ✓ kube-state-metrics deployed

🌐 Access URLs:
  Prometheus: http://prometheus.monitoring:9090
  Grafana URL: http://grafana.monitoring:3000
  AlertManager: http://alertmanager.monitoring:9093

📊 Dashboards Installed:
  ✓ Kubernetes Cluster Overview
  ✓ Node.js Application Metrics
  ✓ PostgreSQL Database Metrics
  ✓ Redis Cache Metrics

🔔 Alert Routing Configured:
  ✓ Critical → PagerDuty
  ✓ Warning → Slack (#monitoring-alerts)
  ✓ Info → Email (ops@company.com)

🎯 SLO Monitoring:
  ✓ Availability: 99.9% (43.2min/month budget)
  ✓ Latency P95: 200ms
  ✓ Error Rate: 0.1%

📈 Metrics Collection:
  ✓ Auto-discovery: 47 active targets
  ✓ Scrape interval: 15s
  ✓ Retention: 15 days
  ✓ Storage: 50Gi persistent volume

🔒 Security:
  ✓ RBAC configured
  ✓ OAuth integration enabled
  ✓ TLS certificates installed
  ✓ Network policies applied

📖 Next Steps:
  1. Access Grafana: http://grafana.monitoring:3000
  2. Default credentials in secret: monitoring/grafana-secret
  3. Add custom dashboards: /grafana/dashboards
  4. Configure alert receivers: /alertmanager/config
  5. View metrics: /prometheus/targets
  6. Documentation for adding custom metrics: .claude/docs/monitoring-setup.md
```

## Best Practices Applied

Based on Context7 documentation and SRE best practices:

1. **Service Discovery** - Automatic target discovery for Kubernetes, Docker, AWS
2. **High Availability** - Prometheus with replicas and persistent storage
3. **Alerting Strategy** - Multi-channel routing (PagerDuty, Slack, Email)
4. **SLO-based Alerting** - Error budget and burn rate alerts
5. **Security** - RBAC, OAuth, TLS, network policies
6. **Retention** - Appropriate retention periods with size limits
7. **Performance** - Optimized scrape intervals and recording rules
8. **Dashboards** - Pre-built, production-tested dashboards
9. **Documentation** - Auto-generated setup documentation
10. **Scalability** - StatefulSet with persistent storage for horizontal scaling

## Related Commands

- `/devops:alerting-configure` - Configure advanced alerting rules
- `/devops:dashboard-create` - Create custom Grafana dashboards
- `/devops:slo-define` - Define and track SLOs
- `/cloud:validate` - Validate infrastructure monitoring

## Related Agents

- **@observability-engineer** - Primary agent for monitoring implementation
- **@kubernetes-orchestrator** - Kubernetes deployment and ServiceMonitors
- **@docker-containerization-expert** - Docker Compose stack setup
- **@aws-cloud-architect** - AWS monitoring integration

## Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check ServiceMonitor configuration
kubectl get servicemonitors -n monitoring

# Verify pod annotations
kubectl get pods -n <namespace> -o yaml | grep prometheus.io

# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets
```

### Grafana Dashboard Not Loading

```bash
# Check dashboard provisioning
kubectl logs -n monitoring deployment/grafana | grep dashboard

# Verify datasource connection
curl http://grafana:3000/api/datasources
```

### Alerts Not Firing

```bash
# Check alert rules
curl http://prometheus:9090/api/v1/rules

# Verify AlertManager config
curl http://alertmanager:9093/api/v1/status

# Test alert routing
curl -X POST http://alertmanager:9093/api/v1/alerts
```

### High Memory Usage

```bash
# Reduce retention period
--storage.tsdb.retention.time=7d

# Limit memory usage
--storage.tsdb.min-block-duration=2h
--storage.tsdb.max-block-duration=2h

# Increase scrape interval
scrape_interval: 30s
```

## Security Considerations

1. **Authentication**: Enable OAuth or basic auth for Grafana
2. **RBAC**: Configure Kubernetes RBAC for Prometheus
3. **Network Policies**: Restrict access to monitoring namespace
4. **TLS**: Enable TLS for all monitoring endpoints
5. **Secrets Management**: Store credentials in Kubernetes secrets
6. **Alert Sanitization**: Sanitize alert notifications to prevent data leaks

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Complete Prometheus + Grafana + AlertManager stack
- SLO/SLI monitoring with error budget tracking
- Multi-platform support (K8s, Docker, AWS)
- Pre-built dashboard collection
