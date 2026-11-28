# docker:optimize

Optimize Docker images for size, security, and build performance using Context7-verified best practices.

## Description

Analyzes and optimizes Docker images and Dockerfiles following industry best practices from Docker official documentation:
- Multi-stage build optimization
- Layer caching efficiency
- Image size reduction
- Security hardening
- Build performance improvements
- Base image recommendations

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: docker.

## Usage

```bash
/docker:optimize [options]
```

## Options

- `--dockerfile <path>` - Path to Dockerfile (default: ./Dockerfile)
- `--analyze-only` - Analyze without applying changes
- `--output <path>` - Write optimized Dockerfile to specified path
- `--target <stage>` - Optimize specific build stage
- `--security` - Focus on security optimizations
- `--size` - Focus on image size reduction
- `--speed` - Focus on build speed optimization

## Examples

### Analyze Current Dockerfile
```bash
/docker:optimize --analyze-only
```

### Optimize for Size
```bash
/docker:optimize --size --output Dockerfile.optimized
```

### Security-Focused Optimization
```bash
/docker:optimize --security
```

### Optimize Specific Build Stage
```bash
/docker:optimize --target production --output Dockerfile.prod
```

## Optimization Categories

### 1. Multi-Stage Build Optimization

**Pattern from Context7 (/docker/docs):**
```dockerfile
# BEFORE: Single-stage (large image)
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]

# AFTER: Multi-stage (optimized)
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/index.js"]
```

**Benefits:**
- 60-80% smaller final image
- No build tools in production
- Faster deployment times
- Reduced attack surface

### 2. Layer Caching Efficiency

**Pattern from Context7:**
```dockerfile
# BEFORE: Poor caching
COPY . .
RUN npm install

# AFTER: Optimized caching
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

**Benefits:**
- Faster rebuilds (cache reuse)
- Dependency layer cached separately
- Source changes don't invalidate dependency cache

### 3. Base Image Optimization

**Pattern from Context7:**
```dockerfile
# BEFORE: Full image (1.2GB)
FROM node:18

# AFTER: Alpine image (150MB)
FROM node:18-alpine

# BEST: Distroless (50MB)
FROM gcr.io/distroless/nodejs18-debian11
```

**Recommendations by Use Case:**
- **Development:** Full image (tools, debugging)
- **Production:** Alpine (small, secure)
- **High Security:** Distroless (minimal attack surface)

### 4. Security Hardening

**Pattern from Context7:**
```dockerfile
# Security best practices
FROM node:18-alpine AS builder

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --only=production

COPY --chown=nodejs:nodejs . .

# Drop to non-root user
USER nodejs

# Read-only root filesystem
CMD ["node", "--frozen-intrinsics", "index.js"]
```

**Security Measures:**
- ✅ Non-root user (USER directive)
- ✅ File ownership (--chown flag)
- ✅ Minimal base image (Alpine/Distroless)
- ✅ No unnecessary packages
- ✅ Security scanning integrated

### 5. Build Performance

**Pattern from Context7 (BuildKit):**
```dockerfile
# syntax=docker/dockerfile:1

# Use BuildKit cache mounts
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Parallel build stages
FROM deps AS build
COPY . .
RUN --mount=type=cache,target=/root/.npm \
    npm run build
```

**BuildKit Features:**
- `--mount=type=cache` - Persistent cache
- `--mount=type=secret` - Secure secret handling
- `--mount=type=bind` - Temporary file binding
- Parallel build stages
- Skip unused stages

### 6. .dockerignore Optimization

**Pattern from Context7:**
```dockerignore
# Version control
.git
.gitignore
.github

# Dependencies
node_modules
npm-debug.log*

# Build outputs
dist
build
coverage

# IDE
.vscode
.idea
*.swp

# Environment
.env
.env.local
*.log

# Documentation
README.md
docs/
*.md
```

**Benefits:**
- Smaller build context
- Faster uploads to Docker daemon
- No sensitive files in image
- Cleaner final image

## Analysis Output

### Console Output
```
🐳 Docker Image Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Dockerfile: ./Dockerfile
Current Image Size: 1.2 GB
Optimization Potential: ~900 MB (75% reduction)

Findings:

📦 Image Size Optimization
  ⚠️  Using full node:18 image (1.2 GB)
  💡 Recommendation: Switch to node:18-alpine (150 MB)
  💰 Savings: ~1.05 GB

