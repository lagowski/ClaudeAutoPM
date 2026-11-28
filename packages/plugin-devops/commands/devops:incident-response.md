# devops:incident-response

Guided incident response workflow for production outages with automated diagnostics, intelligent decision support, and remediation recommendations.

## Description

Execute comprehensive incident response workflows with automated diagnostics, severity-based escalation, and intelligent remediation recommendations. This command provides:

- **Severity Classification**: P0/P1/P2/P3 workflows with automated escalation
- **Automated Diagnostics**: Service health, deployment analysis, log correlation, metrics anomaly detection
- **Decision Intelligence**: Rollback vs hotfix recommendations with confidence scoring
- **Timeline Documentation**: Auto-generated incident timeline with key events
- **Communication Templates**: Stakeholder status updates and post-mortem reports
- **Remediation Automation**: Guided or automated rollback with impact assessment

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: kubernetes, prometheus.

## Usage

```bash
/devops:incident-response [options]
```

## Options

- `--severity <level>` - Incident severity classification (required)
  - `critical` (P0) - Production down, auto-page on-call, immediate action
  - `high` (P1) - Major degradation, escalation path, guided investigation
  - `medium` (P2) - Partial impact, standard investigation workflow
  - `low` (P3) - Minor issue, document and schedule fix

- `--service <name>` - Affected service name (required)
  - Examples: `payment-api`, `auth-service`, `user-database`

- `--symptoms <description>` - Incident symptoms (optional)
  - Examples: "500 errors", "high latency", "pod crashes"

- `--namespace <name>` - Kubernetes namespace (default: production)

- `--analyze-deployment <version>` - Analyze specific deployment version
  - Checks deployment correlation with incident timeline

- `--rollback` - Execute automated rollback
  - Requires `--target` version to be specified
  - Performs safety checks before rollback

- `--target <version>` - Target version for rollback
  - Examples: `v2.3.0`, `latest-stable`, `previous`

- `--timeframe <duration>` - Analysis timeframe (default: 4h)
  - Examples: `1h`, `4h`, `24h`

- `--post-mortem` - Generate post-mortem report after resolution
  - Creates RCA document with timeline and findings

- `--dry-run` - Preview diagnostics without executing actions

## Examples

### Critical P0 Incident - Service Down

```bash
/devops:incident-response --severity critical --service payment-api
```

