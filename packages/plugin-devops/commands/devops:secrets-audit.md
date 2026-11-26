# devops:secrets-audit

Comprehensive secrets audit to find hardcoded credentials, API keys, tokens in codebase and infrastructure using Context7-verified best practices.

## Description

Performs comprehensive secrets scanning across multiple sources to identify hardcoded credentials, API keys, tokens, and other sensitive information:
- Multi-source scanning (Git, Docker, Kubernetes, CI/CD)
- Secret pattern detection (AWS keys, GitHub tokens, private keys)
- Severity classification (CRITICAL, HIGH, MEDIUM, LOW)
- Remediation guidance with auto-fix capabilities
- Compliance reporting (GDPR, SOC2, PCI-DSS)
- Integration with industry-standard tools (gitleaks, trufflehog, detect-secrets)

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: github, kubernetes, vault, aws.

## Usage

```bash
/devops:secrets-audit [options]
```

## Options

- `--scan-git-history` - Scan entire Git history across all branches and commits
- `--fix` - Apply automatic fixes (add to .gitignore, replace with env vars)
- `--rotate-exposed` - Automatically rotate exposed credentials (AWS keys, GitHub tokens)
- `--platforms <kubernetes,docker,github>` - Scan specific platforms
- `--output-format <json|sarif|text>` - Output format (default: text)
- `--export <path>` - Export report to file
- `--severity <critical|high|medium|low>` - Filter by minimum severity level

## Examples

### Basic Secrets Audit
```bash
/devops:secrets-audit
```

### Scan Git History
```bash
/devops:secrets-audit --scan-git-history
```

### Auto-Fix and Rotate Exposed Credentials
```bash
/devops:secrets-audit --fix --rotate-exposed
```

### Platform-Specific Scanning
```bash
/devops:secrets-audit --platforms kubernetes,docker,github
```

### SARIF Export for CI/CD Integration
```bash
/devops:secrets-audit --output-format sarif --export report.json
```

## Secret Detection Patterns

### Pattern Recognition from Context7

**AWS Access Keys:**
```regex
AKIA[0-9A-Z]{16}
```

**GitHub Personal Access Tokens:**
```regex
ghp_[a-zA-Z0-9]{36}
```

**Private Keys:**
```regex
-----BEGIN RSA PRIVATE KEY-----
-----BEGIN PRIVATE KEY-----
-----BEGIN OPENSSH PRIVATE KEY-----
```

**Generic Passwords:**
```regex
password\s*=\s*["'][^"']+["']
```

**Additional Patterns:**
- API keys and tokens
- Database connection strings
- Cloud credentials (AWS keys, Azure credentials, GCP service accounts)
- OAuth tokens and secrets
- JWT secrets
- Encryption keys

## Multi-Source Scanning

### 1. Git History Scanning

Scans entire Git history across all branches and commits:
```bash
git log --all --full-history -- '*'
git grep -E 'AKIA[0-9A-Z]{16}' $(git rev-list --all)
```

### 2. Docker Images and Layers

Analyzes Docker images for embedded secrets:
```bash
docker history $IMAGE
docker inspect $IMAGE
```

### 3. Kubernetes Secrets and ConfigMaps

Scans Kubernetes resources for exposed secrets:
```bash
kubectl get secrets -A -o yaml
kubectl get configmaps -A -o yaml
```

### 4. CI/CD Pipeline Configurations

Examines CI/CD files for hardcoded credentials:
- `.github/workflows/*.yml` - GitHub Actions
- `azure-pipelines.yml` - Azure DevOps
- `.gitlab-ci.yml` - GitLab CI
- `Jenkinsfile` - Jenkins pipelines

### 5. Infrastructure as Code

Scans IaC files for embedded secrets:
- Terraform configurations (*.tf)
- CloudFormation templates (*.yaml, *.json)
- Ansible playbooks (*.yml)
- Helm charts (values.yaml)

## Severity Classification

### CRITICAL - Cloud Credentials and Database Passwords

Active production credentials requiring immediate rotation:
- **Cloud credentials**: AWS access keys, Azure service principals, GCP service accounts
- **Database passwords**: Production database connection strings
- **Master keys**: Encryption master keys, root credentials

