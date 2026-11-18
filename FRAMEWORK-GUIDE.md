# ClaudeAutoPM Framework - Complete Guide

## 📖 Table of Contents

1. [What is ClaudeAutoPM?](#what-is-claudeautopm)
2. [Why Use ClaudeAutoPM?](#why-use-claudeautopm)
3. [Key Features & Capabilities](#key-features--capabilities)
4. [Installation Guide](#installation-guide)
5. [Quick Start](#quick-start)
6. [Core Concepts](#core-concepts)
7. [Usage Examples](#usage-examples)
8. [Project Management Workflow](#project-management-workflow)
9. [Development Workflow](#development-workflow)
10. [Advanced Features](#advanced-features)
11. [Templates & Strategies](#templates--strategies)
12. [XML Structured Prompting](#xml-structured-prompting)
13. [Infrastructure Protection](#infrastructure-protection)
14. [Use Cases](#use-cases)
15. [Best Practices](#best-practices)
16. [Troubleshooting](#troubleshooting)
17. [Resources](#resources)

---

## What is ClaudeAutoPM?

**ClaudeAutoPM** (Autonomous Project Management) is an advanced AI-powered development automation framework for **Claude Code**. It transforms how you build software by combining:

- **Project Management** - Automated requirements, epics, tasks, and tracking
- **Development Automation** - TDD enforcement, code generation, testing
- **Infrastructure Protection** - Docker, K8s, with automatic validation
- **AI Agent System** - Specialized agents for every development task
- **XML Structured Prompting** - Consistent, comprehensive AI guidance

### The Problem It Solves

Before ClaudeAutoPM:
- ❌ Project management is manual and disconnected from code
- ❌ TDD is "recommended" but rarely enforced
- ❌ Infrastructure errors discovered in production
- ❌ Inconsistent AI prompting leads to varying quality
- ❌ Tests are often faked (file existence checks)
- ❌ Port conflicts between projects
- ❌ Documentation is an afterthought

After ClaudeAutoPM:
- ✅ Project management is integrated with development
- ✅ TDD is enforced at every level
- ✅ Infrastructure validated before commits
- ✅ XML prompts ensure consistent AI output
- ✅ Real functionality testing required
- ✅ Zero port conflicts (5xxxx range)
- ✅ Documentation is part of the workflow

---

## Why Use ClaudeAutoPM?

### For Individual Developers

**1. 10x Your Productivity**
- AI handles repetitive project management tasks
- Focus on coding while Claude tracks progress
- Automatic test generation and validation
- Infrastructure "just works"

**2. Better Code Quality**
- TDD enforced by framework, not willpower
- Real functionality testing (no fake tests)
- Code reviews before committing
- Consistent patterns across projects

**3. Faster Development Cycles**
- PRD → Epic → Tasks in seconds
- Parallel work streams with agents
- Automated validation catches errors early
- Less time debugging, more time building

### For Teams

**1. Consistent Workflows**
- Everyone follows same processes
- Standardized documentation
- Predictable project structure
- Easy onboarding for new developers

**2. Better Project Visibility**
- Real-time progress tracking
- Automated status reports
- Clear task dependencies
- Data-driven decision making

**3. Higher Quality Deliverables**
- Enforced testing standards
- Infrastructure validation
- Code review automation
- Reduced production bugs

### For Organizations

**1. Faster Time-to-Market**
- Automated project management overhead
- Parallel development streams
- CI/CD integration
- Reduced technical debt

**2. Risk Reduction**
- TDD enforcement prevents bugs
- Infrastructure protection prevents outages
- Real tests prevent production failures
- Security best practices built-in

**3. Scalability**
- Works for projects of any size
- Multiple plugins/extensions
- Cloud provider integrations (Azure, GitHub)
- Custom workflows via XML templates

---

## Key Features & Capabilities

### 🎯 Core Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Project Management** | PRDs, Epics, Tasks, Tracking | Complete project visibility |
| **TDD Enforcement** | Test-first at every level | Higher quality, fewer bugs |
| **Agent System** | Specialized AI agents | Expert help for every task |
| **XML Prompts** | Structured AI guidance | Consistent, comprehensive output |
| **Infrastructure Protection** | 4-layer defense system | Infrastructure always works |
| **CLI Commands** | 80+ integrated commands | Everything from terminal |
| **Azure DevOps Integration** | Boards, work items, PRs | Enterprise project sync |
| **GitHub Integration** | Issues, sync, workflows | Modern development workflow |
| **Testing Framework** | Auto-generated tests | Complete test coverage |
| **Validation System** | Pre-commit hooks | Catch errors before commit |

### 🚀 Development Features

**Code Generation**
- API endpoints with full TDD
- Frontend components (React, Vue, Angular)
- Backend services (Python, Node.js, FastAPI)
- Database schemas and migrations
- Docker and Kubernetes configurations

**Testing**
- Unit test generation
- Integration test creation
- End-to-end test scenarios
- Test coverage validation
- Flaky test detection

**Infrastructure**
- Docker compose generation
- Multi-stage Dockerfiles
- Kubernetes manifests
- Terraform configurations
- Port conflict prevention

**Documentation**
- API documentation
- Architecture docs
- User guides
- Developer guides
- Automated from code

### 🤖 AI Agent Capabilities

**Available Agents:**
- `context-optimizer` - Manage context window
- `parallel-worker` - Multi-stream parallel work
- `test-runner` - Execute and analyze tests
- `code-analyzer` - Code search and analysis
- `file-analyzer` - Large file summarization
- `python-backend-engineer` - Python/FastAPI expert
- `react-frontend-engineer` - React/TypeScript expert
- `nodejs-backend-engineer` - Node.js/Express expert
- `e2e-test-engineer` - Playwright end-to-end tests

---

## Installation Guide

### Prerequisites

- **Node.js**: >= 22.0.0
- **npm**: >= 10.0.0
- **Git**: Latest version
- **Claude Code**: Desktop app or CLI access
- **Docker** (optional): For containerized development

### Installation Methods

#### Method 1: Global Install (Recommended)

```bash
npm install -g claude-autopm
```

**Verify installation:**
```bash
autopm --version
# Output: 4.0.0

autopm --help
# Shows all available commands
```

#### Method 2: Per-Project Install

```bash
cd your-project
npm install --save-dev claude-autopm
npx autopm --help
```

#### Method 3: Development Install (For Contributors)

```bash
git clone https://github.com/lagowski/ClaudeAutoPM.git
cd ClaudeAutoPM
npm install
npm link  # Symlink for local development
```

### Initial Setup

```bash
# 1. Initialize ClaudeAutoPM in your project
autopm install

# 2. Choose your scenario:
#    0. Lite (core + PM, local only)
#    1. GitHub (core + languages + PM + GitHub sync) - DEFAULT without Docker/kubectl
#    2. Azure (core + languages + PM + Azure DevOps sync)
#    3. Docker (containerized dev, GitHub included)
#    4. Full DevOps (complete CI/CD) - DEFAULT with Docker + kubectl
#    5. Performance (max parallelization, all plugins except Azure)
#    6. Custom (choose your plugins)
#    7. Obsidian (core + PM + Obsidian vault sync)

# 3. Follow the prompts
# ClaudeAutoPM will:
# - Create .claude/ directory structure
# - Install agents and commands
# - Set up configuration files
# - Create necessary scripts
```

### What Gets Installed

```
your-project/
├── .claude/                    # Framework configuration
│   ├── agents/                 # AI agent definitions
│   ├── commands/               # CLI commands
│   ├── rules/                  # Development rules
│   ├── scripts/                # Utility scripts
│   ├── templates/              # XML & file templates
│   └── base.md                 # Project instructions
├── scripts/                    # Project scripts
│   └── safe-commit.sh          # Pre-commit validation
└── .git/
    └── hooks/                  # Git hooks (auto-installed)
        ├── pre-commit          # Validation before commit
        └── pre-push            # Tests before push
```

---

## Quick Start

### 5-Minute Getting Started Guide

#### Step 1: Create New Project

```bash
mkdir my-awesome-project
cd my-awesome-project
autopm install
# Choose scenario 1 (GitHub)
```

#### Step 2: Initialize Project Management

```bash
/pm:init
```

**This creates:**
- `.pm/` directory for project tracking
- PRD templates
- Epic templates
- Task templates
- Status tracking files

#### Step 3: Create First Feature

```bash
# Create Product Requirements Document
/pm:prd-new user-authentication

# Convert to technical epic
/pm:prd-parse user-authentication

# Break into tasks
/pm:epic-decompose user-authentication
```

#### Step 4: Start Development

```bash
# Launch parallel agents for epic
/pm:epic-start user-authentication

# Agents will:
# - Implement features in parallel
# - Write tests first (TDD)
# - Follow best practices
# - Create documentation
```

#### Step 5: Monitor Progress

```bash
# Check epic status
/pm:epic-status user-authentication

# Daily standup
/pm:standup

# Next task recommendation
/pm:next
```

#### Step 6: Complete and Merge

```bash
# When all tasks complete:
/pm:epic-merge user-authentication

# This will:
# - Verify all tests pass
# - Create pull request
# - Provide summary
```

---

## Core Concepts

### 1. Project Management Hierarchy

```
PRD (Product Requirements Document)
  ↓
Epic (Technical Implementation)
  ↓
Tasks (Individual Work Items)
  ↓
Commits (Code Changes)
```

**Example:**
```
user-authentication (PRD)
  └── auth-implementation (Epic)
      ├── login-endpoint (Task)
      ├── jwt-tokens (Task)
      ├── password-hashing (Task)
      └── user-registration (Task)
```

### 2. TDD (Test-Driven Development)

**Mandatory 3-Phase Cycle:**

1. **RED Phase** - Write failing test
   ```python
   def test_password_hashing():
       result = hash_password("password123")
       assert result != "password123"  # Will fail initially
   ```

2. **GREEN Phase** - Make test pass
   ```python
   def hash_password(password):
       return bcrypt.hashpw(password, bcrypt.gensalt())
   ```

3. **REFACTOR Phase** - Improve code
   ```python
   # Extract salt generation
   # Add validation
   # Optimize performance
   ```

### 3. Agent System

**Agents = AI Experts for Specific Tasks**

**When to use:**
- Code search → `@code-analyzer`
- Run tests → `@test-runner`
- Large files → `@file-analyzer`
- Parallel work → `@parallel-worker`
- Python backend → `@python-backend-engineer`

**Agent delegation:**
```markdown
@code-analyzer
Find all database connections in the codebase
```

### 4. XML Structured Prompting

**Why XML?**
- Structure ensures consistency
- Required sections prevent omissions
- Quality gates enforce standards
- Anti-patterns show what NOT to do

**Example:**
```xml
<prompt_workflow>
  <task>Implement login endpoint</task>
  <testing_requirements>
    <test_real_functionality>REQUIRED</test_real_functionality>
  </testing_requirements>
  <forbidden_test_patterns>
    <anti_example>assert Path("file").exists()</anti_example>
  </forbidden_test_patterns>
  <quality_gates>
    <check>Tests written before implementation</check>
  </quality_gates>
</prompt_workflow>
```

### 5. Infrastructure Protection

**4-Layer Defense:**
1. **Templates** - Correct patterns built-in
2. **Hooks** - Validation before commit
3. **XML** - AI guidance
4. **CI/CD** - Final validation

**Port Strategy:**
- Use 5xxxx range (50000-50004)
- Prevents conflicts across projects
- No more fighting for port 3000, 8000

---

## Usage Examples

### Example 1: Building a REST API

```bash
# 1. Create PRD
/pm:prd-new task-management-api

# 2. Parse to epic
/pm:prd-parse task-management-api

# 3. Decompose to tasks
/pm:epic-decompose task-management-api

# 4. Start development
/pm:epic-start task-management-api
```

**What happens:**
1. Parallel agents create endpoints simultaneously
2. Each agent follows TDD (test → code → refactor)
3. Tests use real database (no mocks)
4. All code follows project patterns
5. Documentation auto-generated

### Example 2: Adding Docker Infrastructure

```bash
# 1. Copy infrastructure templates
cp .claude/templates/infrastructure/docker-compose.yml.template docker-compose.yml
PROJECT_NAME="myapp" && sed -i '' "s/{{project_name}}/$PROJECT_NAME/g" docker-compose.yml

# 2. Copy Dockerfiles
mkdir -p backend frontend
cp .claude/templates/infrastructure/Dockerfile.python.template backend/Dockerfile
cp .claude/templates/infrastructure/Dockerfile.nodejs.template frontend/Dockerfile

# 3. Install protection hooks
.claude/scripts/hooks/install-infrastructure-hooks.sh

# 4. Build and test
docker compose build --no-cache
docker compose up -d

# Done! Infrastructure protected:
# - Port conflicts prevented (5xxxx range)
# - Multi-stage builds (smaller images)
# - Non-root user (security)
# - Pre-commit validation (catches errors early)
```

### Example 3: Testing Strategy

```bash
# 1. Configure testing framework
/test:test-setup

# This detects:
# - Jest, Vitest, Pytest, etc.
# - Creates test configuration
# - Sets up coverage reporting

# 2. Generate tests for existing code
@file-analyzer
Analyze src/auth/login.js and suggest test cases

# 3. Run tests
@test-runner run all tests

# This will:
# - Use test-runner agent
# - Execute all tests
# - Provide detailed analysis
# - Suggest improvements
```

### Example 4: Database Schema Changes

```bash
# 1. Create migration task (decompose from epic)
/pm:epic-decompose user-preferences

# 2. Generate with Python agent
@python-backend-engineer

<prompt_workflow>
  <task>Add user_preferences table</task>
  <context>PostgreSQL database with SQLAlchemy</context>
  <requirements>
    <requirement>Table for user settings</requirement>
    <requirement>JSON schema for preferences</requirement>
    <requirement>Migration script</requirement>
  </requirements>
</prompt_workflow>

# 3. Agent will:
# - Create migration file
# - Write tests first (TDD)
# - Implement schema
# - Provide rollback script
```

### Example 5: Creating Custom XML Template

```bash
# 1. List available templates
/xml:template list

# 2. Create custom template
/xml:template new dev microservice-api

# 3. Edit template
vim .claude/templates/xml-prompts/dev/microservice-api.xml

# 4. Use it
const builder = new XMLPromptBuilder();
const prompt = builder.build('dev/microservice-api.xml', {
  task: 'Create user service',
  context: 'Express.js with TypeScript',
  requirements: ['CRUD operations', 'Validation']
});
```

---

## Project Management Workflow

### Complete Feature Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. REQUIREMENTS                                             │
│    /pm:prd-new → Define product requirements               │
│    /pm:prd-list → View all PRDs                             │
│    /pm:prd-show → View PRD details                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TECHNICAL DESIGN                                         │
│    /pm:prd-parse → Convert PRD to technical epic            │
│    /pm:epic-decompose → Break epic into tasks              │
│    /pm:epic-list → View all epics                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. IMPLEMENTATION                                           │
│    /pm:epic-start → Launch parallel agents                 │
│    /pm:epic-status → Monitor progress                       │
│    /pm:issue-show → View issue details                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VALIDATION                                              │
│    @test-runner → Execute all tests                        │
│    Docker compose build → Verify infrastructure            │
│    Pre-commit hooks → Automatic validation                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. COMPLETION                                               │
│    /pm:epic-merge → Merge epic to main                     │
│    /pm:epic-close → Mark epic complete                     │
│    Create GitHub release                                    │
└─────────────────────────────────────────────────────────────┘
```

### Daily Workflow

**Morning:**
```bash
/pm:standup              # What happened yesterday, what's blocked
/pm:next                 # Get AI-recommended task to work on
```

**During Development:**
```bash
# Use agents for all non-trivial work
@code-analyzer search    # Find code patterns
@test-runner run tests   # Execute tests
/file-analyzer summarize # Analyze logs/output
```

**End of Day:**
```bash
@test-runner run all tests  # Verify all tests pass
/pm:status               # Review accomplishments
git commit               # Hooks validate automatically
```

---

## Development Workflow

### Feature Development Steps

#### 1. Planning Phase

```bash
# Define requirements
/pm:prd-new feature-name

# Review PRD
/pm:prd-show feature-name

# Convert to epic
/pm:prd-parse feature-name
```

**Created:**
- `.pm/prds/feature-name.md` - Requirements document
- `.pm/epics/feature-name.md` - Technical epic

#### 2. Design Phase

```bash
# Decompose epic into tasks
/pm:epic-decompose feature-name

# Review tasks
/pm:epic-show feature-name

# See task details
autopm task list feature-name
```

**Created:**
- `.pm/tasks/feature-name/` - Individual task files
- Task dependencies mapped
- Effort estimates provided

#### 3. Development Phase

```bash
# Start parallel development
/pm:epic-start feature-name

# This spawns parallel-worker agent
# Which spawns sub-agents for each task:
# - Agent 1: Task 1
# - Agent 2: Task 2
# - Agent 3: Task 3
# (All working in parallel)
```

**Each agent follows TDD:**
1. Write failing test (RED)
2. Write minimal code (GREEN)
3. Refactor for clarity (REFACTOR)

#### 4. Validation Phase

```bash
# Monitor progress
/pm:epic-status feature-name

# Run tests
@test-runner run all tests

# Verify infrastructure
docker compose build --no-cache
docker compose up -d
```

#### 5. Completion Phase

```bash
# All tasks complete?
/pm:epic-status feature-name

# Merge epic
/pm:epic-merge feature-name

# This:
# - Runs final validation
# - Creates pull request
# - Provides summary
# - Marks epic complete
```

---

## Advanced Features

### 1. Azure DevOps Integration

**Setup:**
```bash
# Install Azure plugin
autopm install plugin-pm-azure

# Configure
autopm config set provider azure

# Set API token in .claude/.env
# AZURE_DEVOPS_PAT=your-azure-devops-pat
```

**Commands:**
```bash
# Sync epic to Azure Boards
/pm:epic-sync feature-name

# Sync an issue to Azure work items
/pm:issue-sync issue-id

# Sync all local changes
/pm:sync
```

**Features:**
- Epic → Feature mapping
- Tasks → Product Backlog Items
- Automatic status sync
- PR integration

### 2. GitHub Integration

**Setup:**
```bash
autopm config set provider github
# Set GITHUB_TOKEN in .claude/.env
```

**Commands:**
```bash
# Sync epic to GitHub issues
/pm:epic-sync feature-name --provider github

# Create PR for epic
/pm:epic-merge feature-name --create-pr

# Import issues
/pm:import
```

### 3. Parallel Work Streams

**When:**
- Independent tasks in epic
- Multiple features simultaneously
- Large codebase changes

**How:**
```bash
# Automatically launched by epic-start
# Or manually:

@parallel-worker

Work streams:
- Stream 1: Backend API (Agent A)
- Stream 2: Frontend UI (Agent B)
- Stream 3: Database schema (Agent C)

All working in parallel on feature branch
```

**Coordination:**
- File-level locking prevents conflicts
- Agents coordinate via issue comments
- Main thread tracks progress
- Results merged when all complete

### 4. Context Optimization

**Problem:** AI has limited context window

**Solution:**
```bash
@context-optimizer checkpoint "Before big change"

# Make changes...

@context-optimizer transfer "After changes, before testing"
```

**Features:**
- Checkpoint creation (save context)
- Session compaction (reduce size)
- Memory patterns (file-based persistence)
- Session transfer (between sessions)

### 5. XML Template System

**Why:**
- Consistent AI prompting
- Complete requirements coverage
- Quality enforcement
- Anti-pattern prevention

**Use:**
```javascript
const XMLPromptBuilder = require('.claude/lib/xml-prompt-builder');
const builder = new XMLPromptBuilder();

// List templates
const templates = builder.listTemplates();

// Build prompt
const prompt = builder.build('dev/stage2-code-generation.xml', {
  task: 'Implement user login',
  context: 'Express.js API',
  requirements: ['Email/password', 'JWT tokens'],
  allowed_libraries: 'bcrypt, jsonwebtoken'
});

// Use with agent
console.log(prompt);
```

**Available Templates:**
- `stage1-architectural-planning.xml` - Design system architecture
- `stage2-code-generation.xml` - Generate code with TDD
- `stage2-infrastructure-implementation.xml` - Docker/K8s
- `stage3-test-creation.xml` - Create test suites
- `stage3-infrastructure-validation.xml` - Validate infrastructure
- `stage4-refactoring.xml` - Refactor safely
- `stage5-documentation.xml` - Generate docs
- `api-endpoint.xml` - REST API with TDD

---

## Templates & Strategies

### Installation Scenarios

**0. Lite** (Core + PM essentials)
- 50 commands
- Minimal context
- Fast execution

**1. Standard** (Core + Languages + PM) - DEFAULT
- 55 commands
- Python, Node.js agents
- PM workflows
- Balanced size/speed

**2. Azure** (Standard + Azure DevOps)
- 95 commands
- Azure Boards integration
- Work item sync
- Enterprise PM

**3. Docker** (Containerized dev)
- Full PM + Azure
- Docker enforcement
- 7 plugins
- Container-focused

**4. Full DevOps** (RECOMMENDED)
- Complete CI/CD pipeline
- 10 plugins
- All integrations
- Maximum automation

**5. Performance** (Max parallelization)
- 12 plugins
- Parallel execution
- Multi-agent
- Speed optimized

**6. Custom**
- Choose your plugins
- Tailored setup
- Specific needs

### Execution Strategies

**Sequential** (Safe)
- One agent at a time
- No conflicts
- Slower but safe

**Adaptive** (DEFAULT - Intelligent)
- Auto mode selection
- Task-dependent
- Balanced speed/safety

**Hybrid** (Maximum parallelization)
- Everything parallel
- Fastest execution
- Requires coordination

### Changing Strategy

```bash
# View current strategy
cat .claude/ACTIVE_STRATEGY.md

# Change strategy
# Edit .claude/config.json
{
  "strategy": "hybrid"
}
```

---

## XML Structured Prompting

### What It Is

XML templates that provide comprehensive, structured prompts for AI agents. Instead of writing ad-hoc prompts, you use predefined templates that enforce best practices.

### Why Use It

**Before (ad-hoc prompt):**
```
"Create a login endpoint"
```

**Result:** Inconsistent, missing requirements, no tests

**After (XML template):**
```xml
<prompt_workflow>
  <task>Create login endpoint</task>
  <requirements>
    <requirement>Email/password authentication</requirement>
    <requirement>JWT token generation</requirement>
  </requirements>
  <tdd_requirements>
    <test_first>REQUIRED</test_first>
  </tdd_requirements>
  <forbidden_test_patterns>
    <pattern>
      <name>Mock Database</name>
      <anti_example>jest.mock('./database')</anti_example>
    </pattern>
  </forbidden_test_patterns>
  <quality_gates>
    <check>Tests written before code</check>
  </quality_gates>
</prompt_workflow>
```

**Result:** Complete, tested, validated implementation

### Template Categories

**Stage 1 (arch/)** - Architecture
- `stage1-architectural-planning.xml`
- `prd-to-epic.xml`

**Stage 2 (dev/)** - Development
- `stage2-code-generation.xml`
- `api-endpoint.xml`
- `stage2-infrastructure-implementation.xml`

**Stage 3 (test/)** - Testing
- `stage3-test-creation.xml`
- `stage3-infrastructure-validation.xml`

**Stage 4 (refactor/)** - Refactoring
- `stage4-refactoring.xml`

**Stage 5 (doc/)** - Documentation
- `stage5-documentation.xml`

### Using Templates

```javascript
const builder = new XMLPromptBuilder();

// 1. List available templates
const templates = builder.listTemplates();

// 2. Build prompt from template
const prompt = builder.build('dev/stage2-code-generation.xml', {
  task: 'Implement user authentication',
  context: 'Express.js with JWT',
  requirements: [
    'Login endpoint',
    'JWT token generation',
    'Password hashing'
  ],
  allowed_libraries: 'bcrypt, jsonwebtoken',
  test_format: 'Jest',
  code_format: 'TypeScript'
});

// 3. Use with agent
console.log(prompt);
```

### Creating Custom Templates

```bash
# List templates
/xml:template list

# Create new template
/xml:template new dev my-custom-workflow

# Edit template
vim .claude/templates/xml-prompts/dev/my-custom-workflow.xml
```

---

## Infrastructure Protection

### The Problem It Solves

Developers repeatedly make the same mistakes:
1. Port conflicts (fighting for 3000, 8000)
2. Permission errors in containers
3. Broken Docker builds
4. Fake tests (file existence checks)
5. Security issues (root user, single-stage)

### The Solution: 4-Layer Protection

#### Layer 1: Templates (Prevention)

**docker-compose.yml.template:**
```yaml
services:
  backend:
    ports:
      - "50001:8000"  # 5xxxx range = no conflicts
```

**Dockerfile.python.template:**
```dockerfile
# Multi-stage build
FROM python:3.11 AS builder
# ... build ...

FROM python:3.11-alpine AS runtime
RUN groupadd -r appuser && useradd -r appuser
USER appuser  # Non-root
```

#### Layer 2: Pre-commit Hooks (Detection)

```bash
# Install hooks
.claude/scripts/hooks/install-infrastructure-hooks.sh

# Now every commit:
# 1. Checks port conflicts
# 2. Validates Docker builds
# 3. Blocks if anything fails
```

**Example:**
```bash
$ git commit -m "add docker"
🔍 Checking for port conflicts...
❌ Port 8000 is in system port range
💡 Fix: Use 5xxxx range
🚫 Commit blocked
```

#### Layer 3: XML Templates (Guidance)

```xml
<testing_requirements>
  <test_real_functionality>REQUIRED</test_real_functionality>
  <test_pattern>
    ❌ FORBIDDEN: assert Path("file").exists()
    ✅ REQUIRED: subprocess.run(["docker", "build", "."])
  </test_pattern>
</testing_requirements>
```

#### Layer 4: CI/CD (Final Validation)

GitHub Actions validate:
- Docker builds succeed
- Tests pass (real tests)
- No security vulnerabilities
- Infrastructure is valid

### Using Infrastructure Protection

```bash
# 1. Copy templates
PROJECT_NAME="myapp"
cp .claude/templates/infrastructure/docker-compose.yml.template docker-compose.yml
sed -i '' "s/{{project_name}}/$PROJECT_NAME/g" docker-compose.yml

# 2. Copy Dockerfiles
mkdir -p backend frontend
cp .claude/templates/infrastructure/Dockerfile.python.template backend/Dockerfile
cp .claude/templates/infrastructure/Dockerfile.nodejs.template frontend/Dockerfile

# 3. Install hooks
.claude/scripts/hooks/install-infrastructure-hooks.sh

# 4. Build and test
docker compose build --no-cache
docker compose up -d

# Done! Protected from:
# - Port conflicts
# - Permission errors
# - Broken builds
# - Fake tests
# - Security issues
```

### Port Strategy

**Use 5xxxx range:**

| Service | Port | Why |
|---------|------|-----|
| nginx (main) | 50000 | Application entry point |
| Backend API | 50001 | No conflict with Django/FastAPI default |
| Frontend | 50002 | No conflict with React/Vue dev server |
| PostgreSQL | 50003 | No conflict with system Postgres |
| Redis | 50004 | No conflict with system Redis |

**For multiple projects:**
- Project A: 50xxx
- Project B: 51xxx
- Project C: 52xxx
- **Zero conflicts!**

---

## Use Cases

### Use Case 1: Startup MVP Development

**Scenario:** Building MVP quickly with quality

**Workflow:**
```bash
# 1. Initialize
autopm install
/pm:init

# 2. Define features (PRDs)
/pm:prd-new user-authentication
/pm:prd-new payment-processing
/pm:prd-new dashboard

# 3. Convert to epics
for prd in user-authentication payment-processing dashboard; do
  /pm:prd-parse $prd
  /pm:epic-decompose $prd
done

# 4. Develop in parallel
for epic in auth-implementation payment-implementation dashboard; do
  /pm:epic-start $ epic
done

# Time saved: 60% (parallel work, automated testing)
```

### Use Case 2: Enterprise Team

**Scenario:** 10 developers, large codebase, Azure DevOps

**Workflow:**
```bash
# 1. Install with Azure plugin
autopm install plugin-pm-azure

# 2. Configure Azure
autopm config set provider azure
# Set AZURE_DEVOPS_PAT in .claude/.env

# 3. All developers use /pm commands
/pm:issue-sync issue-id  # Syncs issue to Azure work item
/pm:sync                 # Syncs all local changes with Azure

# 4. Automated reporting
/pm:standup              # Daily standup automation
/pm:status               # Team status overview
```

### Use Case 3: Microservices Architecture

**Scenario:** Multiple services, Docker, K8s

**Workflow:**
```bash
# 1. Use infrastructure templates
for service in auth user payment inventory; do
  mkdir -p $service
  cp .claude/templates/infrastructure/Dockerfile.nodejs.template $service/Dockerfile
done

# 2. Create docker-compose
cp .claude/templates/infrastructure/docker-compose.yml.template docker-compose.yml

# 3. Install protection
.claude/scripts/hooks/install-infrastructure-hooks.sh

# 4. Build all services
docker compose build --no-cache
docker compose up -d

# All services protected:
# - No port conflicts
# - Multi-stage builds (small images)
# - Non-root users (secure)
# - Pre-commit validation
```

### Use Case 4: Agency/Consultancy

**Scenario:** Multiple client projects, consistent quality

**Workflow:**
```bash
# For each client project:
cd client-project
autopm install
/pm:init

# Standardized workflows:
# - Same PM structure
# - Same TDD practices
# - Same documentation
# - Same quality standards

# Easy onboarding
# New developer: "Run /pm:standup, see what to work on"
```

### Use Case 5: Open Source Maintainer

**Scenario:** Community contributions, PR validation

**Workflow:**
```bash
# Contributor submits PR
# Your repo has hooks:

# .git/hooks/pre-commit:
# - npm test (all tests must pass)
# - npm run lint (code style)
# - Docker build validation

# PR can't be merged unless:
# - All tests pass
# - Code is formatted
# - Infrastructure builds
# - Coverage > 80%

# Automated quality gate
```

---

## Best Practices

### 1. Always Use Agents for Complex Tasks

```markdown
# ❌ Bad: Do it yourself
"Find all database queries"

# ✅ Good: Use agent
@code-analyzer
Find all database queries in the codebase
```

### 2. Follow TDD Strictly

```bash
# 1. Write test FIRST
# 2. Verify test FAILS (RED)
# 3. Write code to PASS (GREEN)
# 4. Refactor (REFACTOR)
# 5. Verify tests STILL PASS

# Never skip steps!
```

### 3. Use XML Templates

```javascript
// ❌ Bad: Ad-hoc prompt
"Create API endpoint"

// ✅ Good: XML template
const prompt = builder.build('api-endpoint.xml', {
  task: 'Create user endpoint',
  http_method: 'POST',
  endpoint_path: '/api/users',
  test_framework: 'Jest'
});
```

### 4. Test Real Functionality

```python
# ❌ Bad: File existence
assert Path("Dockerfile").exists()

# ✅ Good: Real functionality
subprocess.run(["docker", "build", "."])
```

### 5. Use 5xxxx Ports

```yaml
# ❌ Bad: System ports
ports:
  - "8000:8000"  # May conflict

# ✅ Good: 5xxxx range
ports:
  - "50001:8000"  # No conflicts
```

### 6. Commit Small, Focused Changes

```bash
# ❌ Bad: One big commit
git add .
git commit -m "everything"

# ✅ Good: Small commits
git add tests/user-login.test.js
git commit -m "test: add user login tests"

git add src/auth/login.js
git commit -m "feat: implement user login"

git add docs/api.md
git commit -m "docs: document login API"
```

### 7. Run Pre-commit Validation

```bash
# Hooks automatically run on:
# - git commit
# - git push

# Manually run anytime:
./scripts/safe-commit.sh "my message"

# This runs:
# - All tests
# - Linting
# - Docker builds
# - Path validation
```

### 8. Use Parallel Work Streams

```bash
# For independent tasks:
/pm:epic-start feature-name

# Automatically launches:
# - Agent 1: Task 1
# - Agent 2: Task 2
# - Agent 3: Task 3
# (All in parallel)

# 3x faster than sequential!
```

---

## Troubleshooting

### Issue: Agent Not Working

**Problem:** Agent doesn't respond or errors

**Solution:**
```bash
# 1. Check agent is in registry
cat .claude/agents/AGENT-REGISTRY.md

# 2. Verify agent file exists
ls .claude/agents/core/agent-name.md

# 3. Check for syntax errors
# Read agent file, look for markdown issues

# 4. Restart Claude Code
```

### Issue: Tests Failing

**Problem:** Tests fail after code changes

**Solution:**
```bash
# 1. Use test-runner for analysis
@test-runner
Run tests and analyze failures

# 2. Check if tests are real
# Not file-existence tests!

# 3. Verify test order
# Tests should be independent

# 4. Check environment
# .env file up to date?
# Database running?
```

### Issue: Docker Build Fails

**Problem:** docker compose build fails

**Solution:**
```bash
# 1. Check build log
docker compose build --no-cache

# 2. Common issues:
# - Missing files in COPY
# - Wrong base image
# - Missing dependencies

# 3. Use infrastructure template
cp .claude/templates/infrastructure/Dockerfile.python.template Dockerfile

# 4. Install hooks to catch early
.claude/scripts/hooks/install-infrastructure-hooks.sh
```

### Issue: Port Conflicts

**Problem:** Port already in use

**Solution:**
```bash
# 1. Check what's using port
lsof -i :8000

# 2. Use 5xxxx range instead
# Edit docker-compose.yml
ports:
  - "50001:8000"  # Changed from 8000

# 3. Run port checker
.claude/scripts/hooks/check-ports.sh
```

### Issue: Context Window Full

**Problem:** AI runs out of context

**Solution:**
```bash
# 1. Use context optimizer
@context-optimizer checkpoint "Before changes"

# 2. Make changes...

# 3. Compact if needed
@context-optimizer compact

# 4. Transfer to new session
@context-optimizer transfer "Ready for testing"
```

### Issue: Git Hooks Not Running

**Problem:** Commits succeed without validation

**Solution:**
```bash
# 1. Check hooks exist
ls -la .git/hooks/pre-commit

# 2. Reinstall if needed
npm run setup:githooks

# 3. Or install manually
.claude/scripts/hooks/install-hooks.sh
```

### Issue: Azure Sync Fails

**Problem:** Can't sync to Azure DevOps

**Solution:**
```bash
# 1. Check provider
cat .claude/config.json

# 2. Set API token in .claude/.env
# AZURE_DEVOPS_PAT=your-azure-devops-pat

# 3. Verify configuration
autopm validate

# 4. Check Azure token
az account get-access-token
```

---

## Resources

### Documentation

- **GitHub Repository**: https://github.com/lagowski/ClaudeAutoPM
- **npm Package**: https://www.npmjs.com/package/claude-autopm
- **TEMPLATE_REGISTRY**: `.claude/templates/xml-prompts/TEMPLATE_REGISTRY.md`
- **Infrastructure Protection**: `.claude/docs/UNIVERSAL-INFRASTRUCTURE-PROTECTION.md`
- **XML Quick Start**: `.claude/docs/xml-prompting-quickstart.md`

### Command Reference

```bash
# List all commands
autopm --help

# PM commands
/pm:help

# Context commands
/context:create, /context:prime, /context:update

# Testing commands (plugin-testing)
/test:test-setup, /test:test-coverage
```

### Agent Reference

**Core Agents:**
- `context-optimizer` - Context management
- `parallel-worker` - Parallel execution
- `test-runner` - Test execution
- `code-analyzer` - Code analysis
- `file-analyzer` - File summarization

**Language Agents:**
- `python-backend-engineer` - Python/FastAPI
- `nodejs-backend-engineer` - Node.js/Express
- `react-frontend-engineer` - React/TypeScript

**Framework Agents:**
- `e2e-test-engineer` - Playwright testing

### Community

- **Issues**: https://github.com/lagowski/ClaudeAutoPM/issues
- **Discussions**: https://github.com/lagowski/ClaudeAutoPM/discussions
- **Contributing**: See `CONTRIBUTING.md` in repo

### Support

For help:
1. Check documentation above
2. Search GitHub issues
3. Create new issue with:
   - ClaudeAutoPM version
   - Node.js version
   - Operating system
   - Error message
   - Steps to reproduce

---

## Summary

**ClaudeAutoPM** is a comprehensive AI-powered development framework that:

✅ **Automates project management** - PRDs, epics, tasks
✅ **Enforces TDD** - Test-first at every level
✅ **Provides expert AI agents** - For every development task
✅ **Protects infrastructure** - 4-layer defense system
✅ **Ensures quality** - Pre-commit validation, real tests
✅ **Accelerates development** - Parallel work streams
✅ **Standardizes workflows** - Consistent patterns across projects

**Get Started:**
```bash
npm install -g claude-autopm
autopm install
/pm:init
```

**Transform your development workflow with AI-powered automation!** 🚀
