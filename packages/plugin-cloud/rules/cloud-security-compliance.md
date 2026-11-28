# Cloud Security Compliance Rule

**Priority:** `critical`

## Purpose

Enforce security best practices and compliance standards across all cloud infrastructure operations for AWS, Azure, and GCP.

## Scope

This rule applies to:
- All cloud infrastructure commands
- Infrastructure deployment operations
- Cloud resource modifications
- Security configuration changes
- Terraform/IaC code

## Required Documentation

Before any cloud security operation, Context7 queries are MANDATORY:

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: aws, azure, gcp.

## Security Requirements

### 1. Encryption Standards

**MANDATORY:**
- ✅ All data must be encrypted at rest
- ✅ All data must be encrypted in transit (TLS 1.2+)
- ✅ Use cloud provider managed keys (KMS, Key Vault, Cloud KMS)
- ✅ Implement key rotation policies (90 days maximum)

**PROHIBITED:**
- ❌ Storing secrets in code or configuration files
- ❌ Using default encryption keys
- ❌ Disabling encryption for any storage service
- ❌ Using deprecated encryption algorithms (MD5, SHA1)

### 2. Access Control

**MANDATORY:**
- ✅ Implement least privilege principle
- ✅ Use IAM roles instead of access keys
- ✅ Enable MFA for all human access
- ✅ Implement RBAC for all resources
- ✅ Regular access review (quarterly minimum)

**PROHIBITED:**
- ❌ Root/admin account usage for daily operations
- ❌ Long-lived access keys (>90 days)
- ❌ Wildcard permissions in policies
- ❌ Public access to sensitive resources

### 3. Network Security

**MANDATORY:**
- ✅ Use private subnets for application workloads
- ✅ Implement network segmentation
- ✅ Enable VPC Flow Logs / NSG Flow Logs
- ✅ Use security groups / firewall rules with least privilege
- ✅ Enable DDoS protection

**PROHIBITED:**
- ❌ 0.0.0.0/0 ingress rules (except for public load balancers)
- ❌ Direct internet access for databases
- ❌ Disabled firewall or security groups
- ❌ Unrestricted SSH/RDP access (22/3389 open to 0.0.0.0/0)

### 4. Logging and Monitoring

**MANDATORY:**
- ✅ Enable CloudTrail / Activity Log / Cloud Audit Logs
- ✅ Log retention minimum 90 days
- ✅ Enable automated threat detection
- ✅ Configure alerting for security events
- ✅ Implement log analysis and SIEM integration

**PROHIBITED:**
- ❌ Disabling audit logging
- ❌ Deleting or modifying audit logs
- ❌ Insufficient log retention
- ❌ No monitoring for suspicious activity

### 5. Compliance Standards

**MANDATORY:**
- ✅ Tag all resources with compliance requirements
- ✅ Use compliant regions (data residency)
- ✅ Enable automated compliance scanning
- ✅ Document compliance exceptions
- ✅ Regular compliance audits

**PROHIBITED:**
- ❌ Storing regulated data in non-compliant regions
- ❌ Bypassing compliance controls
- ❌ Undocumented security exceptions

## Enforcement

### Pre-Deployment Checks

Before any infrastructure deployment:

1. **Context7 Query** - Verify current security best practices
2. **Security Scan** - Run automated security scanner
3. **Compliance Check** - Validate against compliance frameworks
4. **Code Review** - Manual security review for critical changes
5. **Approval** - Security team sign-off for production

### Automated Validation

The following checks run automatically:

```bash
# Pre-deployment security validation
/cloud:validate --scope security --strict

# Resource compliance check
terraform plan | security-scanner

# Secret detection
git-secrets --scan

# Policy validation
opa test security-policies/
```

### Deployment Blocks