**Output:**
```
🚨 INCIDENT RESPONSE - P0 CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Incident Details
  Service: payment-api
  Severity: P0 (Critical)
  Namespace: production
  Started: 2025-10-21 14:23:15 UTC

📊 Service Health
  ❌ payment-api: 3/5 pods failing (CrashLoopBackOff)
  ⚠️  Database: Connection pool exhausted (95/100)
  ✓ Redis cache: Healthy
  ✓ Auth service: Healthy

🕐 Timeline
  14:23:15 - Deployment v2.3.1 started
  14:23:45 - First pod failed health check
  14:24:10 - Error rate spiked 0.1% → 45%
  14:24:30 - Database connections maxed out
  14:25:00 - Auto-scaling triggered (5 → 10 pods)
  14:25:15 - All new pods failing startup

📈 Metrics Anomaly Detection
  ⚠️  Error rate: 45% (baseline: 0.1%) - 450x increase
  🔴 Latency P95: 8.5s (baseline: 150ms) - 56x increase
  🔴 Database query time: 2.3s (baseline: 50ms) - 46x increase
  ⚠️  Memory usage: 85% (baseline: 60%) - gradual increase
  ⚠️  CPU usage: 40% (baseline: 25%) - moderate increase

🔍 Recent Deployments
  ✓ v2.3.1 deployed 2 minutes ago by @devops-bot
    - Changed: payment processor logic
    - Added: new database query in payment validation
    - 🔴 Correlation: 95% confidence deployment caused incident

📝 Log Analysis (Last 15min)
  ERROR: Database connection timeout (823 occurrences)
  ERROR: Payment validation failed (412 occurrences)
  ERROR: Health check failed /health (156 occurrences)
  WARN: Circuit breaker opened for database (45 occurrences)

🔗 Distributed Tracing
  ⚠️  Trace analysis shows bottleneck in payment validation
  🔴 Database query: SELECT * FROM transactions WHERE user_id = ? (missing index)
  ⚠️  Average trace duration: 8.2s (baseline: 120ms)

💡 Recommended Action
  ➜ IMMEDIATE ROLLBACK to v2.3.0 (last stable)

  Confidence: 95%
  Reasoning:
    - Deployment correlation: Strong (2 min before incident)
    - Blast radius: High (45% error rate)
    - Known good state: v2.3.0 stable for 3 days
    - Root cause: Missing index on transactions.user_id

📋 Investigation Findings
  - Recent code change in payment processor
  - Database query timeout increased 10x (50ms → 2.3s)
  - Missing index on transactions.user_id causing full table scan
  - All pods failing due to database connection pool exhaustion
  - Suggested fix: Add index on transactions.user_id

🎯 Impact Assessment
  Affected users: ~2,400 active sessions
  Failed transactions: 1,247 in last 5 minutes
  Revenue impact: $18,500 estimated (based on avg transaction value)

🚀 Automated Actions Available
  [ ] Execute rollback to v2.3.0
  [ ] Scale down to stop new pod creation
  [ ] Enable maintenance mode
  [ ] Page on-call engineer (auto-paged)

🔄 Next Steps
  [ ] Execute rollback (recommended)
  [ ] Notify stakeholders via #incidents channel
  [ ] Prepare hotfix with database index
  [ ] Schedule post-mortem for tomorrow
  [ ] Update runbook with lessons learned

💬 Communication Template
  Subject: [P0] Payment API Outage - Rollback in Progress

  Status: Active incident - Rollback initiated
  Service: Payment API (payment-api)
  Impact: 45% error rate, payment processing degraded
  Action: Rolling back deployment v2.3.1 → v2.3.0
  ETA: 3-5 minutes to full restoration

  Root Cause: Missing database index causing query timeout
  Next Update: In 10 minutes
```

### High P1 Incident with Custom Symptoms

```bash
/devops:incident-response --severity high --service auth-service --symptoms "500 errors, high latency"
```

**Output:**
```
⚠️  INCIDENT RESPONSE - P1 HIGH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Incident Details
  Service: auth-service
  Severity: P1 (High)
  Symptoms: 500 errors, high latency
  Namespace: production

📊 Service Health
  ⚠️  auth-service: 4/5 pods healthy (1 pod in Warning state)
  ✓ Database: Healthy
  ⚠️  Redis cache: High memory usage (88%)
  ✓ API gateway: Healthy

🔍 Diagnostic Decision Tree

  Symptom: 500 errors + high latency
  ├─ Recent deployment? NO (last deployment 2 days ago)
  ├─ External dependency issue? Checking...
  │  └─ Redis memory: 88% (threshold: 85%)
  └─ Recommended path: INVESTIGATE DEPENDENCIES

📈 Metrics Analysis
  ⚠️  Error rate: 8% (baseline: 0.5%) - 16x increase
  ⚠️  Latency P95: 1.2s (baseline: 80ms) - 15x increase
  🔴 Redis cache miss rate: 45% (baseline: 5%) - cache degradation
  ⚠️  Redis memory: 88% (approaching limit)

💡 Recommended Action
  ➜ INVESTIGATE Redis cache degradation (not deployment-related)

  Confidence: 75%
  Reasoning:
    - No recent deployments
    - Cache miss rate spike correlates with latency
    - Redis memory approaching limit
    - Gradual degradation over 30 minutes

🔧 Suggested Remediation
  1. Increase Redis memory limit (quick fix)
  2. Review cache eviction policy
  3. Analyze cache key distribution
  4. Consider cache warming strategy

🔄 Next Steps
  [ ] Increase Redis memory allocation
  [ ] Analyze cache keys with redis-cli
  [ ] Review auth-service caching logic
  [ ] Monitor error rate for improvement
  [ ] Escalate to P0 if no improvement in 15min
```

### Analyze Specific Deployment

