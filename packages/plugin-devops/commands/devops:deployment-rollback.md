# deployment-rollback

Safe rollback of deployments with validation, automated smoke tests, and comprehensive incident documentation.

## Description

Performs safe deployment rollback across multiple platforms (Kubernetes, Docker, AWS, Azure, GitHub Actions) with:
- **Multi-Strategy Rollback**: Rolling, instant, blue-green, canary
- **Pre-Flight Validation**: Target version verification, dependency checks, impact estimation
- **Automated Testing**: Post-rollback smoke tests and health monitoring
- **Zero-Downtime Options**: Gradual rollback with traffic shifting
- **Incident Documentation**: Automated rollback reports with timeline and metrics

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: kubernetes, docker, github-actions, aws.

## Usage

```bash
/devops:deployment-rollback [version] [options]
```

## Options

- `--strategy <rolling|instant|blue-green|canary>` - Rollback strategy (default: rolling)
- `--platform <kubernetes|docker|aws|azure|github>` - Deployment platform (auto-detected)
- `--target <version>` - Target version to rollback to (default: previous stable)
- `--namespace <name>` - Kubernetes namespace (default: current context)
- `--reason <text>` - Reason for rollback (required for documentation)
- `--dry-run` - Validate rollback without executing
- `--canary <percentage>` - Canary rollback percentage (5-50%, default: 10%)
- `--duration <time>` - Gradual rollback duration (e.g., 10m, 1h)
- `--skip-validation` - Skip pre-flight checks (dangerous, not recommended)
- `--emergency` - Emergency instant rollback with minimal validation

## Examples

### Basic Rollback to Previous Version
```bash
/devops:deployment-rollback v2.3.0
```

### Emergency Instant Rollback
```bash
/devops:deployment-rollback --strategy instant --reason "critical bug in payment processing"
```

### Kubernetes Production Rollback
```bash
/devops:deployment-rollback --platform kubernetes --namespace production --target v2.2.1
```

### Dry-Run Validation
```bash
/devops:deployment-rollback --dry-run --target v2.2.1
```

### Gradual Canary Rollback
```bash
/devops:deployment-rollback --canary 10% --duration 10m
```

### Blue-Green Traffic Switch
```bash
/devops:deployment-rollback --strategy blue-green --reason "performance degradation"
```

## Rollback Strategies

### 1. Rolling Rollback (Default)
**Zero-downtime gradual rollback**

```yaml
Strategy: Rolling
Downtime: None
Duration: 3-10 minutes
Risk: Low
Use When: Standard rollback, no emergency

Implementation:
- Update deployment manifest to target version
- Kubernetes rolls back pods one at a time
- Each pod validated before next rollback
- Automatic pause on health check failures
```

**Kubernetes Example:**
```bash
# Command executes internally:
kubectl rollout undo deployment/myapp --namespace=production --to-revision=5

# Monitor progress:
kubectl rollout status deployment/myapp -n production
```

### 2. Instant Rollback (Emergency)
**Immediate rollback for critical issues**

```yaml
Strategy: Instant
Downtime: Minimal (seconds)
Duration: 30 seconds - 2 minutes
Risk: Medium
Use When: Critical bugs, security incidents

Implementation:
- Scale down current deployment immediately
- Scale up target version simultaneously
- Skip gradual health checks
- Manual smoke tests after completion
```

**Docker Swarm Example:**
```bash
# Command executes internally:
docker service update --rollback myapp-service

# Verify rollback:
docker service ps myapp-service
```

### 3. Blue-Green Switch
**Instant traffic shift between environments**

```yaml
Strategy: Blue-Green
Downtime: None (instant switch)
Duration: Seconds
Risk: Low (easy revert)
Use When: Two environments maintained

Implementation:
- Switch load balancer to previous (green) environment
- Monitor metrics for 5 minutes
- Drain traffic from current (blue) environment
- Keep blue warm for quick revert if needed
```

**AWS Example:**
```bash
# Command executes internally:
aws elbv2 modify-listener --listener-arn $LISTENER_ARN \
  --default-actions TargetGroupArn=$GREEN_TARGET_GROUP
```

### 4. Canary Rollback
**Gradual traffic shift to previous version**

