---
command: cloud:cost-alert
plugin: cloud
category: cloud-operations
description: Cloud cost monitoring and alerting across multi-cloud environments
tags:
  - cloud
  - cost-management
  - monitoring
  - aws
  - gcp
  - azure
tools:
  - @aws-cloud-architect
  - @gcp-cloud-architect
  - @azure-cloud-architect
  - Read
  - Write
  - Bash
usage: |
  /cloud:cost-alert --provider aws --threshold 1000 --period daily --channel slack
examples:
  - input: /cloud:cost-alert --provider aws --budget 5000 --alert-when forecast-exceeds
    description: Alert when AWS forecast exceeds budget
  - input: /cloud:cost-alert --provider gcp --anomaly-detection ml --sensitivity high
    description: ML-based anomaly detection for GCP
  - input: /cloud:cost-alert --provider azure --threshold 2000 --channel pagerduty
    description: Alert to PagerDuty when Azure costs exceed threshold
---

# cloud:cost-alert

Monitor and alert on cloud costs across AWS, GCP, and Azure with anomaly detection, budget tracking, and multi-channel notifications.

## Description

Comprehensive cloud cost monitoring and alerting solution that:
- Monitors costs across AWS, GCP, and Azure
- Detects cost anomalies using threshold, trend, and ML-based methods
- Tracks budget utilization and forecasts future costs
- Provides resource-level cost attribution
- Sends alerts via Slack, email, PagerDuty, or webhooks
- Generates daily/weekly/monthly cost reports
- Recommends cost optimization opportunities

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: aws, gcp, azure, prometheus, grafana.

## Instructions

### 1. Multi-Cloud Cost Data Retrieval

Query Context7 for provider-specific billing API patterns, then:

**AWS Cost Explorer:**
```javascript
// Fetch AWS costs using Cost Explorer API
const costs = await fetchAWSCosts({
  timePeriod: { start: '2025-10-01', end: '2025-10-21' },
  granularity: 'DAILY',
  metrics: ['UnblendedCost', 'UsageQuantity'],
  groupBy: [{ type: 'DIMENSION', key: 'SERVICE' }]
});
```

**GCP Cloud Billing:**
```javascript
// Fetch GCP costs using Cloud Billing API
const costs = await fetchGCPCosts({
  projectId: 'my-project',
  timeRange: { startTime: '2025-10-01', endTime: '2025-10-21' },
  aggregation: { groupByFields: ['service', 'sku'] }
});
```

**Azure Cost Management:**
```javascript
// Fetch Azure costs using Cost Management API
const costs = await fetchAzureCosts({
  scope: '/subscriptions/{subscription-id}',
  timePeriod: { from: '2025-10-01', to: '2025-10-21' },
  granularity: 'Daily',
  aggregation: { totalCost: 'Sum' }
});
```

### 2. Cost Anomaly Detection

Implement three detection methods:

**Threshold-based Detection:**
- Alert when daily cost exceeds fixed threshold
- Alert when cost increases by X% from baseline
- Configure separate thresholds for production vs. development

**Trend-based Detection:**
- Calculate moving average over 7/30/90 days
- Alert when current cost deviates >2 standard deviations
- Identify sustained upward or downward trends

**ML-based Detection:**
- Use cloud provider's native anomaly detection (AWS Cost Anomaly Detection)
- Implement simple time-series forecasting
- Alert on unexpected cost patterns

### 3. Budget Tracking and Forecasting

**Budget Monitoring:**
```javascript
// Track budget utilization
const budgetStatus = await trackBudget({
  budgetName: 'Q4-2025-Production',
  budgetAmount: 50000,
  budgetPeriod: 'QUARTERLY',
  actualSpend: currentCosts,
  forecastedSpend: forecastCosts(historicalData, periodsAhead)
});

// Alert when:
// - 50% budget consumed
// - 80% budget consumed
// - 100% budget exceeded
// - Forecast exceeds budget
```

**Cost Forecasting:**
- Use linear regression for basic forecasting
- Leverage cloud provider forecasting APIs when available
- Calculate forecast confidence intervals
- Alert when forecast exceeds budget with X days remaining

### 4. Alert Channel Configuration