```bash
/devops:incident-response --severity medium --service user-api --analyze-deployment v3.1.5
```

**Output:**
```
📊 DEPLOYMENT ANALYSIS - P2 MEDIUM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Deployment: v3.1.5
  Service: user-api
  Deployed: 2025-10-21 10:15:30 UTC (4h 12m ago)
  By: @engineer-alice

📈 Performance Comparison (v3.1.4 → v3.1.5)

  Metrics Before (v3.1.4):
    - Error rate: 0.2%
    - Latency P95: 95ms
    - Request rate: 1,200 req/s
    - Memory usage: 45%

  Metrics After (v3.1.5):
    - Error rate: 0.8% (+300% ⚠️)
    - Latency P95: 145ms (+52% ⚠️)
    - Request rate: 1,180 req/s (-1.6% ✓)
    - Memory usage: 52% (+15% ⚠️)

🔗 Deployment Correlation
  ⚠️  Medium confidence (65%) that deployment contributed to degradation

  Evidence:
    - Error rate increased 30min after deployment
    - Latency degradation is gradual, not immediate
    - Memory usage trending up slowly

💡 Recommendation
  ➜ MONITOR for additional 2 hours before rollback decision

  Reasoning:
    - Degradation is moderate (not critical)
    - No customer impact reports yet
    - Possible memory leak pattern (gradual increase)
    - Recommendation: Set up automated rollback if error rate > 2%

🔧 Monitoring Plan
  [ ] Set alert: Error rate > 2% → auto-rollback
  [ ] Set alert: Memory > 80% → investigate
  [ ] Review v3.1.5 code changes for memory leaks
  [ ] Prepare rollback plan to v3.1.4
```

### Execute Automated Rollback

```bash
/devops:incident-response --severity critical --service payment-api --rollback --target v2.3.0
```

**Output:**
```
🔄 AUTOMATED ROLLBACK - P0 CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Rollback Plan
  Service: payment-api
  Current: v2.3.1 (failing)
  Target: v2.3.0 (last stable)
  Strategy: Rolling update (zero-downtime)

✓ Pre-Rollback Safety Checks
  ✓ Target version v2.3.0 exists in registry
  ✓ v2.3.0 was stable for 72 hours
  ✓ Database schema compatible
  ✓ No breaking API changes detected
  ✓ Rollback permission granted (auto-approved for P0)

🚀 Executing Rollback

  [████████████████████████░░░░░░] 70% - Rolling back pods (3/5)

  14:26:10 - Rollback initiated
  14:26:15 - Scaled down v2.3.1: 5 → 4 pods
  14:26:25 - Scaled up v2.3.0: 0 → 1 pod (healthy)
  14:26:35 - Scaled down v2.3.1: 4 → 3 pods
  14:26:40 - Scaled up v2.3.0: 1 → 2 pods (healthy)
  14:26:50 - Scaled down v2.3.1: 3 → 2 pods
  14:26:55 - Scaled up v2.3.0: 2 → 3 pods (healthy)

  Estimated time remaining: 1m 30s

✓ Rollback Complete

  Final state:
    ✓ payment-api v2.3.0: 5/5 pods healthy
    ✓ Error rate: 0.1% (back to baseline)
    ✓ Latency P95: 140ms (back to baseline)
    ✓ Database connections: 25/100 (normalized)

📊 Incident Resolution
  Total duration: 4 minutes 15 seconds
  MTTR achieved: Excellent (target: <10min for P0)

🔄 Next Steps
  [ ] Notify stakeholders of resolution
  [ ] Prepare hotfix for v2.3.1 issues
  [ ] Add database index for user_id
  [ ] Test hotfix in staging
  [ ] Schedule post-mortem meeting
```

### Generate Post-Mortem Report

```bash
/devops:incident-response --severity critical --service payment-api --post-mortem
```