**Action Required:** Rotate immediately (within 1 hour)

### HIGH - API Tokens and Service Account Keys

Service credentials and API tokens with significant access:
- **API tokens**: Stripe API keys, SendGrid tokens, payment gateway credentials
- **Service account keys**: OAuth client secrets, service-to-service credentials
- **CI/CD secrets**: Deployment keys, container registry credentials

**Action Required:** Rotate within 24 hours

### MEDIUM - Localhost and Dev Tokens

Development and staging credentials with limited scope:
- **Localhost credentials**: Local development database passwords
- **Dev tokens**: Development API tokens with limited permissions
- **Test credentials**: Non-production service credentials

**Action Required:** Plan migration to secrets manager within 1 week

### LOW - False Positives and Test Credentials

False positives and test credentials:
- **False positives**: Patterns matching non-secret data
- **Public test credentials**: Example credentials from documentation
- **Placeholder values**: Template placeholders and examples

**Action Required:** Review and validate, update detection rules

## Remediation Guidance

### 1. Rotate Compromised Credentials

**AWS Keys:**
```bash
aws iam delete-access-key --access-key-id AKIA...
aws iam create-access-key --user-name username
```

**GitHub Tokens:**
```bash
gh auth token revoke
gh auth login --web
```

### 2. Migrate to Secrets Manager

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret --name prod/db/password --secret-string "..."
```

**HashiCorp Vault:**
```bash
vault kv put secret/db/password value="..."
```

**Kubernetes Secrets:**
```bash
kubectl create secret generic db-password --from-literal=password="..."
```

### 3. Update .gitignore and .dockerignore

Add sensitive files to ignore lists:
```gitignore
.env
.env.local
.env.production
credentials.json
service-account-key.json
*.pem
*.key
```

### 4. Revoke and Regenerate Tokens

- Revoke exposed API tokens immediately
- Regenerate new credentials with proper rotation schedule
- Implement short-lived credentials where possible
- Use IAM roles and managed identities instead of static credentials

## Tool Integration

### Gitleaks

Industry-standard Git secret scanner:
```bash
gitleaks detect --source . --report-format sarif --report-path report.sarif
```

### TruffleHog

High-entropy string detection:
```bash
trufflehog git file://. --only-verified --json
```

### detect-secrets

Baseline-based secret detection:
```bash
detect-secrets scan --baseline .secrets.baseline
detect-secrets audit .secrets.baseline
```

## Entropy Analysis

High entropy string analysis to detect likely secrets:
- Measures randomness of strings (high entropy = likely secret)
- Threshold-based detection (entropy > 4.5 indicates potential secret)
- Reduces false positives from structured data
- Identifies Base64-encoded credentials

## Output

### Console Output

```
🔒 SECRETS AUDIT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━

🚨 CRITICAL ISSUES (2)
❌ AWS Access Key exposed in .env
   File: .env:12
   Pattern: AKIAIOSFODNN7EXAMPLE
   Exposed: 45 days ago (commit abc123)
   Action: ➜ Rotate immediately

❌ Database password in source code
   File: src/config/database.js:18
   Pattern: hardcoded password "prod_db_2024"
   Action: ➜ Move to AWS Secrets Manager

⚠️  HIGH SEVERITY (5)
- GitHub Personal Access Token in CI config (.github/workflows/deploy.yml:25)
- Stripe API key in environment file (.env.production:8)
- SendGrid API token in configuration (config/email.js:15)
- Docker registry credentials in compose file (docker-compose.yml:42)
- Service account key in source code (src/auth/service-account.json)

📊 Summary
Total findings: 12
├─ Critical: 2 (rotate now!)
├─ High: 5 (rotate within 24h)
├─ Medium: 3 (plan migration)
└─ Low: 2 (false positives)

💡 Recommendations - Rotate and Setup Secrets Manager
1. Rotate exposed AWS credentials immediately
2. Setup AWS Secrets Manager for production secrets
3. Add .env files to .gitignore
4. Enable GitHub secret scanning
5. Implement pre-commit hooks for secret detection
6. Configure Vault for centralized secrets management
7. Use IAM roles instead of static credentials
8. Setup automated credential rotation