```yaml
Strategy: Canary
Downtime: None
Duration: 10-60 minutes
Risk: Very Low
Use When: Uncertainty about issue scope

Implementation:
- Route small percentage (10%) to target version
- Monitor metrics for 5 minutes
- Increase traffic gradually (25%, 50%, 75%, 100%)
- Automatic halt on error rate increase
```

**Kubernetes Example:**
```bash
# Command executes internally using Istio/Linkerd:
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: myapp-canary
spec:
  weight: 10  # Start with 10% traffic
  selector:
    app: myapp
    version: v2.3.0  # Target version
EOF
```

## Implementation

This command uses specialized agents:
- **@github-operations-specialist** - GitHub Actions workflow re-run and deployment rollback
- **@kubernetes-orchestrator** - Kubernetes rollout undo and manifest updates
- **@aws-cloud-architect** - AWS CodeDeploy and ECS rollback
- **@azure-devops-specialist** - Azure deployment rollback
- **@docker-containerization-expert** - Docker service rollback

### Rollback Process

1. **Pre-Flight Validation**
   - Verify target version exists in registry/repository
   - Check historical health metrics of target version
   - Validate dependency compatibility
   - Estimate affected users and impact
   - Calculate estimated rollback duration

2. **Rollback Execution**
   - Update deployment manifest/configuration to target version
   - Execute platform-specific rollback command
   - Monitor rollout progress in real-time
   - Track pod/container replacement status
   - Log rollback timeline events

3. **Post-Rollback Validation**
   - Run automated smoke tests (API endpoints, critical paths)
   - Monitor error rates for degradation
   - Verify metrics returned to baseline
   - Check traffic distribution (canary/blue-green)
   - Validate database migrations compatibility

4. **Documentation Generation**
   - Create incident report with timeline
   - Document rollback reason and impact
   - Record metrics before/after rollback
   - Save to `.claude/incidents/rollback-YYYYMMDD-HHMM.md`

### Platform-Specific Implementation

#### Kubernetes Rollback

```bash
# 1. Check deployment history
kubectl rollout history deployment/myapp -n production

# 2. Rollback to specific revision
kubectl rollout undo deployment/myapp --to-revision=5 -n production

# 3. Monitor rollback progress
kubectl rollout status deployment/myapp -n production

# 4. Verify rollback
kubectl get pods -n production -l app=myapp
kubectl describe deployment myapp -n production
```

**Validation:**
```bash
# Health check
kubectl exec -n production deployment/myapp -- curl -f http://localhost:8080/health

# Check error logs
kubectl logs -n production -l app=myapp --tail=100 | grep ERROR
```

#### Docker Service Rollback

```bash
# 1. Check service details
docker service inspect myapp-service

# 2. Execute rollback
docker service update --rollback myapp-service

# 3. Monitor rollback
docker service ps myapp-service

# 4. Verify health
docker service ls | grep myapp-service
```

**Validation:**
```bash
# Check service replicas
docker service scale myapp-service=5

# Health check
docker exec $(docker ps -q -f name=myapp-service) curl -f http://localhost:8080/health
```

#### GitHub Actions Re-Run

```bash
# 1. Find last successful workflow run
gh run list --workflow=deploy.yml --status=success --limit=1

# 2. Re-run specific workflow
gh run rerun <run-id>

# 3. Monitor deployment
gh run watch <run-id>

# 4. Verify deployment
gh api /repos/{owner}/{repo}/deployments?environment=production&per_page=5
```

**Validation:**
```bash
# Check deployment status
curl -f https://api.production.example.com/health

# Verify version endpoint
curl https://api.production.example.com/version
```

#### AWS CodeDeploy Rollback

```bash
# 1. Stop current deployment
aws deploy stop-deployment --deployment-id $DEPLOYMENT_ID

# 2. Create rollback deployment
aws deploy create-deployment \
  --application-name myapp \
  --deployment-group-name production \
  --revision revisionType=S3,s3Location={bucket=deployments,key=myapp-v2.3.0.zip} \
  --deployment-config-name CodeDeployDefault.OneAtATime

# 3. Monitor rollback
aws deploy get-deployment --deployment-id $NEW_DEPLOYMENT_ID

# 4. Verify instances
aws deploy list-deployment-instances --deployment-id $NEW_DEPLOYMENT_ID
```

**Validation:**
```bash
# Check instance health
aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP_ARN

# Application health check
aws ssm send-command --document-name "AWS-RunShellScript" \
  --targets "Key=tag:Environment,Values=production" \
  --parameters 'commands=["curl -f http://localhost:8080/health"]'
```