**Output:**
```
📋 POST-MORTEM REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Incident: Payment API Outage (P0)
Date: 2025-10-21
Service: payment-api
Duration: 4 minutes 15 seconds
Incident Commander: @devops-bot (automated)

═══════════════════════════════════════════════════

## Executive Summary

The payment-api service experienced a critical (P0) outage on October 21, 2025,
from 14:23 to 14:27 UTC (4m 15s duration). The incident was caused by a missing
database index in deployment v2.3.1, resulting in 45% error rate and affecting
approximately 2,400 active users with $18,500 estimated revenue impact.

Automated rollback to v2.3.0 resolved the incident within target MTTR (<10min).

## Timeline

14:23:15 - Deployment v2.3.1 started
14:23:45 - First pod health check failure detected
14:24:10 - Error rate spiked from 0.1% to 45%
14:24:30 - Database connection pool exhausted (95/100 connections)
14:25:00 - Kubernetes auto-scaling triggered (5 → 10 pods)
14:25:15 - All new pods failing startup probes
14:25:30 - Incident classified as P0 Critical
14:25:45 - On-call engineer paged automatically
14:26:00 - Decision: Rollback to v2.3.0
14:26:10 - Automated rollback initiated
14:27:25 - Rollback complete, service restored
14:27:40 - Incident resolved

## Root Cause Analysis

**Primary Cause:**
Deployment v2.3.1 introduced a new database query in payment validation logic
that performed a full table scan due to missing index on transactions.user_id
column. This caused query execution times to increase from 50ms to 2.3s.

**Contributing Factors:**
1. Database index not created in migration scripts
2. Staging database had smaller dataset, did not expose performance issue
3. Load testing did not include realistic transaction volume
4. Database query performance not monitored in CI/CD pipeline

**Detection:**
Automated monitoring detected error rate spike within 55 seconds of incident start.
Incident response system correctly identified deployment correlation (95% confidence).

## Impact Assessment

**User Impact:**
- Affected users: ~2,400 active sessions
- Failed transactions: 1,247 over 4-minute period
- Error rate: 45% (baseline: 0.1%)
- Latency P95: 8.5s (baseline: 150ms)

**Business Impact:**
- Estimated revenue impact: $18,500 (based on failed transactions)
- Customer support tickets: 12 opened during incident
- No customer data lost or corrupted
- SLA breach: No (resolved within 10min P0 target)

## What Went Well

✓ Automated detection within 55 seconds
✓ Deployment correlation identified correctly (95% confidence)
✓ Automated rollback executed without manual intervention
✓ MTTR achieved target (<10min for P0)
✓ Zero-downtime rollback strategy worked correctly
✓ Communication templates sent automatically

## What Went Wrong

✗ Missing index not detected in code review
✗ Staging environment data volume too small to catch issue
✗ Load testing did not include database performance validation
✗ No query performance monitoring in CI/CD

## Action Items

| Action | Owner | Priority | Due Date | Status |
|--------|-------|----------|----------|--------|
| Add database index on transactions.user_id | @db-team | P0 | 2025-10-22 | Pending |
| Update migration to include index | @backend-team | P0 | 2025-10-22 | Pending |
| Add query performance monitoring to CI/CD | @devops-team | P1 | 2025-10-25 | Pending |
| Increase staging database to production-like volume | @infra-team | P1 | 2025-10-28 | Pending |
| Add database query analyzer to code review checklist | @engineering-manager | P2 | 2025-10-30 | Pending |
| Document lessons learned in runbook | @incident-commander | P2 | 2025-10-23 | Pending |

## Lessons Learned

1. **Database Performance Testing:** Always test with production-like data volumes
2. **Index Analysis:** Automated detection of missing indexes in CI/CD
3. **Query Monitoring:** Add database query performance to observability stack
4. **Code Review:** Enhanced checklist for database query changes
5. **Automated Response:** Incident response automation reduced MTTR significantly

## Recommendations

**Immediate (This Week):**
- Deploy hotfix v2.3.2 with database index
- Update staging environment with realistic data volume
- Add query performance gates to CI/CD pipeline

**Short-term (This Month):**
- Implement database query analyzer in static analysis
- Enhance load testing to include database performance scenarios
- Add slow query monitoring to Prometheus/Grafana

**Long-term (This Quarter):**
- Evaluate database query optimization tools
- Consider implementing query caching layer
- Review all services for similar index optimization opportunities

═══════════════════════════════════════════════════

Report generated: 2025-10-21 14:30:00 UTC
Generated by: @devops-bot (incident-response automation)
Report saved to: incidents/2025-10-21-payment-api-outage.md
```