**Slack Integration:**
```javascript
// Send Slack alert
await sendSlackAlert({
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channel: '#cloud-costs',
  severity: 'warning',
  message: {
    title: 'AWS Cost Alert: Threshold Exceeded',
    cost: '$1,234.56',
    threshold: '$1,000.00',
    provider: 'AWS',
    period: 'Daily',
    details: topSpenders
  }
});
```

**Email Alerts:**
```javascript
// Send email via SES/SendGrid/Gmail
await sendEmailAlert({
  to: ['devops@company.com', 'finance@company.com'],
  subject: 'GCP Cost Alert: Budget 80% Consumed',
  template: 'cost-alert',
  data: { budget, actual, forecast, recommendations }
});
```

**PagerDuty Integration:**
```javascript
// Create PagerDuty incident for critical alerts
await sendPagerDutyAlert({
  routingKey: process.env.PAGERDUTY_KEY,
  severity: 'critical',
  summary: 'Azure costs exceeded critical threshold',
  dedup_key: 'azure-cost-alert-2025-10-21',
  custom_details: { cost, threshold, resources }
});
```

**Webhook Alerts:**
```javascript
// Send to custom webhook endpoint
await sendWebhookAlert({
  url: 'https://api.company.com/cost-alerts',
  method: 'POST',
  body: {
    provider: 'AWS',
    alert_type: 'threshold_exceeded',
    severity: 'high',
    current_cost: 1234.56,
    threshold: 1000.00,
    timestamp: new Date().toISOString()
  }
});
```

### 5. Resource-Level Cost Attribution

Analyze costs by:

**Service/Resource Group:**
```javascript
// AWS: Group by service
const byService = groupCosts(costs, 'SERVICE');
// Top 5: EC2, RDS, S3, Lambda, CloudFront

// GCP: Group by service
const byService = groupCosts(costs, 'service.description');

// Azure: Group by resource group
const byResourceGroup = groupCosts(costs, 'ResourceGroup');
```

**Tags/Labels:**
```javascript
// Cost allocation by tags
const byEnvironment = groupCosts(costs, 'tag:Environment');
// production: $X, staging: $Y, development: $Z

const byTeam = groupCosts(costs, 'tag:Team');
// backend: $X, frontend: $Y, data: $Z

const byProject = groupCosts(costs, 'tag:Project');
```

**Region:**
```javascript
// Multi-region cost analysis
const byRegion = groupCosts(costs, 'REGION');
// us-east-1: $X, eu-west-1: $Y, ap-southeast-1: $Z
```

### 6. Cost Optimization Recommendations

Based on cost analysis, generate recommendations:

**Idle Resources:**
- Identify stopped instances still incurring costs
- Detect unattached volumes and snapshots
- Find unused load balancers and NAT gateways

**Right-sizing Opportunities:**
- Analyze instance utilization metrics
- Recommend smaller instance types
- Suggest reserved instances for steady workloads

**Storage Optimization:**
- Identify infrequently accessed data
- Recommend storage class transitions
- Suggest lifecycle policies

### 7. Cost Reports

Generate comprehensive reports:

**Daily Report:**
- Yesterday's total cost
- Comparison to previous day and week ago
- Top 5 cost increases
- Any threshold breaches

**Weekly Report:**
- Week's total cost and trend
- Budget utilization percentage
- Cost breakdown by service/team
- Optimization opportunities identified

**Monthly Report:**
- Executive summary with month-over-month comparison
- Forecast for next month
- Top cost drivers
- Implemented optimizations and savings realized

## Usage

```bash
/cloud:cost-alert [options]
```

## Options

### Provider Selection
- `--provider <aws|gcp|azure|all>` - Cloud provider to monitor (default: all)

### Alert Configuration
- `--threshold <amount>` - Alert when cost exceeds amount (e.g., 1000)
- `--budget <amount>` - Set budget amount for tracking
- `--alert-when <condition>` - Alert condition: threshold-exceeded, budget-80, budget-100, forecast-exceeds
- `--period <daily|weekly|monthly>` - Cost aggregation period (default: daily)

### Anomaly Detection
- `--anomaly-detection <threshold|trend|ml>` - Detection method (default: threshold)
- `--sensitivity <low|medium|high>` - Detection sensitivity (default: medium)
- `--baseline-days <number>` - Days for baseline calculation (default: 30)