## Pre-Rollback Checks

### Target Version Verification
```bash
# Kubernetes: Check image exists
kubectl get deployment myapp -n production -o jsonpath='{.spec.template.spec.containers[0].image}'

# Docker: Verify image in registry
docker pull myapp:v2.3.0

# GitHub: Verify commit/tag exists
gh api /repos/{owner}/{repo}/commits/v2.3.0
```

### Health History Analysis
```bash
# Query Prometheus for historical metrics
curl 'http://prometheus:9090/api/v1/query_range' \
  --data-urlencode 'query=sum(rate(http_requests_total{version="v2.3.0",status=~"5.."}[5m]))' \
  --data-urlencode 'start=2025-01-15T00:00:00Z' \
  --data-urlencode 'end=2025-01-20T00:00:00Z'

# Analyze:
# - Error rate < 0.5% ✓
# - Uptime > 99.9% ✓
# - Response time p95 < 200ms ✓
```

### Impact Estimation
```bash
# Calculate affected users
current_version_pods=$(kubectl get pods -n production -l app=myapp,version=current --no-headers | wc -l)
target_version_pods=$(kubectl get pods -n production -l app=myapp,version=v2.3.0 --no-headers | wc -l)

# Estimated impact:
# - Pods to update: 10
# - Users affected: ~0 (rolling strategy)
# - Estimated duration: 5 minutes
```

### Dependency Compatibility
```bash
# Check database schema version
kubectl exec -n production deployment/myapp -- \
  psql -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1"

# Verify API contract compatibility
diff <(curl -s https://api.current.com/openapi.json | jq -S .) \
     <(curl -s https://api.v2.3.0.com/openapi.json | jq -S .)
```

## Post-Rollback Validation

### Automated Smoke Tests
```bash
# API health check
curl -f https://api.production.example.com/health || exit 1

# Critical user paths
curl -f -X POST https://api.production.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' || exit 1

curl -f https://api.production.example.com/products || exit 1
curl -f https://api.production.example.com/cart || exit 1
curl -f https://api.production.example.com/checkout || exit 1

echo "✓ All smoke tests passed"
```

### Error Rate Monitoring
```bash
# Query error rate before and after rollback
before_errors=$(curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.."}[5m]))' \
  --data-urlencode 'time=2025-01-21T14:25:00Z' | jq -r '.data.result[0].value[1]')

after_errors=$(curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.."}[5m]))' | \
  jq -r '.data.result[0].value[1]')

echo "Error rate: $before_errors → $after_errors"
# Expected: 15% → 0.1% ✓
```

### Metrics Baseline Verification
```bash
# Compare key metrics to baseline
latency_p95=$(curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=histogram_quantile(0.95, http_request_duration_seconds_bucket)' | \
  jq -r '.data.result[0].value[1]')

echo "Latency p95: $latency_p95"
# Expected: < 200ms ✓

throughput=$(curl -s 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_requests_total[5m]))' | \
  jq -r '.data.result[0].value[1]')

echo "Throughput: $throughput req/s"
# Expected: > 1000 req/s ✓
```

### Traffic Distribution Check (Canary)
```bash
# Verify canary traffic split
kubectl get virtualservice myapp -n production -o yaml

# Expected output:
# - v2.3.0: 10% → 0%    (rolled back)
# - v2.3.1: 90% → 100%  (target version)
```

## Output Format

```
🔄 DEPLOYMENT ROLLBACK
━━━━━━━━━━━━━━━━━━━━━━━━━

Current: v2.3.1 (failing)
Target:  v2.3.0 (last stable)

✅ Pre-Flight Checks
✓ Target version exists in registry
✓ Target version had 99.9% uptime
✓ No dependency conflicts
✓ Database schema compatible

🚀 Rollback Strategy: Rolling (zero-downtime)
📊 Estimated time: 5 minutes
👥 Estimated impact: 0 users affected

▶ Executing Rollback...
  [████████░░] 80% - 4/5 pods updated

✅ Rollback Complete
⏱  Duration: 4m 23s
📊 Error rate: 15% → 0.1% ✓
🎯 Latency p95: 2.1s → 180ms ✓
🔍 Throughput: 850 req/s → 1200 req/s ✓

✅ Post-Rollback Validation
✓ All smoke tests passed (12/12)
✓ Error rate below threshold (0.1% < 1%)
✓ Metrics returned to baseline
✓ No traffic routing issues

📝 Incident Documentation
Report saved to: .claude/incidents/rollback-20250121-1430.md

━━━━━━━━━━━━━━━━━━━━━━━━━
Rollback Reason: Critical bug in payment processing causing transaction failures

Next Steps:
1. Investigate root cause in v2.3.1
2. Add regression tests to prevent recurrence
3. Schedule hotfix deployment with enhanced testing
```