## Implementation

This command uses the **@observability-engineer**, **@kubernetes-orchestrator**, and **@docker-containerization-expert** agents for comprehensive incident response.

### Step 1: Query Context7 for Best Practices

Before execution, the command queries Context7 for:
- Incident management frameworks (ITIL, SRE practices)
- Kubernetes troubleshooting patterns
- Alert correlation and metrics analysis
- Distributed tracing debugging techniques
- Runbook automation and decision trees

### Step 2: Severity Classification and Workflow Selection

**P0 (Critical) Workflow:**
```yaml
Severity: P0 - Production Down
Actions:
  - Auto-page on-call engineer
  - Escalate to incident commander
  - Enable war room / incident bridge
  - Automated rollback option available
  - Real-time stakeholder updates every 10min
  - MTTR target: <10 minutes
```

**P1 (High) Workflow:**
```yaml
Severity: P1 - Major Degradation
Actions:
  - Notify on-call engineer
  - Escalation path: Manager → Director
  - Guided investigation workflow
  - Manual rollback decision required
  - Stakeholder updates every 30min
  - MTTR target: <1 hour
```

**P2 (Medium) Workflow:**
```yaml
Severity: P2 - Partial Impact
Actions:
  - Create incident ticket
  - Standard investigation workflow
  - Monitor for escalation to P1
  - Stakeholder notification optional
  - MTTR target: <4 hours
```

**P3 (Low) Workflow:**
```yaml
Severity: P3 - Minor Issue
Actions:
  - Document incident
  - Schedule fix in next sprint
  - No immediate action required
  - Track as tech debt
```

### Step 3: Automated Diagnostics

**Service Health Checks (Kubernetes):**

```bash
# Uses @kubernetes-orchestrator agent

# Check pod status
kubectl get pods -n $NAMESPACE -l app=$SERVICE -o wide

# Check deployment status
kubectl describe deployment $SERVICE -n $NAMESPACE

# Check recent events
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20

# Check pod logs (last 1 hour)
kubectl logs --since=1h -l app=$SERVICE -n $NAMESPACE --tail=1000

# Check resource usage
kubectl top pods -n $NAMESPACE -l app=$SERVICE
```

**Deployment Analysis (Last 4 Hours):**

```bash
# Check recent deployments via git log
git log --since="4 hours ago" --oneline --decorate

# Check Kubernetes deployment history
kubectl rollout history deployment/$SERVICE -n $NAMESPACE

# Check deployment events
kubectl describe deployment $SERVICE -n $NAMESPACE | grep -A 10 Events
```

**Error Log Correlation:**

```bash
# Aggregate errors from all pods
kubectl logs -l app=$SERVICE -n $NAMESPACE --since=15m | grep -i "error\|exception\|fatal" | sort | uniq -c | sort -rn

# Pattern detection
kubectl logs -l app=$SERVICE -n $NAMESPACE --since=15m | awk '/ERROR/ {print $0}' | sed 's/[0-9]\{1,\}/NUM/g' | sort | uniq -c | sort -rn
```

**Metrics Anomaly Detection (Prometheus Queries):**

```promql
# Error rate spike detection
(
  rate(http_requests_total{job="$SERVICE",status=~"5.."}[5m])
  /
  rate(http_requests_total{job="$SERVICE"}[5m])
)
/
(
  rate(http_requests_total{job="$SERVICE",status=~"5.."}[1h] offset 1d)
  /
  rate(http_requests_total{job="$SERVICE"}[1h] offset 1d)
)

# Latency anomaly (P95 vs baseline)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="$SERVICE"}[5m]))
/
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="$SERVICE"}[1h] offset 1d))

# Memory usage spike
(
  container_memory_usage_bytes{pod=~"$SERVICE.*"}
  /
  container_spec_memory_limit_bytes{pod=~"$SERVICE.*"}
)
/
(
  avg_over_time(container_memory_usage_bytes{pod=~"$SERVICE.*"}[1d] offset 1d)
  /
  container_spec_memory_limit_bytes{pod=~"$SERVICE.*"}
)
```