🏗️  Multi-Stage Build
  ❌ No multi-stage build detected
  💡 Recommendation: Separate build and runtime stages
  💰 Savings: ~200 MB (dev dependencies removed)

🔒 Security
  ⚠️  Running as root user
  💡 Recommendation: Create and use non-root user
  🛡️  Security: High priority

  ⚠️  Base image not specified with digest
  💡 Recommendation: Pin base image with SHA256 digest
  🛡️  Security: Medium priority

📝 Layer Caching
  ⚠️  COPY . before dependency install
  💡 Recommendation: Copy package.json first, then install
  ⚡ Performance: Faster rebuilds

🚀 BuildKit Features
  ❌ Not using BuildKit cache mounts
  💡 Recommendation: Add cache mounts for npm cache
  ⚡ Performance: 50% faster builds

.dockerignore
  ⚠️  .dockerignore file missing
  💡 Recommendation: Create .dockerignore
  📦 Size: ~50 MB reduction

Summary:
  Total Size Reduction: ~900 MB (75%)
  Security Improvements: 3 high-priority items
  Build Time Improvement: ~50%
  Cache Efficiency: Significantly improved

Recommended Actions:
  1. Implement multi-stage build
  2. Switch to Alpine base image
  3. Add non-root user
  4. Create .dockerignore
  5. Optimize layer caching
  6. Enable BuildKit features
```

### Optimized Dockerfile Generated

```dockerfile
# syntax=docker/dockerfile:1

#
# Multi-stage optimized Dockerfile
# Generated by docker:optimize
# Based on Context7 best practices from /docker/docs
#

# Stage 1: Dependencies
FROM node:18-alpine@sha256:abc123... AS deps

# Install security updates
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependency files
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build
FROM deps AS build

# Copy source code
COPY --chown=nodejs:nodejs . .

# Build application
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Stage 3: Production
FROM node:18-alpine@sha256:abc123...

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy only necessary files
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

# Drop privileges
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
```

### .dockerignore Generated

```dockerignore
# Version control
.git
.gitignore
.github
.gitattributes

# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist
build
coverage
.next
out

# Testing
__tests__
*.test.js
*.spec.js
test/
coverage/

# IDE
.vscode
.idea
*.swp
*.swo
.DS_Store

# Environment
.env
.env.*
!.env.example

# Documentation
README.md
docs/
*.md
LICENSE

# CI/CD
.github/
.gitlab-ci.yml
azure-pipelines.yml

# Temporary files
*.log
*.tmp
tmp/
temp/
```

## Implementation

This command uses the **@docker-containerization-expert** agent:

1. Queries Context7 for Docker best practices
2. Analyzes current Dockerfile structure
3. Identifies optimization opportunities
4. Generates optimized Dockerfile
5. Creates .dockerignore if missing
6. Provides implementation guidance

## Best Practices Applied

Based on Context7 documentation from `/docker/docs`:

1. **Multi-Stage Builds** - Separate build and runtime
2. **Alpine Base Images** - Minimal attack surface
3. **Layer Caching** - Dependencies before source code
4. **Non-Root User** - Security hardening
5. **BuildKit Features** - Cache mounts, secrets
6. **Health Checks** - Container health monitoring
7. **.dockerignore** - Smaller build context
8. **Image Pinning** - SHA256 digests for reproducibility
9. **Security Scanning** - Integrated with build
10. **Signal Handling** - Proper init system (dumb-init)

## Related Commands

- `/docker:scan` - Security vulnerability scanning
- `/docker:build` - Build with optimization flags
- `/docker:analyze` - Deep image analysis
- `/cloud:validate` - Infrastructure validation

## Troubleshooting

### Build Failures
- Check BuildKit is enabled: `export DOCKER_BUILDKIT=1`
- Verify base image exists and is accessible
- Check network connectivity for package downloads

### Size Not Reduced
- Ensure .dockerignore is being used
- Check for large files in COPY commands
- Verify multi-stage build is working correctly

### Performance Issues
- Enable BuildKit cache: `--mount=type=cache`
- Use layer caching effectively
- Parallelize independent build stages

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Multi-stage build optimization
- Security hardening patterns
- BuildKit feature integration
