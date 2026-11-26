# cloud:cost-optimize

Analyze and optimize cloud infrastructure costs across AWS, Azure, and GCP.

## Description

Performs comprehensive cost analysis and provides optimization recommendations:
- Identify unused and underutilized resources
- Right-sizing recommendations for compute instances
- Storage class optimization opportunities
- Reserved instance and savings plan analysis
- Network data transfer optimization
- Serverless vs. traditional compute comparisons

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: aws, azure, gcp, terraform.

## Usage

```bash
/cloud:cost-optimize [options]
```

## Options

- `--provider <aws|azure|gcp|all>` - Cloud provider to analyze (default: all)
- `--category <compute|storage|network|database|all>` - Resource category (default: all)
- `--threshold <amount>` - Minimum monthly savings to report (default: $10)
- `--apply` - Automatically apply low-risk optimizations
- `--report <path>` - Generate detailed cost report
- `--period <7d|30d|90d>` - Analysis period (default: 30d)

## Examples

### Full Cost Analysis
```bash
/cloud:cost-optimize
```

### AWS Compute Optimization
```bash
/cloud:cost-optimize --provider aws --category compute
```

### Auto-Apply Safe Optimizations
```bash
/cloud:cost-optimize --apply --threshold 50
```

### Generate 90-Day Cost Report
```bash
/cloud:cost-optimize --period 90d --report ./cost-optimization.md
```

## Optimization Categories

### Compute Optimization
- Right-sizing over-provisioned instances
- Spot/preemptible instance opportunities
- Auto-scaling configuration improvements
- Serverless migration candidates
- Reserved instance/savings plan recommendations

### Storage Optimization
- Lifecycle policy for infrequent access data
- Cold storage migration opportunities
- Unused volume detection and deletion
- Snapshot retention optimization
- Block storage to object storage migration

### Network Optimization
- Data transfer cost reduction strategies
- CDN usage optimization
- NAT gateway cost reduction
- Cross-region traffic minimization
- VPN vs. Direct Connect analysis

### Database Optimization
- Right-sizing database instances
- Read replica optimization
- Backup retention policy optimization
- Serverless database opportunities
- Connection pooling improvements

## Implementation

This command uses specialized cloud agents:

1. **@aws-cloud-architect** - AWS cost analysis
2. **@azure-cloud-architect** - Azure cost analysis
3. **@gcp-cloud-architect** - GCP cost analysis
4. **@terraform-infrastructure-expert** - IaC cost estimation

The command:
1. Queries Context7 for cost optimization patterns
2. Analyzes current resource utilization
3. Compares against pricing models and alternatives
4. Generates prioritized recommendations
5. Optionally applies automated optimizations
6. Projects cost savings with implementation timeline

## Risk Levels

### Low Risk (Auto-Apply Safe)
- Delete unused volumes and snapshots
- Apply storage lifecycle policies
- Enable auto-scaling where configured
- Update security group descriptions

### Medium Risk (Review Required)
- Right-size instances (25%+ reduction)
- Migrate to spot instances
- Change storage classes
- Consolidate resources

### High Risk (Manual Approval)
- Terminate running instances
- Major architecture changes
- Cross-region migrations
- Database sizing changes

## Output Format

### Console Output
```
💰 Cloud Cost Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Monthly Cost: $4,250
Potential Savings: $1,180 (27.8%)

AWS Optimization Opportunities
  Compute
    💰 $420/mo - Right-size 8 over-provisioned EC2 instances
    💰 $180/mo - Convert 3 instances to spot
    💰 $90/mo - Enable auto-scaling for development environments

  Storage
    💰 $120/mo - Move 500GB to Glacier Deep Archive
    💰 $60/mo - Delete 15 unused EBS volumes

  Network
    💰 $80/mo - Optimize CloudFront distribution

Azure Optimization Opportunities
  Compute
    💰 $150/mo - Right-size 4 VMs
    💰 $80/mo - Reserved instance for production VMs

Summary by Risk Level
  🟢 Low Risk: $240/mo (auto-apply with --apply)
  🟡 Medium Risk: $680/mo (review recommended)
  🔴 High Risk: $260/mo (manual approval required)

Recommended Actions
  1. Apply low-risk optimizations immediately
  2. Review medium-risk recommendations with team
  3. Plan high-risk changes for next maintenance window

Projected Timeline
  Immediate: $240/mo savings
  Week 1: $920/mo cumulative savings
  Month 1: $1,180/mo total savings
```

### Report Output
Generates detailed markdown report with:
- Executive summary with ROI analysis
- Detailed findings by provider and category
- Cost trend analysis
- Prioritized recommendation list with implementation steps
- Risk assessment matrix
- Projected savings timeline

## Related Commands

- `/cloud:validate` - Validate infrastructure before optimization
- `/cloud:deploy` - Deploy optimized infrastructure
- `/cloud:monitor` - Monitor cost trends over time

## Best Practices

1. **Regular Analysis**: Run monthly cost optimization reviews
2. **Start Small**: Apply low-risk optimizations first
3. **Monitor Impact**: Track actual vs. projected savings
4. **Document Decisions**: Record why certain optimizations weren't applied
5. **Automate**: Schedule automated optimization for non-production environments

## Auto-Apply Rules

When using `--apply`, only these optimizations are automatically applied:

✅ **Safe Optimizations**
- Delete unattached EBS volumes (>30 days old)
- Delete old snapshots beyond retention policy
- Apply storage lifecycle policies
- Tag untagged resources
- Enable cost allocation tags

❌ **Blocked from Auto-Apply**
- Instance type changes
- Instance termination
- Database modifications
- Network topology changes
- Any production resource changes

## Troubleshooting

### Missing Cost Data
- Ensure Cost Explorer is enabled (AWS)
- Enable billing export (Azure, GCP)
- Wait 24-48 hours for data population

### Incomplete Recommendations
- Check IAM/RBAC permissions for cost APIs
- Verify CloudWatch/Monitoring metrics are enabled
- Ensure resource tagging is consistent

### Optimization Failures
- Review resource dependencies before applying
- Check for attached resources (volumes, IPs)
- Verify no active workloads on target resources

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Automated low-risk optimizations
- Multi-cloud support
- FinOps best practices integration