**Distributed Tracing Analysis (Jaeger):**

```bash
# Query Jaeger for error traces
curl -s "http://jaeger:16686/api/traces?service=$SERVICE&tags={\"error\":\"true\"}&lookback=1h&limit=100"

# Find slow traces (>1s)
curl -s "http://jaeger:16686/api/traces?service=$SERVICE&minDuration=1000000&lookback=1h"

# Analyze trace dependencies
curl -s "http://jaeger:16686/api/dependencies?service=$SERVICE&endTs=$(date +%s)000&lookback=3600000"
```

**Dependency Health Checks:**

```bash
# Check database connectivity
kubectl exec -it deployment/$SERVICE -n $NAMESPACE -- nc -zv $DB_HOST $DB_PORT

# Check Redis connectivity
kubectl exec -it deployment/$SERVICE -n $NAMESPACE -- redis-cli -h $REDIS_HOST ping

# Check external API dependencies
kubectl exec -it deployment/$SERVICE -n $NAMESPACE -- curl -s -o /dev/null -w "%{http_code}" https://api.external.com/health
```

### Step 4: Decision Tree Logic

**Troubleshooting Decision Tree:**

```yaml
Decision Tree:
  - Symptom: High error rate (>5%)
    ├─ Recent deployment? (last 4 hours)
    │  └─ YES → Confidence: 85% → Recommend: ROLLBACK
    │     - Check: Deployment timestamp vs error spike timestamp
    │     - Check: Error patterns match new code paths
    │     - Action: Automated rollback to last stable version
    │  └─ NO → Confidence: 60% → Recommend: INVESTIGATE DEPENDENCIES
    │     - Check: External API health
    │     - Check: Database performance
    │     - Action: Analyze dependency latency and error rates

  - Symptom: High latency (P95 >500ms)
    ├─ Gradual degradation? (over 30+ minutes)
    │  └─ YES → Suspect: Resource leak (memory/CPU)
    │     - Check: Memory trend over last 4 hours
    │     - Check: CPU usage trend
    │     - Action: Restart pods or scale horizontally
    │  └─ NO → Suspect: Sudden load spike or deployment
    │     - Check: Request rate change
    │     - Check: Recent deployment
    │     - Action: Scale up or rollback

  - Symptom: Pod crashes (CrashLoopBackOff)
    └─ Check: Startup probe failures
       ├─ Database connectivity issue?
       │  └─ Check: Database connection pool
       │  └─ Action: Increase connection limit or fix connection leak
       ├─ Memory limit exceeded?
       │  └─ Check: OOMKilled events
       │  └─ Action: Increase memory limit
       └─ Application startup error?
          └─ Check: Pod logs for stack traces
          └─ Action: Rollback or apply hotfix
```

### Step 5: Rollback Recommendation Engine

**Rollback Confidence Scoring:**

```javascript
// Pseudo-code for rollback recommendation
function calculateRollbackConfidence(diagnostics) {
  let confidence = 0;

  // Deployment correlation (max 40 points)
  if (diagnostics.deploymentAge < '15 minutes') {
    confidence += 40;
  } else if (diagnostics.deploymentAge < '1 hour') {
    confidence += 30;
  } else if (diagnostics.deploymentAge < '4 hours') {
    confidence += 15;
  }

  // Error rate increase (max 30 points)
  const errorRateMultiple = diagnostics.errorRate / diagnostics.baselineErrorRate;
  if (errorRateMultiple > 10) {
    confidence += 30;
  } else if (errorRateMultiple > 5) {
    confidence += 20;
  } else if (errorRateMultiple > 2) {
    confidence += 10;
  }

  // Latency increase (max 15 points)
  const latencyMultiple = diagnostics.latencyP95 / diagnostics.baselineLatency;
  if (latencyMultiple > 5) {
    confidence += 15;
  } else if (latencyMultiple > 3) {
    confidence += 10;
  } else if (latencyMultiple > 2) {
    confidence += 5;
  }

  // Known stable version (max 15 points)
  if (diagnostics.targetVersion.stableFor > '72 hours') {
    confidence += 15;
  } else if (diagnostics.targetVersion.stableFor > '24 hours') {
    confidence += 10;
  } else if (diagnostics.targetVersion.stableFor > '6 hours') {
    confidence += 5;
  }

  // Total: 0-100%
  return confidence;
}

// Recommendation based on confidence
if (confidence >= 80) {
  return "IMMEDIATE ROLLBACK (High Confidence)";
} else if (confidence >= 60) {
  return "ROLLBACK RECOMMENDED (Medium Confidence)";
} else if (confidence >= 40) {
  return "MONITOR AND PREPARE ROLLBACK (Low Confidence)";
} else {
  return "INVESTIGATE FURTHER (Deployment likely not the cause)";
}
```