🔧 Auto-Fix Available - Run with --fix
Run with --fix to:
- Add secrets to .gitignore and .dockerignore
- Replace hardcoded values with environment variables
- Setup AWS Secrets Manager integration
- Configure Vault secret injection

Run with --rotate-exposed to:
- Automatically rotate AWS access keys
- Revoke exposed GitHub tokens
- Invalidate compromised API credentials
```

## Compliance Reporting

### GDPR Compliance
- Identifies PII in logs and configuration
- Reports data exposure risks
- Recommends encryption at rest and in transit

### SOC2 Compliance
- Access control violations (hardcoded credentials)
- Security monitoring gaps
- Change management issues

### PCI-DSS Compliance
- Payment credential exposure
- Cardholder data in logs
- Encryption key management

## Implementation

This command uses specialized agents:
- **@github-operations-specialist** - GitHub secret scanning integration
- **@ssh-operations-expert** - SSH key management and rotation
- **@aws-cloud-architect** - AWS Secrets Manager setup and key rotation
- **@kubernetes-orchestrator** - Kubernetes secrets management

### Implementation Process:

1. Query Context7 for secrets management best practices
2. TDD - Write tests first for secret detection patterns
3. Scan sources:
   - `git log --all --full-history -- '*'` - Git history
   - `docker history $IMAGE` - Docker layers
   - `kubectl get secrets -A` - Kubernetes secrets
   - `.github/workflows/*.yml` - GitHub Actions
4. Apply detection patterns (AWS keys, GitHub tokens, private keys, passwords)
5. Perform entropy analysis for high-entropy strings (likely secrets)
6. Integrate tools: `gitleaks`, `trufflehog`, `detect-secrets`
7. Classify findings by severity (CRITICAL, HIGH, MEDIUM, LOW)
8. Generate findings report with:
   - Secret location (file:line)
   - Secret type (API key, password, token)
   - Exposure scope (public repo, private, local)
   - Remediation steps
9. Optional: Auto-rotate AWS keys, revoke GitHub tokens

## Security Best Practices

### Pre-Commit Hooks

Prevent secrets from being committed:
```bash
# .git/hooks/pre-commit
#!/bin/bash
gitleaks protect --staged
```

### GitHub Secret Scanning

Enable GitHub Advanced Security:
- Automatic secret detection in commits
- Push protection for known secret patterns
- Partner pattern matching (AWS, Azure, GCP)

### AWS Secrets Manager Integration

Migrate to centralized secrets management:
```python
import boto3
client = boto3.client('secretsmanager')
secret = client.get_secret_value(SecretId='prod/db/password')
```

## Related Commands

- `/security:scan` - Comprehensive security vulnerability scanning
- `/docker:optimize` - Docker image security hardening
- `/cloud:validate` - Infrastructure security validation
- `/github:workflow-create` - CI/CD with secret scanning integration

## Auto-Rotation Capabilities

### AWS Key Auto-Rotation

Automatically rotate AWS access keys:
```bash
aws iam delete-access-key --access-key-id $OLD_KEY
aws iam create-access-key --user-name $USER
# Update in secrets manager
aws secretsmanager put-secret-value --secret-id aws/access-key --secret-string $NEW_KEY
```

### GitHub Token Revocation

Revoke exposed GitHub tokens automatically:
```bash
gh api -X DELETE /applications/$CLIENT_ID/token -f access_token=$TOKEN
```

## Troubleshooting

### High False Positive Rate
- Tune entropy thresholds
- Update detection patterns in `.gitleaks.toml`
- Add exclusions for known false positives

### Performance Issues
- Limit Git history depth with `--shallow`
- Use parallel scanning for large repositories
- Cache scan results for incremental analysis

### Integration Issues
- Verify tool installations (gitleaks, trufflehog)
- Check API credentials for cloud services
- Validate permissions for secret rotation

## Version History

- v2.0.0 - Initial Schema v2.0 release
- Comprehensive multi-source secret scanning
- Context7 integration for best practices
- Auto-rotation capabilities
- Compliance reporting (GDPR, SOC2, PCI-DSS)
