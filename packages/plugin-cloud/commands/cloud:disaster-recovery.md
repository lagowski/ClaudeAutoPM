# cloud:disaster-recovery

Set up disaster recovery plans with RTO/RPO targets for multi-cloud infrastructure.

## Description

Implements comprehensive disaster recovery strategies with automated failover, backup management, and compliance reporting:
- Multi-cloud DR strategies (AWS, Azure, GCP)
- RTO/RPO target definition and validation
- DR strategy selection (backup/restore, pilot light, warm standby, multi-site)
- Automated backup configuration and scheduling
- Cross-region replication setup
- Failover automation and DNS management
- DR testing and validation procedures
- Compliance reporting (HIPAA, SOC2, etc.)
- Cost estimation and optimization

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: aws, gcp, azure, terraform.

## Usage

```bash
/cloud:disaster-recovery [options]
```

## Options

- `--rto <time>` - Recovery Time Objective (e.g., 1h, 4h, 24h)
- `--rpo <time>` - Recovery Point Objective (e.g., 0m, 15m, 1h, 12h)
- `--strategy <type>` - DR strategy: backup-restore, pilot-light, warm-standby, multi-site
- `--primary <region>` - Primary region/datacenter
- `--dr <region>` - Disaster recovery region/datacenter
- `--provider <aws|azure|gcp>` - Cloud provider (default: aws)
- `--resources <list>` - Comma-separated list of resources to protect
- `--compliance <standard>` - Compliance standard: hipaa, soc2, pci-dss, iso27001
- `--test` - Generate and execute DR test plan
- `--cost-only` - Show cost estimates without implementation
- `--apply` - Implement the DR plan

## Examples

### Backup/Restore DR Strategy
```bash
/cloud:disaster-recovery --rto 4h --rpo 1h --strategy backup-restore
```

### Warm Standby with HIPAA Compliance
```bash
/cloud:disaster-recovery --rto 1h --rpo 15m --strategy warm-standby --compliance hipaa --primary us-east-1 --dr us-west-2
```

### Multi-Site Active-Active
```bash
/cloud:disaster-recovery --strategy multi-site --rto 5m --rpo 0m --primary us-east-1 --dr eu-west-1 --apply
```

### DR Test Execution
```bash
/cloud:disaster-recovery --test --strategy warm-standby --resources database,app,storage
```

### Cost Estimation Only
```bash
/cloud:disaster-recovery --rto 2h --rpo 30m --cost-only
```

## DR Strategy Details

### Backup and Restore
**RTO**: 24+ hours | **RPO**: 1+ hours | **Cost**: $

- Automated backups to cloud storage
- Cross-region backup replication
- Restore procedures documented
- Lowest cost option
- Suitable for non-critical workloads

**Use Cases:**
- Development/test environments
- Non-critical applications
- Cost-sensitive deployments
- Long acceptable downtime windows

### Pilot Light
**RTO**: 1-4 hours | **RPO**: Minutes to 1 hour | **Cost**: $$

- Minimal DR environment always running
- Core services (database) replicated
- Scale up on failover
- Moderate cost
- Suitable for most business applications

**Use Cases:**
- Business-critical applications
- E-commerce platforms
- SaaS applications
- Financial services (non-trading)

### Warm Standby
**RTO**: 15 minutes - 1 hour | **RPO**: Minutes | **Cost**: $$$

- Scaled-down version of full environment
- All components running
- Quick scale-up on failover
- Higher cost
- Suitable for high-priority workloads

**Use Cases:**
- Mission-critical applications
- Healthcare systems
- Real-time analytics
- Customer-facing services

### Multi-Site Active-Active
**RTO**: Seconds to minutes | **RPO**: Near-zero | **Cost**: $$$$

- Full environment in multiple regions
- Active traffic to all sites
- Automatic failover
- Highest cost
- Zero data loss tolerance

**Use Cases:**
- Trading platforms
- Emergency services
- Global SaaS platforms
- Zero-downtime requirements

## Implementation

This command uses specialized cloud agents:

1. **@aws-cloud-architect** - AWS DR implementation
2. **@azure-cloud-architect** - Azure DR implementation
3. **@gcp-cloud-architect** - GCP DR implementation
4. **@terraform-infrastructure-expert** - IaC-based DR automation