## Best Practices Applied

1. **Zero-Downtime Rollback** - Rolling strategy with gradual pod replacement
2. **Automated Validation** - Pre-flight checks and post-rollback smoke tests
3. **Comprehensive Monitoring** - Real-time error rate and latency tracking
4. **Incident Documentation** - Automated report generation with timeline
5. **Multiple Strategies** - Appropriate rollback strategy for each scenario
6. **Safety Checks** - Target version verification and health history analysis
7. **Gradual Traffic Shift** - Canary rollback for uncertainty scenarios
8. **Emergency Mode** - Instant rollback option for critical issues
9. **Platform Agnostic** - Support for Kubernetes, Docker, AWS, GitHub
10. **Rollback Verification** - Comprehensive post-rollback validation

## Related Commands

- `/devops:ci-pipeline-create` - Create CI/CD pipelines with rollback support
- `/devops:workflow-create` - GitHub workflow creation with deployment tracking
- `/devops:monitoring-setup` - Setup monitoring for rollback detection
- `/cloud:validate` - Validate infrastructure before rollback

## Troubleshooting

### Rollback Fails to Complete

**Issue:** Rollback stuck at partial completion

```bash
# Force complete the rollback
kubectl rollout restart deployment/myapp -n production

# Or manually scale down problematic pods
kubectl delete pod <pod-name> -n production --force --grace-period=0
```

**Prevention:**
- Enable pod disruption budgets
- Configure proper health check timeouts
- Use `--timeout=10m` flag for kubectl rollout

### Target Version Not Available

**Issue:** Previous version image not found in registry

```bash
# Check available versions
docker images | grep myapp
kubectl get deployment myapp -n production -o jsonpath='{.spec.template.spec.containers[0].image}'

# Solution: Use explicit version
/devops:deployment-rollback --target v2.2.0
```

**Prevention:**
- Maintain image retention policy (keep last 10 versions)
- Tag stable releases explicitly
- Document version deprecation schedule

### Database Migration Incompatibility

**Issue:** Rollback fails due to database schema changes

```bash
# Check migration status
kubectl exec -n production deployment/myapp -- rake db:migrate:status

# Manual intervention required:
# 1. Rollback database migrations
kubectl exec -n production deployment/myapp -- rake db:rollback STEP=2

# 2. Then rollback deployment
/devops:deployment-rollback v2.3.0
```

**Prevention:**
- Use backward-compatible migrations
- Separate schema changes from code deployments
- Implement blue-green database strategy

### Health Checks Fail After Rollback

**Issue:** Pods fail health checks after rollback

```bash
# Check pod logs
kubectl logs -n production -l app=myapp --tail=50

# Check events
kubectl get events -n production --sort-by='.lastTimestamp' | grep myapp

# Common issues:
# - Configuration mismatch
# - Resource limits too low
# - External service dependency changed
```

**Solution:**
- Verify ConfigMaps and Secrets match target version
- Check resource requests/limits
- Validate external service availability

### Emergency Manual Rollback

**Issue:** Automated rollback fails, need manual intervention

```bash
# 1. Stop automated rollback
kubectl rollout pause deployment/myapp -n production

# 2. Manual rollback
kubectl set image deployment/myapp myapp=myapp:v2.3.0 -n production

# 3. Force restart
kubectl rollout restart deployment/myapp -n production

# 4. Resume automated rollout
kubectl rollout resume deployment/myapp -n production
```

## Version History

- v2.0.0 - Initial Schema v2.0 release
- Multi-platform support (Kubernetes, Docker, AWS, GitHub)
- Multiple rollback strategies (rolling, instant, blue-green, canary)
- Automated pre-flight validation and post-rollback testing
- Incident documentation generation
- Context7 integration for platform-specific best practices
