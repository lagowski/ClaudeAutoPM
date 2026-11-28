# ci:pipeline-create

Create production-ready CI/CD pipelines for GitHub Actions, Azure DevOps, or GitLab CI with Context7-verified best practices.

## Description

Generates comprehensive CI/CD pipeline configurations following industry best practices:
- Multi-stage pipeline architecture (build, test, deploy)
- Security scanning and vulnerability detection
- Artifact management and caching
- Environment-specific deployments
- Secret management and security
- Monitoring and observability integration

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: github, azure-devops, docker, kubernetes.

## Usage

```bash
/ci:pipeline-create [options]
```

## Options

- `--platform <github|azure|gitlab>` - CI/CD platform (default: github)
- `--type <node|python|docker|k8s>` - Project type
- `--environments <dev,staging,prod>` - Target environments
- `--registry <dockerhub|gcr|acr|ecr>` - Container registry
- `--output <path>` - Output directory for pipeline files
- `--include-security` - Add security scanning stages
- `--include-deploy` - Add deployment stages
- `--matrix` - Generate matrix build for multiple versions

## Examples

### Create GitHub Actions Workflow for Node.js
```bash
/ci:pipeline-create --platform github --type node --environments dev,staging,prod
```

### Create Azure Pipeline with Security Scanning
```bash
/ci:pipeline-create --platform azure --type docker --include-security --registry acr
```

### Create Multi-Environment Kubernetes Pipeline
```bash
/ci:pipeline-create --platform github --type k8s --environments dev,prod --include-deploy
```

### Create Matrix Build Pipeline
```bash
/ci:pipeline-create --platform github --type node --matrix
```

## Pipeline Architectures

### 1. GitHub Actions - Node.js Application

**Pattern from Context7 (/actions/toolkit):**

```yaml
name: Node.js CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: '18.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Stage 1: Code Quality
  lint-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: node-${{ matrix.node-version }}

  # Stage 2: Security Scanning
  security-scan:
    runs-on: ubuntu-latest
    needs: lint-and-test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run CodeQL analysis
        uses: github/codeql-action/analyze@v2

  # Stage 3: Build Docker Image
  build-image:
    runs-on: ubuntu-latest
    needs: [lint-and-test, security-scan]
    if: github.event_name != 'pull_request'

    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_VERSION=${{ env.NODE_VERSION }}
            BUILD_DATE=${{ github.event.head_commit.timestamp }}
            VCS_REF=${{ github.sha }}

  # Stage 4: Deploy to Development
  deploy-dev:
    runs-on: ubuntu-latest
    needs: build-image
    if: github.ref == 'refs/heads/develop'
    environment:
      name: development
      url: https://dev.example.com

    steps:
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          namespace: dev
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:develop
          pull-images: false

      - name: Run smoke tests
        run: |
          curl -f https://dev.example.com/health || exit 1

  # Stage 5: Deploy to Production
  deploy-prod:
    runs-on: ubuntu-latest
    needs: build-image
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://example.com

    steps:
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          namespace: prod
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          pull-images: false

      - name: Run smoke tests
        run: |
          curl -f https://example.com/health || exit 1

      - name: Notify deployment
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deployed ${{ github.repository }} to production",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "✅ *Production Deployment Successful*\n*Repository:* ${{ github.repository }}\n*SHA:* ${{ github.sha }}\n*Author:* ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 2. Azure DevOps - Docker Application

**Pattern from Context7 (/microsoft/azure-pipelines):**

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    exclude:
      - docs/*
      - README.md

pr:
  branches:
    include:
      - main

variables:
  - name: imageRepository
    value: 'myapp'
  - name: dockerfilePath
    value: '$(Build.SourcesDirectory)/Dockerfile'
  - name: tag
    value: '$(Build.BuildId)'
  - name: vmImageName
    value: 'ubuntu-latest'

stages:
  # Stage 1: Build and Test
  - stage: Build
    displayName: Build and Test
    jobs:
      - job: BuildJob
        displayName: Build Application
        pool:
          vmImage: $(vmImageName)

        steps:
          - task: Docker@2
            displayName: Build Docker image
            inputs:
              command: build
              dockerfile: $(dockerfilePath)
              tags: |
                $(tag)
                latest
              arguments: '--build-arg BUILD_DATE=$(Build.BuildNumber)'

          - task: Docker@2
            displayName: Run container security scan
            inputs:
              command: run
              arguments: '--rm aquasec/trivy image --severity HIGH,CRITICAL $(imageRepository):$(tag)'

          - script: |
              docker run --rm $(imageRepository):$(tag) npm test
            displayName: Run tests in container

  # Stage 2: Security Scanning
  - stage: SecurityScan
    displayName: Security Scanning
    dependsOn: Build
    jobs:
      - job: ScanJob
        displayName: Security Analysis
        pool:
          vmImage: $(vmImageName)

        steps:
          - task: WhiteSource@21
            displayName: WhiteSource security scan
            inputs:
              cwd: '$(System.DefaultWorkingDirectory)'

          - task: SonarCloudPrepare@1
            inputs:
              SonarCloud: 'SonarCloud'
              organization: 'myorg'
              scannerMode: 'CLI'

          - task: SonarCloudAnalyze@1

          - task: SonarCloudPublish@1
            inputs:
              pollingTimeoutSec: '300'

  # Stage 3: Push to Registry
  - stage: Push
    displayName: Push to Registry
    dependsOn: [Build, SecurityScan]
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: PushJob
        displayName: Push Docker Image
        pool:
          vmImage: $(vmImageName)

        steps:
          - task: Docker@2
            displayName: Login to ACR
            inputs:
              command: login
              containerRegistry: 'MyACR'

          - task: Docker@2
            displayName: Push image
            inputs:
              command: push
              repository: $(imageRepository)
              tags: |
                $(tag)
                latest

  # Stage 4: Deploy to Development
  - stage: DeployDev
    displayName: Deploy to Development
    dependsOn: Push
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/develop'))
    jobs:
      - deployment: DeployDev
        displayName: Deploy to Dev Environment
        pool:
          vmImage: $(vmImageName)
        environment: 'development'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@0
                  displayName: Deploy to Kubernetes
                  inputs:
                    action: 'deploy'
                    namespace: 'dev'
                    manifests: |
                      $(Pipeline.Workspace)/manifests/deployment.yaml
                      $(Pipeline.Workspace)/manifests/service.yaml
                    containers: |
                      $(containerRegistry)/$(imageRepository):$(tag)

                - script: |
                    curl -f https://dev.example.com/health
                  displayName: Health check

  # Stage 5: Deploy to Production
  - stage: DeployProd
    displayName: Deploy to Production
    dependsOn: Push
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProd
        displayName: Deploy to Production
        pool:
          vmImage: $(vmImageName)
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@0
                  displayName: Deploy to Kubernetes
                  inputs:
                    action: 'deploy'
                    namespace: 'prod'
                    manifests: |
                      $(Pipeline.Workspace)/manifests/deployment.yaml
                      $(Pipeline.Workspace)/manifests/service.yaml
                    containers: |
                      $(containerRegistry)/$(imageRepository):$(tag)

                - task: Kubernetes@1
                  displayName: Check deployment status
                  inputs:
                    command: 'get'
                    arguments: 'pods -n prod -l app=$(imageRepository)'

                - script: |
                    curl -f https://example.com/health
                  displayName: Production health check
```