### Step 6: Impact Assessment

**User Impact Calculation:**

```bash
# Active sessions affected
active_sessions=$(kubectl exec -it deployment/$SERVICE -- curl -s http://localhost:8080/metrics | grep active_sessions | awk '{print $2}')

# Failed requests in last 5 minutes
failed_requests=$(curl -s "http://prometheus:9090/api/v1/query?query=increase(http_requests_total{job=\"$SERVICE\",status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1]')

# Estimated revenue impact (example)
avg_transaction_value=15.00
revenue_impact=$(echo "$failed_requests * $avg_transaction_value" | bc)
```

### Step 7: Automated Rollback Execution

**Rolling Rollback Strategy (Zero-Downtime):**

```bash
# Uses @kubernetes-orchestrator agent

# Step 1: Verify target version exists
if ! kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' | grep -q $TARGET_VERSION; then
  echo "Error: Target version $TARGET_VERSION not found"
  exit 1
fi

# Step 2: Safety checks
echo "Running pre-rollback safety checks..."

# Check database schema compatibility
# Check API compatibility
# Check no breaking changes

# Step 3: Execute rolling rollback
kubectl rollout undo deployment/$SERVICE -n $NAMESPACE --to-revision=$TARGET_VERSION

# Step 4: Monitor rollback progress
kubectl rollout status deployment/$SERVICE -n $NAMESPACE --timeout=5m

# Step 5: Verify service health
kubectl get pods -n $NAMESPACE -l app=$SERVICE

# Step 6: Validate metrics returned to baseline
# Check error rate, latency, etc.
```

### Step 8: Communication Templates

**P0 Stakeholder Update Template:**

```markdown
Subject: [P0] {{ SERVICE }} Outage - {{ STATUS }}

Status: {{ ACTIVE | INVESTIGATING | RESOLVED }}
Service: {{ SERVICE_NAME }}
Impact: {{ ERROR_RATE }}% error rate, {{ AFFECTED_USERS }} users affected
Started: {{ INCIDENT_START_TIME }}
Duration: {{ INCIDENT_DURATION }}

Current Action: {{ CURRENT_ACTION }}
ETA: {{ ESTIMATED_RESOLUTION_TIME }}

Root Cause: {{ PRELIMINARY_ROOT_CAUSE }}
Next Update: In {{ UPDATE_INTERVAL }} minutes

Incident Commander: {{ COMMANDER }}
War Room: {{ WAR_ROOM_LINK }}
```

### Step 9: Post-Mortem Generation

**Automated RCA Document:**

```markdown
# Post-Mortem Template (Auto-Generated)

## Incident Summary
- **Incident ID**: {{ INCIDENT_ID }}
- **Severity**: {{ SEVERITY }}
- **Duration**: {{ DURATION }}
- **Service**: {{ SERVICE }}
- **Date**: {{ DATE }}

## Timeline
{{ AUTO_GENERATED_TIMELINE }}

## Root Cause Analysis
{{ DIAGNOSTIC_FINDINGS }}

## Impact Assessment
- **Affected Users**: {{ USER_COUNT }}
- **Failed Transactions**: {{ TRANSACTION_COUNT }}
- **Revenue Impact**: {{ REVENUE_IMPACT }}
- **SLA Breach**: {{ SLA_STATUS }}

## What Went Well
{{ POSITIVE_FINDINGS }}

## What Went Wrong
{{ NEGATIVE_FINDINGS }}

## Action Items
{{ AUTO_GENERATED_ACTION_ITEMS }}

## Lessons Learned
{{ LESSONS_LEARNED }}
```