The command:
1. Queries Context7 for DR best practices and provider patterns
2. Analyzes current infrastructure and dependencies
3. Validates RTO/RPO targets against strategy capabilities
4. Designs DR architecture based on requirements
5. Configures automated backups and replication
6. Sets up failover automation and health checks
7. Creates DR runbooks and test procedures
8. Generates compliance reports and cost estimates

## Backup Configuration

### Automated Backup Scheduling
- **Continuous** (RPO < 5m): Database transaction logs, CDC
- **Every 15 minutes** (RPO 15m): Incremental backups
- **Hourly** (RPO 1h): Incremental backups with hourly snapshots
- **Daily** (RPO 24h): Full backups with daily snapshots
- **Weekly** (RPO 1 week): Full backups for archival

### Backup Types
- **Full Backup**: Complete copy of all data
- **Incremental**: Only changed data since last backup
- **Differential**: Changed data since last full backup
- **Continuous**: Real-time replication (CDC, log shipping)

### Retention Policies
- **Standard**: 7 daily, 4 weekly, 12 monthly
- **HIPAA**: 7 daily, 4 weekly, 72 monthly (6 years)
- **SOC2**: 7 daily, 12 weekly, 24 monthly (2 years)
- **Custom**: User-defined retention schedule

## Failover Automation

### DNS Failover
- Route53 health checks (AWS)
- Traffic Manager health probes (Azure)
- Cloud DNS with health checking (GCP)
- Automatic DNS failover on primary failure
- Configurable TTL for fast propagation

### Application Failover
- Load balancer health checks
- Auto-scaling group updates
- Container orchestration failover (EKS, AKS, GKE)
- Database read replica promotion
- Storage replication verification

### Validation Checks
- Pre-failover health verification
- Post-failover smoke tests
- Data consistency validation
- Performance baseline comparison
- Rollback readiness verification

## DR Testing

### Test Scenarios
1. **Component Failure**: Single service/database failure
2. **Availability Zone Failure**: AZ outage simulation
3. **Region Failure**: Complete regional disaster
4. **Data Corruption**: Backup restoration from corruption
5. **Network Partition**: Split-brain scenario testing

### Test Frequency
- **Backup Validation**: Daily automated tests
- **Component DR**: Monthly scheduled tests
- **Full DR Exercise**: Quarterly comprehensive tests
- **Compliance Testing**: Annual audit preparation

### Success Criteria
- RTO target achieved
- RPO target achieved
- Zero data loss (if required)
- All services functional
- Performance within 10% of normal
- Rollback successful

## Compliance Reporting

### HIPAA Requirements
- ✅ Backup encryption at rest and in transit
- ✅ 6-year backup retention
- ✅ Access logging and audit trails
- ✅ Quarterly DR testing
- ✅ Documented procedures
- ✅ Business associate agreements

### SOC2 Requirements
- ✅ Automated backup monitoring
- ✅ 2-year backup retention
- ✅ Change management for DR procedures
- ✅ Quarterly DR testing and documentation
- ✅ Incident response integration
- ✅ Access controls and segregation of duties

### PCI-DSS Requirements
- ✅ Daily backups of cardholder data
- ✅ Encrypted backups
- ✅ Quarterly DR testing
- ✅ Network segmentation in DR environment
- ✅ Vulnerability management
- ✅ Secure backup storage

## Cost Breakdown

### Backup Costs (AWS Example)
- **S3 Standard**: $0.023/GB/month
- **S3 Glacier**: $0.004/GB/month
- **S3 Deep Archive**: $0.00099/GB/month
- **EBS Snapshots**: $0.05/GB/month
- **Cross-region transfer**: $0.02/GB

### Infrastructure Costs by Strategy

**Backup/Restore**: 5-10% of production costs
- Backup storage only
- No standby infrastructure
- Restore on demand

**Pilot Light**: 20-30% of production costs
- Database replication
- Minimal compute instances
- Core networking

**Warm Standby**: 50-70% of production costs
- All services running at reduced capacity
- Full networking and load balancing
- Continuous data replication