## Pipeline Features

### 1. Security Scanning Integration

**From Context7 best practices:**

```yaml
- name: Dependency vulnerability scan
  run: npm audit --audit-level=moderate

- name: SAST with Semgrep
  uses: returntocorp/semgrep-action@v1

- name: Container image scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE }}
    severity: 'CRITICAL,HIGH'
    exit-code: '1'

- name: Secret scanning
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
```

### 2. Caching Strategies

**From Context7 (/docker/docs):**

```yaml
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Docker layer caching
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### 3. Matrix Builds

```yaml
strategy:
  matrix:
    node: [16, 18, 20]
    os: [ubuntu-latest, windows-latest, macos-latest]
    include:
      - node: 18
        os: ubuntu-latest
        coverage: true
```

### 4. Environment Protection

```yaml
environment:
  name: production
  url: https://example.com
  protection-rules:
    required-reviewers: 2
    wait-timer: 15
    deployment-branch-policy:
      allowed-branches:
        - main
```

## Implementation

This command uses specialized agents:
- **@github-operations-specialist** - GitHub Actions
- **@azure-devops-specialist** - Azure Pipelines
- **@docker-containerization-expert** - Container builds
- **@kubernetes-orchestrator** - K8s deployments

Process:
1. Query Context7 for platform-specific patterns
2. Analyze project structure and type
3. Generate pipeline configuration
4. Add security scanning stages
5. Configure deployment strategies
6. Set up notifications and monitoring

## Best Practices Applied

1. **Multi-Stage Pipelines** - Build, test, scan, deploy
2. **Security First** - Scanning in every stage
3. **Caching** - Dependencies and Docker layers
4. **Matrix Builds** - Multiple versions tested
5. **Environment Protection** - Manual approval gates
6. **Secrets Management** - Never in code
7. **Artifact Management** - Proper versioning
8. **Monitoring Integration** - Deployment tracking
9. **Rollback Strategy** - Easy reversion
10. **Documentation** - Self-documenting YAML

## Related Commands

- `/workflow-create` - GitHub workflow creation
- `/docker:optimize` - Docker image optimization
- `/cloud:validate` - Infrastructure validation
- `/security:scan` - Security vulnerability scanning

## Troubleshooting

### Pipeline Failures
- Check secret configuration in platform settings
- Verify permissions for deployment targets
- Review logs for specific error messages

### Slow Build Times
- Enable caching for dependencies
- Use Docker layer caching
- Parallelize independent jobs

### Deployment Issues
- Verify environment configuration
- Check deployment credentials
- Review health check endpoints

## Version History

- v2.0.0 - Initial Schema v2.0 release
- Multi-platform support (GitHub, Azure, GitLab)
- Security scanning integration
- Matrix build support
- Environment protection rules