## Output Format

```
🚨 INCIDENT RESPONSE - P0 CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Incident Details
📊 Service Health
🕐 Timeline
📈 Metrics Anomaly Detection
🔍 Recent Deployments
📝 Log Analysis
🔗 Distributed Tracing
💡 Recommended Action
📋 Investigation Findings
🎯 Impact Assessment
🚀 Automated Actions Available
🔄 Next Steps
💬 Communication Template
```

## Best Practices Applied

Based on Context7 documentation and SRE incident management practices:

1. **Incident Command Structure** - Clear roles, escalation paths, war room coordination
2. **Automated Detection** - Sub-minute detection with deployment correlation
3. **Decision Intelligence** - Confidence-scored recommendations, not binary decisions
4. **Zero-Downtime Rollback** - Rolling update strategy preserves availability
5. **Communication Cadence** - Regular updates aligned with severity (P0: 10min, P1: 30min)
6. **Blameless Post-Mortems** - Focus on systems and processes, not individuals
7. **Runbook Automation** - Decision trees codified for consistent response
8. **Observability Integration** - Metrics, logs, traces correlated automatically
9. **Impact Quantification** - User count, revenue impact, SLA breach tracking
10. **Learning Culture** - Action items tracked, lessons documented

## Related Commands

- `/devops:monitoring-setup` - Setup comprehensive monitoring stack
- `/devops:alerting-configure` - Configure intelligent alerting rules
- `/devops:runbook-create` - Create automated runbooks for common incidents
- `/k8s:rollback` - Manual Kubernetes rollback operations

## Related Agents

- **@observability-engineer** - Primary agent for diagnostics and monitoring analysis
- **@kubernetes-orchestrator** - Kubernetes diagnostics, pod health, rollback execution
- **@docker-containerization-expert** - Container diagnostics and Docker troubleshooting
- **@sre-specialist** - SRE best practices, incident command, post-mortem facilitation

## Troubleshooting

### False Positive Rollback Recommendations

If rollback confidence is too high despite unrelated incident:

```bash
# Override with manual investigation
/devops:incident-response --severity high --service api --symptoms "latency spike" --analyze-deployment v2.1.0 --dry-run

# Review decision logic
# Check for deployment correlation false positives
# Adjust confidence scoring thresholds if needed
```

### Rollback Fails Due to Schema Incompatibility

```bash
# Check schema compatibility before rollback
kubectl exec -it deployment/$SERVICE -- ./scripts/check-schema-compatibility.sh

# If incompatible, use hotfix instead of rollback
/devops:incident-response --severity critical --service api --symptoms "errors" --rollback=false
```

### Metrics Not Available in Prometheus

```bash
# Verify Prometheus scraping
curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="$SERVICE")'

# Fall back to log-based analysis
/devops:incident-response --severity high --service api --symptoms "errors" --use-logs-only
```

## Security Considerations

1. **Automated Rollback Authorization** - P0 incidents allow auto-rollback; P1+ require approval
2. **Audit Logging** - All incident actions logged with timestamps and approvers
3. **RBAC** - Incident response permissions aligned with on-call roles
4. **Sensitive Data** - Post-mortems scrubbed for PII, secrets, customer data
5. **Communication Channels** - Stakeholder updates sent only to authorized channels
6. **Rollback Safety** - Pre-rollback checks prevent incompatible version deployment

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Complete incident response automation with P0/P1/P2/P3 workflows
- Automated diagnostics: health checks, deployment analysis, log correlation
- Decision intelligence: rollback confidence scoring, decision trees
- Post-mortem automation with RCA templates
- Communication template generation