### Alert Channels
- `--channel <slack|email|pagerduty|webhook>` - Alert delivery channel
- `--slack-webhook <url>` - Slack webhook URL
- `--email <addresses>` - Comma-separated email addresses
- `--pagerduty-key <key>` - PagerDuty integration key
- `--webhook-url <url>` - Custom webhook endpoint

### Cost Analysis
- `--group-by <service|region|tag>` - Group costs by dimension
- `--tag-key <key>` - Tag key for cost allocation (e.g., Environment, Team)
- `--show-recommendations` - Include optimization recommendations

### Reporting
- `--report-type <daily|weekly|monthly>` - Report type
- `--output <path>` - Save report to file
- `--format <json|markdown|html>` - Report format (default: markdown)

## Examples

### Basic Threshold Alert (AWS)
```bash
/cloud:cost-alert --provider aws --threshold 1000 --channel slack
```

### Budget Tracking with Forecast (GCP)
```bash
/cloud:cost-alert --provider gcp --budget 5000 --alert-when forecast-exceeds --channel email
```

### ML-based Anomaly Detection (Azure)
```bash
/cloud:cost-alert --provider azure --anomaly-detection ml --sensitivity high --channel pagerduty
```

### Multi-Cloud with Tag-based Analysis
```bash
/cloud:cost-alert --provider all --group-by tag --tag-key Environment --show-recommendations
```

### Weekly Cost Report
```bash
/cloud:cost-alert --report-type weekly --output ./reports/weekly-costs.md --format markdown
```

### Critical Budget Alert
```bash
/cloud:cost-alert --provider aws --budget 10000 --alert-when budget-100 --channel pagerduty --channel email
```

## Implementation

This command orchestrates multiple cloud agents:

1. **@aws-cloud-architect** - AWS Cost Explorer integration
2. **@gcp-cloud-architect** - GCP Cloud Billing integration
3. **@azure-cloud-architect** - Azure Cost Management integration

### Workflow

1. **Query Context7** for cloud billing API best practices
2. **Authenticate** with cloud provider APIs
3. **Fetch cost data** for specified time period
4. **Analyze costs** using configured detection method
5. **Check thresholds/budgets** for alert conditions
6. **Generate recommendations** if requested
7. **Send alerts** via configured channels
8. **Create report** if output specified

## Output Format

### Console Output

```
💰 Cloud Cost Alert Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provider: AWS
Period: Daily (2025-10-21)
Current Cost: $1,234.56
Threshold: $1,000.00
Status: ⚠️  THRESHOLD EXCEEDED

Cost Breakdown:
  EC2:          $456.78 (37%)
  RDS:          $234.56 (19%)
  S3:           $123.45 (10%)
  Lambda:       $89.01  (7%)
  CloudFront:   $67.89  (5%)
  Other:        $262.87 (22%)

Anomaly Detection:
  Method: ML-based
  Result: ⚠️  Cost anomaly detected
  Severity: High
  Baseline (30-day avg): $875.23
  Deviation: +41% from baseline

Budget Status:
  Budget: $30,000 (Monthly)
  Consumed: $18,456.78 (61.5%)
  Days Remaining: 10
  Forecast: $29,234.56 (97.4%)
  Status: ⚠️  On track to exceed budget

Top Cost Increases:
  1. EC2 (us-east-1): +$234.56 (+106%)
     → New c5.2xlarge instances launched
  2. RDS (eu-west-1): +$89.45 (+62%)
     → Database storage increased
  3. S3: +$45.23 (+58%)
     → Large data ingestion event

Optimization Recommendations:
  💡 Right-size 4 over-provisioned EC2 instances → Save $156/day
  💡 Enable auto-scaling for development workloads → Save $89/day
  💡 Move infrequent S3 data to Glacier → Save $23/day

Alerts Sent:
  ✅ Slack: #cloud-costs
  ✅ Email: devops@company.com, finance@company.com
  ⏩ PagerDuty: Incident created (#INC-12345)

Next Steps:
  1. Review EC2 instance scaling in us-east-1
  2. Investigate RDS storage growth
  3. Apply recommended optimizations
  4. Adjust budget if forecast is accurate
```

### JSON Output