**Multi-Site**: 200%+ of production costs
- Full production environment in DR region
- Active-active configuration
- Global load balancing

## Output Format

### Console Output
```
🔄 Disaster Recovery Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Configuration
  Strategy: Warm Standby
  RTO Target: 1 hour
  RPO Target: 15 minutes
  Primary: us-east-1
  DR: us-west-2
  Compliance: HIPAA

Resources Protected
  ✅ Database (PostgreSQL RDS)
  ✅ Application Servers (EC2 Auto Scaling)
  ✅ Object Storage (S3)
  ✅ Configuration (Systems Manager)

Backup Configuration
  Schedule: Every 15 minutes (incremental)
  Full Backup: Daily at 02:00 UTC
  Retention: 7 daily, 4 weekly, 72 monthly
  Encryption: AES-256 (KMS)
  Cross-Region: Enabled

Failover Automation
  DNS: Route53 health check failover
  Database: Automatic read replica promotion
  Compute: Auto Scaling in DR region
  Storage: S3 Cross-Region Replication

DR Testing Schedule
  Backup Validation: Daily (automated)
  Component Testing: Monthly
  Full DR Exercise: Quarterly
  Next Test: 2025-04-01

Compliance Status
  ✅ HIPAA: Compliant
    ✅ Encryption enabled
    ✅ 6-year retention configured
    ✅ Audit logging active
    ✅ Quarterly testing scheduled

Cost Estimate
  Monthly DR Costs: $2,450
    Backup Storage: $450
    DR Infrastructure: $1,800
    Network Transfer: $200

  Annual Cost: $29,400
  Cost per RTO Hour: $2,450/hour

Implementation Plan
  Phase 1: Backup Configuration (Day 1-2)
    • Configure automated backups
    • Set up cross-region replication
    • Test backup restoration

  Phase 2: DR Infrastructure (Day 3-5)
    • Deploy DR environment
    • Configure auto-scaling
    • Set up load balancers

  Phase 3: Failover Automation (Day 6-7)
    • Configure DNS failover
    • Set up health checks
    • Create failover scripts

  Phase 4: Testing & Validation (Day 8-10)
    • Execute DR test
    • Measure RTO/RPO
    • Document procedures

Ready to implement? Use --apply to proceed.
```

### Report Output
Generates detailed markdown report with:
- Executive summary with RTO/RPO targets
- Detailed DR architecture diagrams
- Backup and replication configuration
- Failover procedures and runbooks
- Test plans and schedules
- Compliance mapping and audit evidence
- Cost analysis and projections

## Related Commands

- `/cloud:validate` - Validate infrastructure before DR setup
- `/cloud:cost-optimize` - Optimize DR costs
- `/cloud:deploy` - Deploy DR infrastructure

## Best Practices

1. **Test Regularly**: Quarterly full DR tests minimum
2. **Automate Everything**: Manual processes fail under pressure
3. **Document Procedures**: Runbooks should be executable by anyone
4. **Monitor Continuously**: Backup failures should alert immediately
5. **Right-Size Strategy**: Don't over-engineer for non-critical workloads
6. **Validate Restores**: Test backup restoration regularly
7. **Update Plans**: Review DR plans after infrastructure changes
8. **Train Teams**: Ensure multiple people can execute DR procedures

## Troubleshooting

### Backup Failures
- Check IAM/RBAC permissions for backup service
- Verify network connectivity to backup storage
- Check disk space on backup volumes
- Review backup service limits and quotas

### Replication Lag
- Monitor replication metrics in CloudWatch/Stackdriver
- Check network bandwidth and latency
- Review database query load
- Consider increasing replication instance size

### Failover Issues
- Verify DNS propagation (TTL settings)
- Check health check configurations
- Review security group and firewall rules
- Validate cross-region networking

### High Costs
- Review backup retention policies
- Consider storage tiering (Glacier, Archive)
- Right-size DR infrastructure
- Use spot instances for non-critical DR components
- Optimize cross-region data transfer

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Multi-cloud DR support (AWS, Azure, GCP)
- Automated failover and testing
- Compliance reporting (HIPAA, SOC2, PCI-DSS)
- Cost optimization recommendations