Deployment is **BLOCKED** if:
- ❌ Public S3 buckets without explicit approval
- ❌ Security group rules allowing 0.0.0.0/0 ingress (except approved LBs)
- ❌ Disabled encryption on storage resources
- ❌ IAM policies with `*` actions or resources
- ❌ Secrets detected in code or config
- ❌ Compliance violations detected
- ❌ Missing required tags (Environment, Owner, CostCenter, Compliance)

### Warning Triggers

Warnings issued for:
- ⚠️ Resources without backup configured
- ⚠️ Long-lived access credentials
- ⚠️ Outdated software versions
- ⚠️ Insufficient monitoring coverage
- ⚠️ Non-production resources in production VPC

## Implementation Examples

### Terraform Security Validation

```hcl
# GOOD: Encrypted S3 bucket with versioning
resource "aws_s3_bucket" "secure" {
  bucket = "my-secure-bucket"

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
        kms_master_key_id = aws_kms_key.bucket_key.arn
      }
    }
  }

  versioning {
    enabled = true
  }

  logging {
    target_bucket = aws_s3_bucket.logs.id
  }
}

# BAD: Public, unencrypted bucket
resource "aws_s3_bucket" "bad" {
  bucket = "my-bad-bucket"
  acl    = "public-read"  # ❌ BLOCKED
  # No encryption configured  # ❌ BLOCKED
}
```

### Security Group Best Practices

```hcl
# GOOD: Restricted security group
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]  # ✅ Specific source
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]  # ⚠️ Warning, but acceptable for egress
  }
}

# BAD: Overly permissive
resource "aws_security_group" "bad" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # ❌ BLOCKED - SSH to world
  }
}
```

### IAM Policy Best Practices

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-specific-bucket/*"
      ]
    }
  ]
}
```

## Exceptions Process

Security exceptions require:

1. **Written Justification** - Business case for exception
2. **Risk Assessment** - Document security impact
3. **Compensating Controls** - Alternative security measures
4. **Approval** - Security team and management sign-off
5. **Time Limit** - All exceptions have expiration date
6. **Review** - Quarterly exception reviews

### Exception Documentation Template

```yaml
exception:
  id: SEC-2025-001
  resource: arn:aws:s3:::public-website-assets
  violation: Public S3 bucket
  justification: Static website hosting requires public access
  compensating_controls:
    - CloudFront distribution with WAF
    - S3 bucket policy restricting to CloudFront only
    - No sensitive data in bucket
  approved_by: security-team@company.com
  expires: 2025-12-31
  review_date: 2025-09-30
```

## Incident Response

If security violation detected:

1. **Alert** - Immediate notification to security team
2. **Block** - Prevent deployment if pre-deployment
3. **Quarantine** - Isolate affected resources if post-deployment
4. **Investigate** - Determine scope and impact
5. **Remediate** - Fix vulnerability
6. **Review** - Post-incident review and process improvement

## Compliance Frameworks Supported

- **SOC 2** - Service Organization Control 2
- **HIPAA** - Health Insurance Portability and Accountability Act
- **PCI-DSS** - Payment Card Industry Data Security Standard
- **GDPR** - General Data Protection Regulation
- **ISO 27001** - Information Security Management
- **FedRAMP** - Federal Risk and Authorization Management Program
- **NIST** - National Institute of Standards and Technology frameworks

## Related Rules

- `infrastructure-pipeline.md` - Deployment pipeline standards
- `cost-optimization.md` - Cost management without compromising security
- `backup-recovery.md` - Disaster recovery requirements

## Enforcement Tools

This rule is enforced using:

- **Pre-deployment hooks** - `.claude/hooks/pre-cloud-deploy.js`
- **Terraform validators** - `tfsec`, `checkov`, `terraform-compliance`
- **Cloud-native tools** - AWS Config, Azure Policy, GCP Security Command Center
- **Custom scanners** - Project-specific security validators

## Version History

- v2.0.0 - Initial Schema v2.0 release
- Comprehensive security requirements
- Multi-cloud support (AWS, Azure, GCP)
- Compliance framework integration
- Context7 documentation integration