```json
{
  "provider": "AWS",
  "date": "2025-10-21",
  "period": "daily",
  "cost": {
    "total": 1234.56,
    "currency": "USD",
    "breakdown": {
      "EC2": 456.78,
      "RDS": 234.56,
      "S3": 123.45
    }
  },
  "alert": {
    "triggered": true,
    "type": "threshold_exceeded",
    "severity": "high",
    "threshold": 1000.00,
    "deviation_percent": 23.5
  },
  "anomaly": {
    "detected": true,
    "method": "ml",
    "baseline": 875.23,
    "deviation_percent": 41,
    "severity": "high"
  },
  "budget": {
    "amount": 30000,
    "consumed": 18456.78,
    "percent": 61.5,
    "forecast": 29234.56,
    "status": "warning"
  },
  "recommendations": [
    {
      "type": "right-sizing",
      "resource": "EC2 instances",
      "savings_daily": 156,
      "priority": "high"
    }
  ]
}
```

## Alert Severity Levels

- **🔴 Critical** - Cost >150% of threshold, or budget exceeded
- **⚠️  Warning** - Cost >100% of threshold, or >80% budget consumed
- **ℹ️  Info** - Cost trend change, or >50% budget consumed
- **✅ Normal** - Cost within expected range

## Best Practices

### Alert Configuration
1. **Start Conservative** - Set higher thresholds initially to avoid alert fatigue
2. **Tune Over Time** - Adjust based on actual cost patterns and false positive rate
3. **Separate Environments** - Different thresholds for production, staging, development
4. **Multiple Channels** - Use email for info/warning, PagerDuty for critical only

### Monitoring Strategy
1. **Daily Checks** - Run daily for near real-time cost awareness
2. **Weekly Reviews** - Analyze trends and adjust budgets/thresholds
3. **Monthly Reports** - Executive summary with ROI analysis
4. **Quarterly Planning** - Budget adjustments based on forecasts

### Cost Attribution
1. **Consistent Tagging** - Enforce tag policies across all resources
2. **Tag Validation** - Verify cost allocation tags are applied correctly
3. **Chargeback Reports** - Generate team/project-specific cost reports
4. **Trending Analysis** - Track cost changes by tag over time

### Anomaly Detection
1. **Baseline Period** - Use 30-90 days for stable baseline
2. **Seasonality** - Account for known traffic/cost patterns
3. **Change Correlation** - Link cost spikes to deployments/events
4. **ML Tuning** - Adjust sensitivity based on environment stability

## Troubleshooting

### Missing Cost Data
**Problem:** Cost data not available or incomplete
**Solutions:**
- AWS: Enable Cost Explorer (takes 24 hours to populate)
- GCP: Enable Cloud Billing export to BigQuery
- Azure: Wait 24-48 hours after enabling Cost Management
- Verify IAM/RBAC permissions for billing APIs

### False Positive Alerts
**Problem:** Too many alerts for normal cost variations
**Solutions:**
- Increase threshold percentage
- Extend baseline period (e.g., 30 → 90 days)
- Use trend-based instead of threshold-based detection
- Adjust sensitivity from high → medium → low

### Alert Delivery Failures
**Problem:** Alerts not received via configured channels
**Solutions:**
- Slack: Verify webhook URL is valid and channel exists
- Email: Check SMTP settings and sender authentication
- PagerDuty: Confirm integration key and routing rules
- Webhook: Test endpoint availability and authentication

### Inaccurate Forecasts
**Problem:** Cost forecasts significantly off from actual
**Solutions:**
- Ensure sufficient historical data (minimum 30 days)
- Account for planned infrastructure changes
- Use provider's native forecasting when available
- Consider seasonal patterns and growth trends

## Related Commands

- `/cloud:cost-optimize` - Analyze and optimize cloud costs
- `/cloud:validate` - Validate cloud infrastructure configuration
- `/infra:deploy` - Deploy infrastructure changes

## Security Considerations

### API Credentials
- Store cloud API credentials in secure secrets manager
- Use least-privilege IAM roles for cost data access
- Rotate credentials regularly
- Never commit credentials to version control

### Alert Data
- Redact sensitive resource names/IDs in public channels
- Use private Slack channels for cost discussions
- Encrypt webhook payloads if containing sensitive data
- Implement rate limiting on alert endpoints

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Multi-cloud support (AWS, GCP, Azure)
- Three anomaly detection methods
- Budget tracking and forecasting
- Multi-channel alerting
- Cost attribution and recommendations
